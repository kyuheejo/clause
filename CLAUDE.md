# Clause - Claude Code Project Guide

> A beautiful writing IDE powered by Claude Code. Cursor for writers.

## Project Overview

Clause is a macOS desktop application that combines a document editor with embedded Claude Code integration. Writers can create, edit, and research documents with AI assistance directly in their filesystem.

**Target Users:** Writers, researchers, proposal writers, content creators

**Core Insight:** Wrap Claude Code's excellent file capabilities in a writing-focused UI.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Tauri 2.0 (Rust backend) |
| Frontend | React + TypeScript |
| Editor | TipTap (ProseMirror-based WYSIWYG) |
| Styling | Tailwind CSS |
| State | Zustand |
| File Watching | Tauri fs-watch |

## Directory Structure

```
clause/
├── CLAUDE.md           # This file - project guide for Claude Code
├── SPEC.md             # Full specification document
├── clause-ui-design.jsx # UI prototype reference
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── index.html
├── src/                 # Frontend (React + TypeScript)
│   ├── main.tsx         # React entry point
│   ├── App.tsx          # Main app component
│   ├── components/      # React components
│   │   ├── LeftPanel.tsx
│   │   ├── CenterPanel.tsx
│   │   ├── RightPanel.tsx
│   │   ├── FileTree.tsx
│   │   ├── Editor.tsx
│   │   ├── FloatingToolbar.tsx
│   │   └── ClaudePanel.tsx
│   ├── store/           # Zustand state management
│   │   └── useStore.ts
│   └── styles/          # CSS/Tailwind
│       └── globals.css
└── src-tauri/           # Backend (Rust)
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/
        ├── main.rs
        └── lib.rs
```

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev

# Build for production
npm run tauri build

# TypeScript check
npm run typecheck

# Lint
npm run lint
```

## Code Style Guidelines

### TypeScript/React
- Use functional components with hooks
- Prefer `const` over `let`
- Use TypeScript strict mode
- Name components in PascalCase, files in PascalCase.tsx
- Use descriptive variable names

### Rust
- Follow Rust naming conventions (snake_case for functions/variables)
- Use `Result<T, E>` for error handling
- Document public functions with `///` comments

### Tailwind CSS
- Use Tailwind utility classes
- Define CSS variables for theme colors in globals.css
- Support both dark and light modes

## Key Patterns

### State Management (Zustand)
```typescript
// Store shape
interface AppStore {
  activeFile: string | null;
  files: FileEntry[];
  claudePanelOpen: boolean;
  filePanelOpen: boolean;
  contextChips: ContextChip[];
  darkMode: boolean;
  pendingDiffs: Diff[];
}
```

### Tauri Commands
Frontend calls Rust backend via:
```typescript
import { invoke } from '@tauri-apps/api/core';
const content = await invoke<string>('read_file', { path: '/path/to/file.md' });
```

### File Operations
- Use Tauri commands for all file I/O (not browser APIs)
- Auto-save with 500ms debounce
- Watch files for external changes

## Testing Approach

**Manual testing only** for this phase.

Test folder: `~/Documents/clause-test/`
```
clause-test/
├── proposal.md
├── notes.md
└── research/
    └── topic.md
```

## Important Notes

1. **Claude Code Integration:** The right panel embeds a Claude Code CLI subprocess. Communication is via stdin/stdout JSON streaming.

2. **Document Formats:** V1 focuses on Markdown with TipTap. Future versions will add docx/pptx support.

3. **Inline Diffs:** For markdown files, show edit diffs with Accept/Deny buttons using TipTap decorations.

4. **Keyboard Shortcuts:**
   - Cmd+\ : Toggle Claude panel
   - Cmd+B : Toggle file tree
   - Cmd+K : Add selection to context
   - Cmd+Enter : Accept diff
   - Cmd+Backspace : Deny diff

5. **Color Palette:**
   - Light bg: #FFFFFF, editor: #FAFAFA, sidebar: #F5F5F5
   - Dark bg: #1A1A1A, editor: #1E1E1E, sidebar: #141414
   - Accent: #6366F1 (Indigo)
   - Success: #22C55E, Danger: #EF4444

## Reference Files

- `SPEC.md` - Full specification with all features and technical details
- `clause-ui-design.jsx` - Interactive UI prototype showing the target design
