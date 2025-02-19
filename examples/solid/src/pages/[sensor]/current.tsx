import { useParams } from '@solidjs/router'

export default function Current() {
  const { sensor } = useParams <{ sensor: string }>()
  return (
    <p>
      /
      {sensor}
      /current.tsx
    </p>
  )
}
