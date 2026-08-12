import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, relative, resolve } from 'node:path'
import MarkdownIt from 'markdown-it'
import { nextTaskId, TASK_ID_PATTERN } from './task-id.js'
import { sidebarTeamKey } from './sidebar-team-filter.js'
import {
  DUE_PATTERN,
  NOTION_LINKS_FILE,
  NOTION_TASK_FIELDS,
  TASK_ONLY_KEYS
} from './notion-fields.mjs'
/**
 * @typedef {import('vitepress').DefaultTheme.SidebarItem} SidebarItem
 * @typedef {import('vitepress').DefaultTheme.SidebarMulti} SidebarMulti
 */

export const VALID_STATUSES = ['確定', '仮仕様', '未決', '対象外', '廃止']

const TASK_PAGE_ONLY_KEYS = ['taskId', ...TASK_ONLY_KEYS]
const markdown = new MarkdownIt({ html: true })
const UNCONFIRMED_SUFFIX_PATTERN = /(?:（未確定）|\(未確定\))$/

function toPosix(value) {
  return value.replaceAll('\\', '/')
}

/*
 * frontmatterの値を文字列にそろえる。
 * 数値として読み取られた値（例：order）もそのまま扱えるようにする。
 */
function toText(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value)
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }

    return entities[character]
  })
}

export function sidebarTaskText(task) {
  const text = escapeHtml(`${task.taskId} ${task.title}`)
  const teamKey = sidebarTeamKey(task.team)
  const badge = teamKey === 'unassigned'
    ? ''
    : (() => {
        const team = escapeHtml(task.team)
        return (
          `<span class="sidebar-team-badge" data-team="${teamKey}" ` +
          `title="担当班: ${team}">${team}</span>`
        )
      })()

  return (
    `<span class="sidebar-task-entry" data-sidebar-team="${teamKey}">` +
    `${badge}${text}</span>`
  )
}

function parseScalar(rawValue) {
  const value = rawValue.trim()

  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)

  if (value.startsWith('[') && value.endsWith(']')) {
    const body = value.slice(1, -1).trim()
    if (!body) return []
    return body.split(',').map((item) => parseScalar(item))
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

export function parseFrontmatter(source) {
  const normalized = source.replaceAll('\r\n', '\n')
  if (!normalized.startsWith('---\n')) {
    return { data: {}, hasFrontmatter: false }
  }

  const end = normalized.indexOf('\n---\n', 4)
  if (end === -1) {
    return { data: {}, hasFrontmatter: false }
  }

  const block = normalized.slice(4, end)
  const data = {}
  let listKey = null

  for (const line of block.split('\n')) {
    const listItem = line.match(/^\s+-\s+(.+)$/)
    if (listItem && listKey) {
      data[listKey].push(parseScalar(listItem[1]))
      continue
    }

    if (!line || /^\s/.test(line)) continue

    const property = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/)
    if (!property) continue

    const [, key, rawValue = ''] = property
    if (rawValue === '') {
      data[key] = []
      listKey = key
    } else {
      data[key] = parseScalar(rawValue)
      listKey = null
    }
  }

  return { data, hasFrontmatter: true }
}

function getDocumentStructure(source) {
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  const headings = []
  let inFrontmatter = lines[0] === '---'
  let frontmatterClosed = !inFrontmatter
  let fence = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (inFrontmatter) {
      if (index > 0 && line === '---') {
        inFrontmatter = false
        frontmatterClosed = true
      }
      continue
    }

    const fenceMarker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fenceMarker) {
      const marker = fenceMarker[1]
      if (!fence) {
        fence = { character: marker[0], length: marker.length }
      } else if (marker[0] === fence.character && marker.length >= fence.length) {
        fence = null
      }
      continue
    }

    if (fence) continue

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      headings.push({
        level: heading[1].length,
        text: heading[2].trim(),
        line: index
      })
    }
  }

  return {
    lines,
    headings,
    hasUnclosedFence: Boolean(fence),
    hasUnclosedFrontmatter: !frontmatterClosed
  }
}

