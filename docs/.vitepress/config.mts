import { defineDocsVitepressConfig } from "sborshik/vitepress";
import { ConfigsManager } from "sborshik/utils/configs-manager";

const configs = ConfigsManager.create("../")

export default defineDocsVitepressConfig(configs, {
  appearance: 'dark',
  createdYear: '2025',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/introduction/getting-started' },
      { text: 'Changelog', link: `https://github.com/${configs.package.author}/${configs.package.name}/releases` },
      {
        text: `${configs.package.version}`,
        items: [
          {
            items: [
              {
                text: `${configs.package.version}`,
                link: `https://github.com/${configs.package.author}/${configs.package.name}/releases/tag/${configs.package.version}`,
              },
            ],
          },
        ],
      },
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
        ]
      }
    ],
  },
});
