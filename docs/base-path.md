# Base Path

Use a base path when the application is served below the domain root, such as
`https://example.com/app/`.

## Configure Vite

Set Vite's `base` option:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/app/',
})
```

Vite exposes this value as `import.meta.env.BASE_URL`. Configure the framework
router with the same value.

Generated route paths stay relative to the router. Do not add the deployment
base to `dirs.baseRoute`.

## Vue

Pass the base to `createWebHistory`:

```ts
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
```

## React

Pass the base to `BrowserRouter`:

```tsx
<BrowserRouter basename={import.meta.env.BASE_URL}>
  <App />
</BrowserRouter>
```

## Solid

Pass the base to `Router`:

```tsx
<Router base={import.meta.env.BASE_URL}>
  {routes}
</Router>
```

## Import Paths

The [`importPath`](./config.md#importpath) option controls import specifiers in
the generated module. It does not configure the Vite or router base. Keep its
default value unless Vite cannot resolve generated imports for the project
layout.
