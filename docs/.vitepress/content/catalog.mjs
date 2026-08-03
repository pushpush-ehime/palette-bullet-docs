import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, relative, resolve } from 'node:path'

export const VALID_STATUSES = ['確定', '仮仕様', '未決', '対象外', '廃止']

const SPEC_HEADINGS = [
  'ページ概要',
  '目的',
  'プレイヤーから見た挙動',
  '詳細仕様',
  '状態別の挙動',
  '他システムとの接続',
  '例外・禁止事項',
  'パラメータ',
  '未決事項',
  '関連タスク'
]

const TASK_HEADINGS = [
  'タスクの目的',
  '完成時にできるようになること',
  '関連する仕様',
  '実施内容',
  '対象範囲',
  '対象外',
  '完了条件',
  '確認手順',
  '前提・依存タスク',
  '実装時の注意点',
  '提出・報告方法',
  '関連リンク'
]

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

export function buildSidebars(catalog) {
  const specRoot = catalog.find((entry) => entry.pageType === 'spec-index')
  const taskRoot = catalog.find((entry) => entry.pageType === 'task-index')

  //
  // 仕様・設計
  //
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

  const specCategoryItems = []

  for (const categoryIndex of categoryDefinitions(catalog, 'spec', 'spec')) {
    const directory = categoryDirectory(categoryIndex, 'spec')
    const pages = catalog
      .filter(
        (entry) =>
          entry.pageType === 'spec' &&
          categoryDirectory(entry, 'spec') === directory
      )
      .sort(sortByOrder)

    if (pages.length === 1) {
      specCategoryItems.push({
        text: categoryIndex.frontmatter.sidebarTitle ?? categoryIndex.title,
        link: categoryIndex.url
      })
      continue
    }

    specCategoryItems.push({
      text: categoryIndex.category,
      collapsed: categoryIndex.frontmatter.collapsed ?? true,
      items: pages.map((page) => ({
        text: page.frontmatter.sidebarTitle ?? page.title,
        link: page.url
      }))
    })
  }

  if (specCategoryItems.length > 0) {
    specItems.push({
      text: '仕様一覧',
      collapsed: false,
      items: specCategoryItems
    })
  }

  //
  // タスク
  //
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

  const taskCategoryItems = []

  for (const categoryIndex of categoryDefinitions(catalog, 'task-category', 'tasks')) {
    const directory = categoryDirectory(categoryIndex, 'tasks')

    const tasks = catalog
      .filter(
        (entry) =>
          entry.pageType === 'task' &&
          categoryDirectory(entry, 'tasks') === directory
      )
      .sort(sortByOrder)

    if (tasks.length === 0) {
      taskCategoryItems.push({
        text: categoryIndex.category,
        link: categoryIndex.url
      })
      continue
    }

    taskCategoryItems.push({
      text: categoryIndex.category,
      collapsed: categoryIndex.frontmatter.collapsed ?? true,
      items: [
        {
          text: categoryIndex.frontmatter.sidebarTitle ?? categoryIndex.title,
          link: categoryIndex.url
        },
        ...tasks.map((task) => ({
          text: `${task.taskId} ${task.title}`,
          link: task.url
        }))
      ]
    })
  }

  if (taskCategoryItems.length > 0) {
    taskItems.push({
      text: 'タスク一覧',
      collapsed: false,
      items: taskCategoryItems
    })
  }

  return {
    spec: [
      {
        text: '仕様・設計',
        items: specItems
      }
    ],
    tasks: [
      {
        text: 'タスク説明',
        items: taskItems
      }
    ]
  }
}

function validateRequiredHeadings(entry, requiredHeadings, errors) {
  const levelTwo = entry.structure.headings.filter((heading) => heading.level === 2)
  let previousIndex = -1

  for (const required of requiredHeadings) {
    const index = levelTwo.findIndex((heading) => heading.text === required)
    if (index === -1) {
      errors.push(`${entry.relativePath}: 「## ${required}」がありません。`)
      continue
    }

    if (index < previousIndex) {
      errors.push(`${entry.relativePath}: 「## ${required}」の順番が違います。`)
    }
    previousIndex = index

    if (!getSectionContent(entry.structure, required)) {
      errors.push(`${entry.relativePath}: 「## ${required}」の内容が空です。`)
    }
  }
}

