import { useState } from "react";
import { Editor } from "./Editor";

interface CenterPanelProps {
  darkMode: boolean;
  activeFile: string | null;
  onAddToContext: (text: string, filePath: string | null) => void;
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 120) return "1 minute ago";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return "1 hour ago";
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export function CenterPanel({ darkMode, activeFile, onAddToContext }: CenterPanelProps) {
  const [lastEdited, setLastEdited] = useState<Date | null>(null);

  const editorBg = darkMode ? "bg-[#1e1e1e]" : "bg-[#fafafa]";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";

  // Extract file name from path
  const fileName = activeFile ? activeFile.split("/").pop() : null;

  // Check if file is markdown
  const isMarkdown = activeFile?.endsWith(".md");

  const handleAddToContext = (text: string) => {
    onAddToContext(text, activeFile);
  };

  return (
    <div className={`flex-1 flex flex-col ${editorBg} overflow-hidden`}>
      {/* Document Title */}
      <div className="px-16 pt-12 pb-4">
        <h1 className="text-3xl font-bold">
          {fileName?.replace(".md", "") || "Untitled Document"}
        </h1>
        <p className={`text-sm ${textMuted} mt-1`}>
          {lastEdited
            ? `Last edited ${formatTimeAgo(lastEdited)}`
            : activeFile
            ? `Editing ${fileName}`
            : "No file selected"}
        </p>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto px-16 pb-16">
        <div className="max-w-2xl mx-auto">
          {activeFile && isMarkdown ? (
            <Editor
              filePath={activeFile}
              darkMode={darkMode}
              onLastEdited={setLastEdited}
              onAddToContext={handleAddToContext}
            />
          ) : activeFile ? (
            <p className={`${textMuted}`}>
              Unsupported file type. Only .md files are editable.
            </p>
          ) : (
            <p className={`${textMuted} text-center mt-8`}>
              Select a file from the sidebar to start editing
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
