import React, { useState, useRef } from 'react';
import { Code, Loader2, Trash2, Search, ChevronDown, AlertCircle, X, Ban } from 'lucide-react';
import ContextDropdowns from '../../components/common/ContextDropdowns';
import ContextTags from '../../components/common/ContextTags';
import InteractiveCommand from '../../components/terminal/InteractiveCommand';
import AnalyzerHistoryItem from './AnalyzerHistoryItem';
import { generateId, formatSessionDate } from '../../utils/platform';
import { fetchCommandGeneration } from '../../services/gemini';

export const CodeAnalyzerTab = ({
  settings,
  isDarkMode,
  analyzerHistory,
  setAnalyzerHistory,
  onClearHistory,
  filterHistory,
  getCollapsedSuggestionColor
}) => {
  const analyzerInputRef = useRef(null);
  const [analyzerCtx, setAnalyzerCtx] = useState({ os: 'Windows', shell: 'PowerShell', type: 'Command' });
  const [isAnalyzerExpanded, setIsAnalyzerExpanded] = useState(true);
  const [analyzerInput, setAnalyzerInput] = useState('');
  const [isAnalyzerRunning, setIsAnalyzerRunning] = useState(false);
  const [analyzerError, setAnalyzerError] = useState(null);
  const [activeAnalyzerTurn, setActiveAnalyzerTurn] = useState(null);
  const [analyzerSearch, setAnalyzerSearch] = useState('');

  const cancelAnalyzerRef = useRef(0);
  const lastRequestedAnalyzerPromptRef = useRef('');

  const expandAnalyzer = () => {
    setIsAnalyzerExpanded(true);
    setTimeout(() => analyzerInputRef.current?.focus(), 50);
  };

  const handleCancelAnalyzer = () => {
    cancelAnalyzerRef.current++; // Invalidate pending promise so late response is discarded
    setIsAnalyzerRunning(false);
    if (!activeAnalyzerTurn) {
      setIsAnalyzerExpanded(true);
      if (lastRequestedAnalyzerPromptRef.current && !analyzerInput) {
        setAnalyzerInput(lastRequestedAnalyzerPromptRef.current);
      }
    }
  };

  const handleUpdateAnalyzerTokens = (sessionId, newTokens) => {
    if (activeAnalyzerTurn && activeAnalyzerTurn.id === sessionId) {
      setActiveAnalyzerTurn(prev => prev ? { ...prev, tokens: newTokens, deepBreakdownComplete: true } : prev);
    }
    setAnalyzerHistory(prev => prev.map(s => s.id === sessionId ? {
      ...s,
      turn: { ...s.turn, tokens: newTokens, deepBreakdownComplete: true }
    } : s));
  };

  const startNewAnalyzerSession = async () => {
    if (!analyzerInput.trim()) return;
    const currentInput = analyzerInput;
    lastRequestedAnalyzerPromptRef.current = currentInput;
    const currentCtx = { ...analyzerCtx };

    const genId = ++cancelAnalyzerRef.current;
    setAnalyzerError(null);
    setIsAnalyzerExpanded(false);
    setActiveAnalyzerTurn(null);
    setIsAnalyzerRunning(true);

    try {
      const result = await fetchCommandGeneration(currentInput, [], currentCtx, 'code-to-en', false, settings);
      if (cancelAnalyzerRef.current !== genId) return;

      const newTurn = {
        ...result,
        id: generateId(),
        prompt: currentInput,
        ctx: currentCtx,
        debugThread: [],
        mode: 'code-to-en'
      };
      setActiveAnalyzerTurn(newTurn);
      
      setAnalyzerHistory(prev => [
        {
          id: newTurn.id,
          turn: newTurn,
          timestamp: new Date().toLocaleString(),
          unixTime: Date.now(),
          ctx: currentCtx
        },
        ...prev.filter(h => h.id !== newTurn.id)
      ]);
      setAnalyzerInput('');
    } catch (err) {
      if (cancelAnalyzerRef.current !== genId) return;
      setAnalyzerError(err.message || "Failed connection to AI provider.");
    } finally {
      if (cancelAnalyzerRef.current === genId) {
        setIsAnalyzerRunning(false);
      }
    }
  };

  const displayAnalyzerHistory = analyzerHistory.filter(s => s.id !== activeAnalyzerTurn?.id);

  return (
    <>
      <section className="space-y-6">
        <div className={`bg-[#161b22] border border-[#30363d] rounded-xl shadow-md relative ${isAnalyzerExpanded ? 'p-6' : 'p-4'}`}>
          <div className="absolute inset-0 rounded-[11px] overflow-hidden pointer-events-none">
            <div className="w-full h-[3px] bg-gradient-to-r from-green-600 to-emerald-500"></div>
          </div>
          {isAnalyzerExpanded ? (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-lg font-semibold mb-2 flex items-center gap-2 mt-1 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
                    <Code className="w-5 h-5 shrink-0 icon-analyzer" /> Analyze Code
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Paste any script or command here for a token-by-token explanation.
                  </p>
                </div>
              </div>
              <textarea
                ref={analyzerInputRef}
                value={analyzerInput}
                onChange={(e) => setAnalyzerInput(e.target.value)}
                placeholder={`e.g., Paste your ${analyzerCtx.shell} ${analyzerCtx.type.toLowerCase()} here to analyze...`}
                className="w-full h-28 bg-[#0d1117] border border-[#30363d] rounded-md p-4 font-mono text-sm text-gray-200 focus:outline-none focus:border-green-500 resize-none shadow-sm mt-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    startNewAnalyzerSession();
                  }
                }}
              />
              <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <ContextDropdowns ctx={analyzerCtx} setCtx={setAnalyzerCtx} />
                </div>
                <button
                  onClick={startNewAnalyzerSession}
                  disabled={isAnalyzerRunning || !analyzerInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:opacity-50 text-white px-5 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 w-full md:w-auto shrink-0 h-10 min-w-[160px] border border-transparent"
                >
                  {isAnalyzerRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Code className="w-4 h-4" /> Analyze Code</>}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                onClick={expandAnalyzer}
                className="w-full h-12 bg-[#0d1117] border border-[#30363d] hover:border-green-500 rounded-md px-4 flex items-center justify-between text-sm font-mono cursor-text shadow-sm transition-colors"
              >
                <span className="truncate collapsed-placeholder-text" style={{ color: getCollapsedSuggestionColor() }}>
                  {analyzerInput ? analyzerInput : `e.g., Paste your ${analyzerCtx.shell} ${analyzerCtx.type.toLowerCase()} here to analyze...`}
                </span>
              </div>
            </div>
          )}
        </div>

        {analyzerError && (
          <div className="theme-error-banner rounded-xl p-4 shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider error-title">Analysis Error</h4>
                <p className="text-xs mt-1 leading-relaxed font-mono error-msg">{analyzerError}</p>
              </div>
            </div>
            <button
              onClick={() => setAnalyzerError(null)}
              className="p-1 hover:opacity-80 transition-opacity"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Spinner with Cancel Button */}
        {isAnalyzerRunning && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 flex flex-col items-center justify-center text-gray-400 shadow-md mt-6 animate-in fade-in duration-200 gap-3">
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin mb-3 icon-analyzer" />
              <p className="text-sm">Analyzing {analyzerCtx.type.toLowerCase()}...</p>
            </div>
            <button
              type="button"
              onClick={handleCancelAnalyzer}
              className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Cancel code analysis"
            >
              <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
            </button>
          </div>
        )}

        {activeAnalyzerTurn && !isAnalyzerRunning && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-md mt-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-[#30363d]">
              <h5 className="text-sm font-semibold icon-analyzer flex items-center gap-2 mb-3">
                <Code className="w-4 h-4" /> Active Analysis Session
              </h5>
              <ContextTags ctx={activeAnalyzerTurn.ctx} className="" />
            </div>
            <InteractiveCommand
              tokens={activeAnalyzerTurn.tokens || []}
              command={activeAnalyzerTurn.command || ''}
              hasAlternative={activeAnalyzerTurn.hasAlternative}
              alternativeText={activeAnalyzerTurn.alternativeText}
              riskLevel={activeAnalyzerTurn.riskLevel}
              riskExplanation={activeAnalyzerTurn.riskExplanation}
              overallExplanation={activeAnalyzerTurn.overallExplanation}
              deepBreakdownComplete={Boolean(activeAnalyzerTurn.deepBreakdownComplete)}
              onUpdateTokens={(newTokens) => handleUpdateAnalyzerTokens(activeAnalyzerTurn.id, newTokens)}
              runCtx={activeAnalyzerTurn.ctx}
              settings={settings}
            />
          </div>
        )}
      </section>

      {/* History section */}
      <section className="mt-8 pt-6 border-t border-[#30363d]">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h2 className={`text-xl font-bold flex items-center gap-2 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
            <Code className="w-5 h-5 icon-analyzer" /> Analysis History {analyzerHistory.length > 0 && <span className="theme-count-badge text-xs px-2.5 py-0.5 rounded-full font-medium ml-2">{analyzerHistory.length}</span>}
          </h2>
          <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
            <button
              onClick={() => onClearHistory('analyzer')}
              disabled={analyzerHistory.length === 0}
              title={analyzerHistory.length === 0 ? "No history to clear" : "Clear History"}
              className={`btn-clear-history px-3.5 py-2 rounded-md text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                analyzerHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-950/30'
              }`}
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={analyzerSearch}
                onChange={(e) => setAnalyzerSearch(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-9 pr-4 py-2 bg-[#161b22] border border-[#30363d] rounded-md text-sm text-gray-200 focus:outline-none focus:border-green-500 shadow-sm h-10"
              />
            </div>
          </div>
        </div>
        {analyzerSearch.trim() && (
          <p className="text-xs icon-analyzer mb-4 font-medium flex items-center gap-2">
            <Search className="w-3.5 h-3.5" /> Showing filtered results for "{analyzerSearch}"
          </p>
        )}
        {analyzerHistory.length === 0 && !activeAnalyzerTurn ? (
          <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl flex flex-col items-center justify-center h-48 text-gray-500">
            <Code className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Analyzed scripts will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeAnalyzerTurn && !analyzerSearch.trim() && (
              <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-sm opacity-50 pointer-events-none" title="This is your active session">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/10 text-green-400 p-2 rounded-lg">
                      <Code className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{activeAnalyzerTurn.summary || "Active Session"}</p>
                      <span className="text-xs text-gray-500">Active Session</span>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 opacity-75 text-gray-500" />
                </div>
              </div>
            )}
            {filterHistory(displayAnalyzerHistory, analyzerSearch).sort((a,b) => b.unixTime - a.unixTime).map((session, index) => (
              <AnalyzerHistoryItem
                key={session.id || index}
                session={session}
                settings={settings}
                onUpdateTokens={(newTokens) => handleUpdateAnalyzerTokens(session.id, newTokens)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default CodeAnalyzerTab;