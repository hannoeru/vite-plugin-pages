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

Add route meta to the route by adding a `<route>` block to the SFC. This will directly added to the route after it is generated, and will override it.

You can specific a parser to use using `<route lang="yaml">`, or set a default parser using `routeBlockLang` option.

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
<route lang="yaml">
name: name-override
meta:
  requiresAuth: true
</route>
```

### Multiple Pages Folder

Specifying an array of `pagesDir` allow you to use multiple pages folder, and specify the base route to append to the path and the route name.

**Example:**

folder structure:
```bash
src/
  ├── features/
  │  └── admin/
  │     ├── code/
  │     ├── components/
  │     └── pages/
  └── pages/
```
vite.config.js:
```js
// pages options
pagesDir: [
  { dir: 'src/pages', baseRoute: '' },
  { dir: 'src/features/admin/pages', baseRoute: 'admin' },
],
```

## File System Routing

Inspired by the routing from [NuxtJS](https://nuxtjs.org/guides/features/file-system-routing) 💚

Pages automatically generates an array of routes for you to plug-in to your instance of Vue Router. These routes are determined by the structure of the files in your pages directory. Simply create `.vue` files in your pages directory and routes will automatically be created for you, no additional configuration required!

For more advanced use cases, you can tailor Pages to fit the needs of your app through [configuration](https://github.com/brattonross/vite-plugin-pages#configuration).

- [Basic Routing](https://github.com/brattonross/vite-plugin-pages#basic-routing)
- [Index Routes](https://github.com/brattonross/vite-plugin-pages#index-routes)
- [Dynamic Routes](https://github.com/brattonross/vite-plugin-pages#dynamic-routes)
- [Nested Routes](https://github.com/brattonross/vite-plugin-pages#nested-routes)
- [Catch-all Routes](https://github.com/brattonross/vite-plugin-pages#catch-all-routes)

### Basic Routing

Pages will automatically map files from your pages directory to a route with the same name:

- `src/pages/users.vue` -> `/users`
- `src/pages/users/profile.vue` -> `/users/profile`
- `src/pages/settings.vue` -> `/settings`

### Index Routes

Files with the name `index` are treated as the index page of a route:

- `src/pages/index.vue` -> `/`
- `src/pages/users/index.vue` -> `/users`

### Dynamic Routes

Dynamic routes are denoted using square brackets. Both directories and pages can be dynamic:

- `src/pages/users/[id].vue` -> `/users/:id` (`/users/one`)
- `src/[user]/settings.vue` -> `/:user/settings` (`/one/settings`)

Any dynamic parameters will be passed to the page as props. For example, given the file `src/pages/users/[id].vue`, the route `/users/abc` will be passed the following props:

```json
{ "id": "abc" }
```

### Nested Routes

We can make use of Vue Routers child routes to create nested layouts. The parent component can be defined by giving it the same name as the directory that contains your child routes.

For example, this directory structure:

```
src/pages/
  ├── users/
  │  ├── [id].vue
  │  └── index.vue
  └── users.vue
```

will result in this routes configuration:

```json5
[
  {
    path: '/users',
    component: '/src/pages/users.vue',
    children: [
      {
        path: '',
        component: '/src/pages/users/index.vue',
        name: 'users'
      },
      {
        path: ':id',
        component: '/src/pages/users/[id].vue',
        name: 'users-id'
      }
    ]
  }
]
```

### Catch-all Routes

Catch-all routes are denoted with square brackets containing an ellipsis:

- `src/pages/[...all].vue` -> `/*` (`/non-existent-page`)

The text after the ellipsis will be used both to name the route, and as the name of the prop in which the route parameters are passed.

## License

MIT License © 2021 [hannoeru](https://github.com/hannoeru)
