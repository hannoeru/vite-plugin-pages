import { Link } from '~solid-pages-helpers'

export default function Index() {
  return (
    <div>
      blog/index.tsx
      <br />
      <Link path="/blog/:id" params={{ id: '1b234bk12b3' }}>
        id: 1b234bk12b3
      </Link> |
      <Link path="/blog/today">
        today
      </Link> |
      <Link path="/blog/today/xxx">
        child - not found
      </Link>
    </div>
  )
}
