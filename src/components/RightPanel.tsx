interface RightPanelProps {
  isOpen: boolean;
  darkMode: boolean;
}

export function RightPanel({ isOpen, darkMode }: RightPanelProps) {
  if (!isOpen) return null;

  const sidebarBg = darkMode ? "bg-[#141414]" : "bg-[#f7f7f7]";
  const border = darkMode ? "border-gray-700" : "border-gray-200";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";
  const hoverBg = darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100";

  return (
    <div className={`w-96 border-l ${border} flex flex-col ${sidebarBg}`}>
      {/* Claude Header */}
      <div className={`p-3 border-b ${border} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
            C
          </div>
          <span className="font-medium text-sm">Claude</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-700"}`}>
            Connected
          </span>
        </div>
        <button className={`p-1 rounded ${hoverBg} ${textMuted}`}>
          ⋯
        </button>
      </div>

      {/* Chat Messages Placeholder */}
      <div className="flex-1 overflow-auto p-3">
        <div className={`text-center ${textMuted} mt-8`}>
          <p className="text-sm">Start a conversation with Claude</p>
          <p className="text-xs mt-2">Select text and use ➕ to add context</p>
        </div>
      </div>

      {/* Input Area */}
      <div className={`p-3 border-t ${border}`}>
        <div className={`flex items-end gap-2 ${darkMode ? "bg-gray-800" : "bg-white"} border ${border} rounded-xl p-2`}>
          <textarea
            placeholder="Ask Claude to edit, research, or explain..."
            className={`flex-1 resize-none text-sm ${darkMode ? "bg-gray-800" : "bg-white"} outline-none`}
            rows={2}
          />
          <button className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className={`flex items-center justify-between mt-2 text-xs ${textMuted}`}>
          <span>⌘K with selection • ⌘⇧R for deep research</span>
        </div>
      </div>
    </div>
  );
}
