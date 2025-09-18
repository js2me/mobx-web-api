import { defineConfig } from 'vitepress';

import path from 'path';
import fs from 'fs';

const { version, name: packageName, author, license } = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../package.json'),
    { encoding: 'utf-8' },
  ),
);

export default defineConfig({
  title: packageName.replace(/-/g, ' '),
  appearance: 'dark',
  description: `${packageName.replace(/-/g, ' ')} documentation`,
  transformHead: ({ pageData, head }) => {
    head.push(['meta', { property: 'og:site_name', content: packageName }]);
    head.push(['meta', { property: 'og:title', content: pageData.title }]);
    if (pageData.description) {
      head.push(['meta', { property: 'og:description', content: pageData.description }]);   
    }
    head.push(['meta', { property: 'og:image', content: `https://${author}.github.io/${packageName}/logo.png` }]);

    return head
  },
  base: `/${packageName}/`,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: `/${packageName}/logo.png` }],
  ],
  themeConfig: {
    logo: '/logo.png',
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/introduction/getting-started' },
      { text: 'Changelog', link: `https://github.com/${author}/${packageName}/releases` },
      {
        text: `${version}`,
        items: [
          {
            items: [
              {
                text: `${version}`,
                link: `https://github.com/${author}/${packageName}/releases/tag/${version}`,
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
          { text: 'Network status', link: '/apis/network-status' },
          { text: 'Page visibility', link: '/apis/page-visibility' },
          { text: 'Media query', link: '/apis/media-query' },
          { text: 'Screen orientation', link: '/apis/screen-orientation' },
          { text: 'Preferred languages', link: '/apis/preferred-languages' },
          { text: 'Geolocation', link: '/apis/geolocation' }, 
        ]
      }
    ],

    footer: {
      message: `Released under the ${license} License.`,
      copyright: `Copyright © 2025-PRESENT ${author}`,
    },

    socialLinks: [
      { icon: 'github', link: `https://github.com/${author}/${packageName}` },
    ],
  },
});
