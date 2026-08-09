import { TEAMS } from './notion-fields.mjs'

/** frontmatterの班名を、サイドバーで扱う安定したキーへ変換する。 */
export const SIDEBAR_TEAM_KEYS = Object.freeze({
  企画: 'planning',
  プログラム: 'programmer',
  デザイン: 'design',
  サウンド: 'sound',
  全体管理: 'management'
})

/** 今回サイドバーへ表示する5つの単一選択フィルター。 */
export const TASK_SIDEBAR_FILTERS = Object.freeze([
  { key: 'all', label: 'すべて' },
  { key: SIDEBAR_TEAM_KEYS.プログラム, label: 'プログラム' },
  { key: SIDEBAR_TEAM_KEYS.企画, label: 'プランナー' },
  { key: SIDEBAR_TEAM_KEYS.デザイン, label: 'デザイナー' },
  { key: SIDEBAR_TEAM_KEYS.サウンド, label: 'サウンド' }
])

export const TASK_SIDEBAR_FILTER_STORAGE_KEY =
  'palette-bullet-docs:task-sidebar-team:v1'

const allowedFilterKeys = new Set(
  TASK_SIDEBAR_FILTERS.map((option) => option.key)
)

export function sidebarTeamKey(team) {
  const normalized = typeof team === 'string' ? team.trim() : ''
  return SIDEBAR_TEAM_KEYS[normalized] ?? 'unassigned'
}

export function normalizeTaskSidebarFilter(value) {
  return typeof value === 'string' && allowedFilterKeys.has(value)
    ? value
    : 'all'
}

export function sidebarTeamMatchesFilter(teamKey, filterKey) {
  const normalizedFilter = normalizeTaskSidebarFilter(filterKey)
  return normalizedFilter === 'all' || teamKey === normalizedFilter
}

export function readTaskSidebarFilter(storage) {
  try {
    return normalizeTaskSidebarFilter(
      storage?.getItem(TASK_SIDEBAR_FILTER_STORAGE_KEY)
    )
  } catch {
    return 'all'
  }
}

export function writeTaskSidebarFilter(storage, filterKey) {
  const normalized = normalizeTaskSidebarFilter(filterKey)

  try {
    if (normalized === 'all') {
      storage?.removeItem(TASK_SIDEBAR_FILTER_STORAGE_KEY)
    } else {
      storage?.setItem(TASK_SIDEBAR_FILTER_STORAGE_KEY, normalized)
    }
  } catch {
    // Storageが無効でも、現在の画面内では選択状態を利用できる。
  }

  return normalized
}

// 班定義を追加したとき、サイドバー用キーの追加漏れを開発時に検出する。
for (const team of TEAMS) {
  if (!SIDEBAR_TEAM_KEYS[team]) {
    throw new Error(`サイドバー用の班キーが未定義です: ${team}`)
  }
}