export function getSectionContent(structure, headingText) {
  const headingIndex = structure.headings.findIndex(
    (heading) => heading.level === 2 && heading.text === headingText
  )
  if (headingIndex === -1) return ''

  const heading = structure.headings[headingIndex]
  const nextHeading = structure.headings
    .slice(headingIndex + 1)
    .find((candidate) => candidate.level <= heading.level)
  const endLine = nextHeading?.line ?? structure.lines.length

  return structure.lines.slice(heading.line + 1, endLine).join('\n').trim()
}

function markdownBody(source) {
  const normalized = source.replaceAll('\r\n', '\n')
  if (!normalized.startsWith('---\n')) return normalized

  const frontmatterEnd = normalized.indexOf('\n---\n', 4)
  return frontmatterEnd === -1
    ? normalized
    : normalized.slice(frontmatterEnd + 5)
}

function inlineText(token) {
  return (token.children ?? [])
    .map((child) => {
      if (child.type === 'text' || child.type === 'code_inline') {
        return child.content
      }

      if (child.type === 'image') {
        return child.content
      }

      if (child.type === 'softbreak' || child.type === 'hardbreak') {
        return ' '
      }

      if (child.type === 'html_inline') {
        return child.content.replace(/<[^>]*>/g, '')
      }

      return ''
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function listItemText(tokens, itemIndex) {
  const itemLevel = tokens[itemIndex].level

  for (let index = itemIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token.type === 'list_item_close' && token.level === itemLevel) {
      return ''
    }

    // 子の箇条書きは、その子自身のlist_item_openで個別に処理する。
    if (token.type === 'list_item_open' && token.level > itemLevel) {
      return ''
    }

    if (token.type === 'inline') {
      return inlineText(token)
    }
  }

  return ''
}

/**
 * 未確定事項として扱うMarkdownの箇条書きを、本文に現れる順で返す。
 *
 * - `## 未決事項` 内の箇条書き
 * - 本文中の任意の箇条書きで、末尾が `（未確定）` のもの
 */
export function extractOpenQuestions(source) {
  const tokens = markdown.parse(markdownBody(source), {})
  const questions = []
  const seen = new Set()
  const listTypes = []
  let inOpenQuestionsSection = false

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token.type === 'heading_open' && token.level === 0) {
      const headingLevel = Number(token.tag.slice(1))

      if (headingLevel <= 2) {
        const heading = tokens[index + 1]
        inOpenQuestionsSection =
          headingLevel === 2 &&
          heading?.type === 'inline' &&
          inlineText(heading) === '未決事項'
      }
    }

    if (token.type === 'bullet_list_open') {
      listTypes.push('bullet')
      continue
    }

    if (token.type === 'ordered_list_open') {
      listTypes.push('ordered')
      continue
    }

    if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
      listTypes.pop()
      continue
    }

    if (token.type !== 'list_item_open' || listTypes.at(-1) !== 'bullet') {
      continue
    }

    const question = listItemText(tokens, index)
    const hasUnconfirmedSuffix = UNCONFIRMED_SUFFIX_PATTERN.test(question)

    if (
      question &&
      (inOpenQuestionsSection || hasUnconfirmedSuffix) &&
      !seen.has(question)
    ) {
      seen.add(question)
      questions.push(question)
    }
  }

  return questions
}

function extractSpecSections(structure, pageType) {
  if (pageType !== 'spec') return { purpose: '', constraints: '' }

  return {
    purpose: getSectionContent(structure, '目的'),
    constraints: getSectionContent(structure, '例外・禁止事項')
  }
}

function markdownFiles(directory) {
  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue

    const fullPath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...markdownFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

export function pageUrlFromRelative(relativePath) {
  let url = `/${toPosix(relativePath)}`
  url = url.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
  return url || '/'
}

export function normalizePageUrl(value) {
  if (typeof value !== 'string') return ''

  let url = value.trim()
  if (!url.startsWith('/')) url = `/${url}`
  url = url.replace(/\.html$/, '')
  url = url.replace(/\/index$/, '/')
  return url
}

function canonicalCatalogUrl(value) {
  const normalized = normalizePageUrl(value)

  if (!normalized || normalized === '/') {
    return normalized
  }

  return normalized.replace(/\/+$/, '')
}

function updatedAt(filePath, repositoryRoot) {
  const gitPath = toPosix(relative(repositoryRoot, filePath))

  try {
    const result = execFileSync(
      'git',
      ['log', '-1', '--format=%cI', '--', gitPath],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }
    ).trim()

    if (result) return result
  } catch {
    // A copied or newly created file may not have Git history yet.
  }

  return statSync(filePath).mtime.toISOString()
}

