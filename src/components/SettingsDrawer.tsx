import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  autostart: boolean;
  decoy: string;
  notify: boolean;
  onClose: () => void;
  onChange: (patch: Partial<{ autostart: boolean; decoy: string; notify: boolean }>) => void;
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-white/6">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function Switch({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        on ? "bg-accent-500" : "bg-white/15"
      }`}
      aria-pressed={on}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 34 }}
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${
          on ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsDrawer({
  open,
  autostart,
  decoy,
  notify,
  onClose,
  onChange,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed top-0 right-0 z-50 h-full w-[380px] max-w-[86vw] bg-ink-900/95 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={onClose}
                className="h-8 w-8 grid place-items-center rounded-lg text-white/40 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <Row
              title="Launch on startup"
              desc="Start silently in the tray when you log in."
            >
              <Switch
                on={autostart}
                onClick={() => onChange({ autostart: !autostart })}
              />
            </Row>

            <Row
              title="Notification on trigger"
              desc="Small toast when the boss key fires (vs. fully silent)."
            >
              <Switch
                on={notify}
                onClick={() => onChange({ notify: !notify })}
              />
            </Row>

            <div className="py-4 border-b border-white/6">
              <p className="font-medium">Decoy launch</p>
              <p className="text-xs text-white/40 mt-0.5 mb-3">
                Open an app or URL the instant the boss key fires.
              </p>
              <input
                value={decoy}
                onChange={(e) => onChange({ decoy: e.target.value })}
                placeholder="e.g. https://docs.google.com or notepad.exe"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent-400/50 placeholder:text-white/30"
              />
            </div>

            <p className="text-[11px] text-white/30 mt-6 leading-relaxed">
              Boss Key runs entirely on your machine. Nothing is sent anywhere —
              your target list and shortcut live in a local config file.
            </p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
