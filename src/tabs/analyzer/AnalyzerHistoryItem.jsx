import React, { useState } from 'react';
import { Code, ChevronUp, ChevronDown } from 'lucide-react';
import ContextTags from '../../components/common/ContextTags';
import InteractiveCommand from '../../components/terminal/InteractiveCommand';
import { formatSessionDate } from '../../utils/platform';

export const AnalyzerHistoryItem = ({ session, settings }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-md transition-all">
      <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className="bg-green-500/10 text-green-400 p-2 rounded-lg shadow-sm analyzer-icon-bg">
            <Code className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{session.turn.summary}</p>
            <span className="text-xs text-gray-500 font-mono">
              {formatSessionDate(session.unixTime || session.timestamp, settings?.clockFormat)}
            </span>
          </div>
        </div>
        <div className="text-gray-500 group-hover:text-gray-300">
          {isExpanded ? <ChevronUp className="w-5 h-5 opacity-75" /> : <ChevronDown className="w-5 h-5 opacity-75" />}
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 border border-[#30363d] rounded-xl overflow-hidden bg-[#161b22] animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-[#30363d]">
            <ContextTags ctx={session.ctx} className="" />
          </div>
          <InteractiveCommand
            tokens={session.turn.tokens || []}
            hasAlternative={session.turn.hasAlternative}
            alternativeText={session.turn.alternativeText}
            riskLevel={session.turn.riskLevel}
            riskExplanation={session.turn.riskExplanation}
            overallExplanation={session.turn.overallExplanation}
            runCtx={session.ctx}
            settings={settings}
          />
        </div>
      )}
    </div>
  );
};

export default AnalyzerHistoryItem;