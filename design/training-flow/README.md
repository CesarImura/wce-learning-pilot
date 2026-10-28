# Training user flow

Pannable board of the whole Training journey, built from real captures of this prototype.
Published at https://claude.ai/artifact/DWcNy4uqxKfF8CbSdLFzbP. The side panel switches between
the full flow (paths with a walk-through) and the paywall summary (4 doors, 1 paywall, 2 answers).

- `flow-data.js`: every node (screens, decisions, notes), edge, lane, path and the paywall summary.
- `index.html`: the board (pan, zoom, paths, walk-through, lightbox, summary). `/*FLOW_DATA*/` is replaced at build.
- `shots/`: the captures each screen node points to (`img: "home-b"` → `shots/home-b.jpg`).

Rebuild:
1. Run the prototype on :3430 (`npm run dev -- -p 3430`).
2. `node capture.mjs` (paywall test screens) and `node capture-all.mjs` (lessons, unit tests, league, collection, lab) → `shots/`.
3. `python3 build.py` → `dist/training-flow.html` with `dist/shots/`. Open it, or publish the `dist/` folder.

Captures use Google Chrome headless at /Applications/Google Chrome.app and keep their own profiles in `chrome-profile*/` (ignored).
