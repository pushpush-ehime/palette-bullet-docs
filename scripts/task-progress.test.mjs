import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { collectProgress, normalizeDatabaseId, progressEntries, readNotionProgress } from './notion-progress.mjs'
import { formatProgressTime, matchesTaskProgress, safeNotionUrl, taskProgress } from '../docs/.vitepress/content/task-progress.mjs'
import { loadCatalog } from '../docs/.vitepress/content/catalog.mjs'
import { STATUSES } from '../docs/.vitepress/content/notion-fields.mjs'

const ids = ['PB-TASK-0001', 'PB-TASK-0002', 'PB-TASK-0003', 'PB-TASK-0004']
const date = '2026-09-10T03:04:05.000Z'
const nextDate = '2026-09-11T03:05:06.000Z'
const databaseId = '123456781234123412341234567890ab'
function page(id, status, type = 'select', extra = {}) {
  return {
    url: `https://www.notion.so/${id}`, ...extra,
    properties: {
      タスクID: { type: 'rich_text', rich_text: [{ plain_text: id }] },
      状態: { type, [type]: status === null ? null : { name: status } },
      担当: { multi_select: [{ name: 'PRIVATE_MEMBER' }] }
    }
  }
}
const pages = STATUSES.map((status, index) => page(ids[index], status))
const previous = { version: 1, outcome: 'success', attemptedAt: date, entries: progressEntries(pages, ids, date) }

test('Notionの4状態と取得完了の実時刻を保持し、公開項目を限定する', async () => {
  const times = [date, nextDate]
  const result = await collectProgress({ taskIds: ids, token: 'secret', databaseId, read: async () => pages, now: () => times.shift() })
  assert.equal(result.attemptedAt, date)
  assert.deepEqual(ids.map((id) => taskProgress(result, id).label), STATUSES)
  assert.ok(Object.values(result.entries).every((entry) => entry.fetchedAt === nextDate))
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_MEMBER|secret|properties|担当/)
  assert.equal(formatProgressTime(nextDate), '2026/09/11 12:05:06 JST')
})

test('未連携・未設定・未知・ID重複を4状態へ置き換えない', () => {
  const input = [page(ids[1], null), page(ids[2], 'PRIVATE_UNKNOWN'), page(ids[3], '完了'), page(ids[3], '未着手')]
  const result = { ...previous, entries: progressEntries(input, ids, date) }
  assert.deepEqual(ids.map((id) => taskProgress(result, id).kind), ['unlinked', 'unset', 'unknown', 'duplicate'])
  assert.equal(result.entries[ids[3]].notionUrl, '')
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_UNKNOWN/)
})

test('status型にも対応し、不正な状態プロパティは未知にする', () => {
  const broken = page(ids[1], '完了'); delete broken.properties['状態']
  const result = progressEntries([page(ids[0], 'レビュー', 'status'), broken], ids, date)
  assert.equal(result[ids[0]].status, 'レビュー')
  assert.equal(result[ids[1]].kind, 'unknown')
})

test('削除・archivedページを除外し、設計書から消えたIDを公開しない', () => {
  const result = progressEntries([page(ids[0], '完了', 'select', { archived: true }), page(ids[1], '完了', 'select', { in_trash: true }), page('PB-TASK-9999', '着手')], ids.slice(0, 2), date)
  assert.deepEqual(Object.values(result).map((entry) => entry.kind), ['unlinked', 'unlinked'])
  assert.equal(result['PB-TASK-9999'], undefined)
})

for (const configured of [true, false]) {
  test(`${configured ? '取得失敗' : 'Tokenなし'}では前回情報と元の取得日時を維持する`, async () => {
    let reads = 0
    const result = await collectProgress({ taskIds: ids, previous, token: configured ? 'secret' : '', databaseId, now: () => nextDate,
      read: async () => { reads++; throw new Error('PRIVATE_ERROR') } })
    assert.equal(reads, configured ? 1 : 0)
    assert.equal(result.outcome, configured ? 'failed' : 'unconfigured')
    assert.equal(taskProgress(result, ids[3]).label, '完了')
    assert.equal(taskProgress(result, ids[3]).fetchedAt, date)
    assert.equal(taskProgress(result, ids[3]).stale, true)
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_ERROR/)
  })
}

test('前回情報がない・壊れた場合も状態不明として区別する', async () => {
  const failed = await collectProgress({ taskIds: ids, token: 'secret', databaseId, previous: { version: 1, entries: { [ids[0]]: { kind: 'status', status: '完了', fetchedAt: 'invalid' } } }, read: async () => { throw new Error() } })
  assert.equal(taskProgress(failed, ids[0]).label, '取得失敗')
  assert.equal(taskProgress(failed, ids[0]).fetchedAt, '')
  assert.equal(taskProgress(null, ids[0]).label, '状態不明（未取得）')
  assert.equal(taskProgress({ ...previous, version: 99 }, ids[0]).kind, 'unavailable')
})

test('完了からレビューへ戻ったとき最新状態に追従する', async () => {
  const result = await collectProgress({ taskIds: ids, previous, token: 'secret', databaseId, read: async () => [page(ids[3], 'レビュー')], now: () => nextDate })
  assert.equal(taskProgress(result, ids[3]).label, 'レビュー')
  assert.equal(taskProgress(result, ids[3]).stale, false)
})

test('ローカルの重複IDは外部通信前に拒否する', async () => {
  await assert.rejects(() => collectProgress({ taskIds: [ids[0], ids[0]], read: () => assert.fail('通信禁止') }), /重複/)
})

