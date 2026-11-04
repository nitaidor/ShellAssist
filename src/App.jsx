import React, { useState, useEffect, useRef } from 'react';
import Header from './components/common/Header';
import TabNav from './components/common/TabNav';
import SimulatedTab from './tabs/simulated/SimulatedTab';
import InteractiveTab from './tabs/interactive/InteractiveTab';
import CommandBuilderTab from './tabs/builder/CommandBuilderTab';
import CodeAnalyzerTab from './tabs/analyzer/CodeAnalyzerTab';
import GeneralDebuggerTab from './tabs/debugger/GeneralDebuggerTab';
import SettingsModal from './components/modals/SettingsModal';
import HelpModal from './components/modals/HelpModal';
import AboutModal from './components/modals/AboutModal';
import {
  TerminalDisclaimerModal,
  RequiresElevationModal,
  NewSessionConfirmModal,
  StopSessionConfirmModal,
  UnfinishedCommandModal,
  ClearHistoryModal
} from './components/modals/ConfirmationModals';
import { loadPersistedState, savePersistedState } from './utils/storage';
import { detectHostOS, getInteractiveShellOptions, generateId } from './utils/platform';
import { executeTerminalCommand, startTerminalSession, stopTerminalSession } from './services/terminal';
import {
  fetchCommandGeneration,
  fetchInteractiveAutoDebug,
  validateGeminiKey,
  validateOpenaiKey,
  validateClaudeKey,
  validateOllamaEndpoint,
  MODEL
} from './services/gemini';
import './styles/themes.css';

