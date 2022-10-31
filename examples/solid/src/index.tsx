import { render } from 'solid-js/web'
import { Router, useRoutes } from '@solidjs/router'
import routes from '~solid-pages'

render(
  () => {
    const Routes = useRoutes(routes)
    return (
      <Router>
        <Routes />
      </Router>
    )
  },
  document.getElementById('root') as HTMLElement,
)
