import React, { useState, useEffect } from 'react';
import { Cpu, ChevronUp, ChevronDown, TerminalSquare } from 'lucide-react';
import ContextTags from '../../components/common/ContextTags';
import InteractiveTurnCard from '../interactive/InteractiveTurnCard';
import { formatSessionDate, formatTranscriptTimestamps } from '../../utils/platform';

export const SimulatedHistoryItem = ({ session, settings }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true);

  useEffect(() => {
    if (isExpanded) setIsTranscriptExpanded(true);
  }, [isExpanded]);

  const displayCtx = session.ctx
    ? {
        ...session.ctx,
        os: String(session.ctx.os).toLowerCase().includes('(simulated)')
          ? session.ctx.os
          : `${session.ctx.os} (Simulated)`,
        shell: session.ctx.isElevated && !String(session.ctx.shell).toLowerCase().includes('(elevated)')
          ? `${session.ctx.shell} (Elevated)`
          : session.ctx.shell
      }
    : null;

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-md transition-all">
      <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className="bg-sky-500/10 text-sky-400 p-2 rounded-lg shadow-sm">
            <Cpu className="w-4 h-4 icon-simulated" />
          </div>
          <div>
            <p className="text-sm font-medium text-white font-mono">
              {formatSessionDate(session.unixTime || session.dateTime, settings?.clockFormat)}
            </p>
            <span className="text-xs text-gray-500">{displayCtx?.os} • {displayCtx?.shell} (Closed Session)</span>
          </div>
        </div>
        <div className="text-gray-500 group-hover:text-gray-300">
          {isExpanded ? <ChevronUp className="w-5 h-5 opacity-75" /> : <ChevronDown className="w-5 h-5 opacity-75" />}
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 flex flex-col gap-4 animate-in fade-in duration-200 pt-4 border-t border-[#30363d]">
          <ContextTags ctx={displayCtx} hideType={true} className="" />
          <div className="space-y-4">
            {session.turns.map((turn, idx) => (
              <InteractiveTurnCard
                key={turn.id || idx}
                turn={turn}
                index={idx}
                isLast={false}
                ctx={displayCtx}
                settings={settings}
                isReadOnly={true}
              />
            ))}
          </div>
          <div className="mt-2 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-md">
            <div
              onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
              className={`bg-[#21262d] px-4 py-2.5 flex items-center justify-between cursor-pointer select-none ${isTranscriptExpanded ? 'border-b border-[#30363d]' : ''}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <TerminalSquare className="w-3.5 h-3.5 icon-simulated" /> Full Session Terminal Output (Simulated)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 font-mono">Session Closed</span>
                {isTranscriptExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 opacity-75" /> : <ChevronDown className="w-4 h-4 text-gray-400 opacity-75" />}
              </div>
            </div>
            {isTranscriptExpanded && (
              <pre className="p-4 bg-[#0d1117] text-gray-300 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-80 animate-in fade-in duration-150">
                {formatTranscriptTimestamps(session.fullTranscript, settings?.clockFormat) || 'No terminal output recorded during this session.'}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulatedHistoryItem;