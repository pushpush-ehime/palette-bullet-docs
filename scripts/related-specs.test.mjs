import assert from 'node:assert/strict'
import test from 'node:test'
import { parseFrontmatter } from '../docs/.vitepress/content/catalog.mjs'
import {
  formatRelatedPages,
  getRelatedPages,
  getRelatedSpecs,
  getRelatedTasks,
  relationFieldForPageType,
  setRelatedPages,
  setRelatedSpecs,
  setRelatedTasks
} from '../docs/.vitepress/content/related-specs.js'

test('relatedSpecsを複数選択の内容へ置き換える', () => {
  const source = [
    '---',
    'title: タスク',
    'pageType: task',
    'relatedSpecs:',
    '  - /spec/old/',
    '---',
    '',
    '# 本文',
    '',
    '本文中のrelatedSpecs: は変更しない',
    ''
  ].join('\r\n')

  const updated = setRelatedSpecs(source, [
    '/spec/player/basic-movement',
    '/spec/camera/collision'
  ])

  assert.deepEqual(getRelatedSpecs(updated), [
    '/spec/player/basic-movement',
    '/spec/camera/collision'
  ])
  assert.deepEqual(parseFrontmatter(updated).data.relatedSpecs, [
    '/spec/player/basic-movement',
    '/spec/camera/collision'
  ])
  assert.match(updated, /本文中のrelatedSpecs: は変更しない/)
  assert.equal(updated.replaceAll('\r\n', '').includes('\n'), false)
})

test('relatedSpecsがないfrontmatterへ追加してURLを正規化する', () => {
  const source = `---
title: タスク
pageType: task
---

# 本文
`
  const updated = setRelatedSpecs(source, [
    '/spec/player/',
    ' /spec/camera/ '
  ])

  assert.deepEqual(getRelatedSpecs(updated), [
    '/spec/player/',
    '/spec/camera/'
  ])
  assert.match(
    updated,
    /pageType: task\nrelatedSpecs:\n  - \/spec\/player\/\n  - \/spec\/camera\/\n---/
  )
})

