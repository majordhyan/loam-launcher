// The player on Home: the account's own skin in 3D. Waves when the page opens and on click,
// then breathes. Drag to turn. Rendering stops while a game runs or motion is off.
import { useEffect, useRef, useState } from "react";
import { SkinViewer, IdleAnimation, WaveAnimation, WalkingAnimation } from "skinview3d";
import { call, native, type Account } from "../api";

const cacheKey = (id: string) => `loam_skin_${id}`;

async function textureUrl(src: string) {
  // three.js can't load data: URLs under LOAM's CSP; hand it a blob: URL instead.
  if (!src.startsWith("data:")) return { url: src, revoke: () => {} };
  const blob = await (await fetch(src)).blob();
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

export default function HeroSkin({ account, paused, celebrate }: { account?: Account; paused: boolean; celebrate: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<SkinViewer | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let v: SkinViewer;
    try {
      v = new SkinViewer({
        canvas: canvas.current!,
        width: host.current!.clientWidth || 280,
        height: host.current!.clientHeight || 360,
        zoom: 0.74,
        fov: 38,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch {
      setFailed(true);
      return;
    }
    viewer.current = v;
    v.background = null;
    v.camera.position.set(-20, 3, 62);
    v.controls.enableZoom = false;
    v.controls.enablePan = false;
    v.controls.update();
    v.playerObject.rotation.y = 0.32;
    const wave = new WaveAnimation("right");
    wave.speed = 1.1;
    v.animation = wave;
    const settle = window.setTimeout(() => { if (viewer.current) viewer.current.animation = new IdleAnimation(); }, 2600);
    const ro = new ResizeObserver(() => {
      if (!host.current) return;
      v.width = host.current.clientWidth;
      v.height = host.current.clientHeight;
      if (v.renderPaused) v.render();
    });
    ro.observe(host.current!);
    return () => { window.clearTimeout(settle); ro.disconnect(); v.dispose(); viewer.current = null; };
  }, []);

  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    let live = true;
    let revoke = () => {};
    (async () => {
      let src: string | null = null;
      if (account) {
        try { src = localStorage.getItem(cacheKey(account.id)); } catch { /* storage unavailable */ }
        if (native) src = (await call<string | null>("accountSkin", { id: account.id }).catch(() => null)) || src;
      }
      const t = await textureUrl(src || "/wardrobe/steve.png").catch(() => ({ url: "/wardrobe/steve.png", revoke: () => {} }));
      revoke = t.revoke;
      if (!live) return t.revoke();
      try { await v.loadSkin(t.url); } catch { await v.loadSkin("/wardrobe/steve.png").catch(() => {}); }
      // With rendering paused (motion off, game running) draw one still frame of the new skin.
      if (live && v.renderPaused) v.render();
    })();
    return () => { live = false; revoke(); };
  }, [account?.id, account?.verified]);

  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    const off = paused || document.documentElement.dataset.motion === "off";
    v.renderPaused = off;
    if (off) v.render();
  }, [paused]);

  // Launch and install: a short walk, then back to idle.
  useEffect(() => {
    const v = viewer.current;
    if (!v || !celebrate || document.documentElement.dataset.motion !== "full") return;
    const walk = new WalkingAnimation();
    walk.speed = 1.4;
    v.animation = walk;
    const t = window.setTimeout(() => { if (viewer.current) viewer.current.animation = new IdleAnimation(); }, 1800);
    return () => window.clearTimeout(t);
  }, [celebrate]);

  if (failed) return null;
  return (
    <div className="v17-skin" ref={host}
      onDoubleClick={() => { const v = viewer.current; if (v) { v.animation = new WaveAnimation("right"); window.setTimeout(() => { if (viewer.current) viewer.current.animation = new IdleAnimation(); }, 2400); } }}
      title="Drag to turn · double-click to wave">
      <canvas ref={canvas} />
      <div className="v17-skin-shadow" />
    </div>
  );
}
