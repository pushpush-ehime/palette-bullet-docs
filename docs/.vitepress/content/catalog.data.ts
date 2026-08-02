import { createContentLoader } from 'vitepress'
import { loadCatalog } from './catalog.mjs'

export interface CatalogEntry {
  url: string
  title: string
  description: string
  pageType: string
  category: string
  status: string
  taskId: string
  order: number
  categoryOrder: number
  relatedSpecs: string[]
  openQuestions: string[]
  updatedAt: string
}

declare const data: CatalogEntry[]
export { data }

export default createContentLoader('**/*.md', {
  transform() {
    return loadCatalog().map((entry) => ({
      url: entry.url,
      title: entry.title,
      description: entry.description,
      pageType: entry.pageType,
      category: entry.category,
      status: entry.status,
      taskId: entry.taskId,
      order: entry.order,
      categoryOrder: entry.categoryOrder,
      relatedSpecs: entry.relatedSpecs,
      openQuestions: entry.openQuestions,
      updatedAt: entry.updatedAt
    }))
  }
})
