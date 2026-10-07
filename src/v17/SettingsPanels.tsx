// Settings panels added in 1.7: Home scene and Integrations.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ImagePlus, KeyRound, Loader2, Trash2, Volume2 } from "lucide-react";
import { call, native } from "../api";
import { type SceneTime } from "./art";
import PixelScene from "../v19/PixelScene";
import { BIOMES, type Biome } from "../v19/pixel";
import { getVolume, playSfx, setVolume } from "../sound";
import { musicEnabled, setMusicEnabled, setVizMode, vizMode, type VizMode } from "../v19/music";

export type SceneSetting = { mode: "animated" | "still" | "custom"; image: string | null; time: "auto" | SceneTime; biome: "auto" | Biome };
const SCENE = "loam_home_scene", IMAGE = "loam_home_image", TIME = "loam_scene_time", BIOME = "loam_scene_biome";
const TIMES = ["auto", "dawn", "day", "dusk", "night"] as const;

export function readScene(): SceneSetting {
  try {
    const mode = localStorage.getItem(SCENE);
    const image = localStorage.getItem(IMAGE);
    // `?time=dusk` (browser preview and website screenshots) overrides the saved choice.
    const time = (new URLSearchParams(window.location.search).get("time") || localStorage.getItem(TIME)) as SceneSetting["time"] | null;
    return {
      mode: mode === "still" || (mode === "custom" && image) ? (mode as SceneSetting["mode"]) : "animated",
      image,
      time: time && (TIMES as readonly string[]).includes(time) ? time : "auto",
      biome: (() => { const b = new URLSearchParams(window.location.search).get("biome") || localStorage.getItem(BIOME); return BIOMES.some((x) => x.id === b) ? (b as Biome) : "auto"; })(),
    };
  } catch {
    return { mode: "animated", image: null, time: "auto", biome: "auto" };
  }
}

