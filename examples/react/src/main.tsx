import routes from '~react-pages'
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import {
  BrowserRouter,
  useRoutes,
} from 'react-router-dom'

import './index.css'

// eslint-disable-next-line no-console
console.log(routes)

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      {useRoutes(routes)}
    </Suspense>
  )
}

const app = createRoot(document.getElementById('root')!)

app.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
