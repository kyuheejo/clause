import { FileTree } from "./FileTree";

interface LeftPanelProps {
  isOpen: boolean;
  darkMode: boolean;
  rootPath: string;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

export function LeftPanel({ isOpen, darkMode, rootPath, activeFile, onSelectFile }: LeftPanelProps) {
  if (!isOpen) return null;

  const sidebarBg = darkMode ? "bg-[#141414]" : "bg-[#f7f7f7]";
  const border = darkMode ? "border-gray-700" : "border-gray-200";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`w-60 ${sidebarBg} border-r ${border} flex flex-col`}>
      {/* File Tree */}
      <div className="flex-1 overflow-auto p-3">
        <div className={`text-xs font-semibold ${textMuted} mb-2 uppercase tracking-wide`}>
          Files
        </div>
        <FileTree
          rootPath={rootPath}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
          darkMode={darkMode}
        />
      </div>

      {/* Research Queue */}
      <div className={`border-t ${border} p-3`}>
        <div className={`text-xs font-semibold ${textMuted} mb-2 uppercase tracking-wide flex items-center justify-between`}>
          <span>Research Queue</span>
          <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">0</span>
        </div>
        <div className={`text-xs ${textMuted} text-center py-2`}>
          No active research
        </div>
      </div>
    </div>
  );
}
