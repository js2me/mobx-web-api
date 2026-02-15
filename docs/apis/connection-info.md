# Connection Info

```ts
import { connectionInfo } from "mobx-web-api";
```

Allows tracking current network connection quality.

::: info What's inside
Uses [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation) under the hood.
:::

## Usage

```ts
import { connectionInfo } from "mobx-web-api";
import { reaction } from "mobx";

console.log(connectionInfo.effectiveType); // "4g" | "3g" | "2g" | "slow-2g" | "unknown"

reaction(
  () => connectionInfo.isSlow,
  (isSlow) => {
    if (isSlow) {
      console.log("Prefer lightweight requests");
    }
  }
);
```

## Properties

#### `effectiveType`

Current effective connection type.

#### `downlink`

Estimated bandwidth in megabits per second.

#### `rtt`

Estimated effective round-trip time in milliseconds.

#### `saveData`

Indicates whether user requested reduced data usage mode.

#### `isSlow`

`true` for `saveData` mode or very slow links (`slow-2g` / `2g`).

### Notes

- If API is not supported, `effectiveType` is `"unknown"`.
- `downlink` and `rtt` fallback to `0`, `saveData` fallback to `false`.
