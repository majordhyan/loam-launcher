import { useEffect, useRef, useState } from "react";
import { SkinViewer, IdleAnimation, WalkingAnimation } from "skinview3d";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Globe,
  RotateCcw,
  Pause,
  Play,
  Check,
  Shirt,
  ShieldCheck,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { call, native, type Account } from "./api";
import { Sheet } from "./ui";
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
export default function SkinStudio({
  account,
  onBack,
  onAccounts,
  onError,
  onReport,
  reducedMotion,
}: {
  account?: Account;
  onBack: () => void;
  onAccounts: () => void;
  onError: (e: unknown) => void;
  onReport: () => void;
  reducedMotion: boolean;
}) {
  const [look, setLook] = useState<Look>(initial),
    [cape, setCape] = useState("loam"),
    [capes, setCapes] = useState<Cape[]>([]),
    [source, setSource] = useState(""),
    [busy, setBusy] = useState(""),
    [status, setStatus] = useState(""),
    [confirm, setConfirm] = useState(""),
    [animated, setAnimated] = useState(
      !reducedMotion && !matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [rotate, setRotate] = useState(false),
    [pose, setPose] = useState("idle"),
    [viewerError, setViewerError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null),
    viewer = useRef<SkinViewer | null>(null);
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
        width: 400,
        height: 460,
        zoom: 0.86,
        fov: 42,
        pixelRatio: Math.min(devicePixelRatio, 2),
      });
      viewer.current = v;
      v.playerObject.rotation.y = 0;
      v.camera.position.set(24, 8, 48);
      v.controls.update();
      v.controls.enablePan = false;
      v.controls.minDistance = 30;
      v.controls.maxDistance = 100;
      const observer = new ResizeObserver(() => {
        if (host.current) {
          v.width = host.current.clientWidth;
          v.height = host.current.clientHeight;
        }
      });
      observer.observe(host.current!);
      return () => {
        observer.disconnect();
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
    let live = true;
    void viewer.current
      ?.loadSkin(look.skin, {
        model: look.variant === "slim" ? "slim" : "default",
      })
      .then(()=>{if(live)setViewerError('');})
      .catch(() => {
        if (live)
          setViewerError(
            "This texture could not be shown. Choose another PNG.",
          );
      });
    return () => {
      live = false;
    };
  }, [look.skin, look.variant]);
  useEffect(() => {
    const source =
      cape === "loam"
        ? "/wardrobe/loam-cape.png"
        : capes.find((c) => c.id === cape)?.texture;
    if (source) void viewer.current?.loadCape(source).catch(onError);
    else viewer.current?.loadCape(null);
  }, [cape, capes]);
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    v.autoRotate = rotate;
    v.autoRotateSpeed = 0.6;
    v.animation =
      pose === "walk" ? new WalkingAnimation() : new IdleAnimation();
    v.animation.paused = !animated;
  }, [animated, rotate, pose]);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (q.matches) {
        setAnimated(false);
        setRotate(false);
      }
    };
    q.addEventListener("change", changed);
    return () => q.removeEventListener("change", changed);
  }, []);
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
  return (
    <main className="studio-page page-enter">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={17} />
        BACK TO HOME
      </button>
      <div className="page-title">
        <div>
          <h1>Make it yours.</h1>
          <p className="page-subtitle">
            Your skin. Your silhouette. Every little detail.
          </p>
        </div>
        <span className="eyebrow">SKIN STUDIO / 01</span>
      </div>
      <div className="studio-grid">
        <section className="model-panel" aria-label="3D skin and cape preview">
          <div className="model-label">
            <span className="eyebrow">{look.name}</span>
            <span className="preview-tag">LOCAL PREVIEW</span>
          </div>
          <div ref={host} className="model-canvas">
            <canvas
              ref={canvas}
              aria-label="Rotatable Minecraft player model. Use the view buttons below, or drag to rotate."
            />
            {viewerError && (
              <div className="model-fallback">
                <img src={look.skin} alt="Skin texture" />
                <p>{viewerError}</p>
                <button onClick={onReport}>REPORT THIS</button>
              </div>
            )}
          </div>
          <div className="model-controls">
            <button
              className="icon-button"
              aria-label={animated ? "Pause animation" : "Play animation"}
              aria-pressed={animated}
              onClick={() => setAnimated(!animated)}
            >
              {animated ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              className="icon-button"
              aria-label="Auto rotate model"
              aria-pressed={rotate}
              onClick={() => setRotate(!rotate)}
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => {
                setRotate(false);
                if (viewer.current) {
                  viewer.current.playerObject.rotation.y = 0;
                  viewer.current.controls.reset();
                  viewer.current.camera.position.set(0, 0, 68);
                  viewer.current.controls.update();
                }
              }}
            >
              Front
            </button>
            <button
              onClick={() => {
                setRotate(false);
                if (viewer.current) {
                  viewer.current.playerObject.rotation.y = Math.PI;
                  viewer.current.controls.reset();
                  viewer.current.camera.position.set(0, 0, 68);
                  viewer.current.controls.update();
                }
              }}
            >
              Back
            </button>
            <select
              aria-label="Model pose"
              value={pose}
              onChange={(e) => setPose(e.target.value)}
            >
              <option value="idle">Idle</option>
              <option value="walk">Walk</option>
            </select>
          </div>
          <p className="footnote model-hint">Drag to rotate · Scroll to zoom</p>
        </section>
        <section className="studio-options">
          <div className="section-label">
            <span className="eyebrow">01 / CHOOSE A SKIN</span>
            <Shirt size={19} />
          </div>
          <div className="skin-source-buttons">
            <button
              className="secondary"
              disabled={!!busy}
              onClick={() =>
                void task("Reading PNG", async () => {
                  const path = await open({
                    multiple: false,
                    filters: [{ name: "Minecraft skin", extensions: ["png"] }],
                  });
                  if (typeof path === "string")
                    setLook(await call<Look>("skinImport", { path }));
                })
              }
            >
              <Upload size={17} />
              UPLOAD PNG
            </button>
            <button
              className="secondary"
              onClick={() => {
                setLook(initial);
                setStatus("LOAM Field selected.");
              }}
            >
              LOAM FIELD
            </button>
          </div>
          <p className="footnote">
            64 × 64 or legacy 64 × 32 PNG · Maximum 1 MB
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void task("Finding skin", async () => {
                setLook(await call<Look>("skinOnline", { input: source }));
                setStatus("Skin imported for review.");
              });
            }}
          >
            <label>
              IMPORT FROM THE INTERNET
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Minecraft player name or official texture URL"
                maxLength={256}
              />
            </label>
            <button className="text-button" disabled={!!busy || !source.trim()}>
              <Globe size={16} />
              FIND SKIN
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="setting-row">
            <div>
              <h3>Player model</h3>
              <p>Choose the arm width for this texture.</p>
            </div>
            <div className="segmented">
              {(["classic", "slim"] as const).map((v) => (
                <button
                  key={v}
                  aria-pressed={look.variant === v}
                  onClick={() => setLook({ ...look, variant: v })}
                >
                  {v === "classic" ? "Classic" : "Slim"}
                </button>
              ))}
            </div>
          </div>
          <div className="section-label">
            <span className="eyebrow">02 / THE FINISHING TOUCH</span>
            <ShieldCheck size={19} />
          </div>
          <label>
            CAPE
            <select value={cape} onChange={(e) => setCape(e.target.value)}>
              <option value="none">No cape</option>
              <option value="loam">LOAM Signature — preview only</option>
              {capes.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name || "Owned cape"}
                  {c.active ? " · Active" : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="footnote">
            The original LOAM cape is a studio preview. In Minecraft, you can
            equip only capes your Microsoft account owns.
          </p>
          {official ? (
            <div className="inline-actions">
              <button
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
                LOAD MY WARDROBE
              </button>
              <button
                className="text-button"
                disabled={!!busy || cape === "loam"}
                onClick={() => setConfirm("cape")}
              >
                APPLY OWNED CAPE
              </button>
            </div>
          ) : (
            <div className="studio-account-note">
              <span className="eyebrow">
                {account ? "OFFLINE PROFILE" : "NO ACCOUNT SELECTED"}
              </span>
              <p>
                Save and preview your look here. Official skin and cape changes
                need a Microsoft account with Java Edition.
              </p>
              <button className="text-button" onClick={onAccounts}>
                ACCOUNTS
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          <div className="studio-save">
            <button
              className="primary"
              disabled={!!busy}
              onClick={() =>
                void task("Saving look", async () => {
                  await call("skinSave", await payload());
                  setStatus("Look saved on this device.");
                })
              }
            >
              SAVE LOOK
              <Check size={18} />
            </button>
            {official && (
              <button
                className="secondary"
                disabled={!!busy}
                onClick={() => setConfirm("skin")}
              >
                APPLY TO MINECRAFT
                <ArrowRight size={18} />
              </button>
            )}
          </div>
          <p className="studio-status" role="status">
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
          eyebrow="MINECRAFT ACCOUNT"
          onClose={() => setConfirm("")}
        >
          <p>
            This changes the official appearance of{" "}
            <strong>{account?.name}</strong>.{" "}
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
              CONFIRM CHANGE
              <Check size={17} />
            </button>
            <button className="text-button" onClick={() => setConfirm("")}>
              CANCEL
            </button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
