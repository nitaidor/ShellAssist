import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, X, Ban } from 'lucide-react';
import DebugMessage from '../../components/terminal/DebugMessage';
import { fetchCommandDebug } from '../../services/gemini';

export const CommandDebugger = ({
  prompt,
  command,
  initialThread = [],
  onThreadUpdate,
  ctx,
  settings,
  externalErrorInput,
  onClearExternalError
}) => {
  const [errorInput, setErrorInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debugError, setDebugError] = useState(null);
  const [debugThread, setDebugThread] = useState(initialThread);

  const cancelCommandDebugRef = useRef(0);

  useEffect(() => {
    if (externalErrorInput) {
      setErrorInput(externalErrorInput);
      if (onClearExternalError) onClearExternalError();
    }
  }, [externalErrorInput, onClearExternalError]);

  const handleCancelDebug = () => {
    cancelCommandDebugRef.current++;
    setIsAnalyzing(false);
  };

  const analyzeError = async () => {
    if (!errorInput.trim() || isAnalyzing) return;
    const currentInput = errorInput;
    const debugId = ++cancelCommandDebugRef.current;
    
    setIsAnalyzing(true);
    setDebugError(null);
    setErrorInput(''); 

    try {
      const debugRes = await fetchCommandDebug(prompt, command, debugThread, currentInput, ctx, settings);
      if (cancelCommandDebugRef.current !== debugId) return;

      const responseText = typeof debugRes === 'object' && debugRes !== null ? debugRes.analysis : debugRes;
      const requiresElevation = typeof debugRes === 'object' && debugRes !== null ? Boolean(debugRes.requiresElevation) : false;

      const newThread = [
        ...debugThread,
        { role: "user", text: currentInput },
        { role: "model", text: responseText, requiresElevation }
      ];
      setDebugThread(newThread);
      if (onThreadUpdate) onThreadUpdate(newThread);
    } catch (err) {
      if (cancelCommandDebugRef.current !== debugId) return;
      setDebugError(err.message || "Failed connection to AI provider. Please verify your API key in Settings.");
      setErrorInput(currentInput);
    } finally {
      if (cancelCommandDebugRef.current === debugId) {
        setIsAnalyzing(false);
      }
    }
  };

  const rounds = [];
  let currentRound = [];
  for (let i = 0; i < debugThread.length; i++) {
    const msg = debugThread[i];
    if (msg.role === 'user' && currentRound.length > 0) {
      rounds.push(currentRound);
      currentRound = [];
    }
    currentRound.push({ msg, globalIdx: i });
  }
  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }

  return (
    <div className="flex flex-col w-full">
      {rounds.length > 0 && (
        <div className="space-y-4 mb-4">
          {rounds.map((round, rIdx) => (
            <div key={rIdx} className="space-y-3 border-l-2 border-[#30363d] pl-4">
              {round.map(({ msg, globalIdx }) => (
                <DebugMessage
                  key={globalIdx}
                  msg={msg}
                  isLast={globalIdx === debugThread.length - 1}
                  ctx={ctx}
                  settings={settings}
                  onErrorOutput={(errText) => setErrorInput(errText)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {debugError && (
        <div className="mb-3 theme-error-banner rounded-xl p-3.5 text-xs shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-mono leading-relaxed error-msg">{debugError}</p>
          </div>
          <button
            onClick={() => setDebugError(null)}
            className="p-1 hover:opacity-80 transition-opacity"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Loading Spinner with Cancel Button */}
      {isAnalyzing ? (
        <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-6 flex flex-col items-center justify-center text-gray-400 shadow-md gap-3">
          <Loader2 className="w-8 h-8 animate-spin icon-debugger" />
          <button
            type="button"
            onClick={handleCancelDebug}
            className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <textarea
            value={errorInput}
            onChange={(e) => setErrorInput(e.target.value)}
            placeholder={`e.g., Paste the error output from your ${ctx?.shell || 'terminal'} here to continue...`}
            className="flex-1 h-12 bg-[#0d1117] border border-[#30363d] focus:border-red-500 rounded-md p-3 text-xs font-mono text-gray-300 focus:outline-none resize-y shadow-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                analyzeError();
              }
            }}
          />
          <button
            onClick={analyzeError}
            disabled={!errorInput.trim() || isAnalyzing}
            className="px-6 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 border border-[#30363d] text-white rounded-md text-sm font-medium h-12 flex items-center justify-center gap-2 shrink-0 min-w-[120px] shadow-sm"
          >
            <AlertCircle className="w-4 h-4 icon-debugger" /> Analyze
          </button>
        </div>
      )}
    </div>
  );
};

export default CommandDebugger;