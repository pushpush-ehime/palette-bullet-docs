/**
 * 設計書サイトのタスクページをNotionのタスクDBへ同期する。
 *
 *   node scripts/notion-sync.mjs            同期する
 *   node scripts/notion-sync.mjs --dry-run  実行せずに内容だけ表示する
 *
 * 必要な環境変数
 *   NOTION_TOKEN              Notionインテグレーションのトークン（ntn_で始まる）
 *   NOTION_TASK_DB_ID         タスクDBのID
 *   DISCORD_TASK_WEBHOOK_URL   Discordタスク通知用Webhook URL（任意）
 *
 * 役割分担
 *   設計書サイト … 作業内容・完了条件の正。タスク名・設計書URLと、明示された班はこちらが上書きする。
 *   Notion       … 進行管理の正。状態・担当・期限・優先度は起票時だけ書き込み、
 *                  以降は触らない（人がNotion上で動かすため）。
 *
 * チケットのURLはMarkdownへ書き戻さず、対応表（notion-links.json）に出す。
 * mainはPull Request必須で保護しているため、自動でコミットしない。
 * このスクリプトは公開の直前に実行し、続くビルドが対応表を読んでリンクを埋める。
 */

import { appendFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  loadCatalog,
  getSectionContent,
  validateCatalog
} from '../docs/.vitepress/content/catalog.mjs'
import {
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
  DEFAULT_TASK_FIELDS,
  NOTION_LINKS_FILE,
  SITE_BASE_URL
} from '../docs/.vitepress/content/notion-fields.mjs'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

/**
 * 過去に誤って採番されたTask IDの移行。
 * 旧IDが再利用された場合も誤ったページを上書きしないよう、移行元の同一性も固定する。
 */
export const TASK_ID_MIGRATIONS = [
  {
    from: 'PB-TASK-0012',
    to: 'PB-TASK-0011',
    sourceTitle: 'DryWetMIDIの導入',
    sourceDesignUrl: `${SITE_BASE_URL}/tasks/music-chart-scriptableobject/pb-task-0012`
  }
]

/** Notionタスクページに必要なプロパティ */
const REQUIRED_PROPERTIES = [
  'タスク',
  'タスクID',
  '設計書',
  '班',
  '優先度',
  'マイルストーン',
  '担当',
  '期限',
  '状態'
]

/** Notionの1つのテキストに入れられる文字数 */
const TEXT_LIMIT = 2000

/** 1ページの作成時に送るブロック数の上限 */
const BLOCK_LIMIT = 100

/** 書き込みの間隔（ミリ秒）。Notionの秒間3回程度の制限に合わせる。 */
const WRITE_INTERVAL = 350

const dryRun = process.argv.includes('--dry-run')

const executedFile = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : ''

