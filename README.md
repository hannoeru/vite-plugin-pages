# vite-plugin-pages


![npm version](https://img.shields.io/npm/v/vite-plugin-pages)

> File system based routing for Vue 3 applications using [Vite](https://github.com/vitejs/vite)

### ℹ️ **This plugin is a refactor version base on [vite-plugin-voie](https://github.com/brattonross/vite-plugin-voie)**

## Getting Started

Install Pages:

```bash
$ npm install -D vite-plugin-pages
```

Add to your `vite.config.js`:

```js
import Vue from '@vitejs/plugin-vue';
import Pages from 'vite-plugin-pages';

export default {
  plugins: [Vue(), Pages()],
};
```

## Overview

By default a page is a Vue component exported from a `.vue` or `.js` file in the `src/pages` directory.

You can access the generated routes by importing the `vite-plugin-pages/client` module in your application.

```js
import { createRouter } from 'vue-router';
import routes from 'vite-plugin-pages/client';

const router = createRouter({
  // ...
  routes,
});
```

## Configuration

```ts
interface UserOptions {
  pagesDir?: string
  extensions?: string[]
  exclude: string[]
  importMode?: ImportMode | ImportModeResolveFn
  syncIndex?: boolean
  extendRoute?: (route: Route, parent: Route | undefined) => Route | void
}
```

### pagesDir

Relative path to the pages directory. Supports globs.

**Default:** `'src/pages'`

### extensions

Array of valid file extensions for pages.

**Default:** `['vue', 'js']`

### importMode

Import mode can be set to either `async`, `sync`, or a function which returns one of those values.

**Default:** 
- Top level index file: `'sync'`
- Others: `'async'`

To get more fine-grained control over which routes are loaded sync/async, you can use a function to resolve the value based on the route path. For example:

```js
// vite.config.js
export default {
  // ...
  plugins: [
    Pages({
      importMode(path) {
        // Load about page synchronously, all other pages are async.
        return path.includes('about') ? 'sync' : 'async';
      },
    }),
  ],
};
```

### extendRoute

A function that takes a route and optionally returns a modified route. This is useful for augmenting your routes with extra data (e.g. route metadata).

```js
// vite.config.js
export default {
  // ...
  plugins: [
    Pages({
      extendRoute(route, parent) {
        if (route.path === '/') {
          // Index is unauthenticated.
          return route;
        }

        // Augment the route with meta that indicates that the route requires authentication.
        return {
          ...route,
          meta: { auth: true },
        };
      },
    }),
  ],
};
```

### Using configuration

To use custom configuration, pass your options to Voie when instantiating the plugin:

```js
// vite.config.js
import Pages from 'vite-plugin-pages';

export default {
  plugins: [
    Pages({
      pagesDir: 'src/views',
      extensions: ['vue', 'ts'],
    }),
  ],
};
```

### **See more details: [vite-plugin-voie](https://github.com/brattonross/vite-plugin-voie)**