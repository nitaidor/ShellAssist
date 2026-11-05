import React, { useEffect } from 'react';
import { X, ExternalLink, Github } from 'lucide-react';
import { version } from '../../../package.json';

export const AboutModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const root = typeof document !== 'undefined' ? document.documentElement : null;
  const isSpecialTheme = root && (
    root.classList.contains('theme-terminal-green') ||
    root.classList.contains('theme-terminal-red') ||
    root.classList.contains('theme-monochrome')
  );
  const isDefaultTheme = !isSpecialTheme;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="modal-close-btn absolute right-4 top-4 p-1.5"
        >
          <X className="w-4 h-4" />
        </button>

        {/* App Logo (Matches Header SVG behavior across all 5 themes) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          className={`w-16 h-16 mx-auto mb-3 ${!isDefaultTheme ? 'header-logo' : ''}`}
          fill="none"
          role="img"
          aria-label="ShellAssist Logo"
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

        <h2 className="text-xl font-bold text-white tracking-tight">ShellAssist</h2>
        <p className="text-xs font-mono text-gray-400 mt-0.5">Version {version}</p>

        <p className="text-xs text-gray-300 mt-4 leading-relaxed">
          An AI-powered desktop assistant to build, analyze, debug, simulate, and execute shell commands across Windows, macOS, and Linux.
        </p>

        {/* Clickable GitHub Repo Link */}
        <div className="mt-5">
          <a
            href="https://github.com/nitaidor/ShellAssist"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-modal-action inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Github className="w-4 h-4" /> View on GitHub <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>

        <div className="border-t border-[#30363d] mt-6 pt-4 text-[11px] text-gray-500">
          Released under the MIT License • © 2026 ShellAssist
        </div>
      </div>
    </div>
  );
};

export default AboutModal;