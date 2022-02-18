import { render } from 'solid-js/web'
import { Router, useRoutes } from 'solid-app-router'
import routes from '~solid-pages'

const Routes = useRoutes(routes)

render(
  () => (
    <Router>
      <Routes />
    </Router>
  ),
  document.getElementById('root') as HTMLElement,
)
