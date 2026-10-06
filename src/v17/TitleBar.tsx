// LOAM's own window frame: a slim draggable strip with minimal window controls.
// Dragging and double-click-to-maximize come from data-tauri-drag-region; closing goes
// through the normal close request, so LOAM still refuses while a game or download runs.
import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { native } from "../api";

/** Shown in the desktop app, and in the browser preview with ?frame=1 for design review. */
export const showFrame = native || (typeof window !== "undefined" && window.location.search.includes("frame=1"));
// Lets the style sheets keep overlays and drawers below the frame.
if (showFrame && typeof document !== "undefined") document.documentElement.dataset.frame = "true";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!native) return;
    const w = getCurrentWindow();
    const sync = () => void w.isMaximized().then(setMaximized).catch(() => {});
    sync();
    const off = w.onResized(sync);
    return () => void off.then((f) => f());
  }, []);
  if (!showFrame) return null;
  const w = native ? getCurrentWindow() : null;
  return (
    <header className="v17-titlebar" data-tauri-drag-region>
      <span className="v17-titlebar-name" data-tauri-drag-region>LOAM</span>
      <div className="v17-winctl">
        <button type="button" aria-label="Minimize" title="Minimize" onClick={() => void w?.minimize()}>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6h7" /></svg>
        </button>
        <button type="button" aria-label={maximized ? "Restore" : "Maximize"} title={maximized ? "Restore" : "Maximize"} onClick={() => void w?.toggleMaximize()}>
          {maximized ? (
            <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="4" width="5.5" height="5.5" rx="1.2" /><path d="M4.5 4V3.2c0-.4.3-.7.7-.7h3.6c.4 0 .7.3.7.7v3.6c0 .4-.3.7-.7.7H8" /></svg>
          ) : (
            <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="2.5" width="7" height="7" rx="1.4" /></svg>
          )}
        </button>
        <button type="button" className="close" aria-label="Close" title="Close" onClick={() => void w?.close()}>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3L3 9" /></svg>
        </button>
      </div>
    </header>
  );
}
