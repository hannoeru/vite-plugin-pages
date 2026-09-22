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
Replace `require` calls with ESM imports:

```diff
-const Pages = require('vite-plugin-pages')
+import Pages from 'vite-plugin-pages'
```

If CommonJS code must load the plugin, use a dynamic import:

```js
const { default: Pages } = await import('vite-plugin-pages')
```

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

## Verify the upgrade

After the upgrade:

1. Start the Vite development server.
2. Create and delete a page file and confirm that the route list reloads.
3. If you use Vue route blocks, edit and remove a `<route>` block and confirm
   that its route data updates.
4. Run the production build and your application tests.
