import type { FC } from 'react'
import { Link } from 'react-router-dom'

const index: FC = () => {
  return (
    <div>
      <p>index.vue</p>
      <Link to="/blog">
        blog
      </Link>
      {' '}
      |
      <Link to="/about">
        about
      </Link>
      {' '}
      |
      <Link to="/components">
        components
      </Link>
      {' '}
      |
      <Link to="/xxx">
        not exists
      </Link>
    </div>
  )
}

export default index
