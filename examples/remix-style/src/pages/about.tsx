import React from 'react'
import { Outlet } from 'react-router-dom'

const Component: React.FC = () => {
  return (
    <div>
      <p>about layout route</p>
      <Outlet />
    </div>
  )
}

export default Component
