// eslint-disable-next-line import/no-extraneous-dependencies
import { defineManifest } from '@crxjs/vite-plugin';

import packageData from '../package.json';

const isDev = process.env.NODE_ENV === 'development';

export default defineManifest({
  manifest_version: 3,
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  version: packageData.version,
  description: packageData.description,
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icon16.png',
      32: 'icon32.png',
      48: 'icon48.png',
      128: 'icon128.png',
    },
    default_title: 'Turn The Page - Page Navigation',
  },
  icons: {
    16: 'icon16.png',
    32: 'icon32.png',
    48: 'icon48.png',
    128: 'icon128.png',
  },
  permissions: ['activeTab', 'storage', 'tabs'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      js: ['src/content/keyboard.ts'],
      matches: ['<all_urls>'],
      run_at: 'document_end',
    },
  ],
  options_page: 'src/options/index.html',
  web_accessible_resources: [
    {
      resources: ['assets/*', 'public/*'],
      matches: ['<all_urls>'],
    },
  ],
  commands: {
    'navigate-next': {
      suggested_key: {
        default: 'Alt+Right',
        mac: 'Alt+Right',
      },
      description: 'Go to next page',
    },
    'navigate-prev': {
      suggested_key: {
        default: 'Alt+Left',
        mac: 'Alt+Left',
      },
      description: 'Go to previous page',
    },
  },
});
