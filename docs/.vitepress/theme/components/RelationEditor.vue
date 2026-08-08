<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { data as catalog } from '../../content/catalog.data.js'
import {
  buildRelationEdges,
  canonicalRelationUrl
} from '../../content/relation-graph.js'
import {
  formatRelatedPages,
  getRelatedPages,
  relationFieldForPageType,
  setRelatedPages,
  type RelationField
} from '../../content/related-specs.js'
import { sortSpecs, sortTasks } from '../relations'
import RelatedPagePicker from './RelatedPagePicker.vue'

type PageType = 'spec' | 'task'

const repository = 'pushpush-ehime/palette-bullet-docs'
const branch = 'main'
const specs = sortSpecs(catalog.filter((page) => page.pageType === 'spec'))
const tasks = sortTasks(catalog.filter((page) => page.pageType === 'task'))
const edges = buildRelationEdges(catalog)

const targetType = ref<PageType>('task')
const targetCategory = ref('')
const targetQuery = ref('')
const selectedPageUrl = ref('')
const originalMarkdown = ref('')
const originalEditableUrls = ref<string[]>([])
const selectedRelatedUrls = ref<string[]>([])
const lockedUrls = ref<string[]>([])
const loading = ref(false)
const loadError = ref('')
const actionError = ref('')
const copiedMessage = ref('')
const manualCopyText = ref('')
let requestSequence = 0

const targetPages = computed(() =>
  targetType.value === 'spec' ? specs : tasks
)

const targetCategories = computed(() => [
  ...new Set(targetPages.value.map((page) => page.category).filter(Boolean))
].sort((left, right) => left.localeCompare(right, 'ja')))

const hasTargetFilter = computed(() =>
  Boolean(targetCategory.value || targetQuery.value.trim())
)

const matchingTargets = computed(() => {
  if (!hasTargetFilter.value) return []

  const search = targetQuery.value.trim().toLocaleLowerCase('ja')

  return targetPages.value.filter((page) => {
    const matchesCategory = !targetCategory.value || page.category === targetCategory.value
    const matchesSearch =
      !search ||
      [page.taskId, page.title, page.description, page.category, page.url]
        .join(' ')
        .toLocaleLowerCase('ja')
        .includes(search)
    return matchesCategory && matchesSearch
  }).slice(0, 40)
})

const targetOptions = computed(() => {
  const selected = selectedPage.value
  return selected && !matchingTargets.value.some((page) => page.url === selected.url)
    ? [selected, ...matchingTargets.value]
    : matchingTargets.value
})

const selectedPage = computed(() =>
  targetPages.value.find((page) => page.url === selectedPageUrl.value)
)

const relationField = computed<RelationField>(() =>
  relationFieldForPageType(targetType.value)
)

const candidateTypes = computed<PageType[]>(() =>
  targetType.value === 'spec' ? ['task'] : ['spec']
)

const isDirty = computed(() =>
  !sameUrlSet(originalEditableUrls.value, selectedRelatedUrls.value)
)

const draft = computed(() => {
  if (!originalMarkdown.value) return { markdown: '', error: '' }

  try {
    return {
      markdown: setRelatedPages(
        originalMarkdown.value,
        relationField.value,
        selectedRelatedUrls.value
      ),
      error: ''
    }
  } catch (error) {
    return {
      markdown: '',
      error:
        error instanceof Error
          ? error.message
          : '関連情報を更新できませんでした。'
    }
  }
})

const frontmatterSnippet = computed(() => {
  try {
    return formatRelatedPages(relationField.value, selectedRelatedUrls.value)
  } catch {
    return ''
  }
})

const githubEditUrl = computed(() => {
  const path = selectedPage.value?.relativePath ?? ''
  return isSafePagePath(path, targetType.value)
    ? `https://github.com/${repository}/edit/${branch}/docs/${encodePath(path)}`
    : ''
})

const canGenerate = computed(
  () =>
    Boolean(selectedPage.value) &&
    Boolean(draft.value.markdown) &&
    !draft.value.error &&
    !loading.value &&
    !loadError.value
)

function pageLabel(page: (typeof catalog)[number]) {
  return page.pageType === 'task' && page.taskId
    ? `${page.taskId}｜${page.title}`
    : page.title
}

function sameUrlSet(left: string[], right: string[]) {
  return left.length === right.length && left.every((url) => right.includes(url))
}

function isSafePagePath(path: string, pageType: PageType) {
  const root = pageType === 'spec' ? 'spec/' : 'tasks/'
  if (
    !path.startsWith(root) ||
    !path.endsWith('.md') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    path.includes('\0')
  ) {
    return false
  }

  return path.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
}

