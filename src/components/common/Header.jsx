import React, { useRef, useEffect } from 'react';
import { Settings, HelpCircle, AlertTriangle, XCircle, CheckCircle2, Loader2, Info } from 'lucide-react';

export const Header = ({ isDarkMode, settings, apiStatus, showMenu, setShowMenu, onOpenSettings, onOpenHelp, onOpenAbout }) => {
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

  const isDefaultTheme = isDarkMode
    ? (settings.darkTheme !== 'green' && settings.darkTheme !== 'red')
    : (settings.lightTheme !== 'monochrome');

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
        <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-warning shadow-sm leading-none w-fit mb-[2px]">
          <AlertTriangle className="w-3 h-3" /> Missing API Key
        </span>
      );
    }
    if (apiStatus === 'checking') {
      return (
        <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-checking shadow-sm leading-none w-fit mb-[2px]">
          <Loader2 className="w-3 h-3 animate-spin" /> {info.label} (Checking...)
        </span>
      );
    }
    if (apiStatus === 'invalid') {
      return (
        <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-error shadow-sm leading-none w-fit mb-[2px]">
          <XCircle className="w-3 h-3" /> {settings.apiProvider === 'ollama' ? 'Local AI Offline' : 'Wrong API Key'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-valid shadow-sm leading-none w-fit mb-[2px]">
        <CheckCircle2 className="w-3 h-3" /> {info.label} ({info.model})
      </span>
    );
  };

  return (
    <header className="w-full max-w-4xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-6 relative z-50">
      <div className="flex items-center gap-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          className={`w-10 h-10 shrink-0 ${!isDefaultTheme ? 'header-logo' : ''}`}
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="32"
            y="32"
            width="192"
            height="192"
            rx="22"
            fill={isDefaultTheme ? 'black' : 'none'}
            stroke={isDefaultTheme ? '#3b82f6' : 'currentColor'}
            strokeWidth="16"
          />
          <path
            d="M 76 84 L 118 128 L 76 172 M 138 172 L 186 172"
            stroke={isDefaultTheme ? '#3b82f6' : 'currentColor'}
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        <div>
          {/* items-end anchors both the title and badge to the bottom baseline */}
          <div className="flex items-end gap-3 flex-wrap">
            <h1 className={`text-3xl font-bold tracking-tight leading-none ${!isDarkMode ? 'text-gray-900' : 'text-white'}`}>
              ShellAssist
            </h1>

            {renderBadge()}
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
            <button
              onClick={() => { onOpenAbout(); setShowMenu(false); }}
              className="theme-menu-item w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-t border-[#30363d] transition-colors"
            >
              <Info className="w-4 h-4" /> About ShellAssist
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;