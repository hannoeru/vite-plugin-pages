import { useParams } from 'solid-app-router'

export default function Id() {
  const { id } = useParams<{id: string}>()
  return <>
    <div>
      <p>blog/[id].tsx: { id }</p>
      <p>
        {/* {{ $route }} */}
      </p>
    </div>
  </>
}
