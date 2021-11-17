import React from 'react'
import { useParams } from 'react-router'

const components: React.FC = () => {
  const { id } = useParams<'id'>()
  return (
    <>
      <p>blog/[id].vue: { id }</p>
    </>
  )
}

export default components
