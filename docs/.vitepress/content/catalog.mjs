import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, relative, resolve } from 'node:path'
/**
 * @typedef {import('vitepress').DefaultTheme.SidebarItem} SidebarItem
 * @typedef {import('vitepress').DefaultTheme.SidebarMulti} SidebarMulti
 */

export const VALID_STATUSES = ['確定', '仮仕様', '未決', '対象外', '廃止']

function toPosix(value) {
  return value.replaceAll('\\', '/')
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

function getSectionContent(structure, headingText) {
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

function extractOpenQuestions(structure) {
  const content = getSectionContent(structure, '未決事項')
  if (!content || content === '未決' || content === 'なし') return []

  return content
    .split('\n')
    .map((line) => line.match(/^\s*[-*+]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .map((question) =>
      question
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replaceAll('`', '')
    )
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

export function loadCatalog({ docsRoot = resolve(process.cwd(), 'docs'), includeUpdated = true } = {}) {
  const repositoryRoot = resolve(docsRoot, '..')

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
        openQuestions: extractOpenQuestions(structure),
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
 * @param {{ leadingItems?: SidebarItem[] }} [options]
 * @returns {{
 *   spec: SidebarItem[],
 *   tasks: SidebarItem[],
 *   sidebar: SidebarMulti
 * }}
 */
export function buildSidebars(catalog, { leadingItems = [] } = {}) {
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

  function createAddPageItem(rootName, directory) {
    const defaultFileName =
      rootName === 'spec' ? 'new-spec.md' : 'pb-task-0000.md'
    const encodedDirectory = encodeURIComponent(directory)

    return {
      text: '＋ このカテゴリにページを追加',
      link:
        `https://github.com/pushpush-ehime/palette-bullet-docs/` +
        `new/main/docs/${rootName}?filename=${encodedDirectory}/${defaultFileName}`,
      target: '_blank',
      rel: 'noopener noreferrer'
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

    if (specCategories.length > 0) {
      specItems.push({
        text: '仕様一覧',
        collapsed: false,
        items: specCategories.map(({ categoryIndex, directory, pages }) => {
          const items = [
            {
              text:
                categoryIndex.frontmatter.sidebarTitle ?? categoryIndex.title,
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
            items.push(createAddPageItem('spec', directory))
          }

          return {
            text: categoryIndex.category,
            collapsed:
              directory === activeDirectory
                ? false
                : (categoryIndex.frontmatter.collapsed ?? true),
            items
          }
        })
      })
    }

    return [
      {
        text: '仕様・設計',
        items: specItems
      }
    ]
  }

  function createTaskSidebar(activeDirectory = '') {
    const taskItems = [
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
        text: 'タスク一覧',
        collapsed: false,
        items: taskCategories.map(({ categoryIndex, directory, tasks }) => {
          const items = [
            {
              text:
                categoryIndex.frontmatter.sidebarTitle ?? categoryIndex.title,
              link: categoryIndex.url
            },
            ...tasks
              .filter((task) => task.url !== categoryIndex.url)
              .map((task) => ({
                text: `${task.taskId} ${task.title}`,
                link: task.url
              }))
          ]

          if (directory === activeDirectory) {
            items.push(createAddPageItem('tasks', directory))
          }

          return {
            text: categoryIndex.category,
            collapsed:
              directory === activeDirectory
                ? false
                : (categoryIndex.frontmatter.collapsed ?? true),
            items
          }
        })
      })
    }

    return [
      {
        text: 'タスク説明',
        items: taskItems
      }
    ]
  }

  function createFullSidebar({ specDirectory = '', taskDirectory = '' } = {}) {
    return [
      ...leadingItems,
      ...createSpecSidebar(specDirectory),
      ...createTaskSidebar(taskDirectory)
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

    if (entry.frontmatter.relatedTasks !== undefined) {
      errors.push(
        `${entry.relativePath}: relatedTasksは使わず、タスク側のrelatedSpecsで関係を指定してください。`
      )
    }

    if (
      entry.frontmatter.relatedSpecs !== undefined &&
      entry.pageType !== 'task'
    ) {
      errors.push(
        `${entry.relativePath}: relatedSpecsはタスクページだけで使用してください。`
      )
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

      if (!/^PB-TASK-\d{4}$/.test(entry.taskId)) {
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

      /*
       * relatedSpecsは任意。
       *
       * 指定されている場合だけ、
       * 配列・重複・リンク先を確認する。
       */
      if (entry.frontmatter.relatedSpecs !== undefined) {
        if (!Array.isArray(entry.frontmatter.relatedSpecs)) {
          errors.push(
            `${entry.relativePath}: relatedSpecsは配列で指定してください。`
          )
        } else {
          if (
            new Set(entry.relatedSpecs).size !==
            entry.relatedSpecs.length
          ) {
            errors.push(
              `${entry.relativePath}: relatedSpecsに同じ仕様が重複しています。`
            )
          }

          for (const relatedSpec of entry.relatedSpecs) {
            const target = urls.get(
              canonicalCatalogUrl(relatedSpec)
            )

            if (!target) {
              errors.push(
                `${entry.relativePath}: 関連仕様${relatedSpec}が見つかりません。`
              )
              continue
            }

            if (target.pageType !== 'spec') {
              errors.push(
                `${entry.relativePath}: ${relatedSpec}は仕様ページではありません。`
              )
            }
          }
        }
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
