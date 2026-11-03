import React, { useState, useEffect, useRef } from 'react';
import { Info, ChevronUp, ChevronDown, ShieldAlert, Lightbulb, Download, Copy, Check, Sparkles, Loader2, Ban } from 'lucide-react';
import { getExtension, checkRequiresElevation } from '../../utils/platform';
import RunActionButton from '../common/RunActionButton';
import { DeepTokenBreakdownModal } from '../modals/ConfirmationModals';
import { fetchDeepTokenBreakdown } from '../../services/gemini';

const DEEP_TOKENS_STORAGE_KEY = 'ShellAssist_DeepTokens';

const loadCachedDeepTokens = (cmd) => {
  if (!cmd || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEEP_TOKENS_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[cmd.trim()] || null;
  } catch {
    return null;
  }
};

const saveCachedDeepTokens = (cmd, tokensList) => {
  if (!cmd || !Array.isArray(tokensList) || typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(DEEP_TOKENS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[cmd.trim()] = tokensList;
    window.localStorage.setItem(DEEP_TOKENS_STORAGE_KEY, JSON.stringify(map));
  } catch {}
};

export const ensureTokenSpacing = (tokens = [], rawCommand = '') => {
  const cleanCmd = (rawCommand || '').trim();

  // If no tokens provided at all, preserve the exact code with newlines and indentation
  if (!tokens || tokens.length === 0) {
    if (!cleanCmd) return [];
    return cleanCmd.split(/(\r?\n|[ \t]+)/).filter(Boolean).map(part => ({
      text: part,
      isWhitespace: /^(\r?\n|[ \t]+)$/.test(part),
      explanation: 'N/A',
      context: 'N/A'
    }));
  }

  // 1. Walk the real AI tokens and preserve newlines/indentation exactly as in rawCommand
  const repaired = [];
  let cmdCursor = 0;

  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    // Skip empty or pure-whitespace/newline tokens so indentation is never hoverable
    if (!cur || !cur.text || !cur.text.trim()) continue;

    const tokenText = cur.text.trim();
    const foundIdx = cleanCmd.indexOf(tokenText, cmdCursor);

    // If the token does not exist at or after cmdCursor, skip it to prevent desyncing cmdCursor
    if (foundIdx === -1) {
      continue;
    }

    // If there is intermediate text (whitespace, comments, or unannotated code) between cursor and found token, preserve 100% of it
    if (foundIdx > cmdCursor) {
      const intermediate = cleanCmd.substring(cmdCursor, foundIdx);
      const intermediateParts = intermediate.split(/(\r?\n|[ \t]+)/).filter(Boolean);
      for (const part of intermediateParts) {
        const isWs = /^(\r?\n|[ \t]+)$/.test(part);
        repaired.push({
          text: part,
          isWhitespace: isWs,
          explanation: isWs ? undefined : 'N/A',
          context: isWs ? undefined : 'N/A'
        });
      }
      cmdCursor = foundIdx;
    }

    repaired.push({
      ...cur,
      text: tokenText,
      isWhitespace: false
    });

    cmdCursor = foundIdx + tokenText.length;
  }

  // 2. If any remaining tail exists after the last matched token, preserve 100% of it
  if (cmdCursor < cleanCmd.length) {
    const remainingTail = cleanCmd.substring(cmdCursor);
    const tailParts = remainingTail.split(/(\r?\n|[ \t]+)/).filter(Boolean);
    tailParts.forEach(tp => {
      const isWs = /^(\r?\n|[ \t]+)$/.test(tp);
      repaired.push({
        text: tp,
        isWhitespace: isWs,
        explanation: isWs ? undefined : 'N/A',
        context: isWs ? undefined : 'N/A'
      });
    });
  }

  return repaired;
};

