// Settings › Updates (1.8). LOAM checks its GitHub release feed and installs an update only if
// its signature matches LOAM's public key (Tauri updater). The installer then replaces LOAM and
// starts it again; games, worlds and settings are untouched.
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Check, Download, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { native } from "../api";

type Info = { available: boolean; version?: string; notes?: string; date?: string; current?: string };
const AUTO = "loam_update_auto", LAST = "loam_update_last";
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
export const autoUpdateCheck = () => read(AUTO) !== "false";

/** Once a day at startup: returns the newer version, if any. */
export async function dailyUpdateCheck(): Promise<string | null> {
  if (!native || !autoUpdateCheck()) return null;
  const last = Number(read(LAST) || 0);
  if (Date.now() - last < 20 * 3600e3) return null;
  try {
    const info = await invoke<Info>("check_update");
    write(LAST, String(Date.now()));
    return info.available && info.version ? info.version : null;
  } catch { return null; }
}

const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;

export default function UpdatesPanel({ configured, version, blocked }: { configured: boolean; version: string; blocked: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<{ downloaded?: number; total?: number | null; installing?: boolean } | null>(null);
  const [auto, setAuto] = useState(autoUpdateCheck);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  async function check() {
    if (!native || !configured) return;
    setChecking(true);
    setError("");
    try {
      setInfo(await invoke<Info>("check_update"));
      setCheckedAt(new Date());
      write(LAST, String(Date.now()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => { void check(); }, [configured]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!native) return;
    const off = listen<{ downloaded?: number; total?: number | null; installing?: boolean }>("update-progress", (e) => setProgress(e.payload));
    return () => { void off.then((f) => f()); };
  }, []);

  async function install() {
    setInstalling(true);
    setError("");
    try {
      await invoke("install_update");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setInstalling(false);
      setProgress(null);
    }
  }

  const pct = progress?.total ? Math.min(100, Math.round(((progress.downloaded || 0) / progress.total) * 100)) : null;
  return (
    <>
      <h2>Always a little better.</h2>
      <p className="muted">LOAM updates come from its GitHub releases and are installed only if their signature matches LOAM's own key. Your games, worlds and settings stay as they are.</p>

      <section className="v18-update-card">
        <div className="v18-update-head">
          <span className={`v18-update-badge ${info?.available ? "is-new" : ""}`}>
            {checking ? <Loader2 size={18} className="v17-spin" /> : info?.available ? <Download size={18} /> : <Check size={18} />}
          </span>
          <div>
            <strong>
              {!configured ? `LOAM ${version}` : checking ? "Checking for updates…" : info?.available ? `LOAM ${info.version} is available` : error ? "Couldn't check for updates" : `LOAM ${version} is up to date`}
            </strong>
            <small>
              {info?.available
                ? `You have ${version}${info.date ? ` · released ${new Date(info.date).toLocaleDateString()}` : ""}`
                : checkedAt ? `Checked at ${checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : configured ? "" : "Updates aren't set up in this build."}
            </small>
          </div>
          {configured && !installing && (
            <button type="button" className="v17-btn v17-btn-sm" onClick={() => void check()} disabled={checking}>
              <RefreshCw size={14} /> Check now
            </button>
          )}
        </div>
        {info?.available && info.notes && <div className="v18-update-notes">{info.notes}</div>}
        {info?.available && (
          <div className="v18-update-actions">
            <button type="button" className="v17-btn v17-btn-primary" disabled={installing || !!blocked} onClick={() => void install()}>
              {installing ? <Loader2 size={16} className="v17-spin" /> : <Download size={16} />}
              {installing ? (progress?.installing ? "Installing…" : "Downloading…") : `Update to ${info.version}`}
            </button>
            {blocked && !installing && <small className="muted">{blocked}</small>}
            {installing && !progress?.installing && <small className="muted">LOAM closes and reopens by itself when the update is installed.</small>}
          </div>
        )}
        {installing && (
          <div className="v18-update-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
            <i style={{ width: progress?.installing ? "100%" : pct !== null ? `${pct}%` : "30%" }} className={pct === null && !progress?.installing ? "indeterminate" : ""} />
            <span>{progress?.installing ? "Installing" : progress?.downloaded ? `${mb(progress.downloaded)}${progress.total ? ` of ${mb(progress.total)}` : ""}` : "Starting"}</span>
          </div>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
      </section>

      {configured && (
        <div className="setting-row">
          <div>
            <h3>Check automatically</h3>
            <p>Once a day when LOAM starts. LOAM tells you when an update is ready and never installs one without asking.</p>
          </div>
          <label className="v17-toggle">
            <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); write(AUTO, String(e.target.checked)); }} aria-label="Check for updates automatically" />
            <span />
          </label>
        </div>
      )}
      <p className="v18-update-trust"><ShieldCheck size={15} /> Signed updates · Windows x64 · LOAM {version}</p>
    </>
  );
}
