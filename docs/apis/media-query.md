# Media Query  

```ts
import { mediaQuery } from "mobx-web-api";
``` 

Allows tracking any media query matching state and watch for document sizes    

::: info What's inside
Uses [Window.matchMedia](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) and [Window: resize event](https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event) under the hood 
:::


## Usage  

```ts
import { mediaQuery } from "mobx-web-api";
import { reaction } from "mobx";

console.log(mediaQuery.sizes.inner.width); // 1920
console.log(mediaQuery.sizes.outer.width); // 1920
console.log(mediaQuery.sizes.client.width); // 1905
console.log(mediaQuery.sizes.offset.width); // 1905

reaction(
  () => mediaQuery.sizes.inner.width,
  (innerWidth) => {
    console.log(`window.innerWidth changed to ${innerWidth}px`);
  }
);
```


## Properties   

#### `sizes`  

Object which contains all posible document sizes.   
It reactive works with `resize` event on window.  

::: info Uses [Window: resize event](https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event) if this property has observers
:::

```ts
reaction(
  () => mediaQuery.sizes.client.width,
  (clientWidth) => {
    console.log(`clientWidth changed to ${clientWidth}px`);
  }
);
```

#### `track(query: string)`   

Tracks media query matching state   

[MDN Reference](https://developer.mozilla.org/ru/docs/Web/API/Window/matchMedia)   

::: info Uses [Window.matchMedia](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) if this property has observers
:::


```ts
const smallScreens = mediaQuery.track('(max-width: 600px)');

console.log(smallScreens.matches); // false

reaction(
  () => smallScreens.matches,
  (matches) => {
    console.log(
      matches ?
        "You are on a small screen" :
        "You are on a big screen :)"
    );
  }
)
```

#### `match(query: string)`  

This is short form of the [`mediaQuery.track(query).matches`](#track-query-string)  

[MDN Reference](https://developer.mozilla.org/ru/docs/Web/API/Window/matchMedia)   

Example:  
```ts
mediaQuery.match('(max-width: 767px)')
```


### Notes   

You can create your own api using this object.  

```ts
import { mediaQuery } from "mobx-web-api";

// referenced to https://gist.github.com/gokulkrishh/242e68d1ee94ad05f488
export const mediaQueries = {
  ...mediaQuery,
  get mobiles() {
    return mediaQuery.
      match('(max-width: 767px)');
  },
  get tablets() {
    return mediaQuery.
      match('(min-width: 768px) and (max-width: 1024px)');
  },
  get desktops(){
    return mediaQuery.
      match('(min-width: 1025px)');
  },
  get largeDesktops() {
    return mediaQuery.
      match('(min-width: 1280px)');
  }
}

...
if (mediaQueries.mobiles) {
  //
}
```




