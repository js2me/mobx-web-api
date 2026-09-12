# Intersection Data

```ts
import { createIntersectionData } from "mobx-web-api";
```

Creates reactive intersection data for an `Element` or a MobX `Ref<Element>`.

## Usage

```ts
const data = createIntersectionData(element, {
  root: scrollContainer,
  threshold: 0.5,
});

reaction(
  () => data.isIntersecting,
  (isIntersecting) => console.log({ isIntersecting }),
);
```

The `IntersectionObserver` is connected lazily while the returned object is observed.
The `root` option accepts either an `Element` or a MobX `Ref<Element>`.

## Properties

### `isIntersecting`

Whether the target currently intersects the observer root.

### `intersectionRatio`

The visible proportion of the target, from `0` to `1`.

### `boundingClientRect` / `intersectionRect` / `rootBounds`

The rectangles from the latest `IntersectionObserverEntry`.

### `isSupported`

`true` when `IntersectionObserver` is available in the current environment.

[MDN IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
