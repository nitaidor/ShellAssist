import React, { useState, useEffect } from 'react';
import { Star, ChevronUp, ChevronDown, Bug } from 'lucide-react';
import ContextTags from '../../components/common/ContextTags';
import InteractiveCommand from '../../components/terminal/InteractiveCommand';
import CommandDebugger from '../debugger/CommandDebugger';

export const TurnItem = ({ turn, isFirst, isLast, onUpdateDebugThread, onUpdateTokens, onToggleStar, showDebug = true, isFavoriteList = false, settings }) => {
  const [isExpanded, setIsExpanded] = useState(isFavoriteList ? turn.isStarred : isLast);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [pendingErrorOutput, setPendingErrorOutput] = useState('');
  const isCodeToEnFirstTurn = isFirst && turn.mode === 'code-to-en';

  useEffect(() => {
    if (!isFavoriteList) setIsExpanded(isLast);
  }, [isLast, isFavoriteList]);

  return (
    <div className={`bg-[#0d1117] rounded-xl border ${turn.isStarred && isFavoriteList ? 'active-fav-border shadow-md' : 'border-[#30363d]'} overflow-hidden shadow-md`}>
      <div
        className="bg-[#161b22] px-4 py-3 flex justify-between items-start cursor-pointer hover:bg-[#1c2128] transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 overflow-hidden w-full">
          <span className="text-xs font-bold bg-[#21262d] text-gray-400 px-2 py-1 rounded shrink-0 mt-0.5">
            {isFirst ? 'Original Prompt' : 'Refinement'}
          </span>
          <div className="flex flex-col overflow-hidden w-full pr-4">
            <p className={`text-sm text-gray-300 font-mono ${isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
              {turn.prompt}
            </p>
            {isCodeToEnFirstTurn && turn.overallExplanation && (
              <p className={`text-xs text-gray-500 mt-1 ${isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                <span className="font-semibold text-gray-400">{turn.summary}:</span> {turn.overallExplanation}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2 mt-0.5">
          {onToggleStar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(turn.id);
              }}
              className={`p-1 rounded-md transition-colors ${turn.isStarred ? 'btn-star-active' : 'btn-star-unselected'}`}
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <div className="text-gray-500 group-hover:text-gray-300">
            {isExpanded ? <ChevronUp className="w-5 h-5 opacity-75" /> : <ChevronDown className="w-5 h-5 opacity-75" />}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 duration-200 overflow-hidden">
          <div className="px-4 py-3 border-t border-b border-[#30363d] bg-[#161b22]">
            <ContextTags ctx={turn.ctx} className="" />
          </div>
          <InteractiveCommand
            tokens={turn.tokens || []}
            command={turn.command || ''}
            hasAlternative={turn.hasAlternative}
            alternativeText={turn.alternativeText}
            riskLevel={turn.riskLevel}
            riskExplanation={turn.riskExplanation}
            overallExplanation={isCodeToEnFirstTurn ? turn.overallExplanation : null}
            requiresElevation={turn.requiresElevation}
            deepBreakdownComplete={Boolean(turn.deepBreakdownComplete)}
            onUpdateTokens={onUpdateTokens}
            runCtx={turn.ctx}
            settings={settings}
            onErrorOutput={(errText) => {
              setIsDebugExpanded(true);
              setPendingErrorOutput(errText);
            }}
          />
          {showDebug && (
            <div className="p-4 border-t border-[#30363d] bg-[#161b22]">
              <div className="bg-[#0d1117] border border-[#30363d] hover:border-red-500/50 p-3 rounded-xl transition-all shadow-md debug-panel-container">
                <div
                  className="flex items-center justify-between cursor-pointer select-none group"
                  onClick={() => setIsDebugExpanded(!isDebugExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 icon-debugger" />
                    <h4 className="text-sm font-semibold text-gray-300">Command Debugger</h4>
                  </div>
                  <div className="text-gray-500 group-hover:text-gray-300">
                    {isDebugExpanded ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
                  </div>
                </div>
                {isDebugExpanded && (
                  <div className="animate-in slide-in-from-top-2 duration-200 mt-3 pt-3 border-t border-[#30363d]">
                    <CommandDebugger
                      prompt={turn.prompt}
                      command={turn.command}
                      initialThread={turn.debugThread}
                      onThreadUpdate={onUpdateDebugThread}
                      ctx={turn.ctx}
                      settings={settings}
                      externalErrorInput={pendingErrorOutput}
                      onClearExternalError={() => setPendingErrorOutput('')}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TurnItem;