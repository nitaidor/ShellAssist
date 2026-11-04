import React, { useState, useEffect } from 'react';
import { Loader2, Terminal, ChevronUp, ChevronDown, CheckCircle2, WifiOff, Ban, ShieldAlert } from 'lucide-react';
import InteractiveCommand from '../../components/terminal/InteractiveCommand';
import InteractiveDebugCycleItem from './InteractiveDebugCycleItem';

export const InteractiveTurnCard = ({
  turn,
  index,
  isLast,
  ctx,
  settings,
  isReadOnly = false,
  onRunPrimaryCommand,
  onCancelPrimaryCommand,
  onRunFixCommand,
  onCancelDebugCycle,
  onCancelAutoDebugAnalysis,
  onUpdateTokens,
  onOpenElevationModal
}) => {
  const [isExpanded, setIsExpanded] = useState(isReadOnly ? false : isLast);
  useEffect(() => {
    if (!isReadOnly) setIsExpanded(isLast);
  }, [isLast, isReadOnly]);

  const isPrimaryLocked = !isLast || ['running','success','error','cancelled'].includes(turn.runState);
  const isPrimaryRetry = turn.runState === 'failed';

  // Smart AI elevation check for primary command
  const needsElevation = Boolean(turn.requiresElevation);
  const isSessionElevated = Boolean(ctx?.isElevated);
  const showElevationBtn = !isSessionElevated && needsElevation && turn.runState === 'idle';

  const customRunBtn = !isReadOnly ? (
    showElevationBtn ? (
      <button
        type="button"
        onClick={() => !isPrimaryLocked && onOpenElevationModal && onOpenElevationModal(turn)}
        disabled={isPrimaryLocked}
        className={`${!isPrimaryLocked ? 'btn-elevation-action border' : 'bg-[#21262d] opacity-50 cursor-not-allowed border-[#30363d] text-gray-400 border'} px-3.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 shadow-sm text-sm transition-colors`}
      >
        <ShieldAlert className="w-4 h-4 shrink-0" /> Requires Elevation
      </button>
    ) : (
      <button
        type="button"
        onClick={() => !isPrimaryLocked && onRunPrimaryCommand(turn.id)}
        disabled={isPrimaryLocked}
        className={`${!isPrimaryLocked ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent' : 'bg-[#21262d] opacity-50 cursor-not-allowed border-[#30363d] text-gray-400'} border px-4 py-1.5 rounded-md font-medium flex items-center gap-2 shadow-sm text-sm transition-colors`}
      >
        {turn.runState === 'running' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <><Terminal className="w-4 h-4" /> {isPrimaryRetry ? 'Retry' : 'Run'}</>
        )}
      </button>
    )
  ) : null;

  return (
    <div className="bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden shadow-md">
      <div
        className="bg-[#161b22] px-4 py-3 flex justify-between items-start cursor-pointer hover:bg-[#1c2128] transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 overflow-hidden w-full">
          <span className="text-xs font-bold bg-[#21262d] text-gray-400 px-2 py-1 rounded shrink-0 mt-0.5">
            {index === 0 ? 'Initial Request' : `Request #${index + 1}`}
          </span>
          <p className={`text-sm text-gray-300 font-mono pr-4 ${isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
            {turn.prompt}
          </p>
        </div>
        <div className="text-gray-500 group-hover:text-gray-300 shrink-0 ml-2 mt-0.5">
          {isExpanded ? <ChevronUp className="w-5 h-5 opacity-75" /> : <ChevronDown className="w-5 h-5 opacity-75" />}
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-[#30363d]">
          <InteractiveCommand
            tokens={turn.tokens || []}
            command={turn.command || ''}
            hasAlternative={turn.hasAlternative}
            alternativeText={turn.alternativeText}
            riskLevel={turn.riskLevel}
            riskExplanation={turn.riskExplanation}
            overallExplanation={null}
            requiresElevation={turn.requiresElevation}
            deepBreakdownComplete={Boolean(turn.deepBreakdownComplete)}
            onUpdateTokens={onUpdateTokens}
            runCtx={{ ...ctx, type: 'Command' }}
            settings={settings}
            collapsibleInspector={true}
            defaultInspectorExpanded={false}
            customRunButton={customRunBtn}
            hideRunButton={isReadOnly}
          />
          {(turn.runState !== 'idle' || (turn.debugCycles && turn.debugCycles.length > 0)) && (
            <div className="p-4 border-t border-[#30363d] bg-[#161b22] space-y-3">
              {/* Primary Execution Banner with immediate Cancel (^C) Button */}
              {turn.runState === 'running' && (
                <div className="p-4 rounded-xl border border-[#30363d] bg-[#0d1117] text-gray-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 animate-spin theme-spinner" />
                    <span>Executing command in {ctx.shell}...</span>
                  </div>
                  {!isReadOnly && onCancelPrimaryCommand && (
                    <button
                      type="button"
                      onClick={() => onCancelPrimaryCommand(turn.id)}
                      title={`Send interrupt signal (Ctrl+C) to ${ctx.shell}`}
                      className="btn-cancel-action px-3 py-1 rounded-md font-mono font-medium flex items-center gap-1.5 shadow-sm transition-all text-xs self-end sm:self-center"
                    >
                      <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel (^C)
                    </button>
                  )}
                </div>
              )}
              {turn.runState === 'success' && (
                <div className="p-3.5 rounded-xl text-xs flex items-start gap-2.5 shadow-md theme-success-banner">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 theme-success-icon" />
                  <div className="flex-1">
                    <span className="font-bold uppercase tracking-wider block text-[10px]">Ran Successfully</span>
                    <p className="mt-1 font-mono whitespace-pre-wrap">{turn.runMessage}</p>
                    {turn.runOutput && (
                      <pre className="mt-2 p-2.5 rounded bg-[#0d1117] border border-[#30363d] text-gray-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">{turn.runOutput}</pre>
                    )}
                  </div>
                </div>
              )}
              {turn.runState === 'failed' && (
                <div className="p-3.5 rounded-xl border border-red-900/50 bg-red-900/20 text-red-200 text-xs flex items-center gap-2.5 shadow-md theme-error-banner">
                  <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Connection Failed: {turn.runMessage || `Unable to execute command or connect to ${ctx.shell}.`}</span>
                </div>
              )}
              {turn.runState === 'cancelled' && (!turn.debugCycles || turn.debugCycles.length === 0) && (
                <div className="p-3.5 rounded-xl text-xs font-mono flex items-center gap-2.5 shadow-md theme-cancelled-banner">
                  <Ban className="w-4 h-4 shrink-0 btn-cancel-icon" />
                  <span className="font-medium">^C — Execution cancelled. Interrupt signal sent to {ctx.shell}.</span>
                </div>
              )}
              {turn.debugCycles && turn.debugCycles.map((cycle, cIdx) => (
                <InteractiveDebugCycleItem
                  key={cycle.id}
                  cycle={cycle}
                  ctx={ctx}
                  isReadOnly={isReadOnly}
                  isLatestCycle={cIdx === turn.debugCycles.length - 1}
                  isLastTurn={isLast}
                  onRunFix={(cycleId, fixCmd) => onRunFixCommand(turn.id, cycleId, fixCmd)}
                  onCancelFix={(cycleId) => onCancelDebugCycle(turn.id, cycleId)}
                  onCancelAnalysis={(cycleId) => onCancelAutoDebugAnalysis && onCancelAutoDebugAnalysis(turn.id, cycleId)}
                  onOpenElevationModal={(cycleTarget) => onOpenElevationModal && onOpenElevationModal({ type: 'fix', turn, cycle: cycleTarget })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveTurnCard;