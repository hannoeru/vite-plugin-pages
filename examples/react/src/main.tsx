import React from 'react'
import ReactDOM from 'react-dom'
import {
  BrowserRouter as Router,
} from 'react-router-dom'
import { renderRoutes } from 'react-router-config'
import './index.css'
import routes from 'virtual:generated-pages-react'

console.log(routes)

ReactDOM.render(
  <Router>
    {/* kick it all off with the root route */}
    {renderRoutes(routes)}
  </Router>,
  document.getElementById('root'),
)

export {
  routes,
}
