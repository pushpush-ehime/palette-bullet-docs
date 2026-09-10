import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { taskRecords, RECORDS_TEMPLATE } from '../docs/.vitepress/content/task-records.mjs'
import { setTaskTeam } from '../docs/.vitepress/content/task-team.js'
import { setRelatedSpecs } from '../docs/.vitepress/content/related-specs.js'
import { taskProgress } from '../docs/.vitepress/content/task-progress.mjs'

const record = `### 2026-09-10｜第1段階（途中経過）

- できるようになったこと：Fake入力の結果を画面で確認できる。
- 実装・制作方法：入力境界を分け、表示をUIへ集約した。
- 成果物：[確認資料](https://example.com/result)
- 確認した操作・テスト・版と結果：版v1でFake操作成功。実機は未確認。
- 実接続／Fake：入力はFake。
- 制限・残作業・対象外：実接続は次の段階。
`

test('途中・最終の記録を追記でき、Markdown内の順序を保持する', () => {
  const source = `${RECORDS_TEMPLATE}\n${record}\n${record.replace('2026-09-10｜第1段階（途中経過）', '2026-09-11｜最終確認')}`
  assert.deepEqual(taskRecords(source).records, [
    { date: '2026-09-10', stage: '第1段階（途中経過）' }, { date: '2026-09-11', stage: '最終確認' }
  ])
})

test('見出しのみ・テンプレート・ガイドのコード内記入例は未登録', () => {
  for (const source of [RECORDS_TEMPLATE, '## 実装・成果記録\n### 第1段階', readFileSync('.github/page-templates/task.md', 'utf8'), readFileSync('docs/guide/task-records.md', 'utf8')]) {
    assert.equal(taskRecords(source).count, 0)
  }
})

test('日付付きでも記入欄や見出しだけでは記録ありにしない', () => {
  for (const replacement of ['<確認できた結果>', '未記入', '未登録', '結果を記入します。', '']) {
    assert.equal(taskRecords(`${RECORDS_TEMPLATE}\n${record.replace('Fake入力の結果を画面で確認できる。', replacement)}`).count, 0)
  }
  assert.equal(taskRecords(`${RECORDS_TEMPLATE}\n### 2026-09-10｜第1段階`).count, 0)
})

test('コード・コメント・引用内の見本と別セクションの記録を数えない', () => {
  for (const body of [`\`\`\`md\n${record}\`\`\``, `<!--\n${record}\n-->`, record.split('\n').map((line) => `> ${line}`).join('\n'), `## 実施内容\n${record}`]) {
    assert.equal(taskRecords(`${RECORDS_TEMPLATE}\n${body}`).count, 0)
  }
})

test('無効な日付を数えず、正しい閏日を受け付ける', () => {
  assert.equal(taskRecords(`${RECORDS_TEMPLATE}\n${record.replace('2026-09-10', '2026-02-30')}`).count, 0)
  assert.equal(taskRecords(`${RECORDS_TEMPLATE}\n${record.replace('2026-09-10', '2028-02-29')}`).count, 1)
})

test('担当班・関連仕様を編集しても記録本文をCRLFごと保持する', () => {
  const source = `---\npageType: task\ntaskId: PB-TASK-0001\nteam: プログラム\nrelatedSpecs: []\n---\n\n# Task\n\n${RECORDS_TEMPLATE}\n${record}`.replaceAll('\n', '\r\n')
  const updated = setRelatedSpecs(setTaskTeam(source, 'デザイン'), ['/spec/player/'])
  assert.equal(updated.slice(updated.indexOf('# Task')), source.slice(source.indexOf('# Task')))
  assert.equal(taskRecords(updated).count, 1)
  assert.match(updated, /team: デザイン/)
})

test('非プログラムの資料リンクでも記録でき、未確認を明示できる', () => {
  assert.equal(taskRecords(`${RECORDS_TEMPLATE}\n${record.replace('入力はFake。', '対象外（画面素材の制作）。')}`).count, 1)
})

test('長い項目をMarkdown上で折り返しても記録として読める', () => {
  assert.equal(taskRecords(`${RECORDS_TEMPLATE}\n${record.replace('表示をUIへ集約した。', '表示をUIへ集約した。\n  入力を差し替えて確認できるようにした。')}`).count, 1)
})

test('完了・レビュー・着手と記録件数は独立している', () => {
  const source = `${RECORDS_TEMPLATE}\n${record}`
  for (const status of ['完了', 'レビュー', '着手']) {
    const snapshot = { version: 1, outcome: 'success', entries: { 'PB-TASK-0001': { kind: 'status', status, fetchedAt: '2026-09-10T03:00:00Z', notionUrl: '' } } }
    assert.equal(taskProgress(snapshot, 'PB-TASK-0001').label, status)
    assert.equal(taskRecords(source).count, 1)
  }
})
