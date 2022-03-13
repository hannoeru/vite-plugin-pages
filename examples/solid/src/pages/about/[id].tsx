import { Link, Outlet, useParams } from 'solid-app-router'

export default function IdLayout() {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <div>
        about/[id].tsx: { id }
      </div>
      <Link href="/about/1b234bk12b3/more">
        more deep
      </Link>
      <Outlet />
    </div>
  )
}
