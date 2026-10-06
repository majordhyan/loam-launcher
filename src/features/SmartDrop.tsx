import { useState } from "react";
import { ArrowRight, Check, Plus, Package } from "lucide-react";
import { Sheet } from "../ui";

export type DropTarget = {
  id: string;
  name: string;
  version: string;
  loader: string | null;
  compatible: boolean;
  reason: string | null;
};
export type DropClassification = {
  kind: "mod" | "mrpack" | "resource" | "shader" | "world";
  title: string;
  source: string;
  targets: DropTarget[];
  suggested: string | null;
  newGame: { name: string; version: string; loader: string | null } | null;
};

const kindLabel: Record<string, string> = {
  mod: "MOD",
  mrpack: "MODRINTH PACK",
  resource: "RESOURCE PACK",
  shader: "SHADER PACK",
  world: "WORLD",
};

const loaderName = (l: string | null) =>
  !l ? "Vanilla" : l.startsWith("quilt:") ? `Quilt ${l.slice(6)}` : `Fabric ${l}`;

/** Step between a drop and the review: choose (or create) the destination game. */
export default function SmartDrop({
  drop,
  busy,
  onClose,
  onReview,
  onCreate,
  onInstallSheet,
}: {
  drop: DropClassification;
  busy: boolean;
  onClose: () => void;
  onReview: (gameId: string) => void;
  onCreate: () => void;
  onInstallSheet: () => void;
}) {
  const [target, setTarget] = useState(drop.suggested || "");
  const anyCompatible = drop.targets.some((t) => t.compatible);
  return (
    <Sheet title={drop.title} eyebrow={`SMART DROP / ${kindLabel[drop.kind] || "CONTENT"}`} onClose={onClose} wide>
      <p className="intro">
        {anyCompatible ? "Where should it go?" : "None of your games can take this yet."}
      </p>
      <div className="drop-targets" role="radiogroup" aria-label="Destination game">
        {drop.targets.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={target === t.id}
            disabled={!t.compatible || busy}
            className={`drop-target ${target === t.id ? "selected" : ""}`}
            onClick={() => setTarget(t.id)}
          >
            <Package size={20} />
            <span>
              <strong>{t.name}</strong>
              <small className="mono">
                {t.version} · {loaderName(t.loader)}
              </small>
            </span>
            <span className="drop-target-state">
              {t.compatible ? target === t.id ? <Check size={17} /> : "COMPATIBLE" : t.reason}
            </span>
          </button>
        ))}
      </div>
      <div className="sheet-actions">
        <button className="primary" disabled={!target || busy} onClick={() => onReview(target)}>
          {busy ? "INSPECTING…" : "REVIEW IMPORT"}
          <ArrowRight size={16} />
        </button>
        {drop.newGame ? (
          <button className="secondary" disabled={busy} onClick={onCreate}>
            <Plus size={16} />
            NEW GAME · {drop.newGame.version} · {loaderName(drop.newGame.loader)}
          </button>
        ) : (
          !anyCompatible && (
            <button className="secondary" onClick={onInstallSheet}>
              <Plus size={16} />
              CREATE A MATCHING GAME
            </button>
          )
        )}
        <button className="text-button" onClick={onClose}>
          CANCEL
        </button>
      </div>
      <p className="footnote">Nothing changes until you confirm the review. A backup is made first.</p>
    </Sheet>
  );
}
