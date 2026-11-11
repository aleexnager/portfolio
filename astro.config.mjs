// @ts-check
import { defineConfig } from "astro/config";

// One codebase, two targets:
//  - Vercel serves the site at the domain root ("/").
//  - GitHub Pages serves it under the repository path ("/portfolio/").
// The Pages workflow sets SITE_URL and BASE_PATH; Vercel uses the defaults.
const site = process.env.SITE_URL ?? "https://anager.vercel.app";
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  build: { inlineStylesheets: "auto" },
  compressHTML: true,
  devToolbar: { enabled: false },
  security: {
    // Hash-based Content-Security-Policy emitted as a <meta> tag, so it also
    // protects the GitHub Pages copy where custom headers are not available.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' https://api.github.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        "upgrade-insecure-requests",
      ],
    },
  },
});
