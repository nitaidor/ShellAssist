import React, { useState, useEffect } from 'react';
import { Settings, X, Plus, Trash2, AlertTriangle, AlertCircle, XCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  apiStatus,
  isDarkMode,
  setIsDarkMode,
  onToggleTerminalIntegration
}) => {
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newLocalEndpoint, setNewLocalEndpoint] = useState(settings?.localEndpoint || 'http://localhost:11434');
  const [newLocalModel, setNewLocalModel] = useState(String(settings?.localModel || 'gemma2'));
  const [detectedOllamaModels, setDetectedOllamaModels] = useState([]);
  const [isDetectingOllama, setIsDetectingOllama] = useState(false);
  const [ollamaDetectError, setOllamaDetectError] = useState(null);

  const currentProvider = settings?.apiProvider || 'gemini';

  const autoDetectOllamaModels = async (endpointToTest, preserveModel = null) => {
    try {
      const rawEndpoint = endpointToTest || newLocalEndpoint || 'http://localhost:11434';
      const cleanEndpoint = String(rawEndpoint).trim().replace(/\/+$/, '');
      if (!cleanEndpoint) return;
      setIsDetectingOllama(true);
      setOllamaDetectError(null);

      let activeModelName = '';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const psRes = await fetch(`${cleanEndpoint}/api/ps`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (psRes.ok) {
          const psData = await psRes.json();
          if (psData && Array.isArray(psData.models) && psData.models.length > 0) {
            const first = psData.models[0];
            activeModelName = typeof first === 'string' ? first : (first?.name || first?.model || '');
          }
        }
      } catch (e) {}

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const tagsRes = await fetch(`${cleanEndpoint}/api/tags`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          const rawList = Array.isArray(tagsData?.models) ? tagsData.models : [];
          const modelNames = rawList
            .map(m => (typeof m === 'string' ? m : (m?.name || m?.model || '')))
            .filter(name => typeof name === 'string' && name.trim().length > 0);

          setDetectedOllamaModels(modelNames);

          if (preserveModel && modelNames.includes(preserveModel)) {
            setNewLocalModel(String(preserveModel));
          } else {
            const selected = activeModelName || modelNames[0] || 'gemma2';
            setNewLocalModel(String(selected));
          }
        } else {
          setOllamaDetectError(`Ollama server returned status ${tagsRes.status}`);
        }
      } catch (err) {
        setOllamaDetectError('Unable to connect to Ollama. Verify the URL is running.');
      }
    } catch (globalErr) {
      setOllamaDetectError('Unable to connect to Ollama. Verify the URL is running.');
    } finally {
      setIsDetectingOllama(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentProvider === 'ollama') {
      const targetEndpoint = settings?.localEndpoint || newLocalEndpoint || 'http://localhost:11434';
      const targetModel = settings?.localModel || newLocalModel;
      setNewLocalEndpoint(targetEndpoint);
      if (targetModel) setNewLocalModel(String(targetModel));
      autoDetectOllamaModels(targetEndpoint, targetModel);
    }
  }, [isOpen, currentProvider]);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) return;

    if (currentProvider === 'gemini') {
      const existing = settings.savedGeminiKeys || [];
      const updated = existing.includes(trimmed) ? existing : [trimmed, ...existing];
      setSettings(prev => ({ ...prev, apiKey: trimmed, geminiApiKey: trimmed, savedGeminiKeys: updated }));
      localStorage.setItem('BYOK_GEMINI_KEY', trimmed);
    } else if (currentProvider === 'openai') {
      const existing = settings.savedOpenaiKeys || [];
      const updated = existing.includes(trimmed) ? existing : [trimmed, ...existing];
      setSettings(prev => ({ ...prev, openaiApiKey: trimmed, savedOpenaiKeys: updated }));
      localStorage.setItem('BYOK_OPENAI_KEY', trimmed);
    } else if (currentProvider === 'claude') {
      const existing = settings.savedClaudeKeys || [];
      const updated = existing.includes(trimmed) ? existing : [trimmed, ...existing];
      setSettings(prev => ({ ...prev, claudeApiKey: trimmed, savedClaudeKeys: updated }));
      localStorage.setItem('BYOK_CLAUDE_KEY', trimmed);
    }
    setNewKeyInput('');
  };

  const handleSelectKey = (key) => {
    if (currentProvider === 'gemini') {
      setSettings(prev => ({ ...prev, apiKey: key, geminiApiKey: key }));
      localStorage.setItem('BYOK_GEMINI_KEY', key);
    } else if (currentProvider === 'openai') {
      setSettings(prev => ({ ...prev, openaiApiKey: key }));
      localStorage.setItem('BYOK_OPENAI_KEY', key);
    } else if (currentProvider === 'claude') {
      setSettings(prev => ({ ...prev, claudeApiKey: key }));
      localStorage.setItem('BYOK_CLAUDE_KEY', key);
    }
  };

  const handleDeleteKey = (keyToDelete) => {
    if (currentProvider === 'gemini') {
      const updated = (settings.savedGeminiKeys || []).filter(k => k !== keyToDelete);
      setSettings(prev => ({ ...prev, apiKey: updated[0] || '', geminiApiKey: updated[0] || '', savedGeminiKeys: updated }));
      localStorage.setItem('BYOK_GEMINI_KEY', updated[0] || '');
    } else if (currentProvider === 'openai') {
      const updated = (settings.savedOpenaiKeys || []).filter(k => k !== keyToDelete);
      setSettings(prev => ({ ...prev, openaiApiKey: updated[0] || '', savedOpenaiKeys: updated }));
      localStorage.setItem('BYOK_OPENAI_KEY', updated[0] || '');
    } else if (currentProvider === 'claude') {
      const updated = (settings.savedClaudeKeys || []).filter(k => k !== keyToDelete);
      setSettings(prev => ({ ...prev, claudeApiKey: updated[0] || '', savedClaudeKeys: updated }));
      localStorage.setItem('BYOK_CLAUDE_KEY', updated[0] || '');
    }
  };

  const handleSaveLocalConfig = () => {
    const end = newLocalEndpoint.trim().replace(/\/+$/, '');
    const mod = String(newLocalModel).trim() || 'gemma2';
    if (!end) return;
    setOllamaDetectError(null);
    setSettings(prev => {
      const existing = prev.savedLocalConfigs || [];
      const updated = [
        { id: Date.now().toString(), endpoint: end, model: mod },
        ...existing.filter(c => !(c.endpoint === end && c.model === mod))
      ];
      return {
        ...prev,
        localEndpoint: end,
        localModel: mod,
        savedLocalConfigs: updated
      };
    });
  };

  const handleSelectLocalConfig = (cfg) => {
    setOllamaDetectError(null);
    setNewLocalEndpoint(cfg.endpoint);
    setNewLocalModel(cfg.model);
    setSettings(prev => ({
      ...prev,
      localEndpoint: cfg.endpoint,
      localModel: cfg.model
    }));
    autoDetectOllamaModels(cfg.endpoint, cfg.model);
  };

  const handleDeleteLocalConfig = (idToDelete) => {
    const existing = settings.savedLocalConfigs || [];
    const targetToDelete = existing.find(c => c.id === idToDelete);
    const updated = existing.filter(c => c.id !== idToDelete);

    const wasActive = targetToDelete &&
      settings.localEndpoint === targetToDelete.endpoint &&
      settings.localModel === targetToDelete.model;

    const nextActive = updated.length === 0
      ? null
      : (wasActive
          ? updated[0]
          : (updated.find(c => c.endpoint === settings.localEndpoint && c.model === settings.localModel) || updated[0]));

    setOllamaDetectError(null);

    if (nextActive) {
      setNewLocalEndpoint(nextActive.endpoint);
      setNewLocalModel(nextActive.model);
      autoDetectOllamaModels(nextActive.endpoint, nextActive.model);
    } else {
      setNewLocalEndpoint('http://localhost:11434');
      setNewLocalModel(detectedOllamaModels[0] || 'gemma2');
    }

    setSettings(prev => ({
      ...prev,
      localEndpoint: nextActive ? nextActive.endpoint : '',
      localModel: nextActive ? nextActive.model : '',
      savedLocalConfigs: updated
    }));
  };

  const getProviderInfo = () => {
    if (currentProvider === 'gemini') return { label: 'Gemini', model: 'gemini-3.8-flash', hasKey: !!(settings.geminiApiKey || settings.apiKey || (typeof window !== 'undefined' && localStorage.getItem('BYOK_GEMINI_KEY'))) };
    if (currentProvider === 'openai') return { label: 'ChatGPT', model: settings.openaiModel || 'gpt-4o-mini', hasKey: !!settings.openaiApiKey };
    if (currentProvider === 'claude') return { label: 'Claude', model: settings.claudeModel || 'claude-3-5-sonnet', hasKey: !!settings.claudeApiKey };
    
    const hasSavedOllama = Array.isArray(settings.savedLocalConfigs) && settings.savedLocalConfigs.length > 0 && !!settings.localEndpoint && !!settings.localModel;
    return { label: 'Ollama', model: String(settings.localModel || 'gemma2'), hasKey: hasSavedOllama };
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
    if (apiStatus === 'invalid' || (currentProvider === 'ollama' && ollamaDetectError)) {
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
                      onClick={() => setSettings(prev => ({ ...prev, darkTheme: 'default' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'default' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Default Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, darkTheme: 'green' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'green' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Green on Black
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, darkTheme: 'red' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'red' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Red on Black
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, lightTheme: 'default' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.lightTheme === 'default' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Default Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, lightTheme: 'monochrome' }))}
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
                    onClick={() => setSettings(prev => ({ ...prev, clockFormat: '12h' }))}
                    className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${settings.clockFormat !== '24h' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                  >
                    12-Hour (AM/PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, clockFormat: '24h' }))}
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
                onClick={() => setSettings(prev => ({ ...prev, apiProvider: 'gemini' }))}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'gemini' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">Google Gemini</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, apiProvider: 'openai' }))}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'openai' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">ChatGPT (OpenAI)</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, apiProvider: 'claude' }))}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'claude' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">Claude (Anthropic)</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, apiProvider: 'ollama' }))}
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

            {/* Ollama Local Auto-Detect Section */}
            {currentProvider === 'ollama' && (
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-300">
                      Local Ollama Endpoint <span className="text-xs text-gray-500 font-normal">(Auto-detects active models)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => autoDetectOllamaModels(newLocalEndpoint)}
                      disabled={isDetectingOllama}
                      className="btn-scan-models text-xs flex items-center gap-1 font-medium transition-opacity"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isDetectingOllama ? 'animate-spin' : ''}`} /> Scan Models
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={newLocalEndpoint}
                      onChange={(e) => setNewLocalEndpoint(e.target.value)}
                      onBlur={() => autoDetectOllamaModels(newLocalEndpoint)}
                      onKeyDown={(e) => { if (e.key === 'Enter') autoDetectOllamaModels(newLocalEndpoint); }}
                      className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono h-10"
                    />
                    {detectedOllamaModels.length > 0 ? (
                      <CustomSelect
                        value={newLocalModel}
                        onChange={(val) => setNewLocalModel(String(val))}
                        options={detectedOllamaModels}
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={isDetectingOllama ? "Scanning local models..." : "Auto-detected model name"}
                        value={newLocalModel}
                        onChange={(e) => setNewLocalModel(e.target.value)}
                        className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono h-10"
                      />
                    )}
                  </div>
                  {ollamaDetectError && (
                    <p className="text-xs font-mono ollama-error-msg flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {ollamaDetectError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={handleSaveLocalConfig} 
                      disabled={!newLocalEndpoint.trim()} 
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border border-transparent shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Save Configuration
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Saved Local Endpoints:</span>
                  {(!settings.savedLocalConfigs || settings.savedLocalConfigs.length === 0) ? (
                    <p className="text-xs text-gray-500 italic p-2 border border-dashed border-[#30363d] rounded text-center">No endpoints saved yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {settings.savedLocalConfigs.map((cfg) => {
                        const isSelected = settings.localEndpoint === cfg.endpoint && settings.localModel === cfg.model;
                        return (
                          <div
                            key={cfg.id}
                            onClick={() => handleSelectLocalConfig(cfg)}
                            className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer text-xs transition-all ${
                              isSelected ? 'saved-item-active font-semibold shadow-sm' : 'border-[#30363d] bg-[#161b22] text-gray-400 hover:border-gray-500'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'saved-item-dot' : 'saved-item-dot-inactive'}`}></span>
                              <span className="font-mono truncate">{cfg.endpoint}</span>
                              <span className="text-[10px] opacity-75">({cfg.model})</span>
                              {isSelected && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider saved-item-badge">
                                  Active
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteLocalConfig(cfg.id); }}
                              className="p-1 hover:text-red-400 text-gray-500 transition-colors ml-2"
                              title="Delete endpoint"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
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