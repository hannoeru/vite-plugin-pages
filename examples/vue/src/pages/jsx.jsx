/*

      route

name: blog-id
meta:
  requiresAuth: false
  id: 1234
*/

import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TestJSX',
  setup() {
    // eslint-disable-next-line react/display-name
    return () => <div>TestJSX</div>
  },
})
