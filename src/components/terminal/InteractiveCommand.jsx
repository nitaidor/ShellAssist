import React, { useState } from 'react';
import { Info, ChevronUp, ChevronDown, ShieldAlert, Lightbulb, Download, Copy, Check } from 'lucide-react';
import { getExtension, checkRequiresElevation } from '../../utils/platform';
import RunActionButton from '../common/RunActionButton';

export const ensureTokenSpacing = (tokens = [], rawCommand = '') => {
  if (!tokens || tokens.length === 0) {
    if (!rawCommand) return [];
    return rawCommand.split(/(\s+)/).filter(Boolean).map(part => ({
      text: part,
      explanation: `Part of ${rawCommand.trim().split(' ')[0]} command`,
      context: part
    }));
  }

  const repaired = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    repaired.push(cur);

    if (i < tokens.length - 1) {
      const next = tokens[i + 1];
      const curEndsWithSpace = /\s$/.test(cur.text);
      const nextStartsWithSpace = /^\s/.test(next.text);
      const curIsOperator = /^[|&;><]$/.test(cur.text.trim());
      const nextIsOperator = /^[|&;><]$/.test(next.text.trim());

      if (!curEndsWithSpace && !nextStartsWithSpace) {
        if (curIsOperator || nextIsOperator || !next.text.startsWith(',')) {
          repaired.push({ text: ' ', explanation: 'Command argument separator', context: 'Syntax' });
        }
      }
    }
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
  runCtx,
  settings,
  onErrorOutput,
  collapsibleInspector = false,
  defaultInspectorExpanded = true,
  customRunButton = null,
  hideRunButton = false
}) => {
  const [hoveredToken, setHoveredToken] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAlternative, setShowAlternative] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [inspectorExpanded, setInspectorExpanded] = useState(defaultInspectorExpanded);

  const formattedTokens = ensureTokenSpacing(tokens, command);
  const fullCommand = command || formattedTokens.map(t => t.text).join('');
  const needsAdmin = Boolean(requiresElevation || checkRequiresElevation(fullCommand));

  // Prepend elevation notice to the beginning of the risk level description if command requires admin privileges
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
      <div className="bg-[#0d1117] p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap relative group cursor-crosshair break-words overflow-x-auto border-b border-[#30363d]">
        {formattedTokens.map((token, idx) => {
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
          <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 panel-inspector-title">
            <Info className="w-3.5 h-3.5 token-inspector-icon" /> Token Inspector (Hover over command to inspect)
          </span>
          <div className="flex items-center gap-1 text-[11px]">
            {inspectorExpanded ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
          </div>
        </div>
      )}
      {(!collapsibleInspector || inspectorExpanded) && (
        <div className="h-32 bg-[#161b22] p-4 border-b border-[#30363d] overflow-y-auto panel-bg animate-in fade-in duration-150">
          {hoveredToken ? (
            <div className="animate-in fade-in duration-200">
              <h4 className="text-xs font-bold panel-inspector-title uppercase tracking-wider mb-2">Token Inspector</h4>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <span className="text-[10px] text-gray-500 uppercase">What it does:</span>
                  <p className="text-sm text-gray-300 mt-1">{hoveredToken.explanation}</p>
                </div>
                <div className="w-1/2 border-l border-[#30363d] pl-4">
                  <span className="text-[10px] text-gray-500 uppercase">Context:</span>
                  <p className="text-sm text-gray-300 mt-1">{hoveredToken.context}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
              <Info className="w-5 h-5 token-inspector-icon opacity-50" />
              <p className="text-sm">Hover over any part of the command above to see its explanation.</p>
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
    </div>
  );
};

export default InteractiveCommand;