// Error Boundary prevents uncaught render errors from turning the screen black
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("App render error caught by boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="bg-[#161b22] border border-[#30363d] p-8 rounded-xl max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-gray-400 font-mono">{this.state.error?.message || 'Unexpected application error'}</p>
            <button
              onClick={() => {
                localStorage.removeItem('BYOK_PROVIDER');
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold"
            >
              Reload & Reset
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const persisted = useRef(loadPersistedState());

  // App & Display State (Default tab set to 'builder')
  const [isDarkMode, setIsDarkMode] = useState(() => persisted.current?.isDarkMode ?? true);
  const [showMenu, setShowMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTerminalDisclaimerModal, setShowTerminalDisclaimerModal] = useState(false);
  const [historyClearModal, setHistoryClearModal] = useState(null);
  const [activeTab, setActiveTab] = useState('builder');

  const [settings, setSettings] = useState(() => {
    const savedByokKey = typeof window !== 'undefined' ? localStorage.getItem('BYOK_GEMINI_KEY') || '' : '';
    const initialKey = persisted.current?.settings?.apiKey || persisted.current?.settings?.geminiApiKey || savedByokKey;
    const initialSavedList = persisted.current?.settings?.savedGeminiKeys?.length 
      ? persisted.current.settings.savedGeminiKeys 
      : (initialKey ? [initialKey] : []);

    const savedLocalConfigs = persisted.current?.settings?.savedLocalConfigs || [];
    const hasSavedLocal = Array.isArray(savedLocalConfigs) && savedLocalConfigs.length > 0;

    return {
      apiProvider: 'gemini',
      apiKey: initialKey,
      geminiApiKey: initialKey,
      geminiModel: 'gemini-3.8-flash',
      savedGeminiKeys: initialSavedList,
      openaiApiKey: persisted.current?.settings?.openaiApiKey || '',
      openaiModel: 'gpt-4o-mini',
      savedOpenaiKeys: persisted.current?.settings?.savedOpenaiKeys || [],
      claudeApiKey: persisted.current?.settings?.claudeApiKey || '',
      claudeModel: 'claude-3-5-sonnet',
      savedClaudeKeys: persisted.current?.settings?.savedClaudeKeys || [],
      enableExecution: false,
      darkTheme: 'default',
      lightTheme: 'default',
      clockFormat: '12h',
      ...(persisted.current?.settings || {}),
      savedLocalConfigs,
      localEndpoint: hasSavedLocal ? (persisted.current?.settings?.localEndpoint || savedLocalConfigs[0].endpoint) : '',
      localModel: hasSavedLocal ? (persisted.current?.settings?.localModel || savedLocalConfigs[0].model) : ''
    };
  });

  // Calculate and mount theme class directly onto <html> root element & update Electron native menu
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-terminal-green', 'theme-terminal-red', 'theme-light', 'theme-monochrome');
    if (!isDarkMode) {
      root.classList.add('theme-light');
      if (settings.lightTheme === 'monochrome') root.classList.add('theme-monochrome');
    } else {
      if (settings.darkTheme === 'green') root.classList.add('theme-terminal-green');
      if (settings.darkTheme === 'red') root.classList.add('theme-terminal-red');
    }

    // Synchronize native OS right-click context menus with app theme state
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.setNativeTheme === 'function') {
      window.electronAPI.setNativeTheme(isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode, settings.darkTheme, settings.lightTheme]);

  // Live API Health Status
  const [apiStatus, setApiStatus] = useState('checking');

  // Background Live Validation
  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      const provider = settings.apiProvider || 'gemini';

      try {
        if (provider === 'gemini') {
          const key = (settings.geminiApiKey || settings.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_GEMINI_KEY') : '') || '').trim();
          if (!key) { if (active) setApiStatus('missing'); return; }
          if (active) setApiStatus('checking');
          const ok = await validateGeminiKey(key);
          if (active) setApiStatus(ok ? 'valid' : 'invalid');
        } else if (provider === 'openai') {
          const key = (settings.openaiApiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_OPENAI_KEY') : '') || '').trim();
          if (!key) { if (active) setApiStatus('missing'); return; }
          if (active) setApiStatus('checking');
          const ok = await validateOpenaiKey(key);
          if (active) setApiStatus(ok ? 'valid' : 'invalid');
        } else if (provider === 'claude') {
          const key = (settings.claudeApiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_CLAUDE_KEY') : '') || '').trim();
          if (!key) { if (active) setApiStatus('missing'); return; }
          if (active) setApiStatus('checking');
          const ok = await validateClaudeKey(key);
          if (active) setApiStatus(ok ? 'valid' : 'invalid');
        } else if (provider === 'ollama') {
          const hasSaved = Array.isArray(settings.savedLocalConfigs) && settings.savedLocalConfigs.length > 0;
          const end = (settings.localEndpoint || '').trim();
          const mod = (settings.localModel || '').trim();
          if (!hasSaved || !end || !mod) { if (active) setApiStatus('missing'); return; }
          if (active) setApiStatus('checking');
          const ok = await validateOllamaEndpoint(end);
          if (active) setApiStatus(ok ? 'valid' : 'invalid');
        }
      } catch (e) {
        if (active) setApiStatus('invalid');
      }
    };
    checkStatus();
    return () => { active = false; };
  }, [settings.apiProvider, settings.apiKey, settings.geminiApiKey, settings.openaiApiKey, settings.claudeApiKey, settings.localEndpoint, settings.localModel, settings.savedLocalConfigs]);

  // Host OS & Desktop Detection
  const isDesktopEnv = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.runCommand === 'function';
  const hostOs = isDesktopEnv ? detectHostOS() : 'WebView';
  const interactiveShellOptions = hostOs === 'WebView' ? ['N/A'] : getInteractiveShellOptions(hostOs);

  const [selectedInteractiveShell, setSelectedInteractiveShell] = useState(interactiveShellOptions[0] || 'PowerShell');
  const [runInteractiveAsAdmin, setRunInteractiveAsAdmin] = useState(false);
  useEffect(() => { setSelectedInteractiveShell(interactiveShellOptions[0] || 'PowerShell'); }, [hostOs]);

  // Tab 0: Simulated Terminal State
  const [selectedSimOs, setSelectedSimOs] = useState('Windows');
  const [selectedSimShell, setSelectedSimShell] = useState('PowerShell');
  const [runSimulatedAsAdmin, setRunSimulatedAsAdmin] = useState(false);
  const [activeSimulatedSession, setActiveSimulatedSession] = useState(null);
  const [simulatedConnectionError, setSimulatedConnectionError] = useState(null);
  const [lastFailedSimulatedTurn, setLastFailedSimulatedTurn] = useState(null);
  const [simulatedInitialInput, setSimulatedInitialInput] = useState('');
  const [simulatedNextInput, setSimulatedNextInput] = useState('');
  const [isSimulatedGenerating, setIsSimulatedGenerating] = useState(false);
  const [simElevationModalTurn, setSimElevationModalTurn] = useState(null);
  const [showSimNewSessionConfirmModal, setShowSimNewSessionConfirmModal] = useState(false);
  const [showSimStopSessionConfirmModal, setShowSimStopSessionConfirmModal] = useState(false);
  const [simulatedHistory, setSimulatedHistory] = useState(() => persisted.current?.simulatedHistory || []);
  const simCancelRef = useRef(0);
  const simExecCancelRef = useRef(0);

  // Tab 1: Interactive Terminal State
  const [activeInteractiveSession, setActiveInteractiveSession] = useState(null);
  const [interactiveConnectionError, setInteractiveConnectionError] = useState(null);
  const [lastFailedInteractiveTurn, setLastFailedInteractiveTurn] = useState(null);
  const [interactiveInitialInput, setInteractiveInitialInput] = useState('');
  const [interactiveNextInput, setInteractiveNextInput] = useState('');
  const [isInteractiveStarting, setIsInteractiveStarting] = useState(false);
  const [isInteractiveGenerating, setIsInteractiveGenerating] = useState(false);
  const [elevationModalTurn, setElevationModalTurn] = useState(null);
  const interactiveCancelRef = useRef(0);
  const primaryExecCancelRef = useRef(0);
  const [interactiveHistory, setInteractiveHistory] = useState(() => persisted.current?.interactiveHistory || []);
  const [showNewSessionConfirmModal, setShowNewSessionConfirmModal] = useState(false);
  const [showStopSessionConfirmModal, setShowStopSessionConfirmModal] = useState(false);
  const [unfinishedCommandConfirm, setUnfinishedCommandConfirm] = useState(null);

  // Lock background page scroll whenever any modal dialog is open
  const isAnyModalOpen = Boolean(
    showHelpModal ||
    showSettingsModal ||
    showAboutModal ||
    showTerminalDisclaimerModal ||
    simElevationModalTurn !== null ||
    elevationModalTurn !== null ||
    showSimNewSessionConfirmModal ||
    showSimStopSessionConfirmModal ||
    showNewSessionConfirmModal ||
    showStopSessionConfirmModal ||
    unfinishedCommandConfirm ||
    historyClearModal
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      document.documentElement.classList.add('modal-open');
    } else {
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.documentElement.classList.remove('modal-open');
    };
  }, [isAnyModalOpen]);

  // Tab 2: Builder State
  const [history, setHistory] = useState(() => persisted.current?.history || []);
  const [favorites, setFavorites] = useState(() => persisted.current?.favorites || []);

  // Tab 3: Analyzer State
  const [analyzerHistory, setAnalyzerHistory] = useState(() => persisted.current?.analyzerHistory || []);

  // Tab 4: Debugger State
  const [debugHistory, setDebugHistory] = useState(() => persisted.current?.debugHistory || []);

  // Sync active sessions to history state
  useEffect(() => {
    if (activeSimulatedSession) {
      setSimulatedHistory(prev => {
        const idx = prev.findIndex(s => s.id === activeSimulatedSession.id);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = activeSimulatedSession; return copy; }
        return [activeSimulatedSession, ...prev];
      });
    }
  }, [activeSimulatedSession]);

  useEffect(() => {
    if (activeInteractiveSession) {
      setInteractiveHistory(prev => {
        const idx = prev.findIndex(s => s.id === activeInteractiveSession.id);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = activeInteractiveSession; return copy; }
        return [activeInteractiveSession, ...prev];
      });
    }
  }, [activeInteractiveSession]);

  // Persist State
  useEffect(() => {
    savePersistedState({ isDarkMode, settings, history, favorites, simulatedHistory, interactiveHistory, analyzerHistory, debugHistory });
  }, [isDarkMode, settings, history, favorites, simulatedHistory, interactiveHistory, analyzerHistory, debugHistory]);

  // Sync Favorites
  useEffect(() => {
    const newFavorites = favorites.map(fav => {
      const h = history.find(x => x.id === fav.id);
      return h ? h : fav;
    }).filter(f => f.turns.some(t => t.isStarred));
    history.forEach(h => {
      if (h.turns.some(t => t.isStarred) && !newFavorites.find(f => f.id === h.id)) newFavorites.push(h);
    });
    setFavorites(newFavorites.sort((a,b) => b.unixTime - a.unixTime));
  }, [history]);

  // Terminal integration toggle
  const handleToggleTerminalIntegration = (checked) => {
    if (checked) setShowTerminalDisclaimerModal(true);
    else setSettings(prev => ({ ...prev, enableExecution: false }));
  };

  // ---------------- SIMULATED TERMINAL HANDLERS ----------------
  const archiveAndCloseSimulatedSession = (sessionToArchive) => {
    if (!sessionToArchive) return;
    simCancelRef.current++;
    simExecCancelRef.current++;
    setIsSimulatedGenerating(false);
    const timeStr = new Date().toLocaleTimeString(undefined, { hour12: settings.clockFormat === '12h' });
    const closedTranscript = `${sessionToArchive.fullTranscript}\n[${timeStr}] Simulated session closed.`.trim();
    const archived = { ...sessionToArchive, fullTranscript: closedTranscript, closedAt: new Date().toLocaleString() };
    setSimulatedHistory(prev => [archived, ...prev.filter(s => s.id !== sessionToArchive.id)]);
    setActiveSimulatedSession(null);
  };

  const initiateSimulatedSession = (overrideElevate = null, copiedPromptText = '') => {
    simCancelRef.current++;
    simExecCancelRef.current++;
    setSimulatedConnectionError(null);
    setLastFailedSimulatedTurn(null);
    setIsSimulatedGenerating(false);

    const isElevated = overrideElevate !== null ? Boolean(overrideElevate) : Boolean(runSimulatedAsAdmin);
    const sessionCtx = {
      os: selectedSimOs,
      shell: selectedSimShell,
      type: 'Command',
      isElevated,
      isSimulated: true
    };

    const now = new Date();
    const timeStr = now.toLocaleTimeString(undefined, { hour12: settings.clockFormat === '12h' });
    const shellLabel = isElevated ? `${selectedSimShell} (Elevated)` : selectedSimShell;

    const newSession = {
      id: generateId(),
      dateTime: now.toLocaleString(),
      unixTime: Date.now(),
      ctx: sessionCtx,
      turns: [],
      fullTranscript: `[${timeStr}] Connected to ${shellLabel} on ${selectedSimOs} (Simulated).\n`
    };
    setActiveSimulatedSession(newSession);
    setSimulatedHistory(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
    setSimulatedInitialInput(copiedPromptText || '');
    setSimulatedNextInput('');
  };

  // Turn is ALWAYS generated without premature blocking
  const handleGenerateSimulatedTurn = async (isInitial = false, overridePrompt = null) => {
    const promptText = overridePrompt !== null ? overridePrompt : (isInitial ? simulatedInitialInput : simulatedNextInput);
    if (!promptText.trim() || !activeSimulatedSession || isSimulatedGenerating) return;

    if (overridePrompt === null) {
      if (isInitial) setSimulatedInitialInput(''); else setSimulatedNextInput('');
    }

    const genId = ++simCancelRef.current;
    setIsSimulatedGenerating(true);
    setSimulatedConnectionError(null);
    try {
      const result = await fetchCommandGeneration(promptText, activeSimulatedSession.turns, activeSimulatedSession.ctx, 'en-to-code', true, settings);
      if (simCancelRef.current !== genId) return;

      setApiStatus('valid');

      const newTurn = {
        ...result,
        id: generateId(),
        prompt: promptText,
        ctx: activeSimulatedSession.ctx,
        runState: 'idle',
        runMessage: '',
        runOutput: '',
        debugCycles: []
      };
      setActiveSimulatedSession(prev => prev ? { ...prev, turns: [...prev.turns, newTurn] } : prev);
      setLastFailedSimulatedTurn(null);
    } catch (err) {
      if (simCancelRef.current !== genId) return;
      setLastFailedSimulatedTurn({ isInitial, prompt: promptText });
      setSimulatedConnectionError(err.message || "Failed to generate simulated command.");
    } finally {
      if (simCancelRef.current === genId) setIsSimulatedGenerating(false);
    }
  };

  const executeSimulatedPrimaryCommand = async (turnId, sessionOverride = null) => {
    const currentSession = sessionOverride || activeSimulatedSession;
    if (!currentSession) return;
    const targetTurn = currentSession.turns.find(t => t.id === turnId);
    if (!targetTurn) return;

    const execId = ++simExecCancelRef.current;
    setActiveSimulatedSession(prev => prev ? {
      ...prev,
      turns: prev.turns.map(t => t.id === turnId ? { ...t, runState: 'running', debugCycles: [] } : t)
    } : prev);

    const res = await executeTerminalCommand(
      targetTurn.command,
      currentSession.ctx,
      settings,
      currentSession.fullTranscript,
      Boolean(currentSession.ctx?.isElevated),
      true,
      false
    );

    if (simExecCancelRef.current !== execId) return;
    const updatedTranscript = (currentSession.fullTranscript + `\n> ${targetTurn.command}\n${res.output || res.message}\n`).trim();

    if (res.status === 'success') {
      setApiStatus('valid');
      setActiveSimulatedSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, runState: 'success', runMessage: res.message, runOutput: res.output } : t)
      } : prev);
    } else if (res.status === 'failed') {
      setActiveSimulatedSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, runState: 'failed', runMessage: res.message } : t)
      } : prev);
    } else {
      const cycleId = generateId();
      const newCycle = { id: cycleId, attemptType: 'error', errorMessage: res.message, terminalSnapshot: updatedTranscript, isAnalyzing: true, fixExplanation: '', fixCommand: '', fixStatus: 'idle', fixResultMessage: '', fixResultOutput: '' };
      setActiveSimulatedSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, runState: 'error', runMessage: res.message, runOutput: res.output, debugCycles: [newCycle] } : t)
      } : prev);

      try {
        const debugRes = await fetchInteractiveAutoDebug(targetTurn.prompt, targetTurn.command, updatedTranscript, currentSession.ctx, settings);
        setApiStatus('valid');
        setActiveSimulatedSession(prev => prev ? {
          ...prev,
          turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, isAnalyzing: false, fixExplanation: debugRes.explanation, fixCommand: debugRes.fixCommand } : c) } : t)
        } : prev);
      } catch {
        setActiveSimulatedSession(prev => prev ? {
          ...prev,
          turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, isAnalyzing: false, fixExplanation: 'Failed to simulate fix.', fixCommand: '' } : c) } : t)
        } : prev);
      }
    }
  };

  const handleRunSimulatedFixCommand = async (turnId, cycleId, fixCmd) => {
    if (!activeSimulatedSession) return;
    setActiveSimulatedSession(prev => prev ? {
      ...prev,
      turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, fixStatus: 'running' } : c) } : t)
    } : prev);

    const res = await executeTerminalCommand(
      fixCmd,
      activeSimulatedSession.ctx,
      settings,
      activeSimulatedSession.fullTranscript,
      Boolean(activeSimulatedSession.ctx?.isElevated),
      true,
      false
    );
    const updatedTranscript = (activeSimulatedSession.fullTranscript + `\n> ${fixCmd}\n${res.output || res.message}\n`).trim();

    if (res.status === 'success') {
      setApiStatus('valid');
      setActiveSimulatedSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, fixStatus: 'success', fixResultMessage: res.message, fixResultOutput: res.output } : c) } : t)
      } : prev);
    } else if (res.status === 'failed') {
      setActiveSimulatedSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, fixStatus: 'failed', fixResultMessage: res.message } : c) } : t)
      } : prev);
    } else {
      const nextCycleId = generateId();
      const nextCycle = { id: nextCycleId, attemptType: 'error', errorMessage: res.message, terminalSnapshot: updatedTranscript, isAnalyzing: true, fixExplanation: '', fixCommand: '', fixStatus: 'idle', fixResultMessage: '', fixResultOutput: '' };
      setActiveSimulatedSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: [...t.debugCycles.map(c => c.id === cycleId ? { ...c, fixStatus: 'error' } : c), nextCycle] } : t)
      } : prev);

      try {
        const debugRes = await fetchInteractiveAutoDebug(activeSimulatedSession.turns.find(t => t.id === turnId).prompt, fixCmd, updatedTranscript, activeSimulatedSession.ctx, settings);
        setApiStatus('valid');
        setActiveSimulatedSession(prev => prev ? {
          ...prev,
          turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === nextCycleId ? { ...c, isAnalyzing: false, fixExplanation: debugRes.explanation, fixCommand: debugRes.fixCommand } : c) } : t)
        } : prev);
      } catch {
        setActiveSimulatedSession(prev => prev ? {
          ...prev,
          turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === nextCycleId ? { ...c, isAnalyzing: false, fixExplanation: 'Failed to simulate subsequent fix.', fixCommand: '' } : c) } : t)
        } : prev);
      }
    }
  };

  // Choice 3: End & Run as Admin in Simulated Terminal
  const handleSimulatedEndAndRunAsAdmin = () => {
    const targetTurn = simElevationModalTurn;
    setSimElevationModalTurn(null);
    setRunSimulatedAsAdmin(true);
    if (activeSimulatedSession) archiveAndCloseSimulatedSession(activeSimulatedSession);

    simCancelRef.current++;
    simExecCancelRef.current++;
    setSimulatedConnectionError(null);
    setLastFailedSimulatedTurn(null);
    setIsSimulatedGenerating(false);

    const now = new Date();
    const timeStr = now.toLocaleTimeString(undefined, { hour12: settings.clockFormat === '12h' });
    const sessionCtx = {
      os: selectedSimOs,
      shell: selectedSimShell,
      type: 'Command',
      isElevated: true,
      isSimulated: true
    };
    const shellLabel = `${selectedSimShell} (Elevated)`;
    const elevatedTurn = targetTurn ? { ...targetTurn, ctx: sessionCtx, runState: 'idle' } : null;

    const newSession = {
      id: generateId(),
      dateTime: now.toLocaleString(),
      unixTime: Date.now(),
      ctx: sessionCtx,
      turns: elevatedTurn ? [elevatedTurn] : [],
      fullTranscript: `[${timeStr}] Connected to ${shellLabel} on ${selectedSimOs} (Simulated).\n`
    };

    setActiveSimulatedSession(newSession);
    setSimulatedHistory(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
    setSimulatedInitialInput('');
    setSimulatedNextInput('');

    if (elevatedTurn) {
      executeSimulatedPrimaryCommand(elevatedTurn.id, newSession);
    }
  };

  // ---------------- INTERACTIVE REAL TERMINAL HANDLERS ----------------
  const archiveAndCloseActiveInteractiveSession = async (sessionToArchive) => {
    if (!sessionToArchive) return;
    interactiveCancelRef.current++;
    primaryExecCancelRef.current++;
    setIsInteractiveGenerating(false);
    const timeStr = new Date().toLocaleTimeString(undefined, { hour12: settings.clockFormat === '12h' });
    const closedTranscript = `${sessionToArchive.fullTranscript}\n[${timeStr}] Session closed and terminal process terminated.`.trim();
    const archived = { ...sessionToArchive, fullTranscript: closedTranscript, closedAt: new Date().toLocaleString() };
    setInteractiveHistory(prev => [archived, ...prev.filter(s => s.id !== sessionToArchive.id)]);
    setActiveInteractiveSession(null);
    await stopTerminalSession();
  };

  const initiateInteractiveSession = async (overrideElevate = null, copiedPromptText = '') => {
    if (isInteractiveStarting) return;
    interactiveCancelRef.current++;
    primaryExecCancelRef.current++;
    setInteractiveConnectionError(null);
    setLastFailedInteractiveTurn(null);
    setIsInteractiveGenerating(false);

    const isElevated = overrideElevate !== null ? Boolean(overrideElevate) : Boolean(runInteractiveAsAdmin);
    const sessionCtx = {
      os: hostOs,
      shell: selectedInteractiveShell,
      type: 'Command',
      isElevated
    };

    setIsInteractiveStarting(true);
    try {
      const startRes = await startTerminalSession(sessionCtx, settings, false);
      if (startRes?.status === 'failed') {
        setInteractiveConnectionError(startRes.message || `Failed to start ${selectedInteractiveShell} session.`);
        setActiveInteractiveSession(null);
        return;
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString(undefined, { hour12: settings.clockFormat === '12h' });
      const shellLabel = isElevated ? `${selectedInteractiveShell} (Elevated)` : selectedInteractiveShell;

      const newSession = {
        id: generateId(),
        dateTime: now.toLocaleString(),
        unixTime: Date.now(),
        ctx: sessionCtx,
        turns: [],
        fullTranscript: `[${timeStr}] Connected to ${shellLabel} on ${hostOs}.\n`
      };
      setActiveInteractiveSession(newSession);
      setInteractiveHistory(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
      setInteractiveInitialInput(copiedPromptText || '');
      setInteractiveNextInput('');
    } finally {
      setIsInteractiveStarting(false);
    }
  };

  const handleGenerateInteractiveTurn = async (isInitial = false, overridePrompt = null) => {
    const promptText = overridePrompt !== null ? overridePrompt : (isInitial ? interactiveInitialInput : interactiveNextInput);
    if (!promptText.trim() || !activeInteractiveSession || isInteractiveGenerating) return;

    if (overridePrompt === null) {
      if (isInitial) setInteractiveInitialInput(''); else setInteractiveNextInput('');
    }
    const genId = ++interactiveCancelRef.current;
    setIsInteractiveGenerating(true);
    setInteractiveConnectionError(null);
    try {
      const result = await fetchCommandGeneration(promptText, activeInteractiveSession.turns, activeInteractiveSession.ctx, 'en-to-code', true, settings);
      if (interactiveCancelRef.current !== genId) return;

      setApiStatus('valid');

      const newTurn = {
        ...result,
        id: generateId(),
        prompt: promptText,
        ctx: activeInteractiveSession.ctx,
        runState: 'idle',
        runMessage: '',
        runOutput: '',
        debugCycles: []
      };
      setActiveInteractiveSession(prev => prev ? { ...prev, turns: [...prev.turns, newTurn] } : prev);
      setLastFailedInteractiveTurn(null);
    } catch (err) {
      if (interactiveCancelRef.current !== genId) return;
      setLastFailedInteractiveTurn({ isInitial, prompt: promptText });
      setInteractiveConnectionError(err.message || "Failed to generate command.");
    } finally {
      if (interactiveCancelRef.current === genId) setIsInteractiveGenerating(false);
    }
  };

  const executeInteractivePrimaryCommand = async (turnId, sessionOverride = null) => {
    const currentSession = sessionOverride || activeInteractiveSession;
    if (!currentSession) return;
    const targetTurn = currentSession.turns.find(t => t.id === turnId);
    if (!targetTurn) return;

    const execId = ++primaryExecCancelRef.current;
    setActiveInteractiveSession(prev => prev ? {
      ...prev,
      turns: prev.turns.map(t => t.id === turnId ? { ...t, runState: 'running', debugCycles: [] } : t)
    } : prev);

    const res = await executeTerminalCommand(
      targetTurn.command,
      currentSession.ctx,
      settings,
      currentSession.fullTranscript,
      Boolean(currentSession.ctx?.isElevated),
      false,
      true
    );

    if (primaryExecCancelRef.current !== execId) return;
    const updatedTranscript = (currentSession.fullTranscript + `\n> ${targetTurn.command}\n${res.output || res.message}\n`).trim();

    if (res.status === 'success') {
      setActiveInteractiveSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, runState: 'success', runMessage: res.message, runOutput: res.output } : t)
      } : prev);
    } else if (res.status === 'failed') {
      setActiveInteractiveSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, runState: 'failed', runMessage: res.message } : t)
      } : prev);
    } else {
      const cycleId = generateId();
      const newCycle = { id: cycleId, attemptType: 'error', errorMessage: res.message, terminalSnapshot: updatedTranscript, isAnalyzing: true, fixExplanation: '', fixCommand: '', fixStatus: 'idle', fixResultMessage: '', fixResultOutput: '' };
      setActiveInteractiveSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, runState: 'error', runMessage: res.message, runOutput: res.output, debugCycles: [newCycle] } : t)
      } : prev);

      try {
        const debugRes = await fetchInteractiveAutoDebug(targetTurn.prompt, targetTurn.command, updatedTranscript, currentSession.ctx, settings);
        setApiStatus('valid');
        setActiveInteractiveSession(prev => prev ? {
          ...prev,
          turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, isAnalyzing: false, fixExplanation: debugRes.explanation, fixCommand: debugRes.fixCommand } : c) } : t)
        } : prev);
      } catch {
        setActiveInteractiveSession(prev => prev ? {
          ...prev,
          turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, isAnalyzing: false, fixExplanation: 'Failed to generate automated fix.', fixCommand: '' } : c) } : t)
        } : prev);
      }
    }
  };

  const handleRunInteractiveFixCommand = async (turnId, cycleId, fixCmd) => {
    if (!activeInteractiveSession) return;
    setActiveInteractiveSession(prev => prev ? {
      ...prev,
      turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, fixStatus: 'running' } : c) } : t)
    } : prev);

    const res = await executeTerminalCommand(
      fixCmd,
      activeInteractiveSession.ctx,
      settings,
      activeInteractiveSession.fullTranscript,
      Boolean(activeInteractiveSession.ctx?.isElevated),
      false,
      true
    );
    const updatedTranscript = (activeInteractiveSession.fullTranscript + `\n> ${fixCmd}\n${res.output || res.message}\n`).trim();

    if (res.status === 'success') {
      setActiveInteractiveSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, fixStatus: 'success', fixResultMessage: res.message, fixResultOutput: res.output } : c) } : t)
      } : prev);
    } else if (res.status === 'failed') {
      setActiveInteractiveSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cycleId ? { ...c, fixStatus: 'failed', fixResultMessage: res.message } : c) } : t)
      } : prev);
    } else {
      const nextCycleId = generateId();
      const nextCycle = { id: nextCycleId, attemptType: 'error', errorMessage: res.message, terminalSnapshot: updatedTranscript, isAnalyzing: true, fixExplanation: '', fixCommand: '', fixStatus: 'idle', fixResultMessage: '', fixResultOutput: '' };
      setActiveInteractiveSession(prev => prev ? {
        ...prev,
        fullTranscript: updatedTranscript,
        turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: [...t.debugCycles.map(c => c.id === cycleId ? { ...c, fixStatus: 'error' } : c), nextCycle] } : t)
      } : prev);

      try {
        const debugRes = await fetchInteractiveAutoDebug(activeInteractiveSession.turns.find(t => t.id === turnId).prompt, fixCmd, updatedTranscript, activeInteractiveSession.ctx, settings);
        setApiStatus('valid');
        setActiveInteractiveSession(prev => prev ? {
          ...prev,
          turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === nextCycleId ? { ...c, isAnalyzing: false, fixExplanation: debugRes.explanation, fixCommand: debugRes.fixCommand } : c) } : t)
        } : prev);
      } catch {
        setActiveInteractiveSession(prev => prev ? {
          ...prev,
          turns: prev.turns.map(t => t.id === turnId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === nextCycleId ? { ...c, isAnalyzing: false, fixExplanation: 'Failed to analyze subsequent error.', fixCommand: '' } : c) } : t)
        } : prev);
      }
    }
  };

  // Choice 3: End & Run as Admin in Interactive Real Terminal
  const handleInteractiveEndAndRunAsAdmin = async () => {
    if (isInteractiveStarting) return;
    const targetTurn = elevationModalTurn;
    setElevationModalTurn(null);
    setRunInteractiveAsAdmin(true);

    if (activeInteractiveSession) {
      await archiveAndCloseActiveInteractiveSession(activeInteractiveSession);
    }

    interactiveCancelRef.current++;
    primaryExecCancelRef.current++;
    setInteractiveConnectionError(null);
    setLastFailedInteractiveTurn(null);
    setIsInteractiveGenerating(false);

    const sessionCtx = {
      os: hostOs,
      shell: selectedInteractiveShell,
      type: 'Command',
      isElevated: true
    };

    setIsInteractiveStarting(true);
    try {
      const startRes = await startTerminalSession(sessionCtx, settings, false);
      if (startRes?.status === 'failed') {
        setInteractiveConnectionError(startRes.message || `Failed to start ${selectedInteractiveShell} session.`);
        setActiveInteractiveSession(null);
        return;
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString(undefined, { hour12: settings.clockFormat === '12h' });
      const shellLabel = `${selectedInteractiveShell} (Elevated)`;
      const elevatedTurn = targetTurn ? { ...targetTurn, ctx: sessionCtx, runState: 'idle' } : null;

      const newSession = {
        id: generateId(),
        dateTime: now.toLocaleString(),
        unixTime: Date.now(),
        ctx: sessionCtx,
        turns: elevatedTurn ? [elevatedTurn] : [],
        fullTranscript: `[${timeStr}] Connected to ${shellLabel} on ${hostOs}.\n`
      };

      setActiveInteractiveSession(newSession);
      setInteractiveHistory(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
      setInteractiveInitialInput('');
      setInteractiveNextInput('');

      if (elevatedTurn) {
        executeInteractivePrimaryCommand(elevatedTurn.id, newSession);
      }
    } finally {
      setIsInteractiveStarting(false);
    }
  };

  const handleClearHistoryConfirm = () => {
    if (historyClearModal === 'simulated') setSimulatedHistory([]);
    if (historyClearModal === 'interactive') setInteractiveHistory([]);
    if (historyClearModal === 'builder') setHistory([]);
    if (historyClearModal === 'analyzer') setAnalyzerHistory([]);
    if (historyClearModal === 'debugger') setDebugHistory([]);
    setHistoryClearModal(null);
  };

  const filterHistory = (list, search) => {
    if (!search.trim()) return list;
    const lower = search.toLowerCase();
    return list.filter(item => {
      if (item.dateTime?.toLowerCase().includes(lower)) return true;
      if (item.timestamp?.toLowerCase().includes(lower)) return true;
      if (item.fullTranscript?.toLowerCase().includes(lower)) return true;
      if (item.summary?.toLowerCase().includes(lower)) return true;
      if (item.turns && item.turns.some(t => t.prompt.toLowerCase().includes(lower) || t.command?.toLowerCase().includes(lower))) return true;
      if (item.turn && item.turn.prompt.toLowerCase().includes(lower)) return true;
      if (item.thread && item.thread.some(msg => msg.text.toLowerCase().includes(lower))) return true;
      return false;
    });
  };

  const getCollapsedSuggestionColor = () => {
    if (isDarkMode) {
      if (settings.darkTheme === 'green') return 'rgba(74, 222, 128, 0.55)';
      if (settings.darkTheme === 'red') return 'rgba(248, 113, 113, 0.55)';
      return '#9ca3af';
    }
    if (settings.lightTheme === 'monochrome') return 'rgba(17, 24, 39, 0.55)';
    return '#6b7280';
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen font-sans flex flex-col items-center py-10 px-4 transition-colors duration-200">
        <Header
          isDarkMode={isDarkMode}
          settings={settings}
          apiStatus={apiStatus}
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenHelp={() => setShowHelpModal(true)}
          onOpenAbout={() => setShowAboutModal(true)}
        />

        <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="w-full max-w-4xl relative z-10">
          {/* Tab 0: Simulated Terminal */}
          <div className={activeTab === 'simulated' ? 'block' : 'hidden'}>
            <SimulatedTab
              settings={settings}
              isDarkMode={isDarkMode}
              selectedSimOs={selectedSimOs}
              setSelectedSimOs={setSelectedSimOs}
              selectedSimShell={selectedSimShell}
              setSelectedSimShell={setSelectedSimShell}
              runSimulatedAsAdmin={runSimulatedAsAdmin}
              setRunSimulatedAsAdmin={setRunSimulatedAsAdmin}
              activeSimulatedSession={activeSimulatedSession}
              simulatedConnectionError={simulatedConnectionError}
              simulatedInitialInput={simulatedInitialInput}
              setSimulatedInitialInput={setSimulatedInitialInput}
              simulatedNextInput={simulatedNextInput}
              setSimulatedNextInput={setSimulatedNextInput}
              isSimulatedGenerating={isSimulatedGenerating}
              simulatedHistory={simulatedHistory}
              onOpenSettings={() => setShowSettingsModal(true)}
              onStartSessionClick={() => {
                if (activeSimulatedSession) setShowSimNewSessionConfirmModal(true);
                else initiateSimulatedSession();
              }}
              onStopSessionClick={() => setShowSimStopSessionConfirmModal(true)}
              onGenerateTurn={handleGenerateSimulatedTurn}
              onRetryTurn={() => lastFailedSimulatedTurn && handleGenerateSimulatedTurn(lastFailedSimulatedTurn.isInitial, lastFailedSimulatedTurn.prompt)}
              onCancelSimulatedGeneration={() => { simCancelRef.current++; setIsSimulatedGenerating(false); }}
              onDismissError={() => setSimulatedConnectionError(null)}
              onRunPrimaryCommand={executeSimulatedPrimaryCommand}
              onCancelPrimaryCommand={(tId) => {
                simExecCancelRef.current++;
                setActiveSimulatedSession(prev => prev ? {
                  ...prev,
                  fullTranscript: (prev.fullTranscript + `\n^C [Interrupt signal sent by user in ${prev.ctx.shell}]\n`).trim(),
                  turns: prev.turns.map(t => t.id === tId ? { ...t, runState: 'cancelled' } : t)
                } : prev);
              }}
              onRunFixCommand={handleRunSimulatedFixCommand}
              onCancelDebugCycle={(tId, cId) => {
                setActiveSimulatedSession(prev => prev ? {
                  ...prev,
                  fullTranscript: (prev.fullTranscript + `\n^C [Interrupt signal sent by user in ${prev.ctx.shell}]\n`).trim(),
                  turns: prev.turns.map(t => t.id === tId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cId ? { ...c, fixStatus: 'cancelled' } : c) } : t)
                } : prev);
              }}
              onCancelAutoDebugAnalysis={(tId, cId) => {
                setActiveSimulatedSession(prev => prev ? {
                  ...prev,
                  turns: prev.turns.map(t => t.id === tId ? {
                    ...t,
                    debugCycles: t.debugCycles.map(c => c.id === cId ? { ...c, isAnalyzing: false, fixExplanation: 'Automated error diagnosis cancelled by user.', fixCommand: '', fixStatus: 'cancelled' } : c)
                  } : t)
                } : prev);
              }}
              onClearHistory={(t) => setHistoryClearModal(t)}
              filterHistory={filterHistory}
              onOpenElevationModal={(turn) => setSimElevationModalTurn(turn)}
            />
          </div>

          {/* Tab 1: Interactive Terminal */}
          <div className={activeTab === 'interactive' ? 'block' : 'hidden'}>
            <InteractiveTab
              settings={settings}
              isDarkMode={isDarkMode}
              hostOs={hostOs}
              isDesktopEnv={isDesktopEnv}
              interactiveShellOptions={interactiveShellOptions}
              selectedInteractiveShell={setSelectedInteractiveShell}
              setSelectedInteractiveShell={setSelectedInteractiveShell}
              runInteractiveAsAdmin={runInteractiveAsAdmin}
              setRunInteractiveAsAdmin={setRunInteractiveAsAdmin}
              activeInteractiveSession={activeInteractiveSession}
              interactiveConnectionError={interactiveConnectionError}
              interactiveInitialInput={interactiveInitialInput}
              setInteractiveInitialInput={setInteractiveInitialInput}
              interactiveNextInput={interactiveNextInput}
              setInteractiveNextInput={setInteractiveNextInput}
              isInteractiveStarting={isInteractiveStarting}
              isInteractiveGenerating={isInteractiveGenerating}
              interactiveHistory={interactiveHistory}
              onOpenSettings={() => setShowSettingsModal(true)}
              onStartSessionClick={() => {
                if (activeInteractiveSession) setShowNewSessionConfirmModal(true);
                else initiateInteractiveSession();
              }}
              onStopSessionClick={() => setShowStopSessionConfirmModal(true)}
              onGenerateTurn={handleGenerateInteractiveTurn}
              onRetryTurn={() => lastFailedInteractiveTurn && handleGenerateInteractiveTurn(lastFailedInteractiveTurn.isInitial, lastFailedInteractiveTurn.prompt)}
              onCancelInteractiveGeneration={() => { interactiveCancelRef.current++; setIsInteractiveGenerating(false); }}
              onDismissError={() => setInteractiveConnectionError(null)}
              onRunPrimaryCommand={executeInteractivePrimaryCommand}
              onCancelPrimaryCommand={(tId) => {
                primaryExecCancelRef.current++;
                setActiveInteractiveSession(prev => prev ? {
                  ...prev,
                  fullTranscript: (prev.fullTranscript + `\n^C [Interrupt signal sent by user in ${prev.ctx.shell}]\n`).trim(),
                  turns: prev.turns.map(t => t.id === tId ? { ...t, runState: 'cancelled' } : t)
                } : prev);
              }}
              onRunFixCommand={handleRunInteractiveFixCommand}
              onCancelDebugCycle={(tId, cId) => {
                setActiveInteractiveSession(prev => prev ? {
                  ...prev,
                  fullTranscript: (prev.fullTranscript + `\n^C [Interrupt signal sent by user in ${prev.ctx.shell}]\n`).trim(),
                  turns: prev.turns.map(t => t.id === tId ? { ...t, debugCycles: t.debugCycles.map(c => c.id === cId ? { ...c, fixStatus: 'cancelled' } : c) } : t)
                } : prev);
              }}
              onCancelAutoDebugAnalysis={(tId, cId) => {
                setActiveInteractiveSession(prev => prev ? {
                  ...prev,
                  turns: prev.turns.map(t => t.id === turnId ? {
                    ...t,
                    debugCycles: t.debugCycles.map(c => c.id === cId ? { ...c, isAnalyzing: false, fixExplanation: 'Automated error diagnosis cancelled by user.', fixCommand: '', fixStatus: 'cancelled' } : c)
                  } : t)
                } : prev);
              }}
              onClearHistory={(t) => setHistoryClearModal(t)}
              filterHistory={filterHistory}
              onOpenElevationModal={(turn) => setElevationModalTurn(turn)}
            />
          </div>

          {/* Tab 2: Command Builder */}
          <div className={activeTab === 'builder' ? 'block' : 'hidden'}>
            <CommandBuilderTab
              settings={settings}
              isDarkMode={isDarkMode}
              history={history}
              setHistory={setHistory}
              favorites={favorites}
              setFavorites={setFavorites}
              onClearHistory={(t) => setHistoryClearModal(t)}
              filterHistory={filterHistory}
              getCollapsedSuggestionColor={getCollapsedSuggestionColor}
            />
          </div>

          {/* Tab 3: Code Analyzer */}
          <div className={activeTab === 'analyzer' ? 'block' : 'hidden'}>
            <CodeAnalyzerTab
              settings={settings}
              isDarkMode={isDarkMode}
              analyzerHistory={analyzerHistory}
              setAnalyzerHistory={setAnalyzerHistory}
              onClearHistory={(t) => setHistoryClearModal(t)}
              filterHistory={filterHistory}
              getCollapsedSuggestionColor={getCollapsedSuggestionColor}
            />
          </div>

          {/* Tab 4: General Debugger */}
          <div className={activeTab === 'debugger' ? 'block' : 'hidden'}>
            <GeneralDebuggerTab
              settings={settings}
              isDarkMode={isDarkMode}
              debugHistory={debugHistory}
              setDebugHistory={setDebugHistory}
              onClearHistory={(t) => setHistoryClearModal(t)}
              filterHistory={filterHistory}
              getCollapsedSuggestionColor={getCollapsedSuggestionColor}
            />
          </div>
        </main>

        {/* Confirmation & Dialog Modals */}
        <TerminalDisclaimerModal
          isOpen={showTerminalDisclaimerModal}
          onClose={() => setShowTerminalDisclaimerModal(false)}
          onConfirm={() => {
            setSettings(prev => ({ ...prev, enableExecution: true }));
            setShowTerminalDisclaimerModal(false);
          }}
        />

        {/* Simulated Tab: Requires Elevation Modal (3 Choices) */}
        <RequiresElevationModal
          isOpen={simElevationModalTurn !== null}
          activeShell={activeSimulatedSession?.ctx?.shell}
          isSimulated={true}
          onClose={() => setSimElevationModalTurn(null)}
          onConfirmRunCurrent={() => {
            const targetTurn = simElevationModalTurn;
            setSimElevationModalTurn(null);
            if (targetTurn) executeSimulatedPrimaryCommand(targetTurn.id);
          }}
          onConfirmRestartAndRunAsAdmin={handleSimulatedEndAndRunAsAdmin}
        />

        {/* Simulated Tab: New Session Confirmation Modal */}
        <NewSessionConfirmModal
          isOpen={showSimNewSessionConfirmModal}
          selectedShell={selectedSimShell}
          onClose={() => setShowSimNewSessionConfirmModal(false)}
          onConfirm={() => {
            simCancelRef.current++;
            simExecCancelRef.current++;
            setIsSimulatedGenerating(false);
            if (activeSimulatedSession) archiveAndCloseSimulatedSession(activeSimulatedSession);
            setShowSimNewSessionConfirmModal(false);
            initiateSimulatedSession();
          }}
        />

        {/* Simulated Tab: Stop Session Confirmation Modal */}
        <StopSessionConfirmModal
          isOpen={showSimStopSessionConfirmModal}
          activeShell={activeSimulatedSession?.ctx?.shell}
          onClose={() => setShowSimStopSessionConfirmModal(false)}
          onConfirm={() => {
            simCancelRef.current++;
            simExecCancelRef.current++;
            setIsSimulatedGenerating(false);
            if (activeSimulatedSession) archiveAndCloseSimulatedSession(activeSimulatedSession);
            setShowSimStopSessionConfirmModal(false);
          }}
        />

        {/* Interactive Tab: Requires Elevation Modal (3 Choices) */}
        <RequiresElevationModal
          isOpen={elevationModalTurn !== null}
          activeShell={activeInteractiveSession?.ctx?.shell}
          isSimulated={false}
          onClose={() => setElevationModalTurn(null)}
          onConfirmRunCurrent={() => {
            const targetTurn = elevationModalTurn;
            setElevationModalTurn(null);
            if (targetTurn) executeInteractivePrimaryCommand(targetTurn.id);
          }}
          onConfirmRestartAndRunAsAdmin={handleInteractiveEndAndRunAsAdmin}
        />

        {/* Interactive Tab: New Session Confirmation Modal */}
        <NewSessionConfirmModal
          isOpen={showNewSessionConfirmModal}
          selectedShell={selectedInteractiveShell}
          onClose={() => setShowNewSessionConfirmModal(false)}
          onConfirm={async () => {
            interactiveCancelRef.current++;
            primaryExecCancelRef.current++;
            setIsInteractiveGenerating(false);
            setShowNewSessionConfirmModal(false);
            if (activeInteractiveSession) {
              await archiveAndCloseActiveInteractiveSession(activeInteractiveSession);
            }
            await initiateInteractiveSession();
          }}
        />

        {/* Interactive Tab: Stop Session Confirmation Modal */}
        <StopSessionConfirmModal
          isOpen={showStopSessionConfirmModal}
          activeShell={activeInteractiveSession?.ctx?.shell}
          onClose={() => setShowStopSessionConfirmModal(false)}
          onConfirm={async () => {
            interactiveCancelRef.current++;
            primaryExecCancelRef.current++;
            setIsInteractiveGenerating(false);
            setShowStopSessionConfirmModal(false);
            if (activeInteractiveSession) {
              await archiveAndCloseActiveInteractiveSession(activeInteractiveSession);
            }
          }}
        />

        <UnfinishedCommandModal
          isOpen={!!unfinishedCommandConfirm}
          onClose={() => setUnfinishedCommandConfirm(null)}
          onConfirm={() => {
            const targetId = unfinishedCommandConfirm.turnId;
            setUnfinishedCommandConfirm(null);
            executeInteractivePrimaryCommand(targetId);
          }}
        />

        <ClearHistoryModal
          isOpen={!!historyClearModal}
          tabType={historyClearModal}
          onClose={() => setHistoryClearModal(null)}
          onConfirm={handleClearHistoryConfirm}
        />

        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={settings}
          setSettings={setSettings}
          apiStatus={apiStatus}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onToggleTerminalIntegration={handleToggleTerminalIntegration}
        />

        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />

        <AboutModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />
      </div>
    </ErrorBoundary>
  );
}