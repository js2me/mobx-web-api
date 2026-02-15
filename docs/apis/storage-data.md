# Storage Data

```ts
import { createStorageData, storageData } from "mobx-web-api";
```

Reactive access to `localStorage` and `sessionStorage` keys.

::: info What's inside
Uses [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage) and `storage` event under the hood.
:::

## Usage

```ts
import { storageData } from "mobx-web-api";
import { reaction } from "mobx";

reaction(
  () => storageData.local["auth-token"],
  (value) => {
    console.log("token changed", value);
  }
);

storageData.local["auth-token"] = "new-token";
delete storageData.local["auth-token"];
```

Session storage example:

```ts
storageData.session["draft"] = "step-1";
console.log(storageData.session["draft"]); // "step-1"
```

Prefix example:

```ts
const appStorage = createStorageData({ prefix: "app:" });

appStorage.local["token"] = "abc";
// writes into localStorage key "app:token"
```

## API

#### `storageData.local[key]`

Reactive value from `localStorage` by key.

[MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

#### `storageData.session[key]`

Reactive value from `sessionStorage` by key.

[MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)

#### `createStorageData(options?)`

Creates isolated storage API with lazy `local`/`session` scopes.

`CreateStorageDataOptions`:

- `prefix?: string` - prefix for real storage keys (`${prefix}${key}`).

[MDN Storage interface](https://developer.mozilla.org/en-US/docs/Web/API/Storage)

#### Write / remove

- write: `storageData.local["key"] = "value"`
- remove: `delete storageData.local["key"]`
- `null` or `undefined` assignment also removes key.

- [MDN setItem](https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem)
- [MDN removeItem](https://developer.mozilla.org/en-US/docs/Web/API/Storage/removeItem)
- [MDN getItem](https://developer.mozilla.org/en-US/docs/Web/API/Storage/getItem)

### Notes

- Works with SSR and unavailable storage APIs (returns `null`/safe defaults).
- Reacts to `storage` events from other tabs and windows.
