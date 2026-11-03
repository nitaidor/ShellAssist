import React, { useState } from 'react';
import { Cpu, Play, Square, Loader2, History as HistoryIcon, Trash2, Search, ChevronDown, ChevronUp, Settings, AlertCircle, RotateCw, X, TerminalSquare, Ban } from 'lucide-react';
import ContextTags from '../../components/common/ContextTags';
import CustomSelect from '../../components/common/CustomSelect';
import InteractiveTurnCard from '../interactive/InteractiveTurnCard';
import SimulatedHistoryItem from './SimulatedHistoryItem';
import { OS_OPTIONS, SHELL_OPTIONS } from '../../constants/environment';
import { getInteractiveShellOptions, formatSessionDate, formatTranscriptTimestamps } from '../../utils/platform';

export const SimulatedTab = ({
  settings,
  isDarkMode,
  selectedSimOs,
  setSelectedSimOs,
  selectedSimShell,
  setSelectedSimShell,
  runSimulatedAsAdmin,
  setRunSimulatedAsAdmin,
  activeSimulatedSession,
  simulatedConnectionError,
  simulatedInitialInput,
  setSimulatedInitialInput,
  simulatedNextInput,
  setSimulatedNextInput,
  isSimulatedGenerating,
  simulatedHistory,
  onOpenSettings,
  onStartSessionClick,
  onStopSessionClick,
  onGenerateTurn,
  onRetryTurn,
  onCancelSimulatedGeneration,
  onDismissError,
  onRunPrimaryCommand,
  onCancelPrimaryCommand,
  onRunFixCommand,
  onCancelDebugCycle,
  onCancelAutoDebugAnalysis,
  onClearHistory,
  filterHistory,
  onOpenElevationModal
}) => {
  const [simulatedSearch, setSimulatedSearch] = useState('');
  const [isActiveTranscriptExpanded, setIsActiveTranscriptExpanded] = useState(false);

  // Provide full interactive shell options for host OSs (Windows, macOS, Linux) and specific CLI options for cloud platforms
  const getShellOptionsForOs = (osName) => {
    if (['Windows', 'macOS', 'Linux'].includes(osName)) {
      return getInteractiveShellOptions(osName);
    }
    return SHELL_OPTIONS[osName] || ['PowerShell', 'CMD'];
  };

  const currentShellOptions = getShellOptionsForOs(selectedSimOs);
  const displaySimulatedHistory = simulatedHistory.filter(s => s.id !== activeSimulatedSession?.id);

  const activeDisplayCtx = activeSimulatedSession?.ctx
    ? {
        ...activeSimulatedSession.ctx,
        os: `${activeSimulatedSession.ctx.os} (Simulated)`,
        shell: activeSimulatedSession.ctx.isElevated && !String(activeSimulatedSession.ctx.shell).toLowerCase().includes('(elevated)')
          ? `${activeSimulatedSession.ctx.shell} (Elevated)`
          : activeSimulatedSession.ctx.shell
      }
    : null;

  return (
    <div className="relative">
      <div className="space-y-10 transition-opacity duration-200">
        <section className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md relative">
            <div className="absolute inset-0 rounded-[11px] overflow-hidden pointer-events-none">
              <div className="w-full h-[3px] bg-gradient-to-r from-sky-500 to-blue-600"></div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className={`text-lg font-semibold flex items-center gap-2 mt-1 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
                  <Cpu className="w-5 h-5 icon-simulated" /> Simulated Terminal Session
                </h2>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed min-h-[39px]">
                  Simulated OS: <strong className="text-gray-200">{selectedSimOs}</strong>. Test commands safely in your AI terminal sandbox.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 bg-[#0d1117] p-2 rounded-lg border border-[#30363d] shrink-0">
                <CustomSelect
                  value={selectedSimOs}
                  onChange={(newOs) => {
                    if (newOs === '──────────') return;
                    setSelectedSimOs(newOs);
                    const validShells = getShellOptionsForOs(newOs).filter(s => s !== '──────────');
                    if (!validShells.includes(selectedSimShell)) {
                      setSelectedSimShell(validShells[0]);
                    }
                  }}
                  options={OS_OPTIONS}
                />
                <CustomSelect
                  value={selectedSimShell}
                  onChange={(val) => {
                    if (val !== '──────────') setSelectedSimShell(val);
                  }}
                  options={currentShellOptions}
                />
                <label
                  className="h-10 px-3 rounded-md border border-[#30363d] bg-[#21262d] flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-300 select-none transition-colors cursor-pointer hover:text-white"
                  title="Simulate session with Administrator / root privileges (100% simulated, no OS UAC prompt)"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(runSimulatedAsAdmin)}
                    onChange={(e) => setRunSimulatedAsAdmin && setRunSimulatedAsAdmin(e.target.checked)}
                    className="custom-checkbox"
                  />
                  Run as Admin
                </label>
                <button
                  onClick={onStartSessionClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-md font-medium flex items-center justify-center gap-2 shadow-md transition-all h-10 border border-transparent shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" /> Start
                </button>
              </div>
            </div>
          </div>

          {simulatedConnectionError && !activeSimulatedSession && (
            <div className="theme-error-banner rounded-xl p-4 shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider error-title">Simulation Connection Failed</h4>
                  <p className="text-xs mt-1 font-mono leading-relaxed error-msg">{simulatedConnectionError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismissError && onDismissError()}
                className="p-1 hover:opacity-80 transition-opacity"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeSimulatedSession && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#30363d]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full session-status-dot animate-pulse"></span>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
                    Simulated Session — {formatSessionDate(activeSimulatedSession.unixTime || activeSimulatedSession.dateTime, settings?.clockFormat)}
                  </h3>
                </div>
                <ContextTags ctx={activeDisplayCtx} hideType={true} className="" />
              </div>

              {activeSimulatedSession.turns.length === 0 && !isSimulatedGenerating && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                    What would you like to simulate in {activeDisplayCtx?.shell || activeSimulatedSession.ctx.shell}?
                  </label>
                  <textarea
                    value={simulatedInitialInput}
                    onChange={(e) => setSimulatedInitialInput(e.target.value)}
                    placeholder={`e.g., list files in this directory...`}
                    className="w-full h-28 bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded-md p-4 text-sm font-mono text-gray-200 focus:outline-none resize-none shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onGenerateTurn(true);
                      }
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => onGenerateTurn(true)}
                      disabled={!simulatedInitialInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 h-10 rounded-md font-medium flex items-center gap-2 text-sm shadow-md transition-all border border-transparent"
                    >
                      <Play className="w-4 h-4 fill-current" /> Generate Command
                    </button>
                  </div>
                </div>
              )}

              {activeSimulatedSession.turns.length > 0 && (
                <div className="space-y-4">
                  {activeSimulatedSession.turns.map((turn, idx) => (
                    <InteractiveTurnCard
                      key={turn.id}
                      turn={turn}
                      index={idx}
                      isLast={idx === activeSimulatedSession.turns.length - 1}
                      ctx={activeSimulatedSession.ctx}
                      settings={settings}
                      isReadOnly={false}
                      onRunPrimaryCommand={(tId) => onRunPrimaryCommand(tId, false)}
                      onCancelPrimaryCommand={onCancelPrimaryCommand}
                      onRunFixCommand={onRunFixCommand}
                      onCancelDebugCycle={onCancelDebugCycle}
                      onCancelAutoDebugAnalysis={onCancelAutoDebugAnalysis}
                      onOpenElevationModal={onOpenElevationModal}
                    />
                  ))}
                </div>
              )}

              {isSimulatedGenerating && (
                <div className={`bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 shadow-sm ${activeSimulatedSession.turns.length === 0 ? 'h-[184px]' : 'h-[116px]'}`}>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin theme-spinner" />
                    <span className="text-xs font-mono">Generating simulated command...</span>
                  </div>
                  {onCancelSimulatedGeneration && (
                    <button
                      type="button"
                      onClick={onCancelSimulatedGeneration}
                      className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
                      title="Cancel generation and unstick editor"
                    >
                      <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
                    </button>
                  )}
                </div>
              )}

              {activeSimulatedSession.turns.length > 0 && !isSimulatedGenerating && (
                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3 shadow-sm h-[106px] flex flex-col justify-center">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Next Request in {activeDisplayCtx?.shell || activeSimulatedSession.ctx.shell}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={simulatedNextInput}
                      onChange={(e) => setSimulatedNextInput(e.target.value)}
                      placeholder={`e.g., copy these files to the backup folder...`}
                      className="flex-1 bg-[#161b22] border border-[#30363d] focus:border-blue-500 rounded-md px-4 py-2 text-sm font-mono text-gray-200 focus:outline-none shadow-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && simulatedNextInput.trim()) onGenerateTurn(false);
                      }}
                    />
                    <button
                      onClick={() => onGenerateTurn(false)}
                      disabled={!simulatedNextInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 shrink-0 shadow-sm transition-all border border-transparent"
                    >
                      <Play className="w-4 h-4 fill-current" /> Generate
                    </button>
                  </div>
                </div>
              )}

              {simulatedConnectionError && (
                <div className="theme-error-banner rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider error-title">Failed to Generate Simulated Command</h4>
                      <p className="text-xs mt-1 font-mono leading-relaxed error-msg">{simulatedConnectionError}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {onRetryTurn && (
                      <button
                        type="button"
                        onClick={onRetryTurn}
                        className="btn-retry px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-md text-xs font-medium border border-[#30363d] flex items-center gap-1.5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" /> Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismissError && onDismissError()}
                      className="p-1 hover:opacity-80 transition-opacity ml-1"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Full Terminal Output for Simulated Session */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden shadow-md">
                <div
                  onClick={() => setIsActiveTranscriptExpanded(!isActiveTranscriptExpanded)}
                  className={`bg-[#21262d] px-4 py-2.5 flex items-center justify-between cursor-pointer select-none ${isActiveTranscriptExpanded ? 'border-b border-[#30363d]' : ''}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                    <TerminalSquare className="w-3.5 h-3.5 icon-simulated" /> Full Session Terminal Output (Simulated)
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-mono">Live Session</span>
                    {isActiveTranscriptExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 opacity-75" /> : <ChevronDown className="w-4 h-4 text-gray-400 opacity-75" />}
                  </div>
                </div>
                {isActiveTranscriptExpanded && (
                  <pre className="p-4 bg-[#0d1117] text-gray-300 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-80 animate-in fade-in duration-150">
                    {formatTranscriptTimestamps(activeSimulatedSession.fullTranscript, settings?.clockFormat) || 'No simulated terminal output recorded yet in this session.'}
                  </pre>
                )}
              </div>

              <div className="pt-4 border-t border-[#30363d] flex justify-end">
                <button
                  onClick={onStopSessionClick}
                  className="btn-stop-session px-5 py-2 rounded-md font-medium text-sm flex items-center gap-2 shadow-md transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" /> Stop Session
                </button>
              </div>
            </div>
          )}
        </section>

        {/* History Section */}
        <section className="mt-8 pt-6 border-t border-[#30363d]">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
              <HistoryIcon className="w-5 h-5 icon-simulated" /> Simulated History {simulatedHistory.length > 0 && <span className="theme-count-badge text-xs px-2.5 py-0.5 rounded-full font-medium ml-2">{simulatedHistory.length}</span>}
            </h2>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => onClearHistory('simulated')}
                disabled={simulatedHistory.length === 0}
                title={simulatedHistory.length === 0 ? "No history to clear" : "Clear History"}
                className={`btn-clear-history px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                  simulatedHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-950/30'
                }`}
              >
                <Trash2 className="w-4 h-4" /> Clear
              </button>
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={simulatedSearch}
                  onChange={(e) => setSimulatedSearch(e.target.value)}
                  placeholder="Search history..."
                  className="pl-9 pr-4 py-1.5 bg-[#161b22] border border-[#30363d] rounded-md text-sm text-gray-200 focus:outline-none focus:border-blue-500 w-48 shadow-sm"
                />
              </div>
            </div>
          </div>
          {simulatedSearch.trim() && (
            <p className="text-xs icon-simulated mb-4 font-medium flex items-center gap-2">
              <Search className="w-3.5 h-3.5" /> Showing filtered results for "{simulatedSearch}"
            </p>
          )}
          {simulatedHistory.length === 0 && !activeSimulatedSession ? (
            <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl flex flex-col items-center justify-center h-48 text-gray-500">
              <Cpu className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Completed simulated terminal sessions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeSimulatedSession && !simulatedSearch.trim() && (
                <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-sm opacity-50 pointer-events-none" title="This is your active session">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="history-icon-badge p-2 rounded-lg">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white font-mono">{formatSessionDate(activeSimulatedSession.unixTime || activeSimulatedSession.dateTime, settings?.clockFormat)}</p>
                        <span className="text-xs text-gray-500">Active Session ({activeDisplayCtx?.os} • {activeDisplayCtx?.shell})</span>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 opacity-75 text-gray-500" />
                  </div>
                </div>
              )}
              {filterHistory(displaySimulatedHistory, simulatedSearch).sort((a, b) => b.unixTime - a.unixTime).map((session) => (
                <SimulatedHistoryItem key={session.id} session={session} settings={settings} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SimulatedTab;