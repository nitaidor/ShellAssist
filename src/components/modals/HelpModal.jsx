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
                  <p className="text-sm text-gray-300">Type what you want to achieve in plain English. The AI generates the precise executable code based on your selected OS, Shell, and Type tags.</p>
                  <p className="text-xs text-gray-400 mt-2 font-mono bg-[#161b22] p-2 rounded border border-[#30363d]">Input: "find all .txt files modified in the last 7 days"<br/>Output: `find . -type f -name '*.txt' -mtime -7`</p>
                  <p className="text-sm text-gray-300 mt-2">Once generated, use the <strong>Refine</strong> bar at the bottom to modify the logic, translate it to another OS or Shell, or convert between a <strong>multi-line Script</strong> and a <strong>single-line Command</strong> (and vice versa).</p>
                </div>
                <div className="border-t border-[#30363d] pt-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Analyze Mode (Reverse Translation)</h4>
                  <p className="text-sm text-gray-300">Check the <strong>Analyze</strong> box to reverse-translate existing code into a plain English explanation. You can either paste code into the text box or click the <strong>Upload Script</strong> button to attach a script file.</p>
                  <p className="text-xs text-gray-400 mt-2 font-mono bg-[#161b22] p-2 rounded border border-[#30363d]">Input: `docker rmi $(docker images -f "dangling=true" -q)`<br/>Output: "This command deletes all dangling (untagged) Docker images..."</p>
                  <p className="text-sm text-gray-300 mt-2">Once analyzed, use the <strong>Refine</strong> bar at the bottom in the same fashion as the English to Code Mode.</p>
                </div>
              </div>
              <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-md shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Features</h4>
                <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
                  <li><strong>Interactive Tokens & Full Breakdown:</strong> Hover over any part of the code to inspect what it does. For large scripts where only the beginning is annotated initially (to conserve your API token quota and keep generation fast), click <strong>Full Breakdown Available</strong> to run a complete token-by-token breakdown of the entire script.</li>
                  <li><strong>Risk Assessment & Alternatives:</strong> Click the <strong>Risk</strong> badge on any generated result to review potential system impact and elevation requirements, or click <strong>View Alternative</strong> to see alternative commands or GUI methods for the task.</li>
                  <li><strong>Copy, Download & Run:</strong> Single-line <strong>Commands</strong> can be copied or executed immediately via <strong>Run</strong>, while multi-line <strong>Scripts</strong> can be copied or saved as a file via <strong>Download</strong>.</li>
                  <li><strong>Inline Command Debugger:</strong> Each generated turn includes a <strong>Command Debugger</strong> panel at the bottom of the card (which auto-populates if a <strong>Run</strong> action returns an error) so you can troubleshoot issues in place.</li>
                  <li><strong>Favorites:</strong> Click the <Star className="inline w-3.5 h-3.5 btn-star-active pointer-events-none align-text-bottom" /> icon to save a thread to your permanent Library.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Understanding Context Tags (Second) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-builder">
              <Settings className="w-5 h-5 icon-builder" /> Understanding Context Tags (OS, Shell, Command vs. Script)
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Setting the right context tags ensures the AI structures its output for your exact environment:
            </p>
            <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
              <li><strong>OS (Operating System):</strong> Tells the AI whether to target Windows, macOS, Linux, or a Cloud platform (like Docker, Kubernetes, AWS, or Terraform). This ensures file paths (e.g., <code>C:\</code> vs <code>/var/log</code>) and native executables are accurate.</li>
              <li><strong>Shell / CLI:</strong> Defines the specific terminal environment (e.g., PowerShell, CMD, Bash, Zsh). Syntax adapts to the active shell (e.g., <code>Get-ChildItem</code> in PowerShell vs <code>ls</code> in Bash).</li>
              <li><strong>Command vs. Script:</strong> When generating or refining in the Command Builder, selecting <em>Command</em> produces a single-line command string suitable for immediate execution (<strong>Run</strong>), while selecting <em>Script</em> produces a multi-line script and enables the <strong>Download</strong> button (e.g., <code>.ps1</code>, <code>.bat</code>, or <code>.sh</code>). In <strong>Analyze</strong> mode (in the Command Builder), the <strong>Code Analyzer</strong>, and the <strong>General Debugger</strong>, the app automatically detects whether your input is a Command or a Script and replaces this dropdown with the <strong>Upload Script</strong> button. Uploading a script file automatically locks the matching Shell and filters the OS options based on the file extension.</li>
            </ul>
          </section>

          {/* 2. Code Analyzer (Third) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-analyzer">
              <Code className="w-5 h-5 icon-analyzer" /> 2. Code Analyzer
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              A dedicated tab to reverse-engineer and inspect unfamiliar commands or scripts without modifying them:
            </p>
            <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
              <li><strong>Paste Code or Upload Script:</strong> Either paste raw code into the editor or click the <strong>Upload Script</strong> button to attach a script file.</li>
              <li><strong>Inspection & Actions:</strong> Instantly provides an overall explanation, interactive token breakdown (with <strong>Full Breakdown Available</strong> for large scripts), risk assessment, and alternative commands or GUI methods. Analyzed commands provide <strong>Copy</strong> and <strong>Run</strong> buttons, while scripts provide <strong>Copy</strong> and <strong>Download</strong> buttons.</li>
            </ul>
          </section>

          {/* 3. General Debugger (Fourth) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-debugger">
              <Bug className="w-5 h-5 icon-debugger" /> 3. General Debugger
            </h2>
            <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-md shadow-sm">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">The Debugging Loop</h4>
              <ol className="text-sm text-gray-300 space-y-3 list-decimal list-inside">
                <li>Run your command or script in your local terminal.</li>
                <li>If it fails, either paste the full terminal output into the text box, or click <strong>Upload Script</strong> to attach your script file and paste the terminal error output into the text box alongside it.</li>
                <li>Click <strong>Analyze</strong>. The AI will explain the root cause and provide the corrected code or script. Paste any subsequent errors into the follow-up box to continue iterating.</li>
              </ol>
            </div>
          </section>

          {/* 4. Interactive Terminal Tab (Fifth) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-interactive">
              <Terminal className="w-5 h-5 icon-interactive" /> 4. Interactive Terminal Tab & Terminal Integration
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              The <strong>Interactive Terminal</strong> tab lets you connect directly to a live shell on your operating system and converse with it in plain English:
            </p>
            <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
              <li><strong>Enabling Terminal Integration:</strong> Open <em>App Settings</em> and enable <strong>Terminal Integration</strong>. This unlocks both the Interactive Terminal tab and the <strong>Run</strong> buttons across the app.</li>
              <li><strong>Starting a Session:</strong> The app automatically detects your host OS and lets you select any compatible shell or CLI (e.g., PowerShell, CMD, Bash, Zsh, Docker CLI). Click <strong>Start</strong> to open a persistent terminal session, or check <strong>Run as Admin</strong> first to launch the session with elevated administrator privileges.</li>
              <li><strong>Elevated Session:</strong> If you are in a standard session and request a command that requires elevation, the app will pause and let you choose to <strong>Cancel</strong>, <strong>Run in Current Session</strong> (which executes without admin privileges), or <strong>End & Run as Admin</strong> (which closes the current session and immediately executes the command in a new elevated session).</li>
              <li><strong>Running & Inspecting Commands:</strong> Type your goal (e.g., <em>"List all stopped Windows services"</em>). The app generates the command and waits for your confirmation. Commands never run automatically, and only execute when you click <strong>Run</strong>. Once a command finishes, use the <strong>Next Request</strong> box to continue interacting with the same live session (e.g., <em>"Start the Print Spooler service"</em>).</li>
              <li><strong>Automated Error Recovery Loop:</strong> If a command returns an error, the app automatically captures the full terminal transcript, diagnoses the cause, and presents a ready-to-deploy <em>Fix Code</em> with <strong>Run</strong> and <strong>Cancel</strong> buttons.</li>
              <li><strong>Session Lifecycle & History:</strong> Click <strong>Stop Session</strong> at the bottom of an active session (or start a new one) to close the underlying terminal. Closed sessions are archived by Date & Time in the read-only History section with the <strong>Full Session Terminal Output</strong> attached at the bottom.</li>
            </ul>
          </section>

          {/* 5. Simulated Terminal Tab (Sixth) */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 icon-simulated">
              <Cpu className="w-5 h-5 icon-simulated" /> 5. Simulated Terminal Tab (Safe Sandbox)
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              The <strong>Simulated Terminal</strong> tab provides a 100% safe, AI-powered terminal sandbox that works without touching your physical machine:
            </p>
            <ul className="text-sm text-gray-300 space-y-3 list-disc list-inside">
              <li><strong>Switch Target OS & Shell Freely:</strong> Choose any operating system or cloud platform (Windows, macOS, Linux, Docker, Kubernetes, AWS, Terraform) and any compatible shell right from the top bar.</li>
              <li><strong>Smart AI Simulation:</strong> Powered by your active AI provider (Gemini, ChatGPT, Claude, or local Ollama), clicking <strong>Run</strong> evaluates command syntax and simulates realistic console output, exit codes, and error messages.</li>
              <li><strong>Simulated Elevated Session:</strong> Toggle <strong>Run as Admin</strong> to simulate an elevated administrator/root session.</li>
              <li><strong>Full Error Recovery & History:</strong> Includes the same token inspector, risk assessment, automated error recovery loop, and live session transcript as the real Interactive Terminal.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;