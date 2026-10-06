import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { preference, resolveMotion, direction, type MotionPreference } from "./policy";

export function useMotionPreference(running: boolean, legacy: boolean) {
  const [setting, setSetting] = useState<MotionPreference>(() => preference(localStorage.getItem("loam_motion"), legacy));
  const [os, setOs] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hidden, setHidden] = useState(document.hidden);
  const [slow, setSlow] = useState(false);
  const mode = resolveMotion(setting, os, running || hidden, slow);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setOs(mq.matches);
    const visibility = () => setHidden(document.hidden);
    const downgrade = () => { if (setting === "system") setSlow(true); };
    mq.addEventListener("change", change);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("loam-slow-motion", downgrade);
    return () => { mq.removeEventListener("change", change); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("loam-slow-motion", downgrade); };
  }, [setting]);
  useEffect(() => {
    localStorage.setItem("loam_motion", setting);
    document.documentElement.dataset.motion = mode;
    document.documentElement.dataset.motionPaused = String(running || hidden);
    window.dispatchEvent(new Event("loam-motion-change"));
  }, [setting, mode, running, hidden]);
  const selectSetting = (value: MotionPreference) => { setSlow(false); setSetting(value); };
  const reason = setting === "off" ? "Animations are off." : running ? "Motion is paused while a game is running." : os ? "Windows reduced motion is enabled. Turn it off in Windows Accessibility → Visual effects to see full transitions." : slow ? "Motion was reduced for performance. Select Full to try again." : mode === "off" ? "Animations are off." : mode === "reduced" ? "Reduced motion: instant, calm page changes." : "Full motion: smooth page changes and tactile controls.";
  return { setting, setSetting: selectSetting, mode, reason };
}

// React navigation stays immediate. WAAPI animates the committed view without
// mounting a second copy, changing keys, fetching, or delaying an action.
export function usePageMotion(key: string, mode: string) {
  const previous = useRef(key);
  useLayoutEffect(() => {
    if (previous.current === key) return;
    const sign = direction(previous.current.split(":")[0], key.split(":")[0], ["home", "skins", "settings", "support", "dev"]);
    previous.current = key;
    const el = document.querySelector<HTMLElement>(".settings-content, main, .page-shell-content");
    if (!el) return;
    const heading = el.querySelector<HTMLElement>("h1,h2");
    if (heading && !document.querySelector('[role="dialog"]')) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    if (mode !== "full" || !el.animate || document.documentElement.dataset.viewTransitionActive === "true") return;
    el.style.willChange = "transform, opacity";
    const animation = el.animate([{ opacity: .35, transform: `translateY(${sign * 12}px)` }, { opacity: 1, transform: "translateY(0)" }], { duration: 240, easing: "cubic-bezier(.22,1,.36,1)" });
    let frame = 0, last = 0, slow = 0, ended = false;
    const sample = (now: number) => {
      if (ended) return;
      if (last && now - last > 24) slow++;
      last = now;
      if (slow >= 4) { window.dispatchEvent(new Event("loam-slow-motion")); return; }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    const clear = () => { ended = true; cancelAnimationFrame(frame); el.style.willChange = ""; };
    void animation.finished.then(clear, clear);
    return () => { animation.cancel(); clear(); };
  }, [key, mode]);
}
