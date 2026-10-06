import {
  useState,
  useEffect,
  useRef,
  useId,
  createContext,
  useContext,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  X,
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronDown,
  UserRound,
  Shirt,
  HelpCircle,
  Settings,
  Keyboard,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { playSfx } from "./sound";
import TitleBar from "./v17/TitleBar";

export const DialogError = createContext<{
  message: string;
  report: () => void;
  dismiss: () => void;
  hint?: string;
}>({ message: "", report: () => {}, dismiss: () => {} });

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return <img className={`wordmark ${compact ? "wordmark-compact" : ""}`} src="/brand/wordmark.png" alt="LOAM" draggable={false} />;
}

export function PageShell({
  route,
  title,
  eyebrow,
  description,
  accountName,
  accountKind,
  onNavigate,
  onAccountClick,
  onCommandPalette,
  badge,
  actions,
  children,
}: {
  route: "skins" | "support" | "settings" | "install" | "dev";
  title: string;
  eyebrow?: string;
  description?: string;
  accountName?: string;
  accountKind?: string;
  onNavigate: (page: string) => void;
  onAccountClick?: () => void;
  onCommandPalette?: () => void;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onNavigate("home");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNavigate]);

  const routeLabel =
    route === "skins"
      ? "Skins"
      : route === "support"
      ? "Support & feedback"
      : route === "settings"
      ? "Settings"
      : route === "install"
      ? "Install"
      : "Components";

  return (
    <div className="page-shell">
      {/* Compact sticky header: 72px */}
      <header className="page-shell-header">
        <div className="page-shell-brand">
          <button
            type="button"
            className="brand-button compact"
            aria-label="LOAM home"
            onClick={() => onNavigate("home")}
          >
            <Wordmark compact />
          </button>
        </div>

        <div className="page-shell-actions">
          {/* Key-cap shortcut button */}
          <button
            type="button"
            className="keycap-hint"
            onClick={onCommandPalette}
            title="Command palette (Ctrl+K)"
            aria-label="Quick actions, press Ctrl K"
          >
            <span className="mono keycap">Ctrl K</span>
            <span className="keycap-label">Actions</span>
          </button>

          {/* Account chip */}
          <button
            type="button"
            className="account-chip compact"
            onClick={onAccountClick}
            aria-label={`Active account: ${accountName || "Offline"}`}
          >
            <span className="avatar">
              <UserRound size={16} />
            </span>
            <span className="account-info">
              <strong>{accountName || "Add Profile"}</strong>
              <small>
                {accountName
                  ? accountKind === "microsoft"
                    ? "MICROSOFT ✓"
                    : "Offline profile"
                  : "Click to sign in"}
              </small>
            </span>
            <ChevronDown size={14} />
          </button>

          <span className="header-divider" />

          {/* Navigation Icon buttons with 40x40 hit areas, 2px underline for active */}
          <button
            type="button"
            className={`nav-icon-btn ${route === "skins" ? "active" : ""}`}
            title="Skins & capes"
            aria-label="Skins and capes"
            onClick={() => onNavigate(route === "skins" ? "home" : "skins")}
          >
            <Shirt size={20} />
          </button>
          <button
            type="button"
            className={`nav-icon-btn ${route === "support" ? "active" : ""}`}
            title="Support & Feedback · F1"
            aria-label="Support and feedback"
            onClick={() => onNavigate(route === "support" ? "home" : "support")}
          >
            <HelpCircle size={20} />
          </button>
          <button
            type="button"
            className={`nav-icon-btn ${route === "settings" ? "active" : ""}`}
            title="Settings · Ctrl+,"
            aria-label="Settings"
            onClick={() => onNavigate(route === "settings" ? "home" : "settings")}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main page content with breadcrumb */}
      <main className="page-shell-content">
        <div className="breadcrumb-row">
          <button
            type="button"
            className="breadcrumb-link"
            onClick={() => onNavigate("home")}
            aria-label="Back to your worlds"
          >
            ← YOUR WORLDS / {routeLabel}
          </button>
          {badge && <span className="mono page-badge">{badge}</span>}
          {actions && <div className="page-header-actions">{actions}</div>}
        </div>

        <div className="page-headline">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>

        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || label}
      disabled={disabled}
      className={`loam-toggle ${checked ? "checked" : ""}`}
      onClick={() => {
        if (!disabled) {
          playSfx("toggle");
          onChange(!checked);
        }
      }}
    >
      <span className="loam-toggle-thumb" />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  name,
  disabled = false,
}: {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
  name?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className="loam-segmented"
      role="radiogroup"
      aria-label={name}
      aria-disabled={disabled}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled || opt.disabled}
            className={`loam-segmented-btn ${isSelected ? "active" : ""}`}
            onClick={() => {
              playSfx("tab");
              onChange(opt.value);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  id,
  disabled = false,
}: {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string; badge?: string }[];
  label?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex] || options[0];

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        const next = Math.min(options.length - 1, selectedIndex + 1);
        onChange(options[next].value);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        const prev = Math.max(0, selectedIndex - 1);
        onChange(options[prev].value);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(!open);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Home") {
      e.preventDefault();
      if (options.length > 0) onChange(options[0].value);
    } else if (e.key === "End") {
      e.preventDefault();
      if (options.length > 0) onChange(options[options.length - 1].value);
    }
  };

  return (
    <div className="custom-select-wrap" ref={containerRef}>
      {label && <label htmlFor={id}>{label}</label>}
      <button
        id={id}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
      >
        <span className="select-val">{selected?.label}</span>
        {selected?.badge && (
          <span className="select-badge">{selected.badge}</span>
        )}
        <span className="select-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className="custom-select-list" role="listbox" ref={listRef}>
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`custom-select-item ${
                opt.value === value ? "active" : ""
              }`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {opt.badge && <span className="select-badge">{opt.badge}</span>}
              {opt.value === value && <Check size={16} className="check-mark" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 512,
  onChange,
  recommended,
  label,
  valueFormatter = (v) => `${(v / 1024).toFixed(0)} GB`,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  recommended?: number;
  label?: string;
  valueFormatter?: (val: number) => string;
}) {
  const percent = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  const recPercent =
    recommended && max > min
      ? Math.max(0, Math.min(100, ((recommended - min) / (max - min)) * 100))
      : undefined;

  return (
    <div className="loam-slider-component">
      {label && (
        <div className="slider-header">
          <span className="eyebrow">{label}</span>
          <span className="mono slider-value">{valueFormatter(value)}</span>
        </div>
      )}
      <div className="slider-track-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="loam-slider-input"
          aria-label={label || "Slider"}
        />
        <div
          className="slider-filled-bar"
          style={{ width: "100%", transformOrigin: "left", transform: `scaleX(${percent / 100})` }}
        />
        {recPercent !== undefined && (
          <div
            className="slider-rec-marker"
            style={{ left: `${recPercent}%` }}
            title={`Recommended: ${valueFormatter(recommended!)}`}
          />
        )}
      </div>
      <div className="slider-ticks">
        <span className="mono tick-label">{valueFormatter(min)}</span>
        {recommended && (
          <span className="mono tick-recommended">
            ▲ Recommended ({valueFormatter(recommended)})
          </span>
        )}
        <span className="mono tick-label">{valueFormatter(max)}</span>
      </div>
    </div>
  );
}

