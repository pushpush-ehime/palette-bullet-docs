import { withBase } from 'vitepress'

export function pageHref(url: string) {
  const href = withBase(url)
  return url === '/' || url.endsWith('/') ? href : `${href}.html`
}
