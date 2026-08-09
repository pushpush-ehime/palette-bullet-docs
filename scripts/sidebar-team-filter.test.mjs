import assert from 'node:assert/strict'
import test from 'node:test'
import { TEAMS } from '../docs/.vitepress/content/notion-fields.mjs'
import {
  SIDEBAR_TEAM_KEYS,
  TASK_SIDEBAR_FILTERS,
  TASK_SIDEBAR_FILTER_STORAGE_KEY,
  normalizeTaskSidebarFilter,
  readTaskSidebarFilter,
  sidebarTeamKey,
  sidebarTeamMatchesFilter,
  writeTaskSidebarFilter
} from '../docs/.vitepress/content/sidebar-team-filter.js'

test('表示名とfrontmatterの班を5つのフィルターへ対応付ける', () => {
  assert.deepEqual(
    TASK_SIDEBAR_FILTERS,
    [
      { key: 'all', label: 'すべて' },
      { key: 'programmer', label: 'プログラム' },
      { key: 'planning', label: 'プランナー' },
      { key: 'design', label: 'デザイナー' },
      { key: 'sound', label: 'サウンド' }
    ]
  )
  assert.deepEqual(TEAMS.map((team) => SIDEBAR_TEAM_KEYS[team]), [
    'planning',
    'programmer',
    'design',
    'sound',
    'management'
  ])
})

test('全体管理と担当未設定はすべて以外の班フィルターから除外する', () => {
  assert.equal(sidebarTeamKey('全体管理'), 'management')
  assert.equal(sidebarTeamKey(''), 'unassigned')
  assert.equal(sidebarTeamKey(undefined), 'unassigned')
  assert.equal(sidebarTeamMatchesFilter('management', 'all'), true)
  assert.equal(sidebarTeamMatchesFilter('unassigned', 'all'), true)
  assert.equal(sidebarTeamMatchesFilter('management', 'programmer'), false)
  assert.equal(sidebarTeamMatchesFilter('unassigned', 'sound'), false)
  assert.equal(sidebarTeamMatchesFilter('sound', 'sound'), true)
})

test('不正な保存値はすべてへ戻す', () => {
  assert.equal(normalizeTaskSidebarFilter('programmer'), 'programmer')
  assert.equal(normalizeTaskSidebarFilter('management'), 'all')
  assert.equal(normalizeTaskSidebarFilter('unassigned'), 'all')
  assert.equal(normalizeTaskSidebarFilter('unknown'), 'all')
  assert.equal(normalizeTaskSidebarFilter(null), 'all')
})

test('選択した班をStorageへ保存し、すべてでは保存値を削除する', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }

  assert.equal(readTaskSidebarFilter(storage), 'all')
  assert.equal(writeTaskSidebarFilter(storage, 'design'), 'design')
  assert.equal(values.get(TASK_SIDEBAR_FILTER_STORAGE_KEY), 'design')
  assert.equal(readTaskSidebarFilter(storage), 'design')
  assert.equal(writeTaskSidebarFilter(storage, 'all'), 'all')
  assert.equal(values.has(TASK_SIDEBAR_FILTER_STORAGE_KEY), false)
})

test('Storageが利用できなくても全表示へ安全にフォールバックする', () => {
  const unavailable = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') }
  }

  assert.equal(readTaskSidebarFilter(unavailable), 'all')
  assert.doesNotThrow(() => writeTaskSidebarFilter(unavailable, 'sound'))
})
