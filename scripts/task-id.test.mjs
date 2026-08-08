import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSidebars,
  validateCatalog
} from '../docs/.vitepress/content/catalog.mjs'
import { nextTaskId } from '../docs/.vitepress/content/task-id.js'
import { migrateTaskIds } from './notion-sync.mjs'

function catalogEntry({
  relativePath,
  url,
  pageType,
  title,
  category = '',
  taskId = '',
  team = '',
  order = 9999,
  categoryOrder = 9999,
  frontmatter = {}
}) {
  const data = {
    title,
    pageType,
    ...frontmatter
  }

  if (category) data.category = category
  if (taskId) data.taskId = taskId
  if (team) data.team = team

  return {
    filePath: relativePath,
    relativePath,
    url,
    source: '',
    frontmatter: data,
    hasFrontmatter: true,
    structure: {
      lines: [],
      headings: [],
      hasUnclosedFence: false,
      hasUnclosedFrontmatter: false
    },
    title,
    description: '',
    pageType,
    category,
    status: '',
    taskId,
    order,
    categoryOrder,
    relatedSpecs: [],
    team,
    priority: '',
    milestone: '',
    assignees: [],
    due: '',
    notionUrl: '',
    openQuestions: [],
    purpose: '',
    constraints: '',
    updatedAt: ''
  }
}

function findSidebarItem(items, link) {
  for (const item of items) {
    if (item.link === link) return item
    const nested = item.items ? findSidebarItem(item.items, link) : undefined
    if (nested) return nested
  }

  return undefined
}

test('次のTask IDは実タスクだけから求める', () => {
  const catalog = [
    { pageType: 'task', taskId: 'PB-TASK-0003' },
    { pageType: 'task', taskId: 'PB-TASK-0010' },
    { pageType: 'task-category', taskId: 'PB-TASK-9999' },
    { pageType: 'spec', taskId: 'PB-TASK-8888' }
  ]

  assert.equal(nextTaskId(catalog), 'PB-TASK-0011')
})

test('カテゴリページのtaskIdを検査で拒否する', () => {
  const category = catalogEntry({
    relativePath: 'tasks/bgm/index.md',
    url: '/tasks/bgm/',
    pageType: 'task-category',
    title: 'BGM',
    category: 'BGM',
    taskId: 'PB-TASK-0011'
  })

  const errors = validateCatalog([category])
  assert.ok(
    errors.some(
      (error) =>
        error.includes('taskId') && error.includes('タスクページだけ')
    )
  )
})

test('サイドバーはteamに応じた班ラベルを付ける', () => {
  const catalog = [
    catalogEntry({
      relativePath: 'tasks/index.md',
      url: '/tasks/',
      pageType: 'task-index',
      title: 'タスク一覧'
    }),
    catalogEntry({
      relativePath: 'tasks/bgm/index.md',
      url: '/tasks/bgm/',
      pageType: 'task-category',
      title: 'BGM',
      category: 'BGM',
      taskId: 'PB-TASK-9999'
    }),
    catalogEntry({
      relativePath: 'tasks/bgm/pb-task-0001.md',
      url: '/tasks/bgm/pb-task-0001',
      pageType: 'task',
      title: '音源を用意する <確認>',
      category: 'BGM',
      taskId: 'PB-TASK-0001',
      team: 'サウンド',
      order: 10
    }),
    catalogEntry({
      relativePath: 'tasks/bgm/pb-task-0002.md',
      url: '/tasks/bgm/pb-task-0002',
      pageType: 'task',
      title: 'MIDI読込を実装する',
      category: 'BGM',
      taskId: 'PB-TASK-0002',
      team: 'プログラム',
      order: 20
    }),
    catalogEntry({
      relativePath: 'tasks/bgm/pb-task-0003.md',
      url: '/tasks/bgm/pb-task-0003',
      pageType: 'task',
      title: '担当未設定',
      category: 'BGM',
      taskId: 'PB-TASK-0003',
      order: 30
    })
  ]

  const sidebar = buildSidebars(catalog).sidebar['/tasks/bgm/']
  const sound = findSidebarItem(sidebar, '/tasks/bgm/pb-task-0001')
  const programmer = findSidebarItem(sidebar, '/tasks/bgm/pb-task-0002')
  const unassigned = findSidebarItem(sidebar, '/tasks/bgm/pb-task-0003')
  const addPage = findSidebarItem(
    sidebar,
    '/guide/create-page?type=task&directory=bgm&category=BGM&taskId=PB-TASK-0004'
  )

  assert.match(sound.text, /data-team="sound"/)
  assert.match(sound.text, /サウンド/)
  assert.match(sound.text, /&lt;確認&gt;/)
  assert.doesNotMatch(sound.text, /<確認>/)
  assert.match(programmer.text, /data-team="programmer"/)
  assert.doesNotMatch(programmer.text, /data-team="sound"/)
  assert.doesNotMatch(unassigned.text, /sidebar-team-badge/)
  assert.ok(addPage)
})

