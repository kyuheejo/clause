# Clause

> A beautiful writing IDE powered by Claude Code. Cursor for writers.

## Overview

Clause is a desktop application for macOS that provides a writing-focused environment with embedded Claude Code integration. It combines a document viewer/editor with Claude's filesystem-native AI capabilities, enabling writers to create, edit, and research documents with AI assistance directly in their file system.

**Target Users:** Writers, researchers, proposal writers, content creators who want AI-assisted document editing without leaving their filesystem workflow.

**Core Insight:** Claude Code already has excellent file reading/writing capabilities. Instead of rebuilding AI interactions from scratch, Clause wraps Claude Code in a beautiful writing-focused UI.

### Document Format Support

**V1 Approach (Hybrid):**
- **Viewing:** Use `docx-preview` / `mammoth.js` to render documents in-app
- **Editing:** Claude edits files programmatically using python libraries (`python-docx`, `python-pptx`)
- **Fallback:** "Open in Word/PowerPoint" button for complex formatting needs

| Format | View | AI Edit | Manual Edit |
|--------|------|---------|-------------|
| `.docx` | ✅ docx-preview | ✅ python-docx | Open externally |
| `.pptx` | ✅ pptx-preview | ✅ python-pptx | Open externally |
| `.md` | ✅ TipTap WYSIWYG | ✅ Direct text | ✅ In-app |
| `.pdf` | ✅ Native preview | ❌ | ❌ |

**V2 Consideration:** OnlyOffice Developer Edition ($1,500+) for full in-app editing with Automation API.

---

## Architecture

### Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | **Tauri 2.0** | Rust backend, ~10x smaller than Electron, native file system access, used by Hyprnote |
| Frontend | **React + TypeScript** | Familiar ecosystem, same stack as Hyprnote |
| Editor (Markdown) | **TipTap** | ProseMirror-based WYSIWYG, better for prose than CodeMirror, supports inline diffs and decorations |
| Viewer (DOCX) | **docx-preview** | Renders .docx to HTML with good fidelity, pure client-side |
| Viewer (PPTX) | **pptx-preview** | Renders .pptx slides to HTML |
| AI Editing | **python-docx / python-pptx** | Claude uses these via subprocess to edit Office files |
| Styling | **Tailwind CSS** | Rapid iteration, consistent design |
| State | **Zustand** | Lightweight, works well with React |
| File Watching | **Tauri fs-watch** | Native file system events |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Clause App                              │
├─────────────────┬───────────────────────┬───────────────────────┤
│   Left Panel    │    Center Panel       │    Right Panel        │
│                 │                       │    (Toggle: Cmd+\)    │
│  ┌───────────┐  │  ┌─────────────────┐  │  ┌─────────────────┐  │
│  │ File Tree │  │  │                 │  │  │                 │  │
│  │           │  │  │    TipTap       │  │  │   Claude Code   │  │
│  │ /docs     │  │  │    WYSIWYG      │  │  │   Session       │  │
│  │  ├─ a.md  │  │  │    Editor       │  │  │                 │  │
│  │  └─ b.md  │  │  │                 │  │  │   [Chat UI]     │  │
│  │           │  │  │  ┌───────────┐  │  │  │                 │  │
│  ├───────────┤  │  │  │ Floating  │  │  │  │   > make this   │  │
│  │ Research  │  │  │  │ Format    │  │  │  │     concise     │  │
│  │ Queue     │  │  │  │ Bar       │  │  │  │                 │  │
│  │           │  │  │  └───────────┘  │  │  │   [Tool calls]  │  │
│  │ ⏳ Task 1 │  │  │                 │  │  │   [Responses]   │  │
│  │ ✓ Task 2  │  │  │                 │  │  │                 │  │
│  └───────────┘  │  └─────────────────┘  │  └─────────────────┘  │
├─────────────────┴───────────────────────┴───────────────────────┤
│                    Claude Code CLI (subprocess)                  │
│                    - Persistent session                          │
│                    - Uses Claude Code subscription               │
│                    - Direct filesystem access                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Three-Panel Layout

