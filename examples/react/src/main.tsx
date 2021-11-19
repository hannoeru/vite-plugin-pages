import React from 'react'
import ReactDOM from 'react-dom'
import {
  useRoutes,
  BrowserRouter as Router,
} from 'react-router-dom'

import './index.css'

import routes from '~react-pages'

// eslint-disable-next-line no-console
console.log(routes)

function App() {
  return useRoutes(routes)
}

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
  document.getElementById('root'),
)
