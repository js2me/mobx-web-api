# Screen Info  

```ts
import { screenInfo } from "mobx-web-api";
``` 

Allows tracking device screen  

::: info What's inside
Uses [Screen API](https://developer.mozilla.org/en-US/docs/Web/API/Screen) under the hood 
:::


## Usage  

```ts
import { screenInfo } from "mobx-web-api";
import { reaction } from "mobx";

console.log(screenInfo.availWidth); // 2560

reaction(
  () => screen.orientation.type,
  (orientationType) => {
    console.log(`orientationType: ${orientationType}`);
  }
);
```


## Properties   

[See documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen)   