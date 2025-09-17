# Getting started  

The `mobx-web-api` source code is written on TypeScript and compiled into NodeNext target.   

## Requirements  

- [`MobX`](https://mobx.js.org) **^6**  

## Installation   

::: code-group

```bash [npm]
npm install {packageJson.name}
```

```bash [pnpm]
pnpm add {packageJson.name}
```

```bash [yarn]
yarn add {packageJson.name}
```

:::

## Usage   

```ts
import {
  geolocation,
  mediaQuery,
  networkStatus,
  pageVisibility
} from "mobx-web-api";
import { reaction } from "mobx";


pageVisibility.isVisible;


reaction(
  () => networkStatus.isOnline,
  (isOnline) => {
    console.log('isOnline', isOnline);
  }
)
```