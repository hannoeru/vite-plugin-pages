import { Link, useNavigate } from '~solid-pages-helpers'

export default function Index() {
  const navigate = useNavigate()

  return (
    <div>
      <p>index.tsx</p>
      <Link path="/blog/today/*" params={{ $slug: 'abc' }} replace>
        blog
      </Link> |
      <Link path="/about">
        about
      </Link> |
      <Link path="/components">
        components
      </Link> |
      <Link path="/xxx/xxx">
        not exits
      </Link> |
      <Link path="/features/dashboard">
        features:dashboard
      </Link> |
      <Link path="/features/admin">
        features:admin
      </Link> |
      <Link path="/admin">
        admin
      </Link>
      <br />
      <br />
      <button
        onClick={() => navigate({
          path: '/blog/:id',
          params: {
            id: 123,
          },
        }, {
          state: {
            abc: '234',
          },
        })}
      >
        Go to Blog 123
      </button>
    </div>
  )
}
