import { StrictMode, Suspense } from 'react'
import ReactDOM from 'react-dom'
import {
  BrowserRouter as Router,
  useRoutes,
} from 'react-router-dom'

import './index.css'

import routes from '~react-pages'

// eslint-disable-next-line no-console
console.log(routes)

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      {useRoutes(routes)}
    </Suspense>
  )
}

ReactDOM.render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
  document.getElementById('root'),
)
