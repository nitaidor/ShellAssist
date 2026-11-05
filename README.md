<img src="assets/icon.svg" alt="ShellAssist" width="130" height="auto">

# ShellAssist

An AI-powered desktop assistant to build, analyze, debug, simulate, and execute shell commands across Windows, macOS, and Linux.

## About The Project
Working in the terminal often means memorizing obscure flags, constantly searching for syntax, and nervously running complex scripts copied from the internet. ShellAssist was built to take the guesswork and risk out of the command line by giving you a safe, intelligent workspace to write, understand, and test shell commands before they ever touch your actual system.

## Key Features
* **Command Builder:** English-to-code generation and refinement.
* **Simulated Terminal:** Safe sandbox to test commands via AI simulation.
* **Interactive Terminal:** Live local shell execution & auto-debug loops.
* **Analyzer & Debugger:** Token inspector, risk assessment, and iterative error debugging.
* **Multi-AI Engine:** Bring your own API key (Gemini, ChatGPT, Claude) or run 100% privately via local Ollama.
* **5 Themes:** Dark, Light, Terminal Green, Terminal Red, and Monochrome.

## Installation

### Option 1: Download Pre-Built Executables
Download the latest installer or portable executable directly from the [Releases page](https://github.com/nitaidor/ShellAssist/releases/latest).

### Option 2: Build from Source
Before you begin, ensure you have [Node.js](https://nodejs.org/) installed.

1. Clone the repository:
   ```bash
   git clone https://github.com/nitaidor/ShellAssist.git
   ```
2. Navigate to the project directory:
   ```bash
   cd ShellAssist
   ```
3. Install dependencies and package the Windows desktop executables using the provided batch file:
   ```bash
   install.bat
   ```

## Usage (Development)
* To install dependencies manually, run:
   ```bash
   npm install
   ```
* To start the application in development mode, run:
   ```bash
   npm run dev
   ```
* To compile the production web bundle, run:
   ```bash
   npm run build
   ```
* To compile the bundle and package the Windows desktop executables, run:
   ```bash
   npm run dist
   ```

## License
Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments
* Desktop framework by [Electron](https://www.electronjs.org) (MIT License).
* Frontend library by [React](https://react.dev) (MIT License).
* UI framework by [Tailwind CSS](https://tailwindcss.com) (MIT License).
* Icons by [Lucide](https://lucide.dev) (ISC License).