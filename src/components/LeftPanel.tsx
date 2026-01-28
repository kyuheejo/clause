interface LeftPanelProps {
  isOpen: boolean;
  darkMode: boolean;
}

export function LeftPanel({ isOpen, darkMode }: LeftPanelProps) {
  if (!isOpen) return null;

  const sidebarBg = darkMode ? "bg-[#141414]" : "bg-[#f7f7f7]";
  const border = darkMode ? "border-gray-700" : "border-gray-200";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";
  const hoverBg = darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100";
  const activeBg = darkMode ? "bg-gray-800" : "bg-white shadow-sm";

  return (
    <div className={`w-60 ${sidebarBg} border-r ${border} flex flex-col`}>
      {/* File Tree */}
      <div className="flex-1 overflow-auto p-3">
        <div className={`text-xs font-semibold ${textMuted} mb-2 uppercase tracking-wide`}>
          Files
        </div>
        <div className="space-y-0.5">
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${activeBg}`}>
            <span className="text-sm">📄</span>
            <span className="text-sm">proposal.md</span>
          </div>
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${hoverBg}`}>
            <span className="text-sm">📄</span>
            <span className="text-sm">notes.md</span>
          </div>
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${hoverBg}`}>
            <span className="text-sm">📁</span>
            <span className="text-sm">research</span>
          </div>
        </div>
      </div>

      {/* Research Queue */}
      <div className={`border-t ${border} p-3`}>
        <div className={`text-xs font-semibold ${textMuted} mb-2 uppercase tracking-wide flex items-center justify-between`}>
          <span>Research Queue</span>
          <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">1</span>
        </div>
        <div className="space-y-2">
          <div className={`p-2 rounded ${darkMode ? "bg-gray-800" : "bg-white"} border ${border}`}>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500 animate-pulse">⏳</span>
              <span className="text-xs truncate">Market research...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
