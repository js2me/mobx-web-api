# Network status  

```ts
import { networkStatus } from "mobx-web-api";
```

Allows tracking network status  

::: info What's inside
Uses [Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine), [Window: online event](https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event) and [Window: offline event](https://developer.mozilla.org/en-US/docs/Web/API/Window/offline_event) under the hood
:::


## Usage  

```ts
import { networkStatus } from "mobx-web-api";
import { reaction } from "mobx";

console.log(networkStatus.isOnline); // true
console.log(networkStatus.isOffline); // false

reaction(
  () => networkStatus.isOnline,
  (isOnline) => {
    console.log(
      isOnline ?
        "You are Online" :
        "You are Offline :("
    );
  }
);
```


## Properties   

#### `isOnline`   

Has `true` if the network is online, `false` otherwise.   

#### `isOffline`   

Has `true` if the network is offline, `false` otherwise.    