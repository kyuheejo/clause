import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface EditorProps {
  filePath: string | null;
  darkMode: boolean;
  onLastEdited: (time: Date | null) => void;
}

interface FileChangeEvent {
  path: string;
  kind: string;
}

export function Editor({ filePath, darkMode, onLastEdited }: EditorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [externalChange, setExternalChange] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPathRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);

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
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px]",
      },
    },
    onUpdate: ({ editor }) => {
      // Debounced auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (currentPathRef.current) {
          saveFile(currentPathRef.current, editor.getHTML());
        }
      }, 500);
    },
  });

  const saveFile = useCallback(async (path: string, content: string) => {
    isSavingRef.current = true;
    lastSaveTimeRef.current = Date.now();

    // Convert HTML to plain text/markdown-like format for saving
    const textContent = content
      .replace(/<h1[^>]*>/g, "# ")
      .replace(/<\/h1>/g, "\n\n")
      .replace(/<h2[^>]*>/g, "## ")
      .replace(/<\/h2>/g, "\n\n")
      .replace(/<h3[^>]*>/g, "### ")
      .replace(/<\/h3>/g, "\n\n")
      .replace(/<p[^>]*>/g, "")
      .replace(/<\/p>/g, "\n\n")
      .replace(/<strong>/g, "**")
      .replace(/<\/strong>/g, "**")
      .replace(/<em>/g, "*")
      .replace(/<\/em>/g, "*")
      .replace(/<ul>/g, "")
      .replace(/<\/ul>/g, "\n")
      .replace(/<li>/g, "- ")
      .replace(/<\/li>/g, "\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    try {
      await invoke("write_file", { path, content: textContent });
      onLastEdited(new Date());
    } catch (err) {
      console.error("Failed to save file:", err);
    } finally {
      // Give some time for the file system event to propagate
      setTimeout(() => {
        isSavingRef.current = false;
      }, 100);
    }
  }, [onLastEdited]);

  const loadFile = useCallback(async () => {
    if (!filePath || !editor) {
      return;
    }

    setLoading(true);
    setError(null);
    setExternalChange(false);
    currentPathRef.current = filePath;

    try {
      const content = await invoke<string>("read_file", { path: filePath });

      // Convert markdown to HTML for TipTap
      const htmlContent = content
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/^- (.+)$/gm, "<li>$1</li>")
        .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/^(.+)$/gm, (match) => {
          if (match.startsWith("<")) return match;
          return `<p>${match}</p>`;
        })
        .replace(/<p><\/p>/g, "")
        .replace(/<p>(<h[123]>)/g, "$1")
        .replace(/(<\/h[123]>)<\/p>/g, "$1")
        .replace(/<p>(<ul>)/g, "$1")
        .replace(/(<\/ul>)<\/p>/g, "$1");

      editor.commands.setContent(htmlContent || "<p></p>");
      onLastEdited(new Date());
    } catch (err) {
      setError(String(err));
      editor.commands.setContent("<p></p>");
    } finally {
      setLoading(false);
    }
  }, [filePath, editor, onLastEdited]);

  // Load file content when filePath changes
  useEffect(() => {
    if (currentPathRef.current !== filePath) {
      loadFile();
    }
  }, [filePath, loadFile]);

  // Listen for external file changes
  useEffect(() => {
    const unlisten = listen<FileChangeEvent>("file-change", (event) => {
      const { path, kind } = event.payload;

      // Check if this is the current file
      if (path === currentPathRef.current && kind === "modify") {
        // Ignore if we just saved (within last 1 second)
        const timeSinceSave = Date.now() - lastSaveTimeRef.current;
        if (isSavingRef.current || timeSinceSave < 1000) {
          return;
        }

        // Show external change notification
        setExternalChange(true);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleReload = () => {
    loadFile();
  };

  const handleDismiss = () => {
    setExternalChange(false);
  };

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
    <div className={`editor-container ${darkMode ? "dark-editor" : ""}`}>
      {/* External change notification */}
      {externalChange && (
        <div className={`mb-4 p-3 rounded-lg border ${
          darkMode
            ? "bg-yellow-900/20 border-yellow-700 text-yellow-200"
            : "bg-yellow-50 border-yellow-200 text-yellow-800"
        }`}>
          <p className="text-sm font-medium">File changed externally</p>
          <p className="text-xs mt-1 opacity-80">
            This file was modified outside of Clause.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleReload}
              className="px-3 py-1 text-xs rounded bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={handleDismiss}
              className={`px-3 py-1 text-xs rounded ${
                darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
              } transition-colors`}
            >
              Keep my version
            </button>
          </div>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
