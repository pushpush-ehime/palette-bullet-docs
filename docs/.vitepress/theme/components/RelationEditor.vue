<script setup lang="ts">
import { computed, ref } from 'vue'
import { data as catalog } from '../../content/catalog.data.js'
import {
  getRelatedSpecs,
  setRelatedSpecs
} from '../../content/related-specs.js'
import { sortSpecs, sortTasks } from '../relations'

const repository = 'pushpush-ehime/palette-bullet-docs'
const branch = 'main'
const specs = sortSpecs(catalog.filter((page) => page.pageType === 'spec'))
const tasks = sortTasks(catalog.filter((page) => page.pageType === 'task'))
const knownSpecUrls = new Set(specs.map((spec) => spec.url))

const selectedTaskUrl = ref('')
const specQuery = ref('')
const originalMarkdown = ref('')
const originalSpecUrls = ref<string[]>([])
const selectedSpecUrls = ref<string[]>([])
const unknownSpecUrls = ref<string[]>([])
const loading = ref(false)
const loadError = ref('')
const actionError = ref('')
const markdownCopied = ref(false)
const showManualCopy = ref(false)
let requestSequence = 0

const selectedTask = computed(() =>
  tasks.find((task) => task.url === selectedTaskUrl.value)
)

const filteredSpecs = computed(() => {
  const search = specQuery.value.trim().toLocaleLowerCase('ja')

  if (!search) return specs

  return specs.filter((spec) =>
    [spec.title, spec.description, spec.category, spec.url]
      .join(' ')
      .toLocaleLowerCase('ja')
      .includes(search)
  )
})

const orderedSelectedSpecUrls = computed(() => {
  const selected = new Set(selectedSpecUrls.value)
  return [
    ...specs.filter((spec) => selected.has(spec.url)).map((spec) => spec.url),
    ...unknownSpecUrls.value.filter((url) => selected.has(url))
  ]
})

const isDirty = computed(() =>
  !sameUrlSet(originalSpecUrls.value, selectedSpecUrls.value)
)

const addedCount = computed(() => {
  const original = new Set(originalSpecUrls.value)
  return selectedSpecUrls.value.filter((url) => !original.has(url)).length
})

const removedCount = computed(() => {
  const selected = new Set(selectedSpecUrls.value)
  return originalSpecUrls.value.filter((url) => !selected.has(url)).length
})

const draft = computed(() => {
  if (!originalMarkdown.value) return { markdown: '', error: '' }

  try {
    return {
      markdown: setRelatedSpecs(
        originalMarkdown.value,
        orderedSelectedSpecUrls.value
      ),
      error: ''
    }
  } catch (error) {
    return {
      markdown: '',
      error:
        error instanceof Error
          ? error.message
          : 'relatedSpecsを更新できませんでした。'
    }
  }
})

const githubEditUrl = computed(() => {
  const path = selectedTask.value?.relativePath ?? ''
  return isSafeTaskPath(path)
    ? `https://github.com/${repository}/edit/${branch}/docs/${encodePath(path)}`
    : ''
})

const canOpenGitHub = computed(
  () =>
    Boolean(githubEditUrl.value) &&
    Boolean(draft.value.markdown) &&
    !draft.value.error &&
    !loading.value &&
    !loadError.value &&
    isDirty.value
)

function sameUrlSet(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((url) => right.includes(url))
  )
}

function isSafeTaskPath(path: string) {
  if (
    !path.startsWith('tasks/') ||
    !path.endsWith('.md') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    path.includes('\0')
  ) {
    return false
  }

  return path
    .split('/')
    .every((segment) => segment && segment !== '.' && segment !== '..')
}

function encodePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function frontmatterValue(source: string, key: string) {
  const normalized = source.replace(/\r\n?/g, '\n')
  if (!normalized.startsWith('---\n')) return ''

  const closingIndex = normalized.indexOf('\n---\n', 4)
  if (closingIndex === -1) return ''

  const block = normalized.slice(4, closingIndex)
  const matches = [...block.matchAll(new RegExp(`^${key}\\s*:\\s*(.+?)\\s*$`, 'gm'))]
  if (matches.length !== 1) return ''

  const value = matches[0][1].trim()
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function changeTask(event: Event) {
  const select = event.currentTarget as HTMLSelectElement
  const nextUrl = select.value

  if (
    isDirty.value &&
    !window.confirm('まだGitHubへ反映していない選択があります。破棄して別のタスクを開きますか？')
  ) {
    select.value = selectedTaskUrl.value
    return
  }

  void loadTask(nextUrl)
}

async function loadTask(taskUrl = selectedTaskUrl.value) {
  const sequence = ++requestSequence
  const task = tasks.find((entry) => entry.url === taskUrl)

  selectedTaskUrl.value = taskUrl
  specQuery.value = ''
  originalMarkdown.value = ''
  originalSpecUrls.value = []
  selectedSpecUrls.value = []
  unknownSpecUrls.value = []
  loadError.value = ''
  actionError.value = ''
  markdownCopied.value = false
  showManualCopy.value = false

  if (!task) {
    loading.value = false
    return
  }

  if (!isSafeTaskPath(task.relativePath)) {
    loading.value = false
    loadError.value = '編集対象のタスクファイルを安全に特定できませんでした。'
    return
  }

  loading.value = true

  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${repository}/${branch}/docs/${encodePath(task.relativePath)}`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      throw new Error(`GitHubからの取得に失敗しました（${response.status}）。`)
    }

    const source = await response.text()
    if (sequence !== requestSequence) return

    if (
      frontmatterValue(source, 'pageType') !== 'task' ||
      frontmatterValue(source, 'taskId') !== task.taskId
    ) {
      throw new Error('取得したMarkdownが選択したタスクと一致しません。')
    }

    const currentUrls = getRelatedSpecs(source)
    const unavailableUrls = currentUrls.filter((url) => !knownSpecUrls.has(url))

    originalMarkdown.value = source
    originalSpecUrls.value = [...currentUrls]
    selectedSpecUrls.value = [...currentUrls]
    unknownSpecUrls.value = unavailableUrls
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
  selectedSpecUrls.value = [...originalSpecUrls.value]
  actionError.value = ''
  markdownCopied.value = false
  showManualCopy.value = false
}

async function copyMarkdown() {
  actionError.value = ''
  markdownCopied.value = false
  showManualCopy.value = false

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('このブラウザーではクリップボードを利用できません。')
    }

    await navigator.clipboard.writeText(draft.value.markdown)
    markdownCopied.value = true
    window.setTimeout(() => {
      markdownCopied.value = false
    }, 5000)
  } catch {
    actionError.value =
      '本文を自動コピーできませんでした。下の欄から全文を手動でコピーしてください。'
    showManualCopy.value = true
  }
}

async function openGitHub() {
  if (!canOpenGitHub.value) return

  const copyPromise = copyMarkdown()
  window.open(githubEditUrl.value, '_blank', 'noopener,noreferrer')
  await copyPromise
}

function selectManualMarkdown(event: FocusEvent) {
  const textarea = event.currentTarget as HTMLTextAreaElement
  textarea.select()
}
</script>

<template>
  <section class="relation-editor" aria-labelledby="relation-editor-title">
    <div class="relation-editor-heading">
      <div>
        <h2 id="relation-editor-title">仕様との対応を編集</h2>
        <p>タスクを1件選び、関連する仕様を複数選択できます。</p>
      </div>
      <span class="relation-editor-scope">1タスクずつ更新</span>
    </div>

    <div class="relation-editor-task">
      <label for="relation-editor-task-select">更新するタスク</label>
      <select
        id="relation-editor-task-select"
        :value="selectedTaskUrl"
        @change="changeTask"
      >
        <option value="">タスクを選択してください</option>
        <option v-for="task in tasks" :key="task.url" :value="task.url">
          {{ task.taskId }}｜{{ task.title }}（{{ task.category }}）
        </option>
      </select>
      <small>GitHubのmainブランチから最新のMarkdownを取得して編集します。</small>
    </div>

    <p v-if="loading" class="relation-editor-status" role="status">
      Markdownを読み込んでいます。
    </p>

    <div v-else-if="loadError" class="relation-editor-error" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" @click="loadTask()">もう一度読み込む</button>
    </div>

    <template v-else-if="selectedTask && originalMarkdown">
      <div class="relation-editor-search">
        <label for="relation-editor-spec-search">仕様を検索</label>
        <input
          id="relation-editor-spec-search"
          v-model="specQuery"
          type="search"
          placeholder="仕様名、分類、URL"
        />
      </div>

      <fieldset class="relation-editor-specs">
        <legend>関連する仕様（複数選択）</legend>

        <div class="relation-editor-selection-summary" aria-live="polite">
          <strong>{{ selectedSpecUrls.length }}件を選択中</strong>
          <span v-if="isDirty">追加 {{ addedCount }}件・解除 {{ removedCount }}件</span>
          <span v-else>GitHub上の現在の設定と同じです</span>
        </div>

        <div class="relation-editor-spec-list">
          <label
            v-for="spec in filteredSpecs"
            :key="spec.url"
            class="relation-editor-spec-option"
            :class="{ 'is-selected': selectedSpecUrls.includes(spec.url) }"
          >
            <input
              v-model="selectedSpecUrls"
              type="checkbox"
              :value="spec.url"
            />
            <span>
              <strong>{{ spec.title }}</strong>
              <small>{{ spec.category }}・{{ spec.url }}</small>
            </span>
          </label>

          <p v-if="!filteredSpecs.length" class="catalog-empty">
            該当する仕様はありません。検索を変更してください。
          </p>
        </div>
      </fieldset>

      <div
        v-if="unknownSpecUrls.length"
        class="relation-editor-warning"
        role="status"
      >
        <strong>現在のサイトに未掲載の関連仕様を保持します</strong>
        <span v-for="url in unknownSpecUrls" :key="url">{{ url }}</span>
        <small>mainブランチとの公開時差が考えられるため、この画面では解除しません。</small>
      </div>

      <p v-if="draft.error" class="relation-editor-error" role="alert">
        {{ draft.error }}
      </p>

      <div class="relation-editor-actions">
        <button type="button" :disabled="!isDirty" @click="resetSelection">
          現在の設定に戻す
        </button>
        <button
          type="button"
          class="primary"
          :disabled="!canOpenGitHub"
          @click="openGitHub"
        >
          本文をコピーしてGitHubで編集
        </button>
        <a
          v-if="githubEditUrl"
          :href="githubEditUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub編集画面だけ開く
        </a>
      </div>

      <p v-if="markdownCopied" class="relation-editor-success" aria-live="polite">
        更新後のMarkdownをコピーしました。GitHubで全文を貼り替えてください。
      </p>

      <div v-if="actionError" class="relation-editor-error" role="alert">
        <p>{{ actionError }}</p>
        <textarea
          v-if="showManualCopy"
          :value="draft.markdown"
          readonly
          rows="12"
          aria-label="手動コピー用の更新後Markdown"
          @focus="selectManualMarkdown"
        ></textarea>
      </div>

      <ol class="relation-editor-steps">
        <li>上のボタンで、更新後のMarkdownをコピーしてGitHub編集画面を開きます。</li>
        <li>GitHubの本文を全選択し、コピーしたMarkdownで貼り替えます。</li>
        <li>変更をコミットするときに新しいブランチを選び、Pull Requestを作成します。</li>
      </ol>
    </template>

    <p v-else class="relation-editor-empty">
      最初に更新するタスクを1件選択してください。
    </p>
  </section>
</template>
