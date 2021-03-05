# vite-plugin-pages


[![npm version](https://badgen.net/npm/v/vite-plugin-pages)](https://www.npmjs.com/package/vite-plugin-pages)
[![monthly downloads](https://badgen.net/npm/dm/vite-plugin-pages)](https://www.npmjs.com/package/vite-plugin-pages)
[![types](https://badgen.net/npm/types/vite-plugin-pages)](https://github.com/hannoeru/vite-plugin-pages/blob/main/src/types.ts)
[![license](https://badgen.net/npm/license/vite-plugin-pages)](https://github.com/hannoeru/vite-plugin-pages/blob/main/LICENSE)

> File system based routing for Vue 3 applications using [Vite](https://github.com/vitejs/vite)

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

You can access the generated routes by importing the `pages-generated` module in your application.

```js
import { createRouter } from 'vue-router';
import routes from 'pages-generated';

const router = createRouter({
  // ...
  routes,
});
```

## Client Types
If you want type definition of `pages-generated`, add `vite-plugin-pages/client` to `compilerOptions.types` of your `tsconfig`:
```json
{
  "compilerOptions": {
    "types": ["vite-plugin-pages/client"]
  }
}
```

## Configuration

```ts
interface UserOptions {
  pagesDir?: string | string[] | PageDirOptions[]
  extensions?: string[]
  exclude: string[]
  importMode?: ImportMode | ImportModeResolveFn
  syncIndex?: boolean
  routeBlockLang: 'json5' | 'json' | 'yaml'
  extendRoute?: (route: Route, parent: Route | undefined) => Route | void
}
```

### pagesDir

Relative path to the pages directory. Supports globs.

Can be:
- single path: routes point to `/`
- array of paths: all routes in the paths point to `/`
- array of `PageDirOptions` allowing you to specify base routes instead of `/`.  See [Feature Areas](#feature-areas) for more details

**Default:** `'src/pages'`

### extensions

Array of valid file extensions for pages.

**Default:** `['vue', 'js']`

### importMode

Import mode can be set to either `async`, `sync`, or a function which returns one of those values.

**Default:**
- Top level index file: `'sync'`, can turn off by option `syncIndex`.
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

### routeBlockLang

Default SFC route block parser.

**Default:** `'json5'`

### replaceSquareBrackets

***experimental**

Check: [#16](https://github.com/hannoeru/vite-plugin-pages/issues/16)

Replace '[]' to '_' in bundle filename

**Default:** `false`

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

To use custom configuration, pass your options to Pages when instantiating the plugin:

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

### SFC custom block for Route Data

Add per-route information to the route by adding a `<route>` block to the SFC.  Information here is directly added to the route after it is generated, and will override it.

You can specific a parser to use using `<route lang="yaml">`.

**Supported parser:** JSON, JSON5, YAML

**Default:** JSON5

JSON/JSON5:

```html
<route>
{
  name: "name-override",
  meta: {
    requiresAuth: false
  }
}
</route>
```
YAML:
```html
<route>
name: name-override
meta:
  requiresAuth: true
</route>
```

### Feature Routes

Specifying an array of `PageDirOptions`  for `pagesDir` allow you to store pages anywhere in the source you'd like, and specify the base route to append to the path and the route name.  This allows you to store your pages in feature areas.

Source structure:
```
src/features/
    -admin/
       -pages
       -components
       -code
```
In vite.config.js:
```js
pagesDir: [
  { dir: 'src/pages', baseRoute: '' },
  { dir: 'src/features/admin/pages', baseRoute: 'admin' },
],
```

**See more details: [vite-plugin-voie](https://github.com/brattonross/vite-plugin-voie)**

## License

MIT License © 2021 [Hannoeru](https://github.com/hannoeru)
