import { defineConfig } from 'docusite';

export default defineConfig({
  packageJsonPath: '.',
  base: `/@{packageJson.name}/`,
  title: '@{packageJson.name}',
  description: '@{packageJson.description}',
  search: 'local',
  changelog: {
    src: './CHANGELOG.md',
  },
  github: 'https://github.com/@{packageJson.author}/@{packageJson.name}',
  colors: {
    light: ['#5d8eff', '#3e75f3', '#ea6e45'],
    dark: ['#77a0ff', '#4f76ff', '#fb681f'],
  },
  logos: {
    main: '/public/logo.png',
    banner: '/public/banner.png',
  },
  nav: [
    { text: 'Home', link: '/' },
    { text: 'Introduction', link: '/introduction/getting-started' },
  ],
  sidebar: [
    {
      text: 'Introduction 👋',
      link: '/introduction/getting-started',
      items: [
        { text: 'Getting started', link: '/introduction/getting-started' },
      ],
    },
    {
      text: 'APIs',
      items: [
        { text: 'Battery status', link: '/apis/battery-status' },
        { text: 'Color scheme', link: '/apis/color-scheme' },
        { text: 'Connection info', link: '/apis/connection-info' },
        { text: 'Network status', link: '/apis/network-status' },
        { text: 'Page visibility', link: '/apis/page-visibility' },
        { text: 'Media query', link: '/apis/media-query' },
        { text: 'Screen info', link: '/apis/screen-info' },
        { text: 'Scroll data', link: '/apis/scroll-data' },
        { text: 'Storage data', link: '/apis/storage-data' },
        { text: 'Viewport info', link: '/apis/viewport-info' },
        { text: 'Preferred languages', link: '/apis/preferred-languages' },
        { text: 'Geolocation', link: '/apis/geolocation' },
      ],
    },
  ],
});
