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

function frontmatterDocument(source) {
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
      /^relatedSpecs:/.test(line.text) ? [index + 1] : []
    )

  if (keyIndexes.length > 1) {
    throw new Error('relatedSpecsがfrontmatter内に複数あります。')
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

function normalizeUrl(value) {
  if (typeof value !== 'string') {
    throw new Error('relatedSpecsのURLは文字列で指定してください。')
  }

  let url = value.trim()

  if (!url || /[\r\n]/.test(url)) {
    throw new Error('relatedSpecsに空または改行を含むURLは指定できません。')
  }

  if (!url.startsWith('/')) url = `/${url}`
  url = url.replace(/\.html$/, '').replace(/\/index$/, '/')
  return url
}

function normalizeUrls(urls) {
  if (!Array.isArray(urls)) {
    throw new Error('relatedSpecsは配列で指定してください。')
  }

  const normalized = urls.map(normalizeUrl)

  if (new Set(normalized).size !== normalized.length) {
    throw new Error('relatedSpecsに同じ仕様URLが重複しています。')
  }

  return normalized
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

/** 文頭のfrontmatterからrelatedSpecsを読み取る。 */
export function getRelatedSpecs(source) {
  const { lines, closingIndex, keyIndex } = frontmatterDocument(source)

  if (keyIndex === -1) return []

  const inlineValue = lines[keyIndex].text
    .replace(/^relatedSpecs:\s*/, '')
    .trim()

  if (inlineValue) {
    if (inlineValue === '[]') return []
    if (!inlineValue.startsWith('[') || !inlineValue.endsWith(']')) {
      throw new Error('relatedSpecsは配列で指定してください。')
    }

    const values = inlineValue.slice(1, -1).trim()
    return values
      ? normalizeUrls(values.split(',').map((value) => unquote(value)))
      : []
  }

  const urls = []
  const endIndex = fieldEnd(lines, keyIndex, closingIndex)

  for (let index = keyIndex + 1; index < endIndex; index += 1) {
    const match = /^\s+-\s+(.+?)\s*$/.exec(lines[index].text)
    if (match) urls.push(unquote(match[1]))
  }

  return normalizeUrls(urls)
}

/**
 * 文頭のfrontmatterだけを変更し、コメント・本文・改行コードを保つ。
 * 選択が0件なら、既存フィールドを空配列にして関連付けを解除する。
 */
export function setRelatedSpecs(source, urls) {
  const normalized = normalizeUrls(urls)
  const current = getRelatedSpecs(source)

  if (arraysEqual(current, normalized)) return source

  const { lines, closingIndex, keyIndex, lineBreak } = frontmatterDocument(source)

  if (keyIndex === -1) {
    const inserted = [
      { text: 'relatedSpecs:', eol: lineBreak },
      ...normalized.map((url) => ({ text: `  - ${url}`, eol: lineBreak }))
    ]
    lines.splice(closingIndex, 0, ...inserted)
    return lines.map((line) => line.text + line.eol).join('')
  }

  const endIndex = fieldEnd(lines, keyIndex, closingIndex)

  for (let index = endIndex - 1; index > keyIndex; index -= 1) {
    if (/^\s+-\s+/.test(lines[index].text)) lines.splice(index, 1)
  }

  lines[keyIndex].text = normalized.length ? 'relatedSpecs:' : 'relatedSpecs: []'

  if (normalized.length) {
    lines.splice(
      keyIndex + 1,
      0,
      ...normalized.map((url) => ({ text: `  - ${url}`, eol: lineBreak }))
    )
  }

  return lines.map((line) => line.text + line.eol).join('')
}