#### Left Panel (Collapsible)
- **File Tree:** Shows current working folder
  - Click to open file in editor
  - Right-click context menu (rename, delete, new file)
  - Drag to reorder (optional v2)
- **Research Queue:** Shows background research tasks
  - Status indicators: ⏳ pending, 🔄 running, ✓ complete, ✗ failed
  - Click completed task to open result file
  - Notification badge when tasks complete

#### Center Panel
- **Document Viewer/Editor**
  - For `.md` files: TipTap WYSIWYG editor (like Typora/Notion)
  - For `.docx` files: docx-preview rendering (read-only display, Claude edits programmatically)
  - For `.pptx` files: pptx-preview rendering (read-only display, Claude edits programmatically)
  - Floating format bar on text selection
  - Inline diff display for AI edits (markdown only in v1)
  - Auto-saves to filesystem
  - "Open in Word/PowerPoint" button for external editing

#### Right Panel (Toggle: Cmd+\)
- **Embedded Claude Code Session**
  - Full Claude Code chat interface
  - Shows conversation history
  - Displays tool calls (file reads, edits)
  - **@ Mentions System** for adding context (like Cursor/Antigravity)
  - **Context chips** showing referenced selections/files
  - Persistent session while app is open

### 2. Floating Format Bar

Appears when user selects text in the editor/viewer. Two AI-specific buttons plus standard formatting.

**Layout:** `[ ➕ Add to Context | 💬 Comment | B I U S | Link ]`

**AI Buttons:**

1. **➕ Add to Context** (speech bubble with plus icon)
   - Adds selected text as a context chip in the Claude panel
   - Chip shows truncated preview: `📍 "The market is projected to..."`
   - Multiple selections can be added before sending message
   - Chips can be removed with × button

2. **💬 Comment** *(V2 - not in initial release)*
   - Opens inline comment input
   - Comments collected and sent to Claude as batch
   - For now, users should use Add to Context + describe in chat

**Standard formatting buttons** work immediately on selection (markdown files only).

### 3. @ Mentions System

Cursor/Antigravity-style context picker in the Claude panel.

**Trigger:**
- Type `@` in chat input → opens picker
- Click **+** button → opens picker

**Picker Categories:**
```
┌─────────────────────────────────┐
│  ADD CONTEXT                    │
├─────────────────────────────────┤
│  📄 Files          →            │
│  📁 Directories    →            │
│  📍 Selections     →            │
│  🔍 Search in file →            │
└─────────────────────────────────┘
```

**Usage Examples:**
- `@proposal.docx` — Reference entire file
- `@deep-research/` — Reference folder contents
- `@proposal.docx:15-30` — Reference specific paragraphs (v2)
- Selections from ➕ button appear under "📍 Selections"

**Context Display:**
Referenced items appear as chips above the input:
```
┌─────────────────────────────────────────┐
│ 📄 proposal.docx  × │ 📍 "The market..." × │
├─────────────────────────────────────────┤
│ Summarize the key findings              │
└─────────────────────────────────────────┘
```

### 4. Claude Code Integration

#### Session Management
- **Lazy start:** Session spawns on first request (not app launch)
- **Persistent:** Single session maintained while app is open
- **Subprocess:** Runs `claude` CLI as a child process
- **Communication:** stdin/stdout streaming with JSON parsing

#### Context Handling
- **@ Mentions:** User explicitly adds files/folders via `@` picker
- **Selection context:** User adds via ➕ button in format bar → appears as chip
- **Current file:** Optionally auto-included (user preference)
- **On-demand:** Claude can read any file in the working folder when needed
- No pre-indexing or embeddings - Claude reads files directly (agent-style)

#### Edit Flow (Markdown)
1. User requests edit via Claude panel
2. Claude processes request
3. Claude uses `str_replace` style edit (text matching)
4. File watcher detects change
5. Editor shows inline diff at edit location
6. User clicks Accept ✓ or Deny ✗

