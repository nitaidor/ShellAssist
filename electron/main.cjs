const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
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

ipcMain.on('load-app-data', (event) => {
  try {
    if (fs.existsSync(appDataFilePath)) {
      const raw = fs.readFileSync(appDataFilePath, 'utf8');
      event.returnValue = JSON.parse(raw);
      return;
    }
  } catch (e) {}
  event.returnValue = null;
});

ipcMain.handle('save-app-data', async (_event, data) => {
  try {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    fs.writeFileSync(appDataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return { status: 'saved' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

let activeSessionDir = null;
let activeSessionElevated = false;
let activeSessionShell = 'PowerShell';

// Captures dirToRemove locally so the 1500ms cleanup timer never deletes a newly started session
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
    // Use Base64 EncodedCommand to avoid any path-quoting issues when elevating via Start-Process -Verb RunAs
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

    // 1. Only dispatch to the persistent background worker if this call came from the Interactive Terminal tab (useActiveSession === true)
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

    // 2. Isolated single-shot execution (1-Click Run in Builder, Analyzer, and Debugger — spawns a separate terminal and closes immediately after)
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
});

app.on('window-all-closed', () => {
  cleanupSession();
  if (process.platform !== 'darwin') app.quit();
});