function validateRelationComponent(entry, headingText, errors) {
  const content = getSectionContent(entry.structure, headingText)
  if (content !== '<PageRelations />') {
    errors.push(
      `${entry.relativePath}: 「## ${headingText}」の内容は<PageRelations />だけにしてください。`
    )
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
  const urls = new Map(catalog.map((entry) => [entry.url, entry]))
  const taskIds = new Map()
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
    if (!entry.hasFrontmatter || entry.structure.hasUnclosedFrontmatter) {
      errors.push(`${entry.relativePath}: frontmatterの---が正しく閉じられていません。`)
      continue
    }

    if (!entry.title) errors.push(`${entry.relativePath}: titleがありません。`)
    if (!entry.description) errors.push(`${entry.relativePath}: descriptionがありません。`)
    if (entry.structure.hasUnclosedFence) {
      errors.push(`${entry.relativePath}: コードブロックが閉じられていません。`)
    }

    const requiredPageType = expectedPageType(entry.relativePath)
    if (requiredPageType && entry.pageType !== requiredPageType) {
      errors.push(
        `${entry.relativePath}: pageTypeを${requiredPageType}にしてください。`
      )
    }

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

    const h1 = entry.structure.headings.filter((heading) => heading.level === 1)
    if (entry.pageType !== 'home' && h1.length !== 1) {
      errors.push(`${entry.relativePath}: H1（# 見出し）は1つにしてください。`)
    }

    let previousLevel = 0
    for (const heading of entry.structure.headings) {
      if (previousLevel && heading.level > previousLevel + 1) {
        errors.push(
          `${entry.relativePath}: 見出し「${heading.text}」のレベルが飛んでいます。`
        )
      }
      previousLevel = heading.level
    }

    if (entry.pageType === 'spec') {
      if (!entry.category) errors.push(`${entry.relativePath}: categoryがありません。`)
      if (!VALID_STATUSES.includes(entry.status)) {
        errors.push(
          `${entry.relativePath}: statusは${VALID_STATUSES.join('／')}のいずれかにしてください。`
        )
      }
      if (!Number.isFinite(entry.frontmatter.order)) {
        errors.push(`${entry.relativePath}: orderがありません。`)
      }

      const directory = categoryDirectory(entry, 'spec')
      const categoryIndex = specCategoryIndexes.get(directory)
      if (!categoryIndex) {
        errors.push(`${entry.relativePath}: 同じカテゴリのindex.mdがありません。`)
      } else if (categoryIndex.category !== entry.category) {
        errors.push(
          `${entry.relativePath}: categoryを「${categoryIndex.category}」にしてください。`
        )
      }

      if (basename(entry.relativePath) === 'index.md' && !Number.isFinite(entry.frontmatter.categoryOrder)) {
        errors.push(`${entry.relativePath}: categoryOrderがありません。`)
      }

      if (h1[0] && h1[0].text !== entry.title) {
        errors.push(`${entry.relativePath}: H1を「# ${entry.title}」にしてください。`)
      }

      validateRequiredHeadings(entry, SPEC_HEADINGS, errors)
      validateRelationComponent(entry, '関連タスク', errors)
    }

    if (entry.pageType === 'task-category') {
      if (!entry.category) errors.push(`${entry.relativePath}: categoryがありません。`)
      if (!Number.isFinite(entry.frontmatter.categoryOrder)) {
        errors.push(`${entry.relativePath}: categoryOrderがありません。`)
      }
    }

    if (entry.pageType === 'task') {
      if (!entry.category) errors.push(`${entry.relativePath}: categoryがありません。`)
      if (!Number.isFinite(entry.frontmatter.order)) {
        errors.push(`${entry.relativePath}: orderがありません。`)
      }
      if (!/^PB-TASK-\d{4}$/.test(entry.taskId)) {
        errors.push(`${entry.relativePath}: taskIdはPB-TASK-0001形式にしてください。`)
      } else {
        const normalizedId = entry.taskId.toUpperCase()
        if (taskIds.has(normalizedId)) {
          errors.push(
            `${entry.relativePath}: taskIdが${taskIds.get(normalizedId)}と重複しています。`
          )
        } else {
          taskIds.set(normalizedId, entry.relativePath)
        }

        const expectedFileName = `${entry.taskId.toLowerCase()}.md`
        if (basename(entry.relativePath) !== expectedFileName) {
          errors.push(`${entry.relativePath}: ファイル名を${expectedFileName}にしてください。`)
        }
      }

      const directory = categoryDirectory(entry, 'tasks')
      const categoryIndex = taskCategoryIndexes.get(directory)
      if (!categoryIndex) {
        errors.push(`${entry.relativePath}: 同じカテゴリのindex.mdがありません。`)
      } else if (categoryIndex.category !== entry.category) {
        errors.push(
          `${entry.relativePath}: categoryを「${categoryIndex.category}」にしてください。`
        )
      }

      if (!Array.isArray(entry.frontmatter.relatedSpecs) || entry.relatedSpecs.length === 0) {
        errors.push(`${entry.relativePath}: relatedSpecsを1件以上指定してください。`)
      }

      if (new Set(entry.relatedSpecs).size !== entry.relatedSpecs.length) {
        errors.push(`${entry.relativePath}: relatedSpecsに同じ仕様が重複しています。`)
      }

      for (const relatedSpec of entry.relatedSpecs) {
        const target = urls.get(relatedSpec)
        if (!target || target.pageType !== 'spec') {
          errors.push(`${entry.relativePath}: 関連仕様${relatedSpec}が見つかりません。`)
        }
      }

      const expectedH1 = `${entry.taskId}｜${entry.title}`
      if (h1[0] && h1[0].text !== expectedH1) {
        errors.push(`${entry.relativePath}: H1を「# ${expectedH1}」にしてください。`)
      }

      validateRequiredHeadings(entry, TASK_HEADINGS, errors)
      validateRelationComponent(entry, '関連する仕様', errors)
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
