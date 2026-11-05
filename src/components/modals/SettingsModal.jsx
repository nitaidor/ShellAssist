import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Loader2,
  Play,
  Square,
  Download,
  Ban
} from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

const BASE_OLLAMA_CATALOG = {
  'Gemma (Google)': [
    { value: 'gemma4:e2b', label: 'Gemma 4 E2B (gemma4:e2b)' },
    { value: 'gemma4:e4b', label: 'Gemma 4 E4B (gemma4:e4b)' },
    { value: 'gemma4:12b', label: 'Gemma 4 12B (gemma4:12b)' },
    { value: 'gemma4:27b', label: 'Gemma 4 27B (gemma4:27b)' },
    { value: 'gemma3:4b', label: 'Gemma 3 4B (gemma3:4b)' },
    { value: 'gemma3:12b', label: 'Gemma 3 12B (gemma3:12b)' },
    { value: 'gemma3:27b', label: 'Gemma 3 27B (gemma3:27b)' }
  ],
  'Qwen (Alibaba)': [
    { value: 'qwen2.5-coder:3b', label: 'Qwen 2.5 Coder 3B (qwen2.5-coder:3b)' },
    { value: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B (qwen2.5-coder:7b)' },
    { value: 'qwen2.5-coder:14b', label: 'Qwen 2.5 Coder 14B (qwen2.5-coder:14b)' },
    { value: 'qwen2.5-coder:32b', label: 'Qwen 2.5 Coder 32B (qwen2.5-coder:32b)' },
    { value: 'qwen3:4b', label: 'Qwen 3 4B (qwen3:4b)' },
    { value: 'qwen3:8b', label: 'Qwen 3 8B (qwen3:8b)' },
    { value: 'qwen3:14b', label: 'Qwen 3 14B (qwen3:14b)' },
    { value: 'qwen3:32b', label: 'Qwen 3 32B (qwen3:32b)' }
  ],
  'Llama (Meta)': [
    { value: 'llama3.2:1b', label: 'Llama 3.2 1B (llama3.2:1b)' },
    { value: 'llama3.2:3b', label: 'Llama 3.2 3B (llama3.2:3b)' },
    { value: 'llama3.1:8b', label: 'Llama 3.1 8B (llama3.1:8b)' },
    { value: 'llama3.3:70b', label: 'Llama 3.3 70B (llama3.3:70b)' }
  ],
  'DeepSeek': [
    { value: 'deepseek-r1:1.5b', label: 'DeepSeek R1 1.5B (deepseek-r1:1.5b)' },
    { value: 'deepseek-r1:7b', label: 'DeepSeek R1 7B (deepseek-r1:7b)' },
    { value: 'deepseek-r1:8b', label: 'DeepSeek R1 8B (deepseek-r1:8b)' },
    { value: 'deepseek-r1:14b', label: 'DeepSeek R1 14B (deepseek-r1:14b)' },
    { value: 'deepseek-r1:32b', label: 'DeepSeek R1 32B (deepseek-r1:32b)' },
    { value: 'deepseek-coder-v2:16b', label: 'DeepSeek Coder V2 16B (deepseek-coder-v2:16b)' }
  ],
  'Mistral (Mistral AI)': [
    { value: 'mistral:7b', label: 'Mistral 7B (mistral:7b)' },
    { value: 'mistral-nemo:12b', label: 'Mistral Nemo 12B (mistral-nemo:12b)' },
    { value: 'codestral:22b', label: 'Codestral 22B (codestral:22b)' },
    { value: 'mistral-small:24b', label: 'Mistral Small 24B (mistral-small:24b)' }
  ],
  'Phi (Microsoft)': [
    { value: 'phi4-mini:3.8b', label: 'Phi-4 Mini 3.8B (phi4-mini:3.8b)' },
    { value: 'phi4:14b', label: 'Phi-4 14B (phi4:14b)' },
    { value: 'phi3.5:3.8b', label: 'Phi-3.5 Mini 3.8B (phi3.5:3.8b)' }
  ]
};

const inferFamilyForModel = (modelTag = '') => {
  const lower = modelTag.toLowerCase();
  if (lower.startsWith('gemma')) return 'Gemma (Google)';
  if (lower.startsWith('qwen')) return 'Qwen (Alibaba)';
  if (lower.startsWith('llama')) return 'Llama (Meta)';
  if (lower.startsWith('deepseek')) return 'DeepSeek';
  if (lower.startsWith('mistral') || lower.startsWith('codestral') || lower.startsWith('devstral') || lower.startsWith('mixtral')) {
    return 'Mistral (Mistral AI)';
  }
  if (lower.startsWith('phi')) return 'Phi (Microsoft)';
  return 'Other / Custom';
};

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  apiStatus,
  setApiStatus,
  isDarkMode,
  setIsDarkMode,
  onToggleTerminalIntegration
}) => {
  const [newKeyInput, setNewKeyInput] = useState('');

  // Ollama Manager State
  const [isOllamaRunning, setIsOllamaRunning] = useState(false);
  const [ollamaActionState, setOllamaActionState] = useState('idle'); // 'idle' | 'starting' | 'stopping'
  const [installedModels, setInstalledModels] = useState([]);
  const [onlineCatalogModels, setOnlineCatalogModels] = useState([]);
  const [runningModel, setRunningModel] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(() => inferFamilyForModel(settings?.localModel || 'gemma4:e4b'));
  const [selectedModel, setSelectedModel] = useState(() => String(settings?.localModel || 'gemma4:e4b'));
  const [modelActionState, setModelActionState] = useState('idle'); // 'idle' | 'starting' | 'stopping' | 'installing'
  const [statusMessage, setStatusMessage] = useState('Checking Ollama status...');
  const [installProgress, setInstallProgress] = useState(null);
  const [ollamaError, setOllamaError] = useState(null);

  const pullAbortRef = useRef(null);
  const currentProvider = settings?.apiProvider || 'gemini';

  const getCleanEndpoint = () => {
    return String(settings?.localEndpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  };

  // Merge base catalog + online fetched models + locally installed models
  const buildMergedCatalog = () => {
    const merged = {};
    Object.keys(BASE_OLLAMA_CATALOG).forEach((fam) => {
      merged[fam] = [...BASE_OLLAMA_CATALOG[fam]];
    });

    const addModelToCatalog = (tag) => {
      if (!tag || typeof tag !== 'string') return;
      const cleanTag = tag.trim();
      if (!cleanTag) return;
      const fam = inferFamilyForModel(cleanTag);
      if (!merged[fam]) merged[fam] = [];
      const exists = merged[fam].some((m) => m.value.toLowerCase() === cleanTag.toLowerCase());
      if (!exists) {
        merged[fam].push({ value: cleanTag, label: cleanTag });
      }
    };

    onlineCatalogModels.forEach(addModelToCatalog);
    installedModels.forEach(addModelToCatalog);
    if (runningModel) addModelToCatalog(runningModel);

    return merged;
  };

  const mergedCatalog = buildMergedCatalog();
  const familyOptions = Object.keys(mergedCatalog);

  const isModelInstalled = (modelTag) => {
    if (!modelTag) return false;
    const target = modelTag.toLowerCase();
    return installedModels.some((inst) => {
      const lowerInst = inst.toLowerCase();
      return lowerInst === target || lowerInst === `${target}:latest` || `${lowerInst}:latest` === target;
    });
  };

  const getShortModelLabel = (modelTag) => {
    if (!modelTag) return 'Model';
    for (const fam of Object.keys(mergedCatalog)) {
      const found = mergedCatalog[fam].find((m) => m.value === modelTag);
      if (found) {
        return found.label.replace(/\s*\([^)]*\)\s*$/, '').trim();
      }
    }
    return modelTag;
  };

  // Sync Ollama server status, installed models, running model, and online catalog (ONLY when Ollama is running)
  const syncOllamaState = async (customEndpoint = null) => {
    const endpoint = customEndpoint || getCleanEndpoint();
    setOllamaError(null);

    let serverUp = false;
    let detectedInstalled = [];
    let detectedRunning = '';

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      const tagsRes = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
      clearTimeout(t);
      if (tagsRes.ok) {
        serverUp = true;
        const tagsData = await tagsRes.json();
        const rawList = Array.isArray(tagsData?.models) ? tagsData.models : [];
        detectedInstalled = rawList
          .map((m) => (typeof m === 'string' ? m : (m?.name || m?.model || '')))
          .filter(Boolean);
      }
    } catch {
      serverUp = false;
    }

    if (!serverUp) {
      setIsOllamaRunning(false);
      setRunningModel('');
      setInstalledModels([]);
      setStatusMessage('Ollama Server Offline');
      if (currentProvider === 'ollama' && setApiStatus) setApiStatus('invalid');
      return;
    }

    setIsOllamaRunning(true);
    setInstalledModels(detectedInstalled);

    // Query /api/ps to check if a model is currently running in memory
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      const psRes = await fetch(`${endpoint}/api/ps`, { signal: controller.signal });
      clearTimeout(t);
      if (psRes.ok) {
        const psData = await psRes.json();
        const runningList = Array.isArray(psData?.models) ? psData.models : [];
        if (runningList.length > 0) {
          const first = runningList[0];
          detectedRunning = typeof first === 'string' ? first : (first?.name || first?.model || '');
        }
      }
    } catch {}

    // Fetch live model catalog in the background ONLY now that Ollama is confirmed running
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.fetchOllamaCatalog === 'function') {
      window.electronAPI.fetchOllamaCatalog().then((res) => {
        if (res?.status === 'ok' && Array.isArray(res.models) && res.models.length > 0) {
          setOnlineCatalogModels(res.models);
        }
      }).catch(() => {});
    }

    if (detectedRunning) {
      setRunningModel(detectedRunning);
      const fam = inferFamilyForModel(detectedRunning);
      setSelectedFamily(fam);
      setSelectedModel(detectedRunning);
      setStatusMessage(`${detectedRunning} is Running`);
      setSettings((prev) => ({ ...prev, localEndpoint: endpoint, localModel: detectedRunning }));
      if (currentProvider === 'ollama' && setApiStatus) setApiStatus('valid');
    } else {
      setRunningModel('');
      const targetModel = selectedModel || settings?.localModel || 'gemma4:e4b';
      const isInst = detectedInstalled.some(
        (m) => m.toLowerCase() === targetModel.toLowerCase() || m.toLowerCase() === `${targetModel.toLowerCase()}:latest`
      );
      setStatusMessage(isInst ? `Ready (${targetModel} is installed)` : `${targetModel} is not installed`);
      if (currentProvider === 'ollama' && setApiStatus) setApiStatus('invalid');
    }
  };

  useEffect(() => {
    if (isOpen && currentProvider === 'ollama') {
      const init = async () => {
        let endpoint = getCleanEndpoint();
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getOllamaHost === 'function') {
          try {
            const host = await window.electronAPI.getOllamaHost();
            if (host) endpoint = host;
          } catch {}
        }
        await syncOllamaState(endpoint);
      };
      init();
    }
  }, [isOpen, currentProvider]);

  // Update status message when user browses different models while no model is running
  useEffect(() => {
    if (!isOllamaRunning || ollamaActionState !== 'idle' || modelActionState !== 'idle' || runningModel) return;
    if (isModelInstalled(selectedModel)) {
      setStatusMessage(`Ready (${selectedModel} is installed)`);
    } else {
      setStatusMessage(`${selectedModel} is not installed`);
    }
  }, [selectedModel, installedModels, isOllamaRunning, ollamaActionState, modelActionState, runningModel]);

  if (!isOpen) return null;

  // ---------------- OLLAMA SERVER & MODEL HANDLERS ----------------
  const handleToggleOllamaServer = async () => {
    if (ollamaActionState !== 'idle') return;
    setOllamaError(null);

    if (isOllamaRunning) {
      // Stop Ollama server (and abort any active download)
      if (pullAbortRef.current) {
        pullAbortRef.current.abort();
        pullAbortRef.current = null;
      }
      setModelActionState('idle');
      setInstallProgress(null);
      setOllamaActionState('stopping');
      setStatusMessage('Stopping Ollama server...');

      try {
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.stopOllama === 'function') {
          await window.electronAPI.stopOllama();
        }
      } catch (err) {
        setOllamaError(err?.message || 'Failed to stop Ollama server.');
      } finally {
        setIsOllamaRunning(false);
        setRunningModel('');
        setInstalledModels([]);
        setOllamaActionState('idle');
        setStatusMessage('Ollama Server Offline');
        if (setApiStatus) setApiStatus('invalid');
      }
    } else {
      // Start Ollama server
      setOllamaActionState('starting');
      setStatusMessage('Starting Ollama server...');

      try {
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.startOllama === 'function') {
          const res = await window.electronAPI.startOllama();
          if (res?.status === 'running') {
            const ep = res.endpoint || getCleanEndpoint();
            setSettings((prev) => ({ ...prev, localEndpoint: ep }));
            await syncOllamaState(ep);
          } else {
            setOllamaError(res?.message || 'Could not start Ollama server.');
            setStatusMessage('Ollama Server Offline');
          }
        } else {
          // Fallback check if in browser mode
          await syncOllamaState();
        }
      } catch (err) {
        setOllamaError(err?.message || 'Failed to start Ollama server.');
        setStatusMessage('Ollama Server Offline');
      } finally {
        setOllamaActionState('idle');
      }
    }
  };

  const handleFamilyChange = (newFamily) => {
    if (!isOllamaRunning || runningModel || modelActionState !== 'idle') return;
    setSelectedFamily(newFamily);
    const modelsInFamily = mergedCatalog[newFamily] || [];
    if (modelsInFamily.length > 0) {
      // Prefer selecting an already-installed model in that family if one exists
      const firstInstalled = modelsInFamily.find((m) => isModelInstalled(m.value));
      setSelectedModel(firstInstalled ? firstInstalled.value : modelsInFamily[0].value);
    }
  };

  const handleModelChange = (newModel) => {
    if (!isOllamaRunning || runningModel || modelActionState !== 'idle') return;
    setSelectedModel(String(newModel));
  };

  const startSelectedModelInMemory = async (modelToStart) => {
    const endpoint = getCleanEndpoint();
    setModelActionState('starting');
    setStatusMessage(`Loading ${modelToStart} into memory...`);
    setOllamaError(null);

    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToStart,
          prompt: '',
          keep_alive: -1
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed to load ${modelToStart} (HTTP ${res.status})`);
      }

      setRunningModel(modelToStart);
      setSettings((prev) => ({ ...prev, localModel: modelToStart, localEndpoint: endpoint }));
      setStatusMessage(`${modelToStart} is Running`);
      if (setApiStatus) setApiStatus('valid');
    } catch (err) {
      setOllamaError(err?.message || `Failed to start ${modelToStart}.`);
      setStatusMessage(`Error starting ${modelToStart}`);
      if (setApiStatus) setApiStatus('invalid');
    } finally {
      setModelActionState('idle');
    }
  };

  const handleStopRunningModel = async () => {
    if (!runningModel || modelActionState !== 'idle') return;
    const target = runningModel;
    const endpoint = getCleanEndpoint();
    setModelActionState('stopping');
    setStatusMessage(`Stopping ${target}...`);
    setOllamaError(null);

    try {
      await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: target,
          keep_alive: 0
        })
      });
    } catch {}

    setRunningModel('');
    setModelActionState('idle');
    setStatusMessage(`Ready (${target} is installed)`);
    if (setApiStatus) setApiStatus('invalid');
  };

  const handleInstallAndStartModel = async () => {
    if (!selectedModel || modelActionState !== 'idle') return;
    const target = selectedModel;
    const endpoint = getCleanEndpoint();
    const abortController = new AbortController();
    pullAbortRef.current = abortController;

    setModelActionState('installing');
    setInstallProgress(0);
    setStatusMessage(`Installing ${target}... (Pulling manifest)`);
    setOllamaError(null);

    try {
      const res = await fetch(`${endpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: target, stream: true }),
        signal: abortController.signal
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed to download ${target} (HTTP ${res.status})`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.error) throw new Error(evt.error);
              if (evt.total && evt.completed) {
                const pct = Math.min(100, Math.round((evt.completed / evt.total) * 100));
                const doneGB = (evt.completed / (1024 ** 3)).toFixed(2);
                const totalGB = (evt.total / (1024 ** 3)).toFixed(2);
                setInstallProgress(pct);
                setStatusMessage(`Installing ${target}... ${pct}% (${doneGB} GB / ${totalGB} GB)`);
              } else if (evt.status) {
                setStatusMessage(`Installing ${target}: ${evt.status}`);
              }
            } catch (parseErr) {
              if (parseErr.message && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }
      }

      pullAbortRef.current = null;
      setInstallProgress(null);
      setInstalledModels((prev) => (prev.includes(target) ? prev : [...prev, target]));

      // Automatically load and start the newly installed model
      await startSelectedModelInMemory(target);
    } catch (err) {
      pullAbortRef.current = null;
      setInstallProgress(null);
      setModelActionState('idle');
      if (err?.name === 'AbortError') {
        setStatusMessage(`Installation of ${target} cancelled`);
      } else {
        setOllamaError(err?.message || `Failed to install ${target}.`);
        setStatusMessage(`Failed to install ${target}`);
      }
    }
  };

  const handleCancelModelInstall = () => {
    if (pullAbortRef.current) {
      pullAbortRef.current.abort();
      pullAbortRef.current = null;
    }
  };

  const handleModelPrimaryAction = async () => {
    if (!isOllamaRunning || ollamaActionState !== 'idle') return;
    if (modelActionState === 'installing') {
      handleCancelModelInstall();
      return;
    }
    if (modelActionState !== 'idle') return;

    if (runningModel) {
      await handleStopRunningModel();
    } else if (isModelInstalled(selectedModel)) {
      await startSelectedModelInMemory(selectedModel);
    } else {
      await handleInstallAndStartModel();
    }
  };

  // ---------------- CLOUD API KEYS HANDLERS ----------------
  const handleSaveKey = () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) return;

    if (currentProvider === 'gemini') {
      const existing = settings.savedGeminiKeys || [];
      const updated = existing.includes(trimmed) ? existing : [trimmed, ...existing];
      setSettings((prev) => ({ ...prev, apiKey: trimmed, geminiApiKey: trimmed, savedGeminiKeys: updated }));
      localStorage.setItem('BYOK_GEMINI_KEY', trimmed);
    } else if (currentProvider === 'openai') {
      const existing = settings.savedOpenaiKeys || [];
      const updated = existing.includes(trimmed) ? existing : [trimmed, ...existing];
      setSettings((prev) => ({ ...prev, openaiApiKey: trimmed, savedOpenaiKeys: updated }));
      localStorage.setItem('BYOK_OPENAI_KEY', trimmed);
    } else if (currentProvider === 'claude') {
      const existing = settings.savedClaudeKeys || [];
      const updated = existing.includes(trimmed) ? existing : [trimmed, ...existing];
      setSettings((prev) => ({ ...prev, claudeApiKey: trimmed, savedClaudeKeys: updated }));
      localStorage.setItem('BYOK_CLAUDE_KEY', trimmed);
    }
    setNewKeyInput('');
  };

  const handleSelectKey = (key) => {
    if (currentProvider === 'gemini') {
      setSettings((prev) => ({ ...prev, apiKey: key, geminiApiKey: key }));
      localStorage.setItem('BYOK_GEMINI_KEY', key);
    } else if (currentProvider === 'openai') {
      setSettings((prev) => ({ ...prev, openaiApiKey: key }));
      localStorage.setItem('BYOK_OPENAI_KEY', key);
    } else if (currentProvider === 'claude') {
      setSettings((prev) => ({ ...prev, claudeApiKey: key }));
      localStorage.setItem('BYOK_CLAUDE_KEY', key);
    }
  };

  const handleDeleteKey = (keyToDelete) => {
    if (currentProvider === 'gemini') {
      const updated = (settings.savedGeminiKeys || []).filter((k) => k !== keyToDelete);
      setSettings((prev) => ({ ...prev, apiKey: updated[0] || '', geminiApiKey: updated[0] || '', savedGeminiKeys: updated }));
      localStorage.setItem('BYOK_GEMINI_KEY', updated[0] || '');
    } else if (currentProvider === 'openai') {
      const updated = (settings.savedOpenaiKeys || []).filter((k) => k !== keyToDelete);
      setSettings((prev) => ({ ...prev, openaiApiKey: updated[0] || '', savedOpenaiKeys: updated }));
      localStorage.setItem('BYOK_OPENAI_KEY', updated[0] || '');
    } else if (currentProvider === 'claude') {
      const updated = (settings.savedClaudeKeys || []).filter((k) => k !== keyToDelete);
      setSettings((prev) => ({ ...prev, claudeApiKey: updated[0] || '', savedClaudeKeys: updated }));
      localStorage.setItem('BYOK_CLAUDE_KEY', updated[0] || '');
    }
  };

  const getProviderInfo = () => {
    if (currentProvider === 'gemini') return { label: 'Gemini', model: 'gemini-3.8-flash', hasKey: !!(settings.geminiApiKey || settings.apiKey || (typeof window !== 'undefined' && localStorage.getItem('BYOK_GEMINI_KEY'))) };
    if (currentProvider === 'openai') return { label: 'ChatGPT', model: settings.openaiModel || 'gpt-4o-mini', hasKey: !!settings.openaiApiKey };
    if (currentProvider === 'claude') return { label: 'Claude', model: settings.claudeModel || 'claude-3-5-sonnet', hasKey: !!settings.claudeApiKey };
    return { label: 'Ollama', model: String(runningModel || settings.localModel || 'gemma4:e4b'), hasKey: true };
  };

  const renderBadge = () => {
    const info = getProviderInfo();

    if (!info.hasKey) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-warning shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5" /> Missing API Key
        </span>
      );
    }
    if (apiStatus === 'checking') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-checking shadow-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {info.label} (Checking...)
        </span>
      );
    }
    if (apiStatus === 'invalid' || apiStatus === 'missing' || (currentProvider === 'ollama' && (!isOllamaRunning || !runningModel))) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-error shadow-sm">
          <XCircle className="w-3.5 h-3.5" /> {currentProvider === 'ollama' ? 'Local AI Offline' : 'Wrong API Key'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-valid shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5" /> {info.label} ({info.model})
      </span>
    );
  };

  const renderSavedKeysList = (savedKeys = [], activeKey = '') => (
    <div>
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Saved API Keys:</span>
      {savedKeys.length === 0 ? (
        <p className="text-xs text-gray-500 italic p-2 border border-dashed border-[#30363d] rounded text-center">
          No keys saved yet. Paste your key above and press Enter.
        </p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {savedKeys.map((key, i) => {
            const isSelected = activeKey === key;
            const masked = key.length > 20 ? `${key.substring(0, 8)}••••••••${key.substring(key.length - 6)}` : key;
            return (
              <div
                key={i}
                onClick={() => handleSelectKey(key)}
                className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer text-xs transition-all ${
                  isSelected ? 'saved-item-active font-semibold shadow-sm' : 'border-[#30363d] bg-[#161b22] text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'saved-item-dot' : 'saved-item-dot-inactive'}`}></span>
                  <span className="font-mono truncate">{masked}</span>
                  {isSelected && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider saved-item-badge">
                      Active
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteKey(key); }}
                  className="p-1 hover:text-red-400 text-gray-500 transition-colors ml-2"
                  title="Delete key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const getActiveKey = () => {
    if (currentProvider === 'gemini') return settings.geminiApiKey || settings.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_GEMINI_KEY') : '') || '';
    if (currentProvider === 'openai') return settings.openaiApiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_OPENAI_KEY') : '') || '';
    if (currentProvider === 'claude') return settings.claudeApiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_CLAUDE_KEY') : '') || '';
    return '';
  };

  const getSavedKeys = () => {
    if (currentProvider === 'gemini') return settings.savedGeminiKeys || [];
    if (currentProvider === 'openai') return settings.savedOpenaiKeys || [];
    if (currentProvider === 'claude') return settings.savedClaudeKeys || [];
    return [];
  };

  // Build dropdown options for the selected family with "Installed" badges
  const currentFamilyModels = (mergedCatalog[selectedFamily] || []).map((m) => ({
    value: m.value,
    label: m.label,
    badge: isOllamaRunning && isModelInstalled(m.value) ? 'Installed' : null
  }));

  // Lock dropdowns when Ollama is offline, or when a model is currently running, or during transitions
  const areDropdownsLocked =
    !isOllamaRunning ||
    Boolean(runningModel) ||
    ollamaActionState !== 'idle' ||
    modelActionState !== 'idle';

  const isModelButtonDisabled =
    !isOllamaRunning ||
    ollamaActionState !== 'idle' ||
    modelActionState === 'starting' ||
    modelActionState === 'stopping';

  const activeTargetModel = runningModel || selectedModel;
  const shortModelName = getShortModelLabel(activeTargetModel);
  const selectedIsInstalled = isModelInstalled(selectedModel);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#30363d] bg-[#0d1117]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-400" /> Application Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="modal-close-btn p-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Appearance Section */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-[#30363d] pb-2">Appearance</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-[#0d1117] p-4 rounded-md border border-[#30363d]">
                <div>
                  <p className="font-medium text-gray-200">Application Theme</p>
                  <p className="text-xs text-gray-500">Toggle between dark and light themes.</p>
                </div>
                <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => setIsDarkMode(!isDarkMode)}>
                  <span className={`text-sm font-bold ${isDarkMode ? 'theme-active-toggle' : 'text-gray-500'}`}>Dark</span>
                  <button type="button" role="switch" aria-checked={!isDarkMode} aria-label="Toggle dark and light theme" className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors border theme-toggle-track">
                    <span className={`theme-toggle-knob inline-block h-4 w-4 transform rounded-full transition-transform ${!isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-sm font-bold ${!isDarkMode ? 'theme-active-toggle' : 'text-gray-500'}`}>Light</span>
                </div>
              </div>

              {/* Color Scheme Variant */}
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in">
                <p className="font-medium text-gray-200 mb-3 text-sm">Color Scheme Variant</p>
                {isDarkMode ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, darkTheme: 'default' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'default' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Default Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, darkTheme: 'green' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'green' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Green on Black
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, darkTheme: 'red' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'red' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Red on Black
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, lightTheme: 'default' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.lightTheme === 'default' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Default Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, lightTheme: 'monochrome' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.lightTheme === 'monochrome' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Black on White (Monochrome)
                    </button>
                  </div>
                )}
              </div>

              {/* Clock Format Selection (12h vs 24h) */}
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Clock & Timestamp Format</p>
                  <p className="text-xs text-gray-500">Controls how dates and times appear across all sessions.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, clockFormat: '12h' }))}
                    className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${settings.clockFormat !== '24h' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                  >
                    12-Hour (AM/PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, clockFormat: '24h' }))}
                    className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${settings.clockFormat === '24h' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                  >
                    24-Hour (24h)
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* AI Providers Section */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-[#30363d] pb-2">AI Provider & API</h3>

            <div className="flex items-center justify-between bg-[#0d1117] p-3.5 rounded-md border border-[#30363d] mb-4">
              <div>
                <p className="font-semibold text-gray-200 text-xs uppercase tracking-wider">Current Model Status</p>
                <p className="text-[11px] text-gray-500">Live health check of your active AI model.</p>
              </div>
              {renderBadge()}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, apiProvider: 'gemini' }))}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'gemini' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">Google Gemini</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, apiProvider: 'openai' }))}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'openai' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">ChatGPT (OpenAI)</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, apiProvider: 'claude' }))}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'claude' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">Claude (Anthropic)</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, apiProvider: 'ollama' }))}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'ollama' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">Ollama (Local)</p>
                <span className="text-[10px] text-gray-500 font-normal">100% Private</span>
              </button>
            </div>

            {currentProvider !== 'ollama' && (
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Add {getProviderInfo().label} API Key <span className="text-xs text-gray-500 font-normal">(Press Enter to Save)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder={currentProvider === 'gemini' ? "Paste AIzaSy... and press Enter" : currentProvider === 'openai' ? "Paste sk-... and press Enter" : "Paste sk-ant-... and press Enter"}
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
                      className="flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button 
                      type="button" 
                      onClick={handleSaveKey} 
                      disabled={!newKeyInput.trim()} 
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border border-transparent shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>

                {renderSavedKeysList(getSavedKeys(), getActiveKey())}
              </div>
            )}

            {/* Ollama Local AI Manager Section */}
            {currentProvider === 'ollama' && (
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ollama Server & Model Selection
                  </label>

                  {/* Row 1: Start/Stop Ollama + Model Family Dropdown + Model Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={handleToggleOllamaServer}
                        disabled={ollamaActionState !== 'idle'}
                        className={`w-full h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors ${
                          isOllamaRunning
                            ? 'btn-stop-session'
                            : 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
                        }`}
                      >
                        {ollamaActionState === 'starting' ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...</>
                        ) : ollamaActionState === 'stopping' ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stopping...</>
                        ) : isOllamaRunning ? (
                          <><Square className="w-3.5 h-3.5 fill-current" /> Stop Ollama</>
                        ) : (
                          <><Play className="w-3.5 h-3.5 fill-current" /> Start Ollama</>
                        )}
                      </button>
                    </div>

                    <div className="sm:col-span-4">
                      <CustomSelect
                        value={selectedFamily}
                        onChange={handleFamilyChange}
                        options={familyOptions}
                        disabled={areDropdownsLocked}
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <CustomSelect
                        value={selectedModel}
                        onChange={handleModelChange}
                        options={currentFamilyModels}
                        disabled={areDropdownsLocked}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Start/Stop/Install <Model> Button + Live Status Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1">
                  <div className="sm:col-span-5">
                    <button
                      type="button"
                      onClick={handleModelPrimaryAction}
                      disabled={isModelButtonDisabled}
                      className={`w-full h-10 px-3.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors ${
                        modelActionState === 'installing'
                          ? 'btn-cancel-action'
                          : runningModel
                          ? 'btn-stop-session'
                          : 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
                      }`}
                    >
                      {modelActionState === 'starting' ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting {shortModelName}...</>
                      ) : modelActionState === 'stopping' ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stopping {shortModelName}...</>
                      ) : modelActionState === 'installing' ? (
                        <><Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel Install</>
                      ) : runningModel ? (
                        <><Square className="w-3.5 h-3.5 fill-current" /> Stop {shortModelName}</>
                      ) : selectedIsInstalled ? (
                        <><Play className="w-3.5 h-3.5 fill-current" /> Start {shortModelName}</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /> Install {shortModelName}</>
                      )}
                    </button>
                  </div>

                  {/* Live Status Box */}
                  <div className="sm:col-span-7 bg-[#161b22] border border-[#30363d] rounded-md px-3.5 min-h-[40px] py-2 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      {(ollamaActionState !== 'idle' || modelActionState !== 'idle') ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin theme-spinner shrink-0" />
                      ) : runningModel ? (
                        <span className="w-2.5 h-2.5 rounded-full session-status-dot animate-pulse shrink-0"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full saved-item-dot-inactive shrink-0"></span>
                      )}
                      <span className="truncate text-gray-200">{statusMessage}</span>
                    </div>
                    {modelActionState === 'installing' && installProgress !== null && (
                      <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#30363d]">
                        <div
                          className="h-full tab-indicator transition-all duration-200"
                          style={{ width: `${installProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {ollamaError && (
                  <p className="text-xs font-mono ollama-error-msg flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {ollamaError}
                  </p>
                )}

                {/* Row 3: Option to stop Ollama & unload model when closing ShellAssist */}
                <div className="pt-2 border-t border-[#30363d]">
                  <label className="flex items-center justify-between bg-[#161b22] p-3 rounded-md border border-[#30363d] cursor-pointer hover:border-gray-500 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-gray-200">Stop Ollama & Unload Model on App Exit</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Automatically stop the running model and Ollama background server when closing ShellAssist to free up RAM/VRAM.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.stopOllamaOnExit)}
                      onChange={(e) => setSettings((prev) => ({ ...prev, stopOllamaOnExit: e.target.checked }))}
                      className="custom-checkbox shrink-0 ml-3"
                    />
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* Terminal Integration Section */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-[#30363d] pb-2">Terminal Integration</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between bg-[#0d1117] p-4 rounded-md border border-[#30363d] cursor-pointer hover:border-gray-500 transition-colors">
                <div>
                  <p className="font-medium text-gray-200">Terminal Integration</p>
                  <p className="text-xs text-gray-500 max-w-md mt-1">
                    Enables both the <strong>Interactive Terminal</strong> tab and <strong>1-Click Command Execution</strong>. Commands requiring administrator privileges will trigger an OS-level elevation prompt.
                  </p>
                </div>
                <input type="checkbox" checked={settings.enableExecution} onChange={(e) => onToggleTerminalIntegration(e.target.checked)} className="custom-checkbox shrink-0" />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;