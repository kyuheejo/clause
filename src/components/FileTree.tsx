import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

interface FileTreeProps {
  rootPath: string;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  darkMode: boolean;
}

interface FileTreeItemProps {
  entry: FileEntry;
  level: number;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  darkMode: boolean;
}

function FileTreeItem({ entry, level, activeFile, onSelectFile, darkMode }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);

  const isActive = activeFile === entry.path;
  const hoverBg = darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100";
  const activeBg = darkMode ? "bg-gray-800" : "bg-white shadow-sm";

  const loadChildren = useCallback(async () => {
    if (!entry.is_dir) return;
    try {
      const result = await invoke<FileEntry[]>("list_directory", { path: entry.path });
      setChildren(result);
    } catch (error) {
      console.error("Failed to load directory:", error);
      setChildren([]);
    }
  }, [entry.path, entry.is_dir]);

  // Listen for file changes in this directory
  useEffect(() => {
    if (!entry.is_dir || !expanded) return;

    const unlisten = listen<{ path: string; kind: string }>("file-change", (event) => {
      const { path, kind } = event.payload;
      // Check if the change is directly in this directory
      if (path.startsWith(entry.path + "/") && (kind === "create" || kind === "remove")) {
        loadChildren();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [entry.path, entry.is_dir, expanded, loadChildren]);

  const handleClick = async () => {
    if (entry.is_dir) {
      if (!expanded && children === null) {
        await loadChildren();
      }
      setExpanded(!expanded);
    } else {
      onSelectFile(entry.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
          isActive ? activeBg : hoverBg
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="text-sm">
          {entry.is_dir ? (expanded ? "📂" : "📁") : "📄"}
        </span>
        <span className="text-sm truncate">{entry.name}</span>
      </div>
      {entry.is_dir && expanded && children && (
        <div>
          {children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              level={level + 1}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
              darkMode={darkMode}
            />
          ))}
          {children.length === 0 && (
            <div
              className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"} italic`}
              style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
            >
              Empty folder
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FileChangeEvent {
  path: string;
  kind: string;
}

export function FileTree({ rootPath, activeFile, onSelectFile, darkMode }: FileTreeProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDirectory = useCallback(async () => {
    if (!rootPath) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await invoke<FileEntry[]>("list_directory", { path: rootPath });
      setEntries(result);
    } catch (err) {
      setError(String(err));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [rootPath]);

  // Load directory on mount and when rootPath changes
  useEffect(() => {
    loadDirectory();
  }, [loadDirectory, refreshKey]);

  // Listen for file system changes (create/remove) and refresh
  useEffect(() => {
    const unlisten = listen<FileChangeEvent>("file-change", (event) => {
      const { path, kind } = event.payload;

      // Check if the change is within our root path
      if (path.startsWith(rootPath)) {
        // Refresh on create or remove events
        if (kind === "create" || kind === "remove") {
          setRefreshKey((prev) => prev + 1);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [rootPath]);

  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";

  if (loading) {
    return (
      <div className={`text-sm ${textMuted} p-2`}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-red-500 p-2`}>
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={`text-sm ${textMuted} p-2`}>
        No files found
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {entries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          level={0}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
}
