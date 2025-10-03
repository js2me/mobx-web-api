import path from 'path';
import fs from 'fs';

import { defineGhPagesDocConfig } from "sborshik/vitepress/define-gh-pages-doc-config";


const pckgJson = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../package.json'),
    { encoding: 'utf-8' },
  ),
);

export default defineGhPagesDocConfig(pckgJson, {
  appearance: 'dark',
  createdYear: '2025',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Introduction', link: '/introduction/getting-started' },
      { text: 'Changelog', link: `https://github.com/${pckgJson.author}/${pckgJson.name}/releases` },
      {
        text: `${pckgJson.version}`,
        items: [
          {
            items: [
              {
                text: `${pckgJson.version}`,
                link: `https://github.com/${pckgJson.author}/${pckgJson.name}/releases/tag/${pckgJson.version}`,
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
          { text: 'Screen info', link: '/apis/screen-info' },
          { text: 'Preferred languages', link: '/apis/preferred-languages' },
          { text: 'Geolocation', link: '/apis/geolocation' }, 
        ]
      }
    ],
  },
});
