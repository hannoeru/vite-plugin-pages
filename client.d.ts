declare module '~pages' {
  // eslint-disable-next-line import/no-duplicates
  import type { RouteRecordRaw } from 'vue-router'
  const routes: RouteRecordRaw[]
  export default routes
}

declare module 'pages-generated' {
  // eslint-disable-next-line import/no-duplicates
  import type { RouteRecordRaw } from 'vue-router'
  const routes: RouteRecordRaw[]
  export default routes
}

declare module 'virtual:generated-pages' {
  // eslint-disable-next-line import/no-duplicates
  import type { RouteRecordRaw } from 'vue-router'
  const routes: RouteRecordRaw[]
  export default routes
}
