import React, { useState, useRef } from 'react';
import { Bug, AlertCircle, Loader2, History as HistoryIcon, Trash2, Search, ChevronDown, X, Ban, FileUp, FileMinus } from 'lucide-react';
import CustomSelect from '../../components/common/CustomSelect';
import ContextTags from '../../components/common/ContextTags';
import DebugMessage from '../../components/terminal/DebugMessage';
import StandaloneHistoryItem from './StandaloneHistoryItem';
import { fetchStandaloneDebug } from '../../services/gemini';
import { generateId, getContextFromFileExtension } from '../../utils/platform';
import { OS_OPTIONS, SHELL_OPTIONS } from '../../constants/environment';

export const GeneralDebuggerTab = ({
  settings,
  isDarkMode,
  debugHistory,
  setDebugHistory,
  onClearHistory,
  filterHistory,
  getCollapsedSuggestionColor
}) => {
  const debuggerInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [debugCtx, setDebugCtx] = useState({ os: 'Windows', shell: 'PowerShell' });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDebuggerExpanded, setIsDebuggerExpanded] = useState(true);
  const [newStandaloneInput, setNewStandaloneInput] = useState('');
  const [followUpStandaloneInput, setFollowUpStandaloneInput] = useState('');
  const [isStandaloneDebugging, setIsStandaloneDebugging] = useState(false);
  const [debugError, setDebugError] = useState(null);
  const [activeDebugSessionId, setActiveDebugSessionId] = useState(null);
  const [activeStandaloneThread, setActiveStandaloneThread] = useState([]);
  const [activeStandaloneSummary, setActiveStandaloneSummary] = useState('');
  const [activeStandaloneCtx, setActiveStandaloneCtx] = useState(null);
  const [debuggerSearch, setDebuggerSearch] = useState('');

  const cancelDebuggerRef = useRef(0);
  const lastRequestedDebugInputRef = useRef('');

  const expandDebugger = () => {
    setIsDebuggerExpanded(true);
    setTimeout(() => debuggerInputRef.current?.focus(), 50);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Strict extension validation fallback in case OS file-picker bypass is used
    const ext = file.name.slice((Math.max(0, file.name.lastIndexOf(".")) || Infinity) + 1).toLowerCase();
    const validExts = ['ps1', 'bat', 'cmd', 'sh', 'zsh', 'tf', 'yml', 'yaml', 'txt'];
    if (!validExts.includes(ext)) {
      setDebugError(`Unsupported file extension: .${ext}. Please upload a supported script format.`);
      e.target.value = null;
      return;
    }

    setDebugError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const mapping = getContextFromFileExtension(file.name);
      
      setUploadedFile({ 
        name: file.name, 
        content, 
        validOs: mapping ? mapping.validOs : OS_OPTIONS.filter(o => o !== '──────────'), 
        shell: mapping ? mapping.shell : debugCtx.shell 
      });
      
      if (mapping) {
        const newOs = mapping.validOs.includes(debugCtx.os) ? debugCtx.os : mapping.validOs[0];
        setDebugCtx({ os: newOs, shell: mapping.shell });
      }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleCancelInitialDebug = () => {
    cancelDebuggerRef.current++;
    setIsStandaloneDebugging(false);
    if (activeStandaloneThread.length === 0) {
      setIsDebuggerExpanded(true);
      if (lastRequestedDebugInputRef.current && !newStandaloneInput && !uploadedFile) {
        setNewStandaloneInput(lastRequestedDebugInputRef.current);
      }
    }
  };

  const handleCancelFollowUpDebug = () => {
    cancelDebuggerRef.current++;
    setIsStandaloneDebugging(false);
  };

  const startNewStandaloneSession = async () => {
    if (!newStandaloneInput.trim() && !uploadedFile) return;
    
    const combinedInput = uploadedFile 
      ? `Script Content:\n\`\`\`\n${uploadedFile.content}\n\`\`\`\n\nTerminal/Error Output:\n${newStandaloneInput}`
      : newStandaloneInput;
      
    lastRequestedDebugInputRef.current = newStandaloneInput;
    
    const isScript = !!uploadedFile || newStandaloneInput.includes('\n');
    const currentCtx = { ...debugCtx, type: isScript ? 'Script' : 'Command' };

    const genId = ++cancelDebuggerRef.current;
    setDebugError(null);
    setIsDebuggerExpanded(false);
    setActiveStandaloneThread([]);
    setActiveStandaloneSummary('');
    const newSessionId = generateId();
    setActiveDebugSessionId(newSessionId);
    setIsStandaloneDebugging(true);

    try {
      const result = await fetchStandaloneDebug([{ role: "user", text: combinedInput }], currentCtx, settings);
      if (cancelDebuggerRef.current !== genId) return;

      // Debugging succeeded, now we can remove the file and text from the top window
      setUploadedFile(null);
      setNewStandaloneInput('');

      const initialThread = [
        { role: "user", text: combinedInput },
        { role: "model", text: result.analysis }
      ];
      setActiveStandaloneSummary(result.summary);
      setActiveStandaloneCtx(currentCtx);
      setActiveStandaloneThread(initialThread);

      setDebugHistory(prev => [
        {
          id: newSessionId,
          summary: result.summary || "Debug Session",
          timestamp: new Date().toLocaleString(),
          unixTime: Date.now(),
          thread: initialThread,
          ctx: currentCtx
        },
        ...prev.filter(h => h.id !== newSessionId)
      ]);
    } catch (err) {
      if (cancelDebuggerRef.current !== genId) return;
      setDebugError(err.message || "Failed connection to AI provider. Please verify your API key in Settings.");
    } finally {
      if (cancelDebuggerRef.current === genId) {
        setIsStandaloneDebugging(false);
      }
    }
  };

  const continueStandaloneSession = async () => {
    if (!followUpStandaloneInput.trim() || isStandaloneDebugging) return;
    const currentInput = followUpStandaloneInput;
    const genId = ++cancelDebuggerRef.current;

    setIsDebuggerExpanded(false);
    setIsStandaloneDebugging(true);
    setDebugError(null);
    setFollowUpStandaloneInput('');

    try {
      const result = await fetchStandaloneDebug([...activeStandaloneThread, { role: "user", text: currentInput }], activeStandaloneCtx, settings);
      if (cancelDebuggerRef.current !== genId) return;

      const updatedThread = [
        ...activeStandaloneThread,
        { role: "user", text: currentInput },
        { role: "model", text: result.analysis }
      ];
      setActiveStandaloneThread(updatedThread);

      setDebugHistory(prev => prev.map(s => s.id === activeDebugSessionId ? { ...s, thread: updatedThread } : s));
    } catch (err) {
      if (cancelDebuggerRef.current !== genId) return;
      setDebugError(err.message || "Failed connection to AI provider. Please verify your API key in Settings.");
      setFollowUpStandaloneInput(currentInput);
    } finally {
      if (cancelDebuggerRef.current === genId) {
        setIsStandaloneDebugging(false);
      }
    }
  };

  const threadRounds = [];
  let currentRound = [];
  for (let i = 0; i < activeStandaloneThread.length; i++) {
    const msg = activeStandaloneThread[i];
    if (msg.role === 'user' && currentRound.length > 0) {
      threadRounds.push(currentRound);
      currentRound = [];
    }
    currentRound.push({ msg, globalIdx: i });
  }
  if (currentRound.length > 0) {
    threadRounds.push(currentRound);
  }

  const displayDebugHistory = debugHistory.filter(s => s.id !== activeDebugSessionId);
  const validOsOptions = uploadedFile ? uploadedFile.validOs : OS_OPTIONS;
  const validShellOptions = uploadedFile ? [uploadedFile.shell] : (SHELL_OPTIONS[debugCtx.os] || []);

  return (
    <>
      <section className="space-y-6">
        <div className={`bg-[#161b22] border border-[#30363d] rounded-xl shadow-md relative ${isDebuggerExpanded ? 'p-6' : 'p-4'}`}>
          <div className="absolute inset-0 rounded-[11px] overflow-hidden pointer-events-none">
            <div className="w-full h-[3px] bg-gradient-to-r from-red-600 to-orange-500"></div>
          </div>
          {isDebuggerExpanded ? (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-lg font-semibold mb-2 flex items-center gap-2 mt-1 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
                    <Bug className="w-5 h-5 shrink-0 icon-debugger" /> Analyze Issue
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Attach a script and paste any error or console output here to start a new debug session.
                  </p>
                </div>
              </div>
              
              <textarea
                ref={debuggerInputRef}
                value={newStandaloneInput}
                onChange={(e) => setNewStandaloneInput(e.target.value)}
                placeholder={`e.g., Paste the error output from your ${debugCtx.shell} terminal here...`}
                className="w-full h-28 bg-[#0d1117] border border-[#30363d] focus:border-red-500 rounded-md p-4 font-mono text-sm text-gray-200 focus:outline-none resize-none shadow-sm mt-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    startNewStandaloneSession();
                  }
                }}
              />
              <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <CustomSelect
                    value={debugCtx.os}
                    onChange={(newOs) => {
                      if (newOs === '──────────') return;
                      const shells = SHELL_OPTIONS[newOs] || [];
                      setDebugCtx({ ...debugCtx, os: newOs, shell: shells.includes(debugCtx.shell) ? debugCtx.shell : shells[0] });
                    }}
                    options={validOsOptions}
                  />
                  <CustomSelect
                    value={debugCtx.shell}
                    onChange={(newShell) => setDebugCtx({ ...debugCtx, shell: newShell })}
                    options={validShellOptions}
                    disabled={!!uploadedFile}
                  />
                  <input type="file" ref={fileInputRef} className="hidden" accept=".ps1,.bat,.cmd,.sh,.zsh,.tf,.yml,.yaml,.txt" onChange={handleFileUpload} />
                  <button
                    onClick={() => uploadedFile ? handleRemoveFile() : fileInputRef.current.click()}
                    className="px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center gap-2 border transition-colors shadow-sm h-10 bg-[#161b22] border-[#30363d] text-gray-300 hover:bg-[#21262d] hover:text-white"
                  >
                    {uploadedFile ? <FileMinus className="w-4 h-4 btn-cancel-icon" /> : <FileUp className="w-4 h-4" />}
                    {uploadedFile ? 'Remove Script' : 'Upload Script'}
                  </button>
                </div>
                <button
                  onClick={startNewStandaloneSession}
                  disabled={isStandaloneDebugging || (!newStandaloneInput.trim() && !uploadedFile)}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:bg-blue-900 px-5 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 w-full md:w-auto shrink-0 h-10 min-w-[160px] border border-transparent"
                >
                  {isStandaloneDebugging ? <Loader2 className="w-5 h-5 animate-spin" /> : <><AlertCircle className="w-4 h-4" /> Analyze</>}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                onClick={expandDebugger}
                className="w-full h-12 bg-[#0d1117] border border-[#30363d] hover:border-red-500 rounded-md px-4 flex items-center justify-between text-sm font-mono cursor-text shadow-sm transition-colors"
              >
                <span className="truncate collapsed-placeholder-text" style={{ color: getCollapsedSuggestionColor() }}>
                  {uploadedFile && !newStandaloneInput ? `Attached: ${uploadedFile.name} (Ready to Analyze)` : (newStandaloneInput ? newStandaloneInput : `e.g., Paste the error output from your ${debugCtx.shell} terminal here...`)}
                </span>
              </div>
            </div>
          )}
        </div>

        {debugError && activeStandaloneThread.length === 0 && (
          <div className="theme-error-banner rounded-xl p-4 shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider error-title">Debugger Error</h4>
                <p className="text-xs mt-1 leading-relaxed font-mono error-msg">{debugError}</p>
              </div>
            </div>
            <button
              onClick={() => setDebugError(null)}
              className="p-1 hover:opacity-80 transition-opacity"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isStandaloneDebugging && activeStandaloneThread.length === 0 && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 flex flex-col items-center justify-center text-gray-400 shadow-md mt-6 animate-in fade-in duration-200 gap-3">
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin mb-3 icon-debugger" />
              <p className="text-sm">Analyzing issue...</p>
            </div>
            <button
              type="button"
              onClick={handleCancelInitialDebug}
              className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Cancel analysis"
            >
              <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
            </button>
          </div>
        )}

        {activeStandaloneThread.length > 0 && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 shadow-md mt-6 animate-in slide-in-from-bottom-4 duration-300">
            <h5 className="text-sm font-semibold icon-debugger mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Active Debug Session
            </h5>
            <div className="mb-4">
              <ContextTags ctx={activeStandaloneCtx} className="" />
            </div>

            <div className="mb-4 space-y-4">
              {threadRounds.map((round, rIdx) => (
                <div key={rIdx} className="space-y-3 border-l-2 border-[#30363d] pl-4">
                  {round.map(({ msg, globalIdx }) => (
                    <DebugMessage
                      key={globalIdx}
                      msg={msg}
                      isLast={globalIdx === activeStandaloneThread.length - 1}
                      ctx={activeStandaloneCtx}
                      settings={settings}
                    />
                  ))}
                </div>
              ))}
            </div>

            {debugError && (
              <div className="mb-3 theme-error-banner rounded-xl p-3.5 shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider error-title">Debugger Connection Error</h4>
                    <p className="text-xs mt-0.5 font-mono leading-relaxed error-msg">{debugError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDebugError(null)}
                  className="p-1 hover:opacity-80 transition-opacity"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isStandaloneDebugging ? (
              <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-6 flex flex-col items-center justify-center text-gray-400 mb-3 shadow-md gap-3">
                <Loader2 className="w-8 h-8 animate-spin icon-debugger" />
                <button
                  type="button"
                  onClick={handleCancelFollowUpDebug}
                  className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
                  title="Cancel analysis"
                >
                  <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mb-3">
                <textarea
                  value={followUpStandaloneInput}
                  onChange={(e) => setFollowUpStandaloneInput(e.target.value)}
                  placeholder={`e.g., Paste the next error output from your ${activeStandaloneCtx?.shell || 'terminal'} here to continue...`}
                  className="flex-1 h-12 bg-[#0d1117] border border-[#30363d] focus:border-red-500 rounded-md p-3 text-xs font-mono text-gray-300 focus:outline-none resize-y shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      continueStandaloneSession();
                    }
                  }}
                />
                <button
                  onClick={continueStandaloneSession}
                  disabled={!followUpStandaloneInput.trim()}
                  className="px-6 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 border border-[#30363d] text-white rounded-md text-sm font-medium h-12 flex items-center justify-center gap-2 shrink-0 min-w-[120px] shadow-sm"
                >
                  <AlertCircle className="w-4 h-4 icon-debugger" /> Analyze
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* History section */}
      <section className="mt-8 pt-6 border-t border-[#30363d]">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h2 className={`text-xl font-bold flex items-center gap-2 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
            <Bug className="w-5 h-5 icon-debugger" /> Debug History {debugHistory.length > 0 && <span className="theme-count-badge text-xs px-2.5 py-0.5 rounded-full font-medium ml-2">{debugHistory.length}</span>}
          </h2>
          <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
            <button
              onClick={() => onClearHistory('debugger')}
              disabled={debugHistory.length === 0}
              title={debugHistory.length === 0 ? "No history to clear" : "Clear History"}
              className={`btn-clear-history px-3.5 py-2 rounded-md text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                debugHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-950/30'
              }`}
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={debuggerSearch}
                onChange={(e) => setDebuggerSearch(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-9 pr-4 py-2 bg-[#161b22] border border-[#30363d] rounded-md text-sm text-gray-200 focus:outline-none focus:border-red-500 shadow-sm h-10"
              />
            </div>
          </div>
        </div>
        {debuggerSearch.trim() && (
          <p className="text-xs icon-debugger mb-4 font-medium flex items-center gap-2">
            <Search className="w-3.5 h-3.5" /> Showing filtered results for "{debuggerSearch}"
          </p>
        )}
        {debugHistory.length === 0 && activeStandaloneThread.length === 0 ? (
          <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl flex flex-col items-center justify-center h-48 text-gray-500">
            <Bug className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Analyzed standalone sessions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeStandaloneThread.length > 0 && !debuggerSearch.trim() && (
              <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-sm opacity-50 pointer-events-none" title="This is your active session">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="history-icon-badge p-2 rounded-lg">
                      <Bug className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{activeStandaloneSummary || "Active Session"}</p>
                      <span className="text-xs text-gray-500">Active Session</span>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 opacity-75 text-gray-500" />
                </div>
              </div>
            )}
            {filterHistory(displayDebugHistory, debuggerSearch).sort((a,b) => b.unixTime - a.unixTime).map((session, index) => (
              <StandaloneHistoryItem
                key={index}
                session={session}
                settings={settings}
                onCollapseTop={() => setIsDebuggerExpanded(false)}
                onUpdateThread={(thread) => setDebugHistory(prev => prev.map((s, i) => i === index ? { ...s, thread } : s))}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default GeneralDebuggerTab;