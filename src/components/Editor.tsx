import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Markdown } from "tiptap-markdown";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as Diff from "diff";

import { FloatingToolbar } from "./FloatingToolbar";

interface EditorProps {
  filePath: string | null;
  darkMode: boolean;
  onAddToContext: (text: string) => void;
}

interface FileChangeEvent {
  path: string;
  kind: string;
}

interface DiffChange {
  id: string;
  added?: string;
  removed?: string;
  value: string;
  position: number; // Character position in original text
}

export function Editor({ filePath, darkMode, onAddToContext }: EditorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDiffs, setPendingDiffs] = useState<DiffChange[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPathRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const lastSavedContentRef = useRef<string>("");
  const preChangeContentRef = useRef<string>(""); // Content before external change
  const isLoadingExternalRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px]",
      },
    },
    onUpdate: ({ editor }) => {
      // Don't trigger auto-save when loading external changes
      if (isLoadingExternalRef.current) return;

      // Debounced auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (currentPathRef.current && editor) {
          // Get markdown content using the extension
          const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
          const markdown = storage.markdown?.getMarkdown() || editor.getText();
          saveFile(currentPathRef.current, markdown);
        }
      }, 500);
    },
  });

  const saveFile = useCallback(async (path: string, content: string) => {
    isSavingRef.current = true;
    lastSaveTimeRef.current = Date.now();
    lastSavedContentRef.current = content;

    try {
      await invoke("write_file", { path, content });
    } catch (err) {
      console.error("Failed to save file:", err);
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 100);
    }
  }, []);

  const computeDiffs = useCallback((oldContent: string, newContent: string): DiffChange[] => {
    const changes = Diff.diffWords(oldContent, newContent);
    const diffs: DiffChange[] = [];
    let position = 0;

    changes.forEach((change, index) => {
      if (change.added || change.removed) {
        diffs.push({
          id: `diff-${Date.now()}-${index}`,
          added: change.added ? change.value : undefined,
          removed: change.removed ? change.value : undefined,
          value: change.value,
          position,
        });
      }
      if (!change.added) {
        position += change.value.length;
      }
    });

    return diffs;
  }, []);

  const loadFile = useCallback(async (showDiffs = false) => {
    if (!filePath || !editor) {
      return;
    }

    setLoading(true);
    setError(null);
    currentPathRef.current = filePath;

    try {
      const newContent = await invoke<string>("read_file", { path: filePath });

      if (showDiffs && lastSavedContentRef.current && lastSavedContentRef.current !== newContent) {
        // Store the pre-change content for potential revert
        preChangeContentRef.current = lastSavedContentRef.current;
        // Compute diffs between old and new content
        const diffs = computeDiffs(lastSavedContentRef.current, newContent);
        if (diffs.length > 0) {
          setPendingDiffs(diffs);
        }
      }

      // Update content
      isLoadingExternalRef.current = true;
      editor.commands.setContent(newContent);
      lastSavedContentRef.current = newContent;
      isLoadingExternalRef.current = false;
    } catch (err) {
      setError(String(err));
      editor.commands.setContent("");
    } finally {
      setLoading(false);
    }
  }, [filePath, editor, computeDiffs]);

  // Load file content when filePath changes
  useEffect(() => {
    if (currentPathRef.current !== filePath) {
      setPendingDiffs([]); // Clear diffs when switching files
      loadFile(false);
    }
  }, [filePath, loadFile]);

  // Listen for external file changes
  useEffect(() => {
    const unlisten = listen<FileChangeEvent>("file-change", (event) => {
      const { path, kind } = event.payload;

      if (path === currentPathRef.current && kind === "modify") {
        const timeSinceSave = Date.now() - lastSaveTimeRef.current;
        if (isSavingRef.current || timeSinceSave < 1000) {
          return;
        }
        // Auto-reload and show diffs instead of just showing notification
        loadFile(true);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadFile]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleAcceptAll = useCallback(() => {
    // Diffs are already applied to the content, just clear them
    setPendingDiffs([]);
    // Save the current state
    if (currentPathRef.current && editor) {
      const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
      const markdown = storage.markdown?.getMarkdown() || editor.getText();
      saveFile(currentPathRef.current, markdown);
    }
  }, [editor, saveFile]);

  const handleDenyAll = useCallback(async () => {
    // Revert to the content before the external change
    if (currentPathRef.current && editor && preChangeContentRef.current) {
      isLoadingExternalRef.current = true;
      editor.commands.setContent(preChangeContentRef.current);
      isLoadingExternalRef.current = false;

      // Save the reverted content back to file
      await saveFile(currentPathRef.current, preChangeContentRef.current);
      lastSavedContentRef.current = preChangeContentRef.current;
      preChangeContentRef.current = "";
      setPendingDiffs([]);
    }
  }, [editor, saveFile]);

  // Keyboard shortcuts for diffs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pendingDiffs.length === 0) return;

      // Cmd+Enter or Cmd+Shift+Enter to Accept All
      if (e.metaKey && e.key === "Enter") {
        e.preventDefault();
        handleAcceptAll();
      }
      // Cmd+Backspace to Deny All
      if (e.metaKey && e.key === "Backspace") {
        e.preventDefault();
        handleDenyAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingDiffs, handleAcceptAll, handleDenyAll]);

  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";

  if (loading) {
    return (
      <div className={`text-sm ${textMuted} p-4`}>
        Loading file...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className={`editor-container relative ${darkMode ? "dark-editor" : ""}`}>
      {/* Pending diffs notification */}
      {pendingDiffs.length > 0 && (
        <div className={`mb-4 p-4 rounded-lg border ${
          darkMode
            ? "bg-indigo-900/20 border-indigo-700"
            : "bg-indigo-50 border-indigo-200"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-sm font-medium ${darkMode ? "text-indigo-200" : "text-indigo-800"}`}>
                Claude made {pendingDiffs.length} change{pendingDiffs.length > 1 ? "s" : ""} to this file
              </p>
              <p className={`text-xs mt-1 ${darkMode ? "text-indigo-300/70" : "text-indigo-600/70"}`}>
                Review the changes below
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAcceptAll}
                className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1"
                title="Accept All (⌘Enter)"
              >
                <span>✓</span> Accept All
                <span className="opacity-60 ml-1">⌘↵</span>
              </button>
              <button
                onClick={handleDenyAll}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                } transition-colors flex items-center gap-1`}
                title="Deny All (⌘⌫)"
              >
                <span>✗</span> Deny All
                <span className="opacity-60 ml-1">⌘⌫</span>
              </button>
            </div>
          </div>

          {/* Show diff summary */}
          <div className={`text-xs space-y-1 p-2 rounded ${
            darkMode ? "bg-gray-800/50" : "bg-white/50"
          }`}>
            {pendingDiffs.map((diff) => (
              <div key={diff.id} className="flex items-start gap-2">
                {diff.removed && (
                  <span className={`inline-block px-1 rounded ${
                    darkMode ? "bg-red-900/50 text-red-300" : "bg-red-100 text-red-700"
                  }`}>
                    <span className="line-through">{diff.removed.slice(0, 50)}{diff.removed.length > 50 ? "..." : ""}</span>
                  </span>
                )}
                {diff.removed && diff.added && <span className={textMuted}>→</span>}
                {diff.added && (
                  <span className={`inline-block px-1 rounded ${
                    darkMode ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700"
                  }`}>
                    {diff.added.slice(0, 50)}{diff.added.length > 50 ? "..." : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <FloatingToolbar
          editor={editor}
          darkMode={darkMode}
          onAddToContext={onAddToContext}
        />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
