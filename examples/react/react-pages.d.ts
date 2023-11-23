declare module '~react-pages' {
  import type { RouteObject } from 'react-router'

  export type RoutePaths = '/*' | '/about' | '/components' | '/' | '/blog/*' | '/blog/:id' | '/blog' | '/blog/today/*' | '/blog/today'

  const routes: RouteObject[]
  export default routes
}

declare module '~react-pages-helpers' {
  import type { NavigateOptions, NavigateProps } from 'react-router'
  import type { LinkProps } from 'react-router-dom'

  export type RoutePaths = '/*' | '/about' | '/components' | '/' | '/blog/*' | '/blog/:id' | '/blog' | '/blog/today/*' | '/blog/today'

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
  export function useNavigate(): <T extends string = RoutePaths>(
    pathOptions: GeneratePathOptions<T>,
    options?: NavigateOptions
  ) => void

  // Declare component Navigate
  export function Link<T extends string = RoutePaths>(
    props: GeneratePathOptions<T> &
    Omit<LinkProps, 'to'>
  ): JSX.Element

  // Declare component Navigate
  export function Navigate<T extends string = RoutePaths>(
    props: GeneratePathOptions<T> &
    Omit<NavigateProps, 'to'>
  ): null
}

// ---------------------------------

declare module 'virtual:generated-pages-react' {
  import type { RouteObject } from 'react-router'

  export type RoutePaths = '/*' | '/about' | '/components' | '/' | '/blog/*' | '/blog/:id' | '/blog' | '/blog/today/*' | '/blog/today'

  const routes: RouteObject[]
  export default routes
}

declare module 'virtual:generated-pages-react-helpers' {
  import type { NavigateOptions, NavigateProps } from 'react-router'
  import type { LinkProps } from 'react-router-dom'

  export type RoutePaths = '/*' | '/about' | '/components' | '/' | '/blog/*' | '/blog/:id' | '/blog' | '/blog/today/*' | '/blog/today'

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
  export function useNavigate(): <T extends string = RoutePaths>(
    pathOptions: GeneratePathOptions<T>,
    options?: NavigateOptions
  ) => void

  // Declare component Navigate
  export function Link<T extends string = RoutePaths>(
    props: GeneratePathOptions<T> &
    Omit<LinkProps, 'to'>
  ): JSX.Element

  // Declare component Navigate
  export function Navigate<T extends string = RoutePaths>(
    props: GeneratePathOptions<T> &
    Omit<NavigateProps, 'to'>
  ): null
}