if (import.meta.url === executedFile) {
  main().catch((error) => {
    console.error(`同期に失敗しました：${error.message}`)
    process.exitCode = 1
  })
}

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

  const catalog = loadCatalog({ includeUpdated: false })
  const catalogErrors = validateCatalog(catalog)

  if (catalogErrors.length > 0) {
    console.error('設計書の検査に失敗したため、同期を中止しました。')
    for (const error of catalogErrors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  const client = createClient(token)
  const database = await client.get(`/databases/${databaseId}`)
  assertDatabaseSchema(database)

  const databaseTitle = plainText(database.title) || 'パレットブレット タスクDB'
  const existingTasks = await fetchExistingTasks(client, databaseId)

  const tasks = catalog
    .filter((entry) => entry.pageType === 'task')
    .sort((left, right) => left.taskId.localeCompare(right.taskId))

  const migrated = await migrateTaskIds({
    client,
    existingTasks,
    tasks,
    isDryRun: dryRun
  })

  const created = []
  const updated = []
  const unchanged = []
  const links = {}

  for (const task of tasks) {
    const siteUrl = `${SITE_BASE_URL}${task.url}`
    const existing = existingTasks.get(task.taskId)

    let notionUrl = existing?.url ?? ''

    if (!existing) {
      if (dryRun) {
        created.push(task.taskId)
        console.log(`[作成予定] ${task.taskId}｜${task.title}`)
      } else {
        const page = await client.post('/pages', buildNewPage(task, databaseId, siteUrl))
        notionUrl = page.url
        created.push(task.taskId)
        console.log(`[作成] ${task.taskId}｜${task.title} → ${notionUrl}`)

        await notifyDiscordTaskCreated({
          webhookUrl: discordWebhookUrl,
          task,
          siteUrl,
          notionUrl
        })
      }
    } else {
      const changes = diffOwnedProperties(existing, task, siteUrl)

      if (Object.keys(changes).length > 0) {
        if (dryRun) {
          console.log(
            `[更新予定] ${task.taskId}：${Object.keys(changes).join('・')}`
          )
        } else {
          await client.patch(`/pages/${existing.id}`, { properties: changes })
          console.log(
            `[更新] ${task.taskId}：${Object.keys(changes).join('・')}`
          )
        }
        updated.push(task.taskId)
      } else {
        unchanged.push(task.taskId)
      }
    }

    if (notionUrl) links[task.taskId] = notionUrl
  }

  writeLinks(links)
  report({ created, migrated, updated, links, unchanged, tasks, databaseTitle })
}

/*
 * ビルドが読む対応表を書き出す。
 * Markdownには触らないので、mainへコミットする必要がない。
 */
function writeLinks(links) {
  if (dryRun) return

  const sorted = Object.fromEntries(
    Object.entries(links).sort(([left], [right]) => left.localeCompare(right))
  )

  writeFileSync(
    resolve(process.cwd(), NOTION_LINKS_FILE),
    `${JSON.stringify(sorted, null, 2)}\n`
  )
}

/*
 * Discordへの通知
 *
 * Notionに新規タスクを起票できたときだけ呼び出す。
 * Webhookが未設定、または通知に失敗した場合でもNotion同期は止めない。
 */
async function notifyDiscordTaskCreated({
  webhookUrl,
  task,
  siteUrl,
  notionUrl
}) {
  if (!webhookUrl) return

  const team = task.team || DEFAULT_TASK_FIELDS.team
  const priority = task.priority || DEFAULT_TASK_FIELDS.priority
  const milestone = task.milestone || DEFAULT_TASK_FIELDS.milestone

  const payload = {
    username: 'Palette Bullet Task Bot',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `🎯 ${task.taskId}｜${task.title}`,
        url: siteUrl,
        description:
          `新しいタスクが追加されました。\n\n` +
          `📘 [Webで詳細を見る](${siteUrl})\n` +
          `✅ [Notionでチケットを開く](${notionUrl})`,
        fields: [
          {
            name: '班',
            value: team,
            inline: true
          },
          {
            name: '優先度',
            value: priority,
            inline: true
          },
          {
            name: 'マイルストーン',
            value: milestone,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  }

  try {
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

    console.log(`[Discord通知] ${task.taskId}｜${task.title}`)
  } catch (error) {
    console.warn(
      `注意：Discord通知に失敗しました：${error.message}`
    )
  }
}

/*
 * Notionへの通信
 */

function createClient(token) {
  async function request(method, path, body) {
    const url = `${NOTION_API}${path}`

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json'
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      })

      if (response.ok) {
        if (method !== 'GET') await sleep(WRITE_INTERVAL)
        return response.json()
      }

      const detail = await response.text()
      const retriable = response.status === 429 || response.status >= 500

      if (!retriable || attempt === 3) {
        throw new Error(
          `Notion API ${method} ${path} が${response.status}を返しました。${detail}`
        )
      }

      await sleep(1000 * attempt)
    }

    throw new Error(`Notion API ${method} ${path} に接続できませんでした。`)
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body)
  }
}

