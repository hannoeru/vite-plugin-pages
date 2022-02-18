import React from 'react'
import { Link, Outlet } from 'react-router-dom'

const Blog: React.FC = () => {
  return (
    <div>
      <p>blog.tsx</p>
      <Link to="/blog/1b234bk12b3">
        id: 1b234bk12b3
      </Link> |
      <Link to="/blog/today">
        today
      </Link> |
      <Link to="/blog/today/xxx">
        not exists
      </Link>
      <Outlet />
    </div>
  )
}

export default Blog
