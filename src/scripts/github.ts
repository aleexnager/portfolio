// Live GitHub data with loading, error and retry states. Responses are cached
// for 10 minutes per tab to stay well inside the unauthenticated rate limit.

type Repo = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  pushed_at: string;
  fork: boolean;
  private: boolean;
  size: number;
};

type Payload = { publicRepos: number; repos: Repo[] };

const TTL = 10 * 60 * 1000;

async function fetchJSON<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<T>;
}

let inflight: Promise<Payload> | null = null;

function load(user: string): Promise<Payload> {
  const key = `gh:${user}`;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const { at, data } = JSON.parse(raw) as { at: number; data: Payload };
      if (Date.now() - at < TTL) return Promise.resolve(data);
    }
  } catch {
    /* storage unavailable: just fetch */
  }
  if (inflight) return inflight;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  inflight = Promise.all([
    fetchJSON<{ public_repos: number }>(`https://api.github.com/users/${user}`, ctrl.signal),
    fetchJSON<Repo[]>(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=20&type=owner`, ctrl.signal),
  ])
    .then(([u, repos]) => {
      const data: Payload = { publicRepos: u.public_repos, repos };
      try {
        sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
      } catch {
        /* ignore */
      }
      return data;
    })
    .finally(() => {
      window.clearTimeout(timer);
      inflight = null;
    });
  return inflight;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function ago(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, s] of units) {
    if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), unit);
  }
  return "just now";
}

let blurbs: Record<string, string> = {};

function row(r: Repo, i: number) {
  const li = document.createElement("li");
  li.className = "act-row is-fresh";
  li.style.setProperty("--i", String(i));

  const name = document.createElement("span");
  name.className = "act-name";
  const a = document.createElement("a");
  a.href = r.html_url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = r.name;
  name.append(a);
  if (r.language) {
    const lang = document.createElement("span");
    lang.className = "act-lang";
    lang.textContent = r.language;
    name.append(lang);
  }

  const time = document.createElement("time");
  time.className = "act-time";
  time.dateTime = r.pushed_at;
  time.title = new Date(r.pushed_at).toLocaleString("en-GB");
  time.textContent = ago(r.pushed_at);

  const desc = document.createElement("span");
  desc.className = "act-desc";
  desc.textContent = r.description || blurbs[r.name.toLowerCase()] || "";

  li.append(name, time, desc);
  return li;
}

export function initActivity() {
  const root = document.querySelector<HTMLElement>("[data-activity]");
  const counter = document.querySelector<HTMLElement>("[data-repo-count]");
  const user = root?.dataset.user ?? "aleexnager";
  const list = root?.querySelector<HTMLElement>("[data-act-list]");
  const error = root?.querySelector<HTMLElement>("[data-act-error]");
  const retry = root?.querySelector<HTMLButtonElement>("[data-act-retry]");
  const skeleton = list?.innerHTML ?? "";
  try {
    blurbs = JSON.parse(root?.dataset.blurbs ?? "{}");
  } catch {
    blurbs = {};
  }

  const run = () => {
    if (list) {
      list.innerHTML = skeleton;
      list.setAttribute("aria-busy", "true");
    }
    if (error) error.hidden = true;

    load(user)
      .then((data) => {
        if (counter) {
          counter.textContent = String(data.publicRepos);
          counter.setAttribute("aria-busy", "false");
        }
        if (!list) return;
        // Skip forks, empty placeholders and this site's own repos.
        const own = new Set(["portfolio", "anager", user]);
        const repos = data.repos.filter((r) => !r.fork && !r.private && r.size > 0 && !own.has(r.name)).slice(0, 5);
        list.replaceChildren(...repos.map(row));
        list.setAttribute("aria-busy", "false");
      })
      .catch(() => {
        if (counter) {
          counter.textContent = "--";
          counter.setAttribute("aria-busy", "false");
        }
        if (list) {
          list.replaceChildren();
          list.setAttribute("aria-busy", "false");
        }
        if (error) error.hidden = false;
      });
  };

  retry?.addEventListener("click", run);

  // Start when the page is idle so it never competes with first paint.
  const start = () => run();
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 300);
}
