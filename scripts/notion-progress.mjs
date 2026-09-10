/** Web表示専用。Notionへの要求はDBのGETとquery POSTだけ。通知・起票は行わない。 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { assertValidCatalog, loadCatalog } from '../docs/.vitepress/content/catalog.mjs'
import { STATUSES } from '../docs/.vitepress/content/notion-fields.mjs'
import {
  TASK_PROGRESS_FILE, safeNotionUrl, sanitizeProgressEntry
} from '../docs/.vitepress/content/task-progress.mjs'

export function normalizeDatabaseId(value) {
  return String(value).trim().match(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i)?.[0].replaceAll('-', '') ?? ''
}

export async function readNotionProgress({ token, databaseId, fetchImpl = fetch }) {
  // URLやHTTPメソッドを外から指定できる汎用クライアントにしない。
  async function request(query, body) {
    const response = await fetchImpl(`https://api.notion.com/v1/databases/${databaseId}${query ? '/query' : ''}`, {
      method: query ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: query ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000)
    })
    // API本文には公開しない情報が含まれるため、ログへ出さない。
    if (!response.ok) throw new Error(`Notion progress HTTP ${response.status}`)
    return response.json()
  }

  const database = await request(false)
  if (database.properties?.['タスクID']?.type !== 'rich_text' ||
      !['select', 'status'].includes(database.properties?.['状態']?.type)) {
    throw new Error('NotionのタスクID・状態プロパティを確認してください。')
  }
  const pages = []
  const cursors = new Set()
  let cursor
  do {
    const result = await request(true, { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
    if (!Array.isArray(result.results) || typeof result.has_more !== 'boolean') {
      throw new Error('Notionの取得結果が不正です。')
    }
    pages.push(...result.results)
    cursor = result.has_more ? result.next_cursor : null
    if (result.has_more && (typeof cursor !== 'string' || !cursor || cursors.has(cursor))) {
      throw new Error('Notionのページ送りが不正です。')
    }
    if (cursor) cursors.add(cursor)
  } while (cursor)
  return pages
}

export function progressEntries(pages, taskIds, fetchedAt) {
  const byId = new Map()
  for (const page of pages) {
    if (page.archived || page.in_trash) continue
    const id = (page.properties?.['タスクID']?.rich_text ?? [])
      .map((part) => part.plain_text ?? '').join('').trim()
    if (!taskIds.includes(id)) continue
    const matches = byId.get(id) ?? []
    matches.push(page)
    byId.set(id, matches)
  }
  return Object.fromEntries(taskIds.map((id) => {
    const pagesForId = byId.get(id) ?? []
    const page = pagesForId[0]
    const property = page?.properties?.['状態']
    const name = property?.[property.type]?.name
    const kind = pagesForId.length > 1 ? 'duplicate' : !page ? 'unlinked' :
      !property || !['select', 'status'].includes(property.type) ? 'unknown' :
      name === undefined || name === null || name === '' ? 'unset' :
      STATUSES.includes(name) ? 'status' : 'unknown'
    return [id, {
      kind, status: kind === 'status' ? name : '', fetchedAt,
      notionUrl: pagesForId.length === 1 ? safeNotionUrl(page.url) : ''
    }]
  }))
}

export async function collectProgress({
  taskIds, token = '', databaseId = '', previous = null,
  read = readNotionProgress, now = () => new Date().toISOString()
}) {
  if (new Set(taskIds).size !== taskIds.length) throw new Error('タスクIDが重複しています。')
  const attemptedAt = now()
  let outcome = 'unconfigured'
  if (token && databaseId) {
    try {
      const pages = await read({ token, databaseId })
      // 予定時刻や開始時刻ではなく、全ページの取得が完了した時刻。
      return { version: 1, attemptedAt, outcome: 'success', entries: progressEntries(pages, taskIds, now()) }
    } catch {
      outcome = 'failed'
    }
  }
  const entries = Object.fromEntries(taskIds.flatMap((id) => {
    const entry = previous?.version === 1 ? sanitizeProgressEntry(previous.entries?.[id]) : null
    return entry ? [[id, entry]] : []
  }))
  return { version: 1, attemptedAt, outcome, entries }
}

export function readProgressFile(path) {
  if (!existsSync(path)) return null
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

async function main() {
  const catalog = loadCatalog({ includeUpdated: false })
  assertValidCatalog(catalog)
  const path = resolve(TASK_PROGRESS_FILE)
  const snapshot = await collectProgress({
    taskIds: catalog.filter((entry) => entry.pageType === 'task').map((entry) => entry.taskId),
    token: process.env.NOTION_TOKEN?.trim(),
    databaseId: normalizeDatabaseId(process.env.NOTION_TASK_DB_ID ?? ''),
    previous: readProgressFile(path)
  })
  writeFileSync(path, JSON.stringify(snapshot, null, 2) + '\n')
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `outcome=${snapshot.outcome}\n`)
  const message = snapshot.outcome === 'success'
    ? `Notion進捗を取得しました（${Object.keys(snapshot.entries).length}件）。`
    : 'Notion進捗を取得できませんでした。前回情報は元の取得日時で表示し、情報のないタスクは状態不明になります。'
  console.log(`${snapshot.outcome === 'success' ? '' : '::warning::'}${message}`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('進捗取得処理を完了できませんでした。'); process.exitCode = 1 })
}
