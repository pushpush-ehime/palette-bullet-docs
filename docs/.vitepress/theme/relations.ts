import type { CatalogEntry } from '../content/catalog.data.js'
import { buildRelationEdges } from '../content/relation-graph.js'

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

export function relationIndexes(catalog: CatalogEntry[]) {
  const pagesByUrl = new Map(catalog.map((page) => [page.url, page]))
  const tasksBySpec = new Map<string, CatalogEntry[]>()
  const specsByTask = new Map<string, CatalogEntry[]>()
  const edges = buildRelationEdges(catalog)

  for (const edge of edges) {
    const spec = pagesByUrl.get(edge.specUrl)
    const task = pagesByUrl.get(edge.taskUrl)
    if (spec?.pageType !== 'spec' || task?.pageType !== 'task') continue

    const relatedTasks = tasksBySpec.get(spec.url) ?? []
    relatedTasks.push(task)
    tasksBySpec.set(spec.url, relatedTasks)

    const relatedSpecs = specsByTask.get(task.url) ?? []
    relatedSpecs.push(spec)
    specsByTask.set(task.url, relatedSpecs)
  }

  for (const [url, tasks] of tasksBySpec) {
    tasksBySpec.set(url, sortTasks(tasks))
  }

  for (const [url, specs] of specsByTask) {
    specsByTask.set(url, sortSpecs(specs))
  }

  return { edges, tasksBySpec, specsByTask }
}

export function indexTasksBySpec(catalog: CatalogEntry[]) {
  return relationIndexes(catalog).tasksBySpec
}

export function indexSpecsByTask(catalog: CatalogEntry[]) {
  return relationIndexes(catalog).specsByTask
}

export function specsForTask(catalog: CatalogEntry[], task: CatalogEntry) {
  return indexSpecsByTask(catalog).get(task.url) ?? []
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
