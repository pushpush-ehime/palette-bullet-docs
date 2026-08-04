import type { CatalogEntry } from '../content/catalog.data.js'

const REPOSITORY = 'pushpush-ehime/palette-bullet-docs'
const DEFAULT_BRANCH = 'main'
const TASK_ROOT = 'docs/tasks'
const FALLBACK_DIRECTORY = 'other'
const FALLBACK_CATEGORY = 'その他'
/**
 * GitHubは7000文字ほどでURLを受け付けなくなる。日本語は1文字9文字に符号化されるため、
 * 転記量は段階的に減らし、それでも収まらない場合は転記なしにする。
 */
const URL_LIMIT = 6000
const QUOTE_STEPS = [
  { quoteLimit: 400, questionLimit: 10 },
  { quoteLimit: 250, questionLimit: 6 },
  { quoteLimit: 150, questionLimit: 4 },
  { quoteLimit: 80, questionLimit: 3 }
]
const PLACEHOLDERS = ['', '未決', 'なし', '未定']

export interface TaskLocation {
  directory: string
  category: string
}

export function nextTaskId(catalog: CatalogEntry[]) {
  const maxNumber = catalog.reduce((max, entry) => {
    const matched = /^PB-TASK-(\d{4})$/.exec(entry.taskId ?? '')
    return matched ? Math.max(max, Number(matched[1])) : max
  }, 0)

  return `PB-TASK-${String(maxNumber + 1).padStart(4, '0')}`
}

export function taskLocation(catalog: CatalogEntry[], specUrl: string): TaskLocation {
  const categories = new Map<string, string>()

  for (const entry of catalog) {
    if (entry.pageType !== 'task-category') continue
    const directory = /^\/tasks\/([^/]+)\/$/.exec(entry.url)?.[1]
    if (directory) categories.set(directory, entry.category)
  }

  const specDirectory = /^\/spec\/([^/]+)/.exec(specUrl)?.[1] ?? ''
  const category = categories.get(specDirectory)

  return category
    ? { directory: specDirectory, category }
    : {
        directory: FALLBACK_DIRECTORY,
        category: categories.get(FALLBACK_DIRECTORY) ?? FALLBACK_CATEGORY
      }
}

