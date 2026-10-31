import { checkRequiresElevation } from '../utils/platform';
import { fetchCommandSimulation } from './gemini';

export const startTerminalSession = async (ctx, settings, isSimulated = false) => {
  // Simulated terminal sessions always connect immediately without touching host OS
  if (isSimulated) {
    return { status: 'connected' };
  }

  const isDesktop = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.startSession === 'function';
  const cleanShell = (ctx?.shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();

  if (!isDesktop) {
    return { status: 'failed', message: 'Connection failed: Real bridge requires a desktop environment.' };
  }

  try {
    const res = await window.electronAPI.startSession({
      os: cleanOs,
      shell: cleanShell,
      elevate: Boolean(ctx?.isElevated)
    });
    return res;
  } catch (err) {
    return { status: 'failed', message: err?.message || `Failed to start ${cleanShell} terminal process.` };
  }
};

export const stopTerminalSession = async () => {
  const isDesktop = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.stopSession === 'function';
  if (isDesktop) {
    try {
      await window.electronAPI.stopSession();
    } catch (e) {}
  }
};

export const executeTerminalCommand = async (
  command,
  ctx,
  settings,
  sessionTranscript = "",
  forceElevate = false,
  isSimulated = false,
  useActiveSession = false
) => {
  // 1. Simulated Terminal Mode: Uses your active AI provider (Gemini, ChatGPT, Claude, or Ollama) in Smart Mode
  if (isSimulated) {
    try {
      const parsed = await fetchCommandSimulation(command, ctx, sessionTranscript, settings);
      return {
        status: parsed.status === 'error' ? 'error' : 'success',
        output: parsed.terminalOutput || '',
        message: parsed.summaryMessage || 'Ran successfully.',
        elevate: false
      };
    } catch (err) {
      return {
        status: 'failed',
        output: '',
        message: err.message || 'Could not connect to AI simulation engine.'
      };
    }
  }

  // 2. Real Terminal Mode: Strictly runs through local desktop processes
  const needsElevation = Boolean(ctx?.isElevated || forceElevate || checkRequiresElevation(command));
  const cleanShell = (ctx?.shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();

  const isDesktop = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.runCommand === 'function';

  if (!isDesktop) {
    await new Promise(r => setTimeout(r, 300));
    return {
      status: 'failed',
      output: '',
      message: 'Local terminal execution requires running ShellAssist as a desktop application.'
    };
  }

  try {
    const res = await window.electronAPI.runCommand({
      command,
      os: cleanOs,
      shell: cleanShell,
      elevate: needsElevation,
      useActiveSession: Boolean(useActiveSession)
    });
    return res;
  } catch (err) {
    return {
      status: 'failed',
      output: '',
      message: err?.message || `Failed to communicate with local ${cleanShell} process.`
    };
  }
};