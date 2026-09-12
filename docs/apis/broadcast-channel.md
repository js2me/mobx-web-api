# Broadcast Channel

```ts
import { createBroadcastChannel } from "mobx-web-api";
```

Creates a reactive wrapper around the [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) API.

## Usage

```ts
const channel = createBroadcastChannel<{ type: 'logout' }>('app');

reaction(
  () => channel.message,
  (message) => {
    if (message?.type === 'logout') {
      sessionStore.clear();
    }
  },
);

channel.postMessage({ type: 'logout' });
```

## Properties

### `name`

The channel name shared by all participating tabs and contexts.

### `isSupported`

`true` when `BroadcastChannel` is available in the current environment.

### `message`

The most recent message received by this channel, or `null`.

### `error`

The latest `messageerror` event, if one occurred.

## Methods

### `postMessage(message)`

Sends a structured-cloneable message to other contexts using the same channel name.
Returns `true` when the message is sent and `false` when the API is unavailable or sending fails. The reason is available in `error`.

### `close()`

Closes the underlying channel and removes its event listeners.
