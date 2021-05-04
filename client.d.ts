declare module 'pages-generated' {
  // eslint-disable-next-line import/no-duplicates
  import { RouteRecordRaw } from 'vue-router'
  // eslint-disable-next-line import/no-duplicates
  import { RouteConfig } from 'react-router-config'
  const routes: RouteRecordRaw[] | RouteConfig[]
  export default routes
}

declare module 'virtual:generated-pages' {
  // eslint-disable-next-line import/no-duplicates
  import { RouteRecordRaw } from 'vue-router'
  // eslint-disable-next-line import/no-duplicates
  import { RouteConfig } from 'react-router-config'
  const routes: RouteRecordRaw[] | RouteConfig[]
  export default routes
}