function encodePath(path: string) {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}

function frontmatterValue(source: string, key: string) {
  const normalized = source.replace(/\r\n?/g, '\n')
  if (!normalized.startsWith('---\n')) return ''
  const closingIndex = normalized.indexOf('\n---\n', 4)
  if (closingIndex === -1) return ''

  const block = normalized.slice(4, closingIndex)
  const matches = [...block.matchAll(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'gm'))]
  if (matches.length !== 1) return ''

  const value = matches[0][1].trim()
  return value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
    ? value.slice(1, -1)
    : value
}

function reciprocalUrls(pageUrl: string, pageType: PageType) {
  return edges
    .filter((edge) =>
      pageType === 'spec'
        ? edge.specUrl === pageUrl && edge.declaredByTask
        : edge.taskUrl === pageUrl && edge.declaredBySpec
    )
    .map((edge) => (pageType === 'spec' ? edge.taskUrl : edge.specUrl))
}

function clearActionFeedback() {
  actionError.value = ''
  copiedMessage.value = ''
  manualCopyText.value = ''
}

watch(() => draft.value.markdown, clearActionFeedback)

function requestTargetType(event: Event) {
  const select = event.currentTarget as HTMLSelectElement
  const nextType = select.value as PageType
  if (isDirty.value && !window.confirm('未コピーの選択を破棄してページ種別を変更しますか？')) {
    select.value = targetType.value
    return
  }

  targetType.value = nextType
  targetCategory.value = ''
  targetQuery.value = ''
  void loadPage('')
}

function requestTarget(event: Event) {
  const select = event.currentTarget as HTMLSelectElement
  const nextUrl = select.value
  if (isDirty.value && !window.confirm('未コピーの選択を破棄して別のページを開きますか？')) {
    select.value = selectedPageUrl.value
    return
  }

  void loadPage(nextUrl)
}

