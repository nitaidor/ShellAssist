import React, { useState, useEffect } from 'react';
import { TerminalSquare, ChevronUp, ChevronDown } from 'lucide-react';
import DebugCodeBlock from './DebugCodeBlock';
import SuggestedFixBlock from './SuggestedFixBlock';

export const DebugMessage = ({ msg, isLast, ctx, settings, onErrorOutput }) => {
  const [expanded, setExpanded] = useState(isLast);
  useEffect(() => { setExpanded(isLast); }, [isLast]);

  if (msg.role === 'user') {
    return (
      <div className="p-3 rounded-lg border border-[#30363d] bg-[#0d1117] text-gray-300 text-xs shadow-md">
        <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 font-semibold text-[10px] opacity-75 uppercase tracking-wider">
            <TerminalSquare className="w-3.5 h-3.5" /> Terminal Output
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
        </div>
        {expanded && (
          <div className="mt-2 pt-2 border-t border-[#30363d] animate-in fade-in duration-200">
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-gray-300 overflow-x-auto">{msg.text}</pre>
          </div>
        )}
      </div>
    );
  }

  // Regex allows language specifiers with modifiers like ```powershell:admin
  const parts = msg.text.split(/(\`\`\`[^\n`]*\n[\s\S]*?\n\`\`\`|\`\`\`[\s\S]*?\`\`\`)/g).filter(p => p.trim());
  
  const codeBlocks = parts.filter(p => p.startsWith('```'));
  const anyTaggedAdmin = codeBlocks.some(p => {
    const m = p.match(/^```([^\n`]*)\n?/);
    return m && (m[1].toLowerCase().includes(':admin') || m[1].toLowerCase().includes('admin'));
  });

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const fenceMatch = part.match(/^```([^\n`]*)\n?/);
          const fenceHeader = fenceMatch ? fenceMatch[1].toLowerCase() : '';
          const isThisBlockTagged = fenceHeader.includes(':admin') || fenceHeader.includes('admin');
          
          // If the AI specifically tagged blocks with :admin, respect individual tags.
          // Otherwise, fall back to the message's overall requiresElevation.
          const requiresElevation = anyTaggedAdmin 
            ? isThisBlockTagged 
            : Boolean(msg.requiresElevation);

          const code = part.replace(/^```[^\n`]*\n?/, '').replace(/\n?```$/, '').trim();
          return (
            <DebugCodeBlock
              key={i}
              code={code}
              ctx={ctx}
              settings={settings}
              onErrorOutput={onErrorOutput}
              isLast={isLast}
              requiresElevation={requiresElevation}
            />
          );
        }
        return <SuggestedFixBlock key={i} text={part.trim()} className={i > 0 ? "mt-3" : ""} isLast={isLast} />;
      })}
    </>
  );
};

export default DebugMessage;