import { Suspense, createEffect, createResource } from 'solid-js'
import { useData } from 'solid-app-router'
import type { RouteDataFunc } from 'solid-app-router'

export default function About() {
  const name = useData<() => string>()

  createEffect(() => {
    console.log(name())
  })

  return (
    <section class="bg-pink-100 text-gray-700 p-8">
      <h1 class="text-2xl font-bold">About</h1>

      <p class="mt-4">A page all about this website.</p>

      <p>
        <span>We love</span>
        <Suspense fallback={<span>...</span>}>
          <span>&nbsp;{name()}</span>
        </Suspense>
      </p>
    </section>
  )
}

function wait<T>(ms: number, data: T): Promise<T> {
  return new Promise(resolve => setTimeout(resolve, ms, data))
}

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function fetchName(): Promise<string> {
  return wait(random(500, 1000), 'Solid')
}

const AboutData: RouteDataFunc = () => {
  const [data] = createResource(fetchName)

  return data
}
