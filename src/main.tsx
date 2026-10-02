import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import App from "./App";
import "./styles.css";
import "./remaster.css";
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
