# vite-plugin-pages

[![npm version](https://badgen.net/npm/v/vite-plugin-pages)](https://www.npmjs.com/package/vite-plugin-pages)
[![monthly downloads](https://badgen.net/npm/dm/vite-plugin-pages)](https://www.npmjs.com/package/vite-plugin-pages)
[![types](https://badgen.net/npm/types/vite-plugin-pages)](https://github.com/hannoeru/vite-plugin-pages/blob/main/src/types.ts)
[![license](https://badgen.net/npm/license/vite-plugin-pages)](https://github.com/hannoeru/vite-plugin-pages/blob/main/LICENSE)

[![Open in Visual Studio Code](https://img.shields.io/static/v1?logo=visualstudiocode&label=&message=Open%20in%20Visual%20Studio%20Code&labelColor=2c2c32&color=007acc&logoColor=007acc)](https://open.vscode.dev/hannoeru/vite-plugin-pages)

> File system based routing for Vue 3 / React / Solid applications using
> [Vite](https://github.com/vitejs/vite)

Reads your pages directory and generates a list of routes that you pass to your
router.

| Framework | Router | Module id |
| --------- | ------ | --------- |
| Vue 3     | [vue-router](https://router.vuejs.org/) | `~pages` |
| React     | [react-router](https://reactrouter.com/) (v6+) | `~react-pages` |
| Solid     | [@solidjs/router](https://github.com/solidjs/solid-router) | `~solid-pages` |

> Vue users should consider [vue-router's built-in file-based routing](https://router.vuejs.org/guide/file-based-routing.html)
> instead. It provides similar features with deeper vue-router integration.

## Quick Start

Start with an existing Vue, React, or Solid Vite project. Install the plugin:

```bash
npm install -D vite-plugin-pages
```

Add it to your Vite configuration:

```ts
import Pages from 'vite-plugin-pages'

export default {
  plugins: [
    Pages(),
  ],
}
```

Create `src/pages/index.vue`, `src/pages/index.tsx`, or
`src/pages/index.jsx`. Then follow [Getting Started](./docs/getting-started.md)
to connect the generated routes to your framework router.

## Documentation

- [Getting Started](./docs/getting-started.md) — install and set up each framework
- [Configuration](./docs/config.md) — every plugin option
- [File System Routing](./docs/routing.md) — routes, nesting, and routing styles
- [Route Data](./docs/route-data.md) — `<route>` blocks and JSX comments
- [Custom Resolver](./docs/custom-resolver.md) — the `PageResolver` API

## Sitemap generation

To generate a sitemap from the generated routes, use
[vite-plugin-pages-sitemap](https://github.com/jbaubree/vite-plugin-pages-sitemap).

## License

MIT License © 2021-PRESENT [hannoeru](https://github.com/hannoeru)
