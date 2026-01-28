import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Agentation } from "agentation";
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
  fileName: string;
  lineRange: string;
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [rootPath, setRootPath] = useState(DEFAULT_ROOT_PATH);
  const [contextChips, setContextChips] = useState<ContextChip[]>([]);

  const handleOpenFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open Folder",
    });
    if (selected && typeof selected === "string") {
      setRootPath(selected);
      setActiveFile(null);
      setOpenTabs([]);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark", !darkMode);
  };

  const handleSelectFile = (path: string) => {
    setActiveFile(path);
    // Add to open tabs if not already open
    setOpenTabs((prev) => {
      if (!prev.includes(path)) {
        return [...prev, path];
      }
      return prev;
    });
  };

  const handleCloseTab = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter((tab) => tab !== path);
      // If closing the active tab, switch to another tab
      if (activeFile === path) {
        const closingIndex = prev.indexOf(path);
        if (newTabs.length > 0) {
          // Prefer the tab to the left, otherwise the first tab
          const newActiveIndex = Math.min(closingIndex, newTabs.length - 1);
          setActiveFile(newTabs[newActiveIndex]);
        } else {
          setActiveFile(null);
        }
      }
      return newTabs;
    });
  }, [activeFile]);

  const handleSelectTab = (path: string) => {
    setActiveFile(path);
  };

  const handleAddToContext = (text: string, filePath: string | null, lineRange?: string) => {
    const preview = text.length > 50 ? text.substring(0, 50) + "..." : text;
    const fileName = filePath ? filePath.split("/").pop() || "unknown" : "selection";
    const newChip: ContextChip = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: "selection",
      text,
      filePath,
      preview,
      fileName,
      lineRange: lineRange || "snippet",
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
    // Cmd+W to close active tab
    if (e.metaKey && e.key === "w") {
      e.preventDefault();
      if (activeFile) {
        handleCloseTab(activeFile);
      }
    }
  }, [activeFile, handleCloseTab]);

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
        <div className="flex items-center ml-16">
          <span className="text-sm font-medium">Clause</span>
          <button
            onClick={handleOpenFolder}
            className={`text-sm ${textMuted} ml-1 ${hoverBg} px-1 rounded cursor-pointer`}
            title="Click to open different folder"
          >
            — {folderName} ▾
          </button>
          {activeFile && (
            <>
              <span className={`text-sm ${textMuted} ml-1`}>—</span>
              <span className="text-sm ml-1">{activeFile.split('/').pop()}</span>
            </>
          )}
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
          openTabs={openTabs}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onAddToContext={handleAddToContext}
        />
        <RightPanel
          isOpen={rightPanelOpen}
          darkMode={darkMode}
          contextChips={contextChips}
          onRemoveChip={handleRemoveChip}
          workingDir={rootPath}
        />
      </div>
      <Agentation />
    </div>
  );
}

export default App;
