// A real A* search on a weighted grid, animated step by step: terrain cost is
// shaded, the closed set fills in, the frontier glows, then the optimal path
// is drawn. A new start and goal are picked on every run.

type Node = { i: number; g: number; f: number };

const COLS = 26;
const ROWS = 11;

function rand(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeMap(r: () => number) {
  // Smooth "terrain" from a few random hills; cost 1 (flat) to 6 (steep).
  const hills = Array.from({ length: 5 }, () => ({ x: r() * COLS, y: r() * ROWS, s: 2 + r() * 3, h: 2 + r() * 4 }));
  const cost = new Float32Array(COLS * ROWS);
  const wall = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      let c = 1;
      for (const k of hills) c += k.h * Math.exp(-((x - k.x) ** 2 + (y - k.y) ** 2) / (2 * k.s * k.s));
      cost[y * COLS + x] = Math.min(6, c);
      wall[y * COLS + x] = r() < 0.09 ? 1 : 0;
    }
  }
  return { cost, wall };
}

function* search(cost: Float32Array, wall: Uint8Array, start: number, goal: number) {
  const gx = goal % COLS;
  const gy = (goal / COLS) | 0;
  const h = (i: number) => Math.abs((i % COLS) - gx) + Math.abs(((i / COLS) | 0) - gy); // admissible: min cost is 1
  const g = new Float32Array(COLS * ROWS).fill(Infinity);
  const from = new Int32Array(COLS * ROWS).fill(-1);
  const closed = new Uint8Array(COLS * ROWS);
  const open: Node[] = [{ i: start, g: 0, f: h(start) }];
  g[start] = 0;

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;
    yield { closed, open, path: null as number[] | null };
    if (cur.i === goal) {
      const path = [goal];
      let p = goal;
      while (from[p] !== -1) path.unshift((p = from[p]));
      yield { closed, open, path };
      return;
    }
    const x = cur.i % COLS;
    const y = (cur.i / COLS) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const n = ny * COLS + nx;
      if (wall[n] || closed[n]) continue;
      const ng = cur.g + cost[n];
      if (ng < g[n]) {
        g[n] = ng;
        from[n] = cur.i;
        open.push({ i: n, g: ng, f: ng + h(n) });
      }
    }
  }
  yield { closed, open, path: [] as number[] };
}

export function initAstar(canvas: HTMLCanvasElement, tint: string) {
  const maybe = canvas.getContext("2d");
  if (!maybe) return { play() {}, pause() {} };
  const ctx: CanvasRenderingContext2D = maybe;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let r = rand(42);
  let map = makeMap(r);
  let start = 0;
  let goal = 0;
  let it!: Generator<{ closed: Uint8Array; open: Node[]; path: number[] | null }>;
  let state: { closed: Uint8Array; open: Node[]; path: number[] | null } | null = null;
  let pathProgress = 0;
  let hold = 0;
  let raf = 0;
  let playing = false;
  let w = 0;
  let hgt = 0;
  let cell = 0;
  let ox = 0;
  let oy = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    hgt = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = Math.min((w - 16) / COLS, (hgt - 16) / ROWS);
    ox = (w - cell * COLS) / 2;
    oy = (hgt - cell * ROWS) / 2;
    draw();
  };

  const pick = () => {
    let a: number;
    let b: number;
    do {
      a = ((r() * ROWS) | 0) * COLS + ((r() * 4) | 0);
      b = ((r() * ROWS) | 0) * COLS + (COLS - 1 - ((r() * 4) | 0));
    } while (map.wall[a] || map.wall[b]);
    start = a;
    goal = b;
    it = search(map.cost, map.wall, start, goal);
    state = null;
    pathProgress = 0;
    hold = 0;
  };

  const center = (i: number): [number, number] => [ox + (i % COLS) * cell + cell / 2, oy + ((i / COLS) | 0) * cell + cell / 2];

  function draw() {
    if (cell <= 2) return; // hidden or not laid out yet
    ctx.clearRect(0, 0, w, hgt);
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = ox + (i % COLS) * cell;
      const y = oy + ((i / COLS) | 0) * cell;
      if (map.wall[i]) {
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        continue;
      }
      const c = (map.cost[i] - 1) / 5;
      ctx.fillStyle = `rgba(255,255,255,${0.02 + c * 0.09})`;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      if (state?.closed[i]) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = tint;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.globalAlpha = 1;
      }
    }
    if (state) {
      ctx.fillStyle = tint;
      for (const n of state.open) {
        const [cx, cy] = center(n.i);
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      if (state.path && state.path.length) {
        const n = Math.max(1, Math.floor(pathProgress));
        ctx.strokeStyle = tint;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = tint;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        state.path.slice(0, n + 1).forEach((p, k) => {
          const [cx, cy] = center(p);
          if (k) ctx.lineTo(cx, cy);
          else ctx.moveTo(cx, cy);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    for (const [i, fill] of [
      [start, "#eef0f3"],
      [goal, tint],
    ] as const) {
      const [cx, cy] = center(i);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let last = 0;
  const frame = (now: number) => {
    if (!playing) return;
    if (now - last > 28) {
      last = now;
      if (state?.path) {
        if (pathProgress < state.path.length - 1) pathProgress += 0.9;
        else if (++hold > 55) {
          r = rand((Math.random() * 1e9) | 0);
          map = makeMap(r);
          pick();
        }
      } else {
        for (let k = 0; k < 2; k++) {
          const step = it.next();
          if (step.done) break;
          state = step.value;
          if (state.path) break;
        }
      }
      draw();
    }
    raf = requestAnimationFrame(frame);
  };

  pick();
  if (reduce) {
    // Static frame: solve instantly and show the final path.
    for (const s of it) state = s;
    if (state?.path) pathProgress = state.path.length;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    play() {
      if (playing || reduce) return;
      playing = true;
      raf = requestAnimationFrame(frame);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
    },
  };
}
