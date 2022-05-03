import { useParams } from 'react-router-dom'
import type { FC } from 'react'

const Component: FC = () => {
  const { id } = useParams()
  return (
    <p>blog/[id].tsx: { id }</p>
  )
}

export default Component
