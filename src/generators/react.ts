import { baseGeneratePath, baseHelpersDtsTemplate } from './base'

export function generateReactDtsTemplate(moduleIds: string[], routePaths: string) {
  return moduleIds.map((moduleId) => {
    return `declare module '${moduleId}' {
  import type { RouteObject } from 'react-router'

  export type RoutePaths = ${routePaths}

  const routes: RouteObject[]
  export default routes
}

declare module '${moduleId}-helpers' {
  import type { NavigateOptions, NavigateProps } from 'react-router'
  import type { LinkProps } from 'react-router-dom'

  export type RoutePaths = ${routePaths}

  ${baseHelpersDtsTemplate}

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
`
  }).join('\n// ---------------------------------\n\n')
}

export function generateReactHelpers() {
  return `import { useMemo, createElement as $createElement } from 'react'
import {useNavigate as useRNavigate, Navigate as RNavigate} from 'react-router'
import { Link as RLink } from 'react-router-dom'

${baseGeneratePath}

export function Link({
  path,
  params,
  ...props
}) {
  const href = useMemo(() => {
    return generatePath({ path, params });
  }, [path, params]);

  return $createElement(RLink, {
    ...props,
    to: href,
  });
}

export function Navigate({
  path,
  params,
  ...props
}) {
  const href = useMemo(() => {
    return generatePath({ path, params });
  }, [path, params]);

  return $createElement(RNavigate, {
    ...props,
    to: href,
  });
}

export function useNavigate() {
  const rNavigate = useRNavigate();

  return function navigate(
    path,
    options
  ) {
    return rNavigate(generatePath(path), options);
  };
}`
}
