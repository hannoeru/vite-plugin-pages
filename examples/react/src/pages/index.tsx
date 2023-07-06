import type { FC } from 'react'
import { Link, useNavigate } from '~react-pages-helpers'

const index: FC = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const navigate = useNavigate()

  return (
    <div>
      <p>index.vue</p>
      <Link path="/blog">
        blog
      </Link> |
      <Link path="/about">
        about
      </Link> |
      <Link path="/components">
        components
      </Link> |
      <Link path="/xxx">
        not exists
      </Link>
      <br />
      <br />
      <button onClick={() => navigate({ path: '/blog/:id', params: { id: '123' } })}>
        Go to blog detail: 123
      </button>
    </div>
  )
}

export default index
