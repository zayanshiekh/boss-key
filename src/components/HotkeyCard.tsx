import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fromEvent, prettify } from "../lib/hotkey";

interface Props {
  accelerator: string;
  onChange: (accel: string) => void;
}

export default function HotkeyCard({ accelerator, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [liveLabel, setLiveLabel] = useState<string>("");
  const [reserved, setReserved] = useState(false);
  const boxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        setLiveLabel("");
        return;
      }
      const rec = fromEvent(e);
      if (!rec) {
        // modifier-only: show what's held so far
        const held: string[] = [];
        if (e.ctrlKey) held.push("Ctrl");
        if (e.altKey) held.push("Alt");
        if (e.shiftKey) held.push("Shift");
        if (e.metaKey) held.push("Win");
        setLiveLabel(held.length ? held.join(" + ") + " + …" : "…");
        return;
      }
      setLiveLabel(rec.label);
      setReserved(rec.reserved);
      if (!rec.reserved) {
        onChange(rec.accelerator);
        setRecording(false);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, onChange]);

  const display = recording
    ? liveLabel || "Press keys…"
    : prettify(accelerator);

  const chips = display.split(" + ");

  return (
    <div className="glass rounded-3xl p-6 shadow-card relative overflow-hidden">
      <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-4 relative">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Global Hotkey
          </p>
          <h2 className="text-lg font-semibold mt-1">Panic shortcut</h2>
        </div>
        <span
          className={`text-[11px] px-2.5 py-1 rounded-full border ${
            recording
              ? "border-accent-400/50 text-accent-400 bg-accent-500/10"
              : "border-white/10 text-white/40"
          }`}
        >
          {recording ? "● recording" : "system-wide"}
        </span>
      </div>

      <motion.button
        ref={boxRef}
        onClick={() => {
          setReserved(false);
          setLiveLabel("");
          setRecording((r) => !r);
        }}
        whileTap={{ scale: 0.98 }}
        className={`w-full rounded-2xl border-2 border-dashed py-8 px-4 transition-colors relative ${
          recording
            ? "border-accent-400/70 bg-accent-500/5"
            : "border-white/10 hover:border-white/25"
        }`}
      >
        <div className="flex items-center justify-center gap-2 flex-wrap min-h-[44px]">
          <AnimatePresence mode="popLayout">
            {chips.map((c, i) => (
              <motion.div
                key={c + i}
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {c === "…" ? (
                  <span className="text-white/40 text-2xl">{c}</span>
                ) : (
                  <kbd className="text-lg">{c}</kbd>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <p className="text-xs text-white/40 mt-4">
          {recording
            ? "Press any modifier + key combo — Esc to cancel"
            : "Click to record a new combo"}
        </p>
      </motion.button>

      <AnimatePresence>
        {reserved && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-warn text-xs mt-3 flex items-center gap-1.5"
          >
            ⚠ That combo is reserved by Windows. Pick another.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
