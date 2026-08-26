/**
 * Notionのタスクが「完了」になったらDiscordへ通知する。
 *
 * GitHub Actionsから定期実行する想定。
 *
 * 必要な環境変数
 *   NOTION_TOKEN               Notionインテグレーションのトークン
 *   NOTION_TASK_DB_ID          タスクDBのID
 *   DISCORD_TASK_WEBHOOK_URL   Discordタスク通知用Webhook URL
 *
 * 二重通知防止
 *   Notion DBの「Discord完了通知済」チェックボックスを使用する。
 *   Discord通知に成功したあとでtrueにする。
 *   完了から別の状態へ戻された場合はfalseへ戻すため、
 *   再度「完了」にしたときはもう一度通知される。
 */

import { appendFileSync } from 'node:fs'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const COMPLETE_STATUS = '完了'
const NOTIFIED_PROPERTY = 'Discord完了通知済'
const WRITE_INTERVAL = 350

main().catch((error) => {
  console.error(`完了通知に失敗しました：${error.message}`)
  process.exitCode = 1
})

async function main() {
  const token = process.env.NOTION_TOKEN?.trim()
  const databaseId = normalizeId(process.env.NOTION_TASK_DB_ID ?? '')
  const discordWebhookUrl =
    process.env.DISCORD_TASK_WEBHOOK_URL?.trim() ?? ''

  if (!token) {
    throw new Error('環境変数NOTION_TOKENが設定されていません。')
  }

  if (!databaseId) {
    throw new Error('環境変数NOTION_TASK_DB_IDが設定されていません。')
  }

  if (!discordWebhookUrl) {
    throw new Error(
      '環境変数DISCORD_TASK_WEBHOOK_URLが設定されていません。'
    )
  }

  const client = createNotionClient(token)
  const database = await client.get(`/databases/${databaseId}`)
  assertDatabaseSchema(database)

  // 一度完了したあと未着手・着手・レビューへ戻したタスクは、
  // 次回の完了時に再通知できるよう通知済みフラグを戻す。
  const reopened = await fetchReopenedTasks(client, databaseId)

  for (const task of reopened) {
    await setNotified(client, task.id, false)
    console.log(`[通知状態をリセット] ${labelOf(task)}`)
  }

  // 「完了」かつ「まだDiscordへ通知していない」タスクだけ取得する。
  const completed = await fetchUnnotifiedCompletedTasks(client, databaseId)
  const notified = []
  const failed = []

  for (const task of completed) {
    try {
      await notifyDiscord(discordWebhookUrl, task)
      await setNotified(client, task.id, true)
      notified.push(task.taskId || task.title || task.id)
      console.log(`[完了通知] ${labelOf(task)}`)

      // Discord Webhookの連続送信を穏やかにする。
      await sleep(400)
    } catch (error) {
      failed.push(task.taskId || task.title || task.id)
      console.warn(
        `注意：${labelOf(task)} のDiscord完了通知に失敗しました：${error.message}`
      )
      // 通知済みにはしない。次回の定期実行で再試行する。
    }
  }

  report({
    completedCount: completed.length,
    notified,
    failed,
    reopenedCount: reopened.length
  })

  // Discord送信に失敗したタスクがあっても、
  // 「通知済み」を付けず次回に再試行するのでワークフロー自体は継続可能。
}

function assertDatabaseSchema(database) {
  const required = [
    'タスク',
    'タスクID',
    '設計書',
    '班',
    '優先度',
    'マイルストーン',
    '担当',
    '状態',
    NOTIFIED_PROPERTY
  ]

  const missing = required.filter(
    (name) => !Object.hasOwn(database.properties ?? {}, name)
  )

  if (missing.length > 0) {
    throw new Error(
      `NotionタスクDBに次のプロパティがありません：${missing.join('・')}`
    )
  }
}

async function fetchUnnotifiedCompletedTasks(client, databaseId) {
  return queryTasks(client, databaseId, {
    and: [
      {
        property: '状態',
        select: { equals: COMPLETE_STATUS }
      },
      {
        property: NOTIFIED_PROPERTY,
        checkbox: { equals: false }
      }
    ]
  })
}

async function fetchReopenedTasks(client, databaseId) {
  return queryTasks(client, databaseId, {
    and: [
      {
        property: '状態',
        select: { does_not_equal: COMPLETE_STATUS }
      },
      {
        property: NOTIFIED_PROPERTY,
        checkbox: { equals: true }
      }
    ]
  })
}

