import { Message, MessageContent } from "../types/claude";

interface ChatMessageProps {
  message: Message;
  darkMode: boolean;
}

function ToolUseBlock({ content, darkMode }: { content: MessageContent & { type: 'tool_use' }; darkMode: boolean }) {
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";

  // Extract common input fields
  const filePath = content.input?.file_path as string | undefined;
  const fileName = filePath?.split('/').pop() || '';

  // Get tool-specific color
  const getToolColor = (name: string) => {
    switch (name) {
      case 'Bash': return 'text-green-500';
      case 'Read': return 'text-blue-500';
      case 'Write': return 'text-yellow-500';
      case 'Edit': return 'text-orange-500';
      case 'Task': return 'text-purple-500';
      case 'Grep':
      case 'Glob': return 'text-cyan-500';
      default: return 'text-gray-500';
    }
  };

  // Bash command display
  if (content.name === 'Bash') {
    const command = content.input?.command as string | undefined;
    const description = content.input?.description as string | undefined;
    return (
      <div className="my-3">
        <div className="flex items-center gap-2">
          <span className={`${getToolColor('Bash')}`}>●</span>
          <span className="font-semibold">Bash</span>
          {description && (
            <span className={`${textMuted} text-xs`}>{description}</span>
          )}
        </div>
        {command && (
          <div className={`ml-5 mt-1 font-mono text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            $ {command.length > 80 ? command.slice(0, 80) + '...' : command}
          </div>
        )}
      </div>
    );
  }

  // Task/Agent display
  if (content.name === 'Task') {
    const prompt = content.input?.prompt as string | undefined;
    const subagentType = content.input?.subagent_type as string | undefined;
    const agentDescription = content.input?.description as string | undefined;
    return (
      <div className="my-3">
        <div className="flex items-center gap-2">
          <span className={`${getToolColor('Task')}`}>●</span>
          <span className="font-semibold">Task</span>
          {subagentType && (
            <span className="text-purple-400 text-xs">({subagentType})</span>
          )}
          {agentDescription && (
            <span className={`${textMuted} text-xs`}>— {agentDescription}</span>
          )}
        </div>
        {prompt && (
          <div className={`ml-5 mt-1 text-xs ${textMuted}`}>
            {prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}
          </div>
        )}
      </div>
    );
  }

  // Grep/Glob display
  if (content.name === 'Grep' || content.name === 'Glob') {
    const pattern = content.input?.pattern as string | undefined;
    const path = content.input?.path as string | undefined;
    return (
      <div className="my-3">
        <div className="flex items-center gap-2">
          <span className={`${getToolColor(content.name)}`}>●</span>
          <span className="font-semibold">{content.name}</span>
          {pattern && (
            <code className={`text-xs px-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {pattern}
            </code>
          )}
          {path && (
            <span className={`${textMuted} text-xs`}>in {path}</span>
          )}
        </div>
      </div>
    );
  }

  // Read file display
  if (content.name === 'Read') {
    const limit = content.input?.limit as number | undefined;
    const offset = content.input?.offset as number | undefined;
    return (
      <div className="my-3">
        <div className="flex items-center gap-2">
          <span className={`${getToolColor('Read')}`}>●</span>
          <span className="font-semibold">Read</span>
          {filePath && (
            <span className={`${textMuted} text-sm`}>{fileName}</span>
          )}
          {(limit || offset) && (
            <span className={`${textMuted} text-xs`}>
              {offset ? `from line ${offset}` : ''}{limit ? `, ${limit} lines` : ''}
            </span>
          )}
        </div>
        {filePath && (
          <div className={`ml-5 mt-1 text-xs ${textMuted}`}>
            {filePath}
          </div>
        )}
      </div>
    );
  }

  // Edit tool display
  if (content.name === 'Edit') {
    const oldString = content.input?.old_string as string | undefined;
    const newString = content.input?.new_string as string | undefined;
    return (
      <div className="my-3">
        <div className="flex items-center gap-2">
          <span className={`${getToolColor('Edit')}`}>●</span>
          <span className="font-semibold">Edit</span>
          {filePath && (
            <span className={`${textMuted} text-sm`}>{fileName}</span>
          )}
        </div>
        {(oldString || newString) && (
          <div className={`mt-2 ml-5 rounded-lg overflow-hidden border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
            <div className="max-h-32 overflow-auto text-xs font-mono">
              {oldString && (
                <div className={`px-2 py-1 ${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
                  - {oldString.split('\n')[0]}{oldString.split('\n').length > 1 ? '...' : ''}
                </div>
              )}
              {newString && (
                <div className={`px-2 py-1 ${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'}`}>
                  + {newString.split('\n')[0]}{newString.split('\n').length > 1 ? '...' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Write tool display
  if (content.name === 'Write') {
    const writeContent = content.input?.content as string | undefined;
    return (
      <div className="my-3">
        <div className="flex items-center gap-2">
          <span className={`${getToolColor('Write')}`}>●</span>
          <span className="font-semibold">Write</span>
          {filePath && (
            <span className={`${textMuted} text-sm`}>{fileName}</span>
          )}
        </div>
        {writeContent && (
          <div className={`mt-2 ml-5 rounded-lg overflow-hidden border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
            <div className="max-h-32 overflow-auto">
              {writeContent.split('\n').slice(0, 6).map((line, i) => (
                <div key={i} className="flex text-xs font-mono">
                  <span className={`w-8 text-right pr-2 select-none ${textMuted}`}>{i + 1}</span>
                  <span className={`flex-1 px-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    {line || ' '}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default display for other tools
  return (
    <div className="my-3">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">●</span>
        <span className="font-semibold">{content.name}</span>
        {filePath && (
          <span className={`${textMuted} text-sm`}>{fileName}</span>
        )}
      </div>
    </div>
  );
}

function ToolResultBlock({ content, darkMode }: { content: MessageContent & { type: 'tool_result' }; darkMode: boolean }) {
  const textMuted = darkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`flex items-center gap-1 ml-5 mb-2 text-sm ${textMuted}`}>
      <span>└</span>
      <span>{content.result}</span>
    </div>
  );
}

function TextBlock({ text, darkMode }: { text: string; darkMode: boolean }) {
  return (
    <div className="flex items-start gap-2 my-2">
      <span className={`mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>●</span>
      <div className={`whitespace-pre-wrap break-words text-sm flex-1 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
        {text}
      </div>
    </div>
  );
}

export function ChatMessage({ message, darkMode }: ChatMessageProps) {
  const isUser = message.role === "user";
  const border = darkMode ? "border-gray-700" : "border-gray-300";

  if (isUser) {
    // User messages - rounded box style like the reference
    const text = message.content
      .filter((c): c is MessageContent & { type: 'text' } => c.type === 'text')
      .map(c => c.text)
      .join('');

    return (
      <div className="mb-4">
        <div className={`px-4 py-3 rounded-xl border ${border} ${darkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
          <div className="text-sm">{text}</div>
        </div>
      </div>
    );
  }

  // Assistant messages - show all content blocks
  return (
    <div className="mb-4">
      {message.content.map((block, index) => {
        switch (block.type) {
          case 'text':
            return <TextBlock key={index} text={block.text} darkMode={darkMode} />;
          case 'tool_use':
            return <ToolUseBlock key={index} content={block} darkMode={darkMode} />;
          case 'tool_result':
            return <ToolResultBlock key={index} content={block} darkMode={darkMode} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
