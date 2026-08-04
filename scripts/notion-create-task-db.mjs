/**
 * 連携先のNotionタスクDBを、決まった構成で作る。
 *
 *   NOTION_TOKEN=xxx node scripts/notion-create-task-db.mjs --parent <ページのURL>
 *
 * DBを手で作るとプロパティ名がずれて同期が止まるため、
 * 別のワークスペースへ連携先を移すときはこのスクリプトで作る。
 *
 * 実行の前に、Notionの親ページで「…」→「接続」から
 * インテグレーションを追加しておくこと。
 */

import {
  MEMBERS,
  MILESTONES,
  OPTION_COLORS,
  PRIORITIES,
  STATUSES,
  TEAMS
} from '../docs/.vitepress/content/notion-fields.mjs'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const DEFAULT_TITLE = '🎯 パレットブレット タスクDB'

main().catch((error) => {
  console.error(`作成に失敗しました：${error.message}`)
  process.exitCode = 1
})

async function main() {
  const token = process.env.NOTION_TOKEN?.trim()
  const parentId = normalizeId(readOption('--parent') ?? '')
  const title = readOption('--title') ?? DEFAULT_TITLE

  if (!token) {
    throw new Error('環境変数NOTION_TOKENが設定されていません。')
  }

  if (!parentId) {
    throw new Error(
      '--parent に、DBを置きたいNotionページのURLかIDを指定してください。'
    )
  }

  const response = await fetch(`${NOTION_API}/databases`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: parentId },
      icon: { type: 'emoji', emoji: '🎯' },
      title: [{ type: 'text', text: { content: title } }],
      properties: buildProperties()
    })
  })

  if (!response.ok) {
    const detail = await response.text()

    if (response.status === 404) {
      throw new Error(
        `ページ${parentId}が見つかりません。Notionの該当ページで「…」→「接続」からインテグレーションを追加してください。${detail}`
      )
    }

    throw new Error(`Notion APIが${response.status}を返しました。${detail}`)
  }

  const database = await response.json()

  console.log(`タスクDB「${title}」を作りました。`)
  console.log(`URL: ${database.url}`)
  console.log(`ID : ${database.id}`)
  console.log(
    '\nGitHubのSecretsへ、このIDをNOTION_TASK_DB_IDとして登録してください。'
  )
}

function buildProperties() {
  return {
    タスク: { title: {} },
    タスクID: { rich_text: {} },
    設計書: { url: {} },
    班: { select: { options: selectOptions(TEAMS) } },
    優先度: { select: { options: selectOptions(PRIORITIES) } },
    マイルストーン: { select: { options: selectOptions(MILESTONES) } },
    担当: { multi_select: { options: selectOptions(MEMBERS) } },
    期限: { date: {} },
    状態: { select: { options: selectOptions(STATUSES) } },
    依存: { rich_text: {} }
  }
}

function selectOptions(names) {
  return names.map((name) => ({
    name,
    color: OPTION_COLORS[name] ?? 'default'
  }))
}

function readOption(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

function normalizeId(value) {
  const match = value
    .trim()
    .match(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i)

  return match ? match[0].replaceAll('-', '') : ''
}
