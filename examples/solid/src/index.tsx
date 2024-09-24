import { Router } from '@solidjs/router'
import routes from '~solid-pages'
import { render } from 'solid-js/web'

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
