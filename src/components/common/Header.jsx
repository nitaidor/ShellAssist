import React, { useRef, useEffect } from 'react';
import { TerminalSquare, Settings, HelpCircle, AlertTriangle, XCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const Header = ({ isDarkMode, settings, apiStatus, showMenu, setShowMenu, onOpenSettings, onOpenHelp }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowMenu]);

  const getProviderInfo = () => {
    const p = settings.apiProvider || 'gemini';
    const hasGeminiKey = !!(
      settings.geminiApiKey ||
      settings.apiKey ||
      (typeof window !== 'undefined' && localStorage.getItem('BYOK_GEMINI_KEY'))
    );
    if (p === 'gemini') return { label: 'Gemini', model: 'gemini-3.8-flash', hasKey: hasGeminiKey };
    if (p === 'openai') return { label: 'ChatGPT', model: settings.openaiModel || 'gpt-4o-mini', hasKey: !!(settings.openaiApiKey || (typeof window !== 'undefined' && localStorage.getItem('BYOK_OPENAI_KEY'))) };
    if (p === 'claude') return { label: 'Claude', model: settings.claudeModel || 'claude-3-5-sonnet', hasKey: !!(settings.claudeApiKey || (typeof window !== 'undefined' && localStorage.getItem('BYOK_CLAUDE_KEY'))) };
    
    const hasSavedOllama = Array.isArray(settings.savedLocalConfigs) && settings.savedLocalConfigs.length > 0 && !!settings.localEndpoint && !!settings.localModel;
    return { label: 'Ollama', model: settings.localModel || 'gemma2', hasKey: hasSavedOllama };
  };

  const renderBadge = () => {
    const info = getProviderInfo();

    if (!info.hasKey) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border flex items-center gap-1 status-badge-warning shadow-sm leading-none w-fit">
          <AlertTriangle className="w-2.5 h-2.5" /> Missing API Key
        </span>
      );
    }
    if (apiStatus === 'checking') {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border flex items-center gap-1 status-badge-checking shadow-sm leading-none w-fit">
          <Loader2 className="w-2.5 h-2.5 animate-spin" /> {info.label} (Checking...)
        </span>
      );
    }
    if (apiStatus === 'invalid') {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border flex items-center gap-1 status-badge-error shadow-sm leading-none w-fit">
          <XCircle className="w-2.5 h-2.5" /> {settings.apiProvider === 'ollama' ? 'Local AI Offline' : 'Wrong API Key'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border flex items-center gap-1 status-badge-valid shadow-sm leading-none w-fit">
        <CheckCircle2 className="w-2.5 h-2.5" /> {info.label} ({info.model})
      </span>
    );
  };

  return (
    <header className="w-full max-w-4xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-6 relative z-50">
      <div className="flex items-center gap-4">
        <TerminalSquare className="w-10 h-10 header-logo shrink-0" />

        <div>
          <div className="flex items-center gap-3.5 flex-wrap">
            <h1 className={`text-3xl font-bold tracking-tight leading-none ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
              ShellAssist
            </h1>

            {/* Stacked AI Model & Version Badges fitting title height */}
            <div className="flex flex-col justify-between h-9 py-0.5">
              {renderBadge()}
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded border status-badge-version shadow-sm flex items-center w-fit leading-none select-none">
                v1.3.0
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1.5">Translate English to code, reverse-engineer scripts, and debug errors.</p>
        </div>
      </div>
      <div className="absolute right-0 top-0 md:static settings-menu-container relative z-50" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Settings and options"
          className="header-settings-btn p-2 rounded-md transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 border border-[#30363d] bg-[#161b22] rounded-md shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={() => { onOpenSettings(); setShowMenu(false); }}
              className="theme-menu-item w-full text-left px-4 py-3 text-sm flex items-center gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" /> App Settings
            </button>
            <button
              onClick={() => { onOpenHelp(); setShowMenu(false); }}
              className="theme-menu-item w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-t border-[#30363d] transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> Help & Guide
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;