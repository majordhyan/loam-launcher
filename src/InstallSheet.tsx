import { useState, useEffect } from "react";
import { Search, ArrowRight, Check, Download, FolderInput } from "lucide-react";
import { call, bytes, type Snapshot, type Game } from "./api";
import { Sheet } from "./ui";
type Version = { id: string; type: string; releaseTime: string };
type Plan = {
  bytes: number;
  disk: number;
  java: number;
  files: number;
  free: number;
};
export default function InstallSheet({
  snap,
  onClose,
  onCreated,
  onImport,
  onReport,
  error,
}: {
  snap: Snapshot;
  onClose: () => void;
  onCreated: (g: Game) => void;
  onImport: () => void;
  onReport: () => void;
  error: (e: unknown) => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]),
    [version, setVersion] = useState(""),
    [query, setQuery] = useState(""),
    [name, setName] = useState("My world"),
    [fabric, setFabric] = useState<{ version: string; stable: boolean }[]>([]),
    [loader, setLoader] = useState(""),
    [memory, setMemory] = useState(
      Math.min(4096, Math.floor(snap.ramMB / 2 / 512) * 512),
    ),
    [plan, setPlan] = useState<Plan | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [snapshots, setSnapshots] = useState(snap.data.preferences.snapshots),
    [stage, setStage] = useState(0),
    [localError, setLocalError] = useState("");
  const fail = (e: unknown) => setLocalError(String(e));
  async function load() {
    setLoading(true);
    setLocalError("");
    try {
      const v = await call<{
        latest: { release: string };
        versions: Version[];
      }>("versions");
      setVersions(v.versions);
      setVersion(v.latest.release);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!version) return;
    setPlan(null);
    setLoader("");
    setFabric([]);
    let live = true;
    call<{ version: string; stable: boolean }[]>("fabric", { version })
      .then((v) => {
        if (live) setFabric(v);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [version]);
  async function review() {
    setBusy(true);
    setLocalError("");
    try {
      setPlan(await call<Plan>("plan", { version, loader: loader || null }));
      setStage(1);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    try {
      const g = await call<Game>("createGame", {
        name,
        version,
        loader: loader || null,
        memory,
      });
      onCreated(g);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={stage === 0 ? "Install" : "Ready when you are."}
      full
      eyebrow={`INSTALL + / ${stage === 0 ? "01 · CONFIGURE" : "02 · REVIEW"}`}
      onClose={onClose}
    >
      {localError && (
        <div className="inline-error" role="alert">
          {localError}
          <button className="text-button" onClick={() => void load()}>
            Retry
          </button>
          <button
            className="text-button"
            onClick={() => {
              error(localError);
              onReport();
            }}
          >
            REPORT THIS
          </button>
        </div>
      )}
      {stage === 0 ? (
        <>
          <p className="intro">
            A separate home for every version, mod list, and adventure.
          </p>
          <div className="install-config">
            <section>
              <label>
                GAME NAME
                <input
                  maxLength={64}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My world"
                />
              </label>
              <div className="field-heading">
                <label htmlFor="version-search">MINECRAFT VERSION</label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={snapshots}
                    onChange={(e) => setSnapshots(e.target.checked)}
                  />
                  Snapshots
                </label>
              </div>
              <div className="search-input">
                <Search size={16} />
                <input
                  id="version-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a version"
                />
              </div>
              <div
                className="versions"
                role="listbox"
                aria-label="Minecraft version"
              >
                {loading ? (
                  <p className="muted">Connecting to the official catalog…</p>
                ) : (
                  versions
                    .filter(
                      (v) =>
                        (snapshots || v.type === "release") &&
                        v.id.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((v, i) => (
                      <button
                        key={v.id}
                        role="option"
                        aria-selected={version === v.id}
                        className={version === v.id ? "selected" : ""}
                        onClick={() => setVersion(v.id)}
                      >
                        <span className="mono">{v.id}</span>
                        <span className="version-type">
                          {i === 0 && !query
                            ? "LATEST " + v.type.toUpperCase()
                            : v.type.toUpperCase()}
                        </span>
                        {version === v.id && <Check size={16} />}
                      </button>
                    ))
                )}
              </div>
            </section>
            <section className="install-options">
              <div className="two-fields">
                <label>
                  LOADER
                  <select
                    value={loader}
                    onChange={(e) => {
                      setLoader(e.target.value);
                      setPlan(null);
                    }}
                  >
                    <option value="">Vanilla</option>
                    {fabric.map((f) => (
                      <option key={f.version} value={f.version}>
                        Fabric {f.version}
                        {f.stable ? "" : " · preview"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  MEMORY <span className="mono">{memory / 1024} GB</span>
                  <input
                    type="range"
                    min={512}
                    max={Math.floor(snap.ramMB / 512) * 512}
                    step={512}
                    value={memory}
                    onChange={(e) => setMemory(+e.target.value)}
                  />
                </label>
              </div>
              {memory > snap.ramMB * 0.75 && (
                <p className="warning">
                  Leave memory for Windows. This allocation exceeds 75% of
                  system RAM.
                </p>
              )}
              <div className="sheet-actions">
                <button
                  className="primary"
                  disabled={!version || !name.trim() || busy}
                  onClick={() => void review()}
                >
                  {busy ? "Resolving metadata…" : "REVIEW INSTALL"}
                  <ArrowRight size={17} />
                </button>
                <button className="text-button" onClick={onImport}>
                  <FolderInput size={16} />
                  Import from another launcher
                </button>
              </div>
              <p className="footnote">
                Only metadata is fetched for review. Game files download after
                you press Install.
              </p>
            </section>
          </div>
        </>
      ) : (
        plan && (
          <>
            <div className="review-game">
              <div className="monogram">{name.slice(0, 2).toUpperCase()}</div>
              <div>
                <h3>{name}</h3>
                <p className="mono">
                  {version} · {loader ? `Fabric ${loader}` : "Vanilla"}
                </p>
              </div>
            </div>
            <dl className="facts">
              <div>
                <dt>Download estimate</dt>
                <dd>{bytes(plan.bytes)}</dd>
              </div>
              <div>
                <dt>Working space needed</dt>
                <dd>{bytes(plan.disk)}</dd>
              </div>
              <div>
                <dt>Available</dt>
                <dd>{bytes(plan.free)}</dd>
              </div>
              <div>
                <dt>Managed Java</dt>
                <dd>Temurin {plan.java} · x64</dd>
              </div>
              <div>
                <dt>Memory</dt>
                <dd>{memory / 1024} GB</dd>
              </div>
              <div>
                <dt>Files to verify</dt>
                <dd>{plan.files.toLocaleString()}</dd>
              </div>
            </dl>
            <p className="footnote path">
              {snap.root}\games\&lt;unique game ID&gt;
            </p>
            <div className="notice">
              <Check size={18} />
              <p>
                Official game files. Verified checksums. Your other games stay
                separate.
              </p>
            </div>
            {plan.free < plan.disk && (
              <p className="warning">
                Not enough free space. Free up storage before installing.
              </p>
            )}
            <div className="sheet-actions">
              <button
                className="primary"
                disabled={busy || plan.free < plan.disk}
                onClick={() => void create()}
              >
                <Download size={17} />
                {busy ? "CREATING…" : "INSTALL"}
              </button>
              <button className="text-button" onClick={() => setStage(0)}>
                Back to configuration
              </button>
            </div>
          </>
        )
      )}
    </Sheet>
  );
}
