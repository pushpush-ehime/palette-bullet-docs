<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isTaskTeam, setTaskTeam } from '../../content/task-team.js'
import { parseMarkdownDocument } from '../markdown-preview'
import MarkdownEditor from './MarkdownEditor.vue'
import TaskTeamField from './TaskTeamField.vue'

const repository = 'pushpush-ehime/palette-bullet-docs'
const branch = 'main'

const filePath = ref('')
const markdownSource = ref('')
const originalMarkdown = ref('')
const loading = ref(true)
const loadError = ref('')
const markdownCopied = ref(false)
const commitMessageCopied = ref(false)

const parsedDocument = computed(() =>
  parseMarkdownDocument(markdownSource.value)
)

const isTaskPage = computed(
  () => parsedDocument.value.frontmatter.pageType === 'task'
)

const taskTeam = computed({
  get: () => String(parsedDocument.value.frontmatter.team ?? ''),
  set: (value: string) => {
    if (!isTaskTeam(value)) return
    markdownSource.value = setTaskTeam(markdownSource.value, value)
  }
})

const taskTeamError = computed(() =>
  isTaskPage.value && !isTaskTeam(taskTeam.value)
    ? '担当班を選択してください。'
    : ''
)

const formError = computed(
  () => parsedDocument.value.error || taskTeamError.value
)

const pageTitle = computed(() => {
  const frontmatterTitle = parsedDocument.value.frontmatter.title

  if (frontmatterTitle) {
    return String(frontmatterTitle)
  }

  const heading = parsedDocument.value.body.match(/^#\s+(.+)$/m)?.[1]
  return heading?.trim() || filePath.value
})

const isDirty = computed(
  () => markdownSource.value !== originalMarkdown.value
)

const commitMessage = computed(
  () => `ページ「${pageTitle.value}」を更新`
)

const githubEditUrl = computed(() => {
  if (!filePath.value) {
    return ''
  }

  return (
    `https://github.com/${repository}/edit/${branch}/docs/` +
    encodePath(filePath.value)
  )
})

onMounted(loadPage)

async function loadPage() {
  loading.value = true
  loadError.value = ''

  const path = new URLSearchParams(window.location.search).get('path') ?? ''

  if (!isSafeMarkdownPath(path)) {
    loading.value = false
    loadError.value = '編集対象のMarkdownファイルを取得できませんでした。'
    return
  }

  filePath.value = path

  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${repository}/${branch}/docs/` +
      encodePath(path),
      { cache: 'no-store' }
    )

    if (!response.ok) {
      throw new Error(`GitHubからの取得に失敗しました（${response.status}）。`)
    }

    const source = await response.text()
    markdownSource.value = source
    originalMarkdown.value = source
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? error.message
        : 'GitHubからMarkdownを取得できませんでした。'
  } finally {
    loading.value = false
  }
}

function isSafeMarkdownPath(path: string) {
  if (
    !path ||
    !path.endsWith('.md') ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    path.includes('\0')
  ) {
    return false
  }

  const segments = path.split('/')

  return segments.every(
    (segment) => segment && segment !== '.' && segment !== '..'
  )
}

function encodePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

async function copyMarkdown() {
  if (!markdownSource.value || formError.value) {
    return
  }

  await navigator.clipboard.writeText(markdownSource.value)
  markdownCopied.value = true

  window.setTimeout(() => {
    markdownCopied.value = false
  }, 3000)
}

async function copyCommitMessage() {
  if (!markdownSource.value) {
    return
  }

  await navigator.clipboard.writeText(commitMessage.value)
  commitMessageCopied.value = true

  window.setTimeout(() => {
    commitMessageCopied.value = false
  }, 3000)
}

async function openGitHub() {
  if (!githubEditUrl.value || !markdownSource.value || formError.value) {
    return
  }

  window.open(githubEditUrl.value, '_blank', 'noopener,noreferrer')
  await copyMarkdown()
}
</script>

<template>
  <div class="page-create-form">
    <p
      v-if="loading"
      class="page-create-destination"
    >
      Markdownを読み込んでいます。
    </p>

    <p
      v-else-if="loadError"
      class="page-create-error"
    >
      {{ loadError }}
    </p>

    <template v-else>
      <div class="page-create-summary">
        <div>
          <strong>編集対象</strong>
          <span>{{ pageTitle }}</span>
        </div>

        <div>
          <strong>編集状態</strong>
          <span>{{ isDirty ? '未保存の変更あり' : '変更なし' }}</span>
        </div>
      </div>

      <div class="page-create-destination">
        <strong>ファイル</strong>
        <code>docs/{{ filePath }}</code>
      </div>

      <div
        v-if="isTaskPage"
        class="page-create-fields"
      >
        <TaskTeamField
          v-model="taskTeam"
          required
        />
      </div>

      <p
        v-if="formError"
        class="page-create-error"
      >
        {{ formError }}
      </p>

      <MarkdownEditor
        v-model="markdownSource"
        variant="page"
      />

      <div class="page-create-commit">
        <strong>推奨コミットメッセージ</strong>
        <code>{{ commitMessage }}</code>

        <button
          type="button"
          @click="copyCommitMessage"
        >
          {{
            commitMessageCopied
              ? 'コピーしました'
              : 'コミットメッセージをコピー'
          }}
        </button>
      </div>

      <div class="page-create-actions">
        <button
          type="button"
          :disabled="Boolean(formError)"
          @click="copyMarkdown"
        >
          {{ markdownCopied ? 'コピーしました' : '本文をコピー' }}
        </button>

        <button
          type="button"
          class="primary"
          :disabled="Boolean(formError)"
          @click="openGitHub"
        >
          本文をコピーしてGitHubで編集
        </button>
      </div>
    </template>
  </div>
</template>
