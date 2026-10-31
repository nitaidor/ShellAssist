import React from 'react';
import { HelpCircle, X, Cpu, Terminal, Settings, MessageSquare, Star, Code, Bug } from 'lucide-react';

export const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto transition-colors duration-200 bg-[#0d1117] text-[#c9d1d9] theme-bg-override">
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#30363d]">
          <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
            <HelpCircle className="w-8 h-8 header-logo" /> ShellAssist Documentation
          </h1>
          <button
            onClick={onClose}
            className="p-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition-colors flex items-center gap-2 text-sm font-medium text-gray-200 hover:text-white shadow-md"
          >
            <X className="w-4 h-4" /> Close Guide
          </button>
        </div>
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <section>
            <p className="text-base leading-relaxed text-gray-400">
              Welcome to ShellAssist. This tool bridges the gap between natural language and complex command-line interfaces. By leveraging AI, it allows you to generate safe terminal commands, explain complicated scripts, quickly debug errors, run live shell sessions with automated error recovery, or test commands in a safe simulated terminal sandbox.
            </p>
          </section>

          {/* 1. Command Builder (First) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-builder">
              <MessageSquare className="w-5 h-5 icon-builder" /> 1. Command Builder
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-md flex flex-col gap-4 shadow-sm">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">English to Code Mode (Default)</h4>
                  <p className="text-sm text-gray-300">Type what you want to achieve in plain English. The AI generates the precise executable code based on your selected OS and Shell tags.</p>
                  <p className="text-xs text-gray-400 mt-2 font-mono bg-[#161b22] p-2 rounded border border-[#30363d]">Input: "list files modified in the last 7 days"<br/>Output: `find . -name '*.txt' -mtime -7`</p>
                </div>
                <div className="border-t border-[#30363d] pt-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Code to English Mode (Reverse Translation)</h4>
                  <p className="text-sm text-gray-300">Check the <strong>EN MODE</strong> box and paste raw, confusing terminal code. The tool will reverse-translate it into a plain English explanation.</p>
                  <p className="text-xs text-gray-400 mt-2 font-mono bg-[#161b22] p-2 rounded border border-[#30363d]">Input: `docker rmi $(docker images -f "dangling=true" -q)`<br/>Output: "This command deletes all dangling (untagged) Docker images..."</p>
                </div>
              </div>
              <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-md shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Features</h4>
                <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
                  <li><strong>Interactive Tokens:</strong> Hover over any part of the generated code to inspect exactly what it does.</li>
                  <li><strong>Favorites:</strong> Click the <Star className="inline w-3.5 h-3.5 btn-star-active pointer-events-none align-text-bottom" /> icon to save a thread to your permanent Library.</li>
                  <li><strong>1-Click Run & Auto-Populate Debugger:</strong> Clicking <strong>Run</strong> displays <em>Success</em>, <em>Error</em>, or <em>Failed</em> directly on the button. If an error occurs, the terminal output is automatically copied into that turn's Command Debugger input box ready for you to click Analyze.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Understanding Context Tags (Second) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-builder">
              <Settings className="w-5 h-5 icon-builder" /> Understanding Context Tags (OS, Shell, Command)
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Before generating or analyzing code in the Command Builder, setting the correct context tags is crucial. The AI uses these tags to determine exactly how to structure the output:
            </p>
            <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
              <li><strong>OS (Operating System):</strong> Tells the AI whether to target Windows, macOS, Linux, or a Cloud platform (like Docker). This ensures file paths (e.g., <code>C:\</code> vs <code>/var/log</code>) and native executables are correct.</li>
              <li><strong>Shell / CLI:</strong> Defines the specific terminal environment (e.g., PowerShell, Bash, Zsh). Syntax changes drastically depending on the active shell (e.g., <code>Get-ChildItem</code> in PowerShell vs <code>ls</code> in Bash).</li>
              <li><strong>Command vs. Script:</strong> Selecting <em>Command</em> forces the AI to provide a single-line string suitable for immediate terminal entry. Selecting <em>Script</em> allows for standard multi-line code blocks and enables the "Download" button to save it as a file (e.g., <code>.ps1</code> or <code>.sh</code>).</li>
            </ul>
          </section>

          {/* 2. Code Analyzer (Third) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-analyzer">
              <Code className="w-5 h-5 icon-analyzer" /> 2. Code Analyzer
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              A dedicated tab to reverse-engineer obfuscated scripts without accidentally modifying them. Paste code to instantly get a token breakdown, risk assessment, and alternative GUI methods.
            </p>
          </section>

          {/* 3. General Debugger (Fourth) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-debugger">
              <Bug className="w-5 h-5 icon-debugger" /> 3. General Debugger
            </h2>
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-md shadow-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">The Debugging Loop</h4>
              <ol className="text-sm text-gray-300 space-y-3 list-decimal list-inside">
                <li>Run your script in your local terminal.</li>
                <li>If it crashes, <strong>copy the full terminal output (including the original command you executed and the error)</strong> and paste it into the Debugger tab for context.</li>
                <li>The AI will explain the root cause and suggest a fix. Paste subsequent errors in the follow-up box to iterate.</li>
              </ol>
            </div>
          </section>

          {/* 4. Interactive Terminal Tab (Fifth) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-interactive">
              <Terminal className="w-5 h-5 icon-interactive" /> 4. Interactive Terminal Tab & Terminal Integration
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              The <strong>Interactive Terminal</strong> tab lets you connect directly to a live shell on your detected operating system and converse with it in plain English:
            </p>
            <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
              <li><strong>Enabling Terminal Integration:</strong> Open <em>App Settings</em> and toggle on <strong>Terminal Integration</strong> (requires accepting the responsibility disclaimer). This unlocks both the Interactive Terminal tab and the 1-Click <strong>Run</strong> buttons across the app.</li>
              <li><strong>Starting a Session:</strong> The app automatically detects your host OS and lets you select any compatible shell or CLI (e.g., PowerShell, CMD, Bash, Zsh, Docker CLI). Click <strong>Start</strong> to open a persistent terminal session.</li>
              <li><strong>Inspecting & Running Commands:</strong> Type your goal (e.g., <em>"Start VM called VM_1"</em>). The app generates the command (with a collapsible Token Inspector, Risk badge, and Alternative method) and waits for you to click <strong>Run</strong>. The app never executes a command without your explicit click.</li>
              <li><strong>Automated Error Recovery Loop:</strong> If a command returns an error, the app automatically captures the full terminal transcript, diagnoses the cause, and presents a minimized <em>Terminal Output</em>, minimized <em>Suggested Fix</em>, and a ready-to-deploy <em>Fix Code</em> with <strong>Run</strong> and <strong>Cancel (^C)</strong> buttons.</li>
              <li><strong>Session Lifecycle & History:</strong> Click <strong>Stop Session</strong> at the bottom of an active session (or start a new one) to close the underlying terminal. Closed sessions are archived by Date & Time in the read-only History section with the <strong>Full Session Terminal Output</strong> attached at the bottom.</li>
            </ul>
          </section>

          {/* 5. Simulated Terminal Tab (Sixth) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-simulated">
              <Cpu className="w-5 h-5 icon-simulated" /> 5. Simulated Terminal Tab (Safe Sandbox)
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              The <strong>Simulated Terminal</strong> tab provides a 100% safe, AI-powered terminal sandbox that works in both the desktop application and any web browser without touching your physical machine:
            </p>
            <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
              <li><strong>Switch Target OS & Shell Freely:</strong> Choose any operating system or cloud platform (Windows, macOS, Linux, Docker, Kubernetes, AWS, Terraform) and any compatible shell right from the top bar.</li>
              <li><strong>Smart AI Simulation:</strong> Powered by your active AI provider (Gemini, ChatGPT, Claude, or local Ollama), clicking <strong>Run</strong> evaluates command syntax and simulates realistic console output, exit codes, and error messages.</li>
              <li><strong>Simulated Run as Admin:</strong> Toggle <strong>Run as Admin</strong> to simulate an elevated administrator/root session (or test how standard sessions prompt to restart as Admin when an elevated command is requested) with zero OS UAC popups.</li>
              <li><strong>Full Error Recovery & History:</strong> Includes the same token inspector, risk assessment, automated error recovery loop, live session transcript, and searchable history as the real Interactive Terminal.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;