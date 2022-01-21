import { createSignal } from 'solid-js'

export default function Nested() {
  const [count, setCount] = createSignal(0)

  return (
    <section class="bg-gray-100 text-gray-700 p-8">
      <h1 class="text-2xl font-bold">Nested</h1>
      <p class="mt-4">This is a nested page.</p>

      <div class="flex items-center space-x-2">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={() => setCount(count() - 1)}
        >
          -
        </button>

        <output class="p-10px">Count: {count}</output>

        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={() => setCount(count() + 1)}
        >
          +
        </button>
      </div>
    </section>
  )
}
