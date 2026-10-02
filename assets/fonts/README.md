# Local brand fonts

Place licensed, non-redistributable fonts in `assets/fonts/private/`. That directory is ignored by Git.

The local development checkout uses:

```text
assets/fonts/private/Satoshi-Bold.ttf
```

Scenes should provide browser/system fallbacks because private font files are intentionally absent from public checkouts and npm packages.
