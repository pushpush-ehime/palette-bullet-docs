import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSidebars,
  extractOpenQuestions,
  loadCatalog
} from '../docs/.vitepress/content/catalog.mjs'

test('未決事項セクションと末尾マーカーから箇条書きを抽出する', () => {
  const source = `---
title: テスト
examples:
  - frontmatterの例（未確定）
---

- 通常の項目
* スキル（未確定）
+ 半角マーカー(未確定)
- 文中（未確定）の項目
- 句点付き（未確定）。
1. 番号付き（未確定）

\`\`\`md
## 未決事項
- コード例（未確定）
\`\`\`

## 未決事項

- 入力方法
  - 補足
- [仕様](/spec/player/)の\`値\`
- スキル（未確定）

### 詳細

- 詳細項目

## 確定事項

- 別件（未確定）
`

  assert.deepEqual(extractOpenQuestions(source), [
    'スキル（未確定）',
    '半角マーカー(未確定)',
    '入力方法',
    '補足',
    '仕様の値',
    '詳細項目',
    '別件（未確定）'
  ])
})

test('複数行・装飾付きの項目を可視テキストとして扱い重複を除く', () => {
  const source = `- **表示**を
  決める（未確定）

## 未決事項

- **表示**を
  決める（未確定）
- 画像 ![見本](/example.png) を確認
`

  assert.deepEqual(extractOpenQuestions(source), [
    '表示を 決める（未確定）',
    '画像 見本 を確認'
  ])
})

test('未決事項セクションは次のH1またはH2で終了する', () => {
  const source = `## 未決事項

- 対象

## 次の章

- 対象外

# 別ページ相当

- 対象外2
`

  assert.deepEqual(extractOpenQuestions(source), ['対象'])
})

test('実カタログでは全ページを対象にし、説明内のコード例を拾わない', () => {
  const catalog = loadCatalog({ includeUpdated: false })
  const player = catalog.find((page) => page.url === '/spec/player/')
  const guide = catalog.find((page) => page.url === '/guide/how-to-use')

  assert.ok(player.openQuestions.includes('スキル（未確定）'))
  assert.deepEqual(guide.openQuestions, [])
})

test('未確定事項一覧はすべてのサイドバーの末尾に一度だけ置く', () => {
  const catalog = loadCatalog({ includeUpdated: false })
  const trailingItem = {
    text: '未確定事項一覧',
    link: '/open-questions'
  }
  const sidebars = buildSidebars(catalog, {
    trailingItems: [trailingItem]
  }).sidebar

  for (const items of Object.values(sidebars)) {
    assert.deepEqual(items.at(-1), trailingItem)
    assert.equal(
      JSON.stringify(items).match(/\/open-questions/g)?.length,
      1
    )
  }
})
