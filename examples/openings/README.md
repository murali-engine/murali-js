# Opening sequence examples

This folder contains full-screen animated introductions, called **opening sequences** or **openers**.

- `kavriq-opening.ts` — reusable 3D title ident
- `opening-scene-view.ts` — 3D ident transitioning into a main scene
- `wave-mesh-background.ts` — atmospheric wave title sequence
- `newspaper-opening.ts` — configurable stacked-newspaper montage

Run an opener from the repository root:

```bash
npm run example -- openings/newspaper-opening
```

Add new opener examples here as new visual treatments are developed. Shared implementation belongs in the appropriate `src/tattvas` package rather than in this folder.
