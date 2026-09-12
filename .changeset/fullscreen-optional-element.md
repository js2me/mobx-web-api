---
'mobx-web-api': patch
---

Fullscreen API refinements:

- `request` and `toggle` element argument is now optional and defaults to `document.documentElement`
- `fullscreen.error` now only contains errors raised by the underlying Fullscreen API, predictable failures just resolve to `false`
