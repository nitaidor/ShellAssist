import React, { useEffect } from 'react';
import { X, ExternalLink, Github } from 'lucide-react';
import appIcon from '../../../assets/icon.ico';
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

        {/* Solid App Logo (No glow, no badge) */}
        <img
          src={appIcon}
          alt="ShellAssist Logo"
          className="w-16 h-16 rounded-xl mx-auto mb-3 object-contain"
        />

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