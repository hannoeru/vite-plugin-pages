declare module '~pages' {
  import type { RouteRecordRaw } from 'vue-router'
  const routes: Readonly<RouteRecordRaw[]>
  export default routes
}

declare module 'pages-generated' {
  import type { RouteRecordRaw } from 'vue-router'
  const routes: Readonly<RouteRecordRaw[]>
  export default routes
}

declare module 'virtual:generated-pages' {
  import type { RouteRecordRaw } from 'vue-router'
  const routes: Readonly<RouteRecordRaw[]>
  export default routes
}
