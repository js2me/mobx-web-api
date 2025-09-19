# Preferred Languages  

```ts
import { preferredLanguages } from "mobx-web-api";
```  

Allows tracking user's preferred languages   

::: info What's inside
Uses [Navigator.languages](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages) and [Window: languagechange event](https://developer.mozilla.org/en-US/docs/Web/API/Window/languagechange_event) under the hood
:::


## Usage  

```ts
import { preferredLanguages } from "mobx-web-api";
import { reaction } from "mobx";

console.log(preferredLanguages.current); // ru-RU
console.log(preferredLanguages.all); // ['ru-RU', 'en-US', 'ru', 'en']

reaction(
  () => preferredLanguages.current,
  (currentLanguage) => {
    console.log(
      `current language changed to ${currentLanguage}`
    );
  }
);
```


## Properties   

#### `current`   

Current language from user's system  

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Navigator/language)

#### `all`   

All languages from user's system  

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Navigator/languages)  


#### `acceptLanguageHeader` <Badge type="info" text="observable.ref" />   

Allows to set string value from `Accept-Language` header of request. It can be helpful for SSR

[MDN Reference](https://developer.mozilla.org/docs/Web/HTTP/Headers/Accept-Language)   

```ts
runInAction(() => {
  preferredLanguages.acceptLanguageHeader =
    request.headers['Accept-Language'];
})
```