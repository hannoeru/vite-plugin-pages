import { useParams } from 'solid-app-router'

export default function Dynamic() {
  const { a, b } = useParams<{a: string; b: string}>()

  return (
    <section class="bg-gray-100 text-gray-700 p-8">
      <h1 class="text-2xl font-bold">Dynamic</h1>

      <div class="flex items-center space-x-2">
        <p class="mt-4">Dynamic values: {a}/{b}</p>
      </div>
    </section>
  )
}
