import { motion } from "framer-motion";

interface Props {
  active: boolean;
  targetCount: number;
  onToggle: () => void;
}

export default function StatusToggle({ active, targetCount, onToggle }: Props) {
  return (
    <div className="glass rounded-3xl p-6 shadow-card flex items-center gap-5">
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.94 }}
        className="relative shrink-0"
        aria-label="Toggle boss key"
      >
        <motion.span
          animate={{
            boxShadow: active
              ? "0 0 45px -4px rgba(255,92,114,0.65)"
              : "0 0 35px -8px rgba(109,94,252,0.5)",
          }}
          className={`grid place-items-center h-20 w-20 rounded-2xl border ${
            active
              ? "bg-danger/15 border-danger/40"
              : "bg-accent-500/10 border-accent-400/30"
          }`}
        >
          <motion.svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            animate={{ rotate: active ? 0 : 0 }}
          >
            <path
              d="M12 3v9"
              stroke={active ? "#ff5c72" : "#8b7dff"}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M6.6 6.8a8 8 0 1 0 10.8 0"
              stroke={active ? "#ff5c72" : "#8b7dff"}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </motion.svg>
        </motion.span>
      </motion.button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Boss Key</h2>
          <motion.span
            key={active ? "on" : "off"}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              active
                ? "bg-danger/20 text-danger"
                : "bg-ok/15 text-ok"
            }`}
          >
            {active ? "ENGAGED" : "READY"}
          </motion.span>
        </div>
        <p className="text-sm text-white/45 mt-1">
          {active
            ? "Targets are hidden. Press the hotkey or the button to bring them back."
            : `${targetCount} target${
                targetCount === 1 ? "" : "s"
              } armed. Trigger anytime — even when this window is closed.`}
        </p>
      </div>

      <button
        onClick={onToggle}
        className={`shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
          active
            ? "bg-danger/90 hover:bg-danger text-white"
            : "bg-accent-500 hover:bg-accent-600 text-white"
        }`}
      >
        {active ? "Restore" : "Test fire"}
      </button>
    </div>
  );
}
