import MarkdownIt from 'markdown-it'
import { withBase } from 'vitepress'

export const MARKDOWN_PREVIEW_MESSAGE = 'palette-bullet:markdown-preview'
export const MARKDOWN_PREVIEW_READY_MESSAGE = 'palette-bullet:markdown-preview-ready'

export type PreviewFrontmatter = Record<string, string | number | boolean>

export interface ParsedMarkdownDocument {
  frontmatter: PreviewFrontmatter
  body: string
  error: string
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})

const defaultImageRule = markdown.renderer.rules.image
const defaultLinkOpenRule = markdown.renderer.rules.link_open

markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  applyBaseToAttribute(tokens[index], 'src')

  if (defaultImageRule) {
    return defaultImageRule(tokens, index, options, env, self)
  }

  return self.renderToken(tokens, index, options)
}

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  applyBaseToAttribute(tokens[index], 'href')

  if (defaultLinkOpenRule) {
    return defaultLinkOpenRule(tokens, index, options, env, self)
  }

  return self.renderToken(tokens, index, options)
}

interface MarkdownAttributeToken {
  attrGet(name: string): string | null
  attrSet(name: string, value: string): void
}

function applyBaseToAttribute(
  token: MarkdownAttributeToken,
  attribute: 'src' | 'href'
) {
  const value = token.attrGet(attribute)

  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return
  }

  token.attrSet(attribute, withBase(value))
}

export function parseMarkdownDocument(source: string): ParsedMarkdownDocument {
  const normalized = source.replace(/\r\n?/g, '\n')

  if (!normalized.startsWith('---\n')) {
    return {
      frontmatter: {},
      body: normalized,
      error: ''
    }
  }

  const frontmatterMatch = normalized.match(
    /^---\n([\s\S]*?)\n---(?:\n|$)/
  )

  if (!frontmatterMatch) {
    return {
      frontmatter: {},
      body: normalized,
      error: 'frontmatterの---が正しく閉じられていません。'
    }
  }

  const frontmatterSource = frontmatterMatch[1]
  const body = normalized.slice(frontmatterMatch[0].length)

  return {
    frontmatter: parseSimpleFrontmatter(frontmatterSource),
    body,
    error: ''
  }
}

export function renderMarkdownPreview(source: string) {
  const parsed = parseMarkdownDocument(source)
  const body = replaceVueComponentsForPreview(parsed.body)

  return {
    ...parsed,
    html: markdown.render(body)
  }
}

function parseSimpleFrontmatter(source: string): PreviewFrontmatter {
  const values: PreviewFrontmatter = {}

  for (const line of source.split('\n')) {
    if (!line || /^\s/.test(line) || line.trimStart().startsWith('#')) {
      continue
    }

    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*?)\s*$/)

    if (!match) {
      continue
    }

    values[match[1]] = parseScalar(match[2])
  }

  return values
}

function parseScalar(value: string): string | number | boolean {
  const trimmed = stripInlineComment(value.trim())

  if (!trimmed) {
    return ''
  }

  if (trimmed === 'true') {
    return true
  }

  if (trimmed === 'false') {
    return false
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return unquote(trimmed)
  }

  return trimmed
}

function stripInlineComment(value: string) {
  let quote: '"' | "'" | '' = ''

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if ((character === '"' || character === "'") && value[index - 1] !== '\\') {
      quote = quote === character ? '' : quote || character
      continue
    }

    if (character === '#' && !quote && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index).trimEnd()
    }
  }

  return value
}

function unquote(value: string) {
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value) as string
    } catch {
      return value.slice(1, -1)
    }
  }

  return value.slice(1, -1).replace(/''/g, "'")
}

function replaceVueComponentsForPreview(body: string) {
  return body.replace(
    /^\s*<([A-Z][A-Za-z0-9]*)\b[^>]*\/>\s*$/gm,
    (_match, componentName: string) =>
      `> **${componentName}** は保存後のページで表示されます。`
  )
}
