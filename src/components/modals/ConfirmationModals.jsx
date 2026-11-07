import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, AlertCircle, Square, Trash2, Info, Sparkles, Loader2 } from 'lucide-react';

export const TerminalDisclaimerModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 theme-modal-warning-icon" /> Enable Terminal Integration?
        </h3>
        <p className="text-gray-300 text-sm mb-3 leading-relaxed">
          Enabling <strong>Terminal Integration</strong> allows this application to connect to your system shells (PowerShell, CMD, Bash, Zsh, etc.) and execute commands when you click <strong>Run</strong>.
        </p>
        <div className="p-3 rounded-md text-xs mb-6 leading-relaxed disclaimer-box">
          <strong>Disclaimer of Responsibility:</strong> Executing terminal commands can modify system settings, alter or delete files, and affect running services. The application only runs commands explicitly shown to you after you click Run. By enabling this feature, you assume full responsibility for all executed commands and absolve the application and its creators of any liability for system damage or data loss.
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium btn-modal-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors border border-transparent shadow-sm">
            I Accept & Enable
          </button>
        </div>
      </div>
    </div>
  );
};

export const RequiresElevationModal = ({
  isOpen,
  activeShell,
  isSimulated = false,
  onClose,
  onConfirmRunCurrent,
  onConfirmRestartAndRunAsAdmin
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 theme-modal-warning-icon shrink-0" />
          {isSimulated ? 'Simulated Admin Privileges' : 'Requires Administrator Privileges'}
        </h3>
        {isSimulated ? (
          <>
            <p className="text-gray-300 text-sm mb-3 leading-relaxed">
              The command you requested requires <strong>Administrator Privileges</strong>, but your current simulated <strong>{activeShell || 'terminal'}</strong> session has standard permissions.
            </p>
            <div className="p-3.5 rounded-md text-xs mb-6 leading-relaxed modal-warning-panel space-y-1.5">
              You can choose to <strong>Cancel</strong> and continue editing, <strong>Run in Current Session</strong> (which will simulate standard user permissions), or <strong>End & Run as Admin</strong> (which will archive this session, start a new elevated session, and immediately execute the command as simulated Admin).
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-300 text-sm mb-3 leading-relaxed">
              The command you requested requires <strong>Administrator Privileges</strong>, but your current <strong>{activeShell || 'terminal'}</strong> session is running with standard permissions.
            </p>
            <div className="p-3.5 rounded-md text-xs mb-6 leading-relaxed modal-warning-panel space-y-1.5">
              Because terminal processes cannot elevate mid-session, you can choose to <strong>Cancel</strong> and continue editing, <strong>Run in Current Session</strong> (which will execute with standard permissions and may return an access-denied error), or <strong>End & Run as Admin</strong> (which will archive this session, start a new elevated session, and immediately execute the command as Administrator).
            </div>
          </>
        )}
        <div className="flex justify-end gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-sm font-medium btn-modal-cancel whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmRunCurrent}
            className="px-3.5 py-2 rounded-md text-sm font-medium btn-elevation-action whitespace-nowrap"
          >
            Run in Current Session
          </button>
          <button
            type="button"
            onClick={onConfirmRestartAndRunAsAdmin}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors border border-transparent shadow-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" /> End & Run as Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export const DeepTokenBreakdownModal = ({ isOpen, isLoading, onClose, onConfirmDeepAnalysis }) => {
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('modal-open');
    } else {
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.documentElement.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 theme-prompt-arrow shrink-0" />
          Full Token Breakdown
        </h3>
        <p className="text-gray-300 text-sm mb-3 leading-relaxed">
          Because generating detailed token explanations alongside code requires substantial response data (especially for large scripts or lightweight local models), or when choosing to <strong>Skip Initial Token Analysis (Fast Mode)</strong>, the AI only annotated <strong>part or none of the code</strong> during the initial pass.
        </p>
        <div className="p-3 rounded-md text-xs mb-5 leading-relaxed modal-warning-panel space-y-1.5">
          <p>
            • <strong>Keep as-is:</strong> View, copy, run, or download the 100% complete code now. Unannotated parts will have basic syntax tags instead of detailed notes.
          </p>
          <p>
            • <strong>Full Deep Breakdown:</strong> Sends a dedicated secondary analysis pass to annotate the rest of the code token-by-token. <em>(Note: When using cloud providers, this consumes additional API tokens from your quota).</em>
          </p>
        </div>
        <div className="flex justify-end gap-3 flex-wrap">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium btn-modal-cancel whitespace-nowrap"
          >
            Keep As-Is
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirmDeepAnalysis}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors border border-transparent shadow-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Annotating Full Code...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Full Deep Breakdown
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const NewSessionConfirmModal = ({ isOpen, selectedShell, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 theme-modal-warning-icon" /> Active Session Still Running
        </h3>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          Starting a new interactive session with <strong>{selectedShell}</strong> will terminate your current active session, close its terminal, and move it to Session History. Do you want to continue?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium btn-modal-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors border border-transparent shadow-sm">
            End Previous & Start New
          </button>
        </div>
      </div>
    </div>
  );
};

export const StopSessionConfirmModal = ({ isOpen, activeShell, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Square className="w-5 h-5 text-red-500 fill-current modal-danger-icon" /> Stop Terminal Session?
        </h3>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          Are you sure you want to stop the current session? This will close the active <strong>{activeShell}</strong> terminal and archive the full session transcript to History.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium btn-modal-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors border border-transparent shadow-sm modal-danger-btn">
            Stop Session
          </button>
        </div>
      </div>
    </div>
  );
};

export const UnfinishedCommandModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 theme-modal-warning-icon" /> Previous Command Still Active
        </h3>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          Are you sure you want to run this command? The previous command didn't finish (or has an unresolved error), and running this will cancel (`Ctrl+C`) the last command.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium btn-modal-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors border border-transparent shadow-sm">
            Cancel Last & Run
          </button>
        </div>
      </div>
    </div>
  );
};

export const ClearHistoryModal = ({ isOpen, tabType, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 modal-danger-icon" /> Clear History?
        </h3>
        <p className="text-gray-300 text-sm mb-4">
          Are you sure you want to delete all standard session history in this tab? This action cannot be undone.
        </p>
        {tabType === 'builder' && (
          <p className="text-xs mb-6 p-3 rounded-md flex items-start gap-2 modal-warning-panel">
            <Info className="w-4 h-4 shrink-0 mt-0.5" /> Don't worry, any threads containing starred Favorites are safe and will remain in your Snippet Library.
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium btn-modal-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-transparent shadow-sm modal-danger-btn">
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
};