test('リスト途中のコメントを保ち、古い仕様URLをすべて除く', () => {
  const source = `---
title: タスク
relatedSpecs:
  - /spec/old-a

  # このコメントは残す
  - /spec/old-b
priority: B
---

本文
`
  const updated = setRelatedSpecs(source, ['/spec/new'])

  assert.deepEqual(getRelatedSpecs(updated), ['/spec/new'])
  assert.doesNotMatch(updated, /\/spec\/old-/)
  assert.match(updated, /  # このコメントは残す/)
  assert.match(updated, /priority: B/)
})

test('無効な空白付きキーで区切らずcatalogと同じ範囲を更新する', () => {
  const source = `---
title: タスク
relatedSpecs:
  - /spec/old-a
priority : B
  - /spec/old-b
status: 確定
---
`
  const updated = setRelatedSpecs(source, ['/spec/new'])

  assert.deepEqual(getRelatedSpecs(updated), ['/spec/new'])
  assert.deepEqual(parseFrontmatter(updated).data.relatedSpecs, ['/spec/new'])
  assert.doesNotMatch(updated, /\/spec\/old-/)
  assert.match(updated, /priority : B/)
})

test('同じ選択は元のMarkdownをそのまま返す', () => {
  const source = `---\r
relatedSpecs:\r
  - spec/player/index\r
---\r
本文`

  assert.equal(setRelatedSpecs(source, ['/spec/player/']), source)
})

test('relatedSpecsの重複は安全のため拒否する', () => {
  const source = `---
relatedSpecs: []
---
`

  assert.throws(
    () => setRelatedSpecs(source, ['/spec/player/', 'spec/player/index']),
    /重複/
  )
  assert.throws(
    () => setRelatedSpecs(source, ['/spec/player', '/spec/player/']),
    /重複/
  )
  assert.throws(
    () => getRelatedSpecs(`---
relatedSpecs: []
relatedSpecs: []
---
`),
    /複数/
  )
})

test('選択をすべて外すとrelatedSpecsを空配列にする', () => {
  const source = `---
title: タスク
relatedSpecs: [/spec/player/, '/spec/camera/']
---

本文
`
  const updated = setRelatedSpecs(source, [])

  assert.match(updated, /relatedSpecs: \[\]/)
  assert.deepEqual(getRelatedSpecs(updated), [])
  assert.deepEqual(parseFrontmatter(updated).data.relatedSpecs, [])
})

test('壊れたfrontmatterはrelatedSpecs更新前に拒否する', () => {
  assert.throws(
    () => setRelatedSpecs('# frontmatterなし', ['/spec/player/']),
    /frontmatterが見つかりません/
  )
  assert.throws(
    () => getRelatedSpecs('---\ntitle: 閉じていない'),
    /frontmatterが閉じられていません/
  )
})

test('ページ種別から保存する関連フィールドを選べる', () => {
  assert.equal(relationFieldForPageType('spec'), 'relatedTasks')
  assert.equal(relationFieldForPageType('task'), 'relatedSpecs')
  assert.throws(() => relationFieldForPageType('spec-index'), /specまたはtask/)
})

test('relatedTasksもrelatedSpecsと同じ形式で生成・更新できる', () => {
  const source = [
    '---',
    'title: 仕様',
    'pageType: spec',
    'relatedTasks: [/tasks/old.html]',
    'status: 未決',
    '---',
    '',
    '# 本文',
    '',
    '本文中のrelatedTasks: は変更しない',
    ''
  ].join('\r\n')

  const updated = setRelatedTasks(source, [
    '/tasks/player/pb-task-0001',
    'tasks/camera/pb-task-0003'
  ])

  assert.deepEqual(getRelatedTasks(updated), [
    '/tasks/player/pb-task-0001',
    '/tasks/camera/pb-task-0003'
  ])
  assert.deepEqual(
    getRelatedPages(updated, 'relatedTasks'),
    getRelatedTasks(updated)
  )
  assert.deepEqual(parseFrontmatter(updated).data.relatedTasks, [
    '/tasks/player/pb-task-0001',
    '/tasks/camera/pb-task-0003'
  ])
  assert.match(updated, /本文中のrelatedTasks: は変更しない/)
  assert.equal(updated.replaceAll('\r\n', '').includes('\n'), false)
})

test('関連フィールドのYAML生成は空配列と複数URLで共通化される', () => {
  assert.equal(formatRelatedPages('relatedSpecs', []), 'relatedSpecs: []')
  assert.equal(
    formatRelatedPages('relatedTasks', [
      'tasks/player/pb-task-0001.html',
      '/tasks/camera/pb-task-0003'
    ]),
    [
      'relatedTasks:',
      '  - /tasks/player/pb-task-0001',
      '  - /tasks/camera/pb-task-0003'
    ].join('\n')
  )
})

test('汎用setは指定した関連フィールドだけを更新する', () => {
  const source = `---
title: 仕様
relatedSpecs:
  - /spec/keep
relatedTasks:
  - /tasks/old
---

本文
`
  const updated = setRelatedPages(source, 'relatedTasks', ['/tasks/new'])

  assert.deepEqual(getRelatedSpecs(updated), ['/spec/keep'])
  assert.deepEqual(getRelatedTasks(updated), ['/tasks/new'])
  assert.match(updated, /relatedSpecs:\n  - \/spec\/keep/)
})

test('relatedTasksの空選択・重複・不正フィールドを安全に扱う', () => {
  const source = `---
title: 仕様
pageType: spec
relatedTasks:
  - /tasks/old
---
`
  const empty = setRelatedTasks(source, [])

  assert.match(empty, /relatedTasks: \[\]\n---/)
  assert.deepEqual(getRelatedTasks(empty), [])
  assert.throws(
    () => setRelatedTasks(source, ['/tasks/a', 'tasks/a.html']),
    /relatedTasks.*重複/
  )
  assert.throws(
    () => getRelatedPages(source, 'relatedPages'),
    /relatedSpecsまたはrelatedTasks/
  )
})