function yamlValue(value: string) {
  const single = value.replaceAll('\n', ' ').replace(/\s+/g, ' ').trim()
  const needsQuote = /^[[{#&*!|>%@`'"-]/.test(single) || /:\s/.test(single) || single.endsWith(':')

  return needsQuote ? `"${single.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"` : single
}

/** 置換文字列の`$&`などが展開されないよう、置換は必ず関数で渡す。 */
function setField(source: string, key: string, value: string) {
  return source.replace(new RegExp(`^${key}:.*$`, 'm'), () => `${key}: ${value}`)
}

function setRelatedSpecs(source: string, urls: string[]) {
  const list = urls.map((url) => `  - ${url}\n`).join('')
  return source.replace(/^relatedSpecs:\n(?:[ \t]+-.*\n)*/m, () => `relatedSpecs:\n${list}`)
}

function sectionRange(lines: string[], heading: string) {
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) return null

  let end = start + 1
  while (end < lines.length && !lines[end].startsWith('## ')) end += 1

  return { start, end }
}

function sectionBody(source: string, heading: string) {
  const lines = source.split('\n')
  const range = sectionRange(lines, heading)
  return range ? lines.slice(range.start + 1, range.end).join('\n').trim() : ''
}

function fillSection(source: string, heading: string, body: string) {
  const lines = source.split('\n')
  const range = sectionRange(lines, heading)
  if (!range) return source

  return [
    ...lines.slice(0, range.start + 1),
    '',
    body.trim(),
    '',
    ...lines.slice(range.end)
  ].join('\n')
}

function meaningful(content: string) {
  const trimmed = (content ?? '').trim()
  return PLACEHOLDERS.includes(trimmed) ? '' : trimmed
}

/** 途中で切れたコードフェンスは閉じる。閉じ忘れは検査エラーになる。 */
function closeFences(text: string) {
  const fences = text.match(/^\s{0,3}```/gm)?.length ?? 0
  return fences % 2 === 0 ? text : `${text}\n\`\`\``
}

function quoteFromSpec(content: string, quoteLimit: number) {
  const lines = content.split('\n').map((line) => line.replace(/^#{3,6}\s+(.*)$/, '**$1**'))
  const normalized = lines.join('\n').trim()

  if (normalized.length <= quoteLimit) return closeFences(normalized)

  const kept: string[] = []
  let length = 0

  for (const line of lines) {
    if (kept.length && length + line.length > quoteLimit) break
    kept.push(line)
    length += line.length + 1
  }

  return `${closeFences(kept.join('\n').trim())}\n\n（続きは仕様ページを参照してください）`
}

function questionList(questions: string[], questionLimit: number) {
  const shown = questions.slice(0, questionLimit).map((question) => `- ${question}`)
  const rest = questions.length - shown.length

  if (rest > 0) shown.push(`- （ほか${rest}件は仕様ページを参照してください）`)

  return shown.join('\n')
}

export interface DraftOptions {
  copySpecContent?: boolean
  quoteLimit?: number
  questionLimit?: number
}

export function buildTaskDraft(
  template: string,
  spec: CatalogEntry,
  taskId: string,
  category: string,
  {
    copySpecContent = true,
    quoteLimit = QUOTE_STEPS[0].quoteLimit,
    questionLimit = QUOTE_STEPS[0].questionLimit
  }: DraftOptions = {}
) {
  const title = `${spec.title}の実装`
  let draft = template

  draft = setField(draft, 'title', yamlValue(title))
  draft = setField(draft, 'description', yamlValue(`「${spec.title}」の仕様を実装する`))
  draft = setField(draft, 'taskId', taskId)
  draft = setField(draft, 'category', yamlValue(category))
  draft = setRelatedSpecs(draft, [spec.url])
  draft = draft.replace(/^# .*$/m, () => `# ${taskId}｜${title}`)

  const purpose = copySpecContent ? meaningful(spec.purpose) : ''
  if (purpose) {
    draft = fillSection(
      draft,
      'タスクの目的',
      `仕様「${spec.title}」の目的から転記しています。タスクとして達成することに書き換えてください。\n\n${quoteFromSpec(purpose, quoteLimit)}`
    )
  }

  const notes: string[] = []
  const constraints = copySpecContent ? meaningful(spec.constraints) : ''
  if (constraints) {
    notes.push(`仕様の「例外・禁止事項」から転記：\n\n${quoteFromSpec(constraints, quoteLimit)}`)
  }
  if (copySpecContent && spec.openQuestions.length) {
    const questions = questionList(spec.openQuestions, questionLimit)
    notes.push(`仕様の未決事項（着手前に決める必要があります）：\n\n${questions}`)
  }
  if (!copySpecContent) {
    notes.push('仕様ページの「例外・禁止事項」と「未決事項」を読んでから着手してください。')
  }
  if (notes.length) {
    draft = fillSection(draft, '実装時の注意点', notes.join('\n\n'))
  }

  const links = sectionBody(draft, '関連リンク')
  draft = fillSection(
    draft,
    '関連リンク',
    `- 仕様ページ：[${spec.title}](${spec.url})\n${links}`
  )

  return draft
}

export function taskFilePath(location: TaskLocation, taskId: string) {
  return `${TASK_ROOT}/${location.directory}/${taskId.toLowerCase()}.md`
}

export function newTaskUrl(location: TaskLocation, taskId: string, content: string) {
  const filename = `${location.directory}/${taskId.toLowerCase()}.md`

  return (
    `https://github.com/${REPOSITORY}/new/${DEFAULT_BRANCH}/${TASK_ROOT}` +
    `?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(content)}`
  )
}

/** URLがGitHubの上限に収まるまで転記量を減らし、最後は転記なしの雛形へ落とす。 */
export function newTaskLink(
  template: string,
  spec: CatalogEntry,
  taskId: string,
  location: TaskLocation
) {
  const draftUrl = (options: DraftOptions) =>
    newTaskUrl(location, taskId, buildTaskDraft(template, spec, taskId, location.category, options))

  for (const step of QUOTE_STEPS) {
    const url = draftUrl(step)
    if (url.length <= URL_LIMIT) return url
  }

  return draftUrl({ copySpecContent: false })
}
