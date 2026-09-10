import { STATUSES } from './notion-fields.mjs'

export const TASK_PROGRESS_FILE = 'docs/.vitepress/content/task-progress.json'
export const PROGRESS_LABELS = {
  unlinked: '未連携',
  unset: '状態未設定',
  unknown: '未知の状態',
  failed: '取得失敗',
  unavailable: '状態不明（未取得）',
  duplicate: 'ID重複（要確認）'
}
export const PROGRESS_FILTERS = [...STATUSES, ...Object.values(PROGRESS_LABELS)]

export function validTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
}

export function safeNotionUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      (url.hostname === 'notion.so' || url.hostname.endsWith('.notion.so') ||
        url.hostname === 'notion.site' || url.hostname.endsWith('.notion.site'))
      ? url.href : ''
  } catch {
    return ''
  }
}

// キャッシュ・fixtureも公開用の項目だけに絞り、未知の値を4状態へ変換しない。
export function sanitizeProgressEntry(entry) {
  if (!entry || !validTimestamp(entry.fetchedAt)) return null
  if (!['status', 'unlinked', 'unset', 'unknown', 'duplicate'].includes(entry.kind)) return null
  if (entry.kind === 'status' && !STATUSES.includes(entry.status)) return null
  return {
    kind: entry.kind,
    status: entry.kind === 'status' ? entry.status : '',
    fetchedAt: entry.fetchedAt,
    notionUrl: safeNotionUrl(entry.notionUrl)
  }
}

export function taskProgress(snapshot, taskId) {
  const valid = snapshot?.version === 1 &&
    ['success', 'failed', 'unconfigured'].includes(snapshot.outcome)
  const entry = valid ? sanitizeProgressEntry(snapshot.entries?.[taskId]) : null
  const kind = entry?.kind ?? (valid && snapshot.outcome === 'failed' ? 'failed' : 'unavailable')
  return {
    kind,
    status: entry?.status ?? '',
    label: kind === 'status' ? entry.status : PROGRESS_LABELS[kind],
    fetchedAt: entry?.fetchedAt ?? '',
    notionUrl: entry?.notionUrl ?? '',
    stale: Boolean(entry && snapshot.outcome !== 'success'),
    failure: valid && snapshot.outcome !== 'success' ? snapshot.outcome : '',
    attemptedAt: valid && validTimestamp(snapshot.attemptedAt) ? snapshot.attemptedAt : ''
  }
}

export function formatProgressTime(value) {
  if (!validTimestamp(value)) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).format(new Date(value)) + ' JST'
}

export function matchesTaskProgress(task, selectedStatus) {
  return !selectedStatus || task.progress.label === selectedStatus
}
