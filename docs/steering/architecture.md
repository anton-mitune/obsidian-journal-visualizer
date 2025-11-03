# Architecture

## Runtime Environment
- Browser context inside Obsidian (Electron desktop / mobile WebView).
- No Node core modules relied upon (keeps mobile compatibility).
- Single bundled file `main.js` loaded by Obsidian per `manifest.json`.

## Folder / File Layout (Current)
TODO when V1 is out

## Build & Deployment Flow
1. Edit TypeScript (`main.ts` or future `src/*`).
2. Run `npm run dev` (esbuild watch) or `npm run build` for production.
3. Output: `main.js` at project root.
4. Copy `main.js`, `manifest.json`, optional `styles.css` into vault plugin dir.
5. Enable in Obsidian settings.

End of architecture overview.
