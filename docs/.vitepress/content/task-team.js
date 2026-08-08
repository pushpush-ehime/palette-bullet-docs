import { TEAMS } from './notion-fields.mjs'

const TEAM_LABELS = {
  企画: '企画（プランナー）',
  プログラム: 'プログラム（プログラマー）',
  デザイン: 'デザイン（デザイナー）',
  サウンド: 'サウンド',
  全体管理: '全体管理'
}

export const TASK_TEAM_OPTIONS = TEAMS.map((value) => ({
  value,
  label: TEAM_LABELS[value] ?? value
}))

export function isTaskTeam(value) {
  return TEAMS.includes(value)
}

/**
 * 文頭のfrontmatterだけを変更し、コメント・配列・本文・改行コードを保つ。
 * タスク雛形の「# team: ...」も選択値で有効化する。
 */
export function setTaskTeam(source, team) {
  if (!isTaskTeam(team)) {
    throw new Error(`担当班「${team}」は選択肢にありません。`)
  }

  const lineBreak = source.startsWith('---\r\n') ? '\r\n' : '\n'
  const lines = source.replace(/\r\n?/g, '\n').split('\n')

  if (lines[0] !== '---') {
    throw new Error('frontmatterが見つかりません。')
  }

  const closingIndex = lines.indexOf('---', 1)

  if (closingIndex === -1) {
    throw new Error('frontmatterが閉じられていません。')
  }

  const activeIndex = lines
    .slice(1, closingIndex)
    .findIndex((line) => /^team\s*:/.test(line))
  const commentedIndex = lines
    .slice(1, closingIndex)
    .findIndex((line) => /^#\s*team\s*:/.test(line))
  const relativeIndex = activeIndex >= 0 ? activeIndex : commentedIndex

  if (relativeIndex >= 0) {
    lines[relativeIndex + 1] = `team: ${team}`
    return lines.join(lineBreak)
  }

  const categoryIndex = lines
    .slice(1, closingIndex)
    .findIndex((line) => /^category\s*:/.test(line))
  const insertIndex = categoryIndex >= 0 ? categoryIndex + 2 : closingIndex

  lines.splice(insertIndex, 0, `team: ${team}`)
  return lines.join(lineBreak)
}