async function queryTasks(client, databaseId, filter) {
  const tasks = []
  let cursor

  do {
    const body = {
      page_size: 100,
      filter
    }

    if (cursor) body.start_cursor = cursor

    const response = await client.post(
      `/databases/${databaseId}/query`,
      body
    )

    for (const page of response.results ?? []) {
      tasks.push(taskFromPage(page))
    }

    cursor = response.has_more ? response.next_cursor : undefined
  } while (cursor)

  return tasks
}

function taskFromPage(page) {
  const properties = page.properties ?? {}

  return {
    id: page.id,
    notionUrl: page.url ?? '',
    taskId: plainText(properties['タスクID']?.rich_text).trim(),
    title: plainText(properties['タスク']?.title).trim(),
    siteUrl: properties['設計書']?.url ?? '',
    team: properties['班']?.select?.name?.trim() ?? '',
    priority: properties['優先度']?.select?.name?.trim() ?? '',
    milestone: properties['マイルストーン']?.select?.name?.trim() ?? '',
    assignees: Array.isArray(properties['担当']?.multi_select)
      ? properties['担当'].multi_select
          .map((item) => item.name?.trim())
          .filter(Boolean)
      : []
  }
}

async function notifyDiscord(webhookUrl, task) {
  const titleParts = [
    task.taskId,
    task.title
  ].filter(Boolean)

  const links = []

  if (task.siteUrl) {
    links.push(`📘 [Webでタスクを見る](${task.siteUrl})`)
  }

  if (task.notionUrl) {
    links.push(`✅ [Notionでチケットを開く](${task.notionUrl})`)
  }

  const fields = [
    {
      name: '班',
      value: task.team || '未設定',
      inline: true
    },
    {
      name: '優先度',
      value: task.priority || '未設定',
      inline: true
    },
    {
      name: 'マイルストーン',
      value: task.milestone || '未設定',
      inline: true
    }
  ]

  if (task.assignees.length > 0) {
    fields.push({
      name: '担当',
      value: task.assignees.join('、'),
      inline: false
    })
  }

  const payload = {
    username: 'Palette Bullet Task Bot',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `✅ ${titleParts.join('｜') || 'タスク完了'}`,
        url: task.siteUrl || task.notionUrl || undefined,
        description: [
          'タスクが完了しました！',
          '',
          ...links
        ].join('\n'),
        fields,
        timestamp: new Date().toISOString()
      }
    ]
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Discord Webhook が${response.status}を返しました。${detail}`
    )
  }
}

async function setNotified(client, pageId, value) {
  await client.patch(`/pages/${pageId}`, {
    properties: {
      [NOTIFIED_PROPERTY]: {
        checkbox: value
      }
    }
  })
}

function createNotionClient(token) {
  async function request(method, path, body) {
    const response = await fetch(`${NOTION_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(
        `Notion API ${method} ${path} が${response.status}を返しました。${detail}`
      )
    }

    if (method !== 'GET') {
      await sleep(WRITE_INTERVAL)
    }

    return response.json()
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body)
  }
}

function report({
  completedCount,
  notified,
  failed,
  reopenedCount
}) {
  const lines = [
    `- 未通知の完了タスク：${completedCount}件`,
    `- Discordへ通知：${notified.length}件${listOf(notified)}`,
    `- 通知失敗（次回再試行）：${failed.length}件${listOf(failed)}`,
    `- 再開により通知状態をリセット：${reopenedCount}件`
  ]

  console.log(`\n完了通知チェック\n${lines.join('\n')}`)

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Notion → Discord 完了通知\n\n${lines.join('\n')}\n`
    )
  }
}

function labelOf(task) {
  return [task.taskId, task.title].filter(Boolean).join('｜') || task.id
}

function listOf(values) {
  return values.length > 0 ? `（${values.join('、')}）` : ''
}

function plainText(value) {
  if (!Array.isArray(value)) return ''
  return value.map((item) => item.plain_text ?? '').join('')
}

function normalizeId(value) {
  const match = value
    .trim()
    .match(
      /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i
    )

  return match ? match[0].replaceAll('-', '') : ''
}

function sleep(milliseconds) {
  return new Promise((done) => setTimeout(done, milliseconds))
}