export async function fetchExistingTasks(client, databaseId) {
  const tasks = new Map()
  let cursor

  do {
    const response = await client.post(`/databases/${databaseId}/query`, {
      page_size: 100,
      start_cursor: cursor
    })

    for (const page of response.results) {
      const taskId = plainText(page.properties?.['タスクID']?.rich_text).trim()
      if (!taskId) continue

      /*
       * 同じタスクIDのページが複数あるときは、先に作られたものを正とする。
       * （二重に起票されたときに、片方だけを更新し続けないため）
       */
      if (tasks.has(taskId)) {
        console.warn(
          `注意：Notionに${taskId}のページが複数あります。${tasks.get(taskId).url} を使います。`
        )
        continue
      }

      tasks.set(taskId, {
        id: page.id,
        url: page.url,
        taskId,
        title: plainText(page.properties?.['タスク']?.title).trim(),
        designUrl: page.properties?.['設計書']?.url ?? '',
        team: page.properties?.['班']?.select?.name?.trim() ?? ''
      })
    }

    cursor = response.has_more ? response.next_cursor : undefined
  } while (cursor)

  return tasks
}

/**
 * 誤採番済みのNotionページを同じページのまま正しいIDへ移行する。
 * 先にカタログ上の実タスクを確認するため、旧IDが将来再利用されても
 * その新しいタスクを移行対象にはしない。
 */
export async function migrateTaskIds({
  client,
  existingTasks,
  tasks,
  isDryRun = false,
  migrations = TASK_ID_MIGRATIONS
}) {
  const taskById = new Map(tasks.map((task) => [task.taskId, task]))
  const migrated = []

  for (const migration of migrations) {
    const task = taskById.get(migration.to)
    const previous = existingTasks.get(migration.from)
    if (!task || !previous) continue

    if (!isExpectedMigrationSource(previous, migration)) {
      const currentSourceTask = taskById.get(migration.from)
      if (
        currentSourceTask &&
        isExpectedCanonicalTask(previous, currentSourceTask)
      ) {
        continue
      }

      throw new Error(
        `Notionの${migration.from}を移行元「${migration.sourceTitle}」にも現在の実タスクにも特定できないため、自動同期を停止しました。ページを確認してから再実行してください。`
      )
    }

    if (existingTasks.has(migration.to)) {
      throw new Error(
        `Notionに${migration.from}と${migration.to}の両方があります。重複を確認してから再実行してください。`
      )
    }

    const siteUrl = `${SITE_BASE_URL}${task.url}`
    const properties = {
      タスク: { title: richText(task.title) },
      タスクID: { rich_text: richText(task.taskId) },
      設計書: { url: siteUrl }
    }

    if (isDryRun) {
      console.log(
        `[ID移行予定] ${migration.from} → ${migration.to}｜${task.title}`
      )
    } else {
      await updateTaskReferenceBlock(
        client,
        previous.id,
        migration.from,
        task,
        siteUrl
      )
      await client.patch(`/pages/${previous.id}`, { properties })
      console.log(
        `[ID移行] ${migration.from} → ${migration.to}｜${task.title}`
      )
    }

    existingTasks.delete(migration.from)
    existingTasks.set(migration.to, {
      ...previous,
      taskId: migration.to,
      title: task.title,
      designUrl: siteUrl
    })
    migrated.push(`${migration.from}→${migration.to}`)
  }

  return migrated
}

function isExpectedMigrationSource(previous, migration) {
  const actualTitle = normalizeMigrationTitle(previous.title)
  const expectedTitle = normalizeMigrationTitle(migration.sourceTitle)
  const actualDesignUrl = normalizeMigrationUrl(previous.designUrl)
  const expectedDesignUrl = normalizeMigrationUrl(migration.sourceDesignUrl)

  return Boolean(
    actualTitle &&
      expectedTitle &&
      actualTitle === expectedTitle &&
      actualDesignUrl &&
      expectedDesignUrl &&
      actualDesignUrl === expectedDesignUrl
  )
}

function isExpectedCanonicalTask(previous, task) {
  const actualTitle = normalizeMigrationTitle(previous.title)
  const expectedTitle = normalizeMigrationTitle(task.title)
  const actualDesignUrl = normalizeMigrationUrl(previous.designUrl)
  const expectedDesignUrl = normalizeMigrationUrl(
    `${SITE_BASE_URL}${task.url}`
  )

  return Boolean(
    actualTitle &&
      expectedTitle &&
      actualTitle === expectedTitle &&
      actualDesignUrl &&
      actualDesignUrl === expectedDesignUrl
  )
}

function normalizeMigrationTitle(value) {
  return String(value ?? '')
    .trim()
    .replace(/^\d+\.\s*/, '')
}

