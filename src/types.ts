export type ActionType = "minimize" | "hide" | "kill";
export type MatchBy = "process" | "title";

export interface Target {
  id: string;
  matchBy: MatchBy;
  value: string;
  label: string;
  action: ActionType;
}

export interface WindowInfo {
  hwnd: number;
  title: string;
  process: string;
  pid: number;
}

export interface Config {
  hotkey: string;
  targets: Target[];
  autostart: boolean;
  decoy: string | null;
  notify: boolean;
  active: boolean;
}

export const ACTION_META: Record<
  ActionType,
  { label: string; blurb: string; tone: string }
> = {
  minimize: {
    label: "Minimize",
    blurb: "Send to taskbar",
    tone: "text-sky-300",
  },
  hide: {
    label: "Hide fully",
    blurb: "Vanish from taskbar, keep running",
    tone: "text-accent-400",
  },
  kill: {
    label: "Kill process",
    blurb: "Force-close it",
    tone: "text-danger",
  },
};
