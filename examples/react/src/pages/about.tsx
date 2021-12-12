import React from 'react'
import { Outlet } from 'react-router-dom'

const Component: React.FC = () => {
  return (
    <div>
      <p>nested about view:</p>
      <Outlet />
    </div>
  )
}

export default Component
