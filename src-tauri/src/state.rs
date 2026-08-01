use serde::{Deserialize, Serialize};

/// A single thing the boss key acts on. Matched against live windows either by
/// process executable name (e.g. "chrome.exe") or by a substring of the title.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Target {
    pub id: String,
    /// "process" | "title"
    #[serde(rename = "matchBy")]
    pub match_by: String,
    /// The value to match: an exe name or a title substring.
    pub value: String,
    /// Human-friendly label shown in the UI.
    #[serde(default)]
    pub label: String,
    /// "minimize" | "hide" | "kill"
    pub action: String,
}

/// Runtime state shared between the tray, the global-shortcut handler and the
/// IPC commands. Guarded by a Mutex in Tauri's managed state.
pub struct BossState {
    /// Whether the boss key is currently "engaged" (targets hidden).
    pub active: bool,
    /// Windows we hid/minimised, remembered so we can restore them.
    /// (hwnd, action) where action is "hide" | "minimize".
    pub hidden: Vec<(isize, String)>,
    pub targets: Vec<Target>,
    pub hotkey: String,
    pub autostart: bool,
    /// Optional app path or URL to launch the instant the boss key fires.
    pub decoy: Option<String>,
    pub notify: bool,
}

impl BossState {
    pub fn new(
        hotkey: String,
        targets: Vec<Target>,
        autostart: bool,
        decoy: Option<String>,
        notify: bool,
    ) -> Self {
        Self {
            active: false,
            hidden: Vec::new(),
            targets,
            hotkey,
            autostart,
            decoy,
            notify,
        }
    }
}
