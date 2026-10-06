import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import App from "./App";
import "./styles.css";
import "./remaster.css";
import "./motion/tokens.css";
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
window.addEventListener("keydown", e => {
  if (!import.meta.env.DEV && (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())))) e.preventDefault();
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
