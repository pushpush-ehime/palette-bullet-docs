<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed, onMounted, ref, watch } from 'vue'

type PageType = 'spec' | 'task'

const pageType = ref<PageType>('spec')
const directory = ref('')
const category = ref('')
const title = ref('')
const fileName = ref('')
const status = ref('未決')
const taskId = ref('PB-TASK-0000')
const markdownSource = ref('')
const lastTemplateMarkdown = ref('')

const markdownCopied = ref(false)
const commitMessageCopied = ref(false)

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const taskIdPattern = /^PB-TASK-\d{4}$/
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})

onMounted(() => {
  const query = new URLSearchParams(window.location.search)

  pageType.value =
    query.get('type') === 'task' ? 'task' : 'spec'

  directory.value = query.get('directory') ?? ''
  category.value = query.get('category') ?? ''

  const queryTaskId = query.get('taskId')

  if (queryTaskId && taskIdPattern.test(queryTaskId)) {
    taskId.value = queryTaskId
  }
})

function yamlString(value: string) {
  return JSON.stringify(value.trim())
}

const normalizedFileName = computed(() => {
  if (pageType.value === 'task') {
    return taskId.value.trim().toLowerCase()
  }

  return fileName.value.trim()
})

const formError = computed(() => {
  if (!directory.value) {
    return '追加先のフォルダを取得できませんでした。'
  }

  if (!category.value) {
    return '追加先のカテゴリを取得できませんでした。'
  }

  if (!title.value.trim()) {
    return 'ページタイトルを入力してください。'
  }

  if (pageType.value === 'spec') {
    if (!fileName.value.trim()) {
      return 'ファイル名を入力してください。'
    }

    if (!slugPattern.test(fileName.value.trim())) {
      return 'ファイル名には英小文字・数字・ハイフンだけを使用してください。'
    }
  }

  if (
    pageType.value === 'task' &&
    !taskIdPattern.test(taskId.value.trim())
  ) {
    return 'タスクIDはPB-TASK-0001形式で入力してください。'
  }

  return ''
})

const defaultBody = computed(() => {
  if (pageType.value === 'spec') {
    return 'ここに仕様を記載します。'
  }

  return 'ここにタスクの内容を記載します。'
})

const templateMarkdown = computed(() => {
  const pageTitle = title.value.trim()
  const pageCategory = category.value.trim()

  if (pageType.value === 'spec') {
    return `---
title: ${yamlString(pageTitle)}
pageType: spec
category: ${yamlString(pageCategory)}
status: ${status.value}
---

# ${pageTitle}

${defaultBody.value}
`
  }

  const id = taskId.value.trim()

  return `---
title: ${yamlString(pageTitle)}
pageType: task
taskId: ${id}
category: ${yamlString(pageCategory)}
---

# ${id}｜${pageTitle}

${defaultBody.value}
`
})

const generatedMarkdown = computed(() => {
  return markdownSource.value
})

const renderedPreview = computed(() => {
  return markdown.render(markdownForPreview(markdownSource.value))
})

watch(templateMarkdown, (nextTemplate) => {
  if (
    !markdownSource.value ||
    markdownSource.value === lastTemplateMarkdown.value
  ) {
    markdownSource.value = nextTemplate
  }

  lastTemplateMarkdown.value = nextTemplate
}, { immediate: true })

function markdownForPreview(source: string) {
  const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)

  if (!frontmatterMatch) {
    return source
  }

  const frontmatterTable = frontmatterMatch[1]
    .split(/\r?\n/)
    .filter((line) => line.includes(':'))
    .map((line) => {
      const separatorIndex = line.indexOf(':')
      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()

      return `| ${key} | ${value || '-'} |`
    })
    .join('\n')

  const body = source.slice(frontmatterMatch[0].length)

  return `| 項目 | 内容 |
| --- | --- |
${frontmatterTable}

${body}`
}

const destinationPath = computed(() => {
  const root = pageType.value === 'spec' ? 'spec' : 'tasks'

  return (
    `docs/${root}/${directory.value}/` +
    `${normalizedFileName.value}.md`
  )
})

