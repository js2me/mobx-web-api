# Resize Data

```ts
import { createResizeData } from "mobx-web-api";
```

Creates reactive size data for an `Element`, a MobX `Ref<Element>`, or an array of elements and refs.

## Usage

```ts
const data = createResizeData(element);

reaction(
  () => data.width,
  (width) => console.log(`element width: ${width}px`),
);
```

Pass an array to track several elements. The returned data array keeps the same order as the input:

```ts
const [first, second] = createResizeData([firstElement, secondElement]);

reaction(
  () => [first.width, second.width],
  ([firstWidth, secondWidth]) => console.log({ firstWidth, secondWidth }),
);
```

Each `ResizeObserver` is created only while its returned size data is reactively observed and disconnects when the last reaction for that data is disposed.

For elements that are added and removed dynamically, pass `null` to create a controller. `observe` registers an element or ref and returns its reactive data; pass the same element or ref to `unobserve` when it is no longer needed. `observe` alone does not create a `ResizeObserver`; it is created only when returned data is reactively read. Repeated calls to `observe` with the same element or ref return the same data until `unobserve` is called.

```ts
const resizeData = createResizeData(null);
const elementData = resizeData.observe(elementRef);

reaction(
  () => elementData.width,
  (width) => console.log(`element width: ${width}px`),
);

resizeData.unobserve(elementRef);
```

## Properties

### `width` / `height`

Current width and height from `ResizeObserverEntry.contentRect`.

### `rect`

The latest `DOMRectReadOnly` reported by `ResizeObserver`.

### `isSupported`

`true` when `ResizeObserver` is available in the current environment.

[MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
