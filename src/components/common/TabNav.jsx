import React from 'react';
import { Cpu, Terminal, MessageSquare, Code, Bug } from 'lucide-react';

export const TabNav = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="w-full max-w-4xl flex justify-between gap-4 border-b border-[#30363d] -mt-1.5 mb-8 overflow-x-auto no-scrollbar relative z-10">
      {/* 1. Simulated Terminal (Leftmost) */}
      <button
        onClick={() => setActiveTab('simulated')}
        className={`pb-[18px] font-medium text-sm flex items-center gap-2 transition-colors relative whitespace-nowrap ${
          activeTab === 'simulated' ? 'tab-active font-bold' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Cpu className="w-4 h-4" /> Simulated Terminal
        {activeTab === 'simulated' && <div className="absolute bottom-0 left-0 w-full h-0.5 tab-indicator rounded-t-md z-20"></div>}
      </button>

      {/* 2. Interactive Terminal */}
      <button
        onClick={() => setActiveTab('interactive')}
        className={`pb-[18px] font-medium text-sm flex items-center gap-2 transition-colors relative whitespace-nowrap ${
          activeTab === 'interactive' ? 'tab-active font-bold' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Terminal className="w-4 h-4" /> Interactive Terminal
        {activeTab === 'interactive' && <div className="absolute bottom-0 left-0 w-full h-0.5 tab-indicator rounded-t-md z-20"></div>}
      </button>

      {/* 3. Command Builder */}
      <button
        onClick={() => setActiveTab('builder')}
        className={`pb-[18px] font-medium text-sm flex items-center gap-2 transition-colors relative whitespace-nowrap ${
          activeTab === 'builder' ? 'tab-active font-bold' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <MessageSquare className="w-4 h-4" /> Command Builder
        {activeTab === 'builder' && <div className="absolute bottom-0 left-0 w-full h-0.5 tab-indicator rounded-t-md z-20"></div>}
      </button>

      {/* 4. Code Analyzer */}
      <button
        onClick={() => setActiveTab('analyzer')}
        className={`pb-[18px] font-medium text-sm flex items-center gap-2 transition-colors relative whitespace-nowrap ${
          activeTab === 'analyzer' ? 'tab-active font-bold' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Code className="w-4 h-4" /> Code Analyzer
        {activeTab === 'analyzer' && <div className="absolute bottom-0 left-0 w-full h-0.5 tab-indicator rounded-t-md z-20"></div>}
      </button>

      {/* 5. General Debugger */}
      <button
        onClick={() => setActiveTab('debugger')}
        className={`pb-[18px] font-medium text-sm flex items-center gap-2 transition-colors relative whitespace-nowrap ${
          activeTab === 'debugger' ? 'tab-active font-bold' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Bug className="w-4 h-4" /> General Debugger
        {activeTab === 'debugger' && <div className="absolute bottom-0 left-0 w-full h-0.5 tab-indicator rounded-t-md z-20"></div>}
      </button>
    </nav>
  );
};

export default TabNav;