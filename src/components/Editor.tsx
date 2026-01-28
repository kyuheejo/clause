import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { invoke } from "@tauri-apps/api/core";

interface EditorProps {
  filePath: string | null;
  darkMode: boolean;
  onLastEdited: (time: Date | null) => void;
}

export function Editor({ filePath, darkMode, onLastEdited }: EditorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPathRef = useRef<string | null>(null);

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
    // Convert HTML to plain text/markdown-like format for saving
    // For now, we'll save the HTML content
    // In a full implementation, you'd convert to proper markdown
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
    }
  }, [onLastEdited]);

  // Load file content when filePath changes
  useEffect(() => {
    async function loadFile() {
      if (!filePath || !editor) {
        return;
      }

      // Don't reload if it's the same file
      if (currentPathRef.current === filePath) {
        return;
      }

      setLoading(true);
      setError(null);
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
    }

    loadFile();
  }, [filePath, editor, onLastEdited]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
      <EditorContent editor={editor} />
    </div>
  );
}
