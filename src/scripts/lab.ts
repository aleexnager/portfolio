// Lab section: segment policy readout, packet dissector and a simulated PLC.

const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initTopology() {
  const root = document.querySelector<HTMLElement>("[data-topo]");
  const out = root?.querySelector<HTMLElement>("[data-policy-text]");
  const host = root?.querySelector<HTMLElement>("[data-host]");
  if (!root || !out || !host) return;
  const fallback = out.textContent ?? "";
  const services = [...host.querySelectorAll<HTMLElement>("[data-svc]")];
  const show = (seg: HTMLElement | null) => {
    if (!seg) {
      out.textContent = fallback;
      host.classList.remove("has-focus");
      services.forEach((s) => s.classList.remove("is-reach"));
      return;
    }
    const reach = new Set((seg.dataset.reach ?? "").split(" "));
    out.textContent = `${seg.dataset.name}: ${seg.dataset.policy}`;
    host.classList.add("has-focus");
    services.forEach((s) => s.classList.toggle("is-reach", reach.has(s.dataset.svc ?? "")));
  };
  root.querySelectorAll<HTMLElement>("[data-seg]").forEach((seg) => {
    seg.addEventListener("pointerenter", () => show(seg));
    seg.addEventListener("focus", () => show(seg));
    seg.addEventListener("pointerleave", () => show(null));
    seg.addEventListener("blur", () => show(null));
  });
}

function initDissector() {
  const root = document.querySelector<HTMLElement>("[data-dissect]");
  if (!root) return;
  const dump = root.querySelector<HTMLElement>("[data-hexdump]")!;
  const bytes = [...dump.querySelectorAll<HTMLButtonElement>(".byte")];
  const k = root.querySelector<HTMLElement>("[data-readout-k]")!;
  const v = root.querySelector<HTMLElement>("[data-readout-v]")!;
  const layerBtns = [...root.querySelectorAll<HTMLButtonElement>("[data-layer]")];

  const selectField = (b: HTMLElement) => {
    const f = b.dataset.f;
    bytes.forEach((x) => x.classList.toggle("is-field", x.dataset.f === f));
    k.textContent = `${b.dataset.n}`;
    v.textContent = `${b.dataset.v}`;
  };

  const selectLayer = (layer: string | null) => {
    dump.classList.toggle("has-layer", !!layer);
    bytes.forEach((x) => x.classList.toggle("is-layer", x.dataset.layerOf === layer));
    layerBtns.forEach((b) => b.classList.toggle("is-on", b.dataset.layer === layer));
  };

  dump.addEventListener("pointerover", (e) => {
    const b = (e.target as Element).closest<HTMLElement>(".byte");
    if (b) selectField(b);
  });
  dump.addEventListener("focusin", (e) => {
    const b = (e.target as Element).closest<HTMLElement>(".byte");
    if (b) selectField(b);
  });
  // Arrow keys move through bytes (roving tabindex).
  dump.addEventListener("keydown", (e) => {
    const i = bytes.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const cols = window.matchMedia("(min-width: 48rem)").matches ? 16 : 8;
    const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = bytes[Math.max(0, Math.min(bytes.length - 1, i + delta))];
    next.focus();
  });

  layerBtns.forEach((btn) => {
    btn.addEventListener("pointerenter", () => selectLayer(btn.dataset.layer!));
    btn.addEventListener("pointerleave", () => selectLayer(null));
    btn.addEventListener("focus", () => selectLayer(btn.dataset.layer!));
    btn.addEventListener("blur", () => selectLayer(null));
  });

  // Start on the function code: the most interesting byte.
  const fn = bytes.find((b) => b.dataset.n === "Function code");
  if (fn) selectField(fn);
}

function initPLC() {
  const root = document.querySelector<HTMLElement>("[data-ot]");
  if (!root) return;
  const tank = root.querySelector<HTMLElement>("[data-tank]")!;
  const spark = root.querySelector<SVGPolylineElement>("[data-spark]")!;
  const reg = (a: number) => root.querySelector<HTMLElement>(`[data-reg="${a}"]`)!;

  const HIGH = 80;
  const LOW = 30;
  let level = 52;
  let pump = true;
  const history: number[] = [];
  let timer = 0;

  const set = (el: HTMLElement, value: string) => {
    if (el.textContent === value) return;
    el.textContent = value;
    if (reduce()) return;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  };

  const tick = () => {
    // Hysteresis control loop: fill to HIGH, drain to LOW.
    const inflow = pump ? 3.1 + Math.random() * 0.6 : 0;
    const outflow = 1.4 + Math.random() * 0.5;
    level = Math.max(0, Math.min(100, level + inflow - outflow));
    if (level >= HIGH) pump = false;
    if (level <= LOW) pump = true;
    const flow = pump ? 11.8 + Math.random() * 1.2 : 0;

    set(reg(40001), level.toFixed(1));
    set(reg(40002), pump ? "ON" : "OFF");
    set(reg(40003), flow.toFixed(1));
    set(reg(40004), HIGH.toFixed(1));
    tank.style.transform = `scaleY(${level / 100})`;

    history.push(level);
    if (history.length > 60) history.shift();
    const n = history.length;
    spark.setAttribute(
      "points",
      history.map((v, i) => `${(i / 59) * 120},${40 - (v / 100) * 36 - 2}`).join(" ") || "",
    );
    if (n === 1) spark.setAttribute("points", `0,${40 - (level / 100) * 36 - 2} 0.1,${40 - (level / 100) * 36 - 2}`);
  };

  // Seed a short history so the chart is meaningful on first view.
  for (let i = 0; i < 60; i++) tick();

  const start = () => {
    if (timer || reduce()) return;
    timer = window.setInterval(tick, 1000);
  };
  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(root);
}

export function initLab() {
  initTopology();
  initDissector();
  initPLC();
}
