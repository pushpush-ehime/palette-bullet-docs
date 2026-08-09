export type SidebarTeamKey =
  | 'planning'
  | 'programmer'
  | 'design'
  | 'sound'
  | 'management'
  | 'unassigned'

export type TaskSidebarFilterKey =
  | 'all'
  | 'programmer'
  | 'planning'
  | 'design'
  | 'sound'

export interface TaskSidebarFilterOption {
  readonly key: TaskSidebarFilterKey
  readonly label: string
}

export interface TaskSidebarFilterStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const SIDEBAR_TEAM_KEYS: Readonly<Record<string, SidebarTeamKey>>
export const TASK_SIDEBAR_FILTERS: readonly TaskSidebarFilterOption[]
export const TASK_SIDEBAR_FILTER_STORAGE_KEY: string

export function sidebarTeamKey(team: unknown): SidebarTeamKey
export function normalizeTaskSidebarFilter(value: unknown): TaskSidebarFilterKey
export function sidebarTeamMatchesFilter(
  teamKey: SidebarTeamKey,
  filterKey: unknown
): boolean
export function readTaskSidebarFilter(
  storage?: TaskSidebarFilterStorage | null
): TaskSidebarFilterKey
export function writeTaskSidebarFilter(
  storage: TaskSidebarFilterStorage | null | undefined,
  filterKey: unknown
): TaskSidebarFilterKey