async function loadPage(pageUrl = selectedPageUrl.value) {
  const sequence = ++requestSequence
  const page = targetPages.value.find((entry) => entry.url === pageUrl)

  selectedPageUrl.value = pageUrl
  originalMarkdown.value = ''
  originalEditableUrls.value = []
  selectedRelatedUrls.value = []
  lockedUrls.value = []
  loadError.value = ''
  actionError.value = ''
  copiedMessage.value = ''
  manualCopyText.value = ''

  if (!page) {
    loading.value = false
    return
  }

  if (!isSafePagePath(page.relativePath, targetType.value)) {
    loading.value = false
    loadError.value = '編集対象のMarkdownファイルを安全に特定できませんでした。'
    return
  }

  loading.value = true

  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${repository}/${branch}/docs/${encodePath(page.relativePath)}`,
      { cache: 'no-store' }
    )
    if (!response.ok) {
      throw new Error(`GitHubからの取得に失敗しました（${response.status}）。`)
    }

    const source = await response.text()
    if (sequence !== requestSequence) return

    if (
      frontmatterValue(source, 'pageType') !== targetType.value ||
      (targetType.value === 'task' && frontmatterValue(source, 'taskId') !== page.taskId)
    ) {
      throw new Error('取得したMarkdownが選択したページと一致しません。')
    }

    const storedUrls = getRelatedPages(source, relationField.value)
    const storedSet = new Set(storedUrls.map(canonicalRelationUrl))
    const reciprocal = reciprocalUrls(page.url, targetType.value)
      .filter((url) => !storedSet.has(canonicalRelationUrl(url)))
    const editableUrls = storedUrls

    originalMarkdown.value = source
    originalEditableUrls.value = editableUrls
    selectedRelatedUrls.value = [...editableUrls]
    lockedUrls.value = reciprocal
  } catch (error) {
    if (sequence !== requestSequence) return
    loadError.value =
      error instanceof Error
        ? error.message
        : 'GitHubからMarkdownを取得できませんでした。'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function resetSelection() {
  selectedRelatedUrls.value = [...originalEditableUrls.value]
  actionError.value = ''
  copiedMessage.value = ''
  manualCopyText.value = ''
}

async function copyText(text: string, successMessage: string) {
  actionError.value = ''
  copiedMessage.value = ''
  manualCopyText.value = ''

  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(text)
    copiedMessage.value = successMessage
  } catch {
    actionError.value = '自動コピーできませんでした。下の欄から手動でコピーしてください。'
    manualCopyText.value = text
  }
}

async function copyFrontmatter() {
  if (!canGenerate.value) return
  await copyText(frontmatterSnippet.value, '関連付け用frontmatterをコピーしました。')
}

async function openGitHub() {
  if (!canGenerate.value || !isDirty.value || !githubEditUrl.value) return
  const copyPromise = copyText(draft.value.markdown, '更新後のMarkdown全文をコピーしました。')
  window.open(githubEditUrl.value, '_blank', 'noopener,noreferrer')
  await copyPromise
}

function selectManualText(event: FocusEvent) {
  const textarea = event.currentTarget as HTMLTextAreaElement
  textarea.select()
}
</script>

<template>
  <section class="relation-editor" aria-labelledby="relation-editor-title">
    <div class="relation-editor-heading">
      <div>
        <h2 id="relation-editor-title">関連付け内容を生成</h2>
        <p>対象を1件選び、反対側のページを検索して複数関連付けできます。</p>
      </div>
      <span class="relation-editor-scope">1ページずつ更新</span>
    </div>

    <div class="relation-editor-target-filters">
      <label>
        <span>対象の種別</span>
        <select :value="targetType" @change="requestTargetType">
          <option value="spec">仕様</option>
          <option value="task">タスク</option>
        </select>
      </label>
      <label>
        <span>対象のカテゴリ</span>
        <select v-model="targetCategory">
          <option value="">すべて</option>
          <option v-for="item in targetCategories" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </label>
      <label>
        <span>対象を検索</span>
        <input v-model="targetQuery" type="search" placeholder="タイトル、ID、URL" />
      </label>
    </div>

    <div class="relation-editor-task">
      <label for="relation-editor-target-select">対象ページ</label>
      <select
        id="relation-editor-target-select"
        :value="selectedPageUrl"
        @change="requestTarget"
      >
        <option value="">ページを選択してください</option>
        <option v-for="page in targetOptions" :key="page.url" :value="page.url">
          {{ pageLabel(page) }}（{{ page.category }}）
        </option>
      </select>
      <small>GitHubのmainブランチから最新のMarkdownを取得します。</small>
      <small v-if="!hasTargetFilter && !selectedPageUrl">
        カテゴリを選ぶか検索語を入力すると、対象ページの候補を表示します。
      </small>
      <small v-else-if="matchingTargets.length === 40">
        候補は先頭40件まで表示しています。検索条件を追加すると絞り込めます。
      </small>
    </div>

    <p v-if="loading" class="relation-editor-status" role="status">
      Markdownを読み込んでいます。
    </p>

    <div v-else-if="loadError" class="relation-editor-error" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" @click="loadPage()">もう一度読み込む</button>
    </div>

    <template v-else-if="selectedPage && originalMarkdown">
      <RelatedPagePicker
        v-model="selectedRelatedUrls"
        :page-types="candidateTypes"
        :locked-urls="lockedUrls"
        :label="targetType === 'spec' ? '関連タスク' : '関連仕様'"
      />

      <p v-if="lockedUrls.length" class="relation-editor-warning">
        「相手側のページで設定済み」の関係は、この1ファイルからは解除できません。
        解除する場合は、その相手ページを対象として選び直してください。
      </p>

      <div class="relation-editor-generated">
        <label for="relation-frontmatter-output">生成されるfrontmatter</label>
        <textarea
          id="relation-frontmatter-output"
          :value="frontmatterSnippet"
          readonly
          rows="5"
          @focus="selectManualText"
        ></textarea>
      </div>

      <p v-if="draft.error" class="relation-editor-error" role="alert">
        {{ draft.error }}
      </p>

      <div class="relation-editor-actions">
        <button type="button" :disabled="!isDirty" @click="resetSelection">
          現在の設定に戻す
        </button>
        <button type="button" :disabled="!canGenerate" @click="copyFrontmatter">
          frontmatterをコピー
        </button>
        <button
          type="button"
          class="primary"
          :disabled="!canGenerate || !isDirty"
          @click="openGitHub"
        >
          Markdown全文をコピーしてGitHubで編集
        </button>
      </div>

      <p v-if="copiedMessage" class="relation-editor-success" aria-live="polite">
        {{ copiedMessage }}
      </p>

      <div v-if="actionError" class="relation-editor-error" role="alert">
        <p>{{ actionError }}</p>
        <textarea
          :value="manualCopyText"
          readonly
          rows="12"
          aria-label="手動コピー用テキスト"
          @focus="selectManualText"
        ></textarea>
      </div>

      <ol class="relation-editor-steps">
        <li>候補を選ぶと、保存元ページ用のfrontmatterが生成されます。</li>
        <li>GitHub編集ではコピーしたMarkdown全文を貼り替えます。</li>
        <li>新しいブランチへコミットし、Pull Requestを作成します。</li>
      </ol>
    </template>

    <p v-else class="relation-editor-empty">最初に対象ページを選択してください。</p>
  </section>
</template>
