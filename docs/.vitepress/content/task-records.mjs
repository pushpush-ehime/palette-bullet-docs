import MarkdownIt from 'markdown-it'

export const RECORDS_HEADING = '実装・成果記録'
export const RECORDS_ANCHOR = '実装・成果記録'
export const RECORD_FIELDS = [
  'できるようになったこと', '実装・制作方法', '成果物',
  '確認した操作・テスト・版と結果', '実接続／Fake', '制限・残作業・対象外'
]
export const RECORDS_TEMPLATE = `## ${RECORDS_HEADING}

[途中経過・成果の記録方法](/guide/task-records)
`
const markdown = new MarkdownIt({ html: true })
const placeholders = /^(?:未記入|未登録|未決|未定|ここに.*|.*を記入(?:する|します)?[。.]?|[<＜].*[>＞])$/

function hasValue(value) {
  return Boolean(value && !placeholders.test(value.trim()))
}

/** 普通のMarkdown本文を読む。コード・引用・コメント内の見本は記録に数えない。 */
export function taskRecords(source) {
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
  const tokens = markdown.parse(body, {})
  let hasSection = false
  let inSection = false
  let candidate = null
  const records = []
  function finish() {
    if (candidate && RECORD_FIELDS.every((field) => hasValue(candidate.fields[field]))) {
      records.push({ date: candidate.date, stage: candidate.stage })
    }
    candidate = null
  }
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.type === 'heading_open' && token.level === 0) {
      const level = Number(token.tag.slice(1))
      const title = tokens[i + 1]?.content ?? ''
      if (level <= 2) {
        finish()
        inSection = level === 2 && title === RECORDS_HEADING
        hasSection ||= inSection
      } else if (level === 3 && inSection) {
        finish()
        const match = /^(\d{4}-\d{2}-\d{2})｜(.+)$/.exec(title)
        if (match && hasValue(match[2]) && Number.isFinite(Date.parse(`${match[1]}T00:00:00Z`)) &&
          new Date(`${match[1]}T00:00:00Z`).toISOString().startsWith(match[1])) {
          candidate = { date: match[1], stage: match[2], fields: {} }
        }
      }
    }
    // トップレベルの箇条書き内のinlineのみ（引用・ネストは除外）。
    if (inSection && candidate && token.type === 'inline' && token.level === 3 &&
      tokens[i - 2]?.type === 'list_item_open' && tokens[i - 2].level === 1) {
      const match = /^([^：]+)：\s*([\s\S]*)$/.exec(token.content)
      if (match && RECORD_FIELDS.includes(match[1])) candidate.fields[match[1]] = match[2].trim()
    }
  }
  finish()
  return { hasSection, count: records.length, records }
}
