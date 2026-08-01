mod state;
mod windows_ctl;

use std::str::FromStr;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tauri_plugin_store::StoreExt;

use state::{BossState, Target};
use windows_ctl::WindowInfo;

const STORE_FILE: &str = "config.json";
const DEFAULT_HOTKEY: &str = "Control+Alt+KeyB";

/// Snapshot of config sent to the UI on load.
#[derive(Serialize)]
struct ConfigDto {
    hotkey: String,
    targets: Vec<Target>,
    autostart: bool,
    decoy: Option<String>,
    notify: bool,
    active: bool,
}

// ---------------------------------------------------------------------------
// Core toggle logic (used by the hotkey handler and the tray)
// ---------------------------------------------------------------------------
fn do_toggle(app: &AppHandle) {
    let state = app.state::<Mutex<BossState>>();
    let mut s = state.lock().unwrap();

    if s.active {
        windows_ctl::restore(&s.hidden);
        s.hidden.clear();
        s.active = false;
    } else {
        if let Some(decoy) = s.decoy.clone() {
            if !decoy.is_empty() {
                windows_ctl::open_decoy(&decoy);
            }
        }
        let targets = s.targets.clone();
        s.hidden = windows_ctl::apply(&targets);
        s.active = true;
    }

    let active = s.active;
    drop(s);
    let _ = app.emit("boss-status", active);
}

/// (Re)register the current hotkey with the OS. Unregisters everything first so
/// rebinding is clean.
fn register_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    if hotkey.trim().is_empty() {
        return Ok(());
    }
    let shortcut = Shortcut::from_str(hotkey).map_err(|e| format!("invalid hotkey: {e}"))?;
    gs.register(shortcut).map_err(|e| e.to_string())?;
    Ok(())
}

fn load_persisted(app: &AppHandle) -> (String, Vec<Target>, bool, Option<String>, bool) {
    let default = DEFAULT_HOTKEY.to_string();
    match app.store(STORE_FILE) {
        Ok(store) => {
            let hotkey = store
                .get("hotkey")
                .and_then(|v| v.as_str().map(str::to_string))
                .unwrap_or(default);
            let targets = store
                .get("targets")
                .and_then(|v| serde_json::from_value::<Vec<Target>>(v).ok())
                .unwrap_or_default();
            let autostart = store.get("autostart").and_then(|v| v.as_bool()).unwrap_or(false);
            let decoy = store
                .get("decoy")
                .and_then(|v| v.as_str().map(str::to_string))
                .filter(|s| !s.is_empty());
            let notify = store.get("notify").and_then(|v| v.as_bool()).unwrap_or(false);
            (hotkey, targets, autostart, decoy, notify)
        }
        Err(_) => (default, Vec::new(), false, None, false),
    }
}

// ---------------------------------------------------------------------------
// IPC commands
// ---------------------------------------------------------------------------
#[tauri::command]
fn list_windows() -> Vec<WindowInfo> {
    windows_ctl::list_windows()
}

#[tauri::command]
fn get_config(state: State<Mutex<BossState>>) -> ConfigDto {
    let s = state.lock().unwrap();
    ConfigDto {
        hotkey: s.hotkey.clone(),
        targets: s.targets.clone(),
        autostart: s.autostart,
        decoy: s.decoy.clone(),
        notify: s.notify,
        active: s.active,
    }
}

#[tauri::command]
fn save_config(
    app: AppHandle,
    state: State<Mutex<BossState>>,
    hotkey: String,
    targets: Vec<Target>,
    autostart: bool,
    decoy: Option<String>,
    notify: bool,
) -> Result<(), String> {
    // Persist to disk.
    if let Ok(store) = app.store(STORE_FILE) {
        store.set("hotkey", serde_json::json!(hotkey));
        store.set(
            "targets",
            serde_json::to_value(&targets).unwrap_or(serde_json::Value::Null),
        );
        store.set("autostart", serde_json::json!(autostart));
        store.set("decoy", serde_json::json!(decoy));
        store.set("notify", serde_json::json!(notify));
        let _ = store.save();
    }

    // Update live state.
    {
        let mut s = state.lock().unwrap();
        s.hotkey = hotkey.clone();
        s.targets = targets;
        s.autostart = autostart;
        s.decoy = decoy.filter(|d| !d.is_empty());
        s.notify = notify;
    }

    // Apply hotkey + autostart side-effects.
    register_hotkey(&app, &hotkey)?;

    let launcher = app.autolaunch();
    if autostart {
        let _ = launcher.enable();
    } else {
        let _ = launcher.disable();
    }

    Ok(())
}

#[tauri::command]
fn toggle_boss(app: AppHandle) -> bool {
    do_toggle(&app);
    let state = app.state::<Mutex<BossState>>();
    let s = state.lock().unwrap();
    s.active
}

#[tauri::command]
fn open_dashboard(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

// ---------------------------------------------------------------------------
// App bootstrap
// ---------------------------------------------------------------------------
fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_i = MenuItem::with_id(app, "open", "Open Dashboard", true, None::<&str>)?;
    let toggle_i = MenuItem::with_id(app, "toggle", "Toggle Boss Key", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&open_i, &toggle_i, &sep, &quit_i])?;

    let icon = app
        .default_window_icon()
        .cloned()
        .expect("bundled default window icon");

    TrayIconBuilder::with_id("boss-tray")
        .icon(icon)
        .tooltip("Boss Key")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "toggle" => do_toggle(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        do_toggle(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            list_windows,
            get_config,
            save_config,
            toggle_boss,
            open_dashboard
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            let (hotkey, targets, autostart, decoy, notify) = load_persisted(&handle);
            app.manage(Mutex::new(BossState::new(
                hotkey.clone(),
                targets,
                autostart,
                decoy,
                notify,
            )));

            if let Err(e) = register_hotkey(&handle, &hotkey) {
                eprintln!("[boss-key] hotkey registration failed: {e}");
            }

            build_tray(&handle)?;

            // Launched by autostart? Start hidden in the tray.
            let launched_hidden = std::env::args().any(|a| a == "--autostart");
            if launched_hidden {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Close-to-tray: intercept the close button, hide instead of exit.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Boss Key");
}
