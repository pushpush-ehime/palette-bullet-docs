/**
 * 設計書サイトのタスクページをNotionのタスクDBへ同期する。
 *
 *   node scripts/notion-sync.mjs            同期する
 *   node scripts/notion-sync.mjs --dry-run  実行せずに内容だけ表示する
 *
 * 必要な環境変数
 *   NOTION_TOKEN       Notionインテグレーションのトークン（ntn_で始まる）
 *   NOTION_TASK_DB_ID  タスクDBのID
 *
 * 役割分担
 *   設計書サイト … 作業内容・完了条件の正。タスク名と設計書URLはこちらが上書きする。
 *   Notion       … 進行管理の正。状態・担当・期限・優先度は起票時だけ書き込み、
 *                  以降は触らない（人がNotion上で動かすため）。
 */

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import {
  getSectionContent,
  loadCatalog,
  validateCatalog
} from '../docs/.vitepress/content/catalog.mjs'
import {
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
  DEFAULT_TASK_FIELDS,
  SITE_BASE_URL
} from '../docs/.vitepress/content/notion-fields.mjs'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

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

main().catch((error) => {
  console.error(`同期に失敗しました：${error.message}`)
  process.exitCode = 1
})

async function main() {
  const token = process.env.NOTION_TOKEN?.trim()
  const databaseId = normalizeId(process.env.NOTION_TASK_DB_ID ?? '')

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

  const created = []
  const updated = []
  const linked = []
  const unchanged = []

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

    if (!notionUrl) continue

    const rewritten = writeBackNotionUrl(task, notionUrl, databaseTitle)

    if (rewritten) {
      linked.push(task.taskId)
      console.log(`[書き戻し] ${task.relativePath}`)
    }
  }

  report({ created, updated, linked, unchanged, tasks, databaseTitle })
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

async function fetchExistingTasks(client, databaseId) {
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
        title: plainText(page.properties?.['タスク']?.title).trim(),
        designUrl: page.properties?.['設計書']?.url ?? ''
      })
    }

    cursor = response.has_more ? response.next_cursor : undefined
  } while (cursor)

  return tasks
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
 * 状態・担当・期限・優先度はNotionで動かすので、ここでは扱わない。
 */
function diffOwnedProperties(existing, task, siteUrl) {
  const changes = {}

  if (existing.title !== task.title) {
    changes['タスク'] = { title: richText(task.title) }
  }

  if (existing.designUrl !== siteUrl) {
    changes['設計書'] = { url: siteUrl }
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
 * 設計書サイト側への書き戻し
 */

function writeBackNotionUrl(task, notionUrl, databaseTitle) {
  const source = readFileSync(task.filePath, 'utf8')
  const usesCrlf = source.includes('\r\n')
  const normalized = source.replaceAll('\r\n', '\n')

  const frontmatterEnd = normalized.indexOf('\n---\n', 4)
  if (frontmatterEnd === -1) return false

  const frontmatter = normalized.slice(4, frontmatterEnd).split('\n')
  const body = normalized.slice(frontmatterEnd + 5)

  const notionUrlIndex = frontmatter.findIndex((line) =>
    line.startsWith('notionUrl:')
  )

  if (notionUrlIndex === -1) {
    const taskIdIndex = frontmatter.findIndex((line) =>
      line.startsWith('taskId:')
    )
    frontmatter.splice(taskIdIndex + 1, 0, `notionUrl: ${notionUrl}`)
  } else {
    frontmatter[notionUrlIndex] = `notionUrl: ${notionUrl}`
  }

  const label = `[${task.taskId}（${databaseTitle.replaceAll(/[[\]]/g, '')}）](${notionUrl})`
  const updatedBody = body.replace(
    /^- Notionタスク：.*$/m,
    `- Notionタスク：${label}`
  )

  if (!/^- Notionタスク：/m.test(body)) {
    console.warn(
      `注意：${task.relativePath}に「- Notionタスク：」の行がないため、本文は書き換えていません。`
    )
  }

  const rebuilt = `---\n${frontmatter.join('\n')}\n---\n${updatedBody}`
  const output = usesCrlf ? rebuilt.replaceAll('\n', '\r\n') : rebuilt

  if (output === source) return false
  if (dryRun) return true

  writeFileSync(task.filePath, output)
  return true
}

/*
 * 実行結果の表示
 */

function report({ created, updated, linked, unchanged, tasks, databaseTitle }) {
  const prefix = dryRun ? '（--dry-run）' : ''
  const lines = [
    `${prefix}タスクページ${tasks.length}件をNotion「${databaseTitle}」と同期しました。`,
    `- 新しく起票：${created.length}件${listOf(created)}`,
    `- 内容を更新：${updated.length}件${listOf(updated)}`,
    `- 設計書側へURLを書き戻し：${linked.length}件${listOf(linked)}`,
    `- 変更なし：${unchanged.length}件`
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
