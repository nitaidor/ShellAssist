import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, TerminalSquare, ChevronUp, ChevronDown, Bug, Code, Check, Copy, Terminal, Ban, CheckCircle2, WifiOff, ShieldAlert } from 'lucide-react';

export const InteractiveDebugCycleItem = ({
  cycle,
  ctx,
  isReadOnly,
  onRunFix,
  onCancelFix,
  onCancelAnalysis,
  isLatestCycle,
  isLastTurn = true,
  onOpenElevationModal
}) => {
  const [termOutputExpanded, setTermOutputExpanded] = useState(false);
  const [fixExpanded, setFixExpanded] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLatestCycle || !isLastTurn) {
      setFixExpanded(false);
      setCodeExpanded(false);
    }
  }, [isLatestCycle, isLastTurn]);

  const handleCopyFix = async (e) => {
    e.stopPropagation();
    if (!cycle.fixCommand) return;
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(cycle.fixCommand);
      else throw new Error();
    } catch {
      const t = document.createElement("textarea");
      t.value = cycle.fixCommand;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch(ex){}
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFixRunLocked = isReadOnly || !isLatestCycle || !isLastTurn || ['running','success','error','cancelled'].includes(cycle.fixStatus);
  const isFixRetry = cycle.fixStatus === 'failed';
  const isCancelDisabled = isReadOnly || !isLatestCycle || !isLastTurn || ['running','cancelled','success','error'].includes(cycle.fixStatus);

  // Elevation handling for fix commands:
  const isSessionElevated = Boolean(ctx?.isElevated);
  const needsElevation = Boolean(cycle.requiresElevation);
  const showElevationBtn = !isSessionElevated && needsElevation && (cycle.fixStatus === 'idle' || !cycle.fixStatus);

  return (
    <div className="mt-3 space-y-3 border-l-2 border-[#30363d] pl-4">
      {cycle.attemptType === 'error' && (
        <div className="p-3 rounded-xl text-xs flex items-start gap-2.5 shadow-md theme-error-banner">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider block text-[10px] opacity-80 error-title">Execution Error</span>
            <p className="mt-0.5 font-mono error-msg">{cycle.errorMessage || 'Command returned a non-zero exit code.'}</p>
          </div>
        </div>
      )}

      {/* Auto-Debug Analysis in progress with Cancel Button */}
      {cycle.isAnalyzing ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-400 shadow-md">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin theme-spinner" />
            <span className="text-xs font-medium">Analyzing terminal output & preparing fix...</span>
          </div>
          {onCancelAnalysis && !isReadOnly && (
            <button
              type="button"
              onClick={() => onCancelAnalysis(cycle.id)}
              className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors self-end sm:self-center"
              title="Cancel AI automated diagnosis"
            >
              <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 space-y-3 shadow-md">
          <div className="p-2.5 rounded-lg border border-[#30363d] bg-[#0d1117] text-gray-300 text-xs shadow-md">
            <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setTermOutputExpanded(!termOutputExpanded)}>
              <div className="flex items-center gap-2 font-semibold text-[10px] opacity-75 uppercase tracking-wider">
                <TerminalSquare className="w-3.5 h-3.5" /> Terminal Output
              </div>
              {termOutputExpanded ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
            </div>
            {termOutputExpanded && (
              <pre className="mt-2 pt-2 border-t border-[#30363d] whitespace-pre-wrap font-mono text-[11px] text-gray-300 overflow-x-auto">{cycle.terminalSnapshot}</pre>
            )}
          </div>
          <div className="p-3 rounded-lg border theme-suggested-fix text-xs shadow-md">
            <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setFixExpanded(!fixExpanded)}>
              <div className="flex items-center gap-2 font-semibold text-[10px] opacity-80 uppercase tracking-wider">
                <Bug className="w-3.5 h-3.5 debug-icon" /> Suggested Fix
              </div>
              {fixExpanded ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
            </div>
            {fixExpanded && (
              <div className="mt-2 pt-2 border-t border-inherit whitespace-pre-wrap leading-relaxed text-xs animate-in fade-in duration-200">{cycle.fixExplanation}</div>
            )}
          </div>
          {cycle.fixCommand && (
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden debug-code-block shadow-md">
              <div
                onClick={() => setCodeExpanded(!codeExpanded)}
                className={`flex justify-between items-center bg-[#21262d] px-3 py-2 cursor-pointer select-none debug-code-header flex-wrap gap-2 ${codeExpanded ? 'border-b border-[#30363d]' : ''}`}
              >
                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 debug-icon" /> Suggested Fix Code
                </span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={handleCopyFix}
                    className={`${copied ? 'btn-copied-state' : 'bg-[#21262d] hover:bg-[#30363d] text-gray-200 border-[#30363d]'} border px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 shadow-sm transition-all text-xs`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
                  </button>
                  {!isReadOnly && (
                    <>
                      {showElevationBtn ? (
                        <button
                          type="button"
                          onClick={() => !isFixRunLocked && onOpenElevationModal && onOpenElevationModal(cycle)}
                          disabled={isFixRunLocked}
                          className={`${!isFixRunLocked ? 'btn-elevation-action border' : 'bg-[#21262d] opacity-50 cursor-not-allowed border-[#30363d] text-gray-400 border'} px-3 py-1 rounded-md font-medium flex items-center gap-1.5 shadow-sm transition-all text-xs`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Requires Elevation
                        </button>
                      ) : (
                        <button
                          onClick={() => !isFixRunLocked && onRunFix(cycle.id, cycle.fixCommand)}
                          disabled={isFixRunLocked}
                          className={`${!isFixRunLocked ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent' : 'bg-[#21262d] opacity-50 cursor-not-allowed border-[#30363d] text-gray-400'} border px-3 py-1 rounded-md font-medium flex items-center gap-1.5 shadow-sm transition-all text-xs`}
                        >
                          {cycle.fixStatus === 'running' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin theme-spinner" />
                          ) : (
                            <><Terminal className="w-3.5 h-3.5" /> {isFixRetry ? 'Retry' : 'Run'}</>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => !isCancelDisabled && onCancelFix(cycle.id)}
                        disabled={isCancelDisabled}
                        title={`Send interrupt signal (Ctrl+C) to ${ctx?.shell || 'terminal'}`}
                        className="bg-[#21262d] hover:bg-red-900/40 text-red-400 border border-[#30363d] disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 shadow-sm transition-all text-xs"
                      >
                        <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel (^C)
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setCodeExpanded(!codeExpanded)}
                    className="p-0.5 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {codeExpanded ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
                  </button>
                </div>
              </div>
              {codeExpanded && (
                <div className="p-3 overflow-x-auto debug-code-text font-mono text-xs whitespace-pre animate-in fade-in duration-150">
                  {cycle.fixCommand}
                </div>
              )}
            </div>
          )}
          {/* Themed "Ran Successfully" Banner */}
          {cycle.fixStatus === 'success' && (
            <div className="p-3 rounded-xl text-xs flex items-start gap-2.5 shadow-md theme-success-banner">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 theme-success-icon" />
              <div className="flex-1">
                <span className="font-bold uppercase tracking-wider block text-[10px]">Ran Successfully</span>
                <p className="mt-1 font-mono whitespace-pre-wrap">{cycle.fixResultMessage}</p>
                {cycle.fixResultOutput && (
                  <pre className="mt-2 p-2 rounded bg-[#0d1117] border border-[#30363d] text-gray-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">{cycle.fixResultOutput}</pre>
                )}
              </div>
            </div>
          )}
          {/* Themed Connection Failed Banner */}
          {cycle.fixStatus === 'failed' && (
            <div className="p-3 rounded-xl text-xs flex items-center gap-2.5 shadow-md theme-error-banner">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>Connection Failed: {cycle.fixResultMessage || `Lost connection to ${ctx?.shell} terminal.`}</span>
            </div>
          )}
          {/* Themed Execution Cancelled Banner */}
          {cycle.fixStatus === 'cancelled' && (
            <div className="p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 shadow-md theme-cancelled-banner">
              <Ban className="w-3.5 h-3.5 shrink-0 btn-cancel-icon" />
              <span className="font-medium">^C — Execution cancelled. Interrupt signal sent.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveDebugCycleItem;