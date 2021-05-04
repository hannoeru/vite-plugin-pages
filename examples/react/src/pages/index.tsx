import React from 'react'
import { Link } from 'react-router-dom'

const index: React.FC = () => {
  return (
    <div>
      <p>index.vue</p>
      <Link to="/blog">
        blog
      </Link> |
      <Link to="/about">
        about
      </Link> |
      <Link to="/components">
        components
      </Link> |
      <Link to="/markdown">
        markdown
      </Link> |
      <Link to="/xxx">
        not exits
      </Link>
    </div>
  )
}

export default index
