use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, EventKind};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileChangeEvent {
    pub path: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ClaudeEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_result: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// Persistent Claude session state
pub struct ClaudeSession {
    stdin: Option<ChildStdin>,
    child: Option<Child>,
    session_id: Option<String>,
    working_dir: String,
}

impl ClaudeSession {
    fn new() -> Self {
        Self {
            stdin: None,
            child: None,
            session_id: None,
            working_dir: String::new(),
        }
    }
}

pub struct ClaudeSessionState(pub Arc<Mutex<ClaudeSession>>);

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    match fs::read_dir(dir_path) {
        Ok(read_dir) => {
            for entry in read_dir {
                if let Ok(entry) = entry {
                    let file_name = entry.file_name().to_string_lossy().to_string();

                    // Skip hidden files and directories
                    if file_name.starts_with('.') {
                        continue;
                    }

                    let file_path = entry.path();
                    let is_dir = file_path.is_dir();

                    entries.push(FileEntry {
                        name: file_name,
                        path: file_path.to_string_lossy().to_string(),
                        is_dir,
                        children: None,
                    });
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }

    match fs::read_to_string(file_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return Err(format!("Failed to create parent directories: {}", e));
            }
        }
    }

    match fs::write(file_path, content) {
        Ok(()) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}

#[tauri::command]
fn check_claude_available() -> Result<bool, String> {
    match Command::new("claude")
        .arg("--version")
        .output()
    {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

// Start or get the persistent Claude session
fn ensure_claude_session(
    session_state: &Arc<Mutex<ClaudeSession>>,
    working_dir: &str,
    app_handle: &AppHandle,
) -> Result<(), String> {
    let mut session = session_state.lock().map_err(|e| e.to_string())?;

    // Check if we need a new session (different working dir or no session)
    let needs_new_session = session.stdin.is_none() || session.working_dir != working_dir;

    if needs_new_session {
        // Kill existing process if any
        if let Some(mut child) = session.child.take() {
            let _ = child.kill();
        }
        session.stdin = None;
        session.session_id = None;

        // Start new persistent Claude process with focused system prompt
        let system_prompt = r#"You are a fast markdown editing assistant in Clause editor.
RULES:
1. Use Edit tool IMMEDIATELY - no exploration, no questions
2. Make minimal, targeted edits
3. Reply with ONE sentence summary after editing
4. Never explain what you'll do - just do it
Be fast. Be direct. Edit now."#;

        let mut cmd = Command::new("claude");
        cmd.arg("--print")
            .arg("--verbose") // Required for stream-json output
            .arg("--output-format")
            .arg("stream-json")
            .arg("--input-format")
            .arg("stream-json")
            .arg("--permission-mode")
            .arg("acceptEdits")
            .arg("--append-system-prompt")
            .arg(system_prompt)
            .arg("--allowedTools")
            .arg("Edit,Read,Write")
            .current_dir(working_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn claude: {}", e))?;

        let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to get stderr")?;

        session.stdin = Some(stdin);
        session.child = Some(child);
        session.working_dir = working_dir.to_string();

        // Spawn thread to read stderr and emit error events
        let app_handle_stderr = app_handle.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            let mut error_buffer = String::new();

            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        if line.trim().is_empty() {
                            continue;
                        }
                        // Accumulate stderr output
                        if !error_buffer.is_empty() {
                            error_buffer.push('\n');
                        }
                        error_buffer.push_str(&line);

                        // Emit error event immediately for critical errors
                        if line.contains("Error:") || line.contains("error:") {
                            let event = ClaudeEvent {
                                event_type: "error".to_string(),
                                session_id: String::new(),
                                text: None,
                                tool_id: None,
                                tool_name: None,
                                tool_input: None,
                                tool_result: None,
                                error: Some(line.clone()),
                            };
                            let _ = app_handle_stderr.emit("claude-event", event);
                        }
                    }
                    Err(_) => break,
                }
            }

            // Emit any remaining buffered errors when stderr closes
            if !error_buffer.is_empty() && !error_buffer.contains("Error:") {
                let event = ClaudeEvent {
                    event_type: "error".to_string(),
                    session_id: String::new(),
                    text: None,
                    tool_id: None,
                    tool_name: None,
                    tool_input: None,
                    tool_result: None,
                    error: Some(format!("Claude stderr: {}", error_buffer)),
                };
                let _ = app_handle_stderr.emit("claude-event", event);
            }
        });

        // Spawn thread to read stdout and emit events
        let app_handle_clone = app_handle.clone();
        let session_state_clone = Arc::clone(session_state);

        thread::spawn(move || {
            let reader = BufReader::new(stdout);

            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        if line.trim().is_empty() {
                            continue;
                        }

                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                            let msg_session_id = json.get("session_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();

                            // Store session_id for future use
                            if !msg_session_id.is_empty() {
                                if let Ok(mut session) = session_state_clone.lock() {
                                    session.session_id = Some(msg_session_id.clone());
                                }
                            }

                            if let Some(event_type) = json.get("type").and_then(|v| v.as_str()) {
                                process_claude_event(event_type, &json, &msg_session_id, &app_handle_clone);
                            }
                        }
                    }
                    Err(e) => {
                        let event = ClaudeEvent {
                            event_type: "error".to_string(),
                            session_id: String::new(),
                            text: None,
                            tool_id: None,
                            tool_name: None,
                            tool_input: None,
                            tool_result: None,
                            error: Some(format!("Read error: {}", e)),
                        };
                        let _ = app_handle_clone.emit("claude-event", event);
                        break;
                    }
                }
            }

            // Emit a complete event when stdout closes (process ended)
            // This ensures the frontend stops showing "Thinking..."
            let event = ClaudeEvent {
                event_type: "complete".to_string(),
                session_id: String::new(),
                text: None,
                tool_id: None,
                tool_name: None,
                tool_input: None,
                tool_result: None,
                error: None,
            };
            let _ = app_handle_clone.emit("claude-event", event);

            // Clear the session state since the process ended
            if let Ok(mut session) = session_state_clone.lock() {
                session.stdin = None;
                session.child = None;
                session.session_id = None;
            }
        });
    }

    Ok(())
}

