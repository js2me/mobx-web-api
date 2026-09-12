# Fullscreen

```ts
import { fullscreen } from "mobx-web-api";
```

Reactive wrapper around the Fullscreen API.

## Usage

```ts
reaction(
  () => fullscreen.isActive,
  (isActive) => console.log({ isActive }),
);

await fullscreen.toggle(element);
```

## Properties

### `isSupported`

`true` when the current document supports the Fullscreen API.

### `isActive`

`true` when an element is currently displayed in fullscreen mode.

### `element`

The current fullscreen element, or `null`.

### `error`

The last error raised by the underlying Fullscreen API.

## Methods

### `request(element?)`

Requests fullscreen mode for an element or MobX `Ref<Element>`.
When omitted, defaults to `document.documentElement`.
Resolves to `true` when the request succeeds and `false` when it cannot be performed.

### `exit()`

Exits fullscreen mode. The returned promise resolves without doing anything when fullscreen is inactive.
It resolves to `true` when fullscreen is exited and `false` otherwise.

### `toggle(element?)`

Enters fullscreen when inactive and exits fullscreen when active.
When entering and `element` is omitted, defaults to `document.documentElement`.
Resolves to whether the operation succeeded.

[MDN Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
