# Scroll Data  

```ts
import { createScrollData } from "mobx-web-api";
``` 

Allows tracking scroll data for any HTML element  

::: info What's inside
Uses [Element.scrollTop](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop), [Element.scrollLeft](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollLeft), [Window.scrollY](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY), [Window.scrollX](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX) and scroll/resize events under the hood 
:::


## Usage  

```ts
import { createScrollData } from "mobx-web-api";
import { reaction } from "mobx";

const scrollContainer = document.getElementById('container');
const scrollData = createScrollData(scrollContainer);

console.log(scrollData.scrollY); // 0
console.log(scrollData.scrollX); // 0
console.log(scrollData.scrollHeight); // 2000

reaction(
  () => scrollData.scrollY,
  (scrollY) => {
    console.log(`scrollY changed to ${scrollY}px`);
  }
);
```


## Parameters   

#### `element: HTMLElement | Ref<HTMLElement>`  

The HTML element to track scroll data for. Can be a direct reference to an HTMLElement or a Ref object.

#### `opts?: { scrollingElement?: Window | HTMLElement | Ref<HTMLElement | Window>, mapper?: ScrollDataMapperConfig }`  

Optional configuration object:

- **`scrollingElement`**: The element or window that triggers scroll events. Defaults to `window`. Can be a direct reference or a Ref object.
- **`mapper`**: An object with custom computed properties. Each key becomes a property on the returned scroll data object, and the value is a function that receives the internal scroll data and returns the computed value.


## Properties   

The returned object contains the following reactive properties:

#### `top: number`  

The scroll position from the top of the element (`element.scrollTop`).

#### `left: number`  

The scroll position from the left of the element (`element.scrollLeft`).

#### `width: number`  

The total scrollable width of the element (`element.scrollWidth`).

#### `height: number`  

The total scrollable height of the element (`element.scrollHeight`).

#### `scrollY: number`  

The vertical scroll position of the scrolling element. For `window`, this is `window.scrollY`. For other elements, this is `element.scrollTop`.

#### `scrollX: number`  

The horizontal scroll position of the scrolling element. For `window`, this is `window.scrollX`. For other elements, this is `element.scrollLeft`.

#### `scrollHeight: number`  

The total scrollable height of the scrolling element. For `window`, this is `window.innerHeight`. For other elements, this is `element.scrollHeight`.

#### `scrollWidth: number`  

The total scrollable width of the scrolling element. For `window`, this is `window.innerWidth`. For other elements, this is `element.scrollWidth`.


## Examples  

### Basic usage with window scrolling

```ts
import { createScrollData } from "mobx-web-api";
import { reaction } from "mobx";

const scrollData = createScrollData(document.body);

reaction(
  () => scrollData.scrollY,
  (scrollY) => {
    if (scrollY > 100) {
      console.log("Scrolled past 100px");
    }
  }
);
```

### Usage with custom scrolling element

```ts
import { createScrollData } from "mobx-web-api";
import { reaction } from "mobx";

const container = document.getElementById('scroll-container');
const scrollData = createScrollData(container, {
  scrollingElement: container
});

reaction(
  () => scrollData.scrollY,
  (scrollY) => {
    console.log(`Container scrolled: ${scrollY}px`);
  }
);
```

### Usage with mapper for computed properties

```ts
import { createScrollData } from "mobx-web-api";
import { reaction } from "mobx";

const scrollData = createScrollData(document.body, {
  mapper: {
    scrollProgress() {
      const { scrollY, scrollHeight } = this;
      return scrollHeight > 0 ? scrollY / scrollHeight : 0;
    },
    isNearBottom() {
      const { scrollY, scrollHeight, height } = this;
      return scrollY + height >= scrollHeight - 100;
    }
  }
});

reaction(
  () => scrollData.scrollProgress,
  (progress) => {
    console.log(`Scroll progress: ${(progress * 100).toFixed(2)}%`);
  }
);

reaction(
  () => scrollData.isNearBottom,
  (isNearBottom) => {
    if (isNearBottom) {
      console.log("Near bottom, load more content");
    }
  }
);
```

### Usage with Ref

```ts
import { createScrollData } from "mobx-web-api";
import { createRef } from "yummies/mobx";
import { reaction } from "mobx";

const elementRef = createRef<HTMLDivElement>();
const scrollData = createScrollData(elementRef);

// Later, when element is mounted
elementRef.current = document.getElementById('my-element');

reaction(
  () => scrollData.scrollY,
  (scrollY) => {
    console.log(`Scrolled: ${scrollY}px`);
  }
);
```
