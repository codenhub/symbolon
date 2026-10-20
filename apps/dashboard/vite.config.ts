import lucide from "@codenhub/icons/data/lucide";
import icons from "@codenhub/icons/postcss";
import { defineConfig } from "vite";

export default defineConfig({
  css: {
    postcss: {
      // Appends the base icon rules and the mask rules for the classes the markup uses to the bundled
      // stylesheet. The Vite plugin is not used because it injects an inline <style> into the HTML, which
      // the dashboard's CSP (style-src 'self') refuses.
      plugins: [icons({ content: ["./index.html", "./src/**/*.ts"], families: [lucide] })],
    },
  },
  build: {
    // The dashboard is served under a strict CSP (docs/specs/invariants.md, invariant 5), so no script or
    // asset is inlined into the HTML. Icon masks are data: URLs inside the CSS, which the CSP's img-src allows.
    assetsInlineLimit: 0,
  },
});
