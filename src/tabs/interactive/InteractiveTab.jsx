import React, { useState } from 'react';
import { Terminal, Play, Square, Loader2, WifiOff, History as HistoryIcon, Trash2, Search, ChevronDown, ChevronUp, Settings, AlertCircle, RotateCw, X, TerminalSquare, Ban } from 'lucide-react';
import ContextTags from '../../components/common/ContextTags';
import CustomSelect from '../../components/common/CustomSelect';
import InteractiveTurnCard from './InteractiveTurnCard';
import InteractiveHistoryItem from './InteractiveHistoryItem';
import { formatSessionDate, formatTranscriptTimestamps } from '../../utils/platform';

export const InteractiveTab = ({
  settings,
  isDarkMode,
  hostOs,
  isDesktopEnv,
  interactiveShellOptions,
  selectedInteractiveShell,
  setSelectedInteractiveShell,
  runInteractiveAsAdmin,
  setRunInteractiveAsAdmin,
  activeInteractiveSession,
  interactiveConnectionError,
  interactiveInitialInput,
  setInteractiveInitialInput,
  interactiveNextInput,
  setInteractiveNextInput,
  isInteractiveStarting,
  isInteractiveGenerating,
  interactiveHistory,
  onOpenSettings,
  onStartSessionClick,
  onStopSessionClick,
  onGenerateTurn,
  onRetryTurn,
  onCancelInteractiveGeneration,
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
  const [interactiveSearch, setInteractiveSearch] = useState('');
  const [isActiveTranscriptExpanded, setIsActiveTranscriptExpanded] = useState(false);

  const isWebView = !isDesktopEnv || hostOs === 'WebView';
  const displayInteractiveHistory = interactiveHistory.filter(s => s.id !== activeInteractiveSession?.id);

  const activeDisplayCtx = activeInteractiveSession?.ctx
    ? {
        ...activeInteractiveSession.ctx,
        shell: activeInteractiveSession.ctx.isElevated && !String(activeInteractiveSession.ctx.shell).toLowerCase().includes('(elevated)')
          ? `${activeInteractiveSession.ctx.shell} (Elevated)`
          : activeInteractiveSession.ctx.shell
      }
    : null;

  return (
    <div className="relative">
      {!settings.enableExecution && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full theme-modal-icon-badge flex items-center justify-center mx-auto">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className={`text-lg font-bold ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
              Terminal Integration Disabled
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              To connect to a live shell and use the Interactive Terminal tab, please enable <strong>Terminal Integration</strong> in the application settings.
            </p>
            <button
              onClick={onOpenSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-medium text-sm inline-flex items-center gap-2 shadow-md transition-colors border border-transparent"
            >
              <Settings className="w-4 h-4" /> Open Settings
            </button>
          </div>
        </div>
      )}
      <div className={`space-y-10 transition-opacity duration-200 ${!settings.enableExecution ? 'opacity-25 pointer-events-none select-none' : ''}`}>
        <section className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md relative">
            <div className="absolute inset-0 rounded-[11px] overflow-hidden pointer-events-none">
              <div className="w-full h-[3px] bg-gradient-to-r from-purple-600 to-blue-500"></div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className={`text-lg font-semibold flex items-center gap-2 mt-1 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
                  <Terminal className="w-5 h-5 icon-interactive" /> Interactive Terminal Session
                </h2>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Detected Host OS: <strong className="text-gray-200">{hostOs}</strong>. Connect directly to your system shell.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 bg-[#0d1117] p-2 rounded-lg border border-[#30363d] shrink-0">
                <span className="h-10 px-3.5 rounded-md tag-os flex items-center justify-center shrink-0 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                  {hostOs}
                </span>
                <CustomSelect
                  value={isWebView ? 'N/A' : selectedInteractiveShell}
                  onChange={(val) => {
                    if (val !== '──────────') setSelectedInteractiveShell(val);
                  }}
                  options={isWebView ? ['N/A'] : interactiveShellOptions}
                  disabled={!settings.enableExecution || isWebView || isInteractiveStarting}
                />
                <label
                  className={`h-10 px-3 rounded-md border border-[#30363d] bg-[#21262d] flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-300 select-none transition-colors ${(!settings.enableExecution || isWebView || isInteractiveStarting) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-white'}`}
                  title="Run interactive session with Administrator privileges (triggers OS UAC prompt once)"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(runInteractiveAsAdmin)}
                    disabled={!settings.enableExecution || isWebView || isInteractiveStarting}
                    onChange={(e) => setRunInteractiveAsAdmin && setRunInteractiveAsAdmin(e.target.checked)}
                    className="custom-checkbox"
                  />
                  Run as Admin
                </label>
                <button
                  onClick={onStartSessionClick}
                  disabled={!settings.enableExecution || isWebView || isInteractiveStarting}
                  title={isWebView ? "Real bridge requires running ShellAssist as a desktop application. Use the Simulated Terminal tab to test commands in a browser." : ""}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 rounded-md font-medium flex items-center justify-center gap-2 shadow-md transition-all h-10 border border-transparent shrink-0 min-w-[100px]"
                >
                  {isInteractiveStarting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                  ) : (
                    <><Play className="w-4 h-4 fill-current" /> Start</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Loading Wheel Panel while waiting for terminal session to connect */}
          {isInteractiveStarting && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 flex flex-col items-center justify-center text-gray-400 shadow-md animate-in fade-in duration-200 gap-3">
              <Loader2 className="w-8 h-8 animate-spin icon-interactive" />
              <p className="text-sm font-mono">
                Connecting to {runInteractiveAsAdmin ? `${selectedInteractiveShell} (Elevated)` : selectedInteractiveShell} on {hostOs}...
              </p>
            </div>
          )}

          {interactiveConnectionError && !activeInteractiveSession && !isInteractiveStarting && (
            <div className="theme-error-banner rounded-xl p-4 shadow-md flex items-start justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider error-title">Connection Failed</h4>
                  <p className="text-xs mt-1 font-mono leading-relaxed error-msg">{interactiveConnectionError}</p>
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

          {activeInteractiveSession && !isInteractiveStarting && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#30363d]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full session-status-dot animate-pulse"></span>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
                    Connected Session — {formatSessionDate(activeInteractiveSession.unixTime || activeInteractiveSession.dateTime, settings?.clockFormat)}
                  </h3>
                </div>
                <ContextTags ctx={activeDisplayCtx} hideType={true} className="" />
              </div>

              {activeInteractiveSession.turns.length === 0 && !isInteractiveGenerating && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                    What would you like to run in {activeDisplayCtx?.shell || activeInteractiveSession.ctx.shell}?
                  </label>
                  <textarea
                    value={interactiveInitialInput}
                    onChange={(e) => setInteractiveInitialInput(e.target.value)}
                    placeholder={`e.g., list files in this directory...`}
                    className="w-full h-28 bg-[#0d1117] border border-[#30363d] focus:border-purple-500 rounded-md p-4 text-sm font-mono text-gray-200 focus:outline-none resize-none shadow-sm"
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
                      disabled={!interactiveInitialInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 h-10 rounded-md font-medium flex items-center gap-2 text-sm shadow-md transition-all border border-transparent"
                    >
                      <Play className="w-4 h-4 fill-current" /> Generate Command
                    </button>
                  </div>
                </div>
              )}

              {activeInteractiveSession.turns.length > 0 && (
                <div className="space-y-4">
                  {activeInteractiveSession.turns.map((turn, idx) => (
                    <InteractiveTurnCard
                      key={turn.id}
                      turn={turn}
                      index={idx}
                      isLast={idx === activeInteractiveSession.turns.length - 1}
                      ctx={activeInteractiveSession.ctx}
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

              {/* Generating Loader with Cancel Action */}
              {isInteractiveGenerating && (
                <div className={`bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 shadow-sm ${activeInteractiveSession.turns.length === 0 ? 'h-[184px]' : 'h-[116px]'}`}>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin theme-spinner" />
                    <span className="text-xs font-mono">Generating command...</span>
                  </div>
                  {onCancelInteractiveGeneration && (
                    <button
                      type="button"
                      onClick={onCancelInteractiveGeneration}
                      className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded border border-[#30363d] text-xs font-mono flex items-center gap-1.5 transition-colors"
                      title="Cancel generation and unstick editor"
                    >
                      <Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel
                    </button>
                  )}
                </div>
              )}

              {activeInteractiveSession.turns.length > 0 && !isInteractiveGenerating && (
                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3 shadow-sm h-[106px] flex flex-col justify-center">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Next Request in {activeDisplayCtx?.shell || activeInteractiveSession.ctx.shell}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={interactiveNextInput}
                      onChange={(e) => setInteractiveNextInput(e.target.value)}
                      placeholder={`e.g., copy these files to the backup folder...`}
                      className="flex-1 bg-[#161b22] border border-[#30363d] focus:border-purple-500 rounded-md px-4 py-2 text-sm font-mono text-gray-200 focus:outline-none shadow-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && interactiveNextInput.trim()) onGenerateTurn(false);
                      }}
                    />
                    <button
                      onClick={() => onGenerateTurn(false)}
                      disabled={!interactiveNextInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 shrink-0 shadow-sm transition-all border border-transparent"
                    >
                      <Play className="w-4 h-4 fill-current" /> Generate
                    </button>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {interactiveConnectionError && (
                <div className="theme-error-banner rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider error-title">Failed to Generate Command</h4>
                      <p className="text-xs mt-1 font-mono leading-relaxed error-msg">{interactiveConnectionError}</p>
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

              {/* Collapsed Full Terminal Output in Active Session */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden shadow-md">
                <div
                  onClick={() => setIsActiveTranscriptExpanded(!isActiveTranscriptExpanded)}
                  className={`bg-[#21262d] px-4 py-2.5 flex items-center justify-between cursor-pointer select-none ${isActiveTranscriptExpanded ? 'border-b border-[#30363d]' : ''}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                    <TerminalSquare className="w-3.5 h-3.5 icon-interactive" /> Full Session Terminal Output
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-mono">Live Session</span>
                    {isActiveTranscriptExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 opacity-75" /> : <ChevronDown className="w-4 h-4 text-gray-400 opacity-75" />}
                  </div>
                </div>
                {isActiveTranscriptExpanded && (
                  <pre className="p-4 bg-[#0d1117] text-gray-300 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-80 animate-in fade-in duration-150">
                    {formatTranscriptTimestamps(activeInteractiveSession.fullTranscript, settings?.clockFormat) || 'No terminal output recorded yet in this session.'}
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

        <section className="mt-8 pt-6 border-t border-[#30363d]">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
              <HistoryIcon className="w-5 h-5 icon-interactive" /> Session History {interactiveHistory.length > 0 && <span className="theme-count-badge text-xs px-2.5 py-0.5 rounded-full font-medium ml-2">{interactiveHistory.length}</span>}
            </h2>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => onClearHistory('interactive')}
                disabled={interactiveHistory.length === 0}
                title={interactiveHistory.length === 0 ? "No history to clear" : "Clear History"}
                className={`btn-clear-history px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                  interactiveHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-950/30'
                }`}
              >
                <Trash2 className="w-4 h-4" /> Clear
              </button>
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={interactiveSearch}
                  onChange={(e) => setInteractiveSearch(e.target.value)}
                  placeholder="Search history..."
                  className="pl-9 pr-4 py-1.5 bg-[#161b22] border border-[#30363d] rounded-md text-sm text-gray-200 focus:outline-none focus:border-purple-500 w-48 shadow-sm"
                />
              </div>
            </div>
          </div>
          {interactiveSearch.trim() && (
            <p className="text-xs icon-interactive mb-4 font-medium flex items-center gap-2">
              <Search className="w-3.5 h-3.5" /> Showing filtered results for "{interactiveSearch}"
            </p>
          )}
          {interactiveHistory.length === 0 && !activeInteractiveSession ? (
            <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl flex flex-col items-center justify-center h-48 text-gray-500">
              <Terminal className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Completed interactive terminal sessions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeInteractiveSession && !interactiveSearch.trim() && (
                <div className="flex flex-col gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] shadow-sm opacity-50 pointer-events-none" title="This is your active session">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="history-icon-badge p-2 rounded-lg">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white font-mono">{formatSessionDate(activeInteractiveSession.unixTime || activeInteractiveSession.dateTime, settings?.clockFormat)}</p>
                        <span className="text-xs text-gray-500">Active Session</span>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 opacity-75 text-gray-500" />
                  </div>
                </div>
              )}
              {filterHistory(displayInteractiveHistory, interactiveSearch).sort((a, b) => b.unixTime - a.unixTime).map((session) => (
                <InteractiveHistoryItem key={session.id} session={session} settings={settings} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default InteractiveTab;