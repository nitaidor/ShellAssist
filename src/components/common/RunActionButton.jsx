import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertCircle, X, Terminal, Loader2, Copy, TerminalSquare, Ban } from 'lucide-react';
import { executeTerminalCommand } from '../../services/terminal';
import { checkRequiresElevation } from '../../utils/platform';
import ContextTags from './ContextTags';

export const RunActionButton = ({ command, ctx, settings, onErrorOutput, size = 'md', requiresElevation = false }) => {
  const [runState, setRunState] = useState('idle');
  const [outputModalData, setOutputModalData] = useState(null);
  const [modalCopied, setModalCopied] = useState(false);
  const runCancelRef = useRef(0);

  // Lock background page scrolling while the Terminal Output modal is open
  useEffect(() => {
    if (outputModalData) {
      document.documentElement.classList.add('modal-open');
    } else {
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.documentElement.classList.remove('modal-open');
    };
  }, [outputModalData]);

  // WebView check: True real bridge requires desktop environment (Electron)
  const isDesktop = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.runCommand === 'function';
  const isWebViewRestricted = !isDesktop;

  const needsAdmin = Boolean(requiresElevation || checkRequiresElevation(command));
  const isButtonDisabled = !settings?.enableExecution || isWebViewRestricted || runState === 'running';

  const getButtonTitle = () => {
    if (!settings?.enableExecution) return "Enable Terminal Integration in Settings";
    if (isWebViewRestricted) return "Local terminal execution requires the desktop application (use the Simulated Terminal tab to test commands in a browser)";
    if (needsAdmin) return "Execute command as Administrator (triggers OS UAC prompt)";
    return "Execute command in terminal";
  };

  const handleRun = async (e) => {
    e.stopPropagation();
    if (isButtonDisabled) return;

    const currentRunId = ++runCancelRef.current;
    setRunState('running');

    const res = await executeTerminalCommand(command, ctx, settings, "", needsAdmin);
    if (runCancelRef.current !== currentRunId) return;

    if (res.status === 'success') {
      setRunState('success');
      if (res.output && res.output.trim()) {
        setOutputModalData({
          command,
          output: res.output,
          message: res.message || 'Ran successfully.',
          status: 'success'
        });
      }
    } else if (res.status === 'error') {
      setRunState('error');
      if (onErrorOutput) onErrorOutput(res.output || `> ${command}\n${res.message}`);
      if (res.output && res.output.trim()) {
        setOutputModalData({
          command,
          output: res.output,
          message: res.message || 'Command returned a non-zero exit code.',
          status: 'error'
        });
      }
    } else {
      setRunState('failed');
    }
    setTimeout(() => {
      if (runCancelRef.current === currentRunId) setRunState('idle');
    }, 3500);
  };

  const handleCancelRun = (e) => {
    e.stopPropagation();
    runCancelRef.current++;
    setRunState('cancelled');
    setTimeout(() => setRunState('idle'), 2500);
  };

  const handleCopyModalOutput = async (e) => {
    e.stopPropagation();
    if (!outputModalData?.output) return;
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(outputModalData.output);
    } catch {
      const t = document.createElement("textarea");
      t.value = outputModalData.output;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch(ex){}
      document.body.removeChild(t);
    }
    setModalCopied(true);
    setTimeout(() => setModalCopied(false), 2000);
  };

  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs gap-1.5' : 'px-4 py-1.5 text-sm gap-2';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  let stateStyle = (!settings?.enableExecution || isWebViewRestricted)
    ? 'bg-[#21262d] opacity-50 cursor-not-allowed border border-[#30363d] text-gray-400'
    : 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent';

  if (runState === 'success') stateStyle = 'btn-run-success bg-green-600 hover:bg-green-700 border-green-500 text-white';
  else if (runState === 'error') stateStyle = 'btn-run-error bg-red-600 hover:bg-red-700 border-red-500 text-white';
  else if (runState === 'failed') stateStyle = 'btn-run-failed bg-gray-700 border-red-500/60 text-red-300';
  else if (runState === 'cancelled') stateStyle = 'btn-run-cancelled bg-[#21262d] border-[#30363d] text-yellow-400';

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleRun}
          disabled={isButtonDisabled}
          title={getButtonTitle()}
          className={`${stateStyle} ${sizeClasses} rounded-md font-medium flex items-center shadow-sm transition-all`}
        >
          {runState === 'running' ? (
            <><Loader2 className={`${iconSize} animate-spin`} /> Running...</>
          ) : runState === 'success' ? (
            <><Check className={iconSize} /> Success</>
          ) : runState === 'error' ? (
            <><AlertCircle className={iconSize} /> Error</>
          ) : runState === 'failed' ? (
            <><X className={iconSize} /> Failed</>
          ) : runState === 'cancelled' ? (
            <><Ban className={`${iconSize} btn-cancel-icon`} /> Cancelled</>
          ) : (
            <><Terminal className={iconSize} /> {needsAdmin ? 'Run (Admin)' : 'Run'}</>
          )}
        </button>

        {runState === 'running' && (
          <button
            type="button"
            onClick={handleCancelRun}
            title="Cancel running command (^C)"
            className={`${sizeClasses} btn-cancel-action rounded-md font-mono font-medium flex items-center shadow-sm transition-all`}
          >
            <Ban className={`${iconSize} btn-cancel-icon`} /> Cancel (^C)
          </button>
        )}
      </div>

      {outputModalData && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => { e.stopPropagation(); setOutputModalData(null); }}
        >
          <div
            className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d] bg-[#0d1117]">
              <div className="flex items-center gap-2.5">
                <TerminalSquare className="w-5 h-5 header-logo shrink-0" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Terminal Output
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyModalOutput}
                  className="px-2.5 py-1 btn-modal-action rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {modalCopied ? <Check className="w-3.5 h-3.5 theme-copy-check" /> : <Copy className="w-3.5 h-3.5" />}
                  {modalCopied ? 'Copied' : 'Copy Output'}
                </button>
                <button
                  type="button"
                  onClick={() => setOutputModalData(null)}
                  aria-label="Close modal"
                  className="modal-close-btn p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">
                  Command Executed ({ctx?.shell || 'Shell'})
                </span>
                <div className="bg-[#0d1117] p-2.5 rounded-md border border-[#30363d] font-mono text-xs text-gray-200">
                  <span className="theme-prompt-arrow mr-2">&gt;</span>{outputModalData.command}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">
                  Standard Output
                </span>
                <pre className="p-4 bg-[#0d1117] text-gray-300 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-[45vh] rounded-md border border-[#30363d]">
                  {outputModalData.output}
                </pre>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#30363d] flex justify-between items-center bg-[#0d1117]">
              {ctx && <ContextTags ctx={ctx} className="" />}
              <button
                type="button"
                onClick={() => setOutputModalData(null)}
                className="px-4 py-1.5 btn-modal-action rounded text-xs font-medium"
              >
                Close Output
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default RunActionButton;