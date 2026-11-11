import { copyText, toast } from "./ui";

export function initPalette() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-palette]");
  const input = dialog?.querySelector<HTMLInputElement>("[data-pal-input]");
  const list = dialog?.querySelector<HTMLElement>("[data-pal-list]");
  const empty = dialog?.querySelector<HTMLElement>("[data-pal-empty]");
  if (!dialog || !input || !list || !empty) return;

  const options = [...list.querySelectorAll<HTMLElement>("[role=option]")];
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll<HTMLElement>("[data-mod-key]").forEach((k) => (k.textContent = isMac ? "⌘" : "Ctrl"));

  let active = 0;
  const visible = () => options.filter((o) => !o.hidden);

  const setActive = (i: number) => {
    const vis = visible();
    if (!vis.length) return;
    active = (i + vis.length) % vis.length;
    options.forEach((o) => o.setAttribute("aria-selected", "false"));
    const el = vis[active];
    el.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", el.id);
    el.scrollIntoView({ block: "nearest" });
  };

  const filter = () => {
    const q = input.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    options.forEach((o) => {
      const hay = `${o.dataset.label} ${o.dataset.group?.toLowerCase()}`;
      o.hidden = !terms.every((t) => hay.includes(t));
    });
    empty.hidden = visible().length > 0;
    setActive(0);
  };

  const open = () => {
    if (dialog.open) return;
    input.value = "";
    filter();
    dialog.showModal();
    input.focus();
  };

  const close = () => dialog.close();

  const run = (el: HTMLElement) => {
    const { action, value = "" } = el.dataset;
    close();
    switch (action) {
      case "go":
        document.querySelector(value)?.scrollIntoView({ behavior: "smooth" });
        history.replaceState(null, "", value);
        break;
      case "copy":
        void copyText(value, "Email copied");
        break;
      case "download": {
        const a = document.createElement("a");
        a.href = value;
        a.download = "Alejandro-Nager-CV.pdf";
        a.click();
        toast("Downloading CV");
        break;
      }
      case "open":
        window.open(value, "_blank", "noopener,noreferrer");
        break;
    }
  };

  document.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    const typing = target.closest("input, textarea, [contenteditable]") && !dialog.contains(target);
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      dialog.open ? close() : open();
    } else if (e.key === "/" && !typing && !dialog.open) {
      e.preventDefault();
      open();
    }
  });

  document.querySelectorAll("[data-palette-open]").forEach((b) => b.addEventListener("click", open));

  input.addEventListener("input", filter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const el = visible()[active];
      if (el) run(el);
    }
  });

  list.addEventListener("click", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[role=option]");
    if (el) run(el);
  });
  list.addEventListener("pointermove", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[role=option]");
    if (!el) return;
    const i = visible().indexOf(el);
    if (i >= 0 && i !== active) setActive(i);
  });

  // Click on the backdrop closes the dialog.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
}
