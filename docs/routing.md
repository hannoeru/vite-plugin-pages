# File System Routing

The plugin generates routes from the structure of files in your pages
directory. Create a component file and a route appears. No extra configuration
is required.

This guide uses Vue file names. React and Solid use `.tsx`/`.jsx` and follow the
same file-to-path conventions. Framework-specific behavior is marked below.

## Framework Differences

| Behavior | Vue | React | Solid |
| -------- | --- | ----- | ----- |
| Default extensions | `.vue`, `.ts`, `.js` | `.tsx`, `.jsx`, `.ts`, `.js` | `.tsx`, `.jsx`, `.ts`, `.js` |
| Default module | `~pages` | `~react-pages` | `~solid-pages` |
| Generated route names | Yes | No | No |
| Dynamic parameters as component props | Yes | Use router APIs | Use router APIs |
| `<route>` blocks and route comments | Yes | No | No |
| Route record type | `VueRoute` | `ReactRoute` | `SolidRoute` |

See [Configuration](./config.md) to override extensions, module ids, and routing
behavior.

## Basic Routing

The plugin maps a file to a route with the same name:

- `src/pages/users.vue` → `/users`
- `src/pages/users/profile.vue` → `/users/profile`
- `src/pages/settings.vue` → `/settings`

## Index Routes

A file named `index` is the index page of a route:

- `src/pages/index.vue` → `/`
- `src/pages/users/index.vue` → `/users`

## Dynamic Routes

Dynamic routes use square brackets. Directories and pages can be dynamic:

- `src/pages/users/[id].vue` → `/users/:id` (`/users/one`)
- `src/pages/[user]/settings.vue` → `/:user/settings` (`/one/settings`)

The Vue resolver passes dynamic parameters to the page as props. The file
`src/pages/users/[id].vue` receives this prop for the route `/users/abc`:

```json
{ "id": "abc" }
```

## Nested Routes

Use child routes to create nested layouts. Give the parent component the same
name as the directory that holds the child routes.

This directory structure:

```
src/pages/
  ├── users/
  │  ├── [id].vue
  │  └── index.vue
  └── users.vue
```

produces this routes config:

```json5
[
  {
    "path": "/users",
    "component": "/src/pages/users.vue",
    "children": [
      {
        "path": "",
        "component": "/src/pages/users/index.vue",
        "name": "users"
      },
      {
        "path": ":id",
        "component": "/src/pages/users/[id].vue",
        "name": "users-id"
      }
    ]
  }
]
```

## Catch-all Routes

Catch-all routes use square brackets with an ellipsis:

- `src/pages/[...all].vue` → `/*` (`/non-existent-page`)

The text after the ellipsis names the route. It also names the prop that holds
the route parameters.

## Route Names

The Vue resolver generates a route name from the file path. It joins segments
with the `routeNameSeparator` option (default `-`). React and Solid routes do not
have generated names.

- `src/pages/users/profile.vue` → `users-profile`
- `src/pages/users/[id].vue` → `users-id`

A trailing `-index` is removed:

- `src/pages/users/index.vue` → `users`

## Routing Styles

The [`routeStyle`](./config.md#routestyle) option changes how filenames map to
route paths. The Next and Nuxt tables use `.vue`; React and Solid can use `.tsx`
or `.jsx` instead.

### `next` (default)

Use square brackets for dynamic and catch-all segments.

| File | Route path |
| ---- | ---------- |
| `index.vue` | `/` |
| `users/[id].vue` | `/users/:id` |
| `docs/[...all].vue` | `/docs/*` |
| `users/[id]/settings.vue` | `/users/:id/settings` |

### `nuxt`

Use a leading underscore for dynamic segments. Use `_` alone for a catch-all
segment.

| File | Route path |
| ---- | ---------- |
| `index.vue` | `/` |
| `users/_id.vue` | `/users/:id` |
| `docs/_.vue` | `/docs/*` |
| `users/_id/settings.vue` | `/users/:id/settings` |

### `remix`

The Remix style is available with the React and Solid resolvers. Use `$` for
dynamic segments, dots for path separators, and `__` for layout-only segments.
Put special characters in square brackets to escape them.

| File | Route path |
| ---- | ---------- |
| `index.tsx` | `/` |
| `blog.$id.tsx` | `/blog/:id` |
| `docs.$.tsx` | `/docs/*` |
| `blog.index.tsx` | `/blog` |
| `__marketing.product.tsx` | `/product` |
| `[$id].tsx` | `/$id` |

## Sitemap Generation

To generate a sitemap from the generated routes, use
[vite-plugin-pages-sitemap](https://github.com/jbaubree/vite-plugin-pages-sitemap).
It generates `sitemap.xml` and `robots.xml` files.