const commitMessage = computed(() => {
  if (pageType.value === 'spec') {
    return `仕様ページ「${title.value.trim()}」を追加`
  }

  return (
    `${taskId.value.trim()}` +
    `「${title.value.trim()}」を追加`
  )
})

const githubUrl = computed(() => {
  const root = pageType.value === 'spec' ? 'spec' : 'tasks'
  const file = `${normalizedFileName.value}.md`

  return (
    'https://github.com/pushpush-ehime/palette-bullet-docs/' +
    `new/main/docs/${root}/${encodeURIComponent(directory.value)}` +
    `?filename=${encodeURIComponent(file)}`
  )
})

async function copyMarkdown() {
  if (formError.value) {
    return
  }

  await navigator.clipboard.writeText(generatedMarkdown.value)
  markdownCopied.value = true

  window.setTimeout(() => {
    markdownCopied.value = false
  }, 3000)
}

async function copyCommitMessage() {
  if (formError.value) {
    return
  }

  await navigator.clipboard.writeText(commitMessage.value)
  commitMessageCopied.value = true

  window.setTimeout(() => {
    commitMessageCopied.value = false
  }, 3000)
}

async function openGitHub() {
  if (formError.value) {
    return
  }

  window.open(githubUrl.value, '_blank', 'noopener,noreferrer')
  await copyMarkdown()
}
</script>

<template>
  <div class="page-create-form">
    <div class="page-create-summary">
      <div>
        <strong>ページ種別</strong>
        <span>
          {{ pageType === 'spec' ? '仕様ページ' : 'タスクページ' }}
        </span>
      </div>

      <div>
        <strong>カテゴリ</strong>
        <span>{{ category || '取得できませんでした' }}</span>
      </div>
    </div>

    <div class="page-create-fields">
      <label>
        <span>ページタイトル</span>
        <input
          v-model="title"
          type="text"
          :placeholder="
            pageType === 'spec'
              ? '例：ジャンプ操作'
              : '例：ジャンプ処理を実装する'
          "
        >
      </label>

      <label v-if="pageType === 'spec'">
        <span>ファイル名</span>
        <input
          v-model="fileName"
          type="text"
          placeholder="例：jump-action"
          autocomplete="off"
        >
        <small>
          英小文字・数字・ハイフンを使用します。.mdは不要です。
        </small>
      </label>

      <label v-if="pageType === 'spec'">
        <span>ステータス</span>
        <select v-model="status">
          <option value="確定">確定</option>
          <option value="仮仕様">仮仕様</option>
          <option value="未決">未決</option>
          <option value="対象外">対象外</option>
          <option value="廃止">廃止</option>
        </select>
      </label>

      <label v-if="pageType === 'task'">
        <span>タスクID</span>
        <input
          v-model="taskId"
          type="text"
          placeholder="例：PB-TASK-0002"
          autocomplete="off"
        >
        <small>
          PB-TASK-0001形式で入力します。
        </small>
      </label>
    </div>

    <p
      v-if="formError"
      class="page-create-error"
    >
      {{ formError }}
    </p>

    <div class="page-create-destination">
      <strong>作成先</strong>
      <code>{{ destinationPath }}</code>
    </div>

    <div class="page-create-editor">
      <label class="page-create-markdown">
        <span>Markdown</span>
        <textarea
          v-model="markdownSource"
          rows="14"
          spellcheck="false"
        />
      </label>

      <section
        class="page-create-rendered"
        aria-label="リアルタイム表示"
      >
        <span>リアルタイム表示</span>
        <div
          class="page-create-rendered-body"
          v-html="renderedPreview"
        />
      </section>
    </div>

    <div class="page-create-commit">
      <strong>推奨コミットメッセージ</strong>
      <code>{{ commitMessage }}</code>

      <button
        type="button"
        :disabled="Boolean(formError)"
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
        {{
          markdownCopied
            ? 'コピーしました'
            : '本文をコピー'
        }}
      </button>

      <button
        type="button"
        class="primary"
        :disabled="Boolean(formError)"
        @click="openGitHub"
      >
        GitHubで作成
      </button>
    </div>
  </div>
</template>
