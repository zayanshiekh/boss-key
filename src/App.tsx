import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import HotkeyCard from "./components/HotkeyCard";
import StatusToggle from "./components/StatusToggle";
import TargetList from "./components/TargetList";
import TargetPicker from "./components/TargetPicker";
import SettingsDrawer from "./components/SettingsDrawer";
import { getConfig, onBossStatus, saveConfig, toggleBoss } from "./lib/api";
import type { ActionType, Config, Target } from "./types";

const DEFAULTS: Config = {
  hotkey: "Control+Alt+KeyB",
  targets: [],
  autostart: false,
  decoy: null,
  notify: false,
  active: false,
};

export default function App() {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Don't write back to disk until we've loaded the real config once.
  const dirtyGuard = useRef(false);
  const saveTimer = useRef<number | null>(null);

  // Load persisted config from the Rust side on mount.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const c = await getConfig();
        setCfg({ ...DEFAULTS, ...c });
      } catch (e) {
        console.error("getConfig failed", e);
      } finally {
        setLoaded(true);
      }
      unlisten = await onBossStatus((active) =>
        setCfg((p) => ({ ...p, active }))
      );
    })();
    return () => unlisten?.();
  }, []);

  // Debounced persist whenever the editable config changes.
  useEffect(() => {
    if (!loaded) return;
    if (!dirtyGuard.current) {
      dirtyGuard.current = true;
      return; // skip the first post-load render
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveConfig({
        hotkey: cfg.hotkey,
        targets: cfg.targets,
        autostart: cfg.autostart,
        decoy: cfg.decoy,
        notify: cfg.notify,
      }).catch((e) => console.error("saveConfig failed", e));
    }, 250);
  }, [cfg.hotkey, cfg.targets, cfg.autostart, cfg.decoy, cfg.notify, loaded]);

  const addTarget = (t: Target) =>
    setCfg((p) =>
      p.targets.some((x) => x.value.toLowerCase() === t.value.toLowerCase())
        ? p
        : { ...p, targets: [...p.targets, t] }
    );

  const removeTarget = (id: string) =>
    setCfg((p) => ({ ...p, targets: p.targets.filter((t) => t.id !== id) }));

  const changeAction = (id: string, action: ActionType) =>
    setCfg((p) => ({
      ...p,
      targets: p.targets.map((t) => (t.id === id ? { ...t, action } : t)),
    }));

  const handleToggle = async () => {
    try {
      const active = await toggleBoss();
      setCfg((p) => ({ ...p, active }));
    } catch (e) {
      console.error("toggle failed", e);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header
        data-tauri-drag-region
        className="flex items-center justify-between px-7 py-5 shrink-0"
      >
        <div className="flex items-center gap-3" data-tauri-drag-region>
          <div className="grid place-items-center h-9 w-9 rounded-xl bg-accent-500/15 border border-accent-400/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v9"
                stroke="#8b7dff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M6.6 6.8a8 8 0 1 0 10.8 0"
                stroke="#8b7dff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div data-tauri-drag-region>
            <h1 className="font-semibold leading-none">Boss Key</h1>
            <p className="text-[11px] text-white/40 mt-1">
              one shortcut · everything vanishes
            </p>
          </div>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="h-9 w-9 grid place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.9 1.1V21a2 2 0 11-4 0v-.09A1.65 1.65 0 006 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 003.6 14a1.65 1.65 0 00-1.5-1H2a2 2 0 110-4h.09A1.65 1.65 0 003.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 008 3.6 1.65 1.65 0 009 2.1V2a2 2 0 114 0v.09A1.65 1.65 0 0016 3.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0020.4 8c.06.55.44 1 1 1.1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>
        </button>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 px-7 pb-7 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-5 min-h-0"
        >
          <HotkeyCard
            accelerator={cfg.hotkey}
            onChange={(hotkey) => setCfg((p) => ({ ...p, hotkey }))}
          />
          <StatusToggle
            active={cfg.active}
            targetCount={cfg.targets.length}
            onToggle={handleToggle}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="min-h-0 flex"
        >
          <div className="flex-1 min-h-0 flex">
            <TargetList
              targets={cfg.targets}
              onAdd={() => setPickerOpen(true)}
              onRemove={removeTarget}
              onActionChange={changeAction}
            />
          </div>
        </motion.div>
      </main>

      <TargetPicker
        open={pickerOpen}
        existing={cfg.targets}
        onClose={() => setPickerOpen(false)}
        onAdd={addTarget}
      />

      <SettingsDrawer
        open={settingsOpen}
        autostart={cfg.autostart}
        decoy={cfg.decoy ?? ""}
        notify={cfg.notify}
        onClose={() => setSettingsOpen(false)}
        onChange={(patch) =>
          setCfg((p) => ({
            ...p,
            ...("autostart" in patch ? { autostart: patch.autostart! } : {}),
            ...("notify" in patch ? { notify: patch.notify! } : {}),
            ...("decoy" in patch
              ? { decoy: patch.decoy === "" ? null : patch.decoy! }
              : {}),
          }))
        }
      />
    </div>
  );
}
