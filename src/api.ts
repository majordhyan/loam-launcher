import { invoke, isTauri } from "@tauri-apps/api/core";
import { formatBytes } from "./lib/math";
export type Game = {
  id: string;
  name: string;
  version: string;
  loader: string | null;
  memory: number;
  width: number | null;
  height: number | null;
  jvmArgs: string[];
  installed: boolean;
  verified: string | null;
  created: string;
  lastPlayed?: string | null;
  playtime?: number;
  notes?: string;
  tags?: string[];
};
export type Account = {
  id: string;
  name: string;
  kind: "offline" | "microsoft";
  uuid: string;
  verified?: string;
  /** How Java access was confirmed: "Java Edition", "Xbox Game Pass" or "Java profile". */
  access?: string;
  /** Capes on the Minecraft profile, the active one first. */
  capes?: string[];
};
export type Operation = {
  id: string;
  gameId: string;
  phase: string;
  message: string;
  done: number;
  total: number;
  files: number;
  speed: number;
  error: string | null;
};
export type Snapshot = {
  data: {
    schema: number;
    games: Game[];
    accounts: Account[];
    selectedGame: string | null;
    selectedAccount: string | null;
    preferences: { snapshots: boolean; setupDone: boolean; reducedMotion: boolean };
  };
  operation: Operation | null;
  running: Record<string, number>;
  root: string;
  ramMB: number;
  freeDisk: number;
  version: string;
  capabilities: Record<string, Record<string, boolean>>;
  configuration: { microsoft: boolean; discord: boolean; updates: boolean };
};
export const native = isTauri();
export async function call<T = unknown>(
  op: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!native)
    throw new Error(
      "Open LOAM in its desktop window to use this action. Browser preview has no access to game files.",
    );
  const start = performance.now();
  try { return await invoke<T>("dispatch", { op, args }); }
  finally { window.__loamPerf?.mark(op, start); }
}
export const empty: Snapshot = {
  data: {
    schema: 1,
    games: [],
    accounts: [],
    selectedGame: null,
    selectedAccount: null,
    preferences: { snapshots: false, setupDone: false, reducedMotion: false },
  },
  operation: null,
  running: {},
  root: "Managed by the desktop app",
  ramMB: 8192,
  freeDisk: 0,
  version: "1.8.0",
  capabilities: {},
  configuration: { microsoft: false, discord: false, updates: false },
};
export const bytes = formatBytes;