test('DB取得とquery POSTのページ送り以外の通信をしない', async () => {
  const requests = []
  const responses = [
    { properties: { タスクID: { type: 'rich_text' }, 状態: { type: 'select' } } },
    { results: pages.slice(0, 2), has_more: true, next_cursor: 'cursor-2' },
    { results: pages.slice(2), has_more: false, next_cursor: null }
  ]
  const result = await readNotionProgress({ token: 'secret', databaseId, fetchImpl: async (url, options) => {
    requests.push({ url, ...options }); return { ok: true, json: async () => responses.shift() }
  } })
  assert.deepEqual(result, pages)
  assert.deepEqual(requests.map(({ method }) => method), ['GET', 'POST', 'POST'])
  assert.equal(requests[0].url, `https://api.notion.com/v1/databases/${databaseId}`)
  assert.ok(requests.slice(1).every(({ url }) => url.endsWith('/query')))
  assert.equal(JSON.parse(requests[2].body).start_cursor, 'cursor-2')
  assert.equal(requests[0].headers['Notion-Version'], '2022-06-28')
})

for (const code of [401, 429, 500]) {
  test(`HTTP ${code}は取得失敗、レスポンス本文はログ・公開データに出さない`, async () => {
    await assert.rejects(() => readNotionProgress({ token: 'secret', databaseId, fetchImpl: async () => ({ ok: false, status: code, text: () => assert.fail('本文を読まない') }) }), new RegExp(String(code)))
  })
}

test('2ページ目の失敗では部分結果を公開せず前回全体を維持する', async () => {
  let call = 0
  const result = await collectProgress({ taskIds: ids, previous, token: 'secret', databaseId, read: (options) => readNotionProgress({ ...options, fetchImpl: async () => {
    call++
    if (call === 3) throw new Error('network')
    return { ok: true, json: async () => call === 1 ? { properties: { タスクID: { type: 'rich_text' }, 状態: { type: 'select' } } } : { results: [page(ids[0], '完了')], has_more: true, next_cursor: 'next' } }
  } }) })
  assert.equal(result.outcome, 'failed')
  assert.deepEqual(result.entries, previous.entries)
})

test('URLとして設定されたDB IDを既存同期と同じ方法で読む', () => {
  assert.equal(normalizeDatabaseId(`https://notion.so/p/${databaseId}?v=other`), databaseId)
  assert.equal(normalizeDatabaseId('invalid'), '')
})

test('不正なスキーマ・ページ送りを取得成功として扱わない', async () => {
  const schema = { properties: { タスクID: { type: 'rich_text' }, 状態: { type: 'select' } } }
  for (const responses of [
    [{}],
    [schema, { results: [], has_more: true, next_cursor: null }],
    [schema, { results: [], has_more: true, next_cursor: 'same' }, { results: [], has_more: true, next_cursor: 'same' }],
    [schema, { results: null, has_more: false }]
  ]) {
    await assert.rejects(() => readNotionProgress({ token: 'secret', databaseId,
      fetchImpl: async () => ({ ok: true, json: async () => responses.shift() }) }))
  }
})

test('Notion以外のURLや認証情報を含むURLを公開しない', () => {
  for (const url of ['javascript:alert(1)', 'https://notion.so.evil.example/a', 'https://user:secret@notion.so/a']) {
    assert.equal(safeNotionUrl(url), '')
  }
  assert.equal(safeNotionUrl('https://www.notion.so/page'), 'https://www.notion.so/page')
})

test('カテゴリ移動後もタスクIDで結び付き、仕様statusを変更しない', () => {
  const root = mkdtempSync(join(tmpdir(), 'pb-progress-'))
  try {
    mkdirSync(join(root, 'docs/tasks/new'), { recursive: true })
    mkdirSync(join(root, 'docs/.vitepress/content'), { recursive: true })
    writeFileSync(join(root, 'docs/.vitepress/content/task-progress.json'), JSON.stringify(previous))
    writeFileSync(join(root, 'docs/tasks/new/pb-task-0001.md'), `---\npageType: task\ntaskId: ${ids[0]}\ncategory: new\n---\n# Task\n`)
    writeFileSync(join(root, 'docs/spec.md'), '---\npageType: spec\nstatus: 確定\n---\n# Spec\n')
    const catalog = loadCatalog({ docsRoot: join(root, 'docs'), includeUpdated: false })
    const task = catalog.find((entry) => entry.taskId === ids[0])
    assert.equal(task.progress.label, '未着手')
    assert.equal(task.notionUrl, previous.entries[ids[0]].notionUrl)
    assert.equal(task.url, '/tasks/new/pb-task-0001')
    assert.equal(matchesTaskProgress(task, '未着手'), true)
    assert.equal(matchesTaskProgress(task, '完了'), false)
    assert.equal(matchesTaskProgress(task, ''), true)
    const spec = catalog.find((entry) => entry.pageType === 'spec')
    assert.equal(spec.status, '確定'); assert.equal(spec.progress, null)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('日次12時は既存公開と同じ直列経路で、起票・Discord送信をスキップする', () => {
  const workflow = readFileSync(resolve('.github/workflows/deploy.yml'), 'utf8')
  assert.match(workflow, /cron: '0 3 \* \* \*'/)
  assert.equal((workflow.match(/cron:/g) ?? []).length, 1)
  assert.match(workflow, /group: pages\s+cancel-in-progress: false/)
  assert.match(workflow, /name: Sync tasks to Notion\s+if: github.event_name != 'schedule'/)
  const progressStep = workflow.split('- name: Read task progress from Notion')[1].split('- name:')[0]
  assert.doesNotMatch(progressStep, /DISCORD|notion-sync/)
  assert.match(progressStep, /npm run notion:progress/)
  assert.match(workflow, /ref: main/)
  assert.match(workflow, /SOURCE_SHA: \$\{\{ needs.build.outputs.source_sha \}\}/)
  assert.match(workflow, /if: steps.current.outputs.publish == 'true'/)
})
