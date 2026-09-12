# Resize Data

```ts
import { createResizeData } from "mobx-web-api";
```

Creates reactive size data for an `Element` or a MobX `Ref<Element>`.

## Usage

```ts
const data = createResizeData(element);

reaction(
  () => data.width,
  (width) => console.log(`element width: ${width}px`),
);
```

The `ResizeObserver` is connected lazily while the returned object is observed.

## Properties

### `width` / `height`

Current width and height from `ResizeObserverEntry.contentRect`.

### `rect`

The latest `DOMRectReadOnly` reported by `ResizeObserver`.

### `isSupported`

`true` when `ResizeObserver` is available in the current environment.

[MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
