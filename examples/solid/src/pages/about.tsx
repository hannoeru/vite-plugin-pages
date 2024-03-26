import type { ParentComponent } from 'solid-js'

const AboutLayout: ParentComponent = ({ children }) => {
  return (
    <div>
      nested about view:
      {children}
    </div>
  )
}

export default AboutLayout
