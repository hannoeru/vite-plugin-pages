import { baseGeneratePath, baseHelpersDtsTemplate } from './base'

export function generateSolidDtsTemplate(moduleIds: string[], routePaths: string) {
  return moduleIds.map((moduleId) => {
    return `declare module '${moduleId}' {
  import type { RouteDefinition } from '@solidjs/router'

  export type RoutePaths = ${routePaths}

  const routes: RouteDefinition[]
  export default routes
}

declare module '${moduleId}-helpers' {
  import type { JSX } from 'solid-js'
  import type { LinkProps, NavigateOptions, NavigateProps, RouteDefinition } from '@solidjs/router'
  
  export type RoutePaths = ${routePaths}

  ${baseHelpersDtsTemplate}

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
}`
  }).join('\n// ---------------------------------\n\n')
}

export function generateSolidHelpers() {
  return `import { createMemo, createComponent as $createComponent } from 'solid-js'
import {Link as SLink, useNavigate as useSNavigate, Navigate as SNavigate} from '@solidjs/router'

${baseGeneratePath}

export function Link({
  path,
  params,
  ...props
}) {
  const href = createMemo(() => {
    return generatePath({ path, params });
  });

  return $createComponent(SLink, {
    ...props,
    href: href(),
  });
}

export function Navigate({
  path,
  params,
  ...props
}) {
  const href = createMemo(() => {
    return generatePath({ path, params });
  });

  return $createComponent(SNavigate, {
    ...props,
    href: href(),
  });
}

export function useNavigate() {
  const sNavigate = useSNavigate();

  return function navigate(
    path,
    options
  ) {
    return sNavigate(generatePath(path), options);
  };
}
`
}
