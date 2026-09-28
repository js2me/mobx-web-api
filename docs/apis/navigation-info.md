# Navigation Info

```ts
import { createNavigationInfo } from 'mobx-web-api';

const navigationInfo = createNavigationInfo();
```

Reactive access to the browser [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API). It tracks the current session-history entry and navigation capabilities. Its `navigate()` method intercepts eligible programmatic navigations to keep the current document alive; the application remains responsible for rendering the destination route.

## Usage

```ts
import { autorun } from 'mobx';
import { createNavigationInfo } from 'mobx-web-api';

const navigationInfo = createNavigationInfo();

autorun(() => {
  console.log(navigationInfo.path, navigationInfo.query, navigationInfo.hash);
  console.log(navigationInfo.canGoBack);
});

navigationInfo.navigate('/settings', { history: 'push' });
navigationInfo.navigate('/settings', {
  history: 'replace',
  query: { tab: 'profile', page: 2 },
});
navigationInfo.navigate(null, {
  history: 'replace',
  query: { tab: 'profile', page: 2 },
});
navigationInfo.navigate({ tab: 'profile', page: 2 }, { history: 'replace' });

// Create a separate instance for regular document navigations:
const fullNavigationInfo = createNavigationInfo({ mpa: true });
fullNavigationInfo.navigate('/external-page');

// Release this instance when its owner unmounts or is disposed.
navigationInfo.destroy();
```

For server-side rendering, create an instance per request and pass an entry for that request:

```ts
const navigationInfo = createNavigationInfo({ ssrSnapshot: serverEntry });
```

Do not share an instance with a request-specific snapshot between concurrent requests. In the browser the native current entry takes precedence over the snapshot.

## API

### `isSupported`

`true` when the browser provides the Navigation API.

### `currentEntry`

The current `NavigationEntry`. When there is no browser entry, returns the request's `ssrSnapshot` if provided; otherwise returns a placeholder entry with empty `id`, `key`, and `url`, and `index: -1`. The placeholder is not a real browser history entry.

### `state`

The result of the current entry's `getState()`, or the SSR snapshot's `getState()` when the Navigation API is unavailable. Returns `undefined` for the default placeholder. Reacts to `currententrychange`, including state updates that keep the same entry object.

### `url`

The current entry URL as a `URL` object, or `null` when the entry has no URL. MobX caches the parsed URL while it is observed; direct reads without observers create a new `URL` object.

### `path` / `query` / `hash`

Reactive URL parts derived from `url`: `path` is the pathname, `query` is the search string (including `?`), and `hash` is the fragment (including `#`). Each returns an empty string if there is no current entry or the API is unavailable. For example, `https://example.com/products?page=2#details` yields `/products`, `?page=2`, and `#details`.

### `queryData`

Decoded query parameters as a `Record<string, string>`. Returns `{}` when the URL is unavailable. If a key appears more than once, the last value wins; use `navigationInfo.url?.searchParams.getAll(key)` to retrieve all values.

### `entries`

The current session-history entries. Returns an empty array when unsupported.
MobX caches the list while it is observed and refreshes it on `currententrychange`.

### `canGoBack` / `canGoForward`

Reactive flags for available history traversal. Both are `false` when unsupported.

### `destroy()`

Removes this instance's browser listeners without disabling the object. Getters and navigation commands still work; a later SPA call to `navigate()` attaches its listener again. Dispose any MobX `reaction`/`autorun` created by the caller as usual; `destroy()` does not dispose caller-owned reactions.

### Commands

`navigate(url, options?)`, `back(options?)`, `forward(options?)`, `reload(options?)`, and `traverseTo(key, options?)` delegate to the native Navigation API. They return its `NavigationResult`, or `undefined` when the API is unavailable.

`navigate()` intercepts its own interceptable programmatic navigations during the native `navigate` event, keeping the current document alive. Each instance lazily installs one listener and reuses it across calls, removing it on `destroy()`. Only the target URL for the synchronous native call is marked pending. A navigation that cannot be intercepted (such as cross-origin) is left to the browser. To always use regular document navigation, create the instance with `createNavigationInfo({ mpa: true })`. SPA interception is enabled by default.

**Important:** intercepting a navigation does not implement routing. Observe `path`/`url` and render the destination, or integrate it with your router. If the router does not handle the target path, the address can change while the old screen remains. `back()` and `forward()` delegate to the native API; previously visited cross-document entries may still reload.

`navigate` also accepts `options.query`, a record of string, number, boolean, nullable, or array values. It replaces any query string in the target URL, preserves the hash, omits `null`/`undefined` values, and writes arrays as repeated parameters. For example, `query: { tag: ['a', 'b'] }` produces `?tag=a&tag=b`. This option is processed by `mobx-web-api` and is not passed to the browser's Navigation API. Without `query`, the URL is passed through unchanged.

Pass `null` or `''` as the URL to reuse the current URL, including its path and hash. This is useful for updating only the query with `history: 'replace'`. When no current URL is available, the browser's `location.href` is used instead.

You can also pass the query object as the first argument: `navigate({ tab: 'profile' }, { history: 'replace' })`. This uses the current URL and replaces its query string. If both the first argument and `options.query` are present, the first argument takes precedence.

## Notes

- Browser support is currently limited; always check `isSupported` before relying on this API.
- Relative URLs follow the document's base URI (including a `<base href="…">` element). Only calls made through `navigationInfo.navigate()` are intercepted; links and other browser navigations retain their original behavior.
