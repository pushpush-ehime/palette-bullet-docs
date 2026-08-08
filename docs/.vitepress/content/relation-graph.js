function normalizePageUrl(value) {
  if (typeof value !== 'string') return ''

  let url = value.trim()
  if (!url) return ''
  if (!url.startsWith('/')) url = `/${url}`

  return url.replace(/\.html$/, '').replace(/\/index$/, '/')
}

export function canonicalRelationUrl(value) {
  const normalized = normalizePageUrl(value)
  return normalized === '/' ? normalized : normalized.replace(/\/+$/, '')
}

function pageIndex(pages, pageType) {
  return new Map(
    pages
      .filter((page) => page.pageType === pageType)
      .map((page) => [canonicalRelationUrl(page.url), page])
  )
}

/**
 * task.relatedSpecs と spec.relatedTasks を同じ関係として統合する。
 * 同じ関係が両側に書かれていても1件にまとめ、どちら側が保存元かを残す。
 * Node専用APIを使わないため、VitePressのブラウザー側コードでも利用できる。
 */
export function buildRelationEdges(pages) {
  const specsByUrl = pageIndex(pages, 'spec')
  const tasksByUrl = pageIndex(pages, 'task')
  const edgesByKey = new Map()

  function add(spec, task, source) {
    if (!spec || !task) return

    const key = `${canonicalRelationUrl(spec.url)}\0${canonicalRelationUrl(task.url)}`
    const edge = edgesByKey.get(key) ?? {
      specUrl: spec.url,
      taskUrl: task.url,
      declaredByTask: false,
      declaredBySpec: false
    }

    if (source === 'task') edge.declaredByTask = true
    if (source === 'spec') edge.declaredBySpec = true
    edgesByKey.set(key, edge)
  }

  for (const task of tasksByUrl.values()) {
    const relatedSpecs = Array.isArray(task.relatedSpecs)
      ? task.relatedSpecs
      : []

    for (const specUrl of relatedSpecs) {
      add(specsByUrl.get(canonicalRelationUrl(specUrl)), task, 'task')
    }
  }

  for (const spec of specsByUrl.values()) {
    const relatedTasks = Array.isArray(spec.relatedTasks)
      ? spec.relatedTasks
      : []

    for (const taskUrl of relatedTasks) {
      add(spec, tasksByUrl.get(canonicalRelationUrl(taskUrl)), 'spec')
    }
  }

  return [...edgesByKey.values()].sort(
    (left, right) =>
      left.specUrl.localeCompare(right.specUrl, 'ja') ||
      left.taskUrl.localeCompare(right.taskUrl, 'ja')
  )
}
