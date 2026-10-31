import React, { useState, useEffect } from 'react';
import { Bug, ChevronUp, ChevronDown } from 'lucide-react';

export const SuggestedFixBlock = ({ text, className = "", isLast = true }) => {
  const [fixExpanded, setFixExpanded] = useState(isLast);
  useEffect(() => { setFixExpanded(isLast); }, [isLast]);

  return (
    <div className={`p-3 rounded-lg border theme-suggested-fix text-xs shadow-md ${className}`}>
      <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setFixExpanded(!fixExpanded)}>
        <div className="flex items-center gap-2 font-semibold text-[10px] opacity-80 uppercase tracking-wider">
          <Bug className="w-3.5 h-3.5 debug-icon" /> Suggested Fix
        </div>
        {fixExpanded ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
      </div>
      {fixExpanded && (
        <div className="mt-2 pt-2 border-t border-inherit whitespace-pre-wrap leading-relaxed text-xs animate-in fade-in duration-200">
          {text}
        </div>
      )}
    </div>
  );
};

export default SuggestedFixBlock;