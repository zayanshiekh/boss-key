import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listWindows } from "../lib/api";
import type { Target, WindowInfo } from "../types";

interface Props {
  open: boolean;
  existing: Target[];
  onClose: () => void;
  onAdd: (t: Target) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function TargetPicker({
  open,
  existing,
  onClose,
  onAdd,
}: Props) {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      setWindows(await listWindows());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setQuery("");
      refresh();
    }
  }, [open]);

  const chosenProcesses = useMemo(
    () => new Set(existing.map((t) => t.value.toLowerCase())),
    [existing]
  );

  // One row per distinct process, with a count of its windows.
  const grouped = useMemo(() => {
    const map = new Map<string, { proc: string; titles: string[] }>();
    for (const w of windows) {
      const key = w.process.toLowerCase();
      if (!map.has(key)) map.set(key, { proc: w.process, titles: [] });
      if (w.title) map.get(key)!.titles.push(w.title);
    }
    let rows = [...map.values()];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.proc.toLowerCase().includes(q) ||
          r.titles.some((t) => t.toLowerCase().includes(q))
      );
    }
    return rows.sort((a, b) => a.proc.localeCompare(b.proc));
  }, [windows, query]);

  const add = (proc: string) => {
    onAdd({
      id: uid(),
      matchBy: "process",
      value: proc,
      label: proc.replace(/\.exe$/i, ""),
      action: "hide",
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="glass relative w-full max-w-lg rounded-3xl shadow-card overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-5 border-b border-white/8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Pick a running app</h3>
                <button
                  onClick={refresh}
                  className="text-xs text-white/50 hover:text-white flex items-center gap-1"
                >
                  ↻ Refresh
                </button>
              </div>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps or window titles…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-400/50 placeholder:text-white/30"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loading && (
                <p className="text-center text-white/40 text-sm py-10">
                  Scanning open windows…
                </p>
              )}
              {!loading && grouped.length === 0 && (
                <p className="text-center text-white/40 text-sm py-10">
                  No windows match.
                </p>
              )}
              {!loading &&
                grouped.map((r) => {
                  const already = chosenProcesses.has(r.proc.toLowerCase());
                  return (
                    <button
                      key={r.proc}
                      disabled={already}
                      onClick={() => add(r.proc)}
                      className={`w-full text-left rounded-2xl p-3 flex items-center gap-3 border transition-colors ${
                        already
                          ? "border-white/5 opacity-40 cursor-default"
                          : "border-white/8 hover:border-accent-400/40 hover:bg-white/5"
                      }`}
                    >
                      <div className="grid place-items-center h-9 w-9 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/70 shrink-0">
                        {r.proc.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {r.proc.replace(/\.exe$/i, "")}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {r.titles[0] ?? "background window"}
                          {r.titles.length > 1 && (
                            <span className="text-white/30">
                              {" "}
                              +{r.titles.length - 1} more
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-accent-400 shrink-0">
                        {already ? "added" : "+ add"}
                      </span>
                    </button>
                  );
                })}
            </div>

            <div className="p-4 border-t border-white/8 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
