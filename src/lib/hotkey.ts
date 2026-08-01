// Helpers for turning a browser KeyboardEvent into a Tauri accelerator string
// (e.g. "Control+Alt+KeyB") and back into a pretty label ("Ctrl + Alt + B").

const MOD_KEYS = new Set([
  "Control",
  "Shift",
  "Alt",
  "Meta",
  "ContextMenu",
  "OS",
]);

// Combos the OS grabs first — we flag these so the user picks something usable.
const RESERVED = new Set([
  "Control+Alt+Delete",
  "Alt+Tab",
  "Alt+F4",
  "Control+Escape",
  "Meta+KeyL",
  "Meta+KeyD",
]);

export interface RecordedHotkey {
  accelerator: string; // what we send to Rust / store
  label: string; // what we show the user
  reserved: boolean;
}

function codeToKeyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3); // KeyB -> B
  if (code.startsWith("Digit")) return code.slice(5); // Digit1 -> 1
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  if (code.startsWith("Arrow")) return code.slice(5); // ArrowUp -> Up
  const map: Record<string, string> = {
    Space: "Space",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backslash: "\\",
    Enter: "Enter",
    Tab: "Tab",
    Escape: "Esc",
  };
  return map[code] ?? code;
}

const MOD_LABEL: Record<string, string> = {
  Control: "Ctrl",
  Alt: "Alt",
  Shift: "Shift",
  Super: "Win",
};

/** Build a hotkey from a live keydown event. Returns null for modifier-only. */
export function fromEvent(e: KeyboardEvent): RecordedHotkey | null {
  if (MOD_KEYS.has(e.key)) return null; // waiting for a real key
  if (!e.code) return null;

  const mods: string[] = [];
  if (e.ctrlKey) mods.push("Control");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  if (e.metaKey) mods.push("Super");

  const accelerator = [...mods, e.code].join("+");
  const label = [
    ...mods.map((m) => MOD_LABEL[m] ?? m),
    codeToKeyLabel(e.code),
  ].join(" + ");

  return {
    accelerator,
    label,
    reserved: RESERVED.has(accelerator),
  };
}

/** Turn a stored accelerator string back into a pretty label. */
export function prettify(accelerator: string): string {
  if (!accelerator) return "Not set";
  const parts = accelerator.split("+");
  const key = parts.pop() ?? "";
  return [...parts.map((m) => MOD_LABEL[m] ?? m), codeToKeyLabel(key)].join(
    " + "
  );
}
