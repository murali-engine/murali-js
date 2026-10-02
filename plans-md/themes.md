# Themes

Murali themes are typed, deterministic design-token trees shared by DOM, SVG, React, and Three.js content. Themes provide semantic defaults; they do not prevent an individual Tattva from selecting an explicit style.

## Create and select a theme

```ts
import { Scene } from "murali-js/core";
import { createTheme, themes } from "murali-js/style";

const brand = createTheme(themes.dark, {
  name: "brand",
  colors: {
    background: "#050513",
    textPrimary: "#fffaf0",
    accent: "#52d8ff",
    accentAlt: "#a78bfa",
  },
  typography: {
    headingFamily: "Inter, system-ui, sans-serif",
    headingWeight: 760,
  },
});

class BrandScene extends Scene {
  constructor() {
    super({ theme: brand });
  }
}
```

`themes.dark` preserves Murali JS's existing dark appearance. `themes.light` provides a warm classroom-oriented light theme. `createTheme(patch)` extends the dark theme, while `createTheme(base, patch)` extends an explicit base.

## Semantic colors

Core primitives use semantic roles automatically. Use `themeColor()` when a different semantic role is intended:

```ts
Label("Default heading");
Label("Secondary note").color(themeColor("textMuted"));
Circle();
Circle().fill(themeColor("positive"));
```

Literal CSS colors remain explicit overrides:

```ts
Label("Always this color").color("#ff3158");
```

## Scoped themes

Groups can override part of the inherited theme. Unspecified tokens continue to come from the parent scene:

```ts
Group([title, diagram, caption]).theme({
  colors: {
    accent: "#ff5d8f",
    textPrimary: "#fff3c4",
  },
});
```

Any Tattva can use `.themeScope(patch)` when it acts as the root of a reusable logical subtree. `Group.theme(patch)` is the concise group-specific alias.

Resolution order is: built-in theme, scene theme, group scope, then explicit Tattva style.

## Custom DOM and SVG

The renderer installs the resolved values on the scene stage and every logical theme scope:

```css
color: var(--murali-color-text-primary);
background: var(--murali-color-surface);
border-color: var(--murali-color-stroke-muted);
font-family: var(--murali-typography-body-family);
```

Custom Tattvas can also read their `resolvedTheme` after scene preparation.

## React

The React render callback receives the resolved theme:

```tsx
new ReactTattva((state, { theme }) => (
  <div style={{ color: theme.colors.textPrimary }} />
));
```

Nested React components can call `useMuraliTheme()`.

## Three.js

`ThreeContext` exposes the same resolved theme in `setup` and `update` hooks:

```ts
new ThreeTattva({
  setup({ scene, theme }) {
    scene.add(new Mesh(geometry, new MeshStandardMaterial({
      color: theme.colors.accent,
    })));
  },
});
```

Hex and CSS colors are authored as sRGB values. Three.js converts those inputs into its Linear-sRGB working color space.

## System palette

The fixed Murali/Manim palette is deliberately separate from semantic theming:

```ts
import { palette } from "murali-js/style";

const { TEAL_C, GOLD_C } = palette;
```

Use these swatches for intentionally fixed artwork or compatibility with an existing Murali scene. Reusable components should prefer semantic roles.

## Current boundary

Themes are currently static for a prepared scene. Deterministic timeline-driven theme interpolation and external DTCG-compatible theme files remain roadmap items.
