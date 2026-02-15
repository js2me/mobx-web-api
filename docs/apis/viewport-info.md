# Viewport Info

```ts
import { viewportInfo } from "mobx-web-api";
```

Allows tracking visual viewport dimensions and scale.

::: info What's inside
Uses [Visual Viewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) under the hood.
:::

## Usage

```ts
import { viewportInfo } from "mobx-web-api";
import { reaction } from "mobx";

reaction(
  () => viewportInfo.height,
  (height) => {
    console.log(`visual viewport height: ${height}`);
  }
);
```

## Properties

#### `isSupported`

`true` when `window.visualViewport` exists.

[MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/visualViewport)

#### `width` / `height`

Visual viewport size.

- [MDN width](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/width)
- [MDN height](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/height)

#### `offsetLeft` / `offsetTop`

Offset of visual viewport relative to layout viewport.

- [MDN offsetLeft](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/offsetLeft)
- [MDN offsetTop](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/offsetTop)

#### `pageLeft` / `pageTop`

Coordinates of visual viewport relative to initial containing block.

- [MDN pageLeft](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/pageLeft)
- [MDN pageTop](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/pageTop)

#### `scale`

Current pinch-zoom scale factor.

[MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/scale)

#### `isKeyboardLikeOverlay`

Heuristic flag that becomes `true` when visual viewport is much smaller than layout viewport.

### Notes

- If VisualViewport API is unavailable, falls back to `window.innerWidth/innerHeight`.
- Keyboard overlay detection is heuristic and may vary by browser.