/** Downscale a picked image to at most 1800×900 JPEG so it fits in local storage. */
async function shrink(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Choose an image under 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1800 / img.naturalWidth, 900 / img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ScenePanel({ scene, onChange, seed, loader, soundOn, onSound }: {
  scene: SceneSetting; onChange: (s: SceneSetting) => void; seed: string; loader: string | null;
  soundOn: boolean; onSound: (on: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [volume, setVol] = useState(getVolume());
  const save = (s: SceneSetting) => {
    try {
      localStorage.setItem(SCENE, s.mode);
      localStorage.setItem(TIME, s.time);
      localStorage.setItem(BIOME, s.biome);
      if (s.image) localStorage.setItem(IMAGE, s.image); else localStorage.removeItem(IMAGE);
      setError("");
      onChange(s);
    } catch {
      setError("That image is too large to keep. Try a smaller one.");
    }
  };
  const option = (mode: SceneSetting["mode"], label: string, note: string, preview: ReactNode) => (
    <button type="button" role="radio" aria-checked={scene.mode === mode} className={`v17-scene-option ${scene.mode === mode ? "active" : ""}`}
      onClick={() => (mode === "custom" && !scene.image ? input.current?.click() : save({ ...scene, mode }))}>
      <span className="v17-scene-preview">{preview}</span>
      <strong>{label} {scene.mode === mode && <Check size={14} />}</strong>
      <small>{note}</small>
    </button>
  );
  return (
    <>
      <h2>Home and sound.</h2>
      <p className="muted">The scene behind your player on Home, and how LOAM sounds.</p>
      <div className="v17-scene-options" role="radiogroup" aria-label="Home scene">
        {option("animated", "Animated", "Blocky clouds drift, water shimmers, and fireflies, petals or snow drift by. Pauses while you play.", <PixelScene seed={seed} biome={scene.biome} time={scene.time} animate />)}
        {option("still", "Still", "The same landscape, no movement.", <PixelScene seed={seed} biome={scene.biome} time={scene.time} />)}
        {option("custom", "Your image", scene.image ? "Your picture, softly shaded so text stays readable." : "PNG or JPEG. A wide picture works best.",
          scene.image ? <span className="v17-scene-image" style={{ backgroundImage: `url("${scene.image.replace(/"/g, "%22")}")` }} /> : <span className="v17-scene-empty"><ImagePlus size={22} /></span>)}
      </div>
      <div className="v17-head-actions" style={{ marginTop: 12 }}>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try { save({ ...scene, mode: "custom", image: await shrink(f) }); } catch (err) { setError(err instanceof Error ? err.message : "That image couldn't be read."); }
          }} />
        <button type="button" className="v17-btn v17-btn-ghost v17-btn-sm" onClick={() => input.current?.click()}><ImagePlus size={15} /> {scene.image ? "Choose another image" : "Choose an image"}</button>
        {scene.image && <button type="button" className="v17-btn v17-btn-ghost v17-btn-sm" onClick={() => save({ ...scene, mode: scene.mode === "custom" ? "animated" : scene.mode, image: null })}><Trash2 size={15} /> Remove image</button>}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="setting-row" style={{ marginTop: 20 }}>
        <div>
          <h3>Landscape</h3>
          <p>Auto gives each game its own place. Or pick one for every game.</p>
        </div>
        <div className="v17-segment v19-biomes" role="radiogroup" aria-label="Landscape">
          {[{ id: "auto" as const, name: "Auto" }, ...BIOMES].map((b) => (
            <button key={b.id} type="button" role="radio" aria-checked={scene.biome === b.id} className={scene.biome === b.id ? "active" : ""}
              onClick={() => save({ ...scene, biome: b.id })}>{b.name}</button>
          ))}
        </div>
      </div>
      <div className="setting-row">
        <div>
          <h3>Time of day</h3>
          <p>Auto follows your clock: dawn, day, dusk and a starry night. Or keep your favourite.</p>
        </div>
        <div className="v17-segment" role="radiogroup" aria-label="Time of day">
          {TIMES.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={scene.time === t} className={scene.time === t ? "active" : ""}
              onClick={() => save({ ...scene, time: t })}>
              {t === "auto" ? "Auto" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row" style={{ marginTop: 28 }}>
        <div>
          <h3>Music player</h3>
          <p>Play the cozy chill mix, your own YouTube or YouTube Music links, or audio files from this PC, and control what other apps play (no login). Spotify and Apple Music links open in their apps. Minimizing keeps it playing. Turn it off to hide it.</p>
        </div>
        <MusicSwitch get={musicEnabled} set={setMusicEnabled} label="Music player" />
      </div>
      <div className="setting-row">
        <div>
          <h3>Music visualizer</h3>
          <p>Spectrum shows real levels for files LOAM plays. YouTube and other apps get a small playing indicator, because LOAM never captures your PC's sound.</p>
        </div>
        <VizSetting />
      </div>
      <div className="setting-row">
        <div>
          <h3>Interface sounds</h3>
          <p>Soft clicks, a chime when something is ready, and a short swell when Minecraft starts. All made on your PC, nothing streamed.</p>
        </div>
        <label className="v17-toggle">
          <input type="checkbox" checked={soundOn} onChange={(e) => onSound(e.target.checked)} aria-label="Interface sounds" />
          <span />
        </label>
      </div>
      <div className="setting-row">
        <div>
          <h3>Volume</h3>
          <p>How loud interface sounds are. Minecraft's own volume is set in the game.</p>
        </div>
        <div className="v17-volume">
          <Volume2 size={16} />
          <input type="range" min={0} max={100} value={Math.round(volume * 100)} disabled={!soundOn} aria-label="Interface sound volume"
            onChange={(e) => { const v = +e.target.value / 100; setVol(v); setVolume(v); }}
            onPointerUp={() => playSfx("installed")} onKeyUp={() => playSfx("click")} />
          <span className="mono">{Math.round(volume * 100)}</span>
        </div>
      </div>
    </>
  );
}

function VizSetting() {
  const [mode, setMode] = useState<VizMode>(vizMode);
  useEffect(() => {
    const sync = () => setMode(vizMode());
    window.addEventListener("loam-music-change", sync);
    return () => window.removeEventListener("loam-music-change", sync);
  }, []);
  return (
    <div className="v17-segment" role="radiogroup" aria-label="Music visualizer">
      {(["off", "minimal", "spectrum"] as VizMode[]).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={mode === v} className={mode === v ? "active" : ""} onClick={() => setVizMode(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
      ))}
    </div>
  );
}

function MusicSwitch({ get, set, label }: { get: () => boolean; set: (on: boolean) => void; label: string }) {
  const [on, setOn] = useState(get);
  useEffect(() => {
    const sync = () => setOn(get());
    window.addEventListener("loam-music-change", sync);
    return () => window.removeEventListener("loam-music-change", sync);
  }, []);
  return (
    <label className="v17-toggle">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

export function IntegrationsPanel({ onChanged, onToast }: { onChanged: () => void; onToast: (m: string) => void }) {
  const [providers, setProviders] = useState({ modrinth: true, curseforge: false });
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (native) void call<typeof providers>("discoverProviders").then(setProviders).catch(() => {}); }, []);
  async function save(value: string) {
    setBusy(true);
    setError("");
    try {
      const r = await call<{ curseforge: boolean }>("setCurseforgeKey", { key: value });
      setProviders((p) => ({ ...p, curseforge: r.curseforge }));
      setKey("");
      onChanged();
      onToast(value ? "CurseForge connected. It's now a source in Discover." : "CurseForge key removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Where mods come from.</h2>
      <p className="muted">Discover searches these sources. Every file is checksum-verified and opened before it reaches a game.</p>
      <div className="v17-integration">
        <span className="v17-integration-logo mr">M</span>
        <div>
          <h3>Modrinth <span className="v17-ok"><Check size={13} /> Connected</span></h3>
          <p>Mods, modpacks, resource packs and shaders. No account needed. Update checks use Modrinth too.</p>
        </div>
      </div>
      <div className="v17-integration">
        <span className="v17-integration-logo cf">C</span>
        <div style={{ flex: 1 }}>
          <h3>CurseForge {providers.curseforge ? <span className="v17-ok"><Check size={13} /> Connected</span> : <span className="v17-off">Not connected</span>}</h3>
          <p>
            CurseForge requires an API key for apps. Create one for free at console.curseforge.com, then paste it here.
            It is saved in Windows Credential Manager. Some authors only allow downloads on the CurseForge website; LOAM tells you when that happens.
          </p>
          <form className="v17-key" onSubmit={(e) => { e.preventDefault(); if (key.trim()) void save(key); }}>
            <label className="v17-search v17-grow">
              <KeyRound size={15} />
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={providers.curseforge ? "Replace the saved key" : "Paste a CurseForge API key"} aria-label="CurseForge API key" autoComplete="off" spellCheck={false} />
            </label>
            <button type="submit" className="v17-btn v17-btn-primary" disabled={busy || !key.trim() || !native}>{busy ? <Loader2 size={15} className="v17-spin" /> : null} Connect</button>
            {providers.curseforge && <button type="button" className="v17-btn v17-btn-ghost" disabled={busy} onClick={() => void save("")}>Disconnect</button>}
          </form>
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
      </div>
    </>
  );
}
