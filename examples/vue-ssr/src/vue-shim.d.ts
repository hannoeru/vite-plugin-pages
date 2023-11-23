declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line ts/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
