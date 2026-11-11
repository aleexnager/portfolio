// Shared UI behaviour: reveal on scroll, card spotlight, copy-to-clipboard
// with toast feedback, live "years of experience", and active nav section.

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let toastTimer: number | undefined;

export function toast(message: string) {
  const el = document.querySelector<HTMLElement>("[data-toast]");
  const text = el?.querySelector<HTMLElement>("[data-toast-text]");
  if (!el || !text) return;
  text.textContent = message;
  el.classList.add("is-on");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("is-on"), 2200);
}

export async function copyText(value: string, label = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(value);
    toast(label);
    return true;
  } catch {
    // Clipboard can be blocked (permissions, insecure context). Fall back to mail.
    window.location.href = `mailto:${value}`;
    return false;
  }
}

function initReveal() {
  const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
  items.forEach((el) => {
    const i = el.dataset.i;
    if (i) el.style.setProperty("--i", i);
  });
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  items.forEach((el) => io.observe(el));
}

function initSpotlight() {
  if (reduceMotion() || !window.matchMedia("(hover: hover)").matches) return;
  document.addEventListener(
    "pointermove",
    (e) => {
      const card = (e.target as Element | null)?.closest<HTMLElement>(".spot");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    },
    { passive: true },
  );
}

function initCopy() {
  document.addEventListener("click", async (e) => {
    const btn = (e.target as Element | null)?.closest<HTMLElement>("[data-copy]");
    if (!btn) return;
    e.preventDefault();
    const ok = await copyText(btn.dataset.copy ?? "", btn.dataset.copyLabel ?? "Email copied");
    if (!ok) return;
    btn.classList.add("is-copied");
    window.setTimeout(() => btn.classList.remove("is-copied"), 1800);
  });
}

function initYears() {
  document.querySelectorAll<HTMLElement>("[data-years-since]").forEach((el) => {
    const start = new Date(el.dataset.yearsSince ?? "");
    if (Number.isNaN(start.getTime())) return;
    const years = (Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000);
    el.textContent = years.toFixed(1);
  });
}

function initActiveNav() {
  const links = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLAnchorElement>("[data-nav-link]").forEach((a) => {
    const id = a.hash.slice(1);
    if (id) links.set(id, a);
  });
  if (!links.size || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.removeAttribute("aria-current"));
        links.get(entry.target.id)?.setAttribute("aria-current", "true");
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  document.querySelectorAll<HTMLElement>("main > section[id]").forEach((s) => io.observe(s));
}

function initNavShadow() {
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

export function initUI() {
  initReveal();
  initSpotlight();
  initCopy();
  initYears();
  initActiveNav();
  initNavShadow();
}
