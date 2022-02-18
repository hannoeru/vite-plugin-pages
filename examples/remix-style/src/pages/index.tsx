import React from 'react'
import { Link } from 'react-router-dom'

const index: React.FC = () => {
  return (
    <div>
      <p>index.tsx</p>
      <Link to="/blog">
        blog
      </Link> |
      <Link to="/blog/authors">
        blog authors
      </Link> |
      <Link to="/about">
        about
      </Link> |
      <Link to="/product">
        product
      </Link> |
      <Link to="/sitemap.xml">
        sitemap.xml
      </Link> |
      <Link to="/xxx">
        not exists
      </Link>
    </div>
  )
}

export default index
