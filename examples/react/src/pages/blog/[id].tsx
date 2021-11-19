import React from 'react'
import { useParams } from 'react-router'

const components: React.FC = () => {
  const { id } = useParams()
  return (
    <>
      <p>blog/[id].tsx: { id }</p>
    </>
  )
}

export default components