fn process_claude_event(event_type: &str, json: &serde_json::Value, session_id: &str, app_handle: &AppHandle) {
    match event_type {
        "system" => {
            let event = ClaudeEvent {
                event_type: "init".to_string(),
                session_id: session_id.to_string(),
                text: None,
                tool_id: None,
                tool_name: None,
                tool_input: None,
                tool_result: None,
                error: None,
            };
            let _ = app_handle.emit("claude-event", event);
        }
        "assistant" => {
            if let Some(message) = json.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                    for block in content {
                        if let Some(block_type) = block.get("type").and_then(|t| t.as_str()) {
                            match block_type {
                                "text" => {
                                    if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                                        let event = ClaudeEvent {
                                            event_type: "text".to_string(),
                                            session_id: session_id.to_string(),
                                            text: Some(text.to_string()),
                                            tool_id: None,
                                            tool_name: None,
                                            tool_input: None,
                                            tool_result: None,
                                            error: None,
                                        };
                                        let _ = app_handle.emit("claude-event", event);
                                    }
                                }
                                "tool_use" => {
                                    let tool_id = block.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                    let tool_name = block.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                    let tool_input = block.get("input").cloned();

                                    let event = ClaudeEvent {
                                        event_type: "tool_use".to_string(),
                                        session_id: session_id.to_string(),
                                        text: None,
                                        tool_id: Some(tool_id),
                                        tool_name: Some(tool_name),
                                        tool_input,
                                        tool_result: None,
                                        error: None,
                                    };
                                    let _ = app_handle.emit("claude-event", event);
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
        }
        "user" => {
            if let Some(message) = json.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                    for block in content {
                        if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                            let tool_id = block.get("tool_use_id").and_then(|v| v.as_str()).unwrap_or("").to_string();

                            let tool_name = json.get("tool_use_result")
                                .and_then(|r| r.get("file"))
                                .and_then(|f| f.get("filePath"))
                                .and_then(|p| p.as_str())
                                .map(|p| p.split('/').last().unwrap_or(p).to_string());

                            let result_summary = json.get("tool_use_result")
                                .and_then(|r| r.get("file"))
                                .and_then(|f| f.get("numLines"))
                                .and_then(|n| n.as_i64())
                                .map(|n| format!("Read {} lines", n))
                                .unwrap_or_else(|| "Completed".to_string());

                            let event = ClaudeEvent {
                                event_type: "tool_result".to_string(),
                                session_id: session_id.to_string(),
                                text: None,
                                tool_id: Some(tool_id),
                                tool_name,
                                tool_input: None,
                                tool_result: Some(result_summary),
                                error: None,
                            };
                            let _ = app_handle.emit("claude-event", event);
                        }
                    }
                }
            }
        }
        "result" => {
            let event = ClaudeEvent {
                event_type: "complete".to_string(),
                session_id: session_id.to_string(),
                text: None,
                tool_id: None,
                tool_name: None,
                tool_input: None,
                tool_result: None,
                error: None,
            };
            let _ = app_handle.emit("claude-event", event);
        }
        _ => {}
    }
}

