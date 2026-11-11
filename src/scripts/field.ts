// Hero "signal field": a dot lattice that decodes into hex under the pointer,
// with packets routing along the grid. Pauses off-screen, caps DPR, and
// renders a single static frame under reduced motion.

type Packet = { x: number; y: number; dx: number; dy: number; life: number; trail: { x: number; y: number }[] };

const HEX = "0123456789ABCDEF";
const ACCENT = [194, 242, 97];

export function initField(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const GAP = 28;
  let w = 0;
  let h = 0;
  let cols = 0;
  let rows = 0;
  let glyphs: string[] = [];
  let packets: Packet[] = [];
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
  let running = false;
  let raf = 0;
  let t0 = performance.now();

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / GAP) + 1;
    rows = Math.ceil(h / GAP) + 1;
    glyphs = Array.from({ length: cols * rows }, () => HEX[(Math.random() * 16) | 0]);
    packets = Array.from({ length: Math.max(4, Math.round((cols * rows) / 160)) }, spawn);
    if (!running) draw(performance.now());
  };

  function spawn(): Packet {
    const horizontal = Math.random() > 0.5;
    const x = ((Math.random() * cols) | 0) * GAP;
    const y = ((Math.random() * rows) | 0) * GAP;
    const dir = Math.random() > 0.5 ? 1 : -1;
    return {
      x,
      y,
      dx: horizontal ? dir : 0,
      dy: horizontal ? 0 : dir,
      life: 200 + Math.random() * 400,
      trail: [],
    };
  }

  function step(p: Packet, speed: number) {
    p.x += p.dx * speed;
    p.y += p.dy * speed;
    p.life -= speed;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 22) p.trail.shift();
    // Turn at grid intersections, like a packet taking a route.
    const onNode = Math.abs(p.x % GAP) < speed && Math.abs(p.y % GAP) < speed;
    if (onNode && Math.random() < 0.18) {
      p.x = Math.round(p.x / GAP) * GAP;
      p.y = Math.round(p.y / GAP) * GAP;
      const turn = Math.random() > 0.5 ? 1 : -1;
      [p.dx, p.dy] = p.dx !== 0 ? [0, turn] : [turn, 0];
    }
    if (p.life <= 0 || p.x < -GAP || p.y < -GAP || p.x > w + GAP || p.y > h + GAP) Object.assign(p, spawn());
  }

  function draw(now: number) {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);

    // Autopilot scanner on touch devices or before the pointer arrives.
    if (!pointer.active) {
      pointer.tx = w * (0.62 + 0.22 * Math.sin(t * 0.35));
      pointer.ty = h * (0.45 + 0.25 * Math.sin(t * 0.5 + 1.2));
    }
    if (pointer.x < -9000) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
    }
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;

    const R = Math.min(220, Math.max(140, w * 0.14));
    ctx.font = '500 11px "Geist Mono Variable", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * GAP;
        const y = j * GAP;
        const d = Math.hypot(x - pointer.x, y - pointer.y);
        if (d < R) {
          const k = 1 - d / R;
          const idx = j * cols + i;
          if (!reduce && Math.random() < 0.03) glyphs[idx] = HEX[(Math.random() * 16) | 0];
          ctx.fillStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${0.12 + k * 0.7})`;
          ctx.fillText(glyphs[idx], x, y);
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.09)";
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }
    }

    // Packets
    for (const p of packets) {
      if (!reduce) step(p, 1.6);
      for (let n = 0; n < p.trail.length; n++) {
        const a = (n / p.trail.length) * 0.5;
        ctx.fillStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${a})`;
        ctx.fillRect(p.trail[n].x - 1, p.trail[n].y - 1, 2, 2);
      }
      ctx.fillStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},0.9)`;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }

    if (running) raf = requestAnimationFrame(draw);
  }

  const start = () => {
    if (running || reduce) return;
    running = true;
    t0 = performance.now() - 1;
    raf = requestAnimationFrame(draw);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  if (canHover) {
    const host = canvas.parentElement ?? canvas;
    host.addEventListener(
      "pointermove",
      (e) => {
        const r = canvas.getBoundingClientRect();
        pointer.tx = e.clientX - r.left;
        pointer.ty = e.clientY - r.top;
        pointer.active = true;
      },
      { passive: true },
    );
    host.addEventListener("pointerleave", () => (pointer.active = false));
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  resize();
}