#### Edit Flow (DOCX/PPTX)
1. User requests edit via Claude panel with `@document.docx`
2. Claude processes request
3. Claude uses `python-docx` or `python-pptx` to modify file
4. File watcher detects change
5. Document preview re-renders
6. User reviews changes (full re-render, no inline diff in v1)

### 5. Inline Diff Display (Markdown Only)

When Claude edits a file, the editor shows:

```
The quick brown fox jumps over the ~~lazy~~ **sleepy** dog.
                                     [Accept ✓] [Deny ✗]
```

**Visual treatment:**
- Deleted text: strikethrough + red background
- Added text: green background
- Buttons appear inline or in a small floating pill
- Multiple edits can be shown simultaneously
- "Accept All" / "Deny All" option for multiple changes

### 6. Deep Research

Triggered by explicit command: `/research <topic>` or button in UI.

#### Flow
1. User types `/research market size for Korean semiconductor equipment`
2. Task added to Research Queue with ⏳ status
3. **Fresh Claude session** spawns (isolated from main editing session)
4. Claude performs research (web search, analysis)
5. Results saved to `/deep-research/<topic-slug>.md`
6. Task status updates to ✓
7. macOS notification: "Research complete: Korean semiconductor market size"
8. User can click to open result or drag into current document

#### Output Format
```markdown
# Market Size: Korean Semiconductor Equipment

> Research completed: 2024-01-28

## Key Findings

- The Korean semiconductor equipment market was valued at $12.3 billion in 2024
- Expected to grow at 8.2% CAGR through 2030
- Samsung and SK Hynix account for 67% of domestic demand
- Key growth drivers: AI chips, HBM memory expansion

## Sources

1. [SEMI Industry Report Q4 2024](https://semi.org/...) - Accessed 2024-01-28
2. [Korea Semiconductor Industry Association](https://ksia.or.kr/...) - Accessed 2024-01-28
3. [Bloomberg: SK Hynix Expansion Plans](https://bloomberg.com/...) - Accessed 2024-01-28
```

### 7. Export System

Exports handled by Claude using bundled skills.

#### Bundled Skills (v1)
- `export-pptx` - Markdown → Presentation (via sli.dev)
- `export-docx` - Markdown → Word document (via pandoc)
- `export-pdf` - Markdown → PDF (via pandoc)

#### Flow
1. User: "Export this as a presentation" or clicks Export → PPTX
2. Claude reads the skill file for instructions
3. Claude intelligently structures content:
   - Decides slide breaks
   - Creates titles and bullet points
   - Adds speaker notes where appropriate
4. Claude runs build command (e.g., `slidev build`)
5. Output file saved to same folder or `/exports`
6. Notification + file opens

#### Skill File Example (`/skills/export-pptx.md`)
```markdown
# Export to PPTX Skill

## Instructions
Convert the markdown document to a sli.dev presentation.

## Guidelines
- Each H1 becomes a section divider slide
- Each H2 becomes a slide title
- Bullet points under H2 become slide content
- Keep max 5 bullets per slide
- Long paragraphs → speaker notes
- Code blocks → syntax-highlighted slides
- Images → full-bleed slides

## Execution
1. Create `slides.md` in sli.dev format
2. Run `npx slidev build --out dist`
3. Convert to PPTX: `npx slidev export --format pptx`
4. Move output to original document folder
```

---

## User Interface

### Visual Design

**Inspiration:** Obsidian, Typora, Notion, Hyprnote

**Principles:**
- Clean, minimal chrome
- Focus on content
- Dark and light mode
- Native macOS feel (traffic lights, fonts)

**Color Palette (Light Mode):**
- Background: #FFFFFF
- Editor background: #FAFAFA
- Sidebar: #F5F5F5
- Text: #1A1A1A
- Accent: #6366F1 (Indigo)
- Success: #22C55E (Green)
- Danger: #EF4444 (Red)