// Inner message structure for stream-json format
#[derive(Debug, Serialize, Deserialize)]
struct StreamJsonInnerMessage {
    role: String,
    content: String,
}

// Outer message wrapper for stream-json format
// Format: {"type":"user","message":{"role":"user","content":"..."}}
#[derive(Debug, Serialize, Deserialize)]
struct StreamJsonMessage {
    #[serde(rename = "type")]
    msg_type: String,
    message: StreamJsonInnerMessage,
}

#[tauri::command]
async fn send_to_claude(
    message: String,
    _session_id: Option<String>, // Kept for API compatibility but not used
    working_dir: String,
    context: Option<String>,
    session_state: State<'_, ClaudeSessionState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    // Build the full message with context if provided
    let full_message = if let Some(ctx) = context {
        format!("{}\n\n---\nContext:\n{}", message, ctx)
    } else {
        message
    };

    let session_arc = Arc::clone(&session_state.0);

    // Ensure we have a running session
    ensure_claude_session(&session_arc, &working_dir, &app_handle)?;

    // Send the message as stream-json format
    // Format: {"type":"user","message":{"role":"user","content":"..."}}
    let stream_msg = StreamJsonMessage {
        msg_type: "user".to_string(),
        message: StreamJsonInnerMessage {
            role: "user".to_string(),
            content: full_message,
        },
    };

    let json_msg = serde_json::to_string(&stream_msg)
        .map_err(|e| format!("Failed to serialize message: {}", e))?;

    {
        let mut session = session_arc.lock().map_err(|e| e.to_string())?;
        if let Some(ref mut stdin) = session.stdin {
            writeln!(stdin, "{}", json_msg)
                .map_err(|e| format!("Failed to write to stdin: {}", e))?;
            stdin.flush()
                .map_err(|e| format!("Failed to flush stdin: {}", e))?;
        } else {
            return Err("No stdin available".to_string());
        }
    }

    // Return the session_id if we have one
    let session = session_arc.lock().map_err(|e| e.to_string())?;
    Ok(session.session_id.clone().unwrap_or_else(|| "pending".to_string()))
}

#[tauri::command]
fn watch_directory(path: String, app_handle: AppHandle) -> Result<(), String> {
    let watch_path = path.clone();

    thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();

        let mut watcher: RecommendedWatcher = Watcher::new(tx, Config::default())
            .expect("Failed to create watcher");

        watcher
            .watch(Path::new(&watch_path), RecursiveMode::Recursive)
            .expect("Failed to watch directory");

        loop {
            match rx.recv() {
                Ok(Ok(event)) => {
                    let kind = match event.kind {
                        EventKind::Create(_) => "create",
                        EventKind::Modify(_) => "modify",
                        EventKind::Remove(_) => "remove",
                        _ => continue,
                    };

                    for path in event.paths {
                        let change_event = FileChangeEvent {
                            path: path.to_string_lossy().to_string(),
                            kind: kind.to_string(),
                        };

                        let _ = app_handle.emit("file-change", change_event);
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("Watch error: {:?}", e);
                }
                Err(e) => {
                    eprintln!("Channel error: {:?}", e);
                    break;
                }
            }
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ClaudeSessionState(Arc::new(Mutex::new(ClaudeSession::new()))))
        .invoke_handler(tauri::generate_handler![
            list_directory,
            read_file,
            write_file,
            watch_directory,
            check_claude_available,
            send_to_claude
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
