import type { FC } from 'react'
import { Outlet } from 'react-router-dom'

const Component: FC = () => {
  return (
    <div>
      <p>about layout route</p>
      <Outlet />
    </div>
  )
}

export default Component
