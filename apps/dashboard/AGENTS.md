# Agent instructions: `apps/dashboard/`

## Traps

- `@codenhub/icons/vite` injects the generated icon rules into the HTML as an inline `<style id="codenhub-icons">`, which the dashboard's CSP (`style-src 'self'`, invariant 5) refuses, so icons render blank once the page is served with Symbolon's headers. `vite build` succeeds and nothing warns. Prefer the PostCSS plugin, `@codenhub/icons/postcss`, through `css.postcss` in `vite.config.ts`: it writes the rules into the bundled stylesheet. Held on `@codenhub/icons` 0.2.1 with Vite 8.3.
- A bare side-effect import of a CSS package from TypeScript, `import "@codenhub/styles"`, fails `tsc` with TS2882 on TypeScript 6, which checks side-effect imports and finds no declarations for the package's CSS entry. Prefer `@import` in `src/main.css`, which `main.ts` imports and `vite/client` declares. Held on TypeScript 6.0.3.
