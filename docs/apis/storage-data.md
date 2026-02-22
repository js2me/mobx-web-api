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

Typed key helper example:

```ts
const tokenKey = storageData.key<string | null>("auth-token", null);

tokenKey.value = "new-token";
console.log(tokenKey.value); // "new-token"

tokenKey.value = null; // removes key from storage
tokenKey.reset(); // also removes key from storage
```

Array/object helper examples:

```ts
const cartKey = storageData.key<number[]>("cart-items", []);
cartKey.value = [1, 2, 3];
console.log(cartKey.value); // [1, 2, 3]

const profileKey = storageData.key<{ name: string } | null>("profile", null);
profileKey.value = { name: "John" };
console.log(profileKey.value); // { name: "John" }
```

Session helper example:

```ts
const draftKey = storageData.key<string>("draft", "", "session");
draftKey.value = "step-2";
console.log(draftKey.value); // "step-2"
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

#### `storageData.key(key, defaultValue, scope?)`

Creates a typed reactive accessor for a single key.

- `key: string` - storage key.
- `defaultValue: TValue` - value returned when key does not exist or cannot be parsed.
- `scope?: "local" | "session"` - storage scope (`"local"` by default).

Behavior:

- string defaults are stored as plain strings;
- non-string defaults are stored as JSON (`JSON.stringify`);
- on read, non-string defaults use safe JSON parse with fallback to `defaultValue`;
- assigning `null` or `undefined` removes key;
- for typed accessors, `myKey.value = null` clears the storage key;
- `myKey.reset()` clears the storage key the same way as `myKey.value = null`.

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
