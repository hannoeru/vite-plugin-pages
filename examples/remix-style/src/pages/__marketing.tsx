import type { FC } from 'react'
import { Outlet } from 'react-router-dom'

const Component: FC = () => {
  return (
    <div>
      <p>pathless layout route</p>
      <Outlet />
    </div>
  )
}

export default Component
