# Battery Status

```ts
import { batteryStatus } from "mobx-web-api";
```

Allows tracking battery level and charging state.

::: info What's inside
Uses [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API) under the hood.
:::

## Usage

```ts
import { batteryStatus } from "mobx-web-api";
import { reaction } from "mobx";

console.log(batteryStatus.levelPercent); // 0..100

reaction(
  () => batteryStatus.isLow,
  (isLow) => {
    if (isLow) {
      console.log("Battery is low, turn off background sync");
    }
  }
);
```

## Properties

#### `isSupported`

`true` when `navigator.getBattery` exists.

#### `level`

Battery level as a number from `0` to `1`.

#### `levelPercent`

Battery level as percent from `0` to `100`.

#### `charging`

`true` when device is currently charging.

#### `chargingTime`

Estimated seconds until fully charged.

#### `dischargingTime`

Estimated seconds until battery is empty.

#### `isLow`

`true` when battery is at or below 20% and not charging.

#### `error`

Last error happened while loading battery manager.

#### `retry()`

Retries reading battery manager and clears previous `error`.

### Notes

- Battery API is not supported in many browsers.
- When unsupported, object returns safe defaults and `isSupported === false`.
