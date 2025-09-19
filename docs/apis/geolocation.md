# Geolocation  

```ts
import { geolocation } from "mobx-web-api";
```  

Allows tracking geolocation   

::: info What's inside
Uses [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) under the hood
:::


## Usage  

```ts
import { reaction } from 'mobx';
import { geolocation } from 'mobx-web-api';

reaction(
  () => [
    geolocation.position.coords.latitude,
    geolocation.position.coords.longitude
  ],
  ([latitude, longitude]) => {
    console.log(`coords: ${latitude}, ${longitude}`);
  }
)
```