/*
 * タスクID→NotionチケットURLの対応表を読む。
 *
 * 公開の直前に同期スクリプトが作るファイルで、Gitには入っていない。
 * 手元でのビルドやPull Requestの検査では存在しないため、
 * 見つからなければ空として扱う。
 */
function loadNotionLinks(repositoryRoot) {
  const linksPath = resolve(repositoryRoot, NOTION_LINKS_FILE)
  if (!existsSync(linksPath)) return {}

  try {
    const links = JSON.parse(readFileSync(linksPath, 'utf8'))
    return typeof links === 'object' && links !== null ? links : {}
  } catch {
    console.warn(`${NOTION_LINKS_FILE}を読めませんでした。Notionリンクなしで続けます。`)
    return {}
  }
}

export function loadCatalog({ docsRoot = resolve(process.cwd(), 'docs'), includeUpdated = true } = {}) {
  const repositoryRoot = resolve(docsRoot, '..')
  const notionLinks = loadNotionLinks(repositoryRoot)

  const entries = markdownFiles(docsRoot)
    .map((filePath) => {
      const source = readFileSync(filePath, 'utf8')
      const relativePath = toPosix(relative(docsRoot, filePath))
      const { data: frontmatter, hasFrontmatter } = parseFrontmatter(source)
      const structure = getDocumentStructure(source)
      const specSections = extractSpecSections(structure, frontmatter.pageType ?? '')

      return {
        filePath,
        relativePath,
        url: pageUrlFromRelative(relativePath),
        source,
        frontmatter,
        hasFrontmatter,
        structure,
        title: frontmatter.title ?? '',
        description: frontmatter.description ?? '',
        pageType: frontmatter.pageType ?? '',
        category: frontmatter.category ?? '',
        status: frontmatter.status ?? '',
        taskId: frontmatter.taskId ?? '',
        order: Number.isFinite(frontmatter.order) ? frontmatter.order : 9999,
        categoryOrder: Number.isFinite(frontmatter.categoryOrder)
          ? frontmatter.categoryOrder
          : 9999,
        relatedSpecs: Array.isArray(frontmatter.relatedSpecs)
          ? frontmatter.relatedSpecs.map(normalizePageUrl)
          : [],
        relatedTasks: Array.isArray(frontmatter.relatedTasks)
          ? frontmatter.relatedTasks.map(normalizePageUrl)
          : [],
        hasInlineRelations: /<PageRelations(?:\s|\/>)/.test(source),
        /*
         * Notionへ転記する進行管理の項目。
         * すべて任意で、書かれていなければ空にする。
         */
        team: toText(frontmatter.team),
        priority: toText(frontmatter.priority),
        milestone: toText(frontmatter.milestone),
        assignees: Array.isArray(frontmatter.assignees)
          ? frontmatter.assignees.map(toText)
          : [],
        due: toText(frontmatter.due),
        /*
         * NotionのURLは対応表から入れる。
         * frontmatterに手で書いた場合は、そちらを優先する。
         */
        notionUrl:
          toText(frontmatter.notionUrl) ||
          toText(notionLinks[toText(frontmatter.taskId)]),
        openQuestions: extractOpenQuestions(source),
        purpose: specSections.purpose,
        constraints: specSections.constraints,
        updatedAt: includeUpdated ? updatedAt(filePath, repositoryRoot) : ''
      }
    })

  const specCategoryOrders = new Map(
    entries
      .filter(
        (entry) =>
          entry.pageType === 'spec' &&
          basename(entry.relativePath) === 'index.md' &&
          Number.isFinite(entry.frontmatter.categoryOrder)
      )
      .map((entry) => [entry.category, entry.categoryOrder])
  )
  const taskCategoryOrders = new Map(
    entries
      .filter(
        (entry) =>
          entry.pageType === 'task-category' &&
          Number.isFinite(entry.frontmatter.categoryOrder)
      )
      .map((entry) => [entry.category, entry.categoryOrder])
  )

  for (const entry of entries) {
    if (entry.pageType === 'spec') {
      entry.categoryOrder = specCategoryOrders.get(entry.category) ?? entry.categoryOrder
    }
    if (entry.pageType === 'task') {
      entry.categoryOrder = taskCategoryOrders.get(entry.category) ?? entry.categoryOrder
    }
  }

  return entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'ja'))
}

function sortByOrder(left, right) {
  return left.order - right.order || left.title.localeCompare(right.title, 'ja')
}

function categoryDirectory(entry, rootName) {
  const parts = entry.relativePath.split('/')
  return parts[0] === rootName && parts.length >= 3 ? parts[1] : ''
}

function categoryDefinitions(catalog, pageType, rootName) {
  return catalog
    .filter(
      (entry) =>
        entry.pageType === pageType &&
        basename(entry.relativePath) === 'index.md' &&
        categoryDirectory(entry, rootName)
    )
    .sort(
      (left, right) =>
        left.categoryOrder - right.categoryOrder ||
        left.category.localeCompare(right.category, 'ja')
    )
}
/**
 * @param {ReturnType<typeof loadCatalog>} catalog
 * @param {{ leadingItems?: SidebarItem[], trailingItems?: SidebarItem[] }} [options]
 * @returns {{
 *   spec: SidebarItem[],
 *   tasks: SidebarItem[],
 *   sidebar: SidebarMulti
 * }}
 */
export function buildSidebars(
  catalog,
  { leadingItems = [], trailingItems = [] } = {}
) {
  const specRoot = catalog.find((entry) => entry.pageType === 'spec-index')
  const taskRoot = catalog.find((entry) => entry.pageType === 'task-index')

  const specCategories = categoryDefinitions(catalog, 'spec', 'spec').map(
    (categoryIndex) => {
      const directory = categoryDirectory(categoryIndex, 'spec')
      const pages = catalog
        .filter(
          (entry) =>
            entry.pageType === 'spec' &&
            categoryDirectory(entry, 'spec') === directory
        )
        .sort(sortByOrder)

      return { categoryIndex, directory, pages }
    }
  )

  const taskCategories = categoryDefinitions(
    catalog,
    'task-category',
    'tasks'
  ).map((categoryIndex) => {
    const directory = categoryDirectory(categoryIndex, 'tasks')
    const tasks = catalog
      .filter(
        (entry) =>
          entry.pageType === 'task' &&
          categoryDirectory(entry, 'tasks') === directory
      )
      .sort(sortByOrder)

    return { categoryIndex, directory, tasks }
  })

  const suggestedTaskId = nextTaskId(catalog)

  function createAddPageItem(rootName, directory, category) {
    const type = rootName === 'spec' ? 'spec' : 'task'
    const query = new URLSearchParams({
      type,
      directory,
      category
    })

    if (type === 'task') {
      query.set('taskId', suggestedTaskId)
    }

    return {
      text: '＋ このカテゴリにページを追加',
      link: `/guide/create-page?${query.toString()}`
    }
  }

  function createSpecSidebar(activeDirectory = '') {
    const specItems = [
      {
        text: specRoot?.frontmatter.sidebarTitle ?? '仕様・設計一覧',
        link: specRoot?.url ?? '/spec/'
      },
      {
        text: '仕様・タスク対応',
        link: '/relations'
      }
    ]

    specItems.push({
      text: '仕様一覧',
      collapsed: false,
      items: [
        ...specCategories.map(({ categoryIndex, directory, pages }) => {
          const items = [
            {
              text:
                categoryIndex.frontmatter.sidebarTitle ??
                categoryIndex.title,
              link: categoryIndex.url
            },
            ...pages
              .filter((page) => page.url !== categoryIndex.url)
              .map((page) => ({
                text: page.frontmatter.sidebarTitle ?? page.title,
                link: page.url
              }))
          ]

          if (directory === activeDirectory) {
            items.push(createAddPageItem('spec', directory, categoryIndex.category))
          }

          return {
            text: categoryIndex.category,
            collapsed: true,
            items
          }
        }),
        createAddCategoryItem('spec')
      ]
    })
    

    return [
      {
        text: '仕様・設計',
        items: specItems
      }
    ]
  }
  function createAddCategoryItem(rootName) {
  const type = rootName === 'spec' ? 'spec' : 'task'

    return {
      text:
        type === 'spec'
          ? '＋ 仕様カテゴリを追加'
          : '＋ タスクカテゴリを追加',
      link: `/guide/create-category?type=${type}`
    }
  }
  function createTaskSidebar(activeDirectory = '') {
    const taskItems = [
      {
        text:
          '<span class="task-sidebar-team-filter-anchor" aria-hidden="true"></span>'
      },
      {
        text: taskRoot?.frontmatter.sidebarTitle ?? 'タスク一覧',
        link: taskRoot?.url ?? '/tasks/'
      },
      {
        text: '仕様・タスク対応',
        link: '/relations'
      }
    ]

    if (taskCategories.length > 0) {
      taskItems.push({
        text: '<span class="sidebar-task-list-root">タスク一覧</span>',
        collapsed: false,
        items: [
          ...taskCategories.map(({ categoryIndex, directory, tasks }) => {
            const items = [
              {
                text:
                  categoryIndex.frontmatter.sidebarTitle ??
                  categoryIndex.title,
                link: categoryIndex.url
              },
              ...tasks
                .filter((task) => task.url !== categoryIndex.url)
                .map((task) => ({
                  text: sidebarTaskText(task),
                  link: task.url
                }))
            ]

            if (directory === activeDirectory) {
              items.push(createAddPageItem('tasks', directory, categoryIndex.category))
            }

            return {
              text: categoryIndex.category,
              collapsed: true,
              items
            }
          }),
          createAddCategoryItem('tasks')
        ]
      })
    }

    return [
      {
        text: 'タスク説明',
        items: taskItems
      }
    ]
  }

  function createFullSidebar({
    specDirectory = '',
    taskDirectory = ''
  } = {}) {
    return [
      ...leadingItems,
      ...createSpecSidebar(specDirectory),
      ...createTaskSidebar(taskDirectory),
      ...trailingItems
    ]
  }

/** @type {SidebarMulti} */
  const sidebar = {}
  // VitePressが広いパスより先にカテゴリ固有パスを判定できるよう、
  // カテゴリ固有の設定を先に登録する。
  for (const { categoryIndex, directory } of specCategories) {
    sidebar[categoryIndex.url] = createFullSidebar({
      specDirectory: directory
    })
  }

  for (const { categoryIndex, directory } of taskCategories) {
    sidebar[categoryIndex.url] = createFullSidebar({
      taskDirectory: directory
    })
  }

  // カテゴリ一覧やガイドなどでは追加欄を表示しない。
  sidebar['/spec/'] = createFullSidebar()
  sidebar['/tasks/'] = createFullSidebar()
  sidebar['/'] = createFullSidebar()

  return {
    spec: createSpecSidebar(),
    tasks: createTaskSidebar(),
    sidebar
  }
}

function expectedPageType(relativePath) {
  const parts = relativePath.split('/')

  if (parts[0] === 'spec') {
    return relativePath === 'spec/index.md' ? 'spec-index' : 'spec'
  }

  if (parts[0] === 'tasks') {
    if (relativePath === 'tasks/index.md') return 'task-index'
    if (parts.length === 3 && parts[2] === 'index.md') return 'task-category'
    return 'task'
  }

  return ''
}

export function validateCatalog(catalog) {
  const errors = []
  const urls = new Map()
  const taskIds = new Map()

  /*
   * URLの重複確認
   *
   * 例：
   * docs/spec/player.md
   * docs/spec/player/index.md
   *
   * 上記は両方とも /spec/player/ として扱われる可能性があるため、
   * 同じURLが作られていないか確認する。
   */
  for (const entry of catalog) {
    const canonicalUrl = canonicalCatalogUrl(entry.url)
    const existingEntry = urls.get(canonicalUrl)

    if (existingEntry) {
      errors.push(
        `${entry.relativePath}: URL「${entry.url}」が${existingEntry.relativePath}と重複しています。`
      )
    } else {
      urls.set(canonicalUrl, entry)
    }
  }

  /*
   * 各カテゴリのindex.mdを取得する。
   *
   * 個別ページが所属するカテゴリにindex.mdが存在するか、
   * categoryが一致しているかを確認するために使用する。
   */
  const specCategoryIndexes = new Map(
    categoryDefinitions(catalog, 'spec', 'spec').map((entry) => [
      categoryDirectory(entry, 'spec'),
      entry
    ])
  )

  const taskCategoryIndexes = new Map(
    categoryDefinitions(catalog, 'task-category', 'tasks').map((entry) => [
      categoryDirectory(entry, 'tasks'),
      entry
    ])
  )

  function validateRelatedPages(
    entry,
    { field, targetPageType, relationLabel, targetLabel }
  ) {
    if (entry.frontmatter[field] === undefined) return

    if (!Array.isArray(entry.frontmatter[field])) {
      errors.push(
        `${entry.relativePath}: ${field}は配列で指定してください。`
      )
      return
    }

    const relatedUrls = entry[field]

    const canonicalRelatedUrls = relatedUrls.map(canonicalCatalogUrl)

    if (new Set(canonicalRelatedUrls).size !== canonicalRelatedUrls.length) {
      errors.push(
        `${entry.relativePath}: ${field}に同じ${relationLabel}が重複しています。`
      )
    }

    for (const relatedUrl of relatedUrls) {
      const target = urls.get(canonicalCatalogUrl(relatedUrl))

      if (!target) {
        errors.push(
          `${entry.relativePath}: 関連${relationLabel}${relatedUrl}が見つかりません。`
        )
        continue
      }

      if (target.pageType !== targetPageType) {
        errors.push(
          `${entry.relativePath}: ${relatedUrl}は${targetLabel}ではありません。`
        )
      }
    }
  }

  for (const entry of catalog) {
    /*
     * Markdown共通の検査
     */

    if (!entry.hasFrontmatter || entry.structure.hasUnclosedFrontmatter) {
      errors.push(
        `${entry.relativePath}: frontmatterの---が正しく閉じられていません。`
      )
      continue
    }

    if (!entry.title) {
      errors.push(`${entry.relativePath}: titleがありません。`)
    }

    if (entry.structure.hasUnclosedFence) {
      errors.push(
        `${entry.relativePath}: コードブロックが閉じられていません。`
      )
    }

    /*
     * ファイルの場所とpageTypeの整合性
     */

    const requiredPageType = expectedPageType(entry.relativePath)

    if (requiredPageType && entry.pageType !== requiredPageType) {
      errors.push(
        `${entry.relativePath}: pageTypeを${requiredPageType}にしてください。`
      )
    }

    /*
     * 関連付け設定の検査
     */

    if (
      entry.frontmatter.relatedSpecs !== undefined &&
      entry.pageType !== 'task'
    ) {
      errors.push(
        `${entry.relativePath}: relatedSpecsはタスクページだけで使用してください。`
      )
    }

    if (
      entry.frontmatter.relatedTasks !== undefined &&
      entry.pageType !== 'spec'
    ) {
      errors.push(
        `${entry.relativePath}: relatedTasksは仕様ページだけで使用してください。`
      )
    }

    /*
     * Notion連携の項目はタスクページ専用。
     */

    if (entry.pageType !== 'task') {
      for (const key of TASK_PAGE_ONLY_KEYS) {
        if (entry.frontmatter[key] !== undefined) {
          errors.push(
            `${entry.relativePath}: ${key}はタスクページだけで使用してください。`
          )
        }
      }
    }

    /*
     * 仕様ページ
     */

    if (entry.pageType === 'spec') {
      if (!entry.category) {
        errors.push(`${entry.relativePath}: categoryがありません。`)
      }

      /*
       * statusは任意。
       * 記載されている場合だけ、値が正しいか確認する。
       */
      if (
        entry.status &&
        !VALID_STATUSES.includes(entry.status)
      ) {
        errors.push(
          `${entry.relativePath}: statusは${VALID_STATUSES.join('／')}のいずれかにしてください。`
        )
      }

      const directory = categoryDirectory(entry, 'spec')
      const categoryIndex = specCategoryIndexes.get(directory)

      if (!categoryIndex) {
        errors.push(
          `${entry.relativePath}: 同じカテゴリのindex.mdがありません。`
        )
      } else if (
        entry.category &&
        categoryIndex.category !== entry.category
      ) {
        errors.push(
          `${entry.relativePath}: categoryを「${categoryIndex.category}」にしてください。`
        )
      }

      validateRelatedPages(entry, {
        field: 'relatedTasks',
        targetPageType: 'task',
        relationLabel: 'タスク',
        targetLabel: 'タスクページ'
      })
    }

    /*
     * タスクカテゴリページ
     */

    if (entry.pageType === 'task-category') {
      if (!entry.category) {
        errors.push(`${entry.relativePath}: categoryがありません。`)
      }
    }

    /*
     * タスクページ
     */

    if (entry.pageType === 'task') {
      if (!entry.category) {
        errors.push(`${entry.relativePath}: categoryがありません。`)
      }

      /*
       * タスクID
       */

      if (!TASK_ID_PATTERN.test(entry.taskId)) {
        errors.push(
          `${entry.relativePath}: taskIdはPB-TASK-0001形式にしてください。`
        )
      } else {
        const normalizedId = entry.taskId.toUpperCase()
        const existingTaskPath = taskIds.get(normalizedId)

        if (existingTaskPath) {
          errors.push(
            `${entry.relativePath}: taskIdが${existingTaskPath}と重複しています。`
          )
        } else {
          taskIds.set(normalizedId, entry.relativePath)
        }

        /*
         * ファイル名とタスクIDの一致
         *
         * PB-TASK-0001
         * ↓
         * pb-task-0001.md
         */
        const expectedFileName = `${entry.taskId.toLowerCase()}.md`

        if (basename(entry.relativePath) !== expectedFileName) {
          errors.push(
            `${entry.relativePath}: ファイル名を${expectedFileName}にしてください。`
          )
        }
      }

      /*
       * タスクカテゴリとの整合性
       */

      const directory = categoryDirectory(entry, 'tasks')
      const categoryIndex = taskCategoryIndexes.get(directory)

      if (!categoryIndex) {
        errors.push(
          `${entry.relativePath}: 同じカテゴリのindex.mdがありません。`
        )
      } else if (
        entry.category &&
        categoryIndex.category !== entry.category
      ) {
        errors.push(
          `${entry.relativePath}: categoryを「${categoryIndex.category}」にしてください。`
        )
      }

      validateRelatedPages(entry, {
        field: 'relatedSpecs',
        targetPageType: 'spec',
        relationLabel: '仕様',
        targetLabel: '仕様ページ'
      })

      /*
       * Notionへ転記する項目の検査。
       *
       * すべて任意。書かれている場合だけ、NotionタスクDBの
       * 選択肢に存在する値かどうかを確認する。
       * ここで弾いておかないと、Notion側に選択肢が増えてしまう。
       */
      for (const field of NOTION_TASK_FIELDS) {
        const value = entry.frontmatter[field.key]
        if (value === undefined) continue

        if (field.type === 'multi_select') {
          if (!Array.isArray(value)) {
            errors.push(
              `${entry.relativePath}: ${field.key}は配列で指定してください（例：[高平, 下條]）。`
            )
            continue
          }

          const names = value.map(toText)

          if (new Set(names).size !== names.length) {
            errors.push(
              `${entry.relativePath}: ${field.key}に同じ名前が重複しています。`
            )
          }

          for (const name of names) {
            if (!field.options.includes(name)) {
              errors.push(
                `${entry.relativePath}: ${field.key}の「${name}」はNotionの「${field.property}」にありません。`
              )
            }
          }

          continue
        }

        const text = toText(value)

        if (field.type === 'date') {
          if (!DUE_PATTERN.test(text)) {
            errors.push(
              `${entry.relativePath}: ${field.key}は2026-08-10の形式で指定してください。`
            )
          }
          continue
        }

        if (!field.options.includes(text)) {
          errors.push(
            `${entry.relativePath}: ${field.key}は${field.options.join('／')}のいずれかにしてください。`
          )
        }
      }

      /*
       * notionUrlは通常、同期スクリプトが作る対応表から入る。
       * frontmatterへ手で書くこともできるので、その場合だけ形式を確認する。
       */
      if (
        entry.frontmatter.notionUrl !== undefined &&
        !/^https:\/\/\S+$/.test(toText(entry.frontmatter.notionUrl))
      ) {
        errors.push(
          `${entry.relativePath}: notionUrlはhttpsで始まるNotionページのURLにしてください。`
        )
      }
    }
  }

  return errors
}

export function assertValidCatalog(catalog) {
  const errors = validateCatalog(catalog)
  if (errors.length > 0) {
    throw new Error(`設計書の検査に失敗しました。\n\n${errors.map((error) => `- ${error}`).join('\n')}`)
  }
}
