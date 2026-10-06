import { useEffect, useState } from "react";
import { ArrowRight, FolderOpen, RefreshCw, Archive } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { call, native, bytes, type Operation } from "../api";
import { Sheet, Empty } from "../ui";

export type Instance = {
  source: string;
  name: string;
  version: string;
  loaderKind: string;
  loaderVersion: string | null;
  path: string;
  gameDir: string;
  worlds: number;
  mods: number;
  bytes: number;
  memory: number | null;
  supported: boolean;
  note: string;
};

const loaderLabel = (i: Instance) =>
  i.loaderKind === "vanilla"
    ? "Vanilla"
    : `${i.loaderKind[0].toUpperCase()}${i.loaderKind.slice(1)}${i.loaderVersion ? ` ${i.loaderVersion}` : ""}`;

/** Finds Prism Launcher, MultiMC and CurseForge instances and copies one into LOAM. */
export default function MigrationHub({
  initial,
  operation,
  busy,
  onClose,
  onStart,
}: {
  initial?: Instance[];
  operation: Operation | null;
  busy: boolean;
  onClose: () => void;
  onStart: (path: string, worldsOnly: boolean) => Promise<boolean>;
}) {
  const [items, setItems] = useState<Instance[] | null>(initial ?? null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState("");
  async function scan(folder?: string) {
    setError("");
    setItems(null);
    try {
      const v = await call<{ instances: Instance[] }>("migrationScan", folder ? { folder } : {});
      setItems(v.instances);
      if (folder && !v.instances.length)
        setError("No Prism, MultiMC or CurseForge instances were found in that folder.");
    } catch (e) {
      setItems([]);
      setError(String(e));
    }
  }
  useEffect(() => {
    if (initial) return;
    if (native) void scan();
    else setItems([]);
  }, []);
  const copying = !!started && !!operation && operation.phase === "copying";
  // Close once the copy finishes; re-enable the cards if it failed so the user can retry.
  useEffect(() => {
    if (!started || !operation) return;
    if (operation.phase === "ready") onClose();
    if (operation.phase === "failed" || operation.phase === "cancelled") setStarted("");
  }, [operation?.phase, started]);
  return (
    <Sheet title="Bring your games" eyebrow="MIGRATION HUB" full onClose={onClose}>
      <p className="intro">
        Prism Launcher, MultiMC and CurseForge instances become LOAM games, with their worlds, mods
        and settings. Your originals are only read, never changed.
      </p>
      {error && (
        <div className="inline-error" role="alert">
          <p>{error}</p>
        </div>
      )}
      {copying && operation && (
        <div className="notice migration-progress" role="status" aria-live="polite">
          <div>
            <strong>Copying {started}</strong>
            <p className="mono">
              {operation.total > 0
                ? `${bytes(operation.done)} / ${bytes(operation.total)} · ${operation.files} files`
                : operation.message}
            </p>
            <div className="migration-bar">
              <span
                style={{
                  transform: `scaleX(${operation.total ? Math.min(1, operation.done / operation.total) : 0})`,
                }}
              />
            </div>
          </div>
        </div>
      )}
      <div className="migration-list">
        {items === null ? (
          <p className="muted">Looking for other launchers on this PC…</p>
        ) : items.length === 0 ? (
          <Empty>
            No instances found in the usual places. MultiMC and custom CurseForge folders can live
            anywhere; choose the folder below.
          </Empty>
        ) : (
          items.map((i) => (
            <article className={`migration-card ${i.supported ? "" : "limited"}`} key={i.path}>
              <div className="migration-meta">
                <span className="eyebrow">{i.source.toUpperCase()}</span>
                <h3 title={i.path}>{i.name || "Untitled instance"}</h3>
                <p className="mono">
                  {i.version} · {loaderLabel(i)}
                </p>
                <p className="muted">
                  {i.worlds} {i.worlds === 1 ? "world" : "worlds"}
                  {i.supported ? ` · ${i.mods} ${i.mods === 1 ? "mod" : "mods"}` : ""} · {bytes(i.bytes)}
                </p>
                <p className="footnote">{i.note}</p>
              </div>
              <button
                className={i.supported ? "primary" : "secondary"}
                disabled={busy || !!started}
                onClick={() => {
                  setError("");
                  void onStart(i.path, !i.supported).then((ok) => {
                    if (ok) setStarted(i.name || i.version);
                  });
                }}
              >
                {i.supported ? "IMPORT" : "IMPORT WORLDS"}
                <ArrowRight size={16} />
              </button>
            </article>
          ))
        )}
      </div>
      <div className="sheet-actions">
        <button
          className="secondary"
          disabled={!native || !!started}
          onClick={() =>
            void open({ directory: true, multiple: false, title: "Choose a launcher or instance folder" }).then(
              (f) => {
                if (typeof f === "string") void scan(f);
              },
            )
          }
        >
          <FolderOpen size={17} />
          CHOOSE A FOLDER
        </button>
        <button className="text-button" disabled={!native || !!started} onClick={() => void scan()}>
          <RefreshCw size={15} />
          SCAN AGAIN
        </button>
      </div>
      <div className="notice">
        <Archive size={18} />
        <p>
          Close the other launcher first. LOAM copies worlds, mods, configs, resource and shader
          packs, screenshots, options and server lists. Accounts, logs and launcher settings are
          never opened. Minecraft itself downloads when you press Install.
        </p>
      </div>
    </Sheet>
  );
}
