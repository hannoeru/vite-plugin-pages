import { resolveOptions } from '../src/options'

describe('options resolve', () => {
  it('vue', () => {
    const options = resolveOptions({
      dirs: 'examples/vue/src/pages',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  it('vue - custom module id', () => {
    const options = resolveOptions({
      dirs: 'examples/vue/src/pages',
      moduleId: '~vue-pages',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  it('react', () => {
    const options = resolveOptions({
      dirs: 'examples/react/src/pages',
      resolver: 'react',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  it('solid', () => {
    const options = resolveOptions({
      dirs: 'examples/solid/src/pages',
      resolver: 'solid',
    })
    expect(options).toMatchSnapshot({
      root: expect.any(String),
    })
  })

  it('applies defaults to page options without a base route', () => {
    const options = resolveOptions({
      dirs: [
        { dir: 'examples/react/src/pages', filePattern: '**/*.page.tsx' },
        { dir: 'examples/react/src/pages', baseRoute: '/admin/', filePattern: '**/*.view.tsx' },
      ],
      resolver: 'react',
    })

    expect(options.dirs).toHaveLength(2)
    expect(options.dirs[0]).toEqual({
      dir: 'examples/react/src/pages',
      baseRoute: '',
      filePattern: '**/*.page.tsx',
    })
    expect(options.dirs[1]).toEqual({
      dir: 'examples/react/src/pages',
      baseRoute: 'admin',
      filePattern: '**/*.view.tsx',
    })
  })
})