export function Chip({
  children,
  icon,
  onClick,
  active = false,
  variant = "default",
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  variant?: "default" | "mono" | "accent" | "status";
}) {
  const className = `loam-chip ${variant} ${active ? "active" : ""} ${
    onClick ? "clickable" : ""
  }`;
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {icon && <span className="chip-icon">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
  return (
    <span className={className}>
      {icon && <span className="chip-icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export function Card({
  children,
  className = "",
  onClick,
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}) {
  const classes = `loam-card ${hoverable ? "hoverable" : ""} ${className}`;
  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
  return <div className={classes}>{children}</div>;
}

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  variant,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  variant?: "profile";
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    if (open) {
      playSfx("sheetOpen");
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopImmediatePropagation();
        playSfx("sheetClose");
        closeRef.current();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown, true);
      return () => { window.removeEventListener("keydown", handleKeyDown, true); if (trigger?.isConnected) trigger.focus({preventScroll:true}); };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="drawer-overlay"
      onClick={() => {
        playSfx("sheetClose");
        onClose();
      }}
    >
      <aside
        ref={panelRef}
        className={`drawer-panel ${variant ? `drawer-${variant}` : ""}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={headingId}>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close drawer"
            onClick={() => {
              playSfx("sheetClose");
              onClose();
            }}
          >
            <X size={20} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
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
    playSfx("sheetOpen");
    const trigger = document.activeElement as HTMLElement;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first control (usually Close); honour the intended field.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
      trigger?.focus();
    };
  }, []);

  const handleClose = () => {
    playSfx("sheetClose");
    onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      className={`sheet ${wide ? "wide" : ""} ${full ? "full-page-sheet" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* A modal makes the page behind it inert, so a full-page sheet carries its own frame. */}
      {full && <TitleBar />}
      <div className="sheet-inner">
        {full && (
          <div className="sheet-brand">
            <div>
              <Wordmark />
              <span className="brand-caption">Java edition</span>
            </div>
            <span className="eyebrow">Your worlds, ready.</span>
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
            onClick={handleClose}
          >
            <X size={20} />
          </button>
        </header>
        {error.message && (
          <div className="inline-error" role="alert">
            <p>{error.message}</p>
            {error.hint && <p>{error.hint}</p>}
            <div className="inline-actions">
              <button onClick={error.report}>Report this ↗</button>
              <button onClick={error.dismiss}>Dismiss</button>
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

export function BackLink({
  onClick,
  label = "← BACK TO YOUR WORLDS",
}: {
  onClick: () => void;
  label?: string;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClick();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClick]);

  return (
    <button className="back-link" onClick={onClick} aria-label={label}>
      {label}
    </button>
  );
}

export function Skeleton({
  width = "100%",
  height = "24px",
  radius = "2px",
}: {
  width?: string;
  height?: string;
  radius?: string;
}) {
  return (
    <div
      className="loam-skeleton"
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function StrataContour({
  seed,
  className = "",
}: {
  seed: string;
  className?: string;
}) {
  // Deterministic seed hash
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const rng = (offset: number) => {
    let x = (h + offset * 1103515245) >>> 0;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = (x >> 16) ^ x;
    return (x % 1000) / 1000;
  };

  const lines = [0, 1, 2, 3, 4, 5].map((idx) => {
    const y1 = 40 + idx * 30 + rng(idx * 4) * 20;
    const cp1x = 120 + rng(idx * 4 + 1) * 80;
    const cp1y = 20 + idx * 32 + rng(idx * 4 + 2) * 40;
    const cp2x = 360 + rng(idx * 4 + 3) * 100;
    const cp2y = 50 + idx * 28 + rng(idx * 4 + 4) * 50;
    const y2 = 40 + idx * 30 + rng(idx * 4 + 5) * 25;
    return `M -20 ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, 620 ${y2}`;
  });

  return (
    <svg
      className={`strata-contour ${className}`}
      viewBox="0 0 600 240"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {lines.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray={i % 2 === 1 ? "4 4" : undefined}
          opacity={0.18 + (i % 3) * 0.08}
        />
      ))}
    </svg>
  );
}
