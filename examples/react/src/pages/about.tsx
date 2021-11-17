import React from 'react'
import { Outlet } from 'react-router'

const component: React.FC = () => {
  return (
    <div>
      <p>nested about view:</p>
      <Outlet />
    </div>
  )
}

export default component
