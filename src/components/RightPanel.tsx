import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ContextChip } from "../App";
import { ChatMessage } from "./ChatMessage";
import { Message, MessageContent, ClaudeEvent } from "../types/claude";

interface RightPanelProps {
  isOpen: boolean;
  darkMode: boolean;
  contextChips: ContextChip[];
  onRemoveChip: (id: string) => void;
  workingDir: string;
}

export function RightPanel({ isOpen, darkMode, contextChips, onRemoveChip, workingDir }: RightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track pending tool uses to match with results
  const pendingToolsRef = useRef<Map<string, { name: string; input: Record<string, unknown> }>>(new Map());

  // Check if Claude CLI is available on mount
  useEffect(() => {
    async function checkClaude() {
      try {
        const available = await invoke<boolean>("check_claude_available");
        setIsConnected(available);
      } catch {
        setIsConnected(false);
      }
    }
    checkClaude();
  }, []);

  // Listen for Claude events
  useEffect(() => {
    const unlisten = listen<ClaudeEvent>("claude-event", (event) => {
      const e = event.payload;

      // Update session ID if we got one
      if (e.session_id) {
        setSessionId(e.session_id);
      }

      switch (e.type) {
        case "init":
          setStatusText("Thinking...");
          break;

        case "text":
          if (e.text) {
            const textContent = e.text; // Capture in variable for TypeScript
            setStatusText(null);
            setMessages((prev) => {
              // Find the last assistant message to append to
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === "assistant") {
                // Check if last content block is text, append to it
                const lastContent = lastMsg.content[lastMsg.content.length - 1];
                if (lastContent && lastContent.type === "text") {
                  const newContent: MessageContent[] = [...lastMsg.content];
                  newContent[newContent.length - 1] = {
                    type: "text" as const,
                    text: lastContent.text + textContent,
                  };
                  return [...prev.slice(0, -1), { ...lastMsg, content: newContent }];
                } else {
                  // Add new text block
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, content: [...lastMsg.content, { type: "text" as const, text: textContent }] },
                  ];
                }
              } else {
                // Create new assistant message
                return [
                  ...prev,
                  {
                    id: `msg-${Date.now()}`,
                    role: "assistant" as const,
                    content: [{ type: "text" as const, text: textContent }],
                    timestamp: Date.now(),
                  },
                ];
              }
            });
          }
          break;

        case "tool_use":
          if (e.tool_name && e.tool_id) {
            // Create descriptive status based on tool type and input
            const toolInput = (e.tool_input as Record<string, unknown>) || {};
            let status = `Running ${e.tool_name}...`;

            if (e.tool_name === 'Read' && toolInput.file_path) {
              const fileName = (toolInput.file_path as string).split('/').pop();
              status = `Reading ${fileName}...`;
            } else if (e.tool_name === 'Write' && toolInput.file_path) {
              const fileName = (toolInput.file_path as string).split('/').pop();
              status = `Writing ${fileName}...`;
            } else if (e.tool_name === 'Edit' && toolInput.file_path) {
              const fileName = (toolInput.file_path as string).split('/').pop();
              status = `Editing ${fileName}...`;
            } else if (e.tool_name === 'Bash' && toolInput.description) {
              status = `${toolInput.description}...`;
            } else if (e.tool_name === 'Task' && toolInput.subagent_type) {
              status = `Spawning ${toolInput.subagent_type} agent...`;
            } else if (e.tool_name === 'Grep' && toolInput.pattern) {
              status = `Searching for "${(toolInput.pattern as string).slice(0, 30)}"...`;
            } else if (e.tool_name === 'Glob' && toolInput.pattern) {
              status = `Finding files matching "${toolInput.pattern}"...`;
            }

            setStatusText(status);
            // Store for later matching
            pendingToolsRef.current.set(e.tool_id, {
              name: e.tool_name,
              input: toolInput,
            });

            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              const toolContent: MessageContent = {
                type: "tool_use",
                id: e.tool_id!,
                name: e.tool_name!,
                input: (e.tool_input as Record<string, unknown>) || {},
              };

              if (lastMsg && lastMsg.role === "assistant") {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: [...lastMsg.content, toolContent] },
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: `msg-${Date.now()}`,
                    role: "assistant",
                    content: [toolContent],
                    timestamp: Date.now(),
                  },
                ];
              }
            });
          }
          break;

        case "tool_result":
          if (e.tool_id) {
            const toolInfo = pendingToolsRef.current.get(e.tool_id);
            setStatusText("Analyzing results...");

            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              const resultContent: MessageContent = {
                type: "tool_result",
                id: e.tool_id!,
                name: toolInfo?.name || e.tool_name || "Tool",
                result: e.tool_result || "Completed",
              };

              if (lastMsg && lastMsg.role === "assistant") {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: [...lastMsg.content, resultContent] },
                ];
              }
              return prev;
            });

            pendingToolsRef.current.delete(e.tool_id);
          }
          break;

        case "complete":
          setIsLoading(false);
          setStatusText(null);
          break;

        case "error":
          setIsLoading(false);
          setStatusText(null);
          if (e.error) {
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: [{ type: "text", text: `Error: ${e.error}` }],
                timestamp: Date.now(),
              },
            ]);
          }
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusText]);

  const handleSend = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: [{ type: "text", text: trimmedInput }],
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setStatusText("Thinking...");

    // Build context from chips
    const context = contextChips.length > 0
      ? contextChips.map((chip) => `From ${chip.fileName} (lines ${chip.lineRange}):\n${chip.text}`).join("\n\n")
      : undefined;

    try {
      await invoke<string>("send_to_claude", {
        message: trimmedInput,
        sessionId,
        workingDir: workingDir || ".",
        context,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsLoading(false);
      setStatusText(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: [{ type: "text", text: `Failed to send message: ${error}` }],
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const sidebarBg = darkMode ? "bg-[#141414]" : "bg-[#f7f7f7]";
  const border = darkMode ? "border-gray-700" : "border-gray-200";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";
  const hoverBg = darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100";
  const chipBg = darkMode ? "bg-gray-800" : "bg-gray-100";

  return (
    <div className={`w-96 border-l ${border} flex flex-col ${sidebarBg}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${border} flex items-center justify-between`}>
        <div className="flex items-center gap-1">
          <span className="font-medium">Chat</span>
          <svg className={`w-4 h-4 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? "bg-red-900 text-red-300" : "bg-red-100 text-red-700"}`}>
              CLI Not Found
            </span>
          )}
          <button className={`p-1 rounded ${hoverBg} ${textMuted}`} title="New chat">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button className={`p-1 rounded ${hoverBg} ${textMuted}`} title="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-3">
        {messages.length === 0 && !statusText ? (
          <div className={`text-center ${textMuted} mt-8`}>
            <p className="text-sm">Start a conversation with Claude</p>
            <p className="text-xs mt-2">Select text and use + to add context</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} darkMode={darkMode} />
            ))}
            {statusText && (
              <div className="flex items-center gap-2 text-sm my-2">
                <span className="animate-spin text-orange-400">✳</span>
                <span className={textMuted}>{statusText}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className={`border-t ${border}`}>
        {/* Text Input */}
        <div className={`m-3 rounded-xl border ${border} ${darkMode ? "bg-gray-800/50" : "bg-white"}`}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Queue another message..." : "Ask Claude..."}
            disabled={!isConnected}
            className={`w-full resize-none text-sm p-3 rounded-xl ${
              darkMode ? "bg-transparent" : "bg-transparent"
            } outline-none disabled:opacity-50 placeholder:${textMuted}`}
            rows={1}
          />
        </div>

        {/* Bottom bar with context */}
        <div className={`px-3 pb-3 flex items-center justify-between text-xs ${textMuted}`}>
          <div className="flex items-center gap-3">
            {contextChips.length > 0 && (
              <div className="flex items-center gap-2">
                {contextChips.map((chip) => (
                  <div
                    key={chip.id}
                    className={`flex items-center gap-1 px-2 py-1 rounded ${chipBg}`}
                  >
                    <span>📎</span>
                    <span className="truncate max-w-[100px]">{chip.fileName}</span>
                    <button
                      onClick={() => onRemoveChip(chip.id)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>/</span>
            <button
              onClick={handleSend}
              disabled={!isConnected || !inputValue.trim()}
              className={`p-1 rounded ${!isConnected || !inputValue.trim() ? 'opacity-50' : hoverBg}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
