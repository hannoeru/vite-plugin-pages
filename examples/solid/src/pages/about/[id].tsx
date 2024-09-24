import type { ParentComponent } from 'solid-js'
import { useParams } from '@solidjs/router'

const IdLayout: ParentComponent = ({ children }) => {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <div>
        about/[id].tsx:
        {' '}
        { id }
      </div>
      <a href="/about/1b234bk12b3/more">
        more deep
      </a>
      {children}
    </div>
  )
}

export default IdLayout
