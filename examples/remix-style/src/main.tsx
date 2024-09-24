import routes from '~react-pages'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {
  BrowserRouter as Router,
  useRoutes,
} from 'react-router-dom'

import './index.css'

// eslint-disable-next-line no-console
console.log(routes)

function App() {
  return useRoutes(routes)
}

const app = createRoot(document.getElementById('root')!)

app.render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