**Typography:**
- Editor: System font or user-configurable (SF Pro, iA Writer Duo, etc.)
- UI: SF Pro Text
- Monospace: SF Mono / JetBrains Mono

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Claude panel | `Cmd + \` |
| Toggle file tree | `Cmd + B` |
| New file | `Cmd + N` |
| Open file | `Cmd + O` |
| Save | `Cmd + S` |
| Add selection to context | `Cmd + K` (with selection) |
| Open @ mention picker | `@` in chat input |
| Deep research | `Cmd + Shift + R` |
| Export | `Cmd + E` |
| Accept diff | `Cmd + Enter` |
| Deny diff | `Cmd + Backspace` |
| Accept all diffs | `Cmd + Shift + Enter` |

### Notifications

- **Research complete:** macOS native notification with action to open
- **Export complete:** macOS native notification with action to reveal in Finder
- **Claude error:** In-app toast with error message

---

## File Structure

### App Data Location
```
~/Library/Application Support/Clause/
├── config.json           # User preferences
├── sessions/             # Claude session persistence (optional)
└── skills/               # Bundled skill files
    ├── export-pptx.md
    ├── export-docx.md
    └── export-pdf.md
```

### Working Folder Structure (User's Project)
```
/Users/hello/Documents/my-proposal/
├── proposal.md           # User's document
├── notes.md              # Another document
├── deep-research/        # Auto-created for research results
│   ├── korean-semiconductor-market.md
│   └── competitor-analysis.md
└── exports/              # Auto-created for exports (optional)
    └── proposal.pptx
```

---

## Technical Implementation

### Tauri Commands (Rust → TypeScript)

```rust
// File operations
#[tauri::command]
fn read_file(path: String) -> Result<String, String>

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String>

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String>

#[tauri::command]
fn watch_file(path: String) -> Result<(), String>

// Claude Code integration
#[tauri::command]
fn start_claude_session(working_dir: String) -> Result<SessionId, String>

#[tauri::command]
fn send_to_claude(session_id: SessionId, message: String) -> Result<(), String>

#[tauri::command]
fn stop_claude_session(session_id: SessionId) -> Result<(), String>

// Research queue
#[tauri::command]
fn start_research(topic: String, working_dir: String) -> Result<TaskId, String>

#[tauri::command]
fn get_research_status(task_id: TaskId) -> Result<TaskStatus, String>
```

### Claude Code Subprocess

```rust
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Write};

