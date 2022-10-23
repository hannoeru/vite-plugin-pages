import { Outlet } from '@solidjs/router'

export default function AboutLayout() {
  return (
    <div>
      nested about view:
      <Outlet />
    </div>
  )
}
