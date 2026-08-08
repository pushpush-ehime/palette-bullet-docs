function splitLines(source) {
  const lines = []
  let offset = 0

  while (offset < source.length) {
    let end = offset
    while (end < source.length && source[end] !== '\r' && source[end] !== '\n') {
      end += 1
    }

    let eol = ''
    if (source[end] === '\r' && source[end + 1] === '\n') {
      eol = '\r\n'
    } else if (source[end] === '\r' || source[end] === '\n') {
      eol = source[end]
    }

    lines.push({ text: source.slice(offset, end), eol })
    offset = end + eol.length
  }

  return lines
}

const RELATION_FIELDS = new Set(['relatedSpecs', 'relatedTasks'])

function assertRelationField(field) {
  if (!RELATION_FIELDS.has(field)) {
    throw new Error(
      '関連フィールドはrelatedSpecsまたはrelatedTasksを指定してください。'
    )
  }

  return field
}

function frontmatterDocument(source, field) {
  const relationField = assertRelationField(field)
  const lines = splitLines(source)

  if (lines[0]?.text !== '---') {
    throw new Error('frontmatterが見つかりません。')
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.text === '---'
  )

  if (closingIndex === -1) {
    throw new Error('frontmatterが閉じられていません。')
  }

  const keyIndexes = lines
    .slice(1, closingIndex)
    .flatMap((line, index) =>
      line.text.startsWith(`${relationField}:`) ? [index + 1] : []
    )

  if (keyIndexes.length > 1) {
    throw new Error(`${relationField}がfrontmatter内に複数あります。`)
  }

  return {
    lines,
    closingIndex,
    keyIndex: keyIndexes[0] ?? -1,
    lineBreak: lines.find((line) => line.eol)?.eol ?? '\n'
  }
}

function fieldEnd(lines, keyIndex, closingIndex) {
  let index = keyIndex + 1

  while (
    index < closingIndex &&
    !/^[A-Za-z][A-Za-z0-9_-]*:/.test(lines[index].text)
  ) {
    index += 1
  }

  return index
}

function unquote(value) {
  const trimmed = value.trim()
  const quote = trimmed[0]

  if (
    trimmed.length >= 2 &&
    (quote === '"' || quote === "'") &&
    trimmed.at(-1) === quote
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function normalizeUrl(value, field) {
  if (typeof value !== 'string') {
    throw new Error(`${field}のURLは文字列で指定してください。`)
  }

  let url = value.trim()

  if (!url || /[\r\n]/.test(url)) {
    throw new Error(`${field}に空または改行を含むURLは指定できません。`)
  }

  if (!url.startsWith('/')) url = `/${url}`
  url = url.replace(/\.html$/, '').replace(/\/index$/, '/')
  return url
}

function normalizeUrls(urls, field) {
  if (!Array.isArray(urls)) {
    throw new Error(`${field}は配列で指定してください。`)
  }

  const normalized = urls.map((url) => normalizeUrl(url, field))
  const canonical = normalized.map((url) =>
    url === '/' ? url : url.replace(/\/+$/, '')
  )

  if (new Set(canonical).size !== canonical.length) {
    throw new Error(`${field}に同じURLが重複しています。`)
  }

  return normalized
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

/** ページ種別に対応する関連フィールド名を返す。 */
export function relationFieldForPageType(pageType) {
  if (pageType === 'spec') return 'relatedTasks'
  if (pageType === 'task') return 'relatedSpecs'

  throw new Error('関連付けを設定できるpageTypeはspecまたはtaskです。')
}

/** 関連フィールドを既存frontmatterと同じYAML形式で生成する。 */
export function formatRelatedPages(field, urls) {
  const relationField = assertRelationField(field)
  const normalized = normalizeUrls(urls, relationField)

  if (!normalized.length) return `${relationField}: []`

  return [
    `${relationField}:`,
    ...normalized.map((url) => `  - ${url}`)
  ].join('\n')
}

/** 文頭のfrontmatterから指定した関連URLを読み取る。 */
export function getRelatedPages(source, field) {
  const relationField = assertRelationField(field)
  const { lines, closingIndex, keyIndex } = frontmatterDocument(
    source,
    relationField
  )

  if (keyIndex === -1) return []

  const inlineValue = lines[keyIndex].text
    .slice(`${relationField}:`.length)
    .trim()

  if (inlineValue) {
    if (inlineValue === '[]') return []
    if (!inlineValue.startsWith('[') || !inlineValue.endsWith(']')) {
      throw new Error(`${relationField}は配列で指定してください。`)
    }

    const values = inlineValue.slice(1, -1).trim()
    return values
      ? normalizeUrls(
          values.split(',').map((value) => unquote(value)),
          relationField
        )
      : []
  }

  const urls = []
  const endIndex = fieldEnd(lines, keyIndex, closingIndex)

  for (let index = keyIndex + 1; index < endIndex; index += 1) {
    const match = /^\s+-\s+(.+?)\s*$/.exec(lines[index].text)
    if (match) urls.push(unquote(match[1]))
  }

  return normalizeUrls(urls, relationField)
}

/**
 * 文頭のfrontmatterだけを変更し、コメント・本文・改行コードを保つ。
 * 選択が0件なら、既存フィールドを空配列にして関連付けを解除する。
 */
export function setRelatedPages(source, field, urls) {
  const relationField = assertRelationField(field)
  const normalized = normalizeUrls(urls, relationField)
  const current = getRelatedPages(source, relationField)

  if (arraysEqual(current, normalized)) return source

  const { lines, closingIndex, keyIndex, lineBreak } = frontmatterDocument(
    source,
    relationField
  )

  if (keyIndex === -1) {
    const inserted = formatRelatedPages(relationField, normalized)
      .split('\n')
      .map((text) => ({ text, eol: lineBreak }))
    lines.splice(closingIndex, 0, ...inserted)
    return lines.map((line) => line.text + line.eol).join('')
  }

  const endIndex = fieldEnd(lines, keyIndex, closingIndex)

  for (let index = endIndex - 1; index > keyIndex; index -= 1) {
    if (/^\s+-\s+/.test(lines[index].text)) lines.splice(index, 1)
  }

  lines[keyIndex].text = normalized.length
    ? `${relationField}:`
    : `${relationField}: []`

  if (normalized.length) {
    lines.splice(
      keyIndex + 1,
      0,
      ...normalized.map((url) => ({ text: `  - ${url}`, eol: lineBreak }))
    )
  }

  return lines.map((line) => line.text + line.eol).join('')
}

/** 文頭のfrontmatterからrelatedSpecsを読み取る。 */
export function getRelatedSpecs(source) {
  return getRelatedPages(source, 'relatedSpecs')
}

/** 文頭のfrontmatterのrelatedSpecsだけを変更する。 */
export function setRelatedSpecs(source, urls) {
  return setRelatedPages(source, 'relatedSpecs', urls)
}

/** 文頭のfrontmatterからrelatedTasksを読み取る。 */
export function getRelatedTasks(source) {
  return getRelatedPages(source, 'relatedTasks')
}

/** 文頭のfrontmatterのrelatedTasksだけを変更する。 */
export function setRelatedTasks(source, urls) {
  return setRelatedPages(source, 'relatedTasks', urls)
}