struct ClaudeSession {
    process: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl ClaudeSession {
    fn new(working_dir: &str) -> Result<Self> {
        let mut process = Command::new("claude")
            .current_dir(working_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        
        // ... setup stdin/stdout handles
    }
    
    fn send(&mut self, message: &str) -> Result<()> {
        writeln!(self.stdin, "{}", message)?;
        Ok(())
    }
    
    fn receive(&mut self) -> Result<String> {
        // Read streaming response
        // Parse JSON events
        // Return formatted response
    }
}
```

### TipTap Editor Setup

```typescript
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { DiffExtension } from './extensions/diff'
import { FloatingMenu } from './components/FloatingMenu'

const Editor = ({ filePath, content, onSave }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      DiffExtension,  // Custom extension for inline diffs
    ],
    content,
    onUpdate: ({ editor }) => {
      // Auto-save debounced
      debouncedSave(filePath, editor.getHTML())
    },
  })

  return (
    <>
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor} />
    </>
  )
}
```

### Diff Display Extension

```typescript
// Custom TipTap extension for showing diffs
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const DiffExtension = Extension.create({
  name: 'diff',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('diff'),
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => {
            // Update decorations based on pending diffs
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
```

---

## Edge Cases & Error Handling

### File Conflicts
**Scenario:** User edits while Claude is processing.
**Solution:** When Claude's edit arrives, if the target text has changed:
1. Show warning: "The text was modified since this edit was requested"
2. Options: "Apply Anyway" / "Re-run" / "Dismiss"

### Claude Session Errors
**Scenario:** Claude Code crashes or rate limits.
**Solution:**
1. Show error in Claude panel
2. Offer "Restart Session" button
3. Queue pending requests for retry

### Large Files
**Scenario:** User opens very large markdown file (>1MB).
**Solution:**
1. Warn user about potential performance
2. Send to Claude in chunks if needed
3. Consider pagination for extremely large docs (v2)

### Network Issues
**Scenario:** Deep research fails due to network.
**Solution:**
1. Mark task as failed in queue
2. Show error reason
3. Offer "Retry" button

### Unsaved Changes
**Scenario:** User closes app with pending diffs.
**Solution:**
1. Show dialog: "You have pending AI edits. Accept All / Deny All / Cancel"
2. Unsaved content changes trigger standard "Save?" dialog

---

## V1 Scope

### Included
- [x] Tauri app shell with 3-panel layout
- [x] File tree browser (read folder, open files)
- [x] Document viewing: TipTap for .md, docx-preview for .docx, pptx-preview for .pptx
- [x] Floating format bar with ➕ Add to Context button
- [x] Embedded Claude Code session (right panel, toggleable)
- [x] **@ Mentions system** — add files, folders, selections to context
- [x] **Context chips** — visual display of referenced content
- [x] AI editing via python-docx/python-pptx for Office files
- [x] Inline diff display with Accept/Deny (markdown only)
- [x] File watching for external changes
- [x] Deep research with background queue
- [x] Research results saved to `/deep-research`
- [x] Export via bundled skills (pptx, docx, pdf)
- [x] macOS notifications
- [x] Dark/light mode
- [x] Basic keyboard shortcuts

### Not Included (V2+)
- [ ] Inline comment/annotation system (batch comments → Claude)
- [ ] Full in-app Office editing (OnlyOffice Developer Edition)
- [ ] Inline diffs for Office documents
- [ ] User-customizable skills
- [ ] Multiple Claude sessions
- [ ] Collaboration / sync
- [ ] Windows/Linux support
- [ ] Mobile companion app
- [ ] Plugin system
- [ ] Version history / undo tree
- [ ] Folder-wide search
- [ ] Templates gallery
- [ ] AI-suggested edits (proactive)

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Tauri project setup
- [ ] Basic 3-panel layout
- [ ] File tree component
- [ ] Document viewer: TipTap for .md, docx-preview for .docx
- [ ] File read/write/watch

### Phase 2: Claude Integration (Week 3-4)
- [ ] Claude Code subprocess management
- [ ] Chat UI in right panel
- [ ] @ Mentions picker UI
- [ ] Context chips display
- [ ] Basic request/response flow

### Phase 3: Context & Editing Flow (Week 5-6)
- [ ] ➕ Add to Context button in format bar
- [ ] Selection → context chip flow
- [ ] Inline diff extension for TipTap (markdown)
- [ ] Accept/Deny UI
- [ ] python-docx/python-pptx integration for Office edits

### Phase 4: Research & Export (Week 7-8)
- [ ] Deep research queue
- [ ] Background sessions
- [ ] Notification system
- [ ] Export skills
- [ ] sli.dev/pandoc integration

### Phase 5: Polish (Week 9-10)
- [ ] Dark/light mode
- [ ] Keyboard shortcuts
- [ ] Error handling
- [ ] Performance optimization
- [ ] macOS code signing
- [ ] Beta testing

---

## Open Questions

1. **Session persistence:** Should Claude conversation history persist across app restarts?
2. **Multiple files:** How to handle when user has multiple files open as tabs?
3. **Conflict resolution:** When Claude's edit can't be applied cleanly, show manual merge UI?
4. **Offline mode:** Should the app work offline for basic editing (AI features disabled)?
5. **Pricing/distribution:** Standalone app? Requires user's own Claude Code subscription?

---

## References

- [Hyprnote](https://github.com/fastrepl/hyprnote) - Tauri + React architecture reference
- [Opennote Feynman-3](https://x.com/opennote) - UI/UX inspiration
- [TipTap](https://tiptap.dev/) - Editor framework
- [Tauri](https://tauri.app/) - Desktop framework
- [sli.dev](https://sli.dev/) - Markdown to presentation
- [Claude Code](https://claude.ai/code) - AI backend

---

*Spec version: 1.0*
*Last updated: January 28, 2026*
*Author: Hello + Claude*