export const InteractiveCommand = ({
  tokens = [],
  command = '',
  hasAlternative,
  alternativeText,
  riskLevel,
  riskExplanation,
  overallExplanation,
  requiresElevation = false,
  deepBreakdownComplete = false,
  onUpdateTokens = null,
  runCtx,
  settings,
  onErrorOutput,
  collapsibleInspector = false,
  defaultInspectorExpanded = true,
  customRunButton = null,
  hideRunButton = false
}) => {
  const cachedTokens = loadCachedDeepTokens(command);
  const [currentTokens, setCurrentTokens] = useState(() => cachedTokens || tokens);
  const [hoveredToken, setHoveredToken] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAlternative, setShowAlternative] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [inspectorExpanded, setInspectorExpanded] = useState(defaultInspectorExpanded);

  // Deep token breakdown state + cancellation ref
  const [showDeepModal, setShowDeepModal] = useState(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [hasCompletedDeepAnalysis, setHasCompletedDeepAnalysis] = useState(() => Boolean(deepBreakdownComplete || cachedTokens));
  const deepCancelRef = useRef(0);

  useEffect(() => {
    const saved = loadCachedDeepTokens(command);
    if (saved) {
      setCurrentTokens(saved);
      setHasCompletedDeepAnalysis(true);
    } else {
      setCurrentTokens(tokens);
      setHasCompletedDeepAnalysis(Boolean(deepBreakdownComplete));
    }
  }, [command, tokens, deepBreakdownComplete]);

  const cleanCmd = (command || '').trim();
  const formattedTokens = ensureTokenSpacing(currentTokens, command);

  // Show "Full Breakdown Available" if any non-whitespace tokens are 'N/A' and deep analysis hasn't been completed yet
  const hasUnannotatedTokens = formattedTokens.some(t => !t.isWhitespace && t.explanation === 'N/A');
  const isTruncated = !hasCompletedDeepAnalysis && hasUnannotatedTokens;

  const fullCommand = command || formattedTokens.map(t => t.text).join('');
  const needsAdmin = Boolean(requiresElevation || checkRequiresElevation(fullCommand));

  const finalRiskExplanation = (() => {
    const baseText = (riskExplanation || '').trim();
    if (!needsAdmin) return baseText;
    const prefix = 'Requires Administrator Privileges: Running this command will trigger an OS-level elevation prompt (Run as Administrator / sudo).';
    if (baseText.toLowerCase().includes('requires administrator privileges')) return baseText;
    return baseText ? `${prefix}\n\n${baseText}` : prefix;
  })();

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(fullCommand);
      else throw new Error();
    } catch {
      const t = document.createElement("textarea");
      t.value = fullCommand;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch(ex){}
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = runCtx ? getExtension(runCtx.shell) : '.txt';
    const blob = new Blob([fullCommand], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunDeepAnalysis = async () => {
    if (!cleanCmd || isDeepAnalyzing) return;
    const reqId = ++deepCancelRef.current;
    setIsDeepAnalyzing(true);
    setShowDeepModal(false);

    try {
      const deepTokens = await fetchDeepTokenBreakdown(cleanCmd, runCtx, settings);
      if (deepCancelRef.current !== reqId) return;

      if (Array.isArray(deepTokens) && deepTokens.length > 0) {
        setCurrentTokens(deepTokens);
        setHasCompletedDeepAnalysis(true);
        saveCachedDeepTokens(cleanCmd, deepTokens);
        if (onUpdateTokens) {
          onUpdateTokens(deepTokens);
        }
      }
    } catch (e) {
      console.warn("Failed to complete deep token breakdown:", e);
    } finally {
      if (deepCancelRef.current === reqId) {
        setIsDeepAnalyzing(false);
      }
    }
  };

  const handleCancelDeepAnalysis = () => {
    deepCancelRef.current++;
    setIsDeepAnalyzing(false);
  };

  const isHighOrCritical = (level) => {
    const l = (level || '').toLowerCase();
    return l.includes('high') || l.includes('critical') || l.includes('severe') || l.includes('danger');
  };

  const isMedium = (level) => {
    const l = (level || '').toLowerCase();
    return l.includes('med') || l.includes('warn') || l.includes('moderat');
  };

  const getRiskColor = (level, isActive) => {
    if (!isActive) {
      if (isHighOrCritical(level)) return 'bg-[#21262d] text-red-400 border-[#30363d] hover:bg-[#30363d] risk-btn-high';
      if (isMedium(level)) return 'bg-[#21262d] text-yellow-400 border-[#30363d] hover:bg-[#30363d] risk-btn-med';
      return 'bg-[#21262d] text-green-400 border-[#30363d] hover:bg-[#30363d] risk-btn-low'; 
    }
    if (isHighOrCritical(level)) return 'risk-active-high border';
    if (isMedium(level)) return 'risk-active-med border';
    return 'risk-active-low border'; 
  };

  const getRiskPanelClass = (level) => {
    if (isHighOrCritical(level)) return 'info-panel-risk-high';
    if (isMedium(level)) return 'info-panel-risk-med';
    return 'info-panel-risk-low';
  };

  return (
    <div className="flex flex-col bg-[#161b22] w-full panel-bg">
      {/* Code Box: Fits exact height for < 12 lines, scrolls smoothly at 12 lines (~19.5rem) */}
      <div className="bg-[#0d1117] p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap relative group cursor-crosshair break-words overflow-x-auto max-h-[19.5rem] overflow-y-auto border-b border-[#30363d]">
        {formattedTokens.map((token, idx) => {
          if (token.isWhitespace) {
            return <span key={idx}>{token.text}</span>;
          }

          const isHovered = hoveredIdx === idx;
          return (
            <span
              key={idx}
              onMouseEnter={() => { setHoveredToken(token); setHoveredIdx(idx); }}
              onMouseLeave={() => { setHoveredToken(null); setHoveredIdx(null); }}
              className={`token-span cursor-help ${isHovered ? 'token-span-active' : ''}`}
            >
              {token.text}
            </span>
          );
        })}
      </div>
      {overallExplanation && (
        <div className="bg-[#1c2128] border-b border-[#30363d] p-4 text-sm text-gray-300 panel-explanation">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 token-inspector-icon"/> Code Explanation
          </h4>
          <p className="leading-relaxed break-words">{overallExplanation}</p>
        </div>
      )}
      {collapsibleInspector && (
        <div
          onClick={() => setInspectorExpanded(!inspectorExpanded)}
          className="px-4 py-2 bg-[#161b22] hover:bg-[#1c2128] border-b border-[#30363d] flex items-center justify-between cursor-pointer select-none text-xs text-gray-400 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 panel-inspector-title">
              <Info className="w-3.5 h-3.5 token-inspector-icon" /> Token Inspector (Hover over command to inspect)
            </span>
            {isTruncated && !isDeepAnalyzing && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDeepModal(true); }}
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider btn-deep-token-badge flex items-center gap-1"
                title="Only the start of this script was annotated. Click to generate full deep breakdown."
              >
                <Sparkles className="w-2.5 h-2.5" /> Full Breakdown Available
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {inspectorExpanded ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
          </div>
        </div>
      )}
      {(!collapsibleInspector || inspectorExpanded) && (
        /* Anchored stable height (min-h-[8.5rem]), smoothly expands downward only if an explanation is exceptionally long */
        <div className="min-h-[8.5rem] h-auto bg-[#161b22] p-4 border-b border-[#30363d] panel-bg flex flex-col justify-center animate-in fade-in duration-150">
          {isDeepAnalyzing ? (
            <div className="py-4 flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin theme-spinner" />
                <p className="text-xs font-mono">Annotating full script line-by-line...</p>
              </div>
              <button
                type="button"
                onClick={handleCancelDeepAnalysis}
                className="btn-cancel-action px-3 py-1 rounded-md font-mono font-medium flex items-center gap-1.5 shadow-sm transition-all text-xs"
                title="Cancel deep breakdown"
              >
                <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
              </button>
            </div>
          ) : hoveredToken ? (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold panel-inspector-title uppercase tracking-wider">Token Inspector</h4>
                {isTruncated && (
                  <button
                    type="button"
                    onClick={() => setShowDeepModal(true)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider btn-deep-token-badge flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Full Breakdown Available
                  </button>
                )}
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <span className="text-[10px] text-gray-500 uppercase">What it does:</span>
                  <p className="text-sm text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap break-words">{hoveredToken.explanation}</p>
                </div>
                <div className="w-1/2 border-l border-[#30363d] pl-4">
                  <span className="text-[10px] text-gray-500 uppercase">Context:</span>
                  <p className="text-sm text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap break-words">{hoveredToken.context}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 token-inspector-icon opacity-50" />
                <p className="text-sm">Hover over any part of the command above to see its explanation.</p>
              </div>
              {isTruncated && (
                <button
                  type="button"
                  onClick={() => setShowDeepModal(true)}
                  className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider btn-deep-token-badge flex items-center gap-1.5 mt-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Full Breakdown Available for this Script
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="p-3 action-bar-bg flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2">
          {riskLevel && (
            <button
              onClick={() => { setShowRisk(!showRisk); setShowAlternative(false); }}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all text-xs border ${getRiskColor(riskLevel, showRisk)}`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> {riskLevel}
            </button>
          )}
          <button
            disabled={!hasAlternative}
            onClick={() => { setShowAlternative(!showAlternative); setShowRisk(false); }}
            title={!hasAlternative ? "No alternative method found" : ""}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all text-xs ${hasAlternative ? (showAlternative ? 'alt-active border' : 'bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300') : 'bg-[#21262d] opacity-50 cursor-not-allowed border border-[#30363d] text-gray-500'}`}
          >
            <Lightbulb className="w-3.5 h-3.5" /> {showAlternative ? 'Hide Alternative' : 'View Alternative'}
          </button>
        </div>
        <div className="flex gap-2">
          {runCtx?.type === 'Script' && (
            <button
              onClick={handleDownload}
              className="bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-200 px-4 py-1.5 rounded-md font-medium flex items-center gap-2 shadow-sm text-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`${copied ? 'btn-copied-state' : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'} border px-4 py-1.5 rounded-md font-medium flex items-center gap-2 shadow-sm text-sm transition-colors`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy
          </button>
          {customRunButton ? customRunButton : (!hideRunButton && runCtx?.type === 'Command' && (
            <RunActionButton
              command={fullCommand}
              ctx={runCtx}
              settings={settings}
              onErrorOutput={onErrorOutput}
              requiresElevation={needsAdmin}
            />
          ))}
        </div>
      </div>
      {showRisk && riskLevel && (
        <div className={`p-4 border-t border-[#30363d] text-sm animate-in slide-in-from-top-2 duration-200 ${getRiskPanelClass(riskLevel)}`}>
          <h4 className="font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-xs">
            <ShieldAlert className="w-4 h-4" /> Risk Assessment
          </h4>
          <p className="whitespace-pre-wrap leading-relaxed">{finalRiskExplanation}</p>
        </div>
      )}
      {showAlternative && hasAlternative && (
        <div className="p-4 border-t border-[#30363d] text-sm animate-in slide-in-from-top-2 duration-200 info-panel-alt">
          <h4 className="font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-xs">
            <Lightbulb className="w-4 h-4" /> Alternative Method / GUI Options
          </h4>
          <p className="whitespace-pre-wrap leading-relaxed font-mono">{alternativeText}</p>
        </div>
      )}

      {/* Deep Token Breakdown Confirmation Modal */}
      <DeepTokenBreakdownModal
        isOpen={showDeepModal}
        isLoading={isDeepAnalyzing}
        onClose={() => setShowDeepModal(false)}
        onConfirmDeepAnalysis={handleRunDeepAnalysis}
      />
    </div>
  );
};

export default InteractiveCommand;