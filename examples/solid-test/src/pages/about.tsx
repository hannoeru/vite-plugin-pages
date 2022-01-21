import { Outlet } from 'solid-app-router'

export default function AboutLayout() {
  return <>
    <div>
    nested about view:
      <Outlet />
    </div>
  </>
}

/* TODO:
<route lang="yml">
meta:
lang: yml
</route>
*/
