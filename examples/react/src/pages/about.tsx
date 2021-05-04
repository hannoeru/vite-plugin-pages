import React from 'react'
import { renderRoutes, RouteConfigComponentProps } from 'react-router-config'

const component: React.FC<RouteConfigComponentProps> = ({ route }) => {
  return (
    <>
      <p>nested about view:</p>
      {renderRoutes(route?.routes)}
      {console.log(route)}
    </>
  )
}

export default component
