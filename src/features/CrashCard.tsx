import { useState } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

export type CrashAction = {
  kind: "disable" | "memory" | "settings" | "modrinth" | "log";
  label: string;
  path?: string;
  value?: number;
  url?: string;
};
export type Diagnosis = {
  code: string;
  title: string;
  summary: string;
  evidence: string[];
  actions: CrashAction[];
};

/**
 * Plain-language crash explanation with the fix LOAM can apply. It replaces the
 * version numerals on the home stage, so it is kept about the same height.
 */
export default function CrashCard({
  diagnosis,
  busy,
  onAction,
  onDismiss,
  onLog,
  onReport,
}: {
  diagnosis: Diagnosis;
  busy: boolean;
  onAction: (a: CrashAction) => void;
  onDismiss: () => void;
  onLog: () => void;
  onReport: () => void;
}) {
  const [details, setDetails] = useState(false);
  const [primary, ...rest] = diagnosis.actions.filter((a) => a.kind !== "log");
  return (
    <section className="crash-card" role="alert" aria-labelledby="crash-title">
      <div className="crash-top">
        <AlertTriangle size={16} className="crash-icon" aria-hidden="true" />
        <span className="eyebrow" title={diagnosis.code}>
          THE GAME STOPPED
        </span>
        <span className="crash-links">
          {diagnosis.evidence.length > 0 && (
            <button className="text-button" aria-expanded={details} onClick={() => setDetails(!details)}>
              {details ? "HIDE EVIDENCE" : "EVIDENCE"}
            </button>
          )}
          <button className="text-button" onClick={onLog}>
            LOG
          </button>
          <button className="text-button" onClick={onReport}>
            REPORT ↗
          </button>
          <button className="icon-button" aria-label="Dismiss crash explanation" onClick={onDismiss}>
            <X size={15} />
          </button>
        </span>
      </div>
      <h2 id="crash-title">{diagnosis.title}</h2>
      <p>{diagnosis.summary}</p>
      {details && (
        <pre className="crash-evidence">
          {[...diagnosis.evidence, diagnosis.code].join("\n")}
        </pre>
      )}
      {(primary || rest.length > 0) && (
        <div className="crash-actions">
          {primary && (
            <button className="primary" disabled={busy} onClick={() => onAction(primary)}>
              {primary.label}
              <ArrowRight size={15} />
            </button>
          )}
          {rest.map((a) => (
            <button key={a.label} className="secondary" disabled={busy} onClick={() => onAction(a)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
