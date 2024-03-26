import type { ParentComponent } from 'solid-js'

const SensorLayout: ParentComponent = ({ children }) => {
  return (
    <>
      nested dynamic view:
      {children}
    </>
  )
}

export default SensorLayout
