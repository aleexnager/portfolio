// Project card visuals: apply each card's tint, and only animate visuals that
// are on screen. Under reduced motion, SVG animations are frozen on a
// representative frame.
import { initAstar } from "./astar";

export function initVisuals() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll<HTMLElement>("[data-tint]").forEach((el) => {
    el.style.setProperty("--tint", el.dataset.tint ?? "");
  });

  const visuals = [...document.querySelectorAll<HTMLElement>("[data-pv]")];
  const controllers = new Map<HTMLElement, { play(): void; pause(): void }>();

  visuals.forEach((pv) => {
    const canvas = pv.querySelector<HTMLCanvasElement>("[data-astar]");
    const svg = pv.querySelector("svg");
    if (canvas) {
      const tint = getComputedStyle(pv).getPropertyValue("--tint").trim() || "#c2f261";
      controllers.set(pv, initAstar(canvas, tint));
    } else if (svg) {
      if (reduce) {
        svg.setCurrentTime(2.4);
        svg.pauseAnimations();
      } else {
        svg.pauseAnimations();
      }
      controllers.set(pv, {
        play: () => {
          if (reduce) return;
          pv.classList.add("is-playing");
          svg.unpauseAnimations();
        },
        pause: () => {
          pv.classList.remove("is-playing");
          svg.pauseAnimations();
        },
      });
    }
  });

  if (!("IntersectionObserver" in window)) {
    controllers.forEach((c) => c.play());
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const c = controllers.get(e.target as HTMLElement);
        if (!c) continue;
        if (e.isIntersecting) c.play();
        else c.pause();
      }
    },
    { threshold: 0.2 },
  );
  visuals.forEach((v) => io.observe(v));
}
