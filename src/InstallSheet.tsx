import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ArrowRight,
  Check,
  Download,
  FolderInput,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  X,
} from "lucide-react";
import { call, bytes, type Snapshot, type Game } from "./api";
import { Sheet, Slider, Toggle, Segmented, StrataContour } from "./ui";
import { GameCover, LoaderGlyph } from "./v17/art";
import { javaFor } from "./lib/versions";

type Version = {
  id: string;
  type: string;
  releaseTime: string;
  fabric?: boolean;
  quilt?: boolean;
};
type Plan = {
  bytes: number;
  disk: number;
  java: number;
  files: number;
  free: number;
};

const POPULAR_VERSIONS = [
  "26.3",
  "1.21.4",
  "1.20.1",
  "1.19.4",
  "1.18.2",
  "1.16.5",
  "1.12.2",
  "1.8.9",
  "1.7.10",
];

function getLoaderTags(v: Version): string {
  const tags: string[] = ["V"];
  if (v.fabric) tags.push("F");
  if (v.quilt) tags.push("Q");
  return tags.join(" · ");
}

function getEra(versionId: string): string {
  if (versionId.startsWith("26.")) return "26.x Era";
  if (versionId.startsWith("1.21")) return "1.21.x · Tricky Trials";
  if (versionId.startsWith("1.20")) return "1.20.x · Trails & Tales";
  if (versionId.startsWith("1.19")) return "1.19.x · Wild Update";
  if (versionId.startsWith("1.18")) return "1.18.x · Caves & Cliffs II";
  if (versionId.startsWith("1.17")) return "1.17.x · Caves & Cliffs I";
  if (versionId.startsWith("1.16")) return "1.16.x · Nether Update";
  if (
    versionId.startsWith("1.15") ||
    versionId.startsWith("1.14") ||
    versionId.startsWith("1.13")
  )
    return "1.13.x – 1.15.x · Modern Vanilla";
  if (
    versionId.startsWith("1.7") ||
    versionId.startsWith("1.8") ||
    versionId.startsWith("1.9") ||
    versionId.startsWith("1.10") ||
    versionId.startsWith("1.11") ||
    versionId.startsWith("1.12")
  )
    return "1.7.x – 1.12.x · Classic Golden Era";
  return "1.0.x – 1.6.x · Early Releases";
}

