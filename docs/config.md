# Configuration

Pass options to `Pages` when you create the plugin:

```js
// vite.config.js
import Pages from 'vite-plugin-pages'

export default {
  plugins: [
    Pages({
      dirs: 'src/views',
    }),
  ],
}
```

## Options

The option types come from [`UserOptions`](../src/types.ts). Tests compare the
documented defaults with `resolveOptions` so that the table stays aligned with
the runtime behavior.

| Option | Type | Default | Framework |
| ------ | ---- | ------- | --------- |
| [`dirs`](#dirs) | `string \| (string \| PageOptions)[]` | `'src/pages'` | All |
| [`extensions`](#extensions) | `string[]` | Resolver-specific | All |
| [`exclude`](#exclude) | `string[]` | `['node_modules', '.git', '**/__*__/**']` | All |
| [`importMode`](#importmode) | `'sync' \| 'async' \| function` | Sync root index; async others | All |
| [`importPath`](#importpath) | `'absolute' \| 'relative'` | `'relative'` | All |
| [`routeBlockLang`](#routeblocklang) | `'json5' \| 'json' \| 'yaml' \| 'yml'` | `'json5'` | Vue |
| [`routeStyle`](#routestyle) | `'next' \| 'nuxt' \| 'remix'` | `'next'` | Next/Nuxt: all; Remix: React/Solid |
| [`routeNameSeparator`](#routenameseparator) | `string` | `'-'` | Vue |
| [`caseSensitive`](#casesensitive) | `boolean` | `false` | All |
| [`resolver`](#resolver) | Built-in name or `PageResolver` | Auto-detected; Vue fallback | All |
| [`moduleId`](#moduleid) | `string` | Resolver-specific | All |
| [`extendRoute`](#extendroute) | `function` | `undefined` | All |
| [`onRoutesGenerated`](#onroutesgenerated) | `function` | `undefined` | All |
| [`onClientGenerated`](#onclientgenerated) | `function` | `undefined` | All |

### dirs

- **Type:** `string | (string | PageOptions)[]`
- **Default:** `'src/pages'`

Paths to the pages directories. Supports globs.

You can use a single path, an array of paths, or an array of `PageOptions`.

```ts
interface PageOptions {
  /**
   * Page base directory.
   * @default 'src/pages'
   */
  dir: string
  /**
   * Page base route.
   * @default ''
   */
  baseRoute?: string
  /**
   * Page file pattern.
   * @example `**\/*.page.vue`
   */
  filePattern?: string
}
```

A single path points all routes to `/`. An array of paths also points all routes
to `/`. An array of `PageOptions` lets you set a base route and file pattern per
directory.

#### Example

Folder structure:

```bash
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

Config:

```js
// vite.config.js
export default {
  plugins: [
    Pages({
      dirs: [
        // basic
        { dir: 'src/pages', baseRoute: '' },
        // features dir for pages
        { dir: 'src/features/**/pages', baseRoute: 'features' },
        // with custom file pattern
        { dir: 'src/admin/pages', baseRoute: 'admin', filePattern: '**/*.page.*' },
      ],
    }),
  ],
}
```

### extensions

- **Type:** `string[]`
- **Default:**
  - Vue: `['vue', 'ts', 'js']`
  - React: `['tsx', 'jsx', 'ts', 'js']`
  - Solid: `['tsx', 'jsx', 'ts', 'js']`

Valid file extensions for pages. When several extensions match one file, the
plugin uses the first one.

### exclude

- **Type:** `string[]`
- **Default:** `['node_modules', '.git', '**/__*__/**']`

Glob patterns to exclude from the page search.

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
      exclude: ['**/components/*.vue'],
    }),
  ],
}
```

### importMode

- **Type:** `'sync' | 'async' | (filepath: string, pluginOptions: ResolvedOptions) => 'sync' | 'async'`
- **Default:** top-level index file is `'sync'`; all others are `'async'`

Controls how the plugin imports page components.

- `'sync'` — imports the component directly.
- `'async'` — wraps the component in a lazy import.
- function — resolves the mode per file.

Use a function for fine-grained control:

```js
// vite.config.js
export default {
  plugins: [
    Pages({
      importMode(filepath, options) {
        // default resolver
        // for (const page of options.dirs) {
        //   if (page.baseRoute === '' && filepath.startsWith(`/${page.dir}/index`))
        //     return 'sync'
        // }
        // return 'async'

        // Load the about page synchronously. Load all other pages async.
        return filepath.includes('about') ? 'sync' : 'async'
      },
    }),
  ],
}
```

When you use `async` mode with react-router, wrap the route components in
`Suspense`:

```jsx
function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      {useRoutes(routes)}
    </Suspense>
  )
}
```

### importPath

- **Type:** `'absolute' | 'relative'`
- **Default:** `'relative'`

Import page components from absolute or relative paths.

Set this to `'absolute'` when your pages live in a directory such as `app/pages`
and you set `base: '/app/'` in `vite.config.js`:

```js
// vite.config.js
export default {
  base: '/app/',
  plugins: [
    Pages({
      dirs: 'app/pages',

      // It must be 'absolute' in this case.
      importPath: 'absolute',
    }),
  ],
}
```

See issue [#492](https://github.com/hannoeru/vite-plugin-pages/issues/492) for
details.

### routeBlockLang

- **Type:** `'json5' | 'json' | 'yaml' | 'yml'`
- **Default:** `'json5'`

Default parser for the Vue `<route>` block. See
[SFC `<route>` Block](./route-data.md#sfc-route-block).

### routeStyle

- **Type:** `'next' | 'nuxt' | 'remix'`
- **Default:** `'next'`

Routing style for dynamic routes. All resolvers support `next` and `nuxt`.
Only the React and Solid resolvers support `remix`.

- [Next.js Routing](https://nextjs.org/docs/routing/introduction)
- [Nuxt Routing](https://nuxtjs.org/docs/2.x/features/file-system-routing)
- [Remix Routing](https://remix.run/docs/en/v1/guides/routing)

See [Routing Styles](./routing.md#routing-styles) for the filename mappings.

### routeNameSeparator

- **Type:** `string`
- **Default:** `'-'`

Separator for generated Vue route names. This option does not affect React or
Solid routes. See [Route Names](./routing.md#route-names).

### caseSensitive

- **Type:** `boolean`
- **Default:** `false`

Preserve the original casing of route paths. When `false`, the plugin lowercases
path segments.

### resolver

- **Type:** `'vue' | 'react' | 'solid' | PageResolver`
- **Default:** `'vue'`

Route resolver. Supports `vue`, `react`, `solid`, or a custom `PageResolver`.

When you do not set this option, the plugin auto-detects the resolver. It uses
`react` when it finds `@vitejs/plugin-react` and `solid` when it finds
`vite-plugin-solid`.

See [Custom Resolver](./custom-resolver.md) for the `PageResolver` interface.

### moduleId

- **Type:** `string`
- **Default:**
  - Vue: `'~pages'`
  - React: `'~react-pages'`
  - Solid: `'~solid-pages'`

Module id for importing routes. Set this when you run several pages plugin
instances in one project. A custom value replaces all default aliases; it does
not add another alias.

When `moduleId` is not set, each resolver registers these aliases:

- Vue: `['~pages', 'pages-generated', 'virtual:generated-pages']`
- React: `['~react-pages', 'virtual:generated-pages-react']`
- Solid: `['~solid-pages']`

### extendRoute

- **Type:** `(route: any, parent: any | undefined) => any | void`

A function that receives a route and returns a modified route. Use it to add
data such as route metadata.

```js
// vite.config.js
export default {
  // ...
  plugins: [
    Pages({
      extendRoute(route, parent) {
        if (route.path === '/') {
          // The index route is unauthenticated.
          return route
        }

        // Mark the route as requiring authentication.
        return {
          ...route,
          meta: { auth: true },
        }
      },
    }),
  ],
}
```

### onRoutesGenerated

- **Type:** `(routes: any[]) => Awaitable<any[] | void>`

A function that receives the generated routes and returns modified routes. The
return value is optional.

### onClientGenerated

- **Type:** `(clientCode: string) => Awaitable<string | void>`

A function that receives the generated client code and returns modified code.
The return value is optional.

## Debugging

The plugin uses the [`debug`](https://github.com/debug-js/debug) package. Enable
logging with the `DEBUG` environment variable:

```bash
DEBUG=vite-plugin-pages:* vite
```

Available namespaces:

- `vite-plugin-pages:hmr`
- `vite-plugin-pages:routeBlock`
- `vite-plugin-pages:options`
- `vite-plugin-pages:pages`
- `vite-plugin-pages:search`
- `vite-plugin-pages:env`
- `vite-plugin-pages:cache`
- `vite-plugin-pages:resolver`
