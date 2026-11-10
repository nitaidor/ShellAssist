import React, { useState, useRef } from 'react';
import { Star, History as HistoryIcon, ChevronUp, ChevronDown, Loader2, AlertCircle, X, Ban } from 'lucide-react';
import ContextDropdowns from '../../components/common/ContextDropdowns';
import TurnItem from './TurnItem';
import { generateId, formatSessionDate } from '../../utils/platform';
import { fetchCommandGeneration, handleApiError } from '../../services/gemini';

export const HistoryItem = ({ item, onUpdateTurnDebugThread, onUpdateTurnTokens, onAddTurn, onToggleStar, isFavoriteList = false, settings, onCollapseTop, setApiStatus }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState(null);
  const lastTurn = item.turns[item.turns.length - 1];
  const [refineCtx, setRefineCtx] = useState(lastTurn?.ctx || item.ctx || { os: 'Windows', shell: 'PowerShell', type: 'Command' });

  const cancelHistoryRefineRef = useRef(0);

  const handleRefine = async () => {
    let currentInput = refineInput;
    if (!currentInput.trim()) currentInput = `Translate this to ${refineCtx.os}, ${refineCtx.shell} as a ${refineCtx.type}.`;
    if (onCollapseTop) onCollapseTop();
    const refineId = ++cancelHistoryRefineRef.current;
    setIsRefining(true);
    setRefineError(null);
    try {
      const result = await fetchCommandGeneration(currentInput, item.turns, refineCtx, 'en-to-code', false, settings);
      if (cancelHistoryRefineRef.current !== refineId) return;

      setApiStatus?.('valid');
      if (onAddTurn) {
        onAddTurn({ ...result, id: generateId(), prompt: currentInput, ctx: refineCtx, debugThread: [], mode: 'en-to-code', isStarred: false });
      }
      setRefineInput('');
    } catch (err) {
      if (cancelHistoryRefineRef.current !== refineId) return;
      handleApiError(err, setApiStatus, settings);
      setRefineError(err.message || "Failed to refine command. Please verify your API key in Settings.");
    } finally {
      if (cancelHistoryRefineRef.current === refineId) {
        setIsRefining(false);
      }
    }
  };

  const handleCancelRefine = () => {
    cancelHistoryRefineRef.current++;
    setIsRefining(false);
  };

  const isActiveRefineDisabled = isRefining || (!refineInput.trim() && !(refineCtx && (lastTurn?.ctx?.os !== refineCtx.os || lastTurn?.ctx?.shell !== refineCtx.shell || lastTurn?.ctx?.type !== refineCtx.type)));

  return (
    <div className={`flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border ${isFavoriteList ? 'active-fav-border shadow-md' : 'border-[#30363d] shadow-md'} transition-all`}>
      <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className={`${isFavoriteList ? 'active-fav-icon' : 'history-icon-badge'} p-2 rounded-lg shadow-sm`}>
            {isFavoriteList ? <Star className="w-4 h-4 fill-current" /> : <HistoryIcon className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{item.summary}</p>
            <span className="text-xs text-gray-500 font-mono">
              {formatSessionDate(item.unixTime || item.timestamp, settings?.clockFormat)}
            </span>
          </div>
        </div>
        <div className="text-gray-500 group-hover:text-gray-300">
          {isExpanded ? <ChevronUp className="w-5 h-5 opacity-75" /> : <ChevronDown className="w-5 h-5 opacity-75" />}
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200 pt-4 border-t border-[#30363d]">
          <div className="space-y-4">
            {item.turns.map((turn, index) => (
              <TurnItem
                key={turn.id || index}
                turn={turn}
                isFirst={index === 0}
                isLast={index === item.turns.length - 1}
                onUpdateDebugThread={(thread) => onUpdateTurnDebugThread && onUpdateTurnDebugThread(index, thread)}
                onUpdateTokens={(newTokens) => onUpdateTurnTokens && onUpdateTurnTokens(index, newTokens)}
                onToggleStar={onToggleStar}
                isFavoriteList={isFavoriteList}
                settings={settings}
              />
            ))}
          </div>

          {/* Refinement Error Alert Banner */}
          {refineError && (
            <div className="theme-error-banner rounded-xl p-3.5 shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200 mt-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider error-title">Refinement Error</h4>
                  <p className="text-xs mt-0.5 font-mono leading-relaxed error-msg">{refineError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefineError(null)}
                className="p-1 hover:opacity-80 transition-opacity"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isRefining ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 mt-2 shadow-sm gap-3">
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin mb-3 icon-builder" />
                <p className="text-sm">Refining...</p>
              </div>
              <button
                type="button"
                onClick={handleCancelRefine}
                className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
                title="Cancel refinement"
              >
                <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2 bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-md">
              <input
                type="text"
                value={refineInput}
                onChange={(e) => setRefineInput(e.target.value)}
                placeholder={`Add context or tweak for ${refineCtx.os} ${refineCtx.shell}...`}
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-md px-4 py-2.5 text-sm text-gray-200 focus:outline-none shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isActiveRefineDisabled) handleRefine();
                }}
              />
              <div className="flex justify-between items-center gap-3">
                <ContextDropdowns ctx={refineCtx} setCtx={setRefineCtx} />
                <button
                  onClick={handleRefine}
                  disabled={isActiveRefineDisabled}
                  className="bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] disabled:opacity-50 text-white px-6 py-2.5 rounded-md font-medium shadow-sm transition-colors border border-transparent"
                >
                  Refine
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryItem;