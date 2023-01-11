import { defineComponent } from 'vue'

// eslint-disable-next-line no-undef
definePageRoute({
  meta: {
    title: 'CustomRouteBlock',
  },
})

export default defineComponent({
  name: 'CustomRouteBlock',
  render() {
    return (
      <div>CustomRouteBlock</div>
    )
  },
})
