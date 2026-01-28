export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent[];
  timestamp: number;
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; result: string };

export interface ClaudeEvent {
  type: 'init' | 'text' | 'tool_use' | 'tool_result' | 'complete' | 'error';
  session_id: string;
  // For text
  text?: string;
  // For tool_use
  tool_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  // For tool_result
  tool_result?: string;
  // For error
  error?: string;
}

export interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
  isConnected: boolean;
}
