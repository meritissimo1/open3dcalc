# Web Platform

The web app is a **React SPA + PWA** built with Vite.

## Dev

```bash
npm run dev:web    # http://localhost:5173, hot-reload
```

## Build

```bash
npm run build:web  # outputs to dist-web/
```

## PWA

- Service worker via Workbox (vite-plugin-pwa)
- Offline support, installable (add to homescreen)
- Auto-updates on new release (registerType: autoUpdate)

## Deployment

Auto-deployed to GitHub Pages on push to `main`:
**https://meritissimo1.github.io/open3dcalc/**

Manual: `npm run build:web` + upload `dist-web/` to any static host.
