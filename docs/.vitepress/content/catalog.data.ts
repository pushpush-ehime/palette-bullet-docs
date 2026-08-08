import { createContentLoader } from 'vitepress'
import { loadCatalog } from './catalog.mjs'

export interface CatalogEntry {
  relativePath: string
  url: string
  title: string
  description: string
  pageType: string
  category: string
  status: string
  taskId: string
  team: string
  order: number
  categoryOrder: number
  relatedSpecs: string[]
  relatedTasks: string[]
  hasInlineRelations: boolean
  notionUrl: string
  openQuestions: string[]
  purpose: string
  constraints: string
  updatedAt: string
}

declare const data: CatalogEntry[]
export { data }

export default createContentLoader('**/*.md', {
  transform() {
    return loadCatalog().map((entry) => ({
      relativePath: entry.relativePath,
      url: entry.url,
      title: entry.title,
      description: entry.description,
      pageType: entry.pageType,
      category: entry.category,
      status: entry.status,
      taskId: entry.taskId,
      team: entry.team,
      order: entry.order,
      categoryOrder: entry.categoryOrder,
      relatedSpecs: entry.relatedSpecs,
      relatedTasks: entry.relatedTasks,
      hasInlineRelations: entry.hasInlineRelations,
      notionUrl: entry.notionUrl,
      openQuestions: entry.openQuestions,
      purpose: entry.purpose,
      constraints: entry.constraints,
      updatedAt: entry.updatedAt
    }))
  }
})
