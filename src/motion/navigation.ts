type ViewTransition = { skipTransition(): void; finished: Promise<void> };
type TransitionDocument = Document & { startViewTransition?: (update: () => void) => ViewTransition };

// One active snapshot, no queue. Superseded callbacks cannot change navigation.
export function createNavigator(doc: TransitionDocument, enabled: () => boolean) {
  let active: ViewTransition | undefined;
  let generation = 0;
  let frame = 0;
  const stopSampling = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
  return {
    go(update: () => void) {
      const ticket = ++generation;
      active?.skipTransition();
      stopSampling();
      active = undefined;
      if (doc.documentElement) doc.documentElement.dataset.viewTransitionActive = "false";
      doc.querySelectorAll?.<HTMLElement>('[style*="view-transition-name"]').forEach(el => { el.style.viewTransitionName = ""; });
      if (!enabled() || !doc.startViewTransition || doc.hidden) { update(); return; }
      const target = doc.querySelector<HTMLElement>(".settings-content, main, .page-shell-content");
      if (!target) { update(); return; }
      target.style.viewTransitionName = "loam-content";
      if (doc.documentElement) doc.documentElement.dataset.viewTransitionActive = "true";
      const transition = doc.startViewTransition(() => {
        if (ticket !== generation) return;
        update();
        const next = doc.querySelector<HTMLElement>(".settings-content, main, .page-shell-content");
        if (next) next.style.viewTransitionName = "loam-content";
      });
      active = transition;
      if (typeof requestAnimationFrame === "function") {
        let last = 0, slow = 0;
        const sample = (now: number) => {
          if (ticket !== generation) return;
          if (last && now - last > 24) slow++;
          last = now;
          if (slow >= 8) { window.dispatchEvent(new Event("loam-slow-motion")); return; }
          frame = requestAnimationFrame(sample);
        };
        frame = requestAnimationFrame(sample);
      }
      void transition.finished.catch(() => {}).finally(() => {
        if (ticket !== generation) return;
        stopSampling();
        if (doc.documentElement) doc.documentElement.dataset.viewTransitionActive = "false";
        target.style.viewTransitionName = "";
        const next = doc.querySelector<HTMLElement>('[style*="view-transition-name"]');
        if (next) next.style.viewTransitionName = "";
        active = undefined;
      });
    },
    cancel() { if (doc.documentElement) doc.documentElement.dataset.viewTransitionActive = "false"; generation++; active?.skipTransition(); active = undefined; stopSampling(); },
  };
}
