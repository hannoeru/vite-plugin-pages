# Migrate to v1

vite-plugin-pages v1 updates the supported runtime and build formats. Complete
these changes before you upgrade from v0.33.

## Requirements

v1 requires:

- Node.js 22.12 or later
- Vite 6, 7, or 8
- An ESM project or an ESM-compatible configuration file

Upgrade Node.js and Vite before you install vite-plugin-pages v1.

## Replace CommonJS imports

v1 is ESM-only. It does not provide a CommonJS build or a `require` export.
For ESM configuration files, prefer static ESM imports:

```diff
-const Pages = require('vite-plugin-pages')
+import Pages from 'vite-plugin-pages'
```

If Vite loads your configuration as CommonJS, use an async configuration function
with a dynamic import. For example, use this `vite.config.js` in a project without
`"type": "module"` in `package.json`:

```js
import { defineConfig } from 'vite'

export default defineConfig(async () => {
  const { default: Pages } = await import('vite-plugin-pages')
  return {
    plugins: [
      Pages()
    ],
  }
})
```

This example uses Vite's default bundled configuration loader.
Vite waits for the async function before it uses the returned configuration.
The dynamic import loads the ESM-only plugin without `require`.

Do not import files from `vite-plugin-pages/dist`. The package output now uses
`.mjs` and `.d.mts` extensions. Import the package root and its documented
client type entry points instead.

## Update custom resolvers

The `hmr.changed` hook now reports whether a file change modified the generated
routes:

```ts
const resolver = {
  // ...
  hmr: {
    async changed(ctx, path) {
      const routesChanged = await refreshRouteData(ctx, path)
      return routesChanged
    },
  },
}
```

Return `true` when the generated route module must be invalidated and the page
must reload. Return `false` when the generated routes did not change. A missing
return value is handled as `false`.

The `added` and `removed` hooks do not need a return value.

## Review page directory options

`baseRoute` is now optional when a directory only needs a custom file pattern:

```ts
Pages({
  dirs: [
    { dir: 'src/pages', filePattern: '**/*.page.vue' },
  ],
})
```

An omitted `baseRoute` is equivalent to an empty string.

## Review exclude patterns

`exclude` and `filePattern` both match paths relative to each concrete page
directory. With `dirs: 'src/pages'`, use `exclude: ['drafts/**']` to exclude
`src/pages/drafts`. Each pattern applies independently to all page directories,
including directories outside the Vite project root.

Absolute exclude patterns now cause a configuration error. Replace them with
page-relative patterns. There is no project-root-relative fallback.

`exclude` does not filter the `dirs` glob. Restrict `dirs` itself when you need
to select fewer page directories. Default excludes still prune `node_modules`,
`.git`, and `__*__` subtrees inside each selected page directory, but not its
ancestors. If multiple directories include the same file, the last matching
directory sets its base route during both discovery and file changes.

## Review nested catch-all routes

Vue catch-all routes now use optional matching at every depth. For example,
`pages/docs/[...all].vue` matches both `/docs` and `/docs/intro`. An index route
at `/docs` takes precedence when it exists.

Only nested Vue catch-alls change from a string to an array for nonempty
matches. Root catch-alls such as `pages/[...all].vue` already returned arrays.
For `pages/docs/[...all].vue`, `route.params.all` changes as follows:

| URL | Before v1 | v1 |
| --- | --- | --- |
| `/docs/intro` | `'intro'` | `['intro']` |
| `/docs/guides/install` | `'guides/install'` | `['guides', 'install']` |

The generated nested pattern changes from `:all(.*)` to `:all(.*)*`.
The final `*` makes the parameter optional and repeatable.
Arrays follow [Vue Router's repeatable-parameter semantics](https://router.vuejs.org/guide/essentials/route-matching-syntax.html#Repeatable-params).
Optional matching alone does not require arrays. Vue Router also supports
`:all(.*)?`, an optional, non-repeatable parameter, but the generator does not
emit that pattern.

If your code calls string methods on `route.params.all`, join the segments
before you use those methods:

```diff
-const isGuide = route.params.all.startsWith('guides/')
+const all = route.params.all
+const path = Array.isArray(all) ? all.join('/') : (all ?? '')
+const isGuide = path.startsWith('guides/')
```

This expression also handles absent or empty optional parameters. Do not rely
on one exact empty value across supported Vue Router versions.

Normal dynamic segments such as `[id]` remain required. Use `extendRoute` or a
custom resolver if a catch-all must require at least one segment.

React and Solid catch-all routes already used optional wildcard matching, so
this change makes Vue consistent with those resolvers.

## Verify the upgrade

After the upgrade:

1. Start the Vite development server.
2. Create and delete a page file and confirm that the route list reloads.
3. If you use Vue route blocks, edit and remove a `<route>` block and confirm
   that its route data updates.
4. Run the production build and your application tests.
