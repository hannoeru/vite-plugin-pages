import { defineComponent } from 'vue'

declare module '*.vue' {
  const Component: ReturnType<typeof defineComponent>
  export default Component
}
