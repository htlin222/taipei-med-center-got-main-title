# Taipei Medical Centers — Main Title

A *Game of Thrones*–style opening sequence over real 3D Taipei terrain: seven medical centres are lifted out of the ground by bespoke steam-age machinery, cut to the music.

- `site/` — the real-time Three.js page (open `index.html` through any static server; `npm run serve`).
- `scripts/render.cjs` — deterministic offline renderer: drives `window.__render(t)` frame by frame in headless Chromium and pipes PNGs into ffmpeg.
- `.github/workflows/render.yml` — renders a **1920×1080 MP4** on GitHub Actions:
  1. **plan** reads the music length and splits the frames into N shards (default 20 — GitHub's limit on concurrent jobs),
  2. **render** runs every shard in parallel (matrix) and uploads `seg_XXX.mp4`,
  3. **combine** concatenates the shards losslessly, muxes the music, and uploads `taipei-medical-centers-1080p.mp4` as a workflow artifact.

Run it from **Actions → Render 1080p MP4 → Run workflow** (shards and fps are inputs); it also runs on pushes that touch `site/` or the renderer.

Local render of a short range:

```sh
npm install && npx playwright install chromium
npm run serve &
node scripts/render.cjs --from 0 --to 90 --out test.mp4
```

`Math.random` is seeded before the page loads, so every shard builds the identical scene.
