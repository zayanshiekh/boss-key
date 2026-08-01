import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Config, Target, WindowInfo } from "../types";

export const getConfig = () => invoke<Config>("get_config");

export const listWindows = () => invoke<WindowInfo[]>("list_windows");

export const toggleBoss = () => invoke<boolean>("toggle_boss");

export const openDashboard = () => invoke<void>("open_dashboard");

export function saveConfig(cfg: Omit<Config, "active">): Promise<void> {
  return invoke<void>("save_config", {
    hotkey: cfg.hotkey,
    targets: cfg.targets satisfies Target[],
    autostart: cfg.autostart,
    decoy: cfg.decoy,
    notify: cfg.notify,
  });
}

export function onBossStatus(cb: (active: boolean) => void): Promise<UnlistenFn> {
  return listen<boolean>("boss-status", (e) => cb(e.payload));
}
