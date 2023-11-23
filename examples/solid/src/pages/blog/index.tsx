import { Link } from '@solidjs/router'

export default function Index() {
  return (
    <div>
      blog/index.tsx
      <Link href="/blog/1b234bk12b3">
        id: 1b234bk12b3
      </Link>
      {' '}
      |
      <Link href="/blog/today">
        today
      </Link>
      {' '}
      |
      <Link href="/blog/today/xxx">
        child - not found
      </Link>
    </div>
  )
}
