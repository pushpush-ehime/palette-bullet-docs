<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type PageType = 'spec' | 'task'

const pageType = ref<PageType>('spec')
const directory = ref('')
const category = ref('')
const title = ref('')
const fileName = ref('')
const status = ref('未決')
const taskId = ref('PB-TASK-0000')

const markdownCopied = ref(false)
const commitMessageCopied = ref(false)

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const taskIdPattern = /^PB-TASK-\d{4}$/

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

const generatedMarkdown = computed(() => {
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

ここに仕様を記載します。
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

ここにタスクの内容を記載します。
`
})

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
        <span>仕様の状態</span>
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

    <label class="page-create-preview">
      <span>生成される内容</span>
      <textarea
        :value="generatedMarkdown"
        rows="14"
        readonly
      />
    </label>

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
        本文をコピーしてGitHubを開く
      </button>
    </div>
  </div>
</template>
