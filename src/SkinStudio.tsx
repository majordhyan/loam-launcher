import { useEffect, useRef, useState } from "react";
import { SkinViewer, IdleAnimation, WalkingAnimation } from "skinview3d";
import {
  ArrowRight,
  Upload,
  RotateCcw,
  Pause,
  Play,
  Check,
  RotateCw,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { call, native, type Account } from "./api";
import { CustomSelect, Segmented, Sheet } from "./ui";
import { HeroScene } from "./v17/art";

type Look = {
  skin: string;
  variant: "classic" | "slim";
  name: string;
  cape?: boolean;
};

type Cape = { id: string; name: string; texture: string; active: boolean };

const initial: Look = {
  skin: "/wardrobe/loam-field.png",
  variant: "classic",
  name: "LOAM Field",
};

const RECENT_SKINS = [
  { id: "loam-field", name: "LOAM Field", skin: "/wardrobe/loam-field.png", variant: "classic" as const },
  { id: "classic-steve", name: "Steve", skin: "/wardrobe/steve.png", variant: "classic" as const },
  { id: "classic-alex", name: "Alex", skin: "/wardrobe/alex.png", variant: "slim" as const },
];

export default function SkinStudio({
  account,
  onBack,
  onNavigate,
  onCommandPalette,
  onAccounts,
  onError,
  onReport,
  reducedMotion,
}: {
  account?: Account;
  onBack: () => void;
  onNavigate: (page: string) => void;
  onCommandPalette: () => void;
  onAccounts: () => void;
  onError: (e: unknown) => void;
  onReport: () => void;
  reducedMotion: boolean;
}) {
  const [look, setLook] = useState<Look>(initial);
  const [savedLook, setSavedLook] = useState<Look>(initial);
  const [cape, setCape] = useState("loam");
  const [capes, setCapes] = useState<Cape[]>([]);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState("");
  const [animated, setAnimated] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [pose, setPose] = useState<"idle" | "walk" | "wave">("idle");
  const [viewAngle, setViewAngle] = useState<"front" | "back">("front");
  const [viewerError, setViewerError] = useState("");
  const [usernameSearch, setUsernameSearch] = useState("");

  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<SkinViewer | null>(null);
  const official = account?.kind === "microsoft";

  async function task(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setStatus("");
    try {
      await fn();
    } catch (e) {
      onError(e);
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (native)
      void call<Look | null>("skinStudio")
        .then((v) => {
          if (v) {
            setLook(v);
            setSavedLook(v);
            setCape(v.cape ? "loam" : "none");
          }
        })
        .catch(onError);
  }, []);

  useEffect(() => {
    setCapes([]);
    setConfirm("");
    if (cape !== "loam" && cape !== "none") setCape("none");
  }, [account?.id]);

  useEffect(() => {
    let v: SkinViewer;
    try {
      v = new SkinViewer({
        canvas: canvas.current!,
        width: 380,
        height: 440,
        zoom: 0.86,
        fov: 42,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
      viewer.current = v;
      v.playerObject.rotation.y = 0;
      v.camera.position.set(24, 8, 48);
      v.controls.update();
      v.controls.enablePan = false;
      const redraw = () => { if (v.renderPaused && !document.hidden) v.render(); };
      v.controls.addEventListener("change", redraw);
      v.controls.minDistance = 30;
      v.controls.maxDistance = 100;

      const observer = new ResizeObserver(() => {
        if (host.current && v) {
          v.width = host.current.clientWidth;
          v.height = host.current.clientHeight;
        }
      });
      observer.observe(host.current!);

      return () => {
        observer.disconnect();
        v.controls.removeEventListener("change", redraw);
        v.dispose();
        viewer.current = null;
      };
    } catch {
      setViewerError(
        "The 3D preview needs WebGL. Your texture can still be imported, saved and applied.",
      );
    }
  }, []);

  useEffect(() => {
    if (!viewer.current) return;
    const currentViewer = viewer.current;
    let live = true;
    let objectUrl: string | undefined;

    // Clear any previous error immediately so the fallback doesn't linger
    setViewerError("");

    async function doLoad() {
      let src = look.skin;

      // skinview3d uses Three.js TextureLoader which can't fetch data: URLs
      // under a strict CSP. Convert to a blob: URL first.
      if (src.startsWith("data:")) {
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          if (!live) return;
          objectUrl = URL.createObjectURL(blob);
          src = objectUrl;
        } catch {
          // If conversion fails, try passing raw — may still work on some builds
        }
      }

      try {
        if (!live) return;
        // Decode before applying: an older request must not replace a newer selection.
        const texture = new Image();
        texture.crossOrigin = "anonymous";
        texture.src = src;
        await texture.decode();
        if (!live) return;
        await currentViewer.loadSkin(texture, {
          model: look.variant === "slim" ? "slim" : "default",
        });
        if (live) { currentViewer.render(); setViewerError(""); }
      } catch {
        if (live)
          setViewerError(
            "This texture could not be shown. Choose another PNG.",
          );
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      }
    }

    void doLoad();
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [look.skin, look.variant]);

  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    const update = () => { v.renderPaused = document.hidden || document.documentElement.dataset.motionPaused === "true" || reducedMotion || (!animated && !rotate); if (!document.hidden) v.render(); };
    document.addEventListener("visibilitychange", update);
    window.addEventListener("loam-motion-change", update);
    update();
    return () => { document.removeEventListener("visibilitychange", update); window.removeEventListener("loam-motion-change", update); };
  }, [reducedMotion, animated, rotate]);

  useEffect(() => {
    const source =
      cape === "loam"
        ? "/wardrobe/loam-cape.png"
        : capes.find((c) => c.id === cape)?.texture;
    if (source) void viewer.current?.loadCape(source).then(() => viewer.current?.render()).catch(onError);
    else { viewer.current?.loadCape(null); viewer.current?.render(); }
  }, [cape, capes]);

  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    v.autoRotate = rotate && !reducedMotion;
    v.autoRotateSpeed = 0.6;
    v.animation =
      pose === "walk" ? new WalkingAnimation() : new IdleAnimation();
    v.animation.paused = !animated || reducedMotion;
  }, [animated, rotate, pose, reducedMotion]);

  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    setRotate(false);
    v.playerObject.rotation.y = viewAngle === "front" ? 0 : Math.PI;
    v.controls.reset();
    v.camera.position.set(0, 0, 68);
    v.controls.update();
    v.render();
  }, [viewAngle]);

  async function payload() {
    let skin = look.skin;
    if (skin.startsWith("/")) {
      const b = await (await fetch(skin)).blob();
      skin = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(b);
      });
    }
    return { skin, variant: look.variant, cape };
  }

  const isLookDirty =
    look.skin !== savedLook.skin ||
    look.variant !== savedLook.variant ||
    look.name !== savedLook.name;

  return (
    <main className="v17-page v17-skins">
      <header className="v17-page-head v17-rise">
        <div>
          <p className="v17-eyebrow">Skin and cape studio</p>
          <h1 className="v17-display">Make it yours<span className="v17-dot">.</span></h1>
        </div>
        <button type="button" className="v17-btn v17-btn-ghost" onClick={onAccounts}>
          {account ? `${account.name} · ${account.kind === "microsoft" ? "Microsoft" : "Offline"}` : "Choose an account"}
        </button>
      </header>
      <div className="studio-grid">
        {/* LEFT COLUMN: 3D Preview with Controls */}
        <section className="model-panel" aria-label="3D skin and cape preview">
          <div className="v17-stage-scene"><HeroScene seed={look.name} loader="0" /></div>
          <div className="model-label">
            <span className="eyebrow">{look.name}</span>
            <span className="preview-tag">Preview</span>
          </div>

          <div ref={host} className="model-canvas">
            <canvas
              ref={canvas}
              aria-label="Rotatable Minecraft player model. Use controls below or drag to rotate."
            />
            {viewerError && (
              <div className="model-fallback">
                <img src={look.skin} alt="Skin texture" />
                <p>{viewerError}</p>
                <button className="text-button" onClick={onReport}>
                  Report this
                </button>
              </div>
            )}
          </div>

          {/* VIEWER TOOLBAR */}
          <div className="model-controls">
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="icon-button"
                aria-label={animated ? "Pause animation" : "Play animation"}
                title={animated ? "Pause animation" : "Play animation"}
                onClick={() => setAnimated(!animated)}
              >
                {animated ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Auto rotate model"
                title="Auto rotate model"
                onClick={() => setRotate(!rotate)}
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Segmented Front / Back */}
            <Segmented
              value={viewAngle}
              onChange={setViewAngle}
              options={[
                { value: "front", label: "Front" },
                { value: "back", label: "Back" },
              ]}
            />

            {/* Segmented Idle / Walk / Wave */}
            <Segmented
              value={pose}
              onChange={setPose}
              options={[
                { value: "idle", label: "Idle" },
                { value: "walk", label: "Walk" },
                { value: "wave", label: "Wave" },
              ]}
            />
          </div>

          {/* RECENT SKINS STRIP (64px thumbnails) */}
          <div className="recent-skins-strip" style={{ marginTop: "16px" }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: "8px" }}>
              Recent skins
            </span>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {RECENT_SKINS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`recent-skin-thumb ${look.skin === s.skin ? "active" : ""}`}
                  title={s.name}
                  onClick={() =>
                    setLook({
                      skin: s.skin,
                      variant: s.variant,
                      name: s.name,
                    })
                  }
                >
                  <img
                    src={s.skin}
                    alt={s.name}
                    style={{ width: "32px", height: "32px", imageRendering: "pixelated" }}
                  />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Settings & Customization */}
        <section className="studio-options">
          <div className="studio-section">
            <span className="eyebrow">1 · Choose a skin</span>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button
                type="button"
                className="secondary"
                disabled={!!busy}
                onClick={async () => {
                  const path = await open({
                    filters: [{ name: "PNG image", extensions: ["png"] }],
                  });
                  if (!path || typeof path !== "string") return;
                  const res = await call<{
                    skin: string;
                    variant: Look["variant"];
                    name: string;
                  }>("skinImport", { path });
                  setLook({
                    skin: res.skin,
                    variant: res.variant,
                    name: res.name || path.split(/[\\\/]/).pop() || "Custom skin",
                  });
                  setStatus("Skin loaded. Click Save Look to apply.");
                }}
              >
                <Upload size={16} />
                Choose PNG file…
              </button>
            </div>

            {/* Username / URL search */}
            <div style={{ marginTop: "14px" }}>
              <p className="footnote" style={{ marginBottom: "6px" }}>
                Or search by Minecraft username to preview another player's skin:
              </p>
              <form
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const q = usernameSearch.trim();
                  if (!q) return;
                  void task("Searching skin", async () => {
                    const res = await call<{
                      skin: string;
                      variant: Look["variant"];
                      name: string;
                    }>("skinOnline", { input: q });
                    setLook({
                      skin: res.skin,
                      variant: res.variant,
                      name: res.name || q,
                    });
                    setUsernameSearch("");
                    setStatus(`Skin for "${q}" loaded. Click Save Look to apply.`);
                  });
                }}
              >
                <input
                  type="text"
                  className="field-input"
                  style={{ flex: 1, height: "38px", fontSize: "13px" }}
                  placeholder="Username or skin URL…"
                  value={usernameSearch}
                  onChange={(e) => setUsernameSearch(e.target.value)}
                  minLength={3}
                  maxLength={200}
                  disabled={!!busy}
                  aria-label="Search Minecraft username or paste skin URL"
                />
                <button
                  type="submit"
                  className="secondary"
                  disabled={!!busy || !usernameSearch.trim()}
                  style={{ height: "38px", padding: "0 14px", whiteSpace: "nowrap" }}
                >
                  Search
                </button>
              </form>
            </div>

            <p className="footnote" style={{ marginTop: "8px" }}>
              Classic (4 px arm) or Slim (3 px arm) skins, 64×64 or 64×32.
            </p>
          </div>

          <div className="studio-section">
            <span className="eyebrow">Arm style</span>
            <div style={{ marginTop: "8px" }}>
              <Segmented
                value={look.variant}
                onChange={(v) => setLook({ ...look, variant: v })}
                options={[
                  { value: "classic", label: "Classic (4 px)" },
                  { value: "slim", label: "Slim (3 px)" },
                ]}
              />
            </div>
          </div>

          <div className="studio-section">
            <span className="eyebrow">2 · Add a cape</span>
            <div style={{ marginTop: "8px" }}>
              <CustomSelect
                label="Cape selection"
                value={cape}
                onChange={setCape}
                options={[
                  { value: "none", label: "No cape" },
                  { value: "loam", label: "LOAM Signature", badge: "preview only" },
                  ...capes.map((c) => ({
                    value: c.id,
                    label: c.name || "Owned cape",
                    badge: c.active ? "Active" : undefined,
                  })),
                ]}
              />
            </div>
            <p className="footnote" style={{ marginTop: "6px" }}>
              The original LOAM cape is a studio preview. In Minecraft, you can
              equip only capes your Microsoft account owns.
            </p>
          </div>

          {official ? (
            <div className="inline-actions" style={{ margin: "16px 0" }}>
              <button
                type="button"
                className="text-button"
                disabled={!!busy}
                onClick={() =>
                  void task("Loading wardrobe", async () => {
                    const w = await call<{
                      skin: string | null;
                      variant: Look["variant"];
                      capes: Cape[];
                    }>("skinWardrobe");
                    setCapes(w.capes);
                    if (w.skin)
                      setLook({
                        skin: w.skin,
                        variant: w.variant,
                        name: account!.name,
                      });
                    setCape(w.capes.find((c) => c.active)?.id || "none");
                    setStatus("Official wardrobe loaded.");
                  })
                }
              >
                Load my wardrobe
              </button>
              <button
                type="button"
                className="text-button"
                disabled={!!busy || cape === "loam"}
                onClick={() => setConfirm("cape")}
              >
                Apply owned cape
              </button>
            </div>
          ) : (
            <div className="studio-account-note" style={{ margin: "16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="eyebrow">
                  {account ? "Offline profile" : "No account selected"}
                </span>
                <span className="badge-active">Preview</span>
              </div>
              <p>
                Save a local look for supported offline games. Other players may not see this appearance.
                Official uploads require a verified Microsoft Minecraft account.
              </p>
              <button type="button" className="text-button" onClick={onAccounts}>
                Accounts
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* STICKY BOTTOM ACTION BAR */}
          <div className="studio-sticky-actions">
            <button
              type="button"
              className="primary"
              disabled={!!busy || !isLookDirty}
              onClick={() =>
                void task("Saving look", async () => {
                  await call("skinSave", await payload());
                  setSavedLook(look);
                  setStatus("Look saved and applied to your Minecraft games.");
                })
              }
            >
              Save look
              <Check size={18} />
            </button>

            <button
              type="button"
              className="text-button"
              disabled={!!busy || !isLookDirty}
              onClick={() => setLook(savedLook)}
            >
              Reset
            </button>

            {official && (
              <button
                type="button"
                className="secondary"
                disabled={!!busy}
                onClick={() => setConfirm("skin")}
              >
                Apply to Minecraft
                <ArrowRight size={18} />
              </button>
            )}
          </div>

          <p className="studio-status" role="status" style={{ marginTop: "12px" }}>
            {busy
              ? `${busy}…`
              : status ||
                "Changes stay in the studio until you save or apply them."}
          </p>
        </section>
      </div>

      {confirm && (
        <Sheet
          title={
            confirm === "skin"
              ? "Wear this skin?"
              : "Change your official cape?"
          }
          eyebrow="Minecraft account"
          onClose={() => setConfirm("")}
        >
          <p>
            This changes the official appearance of <strong>{account?.name}</strong>.{" "}
            {confirm === "skin"
              ? "The PNG will be uploaded to Minecraft Services. The preview cape is not uploaded."
              : "Only a cape owned by this account can be equipped."}
          </p>
          <div className="sheet-actions">
            <button
              className="primary"
              disabled={!!busy}
              onClick={() =>
                void task("Updating Minecraft", async () => {
                  if (confirm === "skin")
                    await call("skinApply", await payload());
                  else
                    await call("capeApply", {
                      id: cape === "none" ? "" : cape,
                    });
                  setConfirm("");
                  setStatus(
                    "Minecraft appearance updated. Rejoin your game to see the change.",
                  );
                })
              }
            >
              Confirm change
              <Check size={17} />
            </button>
            <button className="text-button" onClick={() => setConfirm("")}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
