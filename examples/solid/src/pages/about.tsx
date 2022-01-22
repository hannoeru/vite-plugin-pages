import { Outlet } from 'solid-app-router'

export default function AboutLayout() {
  return <>
    <div>
    nested about view:
      <Outlet />
    </div>
  </>
}
