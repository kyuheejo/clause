import { useState } from "react";

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark", !darkMode);
  };

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
          <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            — ~/Documents
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className={`p-1.5 rounded transition-colors ${
              darkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"
            }`}
            title="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* Main content area placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Clause</h1>
          <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            A writing IDE powered by Claude Code
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
