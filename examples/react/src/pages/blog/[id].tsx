import React from 'react'
import { useParams } from 'react-router-dom'

const Component: React.FC = () => {
  const { id } = useParams()
  return (
    <p>blog/[id].tsx: { id }</p>
  )
}

export default Component
