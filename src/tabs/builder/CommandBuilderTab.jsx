import React, { useState, useRef } from 'react';
import { MessageSquare, ChevronRight, Play, Loader2, History as HistoryIcon, Star, Trash2, Search, AlertCircle, X, Ban, FileUp, FileMinus } from 'lucide-react';
import ContextDropdowns from '../../components/common/ContextDropdowns';
import CustomSelect from '../../components/common/CustomSelect';
import TurnItem from './TurnItem';
import HistoryItem from './HistoryItem';
import { generateId, formatSessionDate, getContextFromFileExtension } from '../../utils/platform';
import { fetchCommandGeneration } from '../../services/gemini';
import { OS_OPTIONS, SHELL_OPTIONS, TYPE_OPTIONS } from '../../constants/environment';

export const CommandBuilderTab = ({
  settings,
  isDarkMode,
  history,
  setHistory,
  favorites,
  setFavorites,
  onClearHistory,
  filterHistory,
  getCollapsedSuggestionColor,
  setApiStatus,
  builderCtx: externalBuilderCtx,
  setBuilderCtx: externalSetBuilderCtx
}) => {
  const builderInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [internalBuilderCtx, setInternalBuilderCtx] = useState({ os: 'Windows', shell: 'PowerShell', type: 'Command' });
  const builderCtx = externalBuilderCtx !== undefined ? externalBuilderCtx : internalBuilderCtx;
  const setBuilderCtx = externalSetBuilderCtx !== undefined ? externalSetBuilderCtx : setInternalBuilderCtx;
  const [isBuilderExpanded, setIsBuilderExpanded] = useState(true);
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [isAnalyzeMode, setIsAnalyzeMode] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeBuilderTurns, setActiveBuilderTurns] = useState([]);
  const [activeRefineCtx, setActiveRefineCtx] = useState(null);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [libraryTab, setLibraryTab] = useState('history');
  const [librarySearch, setLibrarySearch] = useState('');

  // Cancellation token refs to discard late responses and prevent popups after Cancel
  const cancelGenRef = useRef(0);
  const lastRequestedPromptRef = useRef('');

  const expandBuilder = () => {
    setIsBuilderExpanded(true);
    setTimeout(() => {
      if (!uploadedFile) builderInputRef.current?.focus();
    }, 50);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Strict extension validation fallback
    const ext = file.name.slice((Math.max(0, file.name.lastIndexOf(".")) || Infinity) + 1).toLowerCase();
    const validExts = ['ps1', 'bat', 'cmd', 'sh', 'zsh', 'tf', 'yml', 'yaml', 'txt'];
    if (!validExts.includes(ext)) {
      setGenerateError(`Unsupported file extension: .${ext}. Please upload a supported script format.`);
      e.target.value = null;
      return;
    }

    setGenerateError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const mapping = getContextFromFileExtension(file.name);
      
      setUploadedFile({ 
        name: file.name, 
        content, 
        validOs: mapping ? mapping.validOs : OS_OPTIONS.filter(o => o !== '──────────'), 
        shell: mapping ? mapping.shell : builderCtx.shell 
      });
      
      if (mapping) {
        const newOs = mapping.validOs.includes(builderCtx.os) ? builderCtx.os : mapping.validOs[0];
        setBuilderCtx({ ...builderCtx, os: newOs, shell: mapping.shell });
      }
      setRequest('');
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleCancelPrimaryGeneration = () => {
    cancelGenRef.current++; 
    setLoading(false);
    if (activeBuilderTurns.length === 0) {
      setIsBuilderExpanded(true);
      if (lastRequestedPromptRef.current && !request && !uploadedFile) {
        setRequest(lastRequestedPromptRef.current);
      }
    }
  };

  const handleCancelRefinement = () => {
    cancelGenRef.current++; 
    setIsRefining(false);
  };

  const handleToggleStar = (turnId) => {
    if (activeBuilderTurns.some(t => t.id === turnId)) {
      setActiveBuilderTurns(prev => prev.map(t => t.id === turnId ? { ...t, isStarred: !t.isStarred } : t));
      setHistory(prev => prev.map(h => h.id === activeThreadId ? { ...h, turns: h.turns.map(t => t.id === turnId ? { ...t, isStarred: !t.isStarred } : t) } : h));
      return;
    }
    let foundInHistory = false;
    setHistory(prev => prev.map(h => {
      if (h.turns.some(t => t.id === turnId)) {
        foundInHistory = true;
        return { ...h, turns: h.turns.map(t => t.id === turnId ? { ...t, isStarred: !t.isStarred } : t) };
      }
      return h;
    }));
    if (!foundInHistory) {
      setFavorites(prev => prev.map(f => {
        if (f.turns.some(t => t.id === turnId)) return { ...f, turns: f.turns.map(t => t.id === turnId ? { ...t, isStarred: !t.isStarred } : t) };
        return f;
      }).filter(f => f.turns.some(t => t.isStarred)));
    }
  };

  const handleAddTurnToSession = (sessionId, newTurn) => {
    setHistory(prev => prev.map(h => h.id === sessionId ? { ...h, turns: [...h.turns, newTurn] } : h));
    setFavorites(prev => prev.map(f => f.id === sessionId ? { ...f, turns: [...f.turns, newTurn] } : f));
  };

  const handleUpdateSessionDebugThread = (sessionId, turnIndex, thread) => {
    setHistory(prev => prev.map(h => h.id === sessionId ? { ...h, turns: h.turns.map((t, i) => i === turnIndex ? { ...t, debugThread: thread } : t) } : h));
    setFavorites(prev => prev.map(f => f.id === sessionId ? { ...f, turns: f.turns.map((t, i) => i === turnIndex ? { ...t, debugThread: thread } : t) } : f));
  };

  const handleUpdateSessionTokens = (sessionId, turnIndex, newTokens) => {
    setHistory(prev => prev.map(h => h.id === sessionId ? {
      ...h,
      turns: h.turns.map((t, i) => i === turnIndex ? { ...t, tokens: newTokens, deepBreakdownComplete: true } : t)
    } : h));
    setFavorites(prev => prev.map(f => f.id === sessionId ? {
      ...f,
      turns: f.turns.map((t, i) => i === turnIndex ? { ...t, tokens: newTokens, deepBreakdownComplete: true } : t)
    } : f));
  };

  const handleGenerateNew = async () => {
    const payload = uploadedFile ? uploadedFile.content : request;
    if (!payload.trim()) return;
    
    const currentRequest = payload;
    lastRequestedPromptRef.current = currentRequest;
    
    let currentCtx = { ...builderCtx };
    if (isAnalyzeMode) {
      const isScript = !!uploadedFile || payload.includes('\n');
      currentCtx.type = isScript ? 'Script' : 'Command';
    }
    
    const currentMode = isAnalyzeMode ? 'code-to-en' : 'en-to-code';

    const genId = ++cancelGenRef.current;
    setGenerateError(null);
    setIsBuilderExpanded(false);
    setActiveBuilderTurns([]);
    const newThreadId = generateId();
    setActiveThreadId(newThreadId);
    setLoading(true);

    try {
      const result = await fetchCommandGeneration(currentRequest, [], currentCtx, currentMode, false, settings);
      if (cancelGenRef.current !== genId) return;

      // Analysis/Generation succeeded, cleanup UI state
      setUploadedFile(null);
      setRequest('');
      setIsAnalyzeMode(false); // Return to standard builder mode for subsequent prompts

      const firstTurn = { ...result, id: generateId(), prompt: currentRequest, ctx: currentCtx, debugThread: [], mode: currentMode, isStarred: false };
      setApiStatus?.('valid');
      setActiveBuilderTurns([firstTurn]);
      setActiveRefineCtx(currentCtx);

      setHistory(prev => [
        {
          id: newThreadId,
          summary: firstTurn.summary || (firstTurn.prompt.length > 40 ? firstTurn.prompt.substring(0, 40) + '...' : firstTurn.prompt),
          turns: [firstTurn],
          timestamp: new Date().toLocaleString(),
          unixTime: Date.now(),
          ctx: currentCtx
        },
        ...prev.filter(h => h.id !== newThreadId)
      ]);
    } catch (err) {
      if (cancelGenRef.current !== genId) return;
      setGenerateError(err.message || "Failed connection to AI provider.");
    } finally {
      if (cancelGenRef.current === genId) {
        setLoading(false);
      }
    }
  };

  const handleRefineActive = async () => {
    let currentInput = refineInput;
    if (!currentInput.trim()) currentInput = `Translate this to ${activeRefineCtx.os}, ${activeRefineCtx.shell} as a ${activeRefineCtx.type}.`;
    
    const refineId = ++cancelGenRef.current;
    setIsBuilderExpanded(false);
    setIsRefining(true);
    setGenerateError(null);

    try {
      const result = await fetchCommandGeneration(currentInput, activeBuilderTurns, activeRefineCtx, 'en-to-code', false, settings); 
      if (cancelGenRef.current !== refineId) return;

      const nextTurn = { ...result, id: generateId(), prompt: currentInput, ctx: activeRefineCtx, debugThread: [], mode: 'en-to-code', isStarred: false };
      setApiStatus?.('valid');
      setActiveBuilderTurns(prev => [...prev, nextTurn]);
      setRefineInput('');

      setHistory(prev => prev.map(h => h.id === activeThreadId ? { ...h, turns: [...h.turns, nextTurn] } : h));
    } catch (err) {
      if (cancelGenRef.current !== refineId) return;
      setGenerateError(err.message || "Failed to refine command.");
    } finally {
      if (cancelGenRef.current === refineId) {
        setIsRefining(false);
      }
    }
  };

  const sortedHistory = [...history].sort((a, b) => b.unixTime - a.unixTime);
  const sortedFavorites = [...favorites].sort((a, b) => b.unixTime - a.unixTime);
  const activeSessionHasStars = activeBuilderTurns.some(t => t.isStarred);
  const lastTurnCtx = activeBuilderTurns.length > 0 ? activeBuilderTurns[activeBuilderTurns.length - 1].ctx : builderCtx;
  const activeCtxChanged = activeRefineCtx && (lastTurnCtx.os !== activeRefineCtx.os || lastTurnCtx.shell !== activeRefineCtx.shell || lastTurnCtx.type !== activeRefineCtx.type);
  const isActiveRefineDisabled = isRefining || (!refineInput.trim() && !activeCtxChanged);

  const displayHistory = sortedHistory.filter(item => item.id !== activeThreadId);

  const validOsOptions = uploadedFile ? uploadedFile.validOs : OS_OPTIONS;
  const validShellOptions = uploadedFile ? [uploadedFile.shell] : (SHELL_OPTIONS[builderCtx.os] || []);

  return (
    <>
      <section className="space-y-6">
        <div className={`bg-[#161b22] border border-[#30363d] rounded-xl shadow-md relative ${isBuilderExpanded ? 'p-6' : 'p-4'}`}>
          <div className="absolute inset-0 rounded-[11px] overflow-hidden pointer-events-none">
            <div className="w-full h-[3px] bg-gradient-to-r from-blue-600 to-cyan-500"></div>
          </div>
          {isBuilderExpanded ? (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-lg font-semibold mb-2 flex items-center gap-2 mt-1 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
                    <MessageSquare className="w-5 h-5 shrink-0 icon-builder" /> Translate to Code/Script
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Describe what you want to achieve in plain English, or check the Analyze box to reverse-translate code.
                  </p>
                </div>
              </div>
              <textarea
                ref={builderInputRef}
                disabled={!!uploadedFile}
                value={uploadedFile ? `Attached: ${uploadedFile.name} (Uploaded Script Locked)` : request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder={isAnalyzeMode ? `e.g., Paste your ${builderCtx.shell} code here to analyze...` : builderCtx.type === 'Script' ? `e.g., Write a script to backup a directory in ${builderCtx.os} using ${builderCtx.shell}...` : `e.g., List files in ${builderCtx.os} using ${builderCtx.shell}...`}
                className={`w-full h-28 border rounded-md p-4 font-mono text-sm focus:outline-none resize-none shadow-sm mt-3 transition-colors ${
                  uploadedFile 
                    ? 'bg-[#0d1117] border-[#30363d] text-gray-500 cursor-not-allowed'
                    : 'bg-[#0d1117] border-[#30363d] text-gray-200 focus:border-blue-500'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerateNew();
                  }
                }}
              />
              <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <CustomSelect
                    value={builderCtx.os}
                    onChange={(newOs) => {
                      if (newOs === '──────────') return;
                      const shells = SHELL_OPTIONS[newOs] || [];
                      setBuilderCtx({ ...builderCtx, os: newOs, shell: shells.includes(builderCtx.shell) ? builderCtx.shell : shells[0] });
                    }}
                    options={validOsOptions}
                  />
                  <CustomSelect
                    value={builderCtx.shell}
                    onChange={(newShell) => setBuilderCtx({ ...builderCtx, shell: newShell })}
                    options={validShellOptions}
                    disabled={!!uploadedFile}
                  />
                  
                  {isAnalyzeMode ? (
                    <>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".ps1,.bat,.cmd,.sh,.zsh,.tf,.yml,.yaml,.txt" onChange={handleFileUpload} />
                      <button
                        onClick={() => uploadedFile ? handleRemoveFile() : fileInputRef.current.click()}
                        className="px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center gap-2 border transition-colors shadow-sm h-10 bg-[#161b22] border-[#30363d] text-gray-300 hover:bg-[#21262d] hover:text-white"
                      >
                        {uploadedFile ? <FileMinus className="w-4 h-4 btn-cancel-icon" /> : <FileUp className="w-4 h-4" />}
                        {uploadedFile ? 'Remove Script' : 'Upload Script'}
                      </button>
                    </>
                  ) : (
                    <CustomSelect
                      value={builderCtx.type}
                      onChange={(newType) => setBuilderCtx({ ...builderCtx, type: newType })}
                      options={TYPE_OPTIONS}
                    />
                  )}

                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-200 transition-colors h-10 border border-[#30363d] bg-[#21262d] px-3 rounded-md select-none">
                    <input 
                      type="checkbox" 
                      checked={isAnalyzeMode} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsAnalyzeMode(checked);
                        if (!checked && uploadedFile) setUploadedFile(null);
                      }} 
                      className="custom-checkbox" 
                    />
                    Analyze
                  </label>
                </div>
                <button
                  onClick={handleGenerateNew}
                  disabled={loading || (!uploadedFile && !request.trim())}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:opacity-50 text-white px-5 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 w-full md:w-auto shrink-0 h-10 min-w-[160px] border border-transparent"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-4 h-4 fill-current" /> {isAnalyzeMode ? 'Analyze' : `Generate ${builderCtx.type}`}</>}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                onClick={expandBuilder}
                className="w-full h-12 bg-[#0d1117] border border-[#30363d] hover:border-blue-500 rounded-md px-4 flex items-center justify-between text-sm font-mono cursor-text shadow-sm transition-colors"
              >
                <span className="truncate collapsed-placeholder-text" style={{ color: getCollapsedSuggestionColor() }}>
                  {uploadedFile ? `Attached: ${uploadedFile.name}` : (request ? request : `e.g., List files in ${builderCtx.os} using ${builderCtx.shell}...`)}
                </span>
              </div>
            </div>
          )}
        </div>

        {generateError && (
          <div className="theme-error-banner rounded-xl p-4 shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider error-title">Generation Error</h4>
                <p className="text-xs mt-1 leading-relaxed font-mono error-msg">{generateError}</p>
              </div>
            </div>
            <button
              onClick={() => setGenerateError(null)}
              className="p-1 hover:opacity-80 transition-opacity"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Spinner with True Cancel Action */}
        {loading && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 flex flex-col items-center justify-center text-gray-400 shadow-md animate-in fade-in duration-200 gap-3">
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin mb-3 icon-builder" />
              <p className="text-sm">{isAnalyzeMode ? `Analyzing code...` : `Generating ${builderCtx.type.toLowerCase()}...`}</p>
            </div>
            <button
              type="button"
              onClick={handleCancelPrimaryGeneration}
              className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Cancel generation"
            >
              <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
            </button>
          </div>
        )}

        {activeBuilderTurns.length > 0 && !loading && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-4 mb-6">
              {activeBuilderTurns.map((turn, index) => (
                <TurnItem
                  key={turn.id || index}
                  turn={turn}
                  isFirst={index === 0}
                  isLast={index === activeBuilderTurns.length - 1}
                  onUpdateDebugThread={(thread) => {
                    setActiveBuilderTurns(prev => prev.map((t, i) => i === index ? { ...t, debugThread: thread } : t));
                    if (activeThreadId) handleUpdateSessionDebugThread(activeThreadId, index, thread);
                  }}
                  onUpdateTokens={(newTokens) => {
                    setActiveBuilderTurns(prev => prev.map((t, i) => i === index ? { ...t, tokens: newTokens, deepBreakdownComplete: true } : t));
                    if (activeThreadId) handleUpdateSessionTokens(activeThreadId, index, newTokens);
                  }}
                  onToggleStar={handleToggleStar}
                  settings={settings}
                />
              ))}
            </div>
            {isRefining ? (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 flex flex-col items-center justify-center text-gray-400 shadow-md mb-6 gap-3">
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 icon-builder" />
                  <p className="text-sm">Refining...</p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelRefinement}
                  className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
                  title="Cancel refinement"
                >
                  <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-6 bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-md">
                <input
                  type="text"
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  placeholder={`Add context or tweak for ${activeRefineCtx?.os} ${activeRefineCtx?.shell}...`}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-md px-4 py-2.5 text-sm text-gray-200 focus:outline-none shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isActiveRefineDisabled) handleRefineActive();
                  }}
                />
                <div className="flex justify-between items-center gap-3">
                  <ContextDropdowns ctx={activeRefineCtx} setCtx={setActiveRefineCtx} />
                  <button
                    onClick={handleRefineActive}
                    disabled={isActiveRefineDisabled}
                    className="bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] disabled:opacity-50 text-white px-6 rounded-md font-medium h-10 shadow-sm transition-colors border border-transparent"
                  >
                    Refine
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Symmetrical vertical spacing and aligned header bar matching Analyzer & Debugger tabs */}
      <section className="mt-8 pt-6 border-t border-[#30363d]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex h-10 border-b border-[#30363d] w-full md:w-auto overflow-x-auto no-scrollbar items-end">
            <button
              onClick={() => setLibraryTab('history')}
              className={`px-4 pb-2 text-sm font-bold tracking-wider uppercase transition-colors flex items-center gap-2 whitespace-nowrap h-full ${
                libraryTab === 'history' ? 'library-tab-active-history border-b-2' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <HistoryIcon className="w-4 h-4" /> Session History
              {sortedHistory.length > 0 && (
                <span className="theme-count-badge text-xs px-2 py-0.5 rounded-full font-medium ml-1.5">
                  {sortedHistory.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setLibraryTab('favorites')}
              className={`px-4 pb-2 text-sm font-bold tracking-wider uppercase transition-colors flex items-center gap-2 whitespace-nowrap h-full ${
                libraryTab === 'favorites' ? 'library-tab-active-favorites border-b-2' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Star className="w-4 h-4 fill-current" /> Favorites Library
              {sortedFavorites.length > 0 && (
                <span className="theme-count-badge text-xs px-2 py-0.5 rounded-full font-medium ml-1.5">
                  {sortedFavorites.length}
                </span>
              )}
            </button>
          </div>
          <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
            {libraryTab === 'history' && (
              <button
                onClick={() => onClearHistory('builder')}
                disabled={history.length === 0}
                title={history.length === 0 ? "No history to clear" : "Clear History"}
                className={`btn-clear-history px-3.5 py-2 rounded-md text-sm flex items-center gap-2 transition-colors whitespace-nowrap h-10 ${
                  history.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-950/30'
                }`}
              >
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            )}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder={libraryTab === 'history' ? "Search history..." : "Search favorites..."}
                className="w-full pl-9 pr-4 py-2 bg-[#161b22] border border-[#30363d] rounded-md text-sm text-gray-200 focus:outline-none focus:border-blue-500 shadow-sm h-10"
              />
            </div>
          </div>
        </div>
        {librarySearch.trim() && (
          <p className="text-xs icon-builder mb-4 font-medium flex items-center gap-2">
            <Search className="w-3.5 h-3.5" /> Showing filtered results for "{librarySearch}"
          </p>
        )}
        {libraryTab === 'history' ? (
          <>
            {sortedHistory.length === 0 && activeBuilderTurns.length === 0 ? (
              <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl flex flex-col items-center justify-center h-48 text-gray-500">
                <HistoryIcon className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Session history will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeBuilderTurns.length > 0 && !librarySearch.trim() && (
                  <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-sm opacity-50 pointer-events-none" title="This is your active session">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
                          <HistoryIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{activeBuilderTurns[0].summary || "Active Session"}</p>
                          <span className="text-xs text-gray-500">Active Session</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-75 text-gray-500" />
                    </div>
                  </div>
                )}
                {filterHistory(displayHistory, librarySearch).map((item) => (
                  <HistoryItem
                    key={`hist-${item.id}`}
                    item={item}
                    onCollapseTop={() => setIsBuilderExpanded(false)}
                    onUpdateTurnDebugThread={(turnIndex, thread) => handleUpdateSessionDebugThread(item.id, turnIndex, thread)}
                    onUpdateTurnTokens={(turnIndex, newTokens) => handleUpdateSessionTokens(item.id, turnIndex, newTokens)}
                    onAddTurn={(newTurn) => handleAddTurnToSession(item.id, newTurn)}
                    onToggleStar={handleToggleStar}
                    settings={settings}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {sortedFavorites.length === 0 && !activeSessionHasStars ? (
              <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl flex flex-col items-center justify-center h-48 text-gray-500">
                <Star className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Star a snippet to save it to your Favorites.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeSessionHasStars && !librarySearch.trim() && (
                  <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border active-fav-border shadow-sm opacity-50 pointer-events-none" title="This is your active session">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="active-fav-icon p-2 rounded-lg">
                          <Star className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{activeBuilderTurns[0].summary || "Active Session"}</p>
                          <span className="text-xs text-gray-500">Active Session</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-75 text-gray-500" />
                    </div>
                  </div>
                )}
                {filterHistory(sortedFavorites, librarySearch).map((item) => (
                  <HistoryItem
                    key={`fav-${item.id}`}
                    item={item}
                    onCollapseTop={() => setIsBuilderExpanded(false)}
                    onUpdateTurnDebugThread={(turnIndex, thread) => handleUpdateSessionDebugThread(item.id, turnIndex, thread)}
                    onUpdateTurnTokens={(turnIndex, newTokens) => handleUpdateSessionTokens(item.id, turnIndex, newTokens)}
                    onAddTurn={(newTurn) => handleAddTurnToSession(item.id, newTurn)}
                    onToggleStar={handleToggleStar}
                    isFavoriteList={true}
                    settings={settings}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default CommandBuilderTab;