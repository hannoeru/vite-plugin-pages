declare module '~solid-pages' {
  import type { RouteDefinition } from '@solidjs/router'

  export type RoutePaths = '/*' | '/:sensor' | '/about' | '/components' | '/' | '/:sensor/current' | '/about/:id' | '/blog/:id' | '/blog' | '/features/admin' | '/features/dashboard' | '/features/welcome' | '/admin' | '/about/:id/more' | '/about/:id/nested' | '/blog/today/*' | '/blog/today'

  const routes: RouteDefinition[]
  export default routes
}

declare module '~solid-pages-helpers' {
  import type { JSX } from 'solid-js'
  import type { LinkProps, NavigateOptions, NavigateProps } from '@solidjs/router'

  export type RoutePaths = '/*' | '/:sensor' | '/about' | '/components' | '/' | '/:sensor/current' | '/about/:id' | '/blog/:id' | '/blog' | '/features/admin' | '/features/dashboard' | '/features/welcome' | '/admin' | '/about/:id/more' | '/about/:id/nested' | '/blog/today/*' | '/blog/today'

  type Split<T extends string> = T extends `${infer P}/`
    ? Split<P>
    : T extends `/${infer P}`
      ? Split<P>
      : T extends `${infer PL}/${infer PR}`
        ? Split<PL> | Split<PR>
        : T

  type PathParamsKey<T extends string, K = Split<T>> = K extends `:${infer P}`
    ? P
    : K extends `...${infer P}`
      ? P
      : // eslint-disable-next-line @typescript-eslint/no-unused-vars
      K extends `${infer _P}*`
        ? '$slug'
        : never

  type PathParams<T extends string> = {
    [P in PathParamsKey<T>]: string | number;
  }

  export type GeneratePathOptions<
    T extends string,
    Params extends object = PathParams<T>,
  > = {
    path: T
  } & (keyof Params extends never ? { params?: Params } : { params: Params })

  export function generatePath<T extends string = RoutePaths>({
    path,
    params,
  }: GeneratePathOptions<T>): string

  // Declare hook useNavigate
  export function useNavigate(): <T extends string = RoutePaths, S = unknown>(
    pathOptions: GeneratePathOptions<T>,
    options?: Partial<NavigateOptions<S>>
  ) => void

  // Declare component Link
  export function Link<T extends string = RoutePaths>(
    props: GeneratePathOptions<T> &
    Omit<LinkProps, 'href'>
  ): JSX.Element

  // Declare component Navigate
  export function Navigate<T extends string = RoutePaths>(
    props: GeneratePathOptions<T> &
    Omit<NavigateProps, 'href'>
  ): null
}
