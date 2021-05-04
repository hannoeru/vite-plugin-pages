import React from 'react'
import { matchRoutes, RouteConfigComponentProps } from 'react-router-config'
import routes from 'virtual:generated-pages'

const components: React.FC<RouteConfigComponentProps> = ({ location }) => {
  return (
    <>
      <p>blog/[id].vue: { matchRoutes<{ id: string }>(routes, location.pathname)[0].match.params.id }</p>
    </>
  )
}

export default components
