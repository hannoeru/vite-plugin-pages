import { runInNewContext } from 'node:vm'
import { resolveOptions } from '../src/options'
import { stringifyRoutes } from '../src/stringify'

describe('stringify routes', () => {
  it.each(['props', 'beforeEnter'])('preserves source text in %s functions', (key) => {
    const callback = () => ({
      label: 'hello world',
      url: 'https://example.com',
      comment: '/* keep this */',
      escaped: '"quoted" \\path\nnext line',
      replacement: '$& $$ $` $\'',
    })
    const { stringRoutes } = stringifyRoutes([{ [key]: callback }], resolveOptions({}))
    const routes = runInNewContext(`(${stringRoutes})`)

    expect(routes[0][key]()).toEqual({
      label: 'hello world',
      url: 'https://example.com',
      comment: '/* keep this */',
      escaped: '"quoted" \\path\nnext line',
      replacement: '$& $$ $` $\'',
    })
  })

  it('preserves keyword spacing in regular functions', () => {
    const callback = function (route: { params: { id: string } }) {
      return route.params.id
    }
    const { stringRoutes } = stringifyRoutes([{ props: callback }], resolveOptions({}))
    const routes = runInNewContext(`(${stringRoutes})`)

    expect(routes[0].props({ params: { id: '42' } })).toBe('42')
  })
})
