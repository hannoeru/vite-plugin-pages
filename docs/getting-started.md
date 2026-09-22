# Getting Started

Start with an existing Vue, React, or Solid Vite project. The framework and its
Vite plugin must already be installed. Choose your framework and complete its
setup.

## Vue

Vue projects use `vue-router` and import generated routes from `~pages`.

### Install

```bash
npm install -D vite-plugin-pages
npm install vue-router
```

### Configure Vite

Add `Pages` to `vite.config.ts`:

```ts
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'

export default defineConfig({
  plugins: [
    Vue(),
    Pages(),
  ],
})
```

By default, the plugin reads `.vue`, `.ts`, and `.js` files in `src/pages`.

### Configure Vue Router

```ts
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import routes from '~pages'

import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createApp(App)
  .use(router)
  .mount('#app')
```

### Add Types

Add this reference to `vite-env.d.ts`:

```ts
/// <reference types="vite-plugin-pages/client" />
```

Create `src/pages/index.vue`. The plugin maps it to `/`.

## React

React projects use react-router v6 or later and import generated routes from
`~react-pages`. For react-router v5, use vite-plugin-pages v0.18.2.

The React integration is experimental.

### Install

```bash
npm install -D vite-plugin-pages
npm install react-router react-router-dom
```

### Configure Vite

Add `Pages` to `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'

export default defineConfig({
  plugins: [
    react(),
    Pages(),
  ],
})
```

By default, the plugin reads `.tsx`, `.jsx`, `.ts`, and `.js` files in
`src/pages`.

### Configure React Router

```tsx
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import routes from '~react-pages'

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      {useRoutes(routes)}
    </Suspense>
  )
}

const app = createRoot(document.getElementById('root')!)

app.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

### Add Types

Add this reference to `vite-env.d.ts`:

```ts
/// <reference types="vite-plugin-pages/client-react" />
```

Create `src/pages/index.tsx`. The plugin maps it to `/`.

## Solid

Solid projects use `@solidjs/router` and import generated routes from
`~solid-pages`. This setup supports solid-router v0.10.x and later.

### Install

```bash
npm install -D vite-plugin-pages
npm install @solidjs/router
```

### Configure Vite

Add `Pages` to `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [
    solid(),
    Pages(),
  ],
})
```

By default, the plugin reads `.tsx`, `.jsx`, `.ts`, and `.js` files in
`src/pages`.

### Configure Solid Router

```tsx
import { Router } from '@solidjs/router'
import { Suspense } from 'solid-js'
import { render } from 'solid-js/web'
import routes from '~solid-pages'

render(
  () => {
    return (
      <Router
        root={props => (
          <Suspense>
            {props.children}
          </Suspense>
        )}
      >
        {routes}
      </Router>
    )
  },
  document.getElementById('root') as HTMLElement,
)
```

### Add Types

Add this reference to `vite-env.d.ts`:

```ts
/// <reference types="vite-plugin-pages/client-solid" />
```

Create `src/pages/index.tsx`. The plugin maps it to `/`.

## Next Steps

- Learn how files map to routes in [File System Routing](./routing.md).
- Change page directories and other options in [Configuration](./config.md).
