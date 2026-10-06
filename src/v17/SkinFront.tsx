// A flat, front-on figure drawn from a Minecraft skin texture: head, body, arms and legs with
// their outer layers, in the standard 64×64 layout (64×32 legacy skins mirror the left limbs).
import { useEffect, useRef } from "react";

type Part = [sx: number, sy: number, w: number, h: number, dx: number, dy: number, mirror?: boolean];

function parts(slim: boolean, legacy: boolean): Part[] {
  const a = slim ? 3 : 4;
  const base: Part[] = [
    [8, 8, 8, 8, 4, 0], // head
    [20, 20, 8, 12, 4, 8], // body
    [44, 20, a, 12, 4 - a, 8], // right arm (shown on the left)
    [4, 20, 4, 12, 4, 20], // right leg
  ];
  const left: Part[] = legacy
    ? [[44, 20, a, 12, 12, 8, true], [4, 20, 4, 12, 8, 20, true]]
    : [[36, 52, a, 12, 12, 8], [20, 52, 4, 12, 8, 20]];
  const overlay: Part[] = legacy
    ? [[40, 8, 8, 8, 4, 0]]
    : [[40, 8, 8, 8, 4, 0], [20, 36, 8, 12, 4, 8], [44, 36, a, 12, 4 - a, 8], [52, 52, a, 12, 12, 8], [4, 36, 4, 12, 4, 20], [4, 52, 4, 12, 8, 20]];
  return [...base, ...left, ...overlay];
}

export default function SkinFront({ src, slim = false, height = 48, label }: { src: string; slim?: boolean; height?: number; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => {
      const c = ref.current;
      if (!live || !c) return;
      const g = c.getContext("2d")!;
      g.clearRect(0, 0, 16, 32);
      g.imageSmoothingEnabled = false;
      const legacy = img.naturalHeight === img.naturalWidth / 2;
      const k = img.naturalWidth / 64; // HD skins scale the same layout
      for (const [sx, sy, w, h, dx, dy, mirror] of parts(slim, legacy)) {
        if (mirror) {
          g.save();
          g.translate(dx + w, dy);
          g.scale(-1, 1);
          g.drawImage(img, sx * k, sy * k, w * k, h * k, 0, 0, w, h);
          g.restore();
        } else {
          g.drawImage(img, sx * k, sy * k, w * k, h * k, dx, dy, w, h);
        }
      }
    };
    img.src = src;
    return () => { live = false; };
  }, [src, slim]);
  return (
    <canvas ref={ref} width={16} height={32} className="v17-skinfront" role="img" aria-label={label}
      style={{ width: height / 2, height, imageRendering: "pixelated" }} />
  );
}
