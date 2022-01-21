import { useParams } from 'solid-app-router'

export default function Current() {
  const { sensor } = useParams < {sensor: string}>()
  return <>
    <p>/{ sensor}/current.tsx</p>
  </>
}
