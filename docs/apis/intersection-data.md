# Intersection Data

```ts
import { createIntersectionData } from "mobx-web-api";
```

Creates reactive intersection data for an `Element`, a MobX `Ref<Element>`, or an array of elements and refs.

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

Pass an array to track several targets in input order:

```ts
const [first, second] = createIntersectionData([firstElement, secondElement]);

reaction(
  () => [first.isIntersecting, second.isIntersecting],
  ([firstIsIntersecting, secondIsIntersecting]) =>
    console.log({ firstIsIntersecting, secondIsIntersecting }),
);
```

For dynamically added or removed targets, pass `null` to create a controller. `observe` returns that target's reactive data; pass the same element or ref to `unobserve` when it is no longer needed. The `IntersectionObserver` is created only when its data is reactively read.

```ts
const intersectionData = createIntersectionData(null, { threshold: 0.5 });
const targetData = intersectionData.observe(targetRef);

reaction(
  () => targetData.isIntersecting,
  (isIntersecting) => console.log({ isIntersecting }),
);

intersectionData.unobserve(targetRef);
```

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
