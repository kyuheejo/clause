import { Editor } from "./Editor";

interface CenterPanelProps {
  darkMode: boolean;
  activeFile: string | null;
  openTabs: string[];
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onAddToContext: (text: string, filePath: string | null, lineRange?: string) => void;
}


export function CenterPanel({
  darkMode,
  activeFile,
  openTabs,
  onSelectTab,
  onCloseTab,
  onAddToContext
}: CenterPanelProps) {
  const editorBg = darkMode ? "bg-[#1e1e1e]" : "bg-[#fafafa]";
  const tabBarBg = darkMode ? "bg-[#252526]" : "bg-[#f3f3f3]";
  const tabBg = darkMode ? "bg-[#1e1e1e]" : "bg-[#ffffff]";
  const tabInactiveBg = darkMode ? "bg-[#2d2d2d]" : "bg-[#ececec]";
  const tabBorder = darkMode ? "border-gray-700" : "border-gray-300";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";
  const textActive = darkMode ? "text-gray-100" : "text-gray-900";

  // Check if file is markdown
  const isMarkdown = activeFile?.endsWith(".md");

  const handleAddToContext = (text: string) => {
    onAddToContext(text, activeFile);
  };

  return (
    <div className={`flex-1 flex flex-col ${editorBg} overflow-hidden`}>
      {/* Tab Bar */}
      {openTabs.length > 0 && (
        <div className={`flex items-end ${tabBarBg} border-b ${tabBorder} min-h-[36px]`}>
          <div className="flex overflow-x-auto scrollbar-hide">
            {openTabs.map((tabPath) => {
              const fileName = tabPath.split('/').pop() || 'Untitled';
              const isActive = tabPath === activeFile;

              return (
                <div
                  key={tabPath}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer border-r ${tabBorder} min-w-[100px] max-w-[200px] ${
                    isActive
                      ? `${tabBg} ${textActive} border-t-2 border-t-indigo-500`
                      : `${tabInactiveBg} ${textMuted} hover:bg-opacity-80 border-t-2 border-t-transparent`
                  }`}
                  onClick={() => onSelectTab(tabPath)}
                >
                  <span className="text-sm truncate flex-1">{fileName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tabPath);
                    }}
                    className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-500/20 ${
                      isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:opacity-100'
                    }`}
                    title="Close tab"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-auto" style={{ paddingLeft: '128px', paddingRight: '128px', paddingTop: '24px', paddingBottom: '64px' }}>
        <div className="max-w-2xl mx-auto">
          {activeFile && isMarkdown ? (
            <Editor
              filePath={activeFile}
              darkMode={darkMode}
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
