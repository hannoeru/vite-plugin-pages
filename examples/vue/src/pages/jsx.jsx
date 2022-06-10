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
    return () => <div>TestJSX</div>
  },
})
