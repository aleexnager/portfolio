// Decrypt-style text reveal. Runs once, keeps layout stable (monospace-free:
// width is locked to avoid reflow) and is skipped under reduced motion.
const GLYPHS = "ABCDEF0123456789#$%&*+=<>/\\";

export function scramble(el: HTMLElement, delay = 0, duration = 900) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const final = el.textContent ?? "";
  el.setAttribute("aria-label", final);
  const start = performance.now() + delay;
  const chars = [...final];
  const reveal = chars.map((_, i) => (i / chars.length) * duration * 0.75 + Math.random() * duration * 0.25);

  const frame = (now: number) => {
    const t = now - start;
    if (t < 0) {
      requestAnimationFrame(frame);
      return;
    }
    let out = "";
    let done = true;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (c === " " || t >= reveal[i]) {
        out += c;
      } else {
        done = false;
        out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
    }
    el.textContent = out;
    if (!done) requestAnimationFrame(frame);
    else el.textContent = final;
  };
  requestAnimationFrame(frame);
}
