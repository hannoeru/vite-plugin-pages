import { render } from 'solid-js/web'
import { Router } from '@solidjs/router'
import routes from '~solid-pages'

render(
  () => {
    return (
      <Router>
        {routes}
      </Router>
    )
  },
  document.getElementById('root') as HTMLElement,
)
