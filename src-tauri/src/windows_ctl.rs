//! Native window control. This is the "genuinely hard part": enumerating and
//! acting on *other* applications' windows via the Win32 API.
//!
//! Everything here is behind a small, platform-agnostic surface (`list_windows`,
//! `apply`, `restore`, `open_decoy`) so a macOS / Linux backend can slot in later
//! without touching the UI or hotkey layer.

use serde::Serialize;

use crate::state::Target;

/// A live top-level window, as shown in the target picker.
#[derive(Serialize, Clone, Debug)]
pub struct WindowInfo {
    /// Native window handle, stored as an integer so it survives the IPC hop.
    pub hwnd: isize,
    pub title: String,
    /// Executable name, e.g. "chrome.exe".
    pub process: String,
    pub pid: u32,
}

/// Decide which action (if any) a target list dictates for a given window.
pub fn match_action(targets: &[Target], w: &WindowInfo) -> Option<String> {
    let title_l = w.title.to_lowercase();
    let proc_l = w.process.to_lowercase();
    for t in targets {
        let needle = t.value.to_lowercase();
        if needle.is_empty() {
            continue;
        }
        let hit = match t.match_by.as_str() {
            "title" => title_l.contains(&needle),
            // default: process match
            _ => proc_l == needle || proc_l == format!("{needle}.exe"),
        };
        if hit {
            return Some(t.action.clone());
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Windows implementation
// ---------------------------------------------------------------------------
#[cfg(windows)]
mod imp {
    use super::{match_action, WindowInfo};
    use crate::state::Target;
    use std::os::windows::process::CommandExt;

    use windows::core::PWSTR;
    use windows::Win32::Foundation::{CloseHandle, BOOL, FALSE, HWND, LPARAM, TRUE};
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowLongW, GetWindowTextLengthW, GetWindowTextW,
        GetWindowThreadProcessId, IsWindowVisible, ShowWindow, GWL_EXSTYLE, SW_HIDE, SW_MINIMIZE,
        SW_RESTORE, SW_SHOW, WS_EX_TOOLWINDOW,
    };

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    struct EnumCtx {
        list: Vec<WindowInfo>,
    }

    unsafe fn process_name(pid: u32) -> String {
        let handle = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid) {
            Ok(h) => h,
            Err(_) => return String::new(),
        };
        if handle.is_invalid() {
            return String::new();
        }
        let mut buf = [0u16; 1024];
        let mut size = buf.len() as u32;
        let res = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            PWSTR(buf.as_mut_ptr()),
            &mut size,
        );
        let _ = CloseHandle(handle);
        if res.is_err() {
            return String::new();
        }
        let full = String::from_utf16_lossy(&buf[..size as usize]);
        full.rsplit(['\\', '/'])
            .next()
            .unwrap_or(&full)
            .to_string()
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let ctx = &mut *(lparam.0 as *mut EnumCtx);

        if !IsWindowVisible(hwnd).as_bool() {
            return TRUE;
        }
        let len = GetWindowTextLengthW(hwnd);
        if len == 0 {
            return TRUE;
        }
        // Skip tool windows (tray helpers, tooltips, etc.).
        let exstyle = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        if exstyle & WS_EX_TOOLWINDOW.0 != 0 {
            return TRUE;
        }

        let mut buf = vec![0u16; (len + 1) as usize];
        let read = GetWindowTextW(hwnd, &mut buf);
        if read == 0 {
            return TRUE;
        }
        let title = String::from_utf16_lossy(&buf[..read as usize]);

        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        let process = process_name(pid);

        ctx.list.push(WindowInfo {
            hwnd: hwnd.0 as isize,
            title,
            process,
            pid,
        });
        TRUE
    }

    pub fn list_windows() -> Vec<WindowInfo> {
        let mut ctx = EnumCtx { list: Vec::new() };
        unsafe {
            let _ = EnumWindows(Some(enum_proc), LPARAM(&mut ctx as *mut _ as isize));
        }
        // Skip our own window and de-noise: keep windows that have a process name.
        ctx.list.retain(|w| {
            !w.process.is_empty() && w.process.to_lowercase() != "boss-key.exe"
        });
        ctx.list
            .sort_by(|a, b| a.process.to_lowercase().cmp(&b.process.to_lowercase()));
        ctx.list
    }

    fn kill_pid(pid: u32) {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }

    pub fn apply(targets: &[Target]) -> Vec<(isize, String)> {
        let windows = list_windows();
        let mut hidden = Vec::new();
        for w in &windows {
            let Some(action) = match_action(targets, w) else {
                continue;
            };
            let hwnd = HWND(w.hwnd as *mut _);
            unsafe {
                match action.as_str() {
                    "minimize" => {
                        let _ = ShowWindow(hwnd, SW_MINIMIZE);
                        hidden.push((w.hwnd, "minimize".to_string()));
                    }
                    "hide" => {
                        let _ = ShowWindow(hwnd, SW_HIDE);
                        hidden.push((w.hwnd, "hide".to_string()));
                    }
                    "kill" => kill_pid(w.pid),
                    _ => {}
                }
            }
        }
        hidden
    }

    pub fn restore(hidden: &[(isize, String)]) {
        for (h, act) in hidden {
            let hwnd = HWND(*h as *mut _);
            unsafe {
                match act.as_str() {
                    "hide" => {
                        let _ = ShowWindow(hwnd, SW_SHOW);
                    }
                    "minimize" => {
                        let _ = ShowWindow(hwnd, SW_RESTORE);
                    }
                    _ => {}
                }
            }
        }
    }

    pub fn open_decoy(target: &str) {
        // `start "" <target>` opens URLs in the default browser and launches
        // apps/paths through the shell.
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", target])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }
}

// ---------------------------------------------------------------------------
// Fallback for non-Windows targets so the crate always compiles.
// ---------------------------------------------------------------------------
#[cfg(not(windows))]
mod imp {
    use super::WindowInfo;
    use crate::state::Target;

    pub fn list_windows() -> Vec<WindowInfo> {
        Vec::new()
    }
    pub fn apply(_targets: &[Target]) -> Vec<(isize, String)> {
        Vec::new()
    }
    pub fn restore(_hidden: &[(isize, String)]) {}
    pub fn open_decoy(_target: &str) {}
}

pub use imp::{apply, list_windows, open_decoy, restore};
