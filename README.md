# Boss Key

A lightweight, tray-based **boss key** for Windows. One global shortcut instantly
hides (or minimizes / kills) a set of apps you choose — and the same shortcut
brings them back. Built with **Tauri v2** (Rust + native WebView2) so it ships as
a ~4 MB installer and idles at a few MB of RAM in the tray, instead of the ~85 MB
an Electron app would cost.

> You don't need any build tools on your own PC — GitHub Actions compiles it in
> the cloud and hands back the installer. See **Getting the app** below.

## Features (MVP)

- **System-wide global hotkey** — an OS-level hook, works even when the window is
  closed. Fully rebindable from the UI (click-to-record).
- **Tray presence** — right-click for *Open Dashboard / Toggle Boss Key / Quit*.
  No taskbar icon when the dashboard is closed.
- **Live target picker** — pick from a list of currently open apps/windows.
- **Per-target action** — choose *Minimize*, *Hide fully* (vanish from the
  taskbar, still running), or *Kill process* for each app.
- **Toggle** — the same hotkey hides and restores; prior state is remembered.
- **Close-to-tray** — closing the window hides it; only *Quit* fully exits.
- **Autostart** — optional launch-on-login, straight into the tray.
- **Decoy launch** (optional) — open an app or URL the instant the key fires.

Everything is user-configurable and stored in a single local config file. Nothing
leaves your machine.

## Getting the app (no local tools needed)

1. Push a commit to `main` (or open the repo's **Actions** tab and run the
   **Build Windows** workflow via *Run workflow*).
2. When the run finishes (a few minutes), open it and download the
   **`boss-key-windows-installer`** artifact.
3. Unzip and run the `.exe` installer.

## The default shortcut

`Ctrl + Alt + B` — change it anytime from the dashboard.

## Tech notes

- **Frontend:** React + TypeScript + Tailwind + Framer Motion (`src/`).
- **Backend:** Rust (`src-tauri/`). The native window-control layer
  (`windows_ctl.rs`) uses `windows-rs` (`EnumWindows`, `ShowWindow`) and is kept
  behind a small interface so macOS/Linux backends can slot in later.
- **Plugins:** `tauri-plugin-global-shortcut`, `tauri-plugin-store`,
  `tauri-plugin-autostart`, plus Tauri's built-in tray.

### Platform support

Windows is the first-class target. macOS (needs Accessibility permission) and
Linux/X11 are future work; Wayland window control is a known limitation.

## Building locally (optional)

If you ever *do* want to build on your own machine you'll need
[Rust](https://rustup.rs) + the MSVC build tools and Node 20:

```bash
npm install
npm run tauri dev     # run in development
npm run tauri build   # produce an installer
```
