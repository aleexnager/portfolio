import { analyse, embed, extract, STEGO_BLOCK, STEGO_SIZE, type Analysis, type EmbedResult, type Mode } from "./stego";

type View = "image" | "diff" | "entropy";

const LEGENDS: Record<View, (r: EmbedResult | null) => string> = {
  image: (r) =>
    r
      ? "The stego image. It looks identical to the original. That is the point."
      : "The cover image. 256 by 256 pixels, 24,572 bytes of raw LSB capacity.",
  diff: (r) =>
    r
      ? "Every lit pixel had at least one least-significant bit flipped."
      : "Embed a message to see which pixels change.",
  entropy: () => "Shannon entropy per 8 by 8 block. Brighter blocks are noisier and hide data better. Dim blocks are flat, like sky.",
};

const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initStegoDemo(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-stego-canvas]")!;
  const wrap = root.querySelector<HTMLElement>("[data-canvas-wrap]")!;
  const scan = root.querySelector<HTMLElement>("[data-scanline]")!;
  const legend = root.querySelector<HTMLElement>("[data-legend]")!;
  const form = root.querySelector<HTMLFormElement>("[data-stego-form]")!;
  const msg = root.querySelector<HTMLTextAreaElement>("[data-msg]")!;
  const counter = root.querySelector<HTMLElement>("[data-counter]")!;
  const embedBtn = root.querySelector<HTMLButtonElement>("[data-embed]")!;
  const embedLabel = root.querySelector<HTMLElement>("[data-embed-label]")!;
  const progress = root.querySelector<HTMLElement>("[data-progress]")!;
  const extractBtn = root.querySelector<HTMLButtonElement>("[data-extract]")!;
  const output = root.querySelector<HTMLOutputElement>("[data-output]")!;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>("[data-view]")];
  const stat = (k: string) => root.querySelector<HTMLElement>(`[data-stat="${k}"]`)!;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const enc = new TextEncoder();
  const dec = new TextDecoder("utf-8", { fatal: false });

  let cover: Uint8ClampedArray | null = null;
  let analysis: Analysis | null = null;
  let result: EmbedResult | null = null;
  let resultMode: Mode = "adaptive";
  let view: View = "image";
  let revealCount = Infinity; // how many changed slots to draw in the diff view
  let busy = false;

  const mode = (): Mode => (form.elements.namedItem("mode") as RadioNodeList).value as Mode;
  const payloadKind = () => (form.elements.namedItem("payload") as RadioNodeList).value;

  const payload = (): Uint8Array => {
    if (payloadKind() === "bulk") {
      const bytes = new Uint8Array(3072);
      crypto.getRandomValues(bytes);
      return bytes;
    }
    return enc.encode(msg.value);
  };

  const updateCounter = () => {
    const n = payloadKind() === "bulk" ? 3072 : enc.encode(msg.value).length;
    counter.textContent = `${n.toLocaleString("en-GB")} bytes`;
    msg.disabled = payloadKind() === "bulk";
  };

  // --- Rendering -----------------------------------------------------------

  function render() {
    if (!cover || !analysis) return;
    const img = ctx.createImageData(STEGO_SIZE, STEGO_SIZE);
    const px = img.data;
    wrap.classList.toggle("is-pixel", view !== "image");

    if (view === "image") {
      px.set(result ? result.stego : cover);
    } else if (view === "diff") {
      for (let i = 0; i < px.length; i += 4) {
        const g = (cover[i] * 0.299 + cover[i + 1] * 0.587 + cover[i + 2] * 0.114) * 0.22;
        px[i] = px[i + 1] = px[i + 2] = g;
        px[i + 3] = 255;
      }
      if (result) {
        const n = Math.min(revealCount, result.changed.length);
        // Soft halo first, then the exact pixel, so isolated flips stay visible.
        for (let k = 0; k < n; k++) {
          const pixel = (result.changed[k] / 3) | 0;
          const x = pixel % STEGO_SIZE;
          const y = (pixel / STEGO_SIZE) | 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= STEGO_SIZE || ny >= STEGO_SIZE) continue;
              const q = (ny * STEGO_SIZE + nx) * 4;
              px[q] = Math.max(px[q], 70);
              px[q + 1] = Math.max(px[q + 1], 92);
              px[q + 2] = Math.max(px[q + 2], 40);
            }
          }
        }
        for (let k = 0; k < n; k++) {
          const p = ((result.changed[k] / 3) | 0) * 4;
          px[p] = 194;
          px[p + 1] = 242;
          px[p + 2] = 97;
        }
      }
    } else {
      const per = STEGO_SIZE / STEGO_BLOCK;
      for (let y = 0; y < STEGO_SIZE; y++) {
        for (let x = 0; x < STEGO_SIZE; x++) {
          const b = ((y / STEGO_BLOCK) | 0) * per + ((x / STEGO_BLOCK) | 0);
          const t = Math.min(1, analysis.entropy[b] / 5);
          const i = (y * STEGO_SIZE + x) * 4;
          px[i] = 12 + t * t * 182;
          px[i + 1] = 15 + t * t * 227;
          px[i + 2] = 18 + t * t * 79;
          px[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    legend.textContent = LEGENDS[view](result);
  }

  function setView(v: View) {
    view = v;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.view === v)));
    render();
  }

  // --- Stats ---------------------------------------------------------------

  function countTo(el: HTMLElement, to: number, format: (n: number) => string, ms = 700) {
    if (reduce() || !Number.isFinite(to)) {
      el.textContent = format(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = format(to * e);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function showStats(r: EmbedResult) {
    const cap = analysis!.capacityBytes;
    countTo(stat("pixels"), r.touchedPixels, (n) => Math.round(n).toLocaleString("en-GB"));
    countTo(stat("psnr"), r.psnr, (n) => (Number.isFinite(n) ? `${n.toFixed(1)} dB` : "lossless"));
    countTo(stat("flat"), r.flatShare * 100, (n) => `${n.toFixed(1)}%`);
    countTo(stat("capacity"), ((r.bits / 8) / cap) * 100, (n) => `${n.toFixed(2)}%`);
    const flat = stat("flat");
    flat.classList.toggle("is-good", r.flatShare < 0.05);
    flat.classList.toggle("is-bad", r.flatShare >= 0.05);
  }

  function resetStats() {
    ["pixels", "psnr", "flat", "capacity"].forEach((k) => {
      stat(k).textContent = "--";
      stat(k).classList.remove("is-good", "is-bad");
    });
  }

  // --- Actions -------------------------------------------------------------

  function setBusy(on: boolean, label = "Embed message") {
    busy = on;
    embedBtn.disabled = on;
    extractBtn.disabled = on || !result;
    embedBtn.setAttribute("aria-busy", String(on));
    embedLabel.textContent = label;
  }

  function animateEmbed(r: EmbedResult) {
    return new Promise<void>((resolve) => {
      if (reduce()) {
        revealCount = Infinity;
        render();
        resolve();
        return;
      }
      const total = r.changed.length;
      const ms = Math.min(1400, 500 + total / 20);
      const start = performance.now();
      scan.style.opacity = "1";
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        revealCount = Math.round(total * e);
        progress.style.transform = `scaleX(${e})`;
        embedLabel.textContent = `Embedding ${Math.round(e * 100)}%`;
        // Scan line follows the last written pixel.
        const last = r.changed[Math.max(0, revealCount - 1)] ?? 0;
        const y = ((last / 3 / STEGO_SIZE) | 0) / STEGO_SIZE;
        scan.style.transform = `translateY(${y * wrap.clientHeight}px)`;
        render();
        if (t < 1) requestAnimationFrame(tick);
        else {
          scan.style.opacity = "0";
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || !cover || !analysis) return;
    const data = payload();
    if (data.length === 0) {
      output.textContent = "Type a message first.";
      msg.focus();
      return;
    }
    setBusy(true, "Embedding 0%");
    output.classList.remove("is-ok");
    output.textContent = "Writing bits into the image...";
    resetStats();
    resultMode = mode();
    result = embed(cover, analysis, resultMode, data);
    revealCount = 0;
    setView("diff");
    await animateEmbed(result);
    progress.style.transform = "scaleX(0)";
    showStats(result);
    output.textContent = "Done. Now pull the message back out of the pixels.";
    setBusy(false, "Embed again");
  });

  extractBtn.addEventListener("click", () => {
    if (!result) return;
    const bytes = extract(result.stego, resultMode);
    if (!bytes) {
      output.textContent = "No valid payload found.";
      return;
    }
    output.classList.add("is-ok");
    if (payloadKind() === "bulk" && bytes.length === 3072) {
      const hex = [...bytes.slice(0, 24)].map((b) => b.toString(16).padStart(2, "0")).join(" ");
      output.textContent = `3,072 bytes recovered. First bytes: ${hex} ...`;
      return;
    }
    const text = dec.decode(bytes);
    if (reduce()) {
      output.textContent = text;
      return;
    }
    let i = 0;
    const step = () => {
      i = Math.min(text.length, i + 2);
      output.textContent = text.slice(0, i);
      if (i < text.length) requestAnimationFrame(step);
    };
    step();
  });

  tabs.forEach((t) => t.addEventListener("click", () => setView(t.dataset.view as View)));
  root.querySelector("[role=tablist]")?.addEventListener("keydown", (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const i = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const next = tabs[(i + (ev.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    setView(next.dataset.view as View);
  });

  msg.addEventListener("input", updateCounter);
  form.addEventListener("change", () => {
    updateCounter();
    if (result) {
      // Settings changed: the shown result no longer matches them.
      result = null;
      resetStats();
      output.classList.remove("is-ok");
      output.textContent = "Settings changed. Embed again to compare.";
      extractBtn.disabled = true;
      embedLabel.textContent = "Embed message";
      render();
    }
  });
  updateCounter();

  // --- Load cover lazily when the demo approaches the viewport ------------

  const load = () => {
    const img = new Image();
    img.decoding = "async";
    img.src = root.dataset.src!;
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = off.height = STEGO_SIZE;
      const octx = off.getContext("2d", { willReadFrequently: true })!;
      octx.drawImage(img, 0, 0, STEGO_SIZE, STEGO_SIZE);
      cover = octx.getImageData(0, 0, STEGO_SIZE, STEGO_SIZE).data;
      analysis = analyse(cover);
      wrap.setAttribute("aria-busy", "false");
      embedBtn.disabled = false;
      render();
    };
    img.onerror = () => {
      wrap.setAttribute("aria-busy", "false");
      legend.textContent = "The cover image could not be loaded. Refresh to try again.";
    };
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        io.disconnect();
        load();
      }
    },
    { rootMargin: "400px" },
  );
  io.observe(root);
}
