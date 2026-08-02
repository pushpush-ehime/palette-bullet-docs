import { withBase } from 'vitepress'

export function pageHref(url: string) {
  const href = withBase(url)
  return url === '/' || url.endsWith('/') ? href : `${href}.html`
}

export function pageUrlFromRelative(relativePath: string) {
  let url = `/${relativePath.replaceAll('\\', '/')}`
  url = url.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
  return url || '/'
}
