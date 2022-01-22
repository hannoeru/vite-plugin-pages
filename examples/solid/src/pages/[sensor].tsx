import { Outlet } from 'solid-app-router'

export default function SensorLayout() {
  return <>
    nested dynamic view:
    <Outlet />
  </>
}
