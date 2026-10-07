import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import App from "./App";
import "./styles.css";
import "./remaster.css";
import "./features/features.css";
import "./motion/tokens.css";
import "./v17/v17.css";
import "./v17/remaster.css";
import "./v17/v18.css";
import "./v19/v19.css";
import { installPerfCapture } from "./perf";

try { installPerfCapture(); } catch { /* Diagnostics must never prevent startup. */ }

// Disable default browser right-click menu on app chrome while preserving native Copy / Paste / Cut in text inputs
window.addEventListener("contextmenu", (e) => {
  const t = e.target as HTMLElement | null;
  const editable = !!t?.closest('input, textarea, [contenteditable="true"]');
  if (!editable) {
    e.preventDefault();
  }
});
window.addEventListener("dragstart", (e) => {
  if (!(e.target instanceof Element) || !e.target.closest('input, textarea, [contenteditable="true"]')) e.preventDefault();
});
// Feel like a desktop app, not a web page: browser shortcuts (reload, print, find, zoom, view
// source, history, caret browsing, back/forward) do nothing. LOAM's own shortcuts still work.
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const devtools = e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k));
  const browser = e.key === "F5" || e.key === "F3" || e.key === "F7"
    || (e.ctrlKey && !e.shiftKey && ["r", "p", "u", "s", "g", "h", "j", "f", "o", "=", "+", "-", "0"].includes(k))
    || (e.ctrlKey && e.shiftKey && ["r", "p", "o", "delete"].includes(k))
    || (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !(e.target as HTMLElement | null)?.closest?.("input, textarea"))
    || e.key === "BrowserBack" || e.key === "BrowserForward";
  if ((devtools && !import.meta.env.DEV) || (browser && !(import.meta.env.DEV && k === "r"))) e.preventDefault();
}, { capture: true });
// Ctrl + mouse wheel would zoom the page; LOAM has its own Interface size setting.
window.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
// Mouse back/forward buttons would navigate the web view away from LOAM.
window.addEventListener("mouseup", (e) => { if (e.button === 3 || e.button === 4) e.preventDefault(); });
// No spell-check squiggles in search boxes and names; long text (notes) keeps it.
document.addEventListener("focusin", (e) => {
  if (e.target instanceof HTMLInputElement && !e.target.hasAttribute("spellcheck")) e.target.spellcheck = false;
});
if (import.meta.env.DEV) {
  let timer: ReturnType<typeof setTimeout>;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void import("axe-core").then(async ({ default: axe }) => {
        const result = await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        });
        console.info(
          "LOAM accessibility",
          JSON.stringify(
            result.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.map((n) => n.target),
            })),
          ),
        );
      });
    }, 1500);
  }).observe(document.getElementById("root")!, {
    childList: true,
    subtree: true,
  });
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
requestAnimationFrame(() => requestAnimationFrame(() => window.__loamPerf?.mark("first-render")));