function normalizeMigrationUrl(value) {
  return String(value ?? '').trim().replace(/\/+$/, '')
}

async function updateTaskReferenceBlock(
  client,
  pageId,
  previousTaskId,
  task,
  siteUrl
) {
  const blocks = await fetchBlockChildren(client, pageId)
  const referenceBlock = blocks.find(
    (block) =>
      block.type === 'paragraph' &&
      plainText(block.paragraph?.rich_text).startsWith(`${previousTaskId}｜`)
  )

  if (!referenceBlock) {
    console.warn(
      `注意：Notionページ本文に${previousTaskId}の参照が見つからなかったため、プロパティだけを更新しました。`
    )
    return
  }

  await client.patch(`/blocks/${referenceBlock.id}`, {
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `${task.taskId}｜${task.title}`,
            link: { url: siteUrl }
          }
        }
      ]
    }
  })
}

async function fetchBlockChildren(client, blockId) {
  const blocks = []
  let cursor

  do {
    const query = new URLSearchParams({ page_size: '100' })
    if (cursor) query.set('start_cursor', cursor)

    const response = await client.get(
      `/blocks/${blockId}/children?${query.toString()}`
    )
    blocks.push(...response.results)
    cursor = response.has_more ? response.next_cursor : undefined
  } while (cursor)

  return blocks
}

function assertDatabaseSchema(database) {
  const missing = REQUIRED_PROPERTIES.filter(
    (name) => !Object.hasOwn(database.properties ?? {}, name)
  )

  if (missing.length > 0) {
    throw new Error(
      `NotionタスクDBに次のプロパティがありません：${missing.join('・')}`
    )
  }
}

/*
 * Notionページの組み立て
 */

function buildNewPage(task, databaseId, siteUrl) {
  const fields = {
    team: task.team || DEFAULT_TASK_FIELDS.team,
    priority: task.priority || DEFAULT_TASK_FIELDS.priority,
    milestone: task.milestone || DEFAULT_TASK_FIELDS.milestone
  }

  const properties = {
    タスク: { title: richText(task.title) },
    タスクID: { rich_text: richText(task.taskId) },
    設計書: { url: siteUrl },
    班: { select: { name: fields.team } },
    優先度: { select: { name: fields.priority } },
    マイルストーン: { select: { name: fields.milestone } },
    状態: { select: { name: DEFAULT_TASK_FIELDS.status } }
  }

  if (task.assignees.length > 0) {
    properties['担当'] = {
      multi_select: task.assignees.map((name) => ({ name }))
    }
  }

  if (task.due) {
    properties['期限'] = { date: { start: task.due } }
  }

  return {
    parent: { database_id: databaseId },
    icon: { type: 'emoji', emoji: categoryIcon(task) },
    properties,
    children: buildPageBody(task, siteUrl).slice(0, BLOCK_LIMIT)
  }
}

/*
 * 設計書サイト側が正の項目だけを比べる。
 * 班はfrontmatterに明示された場合だけ設計書サイトを正とする。
 * 状態・担当・期限・優先度はNotionで動かすので、ここでは扱わない。
 */
export function diffOwnedProperties(existing, task, siteUrl) {
  const changes = {}

  if (existing.title !== task.title) {
    changes['タスク'] = { title: richText(task.title) }
  }

  if (existing.designUrl !== siteUrl) {
    changes['設計書'] = { url: siteUrl }
  }

  if (task.team && existing.team !== task.team) {
    changes['班'] = { select: { name: task.team } }
  }

  return changes
}

function buildPageBody(task, siteUrl) {
  const blocks = [
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '📘' },
        color: 'blue_background',
        rich_text: richText(
          '作業内容・完了条件の正は設計書サイトです。内容を変えるときはGitHubのPull Requestで直してください。このページでは状態・担当・期限・優先度を管理します。'
        )
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `${task.taskId}｜${task.title}`,
              link: { url: siteUrl }
            }
          }
        ]
      }
    }
  ]

  const overview = [task.description, getSectionContent(task.structure, 'タスクの目的')]
    .map((value) => (value ?? '').trim())
    .filter(Boolean)
    .join('\n')

  const sections = [
    { heading: '概要', body: overview },
    { heading: '作業内容', body: getSectionContent(task.structure, '実施内容') },
    { heading: '完了条件', body: getSectionContent(task.structure, '完了条件') },
    {
      heading: '依存関係',
      body: getSectionContent(task.structure, '前提・依存タスク')
    }
  ]

  for (const section of sections) {
    const body = section.body?.trim()
    if (!body) continue

    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: richText(section.heading) }
    })
    blocks.push(...markdownToBlocks(body))
  }

  return blocks
}

