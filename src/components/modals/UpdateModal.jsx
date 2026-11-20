import React, { useEffect } from 'react';
import { X, ExternalLink, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { version } from '../../../package.json';

export const UpdateModal = ({ isOpen, onClose, updateStatus, updateData }) => {
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

  const currentVer = updateData?.currentVersion || version;
  const latestVer = updateData?.latestVersion || currentVer;

  const formattedDate = updateData?.publishedAt
    ? new Date(updateData.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

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

        {updateStatus === 'checking' && (
          <div className="py-4">
            <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin update-modal-spinner" />
            <h2 className="text-lg font-bold text-white tracking-tight">Checking for Updates...</h2>
            <p className="text-xs text-gray-400 mt-2">Connecting to GitHub to verify the latest release.</p>
          </div>
        )}

        {updateStatus === 'up-to-date' && (
          <div className="py-2">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 update-modal-success-icon" />
            <h2 className="text-lg font-bold text-white tracking-tight">You're Up to Date!</h2>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              ShellAssist <span className="font-mono font-semibold update-modal-version-text">v{currentVer}</span> is currently the newest version installed.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="btn-modal-action inline-flex items-center gap-2 px-5 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {updateStatus === 'error' && (
          <div className="py-2">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 theme-modal-warning-icon" />
            <h2 className="text-lg font-bold text-white tracking-tight">Unable to Check for Updates</h2>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              Could not retrieve release details from GitHub. Please check your internet connection or try again later.
            </p>
            {updateData?.error && (
              <p className="text-[11px] font-mono text-gray-500 mt-3 break-words">
                {updateData.error}
              </p>
            )}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="btn-modal-cancel px-5 py-2 rounded-md text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {updateStatus === 'update-available' && (
          <div>
            {/* App Logo SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              className={`w-14 h-14 mx-auto mb-3 ${!isDefaultTheme ? 'header-logo' : ''}`}
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

            <h2 className="text-lg font-bold text-white tracking-tight">New Version Available!</h2>

            <div className="update-version-pill inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono mt-2 shadow-sm">
              <span className="update-version-old">v{currentVer}</span>
              <span className="update-version-arrow font-sans">→</span>
              <span className="font-bold update-version-new">v{latestVer}</span>
            </div>

            {updateData?.releaseName && updateData.releaseName !== `Version ${latestVer}` && (
              <p className="text-xs font-semibold text-gray-200 mt-3">{updateData.releaseName}</p>
            )}

            {formattedDate && (
              <p className="text-[11px] text-gray-400 mt-1">Released {formattedDate}</p>
            )}

            {/* Action buttons matching View on GitHub styling */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-modal-cancel px-4 py-2 rounded-md text-xs font-medium transition-colors"
              >
                Later
              </button>
              <a
                href={updateData?.releaseUrl || `https://github.com/nitaidor/ShellAssist/releases/tag/v${latestVer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-modal-action inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Update to v{latestVer} <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateModal;
