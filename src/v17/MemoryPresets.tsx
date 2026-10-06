// One-click memory presets for a game. LOAM already adds tuned G1 flags at launch, so a
// preset mostly sets memory; the low-RAM preset also deduplicates strings to save heap.
import { Cpu, Feather, Layers, Sparkles, SunMedium } from "lucide-react";

type Preset = { id: string; label: string; note: string; mb: number; extra: string[]; icon: typeof Cpu; modded?: boolean };
const presets: Preset[] = [
  { id: "low", label: "Low RAM PC", note: "2 GB, leaner heap", mb: 2048, extra: ["-XX:+UseStringDeduplication"], icon: Feather },
  { id: "vanilla", label: "Vanilla", note: "3 GB", mb: 3072, extra: [], icon: Cpu },
  { id: "modded", label: "Modded", note: "6 GB", mb: 6144, extra: [], icon: Layers, modded: true },
  { id: "heavy", label: "Heavy pack", note: "8 GB", mb: 8192, extra: [], icon: Sparkles, modded: true },
  { id: "shaders", label: "Shaders", note: "6 GB", mb: 6144, extra: [], icon: SunMedium, modded: true },
];
const managed = new Set(presets.flatMap((p) => p.extra));

export function MemoryPresets({ ramMB, memory, jvm, modded, onPick }: {
  ramMB: number; memory: number; jvm: string; modded: boolean; onPick: (memory: number, jvm: string) => void;
}) {
  // Never suggest more than 75% of this PC's memory.
  const cap = Math.max(1024, Math.floor((ramMB * 0.75) / 512) * 512);
  const lines = jvm.split("\n").map((s) => s.trim()).filter(Boolean);
  const own = lines.filter((l) => !managed.has(l));
  const active = presets.find((p) => Math.min(p.mb, cap) === memory && p.extra.every((x) => lines.includes(x)) && lines.filter((l) => managed.has(l)).length === p.extra.length);
  return (
    <div className="v17-presets" role="radiogroup" aria-label="Memory presets">
      <span className="v17-presets-label">PRESETS</span>
      <div className="v17-presets-row">
        {presets.map((p) => {
          const Icon = p.icon;
          const mb = Math.min(p.mb, cap);
          const capped = mb < p.mb;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={active?.id === p.id}
              className={`v17-preset ${active?.id === p.id ? "active" : ""} ${p.modded && !modded ? "dim" : ""}`}
              title={capped ? `Capped to ${mb / 1024} GB: 75% of this PC's memory` : p.note}
              onClick={() => onPick(mb, [...own, ...p.extra].join("\n"))}>
              <Icon size={15} />
              <span><strong>{p.label}</strong><small>{capped ? `${mb / 1024} GB (PC limit)` : p.note}</small></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
