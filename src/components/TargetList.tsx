import { motion, AnimatePresence } from "framer-motion";
import { ACTION_META, type ActionType, type Target } from "../types";

interface Props {
  targets: Target[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onActionChange: (id: string, action: ActionType) => void;
}

function ProcessGlyph({ label }: { label: string }) {
  const letter = (label || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="grid place-items-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white/70 shrink-0">
      {letter}
    </div>
  );
}

export default function TargetList({
  targets,
  onAdd,
  onRemove,
  onActionChange,
}: Props) {
  return (
    <div className="glass rounded-3xl p-6 shadow-card flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Targets
          </p>
          <h2 className="text-lg font-semibold mt-1">What gets hidden</h2>
        </div>
        <button
          onClick={onAdd}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium flex items-center gap-1.5 transition-colors"
        >
          <span className="text-accent-400 text-lg leading-none">+</span> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2.5">
        <AnimatePresence initial={false}>
          {targets.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-white/35"
            >
              <div className="text-4xl mb-3">🫥</div>
              <p className="text-sm">No targets yet.</p>
              <p className="text-xs mt-1">
                Add an app to make it disappear on the hotkey.
              </p>
            </motion.div>
          )}

          {targets.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="glass glass-hover rounded-2xl p-3 flex items-center gap-3"
            >
              <ProcessGlyph label={t.label || t.value} />

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{t.label || t.value}</p>
                <p className="text-xs text-white/40 truncate">
                  {t.matchBy === "process" ? "process" : "title contains"} ·{" "}
                  <span className="text-white/55">{t.value}</span>
                </p>
              </div>

              <div className="relative shrink-0">
                <select
                  value={t.action}
                  onChange={(e) =>
                    onActionChange(t.id, e.target.value as ActionType)
                  }
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium hover:bg-white/10 focus:outline-none focus:border-accent-400/50 cursor-pointer"
                >
                  {(Object.keys(ACTION_META) as ActionType[]).map((a) => (
                    <option key={a} value={a} className="bg-ink-800">
                      {ACTION_META[a].label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-[10px]">
                  ▼
                </span>
              </div>

              <button
                onClick={() => onRemove(t.id)}
                className="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-white/35 hover:text-danger hover:bg-danger/10 transition-colors"
                aria-label="Remove target"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
