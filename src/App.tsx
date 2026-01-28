import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LeftPanel } from "./components/LeftPanel";
import { CenterPanel } from "./components/CenterPanel";
import { RightPanel } from "./components/RightPanel";

// Default working directory for development
const DEFAULT_ROOT_PATH = "/Users/kyuheejo/Documents/clause-test";

export interface ContextChip {
  id: string;
  type: "selection" | "file";
  text: string;
  filePath: string | null;
  preview: string;
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [rootPath] = useState(DEFAULT_ROOT_PATH);
  const [contextChips, setContextChips] = useState<ContextChip[]>([]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark", !darkMode);
  };

  const handleSelectFile = (path: string) => {
    setActiveFile(path);
  };

  const handleAddToContext = (text: string, filePath: string | null) => {
    const preview = text.length > 50 ? text.substring(0, 50) + "..." : text;
    const newChip: ContextChip = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: "selection",
      text,
      filePath,
      preview,
    };
    setContextChips((prev) => [...prev, newChip]);

    // Open Claude panel if it's closed
    if (!rightPanelOpen) {
      setRightPanelOpen(true);
    }
  };

  const handleRemoveChip = (id: string) => {
    setContextChips((prev) => prev.filter((chip) => chip.id !== id));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd+\ to toggle Claude panel (right)
    if (e.metaKey && e.key === "\\") {
      e.preventDefault();
      setRightPanelOpen((prev) => !prev);
    }
    // Cmd+B to toggle file tree (left)
    if (e.metaKey && e.key === "b") {
      e.preventDefault();
      setLeftPanelOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Start watching the directory for changes
  useEffect(() => {
    invoke("watch_directory", { path: rootPath }).catch((err) => {
      console.error("Failed to watch directory:", err);
    });
  }, [rootPath]);

  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";
  const hoverBg = darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100";

  // Extract folder name from root path for display
  const folderName = rootPath.split("/").pop() || "Documents";

  return (
    <div className={`h-screen w-full flex flex-col ${darkMode ? "bg-[#1a1a1a] text-gray-200" : "bg-white text-gray-900"}`}>
      {/* Title Bar */}
      <div
        className={`title-bar h-12 flex items-center px-4 justify-between border-b ${
          darkMode ? "bg-[#141414] border-gray-700" : "bg-[#f7f7f7] border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Traffic light buttons placeholder (handled by macOS) */}
          <div className="flex gap-1.5 mr-4">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
          </div>
          <span className="text-sm font-medium">Clause</span>
          <span className={`text-sm ${textMuted}`}>— ~/{folderName}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle left panel */}
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              leftPanelOpen ? "bg-indigo-500 text-white" : `${hoverBg} ${textMuted}`
            }`}
            title="Toggle file tree (⌘B)"
          >
            ⌘B
          </button>
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className={`p-1.5 rounded transition-colors ${hoverBg} ${textMuted}`}
            title="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          {/* Toggle right panel */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              rightPanelOpen ? "bg-indigo-500 text-white" : `${hoverBg} ${textMuted}`
            }`}
            title="Toggle Claude panel (⌘\\)"
          >
            ⌘\
          </button>
        </div>
      </div>

      {/* Main content with three panels */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          isOpen={leftPanelOpen}
          darkMode={darkMode}
          rootPath={rootPath}
          activeFile={activeFile}
          onSelectFile={handleSelectFile}
        />
        <CenterPanel
          darkMode={darkMode}
          activeFile={activeFile}
          onAddToContext={handleAddToContext}
        />
        <RightPanel
          isOpen={rightPanelOpen}
          darkMode={darkMode}
          contextChips={contextChips}
          onRemoveChip={handleRemoveChip}
        />
      </div>
    </div>
  );
}

export default App;
