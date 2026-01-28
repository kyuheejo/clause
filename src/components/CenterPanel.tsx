interface CenterPanelProps {
  darkMode: boolean;
  activeFile: string | null;
}

export function CenterPanel({ darkMode, activeFile }: CenterPanelProps) {
  const editorBg = darkMode ? "bg-[#1e1e1e]" : "bg-[#fafafa]";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";

  // Extract file name from path
  const fileName = activeFile ? activeFile.split("/").pop() : null;

  return (
    <div className={`flex-1 flex flex-col ${editorBg} overflow-hidden`}>
      {/* Document Title */}
      <div className="px-16 pt-12 pb-4">
        <h1 className="text-3xl font-bold">
          {fileName || "Untitled Document"}
        </h1>
        <p className={`text-sm ${textMuted} mt-1`}>
          {activeFile ? `Editing ${fileName}` : "No file selected"}
        </p>
      </div>

      {/* Editor Content Placeholder */}
      <div className="flex-1 overflow-auto px-16 pb-16">
        <div className="max-w-2xl mx-auto">
          {activeFile ? (
            <p className={`${textMuted}`}>
              Loading editor for: {activeFile}
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
