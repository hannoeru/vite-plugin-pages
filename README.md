# vite-plugin-pages

[![npm version](https://badgen.net/npm/v/vite-plugin-pages)](https://www.npmjs.com/package/vite-plugin-pages)
[![monthly downloads](https://badgen.net/npm/dm/vite-plugin-pages)](https://www.npmjs.com/package/vite-plugin-pages)
[![types](https://badgen.net/npm/types/vite-plugin-pages)](https://github.com/hannoeru/vite-plugin-pages/blob/main/src/types.ts)
[![license](https://badgen.net/npm/license/vite-plugin-pages)](https://github.com/hannoeru/vite-plugin-pages/blob/main/LICENSE)

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/hannoeru/vite-plugin-pages)

> File system based routing for Vue 3 applications using
> [Vite](https://github.com/vitejs/vite)

## Getting Started

### Vue

Install:

```bash
$ npm install -D vite-plugin-pages
$ npm install vue-router@next
```

Add to your `vite.config.js`:

```js
import Vue from "@vitejs/plugin-vue";
import Pages from "vite-plugin-pages";

export default {
  plugins: [
    Vue(),
    Pages(),
  ],
};
```

### React(experimental)

Install:

```bash
$ npm install -D vite-plugin-pages
$ npm install react-router react-router-dom react-router-config
```

Add to your `vite.config.js`:

```js
import Vue from "@vitejs/plugin-vue";
import Pages from "vite-plugin-pages";

export default {
  plugins: [
    Vue(),
    Pages({
      react: true,
    }),
  ],
};
```

## Overview

By default a page is a Vue component exported from a `.vue` or `.js` file in the
`src/pages` directory.

You can access the generated routes by importing the `virtual:generated-pages`
module in your application.

### Vue

```js
import { createRouter } from "vue-router";
import routes from "virtual:generated-pages";

const router = createRouter({
  // ...
  routes,
});
```

**Type**

```ts
// vite-env.d.ts
/// <reference types="vite-plugin-pages/client" />
```

### React

```js
import { BrowserRouter } from "react-router-dom";
import { renderRoutes } from "react-router-config";
import routes from "virtual:generated-pages-react";

ReactDOM.render(
  <BrowserRouter>
    {renderRoutes(routes)}
  </BrowserRouter>,
  document.getElementById("root"),
);
```

**Type**

```ts
// vite-env.d.ts
/// <reference types="vite-plugin-pages/client-react" />
```

## Configuration

To use custom configuration, pass your options to Pages when instantiating the
plugin:

```js
// vite.config.js
import Pages from "vite-plugin-pages";

export default {
  plugins: [
    Pages({
      pagesDir: "src/views"
    }),
  ],
};
```

### pagesDir

- **Type:** `string | (string | PageDirOptions)[]`
- **Default:** `'src/pages'`

Relative path to the pages directory. Supports globs.

Can be:

- single path: routes point to `/`
- array of paths: all routes in the paths point to `/`
- array of `PageDirOptions`, Check below 👇

Specifying a glob or an array of `PageDirOptions` allow you to use multiple
pages folder, and specify the base route to append to the path and the route
name.

**Example:**

```bash
# folder structure
src/
  ├── features/
  │  └── dashboard/
  │     ├── code/
  │     ├── components/
  │     └── pages/
  ├── admin/
  │   ├── code/
  │   ├── components/
  │   └── pages/
  └── pages/
```

```js
// vite.config.js
export default {
  plugins: [
    Pages({
      pagesDir: [
        { dir: "src/pages", baseRoute: "" },
        { dir: "src/features/**/pages", baseRoute: "features" },
        { dir: "src/admin/pages", baseRoute: "admin" },
      ],
    }),
  ],
};
```

### extensions

- **Type:** `string[]`
- **Default:**
  - Vue: `['vue', 'ts', 'js']`
  - React: `['tsx', 'jsx']`

An array of valid file extensions for pages.

### exclude

- **Type:** `string[]`
- **Default:** `[]`

An array of glob patterns to exclude matches.

```bash
# folder structure
src/pages/
  ├── users/
  │  ├── components
  │  │  └── form.vue
  │  ├── [id].vue
  │  └── index.vue
  └── home.vue
```

```js
// vite.config.js
export default {
  plugins: [
    Pages({
      exclude: ["**/components/*.vue"],
    }),
  ],
};
```

### importMode

- **Type:** `'sync' | 'async' | (filepath: string) => 'sync' | 'async')`
- **Default:**
  - Top level index file: `'sync'`, can turn off by option `syncIndex`.
  - Others(Vue): `'async'`
  - Others(React): `'sync'`

Import mode can be set to either `async`, `sync`, or a function which returns
one of those values.

To get more fine-grained control over which routes are loaded sync/async, you
can use a function to resolve the value based on the route path. For example:

```js
// vite.config.js
export default {
  plugins: [
    Pages({
      importMode(path) {
        // Load about page synchronously, all other pages are async.
        return path.includes("about") ? "sync" : "async";
      },
    }),
  ],
};
```

### routeBlockLang

- **Type:** `string`
- **Default:** `'json5'`

Default SFC route block parser.

### replaceSquareBrackets(experimental)

- **Type:** `boolean`
- **Default:** `false`

Check: [#16](https://github.com/hannoeru/vite-plugin-pages/issues/16)

Replace '[]' to '_' in bundle filename

### nuxtStyle

- **Type:** `boolean`
- **Default:** `false`

Use Nuxt.js style dynamic routing

More details:
[File System Routing](https://nuxtjs.org/docs/2.x/features/file-system-routing)

### extendRoute

- **Type:**
  `(route: Route, parent: Route | undefined) => Route | void | Promise<Route | void>`

A function that takes a route and optionally returns a modified route. This is
useful for augmenting your routes with extra data (e.g. route metadata).

```js
// vite.config.js
export default {
  // ...
  plugins: [
    Pages({
      extendRoute(route, parent) {
        if (route.path === "/") {
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

### onRoutesGenerated

- **Type:** `(routes: Route[]) => Route[] | void | Promise<Route[] | void>`

A function that takes a generated routes and optionally returns a modified
generated routes.

### onClientGenerated

- **Type:** `(clientCode: string) => string | void | Promise<string | void>`

A function that takes a generated client code and optionally returns a modified
generated client code.

### SFC custom block for Route Data

Add route meta to the route by adding a `<route>` block to the SFC. This will be
directly added to the route after it is generated, and will override it.

You can specific a parser to use using `<route lang="yaml">`, or set a default
parser using `routeBlockLang` option.

- **Supported parser:** JSON, JSON5, YAML
- **Default:** JSON5

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

#### Syntax Highlighting `<route>`

To enable syntax highlighting `<route>` in VS Code using [Vetur's Custom Code Blocks](https://vuejs.github.io/vetur/highlighting.html#custom-block) add the following snippet to your preferences...

 1. update setting
 
 ```
 "vetur.grammar.customBlocks": {
    "route": "json"
  }
```
 
 2. Run the command in vscode
 
 `Vetur: Generate grammar from vetur.grammar.customBlocks`
 
 3. Restart VS Code to get syntax highlighting for custom blocks.


## File System Routing

Inspired by the routing from
[NuxtJS](https://nuxtjs.org/guides/features/file-system-routing) 💚

Pages automatically generates an array of routes for you to plug-in to your
instance of Vue Router. These routes are determined by the structure of the
files in your pages directory. Simply create `.vue` files in your pages
directory and routes will automatically be created for you, no additional
configuration required!

For more advanced use cases, you can tailor Pages to fit the needs of your app
through [configuration](#configuration).

- [Basic Routing](#basic-routing)
- [Index Routes](#index-routes)
- [Dynamic Routes](#dynamic-routes)
- [Nested Routes](#nested-routes)
- [Catch-all Routes](#catch-all-routes)

### Basic Routing

Pages will automatically map files from your pages directory to a route with the
same name:

- `src/pages/users.vue` -> `/users`
- `src/pages/users/profile.vue` -> `/users/profile`
- `src/pages/settings.vue` -> `/settings`

### Index Routes

Files with the name `index` are treated as the index page of a route:

- `src/pages/index.vue` -> `/`
- `src/pages/users/index.vue` -> `/users`

### Dynamic Routes

Dynamic routes are denoted using square brackets. Both directories and pages can
be dynamic:

- `src/pages/users/[id].vue` -> `/users/:id` (`/users/one`)
- `src/pages/[user]/settings.vue` -> `/:user/settings` (`/one/settings`)

Any dynamic parameters will be passed to the page as props. For example, given
the file `src/pages/users/[id].vue`, the route `/users/abc` will be passed the
following props:

```json
{ "id": "abc" }
```

### Nested Routes

We can make use of Vue Routers child routes to create nested layouts. The parent
component can be defined by giving it the same name as the directory that
contains your child routes.

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

The text after the ellipsis will be used both to name the route, and as the name
of the prop in which the route parameters are passed.

## License

MIT License © 2021 [hannoeru](https://github.com/hannoeru)
