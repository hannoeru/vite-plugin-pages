import type { PrepareRoute as ReactPrepareRoute, Route as ReactRoute } from './react'
import type { PrepareRoutes as VuePrepareRoute, Route as VueRoute } from './vue'
import type { PrepareRoute as SolidPrepareRoute, Route as SolidRoute } from './solid'

export type Route = VueRoute | ReactRoute | SolidRoute
export type PrepareRoute = VuePrepareRoute | ReactPrepareRoute | SolidPrepareRoute
