# Color Scheme

```ts
import { colorScheme } from "mobx-web-api";
```

Allows tracking preferred color scheme from system/browser settings.

::: info What's inside
Uses [Window.matchMedia](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) and [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media feature under the hood.
:::

## Usage

```ts
import { colorScheme } from "mobx-web-api";
import { reaction } from "mobx";

console.log(colorScheme.scheme); // "dark" | "light" | "no-preference"

reaction(
  () => colorScheme.scheme,
  (scheme) => {
    console.log(`theme changed: ${scheme}`);
  }
);
```

## Properties

#### `scheme`

Current system color scheme.

- [MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)

#### `isDark`

Shortcut for `scheme === "dark"`.

#### `isLight`

Shortcut for `scheme === "light"`.

#### `isNoPreference`

Shortcut for `scheme === "no-preference"`.

### Notes

- If `matchMedia` is unavailable, falls back to `"no-preference"`.
- Changes are reactive via media query `change` events.