export default function InstallSheet({
  snap,
  onClose,
  onCreated,
  onImport,
  onReport,
  error,
  initialLoader,
  initialVersion,
}: {
  initialLoader?: "vanilla" | "fabric" | "quilt";
  initialVersion?: string;
  snap: Snapshot;
  onClose: () => void;
  onCreated: (g: Game) => void;
  onImport: () => void;
  onReport: (ctx?: { version?: string; loader?: string | null; memory?: number }) => void;
  error: (e: unknown) => void;
}) {
  const recMemory = useMemo(() => {
    const halfRam = Math.floor(snap.ramMB / 2 / 1024) * 1024;
    return Math.max(2048, Math.min(6144, halfRam || 4096));
  }, [snap.ramMB]);

  const [versions, setVersions] = useState<Version[]>([]),
    [version, setVersion] = useState(""),
    [query, setQuery] = useState(""),
    [filterType, setFilterType] = useState<"all" | "release" | "snapshot" | "fabric" | "quilt">("all"),
    [name, setName] = useState(""),
    [userEditedName, setUserEditedName] = useState(false),
    [fabric, setFabric] = useState<{ version: string; stable: boolean }[]>([]),
    [quilt, setQuilt] = useState<{ version: string; stable: boolean }[]>([]),
    [loaderType, setLoaderType] = useState<"vanilla" | "fabric" | "quilt">(initialLoader || "vanilla"),
    [loaderVersion, setLoaderVersion] = useState(""),
    [memory, setMemory] = useState(recMemory),
    [plan, setPlan] = useState<Plan | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [snapshots, setSnapshots] = useState(snap.data.preferences.snapshots),
    [stage, setStage] = useState<0 | 1 | 2>(0),
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
      setVersion(initialVersion && v.versions.some((x) => x.id === initialVersion) ? initialVersion : v.latest.release);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Update auto-suggested name when version or loader changes
  useEffect(() => {
    if (!version) return;
    if (!userEditedName) {
      const prefix =
        loaderType === "vanilla"
          ? "Vanilla"
          : loaderType === "fabric"
          ? "Fabric"
          : "Quilt";
      setName(`${prefix} ${version}`);
    }
  }, [version, loaderType, userEditedName]);

  useEffect(() => {
    if (!version) return;
    setPlan(null);
    setLoaderVersion("");
    setFabric([]);
    setQuilt([]);
    let live = true;

    // Load available Fabric builds
    call<{ version: string; stable: boolean }[]>("fabric", { version })
      .then((v) => {
        if (live) {
          setFabric(v);
          if (loaderType === "fabric") {
            if (v.length > 0) {
              setLoaderVersion(v[0].version);
            } else {
              setLoaderType("vanilla");
              setLoaderVersion("");
            }
          }
        }
      })
      .catch(() => {});

    // Load available Quilt builds
    call<{ version: string; stable: boolean }[]>("quilt", { version })
      .then((v) => {
        if (live) {
          setQuilt(v);
          if (loaderType === "quilt") {
            if (v.length > 0) {
              setLoaderVersion(v[0].version);
            } else {
              setLoaderType("vanilla");
              setLoaderVersion("");
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [version]);

  const effectiveLoaderArg = useMemo(() => {
    if (loaderType === "vanilla") return null;
    if (loaderType === "fabric") {
      return loaderVersion
        ? `fabric:${loaderVersion}`
        : fabric[0]
        ? `fabric:${fabric[0].version}`
        : null;
    }
    if (loaderType === "quilt") {
      return loaderVersion
        ? `quilt:${loaderVersion}`
        : quilt[0]
        ? `quilt:${quilt[0].version}`
        : null;
    }
    return null;
  }, [loaderType, loaderVersion, fabric, quilt]);

  async function review() {
    setBusy(true);
    setLocalError("");
    try {
      const p = await call<Plan>("plan", {
        version,
        loader: effectiveLoaderArg,
      });
      setPlan(p);
      setStage(1);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setStage(2);
    try {
      const g = await call<Game>("createGame", {
        name: name.trim() || `Minecraft ${version}`,
        version,
        loader: effectiveLoaderArg,
        memory,
      });
      onCreated(g);
    } catch (e) {
      error(e);
      setStage(1);
    } finally {
      setBusy(false);
    }
  }

  // Filter versions by query and filterType
  const filteredVersions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return versions.filter((v) => {
      // Snapshot visibility
      if (!snapshots && filterType !== "snapshot" && v.type !== "release") return false;

      // Filter tabs
      if (filterType === "release" && v.type !== "release") return false;
      if (filterType === "snapshot" && v.type !== "snapshot") return false;
      if (filterType === "fabric" && !v.fabric) return false;
      if (filterType === "quilt" && !v.quilt) return false;

      if (!q) return true;
      if (v.id.toLowerCase().includes(q)) return true;
      if (
        q === "legacy" &&
        (v.id.startsWith("1.8") ||
          v.id.startsWith("1.9") ||
          v.id.startsWith("1.10") ||
          v.id.startsWith("1.11") ||
          v.id.startsWith("1.12") ||
          v.id.startsWith("1.7"))
      )
        return true;
      if (q === "fabric") return !!v.fabric;
      if (q === "quilt") return !!v.quilt;
      return false;
    });
  }, [versions, snapshots, filterType, query]);

  // Group filtered versions
  const groupedVersions = useMemo(() => {
    const groups: { title: string; items: Version[] }[] = [];
    if (!query && filterType === "all") {
      const popItems = versions.filter((v) => POPULAR_VERSIONS.includes(v.id));
      if (popItems.length > 0) {
        groups.push({ title: "⭐ Popular Releases", items: popItems });
      }
    }
    const eraMap = new Map<string, Version[]>();
    for (const v of filteredVersions) {
      const era = getEra(v.id);
      if (!eraMap.has(era)) eraMap.set(era, []);
      eraMap.get(era)!.push(v);
    }
    for (const [title, items] of eraMap.entries()) {
      groups.push({ title, items });
    }
    return groups;
  }, [filteredVersions, versions, query, filterType]);

  return (
    <Sheet
      title={stage === 0 ? "Create a game" : stage === 1 ? "Review before installing" : "Installing"}
      full
      eyebrow="New game"
      onClose={onClose}
    >
      {/* 3-Step Stepper Header */}
      <div className="install-stepper-wrap">
        <div className="install-stepper">
          <span className={`step-item ${stage >= 0 ? "active" : ""}`}>
            <b>1</b> Choose
          </span>
          <span className="step-sep">·</span>
          <span className={`step-item ${stage >= 1 ? "active" : ""}`}>
            <b>2</b> Review
          </span>
          <span className="step-sep">·</span>
          <span className={`step-item ${stage >= 2 ? "active" : ""}`}>
            <b>3</b> Install
          </span>
        </div>
        <div className="stepper-track">
          <div
            className="stepper-fill"
            style={{
              width: "100%", transformOrigin: "left", transform: `scaleX(${(stage + 1) / 3})`,
            }}
          />
        </div>
      </div>

      {localError && (
        <div className="inline-error" role="alert" style={{ margin: "16px 0" }}>
          <p>{localError}</p>
          <div className="inline-actions">
            <button className="text-button" onClick={() => void load()}>
              Retry
            </button>
            <button
              className="text-button"
              onClick={() => {
                error(localError);
                onReport({
                  version,
                  loader: effectiveLoaderArg,
                  memory,
                });
              }}
            >
              Report this
            </button>
          </div>
        </div>
      )}

      {stage === 0 && (
        <>
          <p className="intro">
            A separate home for every version, mod list, and adventure. Official files only.
          </p>

          <div className="install-config">
            {/* LEFT COLUMN: Version Picker */}
            <section className="install-left">
              <label className="field-block">
                <span className="eyebrow">Game name</span>
                <input
                  maxLength={64}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setUserEditedName(true);
                  }}
                  placeholder="e.g. Vanilla 1.21.4"
                  className="field-input"
                />
              </label>

              <div className="field-heading" style={{ marginTop: "16px" }}>
                <span className="eyebrow">
                  Minecraft version · {versions[versions.length - 1]?.id || "1.0"} to{" "}
                  {versions[0]?.id || "26.3"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="field-sublabel">Snapshots</span>
                  <Toggle
                    checked={snapshots}
                    onChange={setSnapshots}
                    ariaLabel="Toggle snapshots"
                  />
                </div>
              </div>

              {/* FILTER CHIPS */}
              <div className="version-filter-tabs">
                <button
                  type="button"
                  className={`filter-chip ${filterType === "all" ? "active" : ""}`}
                  onClick={() => setFilterType("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filterType === "release" ? "active" : ""}`}
                  onClick={() => setFilterType("release")}
                >
                  Releases
                </button>
                <button
                  type="button"
                  className={`filter-chip ${filterType === "snapshot" ? "active" : ""}`}
                  onClick={() => {
                    setFilterType("snapshot");
                    setSnapshots(true);
                  }}
                >
                  Snapshots
                </button>
                <button
                  type="button"
                  className={`filter-chip loader-chip fabric ${filterType === "fabric" ? "active" : ""}`}
                  onClick={() => setFilterType("fabric")}
                >
                  <LoaderGlyph loader="0" size={14} /> Fabric
                </button>
                <button
                  type="button"
                  className={`filter-chip loader-chip quilt ${filterType === "quilt" ? "active" : ""}`}
                  onClick={() => setFilterType("quilt")}
                >
                  <LoaderGlyph loader="quilt:" size={14} /> Quilt
                </button>
              </div>

              <div className="search-input" style={{ margin: "8px 0" }}>
                <Search size={16} />
                <input
                  id="version-search"
                  aria-label="Search Minecraft versions"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search version (e.g. 1.8.9, 1.20.1, legacy, fabric)"
                />
                {query && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div
                className="versions"
                role="listbox"
                aria-label="Minecraft version"
                onKeyDown={e => {
                  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
                  const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="option"]'));
                  const index = items.indexOf(document.activeElement as HTMLButtonElement);
                  const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, index + (e.key === "ArrowDown" ? 1 : -1)));
                  e.preventDefault(); items[next]?.focus();
                }}
              >
                {loading ? (
                  <p className="muted" style={{ padding: "16px" }}>
                    Connecting to the official catalog…
                  </p>
                ) : (
                  groupedVersions.map((grp) => (
                    <div key={grp.title} className="version-group" role="group" aria-label={grp.title}>
                      <div className="eyebrow version-group-header">
                        {grp.title}
                      </div>
                      {grp.items.map((v) => (
                        <button
                          key={`${grp.title}-${v.id}`}
                          role="option"
                          aria-selected={version === v.id}
                          className={`version-row ${version === v.id ? "selected" : ""}`}
                          onClick={() => setVersion(v.id)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span className="mono" style={{ fontWeight: 600 }}>{v.id}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span className="loader-pill vanilla" title="Vanilla"><LoaderGlyph loader={null} size={12} /></span>
                              {v.fabric && (
                                <span className="loader-pill fabric" title="Fabric available"><LoaderGlyph loader="0" size={12} /></span>
                              )}
                              {v.quilt && (
                                <span className="loader-pill quilt" title="Quilt available"><LoaderGlyph loader="quilt:" size={12} /></span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="version-type">
                              {v.type === "old_alpha" ? "Alpha" : v.type === "old_beta" ? "Beta" : v.type.charAt(0).toUpperCase() + v.type.slice(1)}
                            </span>
                            {version === v.id && (
                              <Check size={16} color="var(--loam-accent)" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* RIGHT COLUMN: Sticky Summary Card */}
            <section className="install-summary-card">
              <div className="summary-strata-strip v17-install-cover">
                <GameCover
                  seed={`${version}${loaderType}`}
                  loader={loaderType === "vanilla" ? null : loaderType === "quilt" ? "quilt:" : "0"}
                  version={version || ""}
                />
              </div>

              <div className="summary-card-inner">
                <div className="summary-version-row">
                  <div>
                    <span className="eyebrow">Minecraft</span>
                    <h2 className="summary-version-num mono">{version || "26.3"}</h2>
                  </div>
                  <span className="summary-badge mono">
                    {versions.find(v => v.id === version)?.type === "snapshot" ? "Snapshot" : "Release"}
                  </span>
                </div>

                {/* LOADER SEGMENTED CONTROL */}
                <div className="summary-section">
                  <span className="eyebrow">Game type</span>
                  <div className="v17-loader-cards" role="radiogroup" aria-label="Game type">
                    {([
                      ["vanilla", "Vanilla", "The game as Mojang ships it", true],
                      ["fabric", "Fabric", fabric.length ? "Mods, shaders and performance" : `Not available for ${version}`, fabric.length > 0],
                      ["quilt", "Quilt", quilt.length ? "Runs Quilt and most Fabric mods" : `Not available for ${version}`, quilt.length > 0],
                    ] as const).map(([v, label, note, ok]) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={loaderType === v}
                        disabled={!ok}
                        className={loaderType === v ? "active" : ""}
                        onClick={() => {
                          setLoaderType(v);
                          if (v === "fabric" && fabric[0]) setLoaderVersion(fabric[0].version);
                          if (v === "quilt" && quilt[0]) setLoaderVersion(quilt[0].version);
                        }}
                      >
                        <LoaderGlyph loader={v === "vanilla" ? null : v === "quilt" ? "quilt:" : "0"} size={18} />
                        <span><strong>{label}</strong><small>{note}</small></span>
                      </button>
                    ))}
                  </div>

                  {loaderType === "fabric" && fabric.length > 0 && (
                    <div style={{ marginTop: "12px" }}>
                      <span className="eyebrow" style={{ fontSize: "10px", display: "block", marginBottom: "4px" }}>
                        Fabric loader build
                      </span>
                      <select
                        className="field-input"
                        style={{ height: "38px", fontSize: "12px" }}
                        value={loaderVersion || fabric[0]?.version}
                        onChange={(e) => setLoaderVersion(e.target.value)}
                      >
                        {fabric.map((b) => (
                          <option key={b.version} value={b.version}>
                            {b.version} {b.stable ? "· stable" : "· experimental"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {loaderType === "quilt" && quilt.length > 0 && (
                    <div style={{ marginTop: "12px" }}>
                      <span className="eyebrow" style={{ fontSize: "10px", display: "block", marginBottom: "4px" }}>
                        Quilt loader build
                      </span>
                      <select
                        className="field-input"
                        style={{ height: "38px", fontSize: "12px" }}
                        value={loaderVersion || quilt[0]?.version}
                        onChange={(e) => setLoaderVersion(e.target.value)}
                      >
                        {quilt.map((b) => (
                          <option key={b.version} value={b.version}>
                            {b.version} {b.stable ? "· stable" : "· experimental"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <p className="footnote" style={{ marginTop: "8px" }}>
                    {loaderType === "vanilla"
                      ? "Official game files only, isolated."
                      : loaderType === "fabric"
                      ? `Fabric loader ${loaderVersion || fabric[0]?.version || "stable"}`
                      : `Quilt loader ${loaderVersion || quilt[0]?.version || "stable"}`}
                  </p>
                </div>

                {/* MEMORY ROW FULL */}
                <div className="summary-section">
                  <Slider
                    value={memory}
                    min={1024}
                    max={Math.floor(snap.ramMB / 512) * 512}
                    step={512}
                    recommended={recMemory}
                    label="Memory"
                    onChange={setMemory}
                    valueFormatter={(v) => `${(v / 1024).toFixed(0)} GB`}
                  />
                  {memory > recMemory && (
                    <p
                      className="warning"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "8px",
                        fontSize: "12px",
                      }}
                    >
                      <AlertTriangle size={15} />
                      Leave memory for Windows. Oversized heap can lengthen GC pause times.
                    </p>
                  )}
                </div>

                {/* QUICK FACTS */}
                <dl className="summary-facts">
                  <div>
                    <dt>Managed Java</dt>
                    <dd className="mono">
                      {javaFor(version) ? `Java ${javaFor(version)}` : "Chosen at review"}
                    </dd>
                  </div>
                  <div>
                    <dt>Download</dt>
                    <dd className="mono">about 450 MB</dd>
                  </div>
                  <div>
                    <dt>Disk space</dt>
                    <dd className="mono">about 1.2 GB</dd>
                  </div>
                </dl>

                {/* ACTIONS */}
                <div className="summary-actions">
                  <button
                    className="primary"
                    style={{ width: "100%", height: "54px", fontSize: "14px" }}
                    disabled={!version || !name.trim() || busy}
                    onClick={() => void review()}
                  >
                    {busy ? "Checking official files…" : "Review install"}
                    <ArrowRight size={18} />
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    style={{ marginTop: "12px" }}
                    onClick={onImport}
                  >
                    <FolderInput size={16} />
                    Import from another launcher
                  </button>
                </div>

                <p className="footnote" style={{ marginTop: "12px" }}>
                  Only official metadata is fetched for review. Game files download after
                  you press Install.
                </p>
              </div>
            </section>
          </div>
        </>
      )}

      {stage === 1 && plan && (
        <div className="install-review-layout">
          <div className="review-card">
            <div className="review-game">
              <div className="monogram v17-review-cover">
                <GameCover seed={`${version}${loaderType}`} loader={loaderType === "vanilla" ? null : loaderType === "quilt" ? "quilt:" : "0"} showVersion={false} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ margin: 0 }}>{name}</h3>
                  <span className="badge-active" style={{ fontSize: "11px" }}>
                    <Sparkles size={13} /> READY FOR REVIEW
                  </span>
                </div>
                <p className="mono">
                  {version} ·{" "}
                  {loaderType === "vanilla"
                    ? "Vanilla (Clean)"
                    : loaderType === "fabric"
                    ? `Fabric ${loaderVersion || "stable"}`
                    : `Quilt ${loaderVersion || "stable"}`}
                </p>
              </div>
            </div>

            <dl className="facts" style={{ margin: "24px 0" }}>
              <div>
                <dt>Download estimate</dt>
                <dd className="mono">{bytes(plan.bytes)}</dd>
              </div>
              <div>
                <dt>Working space needed</dt>
                <dd className="mono">{bytes(plan.disk)}</dd>
              </div>
              <div>
                <dt>Available storage</dt>
                <dd className="mono">{bytes(plan.free)}</dd>
              </div>
              <div>
                <dt>Managed Java Runtime</dt>
                <dd className="mono">Eclipse Temurin {plan.java} · x64</dd>
              </div>
              <div>
                <dt>Memory heap (-Xms = -Xmx)</dt>
                <dd className="mono">{(memory / 1024).toFixed(0)} GB fixed</dd>
              </div>
              <div>
                <dt>Files to verify</dt>
                <dd className="mono">{plan.files.toLocaleString()}</dd>
              </div>
            </dl>

            <div className="notice">
              <Check size={18} />
              <p>
                Official game files. Verified checksums. Your other games and worlds stay
                isolated.
              </p>
            </div>

            {plan.free < plan.disk && (
              <p className="warning" style={{ marginTop: "16px" }}>
                Not enough free space. Free up storage before installing.
              </p>
            )}

            <div
              className="sheet-actions"
              style={{
                position: "sticky",
                bottom: 0,
                background: "var(--loam-paper)",
                padding: "16px 0",
                borderTop: "1px solid var(--loam-line)",
                marginTop: "24px",
              }}
            >
              <button
                className="primary"
                disabled={busy || plan.free < plan.disk}
                onClick={() => void create()}
              >
                <Download size={18} />
                {busy ? "Creating…" : "Install now"}
              </button>
              <button className="text-button" onClick={() => setStage(0)}>
                <ArrowLeft size={16} />
                Back to configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 2 && (
        <div className="install-progress-layout" style={{ padding: "40px 0", textAlign: "center" }}>
          <h2>Setting up your game…</h2>
          <p className="muted">
            Allocating space, configuring managed runtime, and preparing sandbox.
          </p>
          <div
            className="loam-skeleton"
            style={{ width: "320px", height: "6px", margin: "24px auto" }}
          />
          <p className="footnote">You can keep using LOAM while the download finishes.</p>
        </div>
      )}
    </Sheet>
  );
}
