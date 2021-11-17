import React from 'react'
import ReactDOM from 'react-dom'
import {
  useRoutes,
  BrowserRouter as Router,
} from 'react-router-dom'

import './index.css'

import routes from '~pages.tsx'

// eslint-disable-next-line no-console
console.log(routes)

function App() {
  return useRoutes(routes)
}

ReactDOM.render(
  <Router>
    <App />
  </Router>,
  document.getElementById('root'),
)

export {
  routes,
}
