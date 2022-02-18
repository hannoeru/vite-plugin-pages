import { Link } from 'solid-app-router'

export default function Index() {
  return <>
    <div>
      <p>index.tsx</p>
      <Link href="/blog">
      blog
      </Link> |
      <Link href="/about">
      about
      </Link> |
      <Link href="/components">
      components
      </Link> |
      <Link href="/xxx/xxx">
      not exits
      </Link> |
      <Link href="/features/dashboard">
      features:dashboard
      </Link> |
      <Link href="/features/admin">
      features:admin
      </Link> |
      <Link href="/admin">
      admin
      </Link>
    </div>
  </>
}
