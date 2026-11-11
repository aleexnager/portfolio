# anager / portfolio

Personal site of Alejandro Náger, cybersecurity risk analyst and software engineer.

- Vercel: https://anager.vercel.app
- GitHub Pages: https://aleexnager.github.io/portfolio/

## Stack

- [Astro](https://astro.build) static output. No framework runtime, no server, no database.
- Plain TypeScript for every interactive piece (hero field, steganography demo, packet dissector, PLC simulation, command menu).
- Self-hosted Geist and Geist Mono. No third-party requests except the public GitHub API for the live activity block.

## Security posture

- Hash-based Content-Security-Policy generated at build time and shipped as a `<meta>` tag, so it also applies on GitHub Pages.
- On Vercel, `vercel.json` adds HSTS, `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and COOP/CORP.
- No cookies, no analytics, no forms, no secrets. `/.well-known/security.txt` is published.
- `npm audit`: 0 vulnerabilities at the time of the rebuild.

## Editing content

Everything lives in `src/data/site.ts`:

| What | Where |
| --- | --- |
| Profile, links, CV file | `profile` |
| Jobs | `experience` |
| Degrees and certifications | `education`, `certifications` |
| Projects (add one = append one object) | `projects` |
| Homelab diagram | `homelab` |

Screenshots for project cards go in `src/assets/shots/` and are referenced by the `shot` field. Images are converted to responsive WebP at build time.

## Design system

Tokens are defined once in `src/styles/global.css`: one accent (`--accent`), one sans and one mono typeface, a 4 px spacing scale, and a radius rule where the inner radius equals the outer radius minus the card padding. Mono is reserved for data: dates, registers, hex, code.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run check    # type check
npm run build    # static site in dist/
```

## Deploy

- **GitHub Pages**: `.github/workflows/pages.yml` builds with `BASE_PATH=/portfolio` and deploys on every push to `main`. Repository settings: Pages source must be "GitHub Actions".
- **Vercel**: import the repository; `vercel.json` sets the framework, build command and security headers. No environment variables are needed.
