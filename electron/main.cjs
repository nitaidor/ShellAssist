const { app, BrowserWindow, ipcMain, Menu, nativeTheme } = require('electron');
const path = require('path');
const { exec, execSync, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');

// Enforce AppUserModelId and exact "ShellAssist" AppData folder name & casing on disk
app.setName('ShellAssist');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.shellassist.desktop');
}
const appDataRoot = app.getPath('appData');
const userDataDir = path.join(appDataRoot, 'ShellAssist');
try {
  if (fs.existsSync(appDataRoot)) {
    const entries = fs.readdirSync(appDataRoot);
    const existingMatch = entries.find(e => e.toLowerCase() === 'shellassist');
    if (existingMatch && existingMatch !== 'ShellAssist') {
      const oldPath = path.join(appDataRoot, existingMatch);
      const tempPath = path.join(appDataRoot, 'ShellAssist_temp_rename');
      fs.renameSync(oldPath, tempPath);
      fs.renameSync(tempPath, userDataDir);
    }
  }
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
} catch (e) {}
app.setPath('userData', userDataDir);

const appDataFilePath = path.join(userDataDir, 'ShellAssist.json');
let latestSavedSettings = null;

ipcMain.on('load-app-data', (event) => {
  try {
    if (fs.existsSync(appDataFilePath)) {
      const raw = fs.readFileSync(appDataFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      latestSavedSettings = parsed?.settings || null;
      event.returnValue = parsed;
      return;
    }
  } catch (e) {}
  event.returnValue = null;
});

ipcMain.handle('save-app-data', async (_event, data) => {
  try {
    latestSavedSettings = data?.settings || null;
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    fs.writeFileSync(appDataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return { status: 'saved' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

// Native OS theme synchronizer for right-click context menus
ipcMain.on('set-native-theme', (_event, mode) => {
  if (mode === 'dark' || mode === 'light' || mode === 'system') {
    nativeTheme.themeSource = mode;
  }
});

// ---------------- OLLAMA LOCAL AI MANAGER ----------------
function resolveOllamaEndpoint() {
  const envHost = (process.env.OLLAMA_HOST || '').trim();
  if (!envHost) return 'http://localhost:11434';
  let url = envHost;
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  url = url.replace(/\/\/0\.0\.0\.0/, '//127.0.0.1').replace(/\/+$/, '');
  if (!/:\d+$/.test(url)) {
    url += ':11434';
  }
  return url;
}

function getWinOllamaPaths() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const dir = path.join(localAppData, 'Programs', 'Ollama');
  return {
    dir,
    cliExe: path.join(dir, 'ollama.exe'),
    appExe: path.join(dir, 'Ollama app.exe')
  };
}

function checkIsOllamaInstalled() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const { cliExe, appExe } = getWinOllamaPaths();
      if (fs.existsSync(cliExe) || fs.existsSync(appExe)) {
        return resolve(true);
      }
      exec('where ollama', { windowsHide: true }, (err) => {
        resolve(!err);
      });
    } else {
      exec('which ollama', (err) => {
        resolve(!err);
      });
    }
  });
}

async function pingOllamaServer(endpoint) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

// Synchronous process termination for app exit so Electron waits until Ollama is fully closed
function killOllamaSync() {
  if (process.platform === 'win32') {
    try {
      execSync('taskkill /F /IM "Ollama app.exe" /T', { windowsHide: true, stdio: 'ignore' });
    } catch {}
    try {
      execSync('taskkill /F /IM "ollama.exe" /T', { windowsHide: true, stdio: 'ignore' });
    } catch {}
  } else {
    try {
      execSync('pkill -f "ollama"', { stdio: 'ignore' });
    } catch {}
  }
}

function shouldStopOllamaOnExit() {
  if (latestSavedSettings && typeof latestSavedSettings.stopOllamaOnExit === 'boolean') {
    return latestSavedSettings.stopOllamaOnExit;
  }
  try {
    if (fs.existsSync(appDataFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(appDataFilePath, 'utf8'));
      return Boolean(parsed?.settings?.stopOllamaOnExit);
    }
  } catch {}
  return false;
}

function stopOllamaProcessesAsync(endpoint) {
  return new Promise(async (resolve) => {
    // Attempt to unload any running models from RAM/VRAM cleanly first
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1200);
      const psRes = await fetch(`${endpoint}/api/ps`, { signal: controller.signal });
      clearTimeout(t);
      if (psRes.ok) {
        const psData = await psRes.json();
        const models = Array.isArray(psData?.models) ? psData.models : [];
        for (const m of models) {
          const mName = typeof m === 'string' ? m : (m?.name || m?.model);
          if (mName) {
            await fetch(`${endpoint}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: mName, keep_alive: 0 })
            }).catch(() => {});
          }
        }
      }
    } catch {}

    killOllamaSync();

    for (let i = 0; i < 15; i++) {
      const alive = await pingOllamaServer(endpoint);
      if (!alive) break;
      await new Promise(r => setTimeout(r, 200));
    }
    resolve({ status: 'stopped' });
  });
}

ipcMain.handle('get-ollama-host', async () => {
  return resolveOllamaEndpoint();
});

ipcMain.handle('check-ollama-installed', async () => {
  const installed = await checkIsOllamaInstalled();
  return { installed, endpoint: resolveOllamaEndpoint() };
});

ipcMain.handle('start-ollama', async () => {
  const endpoint = resolveOllamaEndpoint();
  const alreadyUp = await pingOllamaServer(endpoint);
  if (alreadyUp) {
    return { status: 'running', endpoint };
  }

  let isInstalled = await checkIsOllamaInstalled();

  // If not installed on Windows, install automatically via Winget
  if (!isInstalled && process.platform === 'win32') {
    const installSuccess = await new Promise((resolve) => {
      exec(
        'winget install -e --id Ollama.Ollama --accept-source-agreements --accept-package-agreements',
        { windowsHide: true, timeout: 300000 },
        (err) => {
          const { dir } = getWinOllamaPaths();
          if (process.env.PATH && !process.env.PATH.includes(dir)) {
            process.env.PATH = `${process.env.PATH};${dir}`;
          }
          resolve(!err);
        }
      );
    });

    isInstalled = installSuccess || (await checkIsOllamaInstalled());
    if (!isInstalled) {
      return {
        status: 'error',
        message: 'Ollama is not installed and automatic Winget installation failed. Please install Ollama from ollama.com.'
      };
    }
  } else if (!isInstalled) {
    return {
      status: 'error',
      message: 'Ollama is not installed on this system. Please install it from ollama.com.'
    };
  }

  // Launch Ollama background server
  try {
    if (process.platform === 'win32') {
      const { cliExe, dir } = getWinOllamaPaths();
      if (process.env.PATH && !process.env.PATH.includes(dir)) {
        process.env.PATH = `${process.env.PATH};${dir}`;
      }

      // Launch "ollama.exe serve" headlessly via Windows Script Host (wscript) with window style 0 (SW_HIDE).
      // This completely suppresses console allocation, preventing any command prompt flashes,
      // and avoids launching "Ollama app.exe" which could open interactive GUI/PowerShell windows.
      const exeToRun = fs.existsSync(cliExe) ? cliExe : 'ollama.exe';
      const vbsFile = path.join(os.tmpdir(), `launch_ollama_${Date.now()}.vbs`);
      const vbsContent = `CreateObject("Wscript.Shell").Run """${exeToRun}"" serve", 0, False`;
      fs.writeFileSync(vbsFile, vbsContent, 'utf8');

      exec(`wscript.exe "${vbsFile}"`, { windowsHide: true }, () => {
        setTimeout(() => {
          try { fs.unlinkSync(vbsFile); } catch (e) {}
        }, 3000);
      });
    } else {
      const child = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    }
  } catch (e) {
    return { status: 'error', message: e.message || 'Failed to launch Ollama process.' };
  }

  // Poll until the HTTP server responds
  for (let i = 0; i < 45; i++) {
    const up = await pingOllamaServer(endpoint);
    if (up) {
      return { status: 'running', endpoint };
    }
    await new Promise(r => setTimeout(r, 350));
  }

  return { status: 'error', message: 'Timed out waiting for Ollama server to start.' };
});

ipcMain.handle('stop-ollama', async () => {
  const endpoint = resolveOllamaEndpoint();
  return await stopOllamaProcessesAsync(endpoint);
});

// Matches a locally installed ":latest" model's 12-char digest hash (e.g. "009acb0d7fe1")
// against https://ollama.com/library/<base> to find which numbered size tag it corresponds to
async function resolveLatestModelTargetTag(baseName, digestHash = '') {
  try {
    const shortHash = (digestHash || '').trim().substring(0, 12).toLowerCase();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`https://ollama.com/library/${encodeURIComponent(baseName)}`, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;

    const html = await res.text();
    const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tagBlocks = html.split(new RegExp(`href="/library/${escapedBase}:`, 'i'));

    let fallbackLatestBadgeTag = null;

    for (let i = 1; i < tagBlocks.length; i++) {
      const block = tagBlocks[i];
      const tagMatch = block.match(/^([^"/?#\s]+)/);
      if (!tagMatch) continue;
      const szTag = tagMatch[1].trim().toLowerCase();
      if (!szTag || szTag === 'latest' || szTag === 'cloud') continue;

      const rowSlice = block.substring(0, 1200).toLowerCase();

      // 1. Primary check: exact 12-character SHA-256 digest hash match (e.g. "009acb0d7fe1")
      if (shortHash && shortHash.length >= 8 && rowSlice.includes(shortHash)) {
        return `${baseName}:${szTag}`;
      }

      // 2. Fallback check: row marked with the "latest" pill badge on Ollama's model page
      if (!fallbackLatestBadgeTag && />\s*latest\s*</i.test(rowSlice)) {
        fallbackLatestBadgeTag = `${baseName}:${szTag}`;
      }
    }

    return fallbackLatestBadgeTag;
  } catch {
    return null;
  }
}

// Fetches live supported models and their exact size tags directly from https://ollama.com/library
ipcMain.handle('fetch-ollama-catalog', async (_event, latestModelsToResolve = []) => {
  const latestMatches = {};

  // Resolve any standalone installed ":latest" models against their model page hashes in parallel
  if (Array.isArray(latestModelsToResolve) && latestModelsToResolve.length > 0) {
    await Promise.all(
      latestModelsToResolve.map(async (item) => {
        const fullTag = (item?.name || '').trim().toLowerCase();
        const [base, sz] = fullTag.split(':');
        if (base && (!sz || sz === 'latest')) {
          const matchedTag = await resolveLatestModelTargetTag(base, item?.digest || '');
          if (matchedTag) {
            latestMatches[fullTag] = matchedTag;
          }
        }
      })
    );
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://ollama.com/library', { signal: controller.signal });
    clearTimeout(t);

    if (res.ok) {
      const html = await res.text();
      const blocks = html.split('href="/library/');
      const discovered = [];
      const seen = new Set();

      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const nameMatch = block.match(/^([^"/?#]+)/);
        if (!nameMatch) continue;
        const modelName = decodeURIComponent(nameMatch[1]).trim().toLowerCase();
        if (!modelName) continue;

        // Skip pure embedding models that cannot generate chat completions
        const isEmbedding = /x-test-capability[^>]*>\s*embedding\s*</i.test(block) ||
          modelName.includes('embed') ||
          modelName.includes('minilm') ||
          modelName === 'bge-m3';
        if (isEmbedding) continue;

        // Match lowercase size badges (e.g. e2b, e4b, 12b, 270m, 1.5m, 8x7b).
        // Case-sensitive (/g without i) so uppercase pull counts like "28.7M" are never matched.
        const sizes = [
          ...block.matchAll(/<span(?![^>]*pull-count)(?![^>]*capability)[^>]*>\s*((?:e?\d+(?:\.\d+)?[bm]|\d+x\d+(?:\.\d+)?[bm]))\s*<\/span>/g)
        ].map(m => m[1]);

        if (sizes.length > 0) {
          for (const sz of sizes) {
            const fullTag = `${modelName}:${sz}`;
            if (!seen.has(fullTag)) {
              seen.add(fullTag);
              discovered.push(fullTag);
            }
          }
        } else {
          const fullTag = `${modelName}:latest`;
          if (!seen.has(fullTag)) {
            seen.add(fullTag);
            discovered.push(fullTag);
          }
        }
      }

      if (discovered.length > 0) {
        return { status: 'ok', models: discovered, latestMatches };
      }
    }
  } catch {}
  return { status: 'offline', models: [], latestMatches };
});

// ---------------- INTERACTIVE TERMINAL SESSION BRIDGE ----------------
let activeSessionDir = null;
let activeSessionElevated = false;
let activeSessionShell = 'PowerShell';

function cleanupSession() {
  const dirToRemove = activeSessionDir;
  activeSessionDir = null;
  activeSessionElevated = false;

  if (dirToRemove && fs.existsSync(dirToRemove)) {
    try {
      fs.writeFileSync(path.join(dirToRemove, 'stop.flag'), '1', 'utf8');
    } catch (e) {}
    setTimeout(() => {
      try { fs.rmSync(dirToRemove, { recursive: true, force: true }); } catch (e) {}
    }, 1500);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.ico');
  const win = new BrowserWindow({
    title: 'ShellAssist',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    width: 1200,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Native right-click context menu (Cut, Copy, Paste, Select All)
  win.webContents.on('context-menu', (_event, params) => {
    const menuTemplate = [];

    if (params.isEditable) {
      menuTemplate.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' }
      );
    } else {
      if (params.selectionText && params.selectionText.trim().length > 0) {
        menuTemplate.push({ role: 'copy' }, { type: 'separator' });
      }
      menuTemplate.push({ role: 'selectAll' });
    }

    if (menuTemplate.length > 0) {
      const menu = Menu.buildFromTemplate(menuTemplate);
      menu.popup({ window: win });
    }
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

ipcMain.handle('start-session', async (_event, { shell, elevate }) => {
  cleanupSession();
  const isWin = process.platform === 'win32';
  activeSessionShell = shell || 'PowerShell';
  activeSessionElevated = Boolean(elevate);

  const sessionDir = path.join(os.tmpdir(), 'shellassist_session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
  fs.mkdirSync(sessionDir, { recursive: true });
  activeSessionDir = sessionDir;

  if (!isWin) {
    return { status: 'connected' };
  }

  const workerScriptPath = path.join(sessionDir, 'worker.ps1');
  const readyFile = path.join(sessionDir, 'ready.flag');
  const stopFile = path.join(sessionDir, 'stop.flag');

  const workerCode = [
    '$OutputEncoding = [System.Text.Encoding]::UTF8',
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '"READY" | Out-File -FilePath "' + readyFile.replace(/\\/g, '\\\\') + '" -Encoding utf8',
    'while (-not (Test-Path "' + stopFile.replace(/\\/g, '\\\\') + '")) {',
    '  $reqFiles = Get-ChildItem -Path "' + sessionDir.replace(/\\/g, '\\\\') + '" -Filter "req_*.ps1" -ErrorAction SilentlyContinue',
    '  foreach ($req in $reqFiles) {',
    '    $id = $req.BaseName.Substring(4)',
    '    $outFile = Join-Path "' + sessionDir.replace(/\\/g, '\\\\') + '" ("out_" + $id + ".txt")',
    '    $statusFile = Join-Path "' + sessionDir.replace(/\\/g, '\\\\') + '" ("status_" + $id + ".txt")',
    '    $Error.Clear()',
    '    $global:LASTEXITCODE = 0',
    '    try {',
    '      $res = & $req.FullName *>&1 | Out-String -Width 160',
    '      if ($null -ne $res) { $res.Trim() | Out-File -FilePath $outFile -Encoding utf8 } else { "" | Out-File -FilePath $outFile -Encoding utf8 }',
    '      if (-not $? -or $Error.Count -gt 0 -or ($global:LASTEXITCODE -ne $null -and $global:LASTEXITCODE -ne 0)) {',
    '        "error" | Out-File -FilePath $statusFile -Encoding utf8',
    '      } else {',
    '        "success" | Out-File -FilePath $statusFile -Encoding utf8',
    '      }',
    '    } catch {',
    '      ($_ | Out-String -Width 160).Trim() | Out-File -FilePath $outFile -Encoding utf8',
    '      "error" | Out-File -FilePath $statusFile -Encoding utf8',
    '    }',
    '    Remove-Item $req.FullName -Force -ErrorAction SilentlyContinue',
    '  }',
    '  Start-Sleep -Milliseconds 120',
    '}'
  ].join('\r\n');

  fs.writeFileSync(workerScriptPath, workerCode, 'utf8');

  return new Promise((resolve) => {
    const encodedWorkerLaunch = Buffer.from(`& "${workerScriptPath}"`, 'utf16le').toString('base64');
    const launchCmd = activeSessionElevated
      ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedWorkerLaunch}'"`
      : `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedWorkerLaunch}'"`;

    exec(launchCmd, (err) => {
      if (err) {
        if (activeSessionDir === sessionDir) cleanupSession();
        return resolve({
          status: 'failed',
          message: activeSessionElevated
            ? 'Administrator elevation (UAC) was declined or cancelled.'
            : (err.message || 'Failed to start terminal session.')
        });
      }

      let checks = 0;
      const timer = setInterval(() => {
        checks++;
        if (fs.existsSync(readyFile)) {
          clearInterval(timer);
          resolve({ status: 'connected' });
        } else if (checks > 120) {
          clearInterval(timer);
          if (activeSessionDir === sessionDir) cleanupSession();
          resolve({ status: 'failed', message: 'Timed out waiting for terminal session to initialize.' });
        }
      }, 150);
    });
  });
});

ipcMain.handle('stop-session', async () => {
  cleanupSession();
  return { status: 'stopped' };
});

ipcMain.handle('run-command', async (_event, { command, shell, elevate, useActiveSession }) => {
  return new Promise((resolve) => {
    if (!command || !command.trim()) {
      return resolve({ status: 'error', output: '', message: 'Empty command.' });
    }
    const isWin = process.platform === 'win32';
    const cleanShell = (shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();

    if (isWin && useActiveSession && activeSessionDir && fs.existsSync(activeSessionDir) && (activeSessionElevated || !elevate)) {
      const cmdId = Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const reqFile = path.join(activeSessionDir, `req_${cmdId}.ps1`);
      const outFile = path.join(activeSessionDir, `out_${cmdId}.txt`);
      const statusFile = path.join(activeSessionDir, `status_${cmdId}.txt`);

      const body = cleanShell === 'CMD'
        ? `cmd.exe /c ${JSON.stringify(command)}`
        : command;

      fs.writeFileSync(reqFile, body, 'utf8');

      let elapsed = 0;
      const poll = setInterval(() => {
        elapsed += 120;
        if (fs.existsSync(statusFile)) {
          clearInterval(poll);
          const statusRaw = (fs.readFileSync(statusFile, 'utf8') || '').trim();
          const outputRaw = fs.existsSync(outFile) ? (fs.readFileSync(outFile, 'utf8') || '').trim() : '';
          try { fs.unlinkSync(statusFile); } catch (e) {}
          try { fs.unlinkSync(outFile); } catch (e) {}

          if (statusRaw === 'error') {
            resolve({
              status: 'error',
              output: outputRaw || 'Command returned an error.',
              message: 'Command returned a non-zero exit code.'
            });
          } else {
            resolve({
              status: 'success',
              output: outputRaw,
              message: 'Ran successfully.'
            });
          }
        } else if (elapsed > 60000) {
          clearInterval(poll);
          resolve({ status: 'error', output: 'Execution timed out after 60s.', message: 'Command timed out.' });
        }
      }, 120);
      return;
    }

    if (isWin) {
      const tempId = Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const scriptFile = path.join(os.tmpdir(), `sa_cmd_${tempId}.ps1`);
      const outFile = path.join(os.tmpdir(), `sa_out_${tempId}.txt`);
      const statusFile = path.join(os.tmpdir(), `sa_status_${tempId}.txt`);

      const innerCmd = cleanShell === 'CMD'
        ? `cmd.exe /c "${command.replace(/"/g, '\\"')}"`
        : command;

      const psWrapper = [
        '$OutputEncoding = [System.Text.Encoding]::UTF8',
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
        '$Error.Clear()',
        '$global:LASTEXITCODE = 0',
        'try {',
        '  $res = & {',
        '    ' + innerCmd,
        '  } *>&1 | Out-String -Width 160',
        '  if ($null -ne $res) { $res.Trim() | Out-File -FilePath "' + outFile.replace(/\\/g, '\\\\') + '" -Encoding utf8 } else { "" | Out-File -FilePath "' + outFile.replace(/\\/g, '\\\\') + '" -Encoding utf8 }',
        '  if (-not $? -or $Error.Count -gt 0 -or ($global:LASTEXITCODE -ne $null -and $global:LASTEXITCODE -ne 0)) {',
        '    "error" | Out-File -FilePath "' + statusFile.replace(/\\/g, '\\\\') + '" -Encoding utf8',
        '  } else {',
        '    "success" | Out-File -FilePath "' + statusFile.replace(/\\/g, '\\\\') + '" -Encoding utf8',
        '  }',
        '} catch {',
        '  ($_ | Out-String -Width 160).Trim() | Out-File -FilePath "' + outFile.replace(/\\/g, '\\\\') + '" -Encoding utf8',
        '  "error" | Out-File -FilePath "' + statusFile.replace(/\\/g, '\\\\') + '" -Encoding utf8',
        '}'
      ].join('\r\n');

      fs.writeFileSync(scriptFile, psWrapper, 'utf8');

      const encodedScriptLaunch = Buffer.from(`& "${scriptFile}"`, 'utf16le').toString('base64');
      const execCmd = elevate
        ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -WindowStyle Hidden -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedScriptLaunch}'"`
        : `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedScriptLaunch}`;

      exec(execCmd, { timeout: 60000, maxBuffer: 1024 * 1024 * 10 }, (err) => {
        const statusRaw = fs.existsSync(statusFile) ? (fs.readFileSync(statusFile, 'utf8') || '').trim() : '';
        const outputRaw = fs.existsSync(outFile) ? (fs.readFileSync(outFile, 'utf8') || '').trim() : '';
        try { fs.unlinkSync(scriptFile); } catch (e) {}
        try { fs.unlinkSync(outFile); } catch (e) {}
        try { fs.unlinkSync(statusFile); } catch (e) {}

        if (err && !statusRaw) {
          return resolve({
            status: 'error',
            output: outputRaw || err.message,
            message: elevate ? 'Administrator elevation was declined or command failed.' : 'Command returned a non-zero exit code.'
          });
        }
        if (statusRaw === 'error') {
          return resolve({
            status: 'error',
            output: outputRaw || 'Command failed with an error.',
            message: 'Command returned a non-zero exit code.'
          });
        }
        return resolve({
          status: 'success',
          output: outputRaw,
          message: 'Ran successfully.'
        });
      });
      return;
    }

    const unixShell = cleanShell === 'Zsh' ? '/bin/zsh' : '/bin/bash';
    exec(command, { shell: unixShell, timeout: 60000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      const combinedOutput = ((stdout || '') + (stderr ? '\n' + stderr : '')).trim();
      if (error) {
        resolve({ status: 'error', output: combinedOutput || error.message, message: 'Command returned a non-zero exit code.' });
      } else {
        resolve({ status: 'success', output: combinedOutput, message: 'Ran successfully.' });
      }
    });
  });
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  cleanupSession();
  if (shouldStopOllamaOnExit()) {
    killOllamaSync();
  }
});

app.on('window-all-closed', () => {
  cleanupSession();
  if (shouldStopOllamaOnExit()) {
    killOllamaSync();
  }
  if (process.platform !== 'darwin') app.quit();
});