/*
 * Markdownの変換
 *
 * 転記するのは箇条書き・番号付き・チェックボックス・段落だけ。
 * 表やコードブロックは設計書サイト側で読む前提なので扱わない。
 */
function markdownToBlocks(markdown) {
  const blocks = []

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const todo = line.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/)
    if (todo) {
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: richText(todo[2]),
          checked: todo[1].toLowerCase() === 'x'
        }
      })
      continue
    }

    const bullet = line.match(/^[-*+]\s+(.*)$/)
    if (bullet) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: richText(bullet[1]) }
      })
      continue
    }

    const numbered = line.match(/^\d+[.)]\s+(.*)$/)
    if (numbered) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: richText(numbered[1]) }
      })
      continue
    }

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: richText(line) }
    })
  }

  return blocks
}

/*
 * Markdownのリンクとコードだけを、Notionのリッチテキストに変換する。
 */
function richText(source) {
  const text = String(source ?? '')
  if (!text) return []

  const parts = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(plainSegment(text.slice(lastIndex, match.index)))
    }

    if (match[1] !== undefined) {
      parts.push({
        type: 'text',
        text: {
          content: truncate(match[1]),
          link: { url: absoluteUrl(match[2]) }
        }
      })
    } else {
      parts.push({
        type: 'text',
        text: { content: truncate(match[3]) },
        annotations: { code: true }
      })
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(plainSegment(text.slice(lastIndex)))
  }

  return parts.filter((part) => part.text.content.length > 0)
}

function plainSegment(value) {
  return { type: 'text', text: { content: truncate(value) } }
}

function truncate(value) {
  return value.length > TEXT_LIMIT ? `${value.slice(0, TEXT_LIMIT - 1)}…` : value
}

function absoluteUrl(url) {
  const value = url.trim()
  return value.startsWith('/') ? `${SITE_BASE_URL}${value}` : value
}

function categoryIcon(task) {
  const directory = task.relativePath.split('/')[1] ?? ''
  return CATEGORY_ICONS[directory] ?? DEFAULT_CATEGORY_ICON
}

/*
 * 実行結果の表示
 */

function report({
  created,
  migrated,
  updated,
  links,
  unchanged,
  tasks,
  databaseTitle
}) {
  const prefix = dryRun ? '（--dry-run）' : ''
  const lines = [
    `${prefix}タスクページ${tasks.length}件をNotion「${databaseTitle}」と同期しました。`,
    `- Task IDを移行：${migrated.length}件${listOf(migrated)}`,
    `- 新しく起票：${created.length}件${listOf(created)}`,
    `- 内容を更新：${updated.length}件${listOf(updated)}`,
    `- 変更なし：${unchanged.length}件`,
    `- サイトへ載せるリンク：${Object.keys(links).length}件`
  ]

  console.log(`\n${lines.join('\n')}`)

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Notion同期\n\n${lines.join('\n')}\n`
    )
  }
}

function listOf(taskIds) {
  return taskIds.length > 0 ? `（${taskIds.join('、')}）` : ''
}

/*
 * 共通処理
 */

function plainText(value) {
  if (!Array.isArray(value)) return ''
  return value.map((item) => item.plain_text ?? '').join('')
}

/*
 * IDでもURLでも受け取れるようにする。
 * データベースのURLは「.../p/<DBのID>?v=<ビューのID>」の形なので、
 * 先に出てくる32桁を使う。
 */
function normalizeId(value) {
  const match = value
    .trim()
    .match(/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i)

  return match ? match[0].replaceAll('-', '') : ''
}

function sleep(milliseconds) {
  return new Promise((done) => setTimeout(done, milliseconds))
}
