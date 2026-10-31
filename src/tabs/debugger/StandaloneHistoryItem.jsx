import React, { useState, useRef } from 'react';
import { History as HistoryIcon, ChevronUp, ChevronDown, Loader2, AlertCircle, X, Ban } from 'lucide-react';
import ContextTags from '../../components/common/ContextTags';
import DebugMessage from '../../components/terminal/DebugMessage';
import { fetchStandaloneDebug } from '../../services/gemini';
import { formatSessionDate } from '../../utils/platform';

export const StandaloneHistoryItem = ({ session, onUpdateThread, onCollapseTop, settings }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const cancelHistoryDebugRef = useRef(0);

  const handleCancelHistoryDebug = () => {
    cancelHistoryDebugRef.current++;
    setIsAnalyzing(false);
  };

  const continueStandaloneSession = async () => {
    if (!followUpInput.trim() || isAnalyzing) return;
    if (onCollapseTop) onCollapseTop();
    const currentInput = followUpInput;
    const debugId = ++cancelHistoryDebugRef.current;

    setIsAnalyzing(true);
    setHistoryError(null);
    setFollowUpInput('');

    try {
      const result = await fetchStandaloneDebug([...session.thread, { role: "user", text: currentInput }], session.ctx, settings);
      if (cancelHistoryDebugRef.current !== debugId) return;

      onUpdateThread([
        ...session.thread,
        { role: "user", text: currentInput },
        { role: "model", text: result.analysis }
      ]);
    } catch (err) {
      if (cancelHistoryDebugRef.current !== debugId) return;
      setHistoryError(err.message || "Failed connection to AI provider.");
      setFollowUpInput(currentInput);
    } finally {
      if (cancelHistoryDebugRef.current === debugId) {
        setIsAnalyzing(false);
      }
    }
  };

  const threadRounds = [];
  let currentRound = [];
  for (let i = 0; i < session.thread.length; i++) {
    const msg = session.thread[i];
    if (msg.role === 'user' && currentRound.length > 0) {
      threadRounds.push(currentRound);
      currentRound = [];
    }
    currentRound.push({ msg, globalIdx: i });
  }
  if (currentRound.length > 0) {
    threadRounds.push(currentRound);
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-md transition-all">
      <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className="history-icon-badge p-2 rounded-lg shadow-sm">
            <HistoryIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{session.summary}</p>
            <span className="text-xs text-gray-500 font-mono">
              {formatSessionDate(session.unixTime || session.timestamp, settings?.clockFormat)}
            </span>
          </div>
        </div>
        <div className="text-gray-500 group-hover:text-gray-300">
          {isExpanded ? <ChevronUp className="w-5 h-5 opacity-75" /> : <ChevronDown className="w-5 h-5 opacity-75" />}
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200 pt-2 border-t border-[#30363d]">
          <ContextTags ctx={session.ctx} />
          
          <div className="mt-2 mb-4 space-y-4">
            {threadRounds.map((round, rIdx) => (
              <div key={rIdx} className="space-y-3 border-l-2 border-[#30363d] pl-4">
                {round.map(({ msg, globalIdx }) => (
                  <DebugMessage
                    key={globalIdx}
                    msg={msg}
                    isLast={globalIdx === session.thread.length - 1}
                    ctx={session.ctx}
                    settings={settings}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Theme-Adaptive Error Banner */}
          {historyError && (
            <div className="mb-3 theme-error-banner rounded-xl p-3 text-xs shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-mono leading-relaxed error-msg">{historyError}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryError(null)}
                className="p-1 hover:opacity-80 transition-opacity"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Loading Spinner with Cancel Button */}
          {isAnalyzing ? (
            <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-6 flex flex-col items-center justify-center text-gray-400 mb-3 shadow-md gap-3">
              <Loader2 className="w-8 h-8 animate-spin icon-debugger" />
              <button
                type="button"
                onClick={handleCancelHistoryDebug}
                className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2 mb-3">
              <textarea
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder={`e.g., Paste the next error output from your ${session.ctx?.shell || 'terminal'} here to continue...`}
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
                disabled={!followUpInput.trim()}
                className="px-6 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 border border-[#30363d] text-white rounded-md text-sm font-medium h-12 flex items-center justify-center gap-2 shrink-0 min-w-[120px] shadow-sm"
              >
                <AlertCircle className="w-4 h-4 icon-debugger" /> Analyze
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StandaloneHistoryItem;