test('Notionの旧IDを同じページのまま正しいIDへ移行する', async () => {
  const calls = []
  const client = {
    async get(path) {
      calls.push({ method: 'GET', path })
      return {
        results: [
          {
            id: 'reference-block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                { plain_text: 'PB-TASK-0012｜DryWetMIDIの導入' }
              ]
            }
          }
        ],
        has_more: false
      }
    },
    async patch(path, body) {
      calls.push({ method: 'PATCH', path, body })
      return {}
    }
  }
  const existingTasks = new Map([
    [
      'PB-TASK-0012',
      {
        id: 'drywet-page',
        url: 'https://www.notion.so/drywet',
        taskId: 'PB-TASK-0012',
        title: 'DryWetMIDIの導入',
        designUrl:
          'https://pushpush-ehime.github.io/palette-bullet-docs/tasks/music-chart-scriptableobject/pb-task-0012'
      }
    ]
  ])
  const tasks = [
    {
      taskId: 'PB-TASK-0011',
      title: '02. DryWetMIDIの導入',
      url: '/tasks/music-chart-scriptableobject/pb-task-0011'
    }
  ]

  const migrated = await migrateTaskIds({
    client,
    existingTasks,
    tasks,
    isDryRun: false
  })

  assert.deepEqual(migrated, ['PB-TASK-0012→PB-TASK-0011'])
  assert.equal(existingTasks.has('PB-TASK-0012'), false)
  assert.equal(existingTasks.get('PB-TASK-0011').id, 'drywet-page')
  assert.equal(calls[0].path, '/blocks/drywet-page/children?page_size=100')
  assert.equal(calls[1].path, '/blocks/reference-block')
  assert.equal(
    calls[1].body.paragraph.rich_text[0].text.content,
    'PB-TASK-0011｜02. DryWetMIDIの導入'
  )
  assert.equal(calls[2].path, '/pages/drywet-page')
  assert.equal(
    calls[2].body.properties.タスクID.rich_text[0].text.content,
    'PB-TASK-0011'
  )
})

test('旧ページは旧IDが再利用されても先に正しいIDへ移行する', async () => {
  const calls = []
  const client = {
    async get(path) {
      calls.push({ method: 'GET', path })
      return {
        results: [
          {
            id: 'reference-block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                { plain_text: 'PB-TASK-0012｜DryWetMIDIの導入' }
              ]
            }
          }
        ],
        has_more: false
      }
    },
    async patch(path, body) {
      calls.push({ method: 'PATCH', path, body })
      return {}
    }
  }
  const existingTasks = new Map([
    [
      'PB-TASK-0012',
      {
        id: 'drywet-page',
        taskId: 'PB-TASK-0012',
        title: 'DryWetMIDIの導入',
        designUrl:
          'https://pushpush-ehime.github.io/palette-bullet-docs/tasks/music-chart-scriptableobject/pb-task-0012'
      }
    ]
  ])
  const tasks = [
    { taskId: 'PB-TASK-0011', title: 'DryWetMIDI', url: '/task-0011' },
    { taskId: 'PB-TASK-0012', title: '次のタスク', url: '/task-0012' }
  ]

  const migrated = await migrateTaskIds({
    client,
    existingTasks,
    tasks,
    isDryRun: false
  })

  assert.deepEqual(migrated, ['PB-TASK-0012→PB-TASK-0011'])
  assert.equal(existingTasks.has('PB-TASK-0012'), false)
  assert.equal(existingTasks.get('PB-TASK-0011').id, 'drywet-page')
  assert.equal(calls[2].path, '/pages/drywet-page')
})

test('再利用後の新しい旧IDページには移行を適用しない', async () => {
  const calls = []
  const client = {
    async get(path) {
      calls.push({ method: 'GET', path })
      return { results: [], has_more: false }
    },
    async patch(path, body) {
      calls.push({ method: 'PATCH', path, body })
      return {}
    }
  }
  const existingTasks = new Map([
    [
      'PB-TASK-0011',
      {
        id: 'drywet-page',
        taskId: 'PB-TASK-0011',
        title: '02. DryWetMIDIの導入',
        designUrl:
          'https://pushpush-ehime.github.io/palette-bullet-docs/tasks/music-chart-scriptableobject/pb-task-0011'
      }
    ],
    [
      'PB-TASK-0012',
      {
        id: 'new-task-page',
        taskId: 'PB-TASK-0012',
        title: '次のタスク',
        designUrl:
          'https://pushpush-ehime.github.io/palette-bullet-docs/task-0012'
      }
    ]
  ])
  const tasks = [
    { taskId: 'PB-TASK-0011', title: 'DryWetMIDI', url: '/task-0011' },
    { taskId: 'PB-TASK-0012', title: '次のタスク', url: '/task-0012' }
  ]

  const migrated = await migrateTaskIds({
    client,
    existingTasks,
    tasks,
    isDryRun: false
  })

  assert.deepEqual(migrated, [])
  assert.deepEqual(calls, [])
  assert.equal(existingTasks.get('PB-TASK-0012').id, 'new-task-page')
})

test('再利用後の旧IDページも現在のタスクと一致しなければ停止する', async () => {
  const existingTasks = new Map([
    [
      'PB-TASK-0012',
      {
        id: 'unidentified-page',
        taskId: 'PB-TASK-0012',
        title: 'DryWetMIDIの導入',
        designUrl: 'https://example.invalid/old-url'
      }
    ]
  ])
  const tasks = [
    { taskId: 'PB-TASK-0011', title: 'DryWetMIDI', url: '/task-0011' },
    { taskId: 'PB-TASK-0012', title: '次のタスク', url: '/task-0012' }
  ]

  await assert.rejects(
    migrateTaskIds({
      client: {},
      existingTasks,
      tasks,
      isDryRun: false
    }),
    /現在の実タスクにも特定できない/
  )
})

test('移行元を識別できないときはNotion同期を安全に停止する', async () => {
  const existingTasks = new Map([
    [
      'PB-TASK-0012',
      {
        id: 'unknown-page',
        taskId: 'PB-TASK-0012',
        title: '別のタスク',
        designUrl: 'https://example.invalid/pb-task-0012'
      }
    ]
  ])
  const tasks = [
    { taskId: 'PB-TASK-0011', title: 'DryWetMIDI', url: '/task-0011' }
  ]

  await assert.rejects(
    migrateTaskIds({
      client: {},
      existingTasks,
      tasks,
      isDryRun: false
    }),
    /移行元.*現在の実タスクにも特定できない/
  )
})
