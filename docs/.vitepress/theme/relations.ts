import type { CatalogEntry } from '../content/catalog.data.js'

export type RelationState =
  | 'linked'
  | 'waiting'
  | 'unlinked'
  | 'overview'
  | 'excluded'

export const relationStateLabels: Record<RelationState, string> = {
  linked: 'タスクあり',
  waiting: '仕様決定待ち',
  unlinked: '関連タスクなし',
  overview: '概要ページ',
  excluded: '集計対象外'
}

export const relationStateOptions: RelationState[] = [
  'linked',
  'unlinked',
  'waiting',
  'overview',
  'excluded'
]

export function sortSpecs(specs: CatalogEntry[]) {
  return [...specs].sort(
    (left, right) =>
      left.categoryOrder - right.categoryOrder ||
      left.order - right.order ||
      left.title.localeCompare(right.title, 'ja')
  )
}

export function sortTasks(tasks: CatalogEntry[]) {
  return [...tasks].sort(
    (left, right) =>
      left.categoryOrder - right.categoryOrder ||
      left.order - right.order ||
      left.taskId.localeCompare(right.taskId)
  )
}

export function indexTasksBySpec(catalog: CatalogEntry[]) {
  const tasksBySpec = new Map<string, CatalogEntry[]>()
  const tasks = sortTasks(catalog.filter((page) => page.pageType === 'task'))

  for (const task of tasks) {
    for (const specUrl of task.relatedSpecs) {
      const relatedTasks = tasksBySpec.get(specUrl) ?? []
      relatedTasks.push(task)
      tasksBySpec.set(specUrl, relatedTasks)
    }
  }

  return tasksBySpec
}

export function specsForTask(catalog: CatalogEntry[], task: CatalogEntry) {
  const pagesByUrl = new Map(catalog.map((page) => [page.url, page]))

  return task.relatedSpecs
    .map((url) => pagesByUrl.get(url))
    .filter((page): page is CatalogEntry => page?.pageType === 'spec')
}

export function relationState(spec: CatalogEntry, relatedTaskCount: number): RelationState {
  if (relatedTaskCount > 0) return 'linked'
  if (spec.status === '対象外' || spec.status === '廃止') return 'excluded'
  if (
    spec.url.endsWith('/') &&
    spec.url.split('/').filter(Boolean).length === 2
  ) {
    return 'overview'
  }
  if (spec.status === '未決') return 'waiting'
  return 'unlinked'
}
