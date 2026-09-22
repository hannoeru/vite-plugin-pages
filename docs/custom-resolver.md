# Custom Resolver

A resolver turns page files into route records and client code. The plugin ships
three resolvers: `vue`, `react`, and `solid`. You can also write your own.

## Built-in Resolvers

The package exports the built-in resolvers:

```ts
import {
  reactResolver,
  solidResolver,
  vueResolver,
} from 'vite-plugin-pages'
```

Each returns a `PageResolver` object.

## PageResolver Interface

```ts
interface PageResolver {
  resolveModuleIds: () => string[]
  resolveExtensions: () => string[]
  resolveRoutes: (ctx: PageContext) => Awaitable<string>
  getComputedRoutes: (ctx: PageContext) => Awaitable<VueRoute[] | ReactRoute[] | SolidRoute[]>
  stringify?: {
    dynamicImport?: (importPath: string) => string
    component?: (importName: string) => string
    final?: (code: string) => string
  }
  hmr?: {
    added?: (ctx: PageContext, path: string) => Awaitable<void>
    removed?: (ctx: PageContext, path: string) => Awaitable<void>
    changed?: (ctx: PageContext, path: string) => Awaitable<boolean>
  }
}
```

### resolveModuleIds

Returns the module ids the resolver registers. Users import routes with these
ids.

### resolveExtensions

Returns the valid file extensions for pages.

### resolveRoutes

Returns the generated client code as a string. This is the module that
`~pages` (or the equivalent) resolves to.

### getComputedRoutes

Returns the computed route records. The Vite plugin API
`getResolvedRoutes()` calls this method.

### stringify

Optional. Customizes how the plugin stringifies route records:

- `dynamicImport` — wraps a lazy import for async routes.
- `component` — wraps a component reference.
- `final` — wraps the final generated code.

### hmr

Optional. Hooks that run on HMR events:

- `added` — a page file was added.
- `removed` — a page file was removed.
- `changed` — a page file changed. Return `true` to reload.

## Using a Custom Resolver

Pass a `PageResolver` object to the `resolver` option. This complete example
starts with the Vue resolver and replaces its module ids:

```ts
// vite.config.ts
import type { PageResolver } from 'vite-plugin-pages'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Pages, { vueResolver } from 'vite-plugin-pages'

const baseResolver = vueResolver()
const customResolver: PageResolver = {
  ...baseResolver,
  resolveModuleIds: () => ['~custom-pages'],
}

export default defineConfig({
  plugins: [
    Vue(),
    Pages({
      resolver: customResolver,
    }),
  ],
})
```

## PageContext

The package exports `PageContext`. Resolver methods receive an instance. It
exposes:

- `rawOptions` — the raw user options.
- `root` — the Vite project root.
- `options` — the resolved options.
- `pageRouteMap` — a map of page file paths to `{ path, route }` entries.
- `resolveRoutes()` — resolves the current routes.
- `debug` — the debug namespaces.

## Programmatic API

The plugin exposes `getResolvedRoutes()` on the Vite plugin API. Use it to read
the current routes from another plugin:

```ts
function myPlugin() {
  return {
    name: 'my-plugin',
    async configResolved(config) {
      const pagesPlugin = config.plugins.find(p => p.name === 'vite-plugin-pages')
      const routes = await pagesPlugin.api.getResolvedRoutes()
      // routes: VueRoute[] | ReactRoute[] | SolidRoute[]
    },
  }
}
```

The returned routes match the type of the active resolver: `VueRoute[]`,
`ReactRoute[]`, or `SolidRoute[]`.

## Exported Types

The package exports these types:

- `VueRoute`
- `ReactRoute`
- `SolidRoute`
- `PageResolver`
- `PageOptions`
- `PageContext`
- `UserOptions`
- `ResolvedOptions`
- `ImportMode`
- `ImportModeResolver`
- `CustomBlock`

The package also exports `syncIndexResolver`, the default `importMode` resolver.
