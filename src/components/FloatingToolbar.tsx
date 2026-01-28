import { useEffect, useState, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";

interface FloatingToolbarProps {
  editor: Editor | null;
  darkMode: boolean;
  onAddToContext: (text: string) => void;
}

export function FloatingToolbar({ editor, darkMode, onAddToContext }: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updateToolbar = useCallback(() => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;

    if (empty) {
      setIsVisible(false);
      return;
    }

    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) {
      setIsVisible(false);
      return;
    }

    setSelectedText(text);

    // Get the selection coordinates
    const view = editor.view;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    // Position toolbar above the selection
    const editorElement = view.dom.getBoundingClientRect();
    const top = start.top - editorElement.top - 45; // 45px above selection
    const left = (start.left + end.left) / 2 - editorElement.left;

    setPosition({ top, left });
    setIsVisible(true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    editor.on("selectionUpdate", updateToolbar);
    editor.on("blur", () => {
      // Delay hiding to allow clicking toolbar buttons
      setTimeout(() => setIsVisible(false), 200);
    });

    return () => {
      editor.off("selectionUpdate", updateToolbar);
    };
  }, [editor, updateToolbar]);

  if (!editor || !isVisible) {
    return null;
  }

  const buttonBase = `px-2 py-1 text-sm rounded transition-colors`;
  const buttonStyle = darkMode
    ? `${buttonBase} hover:bg-gray-700`
    : `${buttonBase} hover:bg-gray-100`;
  const activeStyle = darkMode
    ? "bg-gray-700 text-white"
    : "bg-gray-200 text-gray-900";
  const dividerStyle = darkMode ? "bg-gray-600" : "bg-gray-300";

  const handleAddToContext = () => {
    if (selectedText.trim()) {
      onAddToContext(selectedText);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className={`absolute z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-lg border ${
        darkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {/* Heading buttons */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`${buttonStyle} font-bold ${
          editor.isActive("heading", { level: 1 }) ? activeStyle : ""
        }`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${buttonStyle} font-bold ${
          editor.isActive("heading", { level: 2 }) ? activeStyle : ""
        }`}
        title="Heading 2"
      >
        H2
      </button>

      <div className={`w-px h-4 ${dividerStyle}`}></div>

      {/* Format buttons */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${buttonStyle} font-bold ${
          editor.isActive("bold") ? activeStyle : ""
        }`}
        title="Bold"
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${buttonStyle} italic ${
          editor.isActive("italic") ? activeStyle : ""
        }`}
        title="Italic"
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${buttonStyle} line-through ${
          editor.isActive("strike") ? activeStyle : ""
        }`}
        title="Strikethrough"
      >
        S
      </button>

      <div className={`w-px h-4 ${dividerStyle}`}></div>

      {/* List button */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${buttonStyle} ${
          editor.isActive("bulletList") ? activeStyle : ""
        }`}
        title="Bullet List"
      >
        •
      </button>

      <div className={`w-px h-4 ${dividerStyle}`}></div>

      {/* Add to Context button */}
      <button
        onClick={handleAddToContext}
        className="px-3 py-1 text-sm rounded bg-indigo-500 text-white font-medium flex items-center gap-1 hover:bg-indigo-600 transition-colors"
        title="Add to Claude context (⌘K)"
      >
        ➕ Context
      </button>
    </div>
  );
}
