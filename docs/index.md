---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: '@{packageJson.name}'
  text: '@{packageJson.description}'
  actions:
    - theme: brand
      text: Get Started
      link: /introduction/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/@{packageJson.author}/@{packageJson.name}

features:
  - title: MobX-based
    icon: <span class="i-logos:mobx"></span>
    details: Every browser API is a reactive MobX observable
  - title: TypeScript
    icon: <span class="i-logos:typescript-icon"></span>
    details: Out-of-box TypeScript support
  - title: Zero config
    icon: ⚡
    details: Just import and use, no providers or setup
  - title: SSR-safe
    icon: 🛡️
    details: Safe defaults in non-browser environments
  - title: Tree-shakeable
    icon: 🌳
    details: Only bundle the APIs you actually use
  - title: Many APIs
    icon: 📦
    details: Network, geolocation, media, battery, storage & more
---
