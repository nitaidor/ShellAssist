import React, { useState, useEffect } from 'react';
import { Code, Check, Copy, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { getExtension } from '../../utils/platform';
import RunActionButton from '../common/RunActionButton';

export const DebugCodeBlock = ({ code, ctx, settings, onErrorOutput, isLast = true }) => {
  const [copied, setCopied] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(isLast);
  useEffect(() => { setCodeExpanded(isLast); }, [isLast]);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(code);
      else throw new Error();
    } catch (err) {
      const t = document.createElement("textarea");
      t.value = code;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch(ex){}
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const ext = ctx ? getExtension(ctx.shell) : '.txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden mt-3 debug-code-block shadow-md">
      <div
        onClick={() => setCodeExpanded(!codeExpanded)}
        className={`flex justify-between items-center bg-[#21262d] px-3 py-2 cursor-pointer select-none debug-code-header flex-wrap gap-2 ${codeExpanded ? 'border-b border-[#30363d]' : ''}`}
      >
        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5 debug-icon" /> Suggested Code
        </span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCopy}
            className={`${copied ? 'bg-green-600 text-white border-green-500' : 'bg-[#21262d] hover:bg-[#30363d] text-gray-200 border-[#30363d]'} border px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 shadow-sm transition-all text-xs`}
          >
            {copied ? <Check className="w-3.5 h-3.5"/> : <Copy className="w-3.5 h-3.5"/>} Copy
          </button>
          {ctx?.type === 'Script' && (
            <button
              onClick={handleDownload}
              className="bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 shadow-sm transition-all text-xs"
            >
              <Download className="w-3.5 h-3.5"/> Download
            </button>
          )}
          {(!ctx || ctx?.type === 'Command') && (
            <RunActionButton command={code} ctx={ctx} settings={settings} onErrorOutput={onErrorOutput} size="sm" />
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
          {code}
        </div>
      )}
    </div>
  );
};

export default DebugCodeBlock;