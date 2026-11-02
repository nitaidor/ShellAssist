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

## Prerequisites
Before you begin, ensure you have met the following requirements:
* [Node.js](https://nodejs.org/) installed
* API key (Gemini, ChatGPT, Claude) or local Ollama

## Installation
Clone the repository:
   ```bash
   git clone https://github.com/nitaidor/ShellAssist.git
   ```
Navigate to the project directory:
   ```bash
   cd ShellAssist
   ```
Install dependencies and build the executables using the provided batch file:
   ```bash
   install.bat
   ```

## Usage
To start the application in development mode, run:
   ```bash
   npm run dev
   ```
To run the build process, run:
   ```bash
   npm run dist
   ```

## Acknowledgments
* Icons by [Lucide](https://lucide.dev) (ISC License)
* UI framework by [Tailwind CSS](https://tailwindcss.com) (MIT License)