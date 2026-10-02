import {
  useEffect,
  useRef,
  useId,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { X, ArrowUpRight } from "lucide-react";
export const DialogError = createContext<{
  message: string;
  report: () => void;
  dismiss: () => void;
  hint?: string;
}>({ message: "", report: () => {}, dismiss: () => {} });
export function Wordmark() {
  return (
    <svg
      className="wordmark"
      viewBox="0 0 196 54"
      aria-label="LOAM"
      role="img"
      fill="none"
    >
      <path
        d="M4 3v47h30M112 3 91 50m21-47 21 47m-34-16h26M144 50V3l23 32 23-32v47"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="miter"
      />
      <ellipse
        cx="62"
        cy="26.5"
        rx="23"
        ry="24"
        stroke="currentColor"
        strokeWidth="5"
      />
    </svg>
  );
}
export function Sheet({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  full = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  full?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const error = useContext(DialogError);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      className={`sheet ${wide ? "wide" : ""} ${full ? "full-page-sheet" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-inner">
        {full && (
          <div className="sheet-brand">
            <div>
              <Wordmark />
              <span className="brand-caption">JAVA EDITION</span>
            </div>
            <span className="eyebrow">YOUR WORLDS, READY.</span>
          </div>
        )}
        <header className="sheet-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={headingId}>{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {error.message && (
          <div className="inline-error" role="alert">
            <p>{error.message}</p>
            {error.hint && <p>{error.hint}</p>}
            <div className="inline-actions">
              <button onClick={error.report}>REPORT THIS ↗</button>
              <button onClick={error.dismiss}>DISMISS</button>
            </div>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
export function External({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="quiet-empty">{children}</div>;
}
