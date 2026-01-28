import React, { useState } from 'react';

const ClauseUI = () => {
  const [showClaudePanel, setShowClaudePanel] = useState(true);
  const [selectedText, setSelectedText] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeFile, setActiveFile] = useState('proposal.md');
  const [showDiff, setShowDiff] = useState(true);

  const bg = darkMode ? 'bg-[#1a1a1a]' : 'bg-white';
  const text = darkMode ? 'text-gray-200' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const border = darkMode ? 'border-gray-700' : 'border-gray-200';
  const sidebarBg = darkMode ? 'bg-[#141414]' : 'bg-[#f7f7f7]';
  const hoverBg = darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100';
  const editorBg = darkMode ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]';

  return (
    <div className={`h-screen w-full ${bg} ${text} flex flex-col font-sans`}>
      {/* Title Bar */}
      <div className={`h-12 ${sidebarBg} border-b ${border} flex items-center px-4 justify-between`}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-4">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-medium">Clause</span>
          <span className={`text-sm ${textMuted}`}>— ~/Documents/q1-proposal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 rounded ${hoverBg} ${textMuted}`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setShowClaudePanel(!showClaudePanel)}
            className={`px-2 py-1 text-xs rounded ${showClaudePanel ? 'bg-indigo-500 text-white' : `${hoverBg} ${textMuted}`}`}
          >
            ⌘\
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - File Tree & Research Queue */}
        <div className={`w-60 ${sidebarBg} border-r ${border} flex flex-col`}>
          {/* File Tree */}
          <div className="flex-1 overflow-auto p-3">
            <div className={`text-xs font-semibold ${textMuted} mb-2 uppercase tracking-wide`}>
              Files
            </div>
            <div className="space-y-0.5">
              <div 
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${activeFile === 'proposal.md' ? (darkMode ? 'bg-gray-800' : 'bg-white shadow-sm') : hoverBg}`}
                onClick={() => setActiveFile('proposal.md')}
              >
                <span className="text-sm">📄</span>
                <span className="text-sm">proposal.md</span>
              </div>
              <div 
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${activeFile === 'executive-summary.md' ? (darkMode ? 'bg-gray-800' : 'bg-white shadow-sm') : hoverBg}`}
                onClick={() => setActiveFile('executive-summary.md')}
              >
                <span className="text-sm">📄</span>
                <span className="text-sm">executive-summary.md</span>
              </div>
              <div 
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${hoverBg}`}
              >
                <span className="text-sm">📄</span>
                <span className="text-sm">appendix.md</span>
              </div>
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${hoverBg}`}>
                <span className="text-sm">📁</span>
                <span className="text-sm">deep-research</span>
              </div>
            </div>
          </div>

          {/* Research Queue */}
          <div className={`border-t ${border} p-3`}>
            <div className={`text-xs font-semibold ${textMuted} mb-2 uppercase tracking-wide flex items-center justify-between`}>
              <span>Research Queue</span>
              <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">2</span>
            </div>
            <div className="space-y-2">
              <div className={`p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${border}`}>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 animate-pulse">⏳</span>
                  <span className="text-xs truncate">Korean semiconductor market...</span>
                </div>
              </div>
              <div className={`p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${border}`}>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-xs truncate">Competitor analysis Q1</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Editor */}
        <div className={`flex-1 flex flex-col ${editorBg} overflow-hidden`}>
          {/* Document Title */}
          <div className={`px-16 pt-12 pb-4`}>
            <h1 className="text-3xl font-bold">Q1 Investment Proposal</h1>
            <p className={`text-sm ${textMuted} mt-1`}>Last edited 2 minutes ago</p>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-auto px-16 pb-16">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold mt-6 mb-3">Executive Summary</h2>
              <p className="mb-4 leading-relaxed">
                The Korean semiconductor industry represents a compelling investment opportunity in 2024. With increasing global demand for AI chips and memory solutions, key players like Samsung and SK Hynix are positioned for significant growth.
              </p>

              {/* Floating Format Bar - shown on selection */}
              {selectedText && (
                <div className={`inline-flex items-center gap-1 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-lg px-2 py-1.5 border ${border} mb-2`}>
                  <button className={`px-2 py-1 text-sm font-bold rounded ${hoverBg}`}>H1</button>
                  <button className={`px-2 py-1 text-sm font-bold rounded ${hoverBg}`}>H2</button>
                  <div className={`w-px h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <button className={`px-2 py-1 text-sm font-bold rounded ${hoverBg}`}>B</button>
                  <button className={`px-2 py-1 text-sm italic rounded ${hoverBg}`}>I</button>
                  <button className={`px-2 py-1 text-sm underline rounded ${hoverBg}`}>U</button>
                  <div className={`w-px h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <button className={`px-2 py-1 text-sm rounded ${hoverBg}`}>🔗</button>
                  <button className={`px-2 py-1 text-sm rounded ${hoverBg}`}>•</button>
                  <div className={`w-px h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <button className="px-3 py-1 text-sm rounded bg-indigo-500 text-white font-medium flex items-center gap-1">
                    ✨ Ask AI
                  </button>
                </div>
              )}

              {/* Selectable paragraph */}
              <p 
                className={`mb-4 leading-relaxed cursor-text ${selectedText ? (darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100') : ''} ${selectedText ? 'rounded px-1 -mx-1' : ''}`}
                onClick={() => setSelectedText(!selectedText)}
              >
                Our analysis indicates that the memory chip segment will experience a 15% year-over-year growth, driven primarily by data center expansion and consumer electronics demand.
                {selectedText && <span className={`text-xs ${textMuted} ml-2`}>(click to deselect)</span>}
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Market Analysis</h2>
              
              {/* Inline Diff Example */}
              {showDiff && (
                <div className={`mb-4 p-3 rounded-lg border-2 border-dashed ${darkMode ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-indigo-300 bg-indigo-50'}`}>
                  <p className="leading-relaxed">
                    The global semiconductor market is projected to reach{' '}
                    <span className="bg-red-200 text-red-800 line-through px-1 rounded">$600 billion</span>{' '}
                    <span className="bg-green-200 text-green-800 px-1 rounded">$682 billion</span>{' '}
                    by 2025, with Asia-Pacific accounting for the{' '}
                    <span className="bg-red-200 text-red-800 line-through px-1 rounded">majority</span>{' '}
                    <span className="bg-green-200 text-green-800 px-1 rounded">largest share at 62%</span>{' '}
                    of global revenue.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button 
                      className="px-3 py-1.5 text-sm rounded bg-green-500 text-white font-medium flex items-center gap-1"
                      onClick={() => setShowDiff(false)}
                    >
                      ✓ Accept
                    </button>
                    <button 
                      className={`px-3 py-1.5 text-sm rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} font-medium flex items-center gap-1`}
                      onClick={() => setShowDiff(false)}
                    >
                      ✗ Deny
                    </button>
                    <span className={`text-xs ${textMuted}`}>Claude updated market figures</span>
                  </div>
                </div>
              )}

              {!showDiff && (
                <p className="mb-4 leading-relaxed">
                  The global semiconductor market is projected to reach $682 billion by 2025, with Asia-Pacific accounting for the largest share at 62% of global revenue.
                </p>
              )}

              <p className="mb-4 leading-relaxed">
                Key growth drivers include artificial intelligence, 5G infrastructure, and the automotive sector's increasing reliance on semiconductor components.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Investment Thesis</h2>
              <p className="mb-4 leading-relaxed">
                We recommend a diversified approach focusing on both established players and emerging fabless companies specializing in AI accelerators.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Claude Code */}
        {showClaudePanel && (
          <div className={`w-96 border-l ${border} flex flex-col ${sidebarBg}`}>
            {/* Claude Header */}
            <div className={`p-3 border-b ${border} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                  C
                </div>
                <span className="font-medium text-sm">Claude</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>
                  Connected
                </span>
              </div>
              <button className={`p-1 rounded ${hoverBg} ${textMuted}`}>
                ⋯
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-3 space-y-4">
              {/* User message */}
              <div className="flex flex-col items-end">
                <div className={`${darkMode ? 'bg-indigo-600' : 'bg-indigo-500'} text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%]`}>
                  <p className="text-sm">Update the market size figures in the Market Analysis section with the latest data</p>
                </div>
                <span className={`text-xs ${textMuted} mt-1`}>2 min ago</span>
              </div>

              {/* Claude response */}
              <div className="flex flex-col items-start">
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border ${border} rounded-2xl rounded-bl-sm px-4 py-2 max-w-[85%]`}>
                  <p className="text-sm mb-2">I'll update the market figures with the latest projections.</p>
                  <div className={`text-xs ${textMuted} p-2 rounded ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} font-mono`}>
                    <span className="text-green-500">Reading</span> proposal.md<br/>
                    <span className="text-yellow-500">Editing</span> Market Analysis section
                  </div>
                </div>
                <span className={`text-xs ${textMuted} mt-1`}>2 min ago</span>
              </div>

              {/* User message with selection context */}
              <div className="flex flex-col items-end">
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg px-3 py-2 max-w-[85%] mb-1`}>
                  <span className={`text-xs ${textMuted}`}>Selected text:</span>
                  <p className="text-xs italic mt-1">"Our analysis indicates that the memory chip segment will experience a 15% year-over-year growth..."</p>
                </div>
                <div className={`${darkMode ? 'bg-indigo-600' : 'bg-indigo-500'} text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%]`}>
                  <p className="text-sm">Make this more concise and add specific company examples</p>
                </div>
                <span className={`text-xs ${textMuted} mt-1`}>Just now</span>
              </div>

              {/* Claude typing indicator */}
              <div className="flex flex-col items-start">
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border ${border} rounded-2xl rounded-bl-sm px-4 py-3`}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className={`p-3 border-t ${border}`}>
              <div className={`flex items-end gap-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${border} rounded-xl p-2`}>
                <textarea 
                  placeholder="Ask Claude to edit, research, or explain..."
                  className={`flex-1 resize-none text-sm ${darkMode ? 'bg-gray-800' : 'bg-white'} outline-none`}
                  rows={2}
                />
                <button className="p-2 rounded-lg bg-indigo-500 text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className={`flex items-center justify-between mt-2 text-xs ${textMuted}`}>
                <span>⌘K with selection • ⌘⇧R for deep research</span>
                <span>proposal.md</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClauseUI;
