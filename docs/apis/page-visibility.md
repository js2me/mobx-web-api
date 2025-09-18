# Page Visibility  

```ts
import { pageVisibility } from "mobx-web-api";
``` 

Allows tracking window focus and blur

::: info What's inside
Uses [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) under the hood
:::


## Usage  

```ts
import { pageVisibility } from "mobx-web-api";
import { reaction } from "mobx";

console.log(pageVisibility.isVisible); // true
console.log(pageVisibility.isHidden); // false

reaction(
  () => pageVisibility.isVisible,
  (isVisible) => {
    console.log(
      isVisible ?
        "User is on page" :
        "User is out of page :("
    );
  }
);
```


## Properties   

#### `isVisible`   

Has `true` if document is visible and `false` if it is hidden   

#### `isHidden`   

Has `true` if document is hidden and `false` if it is visible    