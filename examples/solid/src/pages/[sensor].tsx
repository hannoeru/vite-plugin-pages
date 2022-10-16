import { Outlet } from '@solidjs/router'

export default function SensorLayout() {
  return (
    <>
      nested dynamic view:
      <Outlet />
    </>
  )
}
