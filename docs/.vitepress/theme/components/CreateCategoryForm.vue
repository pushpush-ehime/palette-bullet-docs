<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed, onMounted, ref, watch } from 'vue'

type CategoryType = 'spec' | 'task'

const categoryType = ref<CategoryType>('spec')
const categoryName = ref('')
const directory = ref('')
const categoryOrder = ref(90)
const initiallyOpen = ref(true)
const markdownSource = ref('')
const lastTemplateMarkdown = ref('')
const copied = ref(false)

const directoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})

onMounted(() => {
  const type = new URLSearchParams(window.location.search).get('type')

  if (type === 'task') {
    categoryType.value = 'task'
  }
})

const directoryError = computed(() => {
  if (!directory.value) {
    return ''
  }

  if (!directoryPattern.test(directory.value)) {
    return '英小文字・数字・ハイフンだけを使用してください。'
  }

  return ''
})

const formError = computed(() => {
  if (!categoryName.value.trim()) {
    return 'カテゴリ名を入力してください。'
  }

  if (!directory.value.trim()) {
    return 'フォルダ名を入力してください。'
  }

  if (directoryError.value) {
    return directoryError.value
  }

  if (
    !Number.isInteger(categoryOrder.value) ||
    categoryOrder.value < 0
  ) {
    return '表示順には0以上の整数を入力してください。'
  }

  return ''
})

function yamlString(value: string) {
  return JSON.stringify(value.trim())
}

const defaultBody = computed(() => {
  if (categoryType.value === 'spec') {
    return 'このカテゴリで扱う仕様の概要を記載します。'
  }

  return 'このカテゴリで扱うタスクの概要を記載します。'
})

const templateMarkdown = computed(() => {
  const name = categoryName.value.trim()
  const collapsed = !initiallyOpen.value

  if (categoryType.value === 'spec') {
    return `---
title: ${yamlString(name)}
description: このカテゴリで扱う仕様
pageType: spec
category: ${yamlString(name)}
categoryOrder: ${categoryOrder.value}
order: 0
status: 未決
collapsed: ${collapsed}
---

# ${name}

${defaultBody.value}
`
  }

  return `---
title: ${yamlString(name)}
description: このカテゴリで扱うタスク
pageType: task-category
category: ${yamlString(name)}
categoryOrder: ${categoryOrder.value}
collapsed: ${collapsed}
---

# ${name}

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
  const root = categoryType.value === 'spec' ? 'spec' : 'tasks'
  return `docs/${root}/${directory.value.trim()}/index.md`
})

const githubUrl = computed(() => {
  const root = categoryType.value === 'spec' ? 'spec' : 'tasks'
  const filename = `${directory.value.trim()}/index.md`

  return (
    'https://github.com/pushpush-ehime/palette-bullet-docs/' +
    `new/main/docs/${root}?filename=${encodeURIComponent(filename)}`
  )
})

async function copyMarkdown() {
  if (formError.value) {
    return
  }

  await navigator.clipboard.writeText(generatedMarkdown.value)
  copied.value = true

  window.setTimeout(() => {
    copied.value = false
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
  <div class="category-create-form">
    <div class="category-create-fields">
      <fieldset>
        <legend>カテゴリ種別</legend>

        <label>
          <input
            v-model="categoryType"
            type="radio"
            value="spec"
          >
          仕様カテゴリ
        </label>

        <label>
          <input
            v-model="categoryType"
            type="radio"
            value="task"
          >
          タスクカテゴリ
        </label>
      </fieldset>

      <label>
        <span>カテゴリ名</span>
        <input
          v-model="categoryName"
          type="text"
          placeholder="例：サウンド"
        >
      </label>

      <label>
        <span>フォルダ名</span>
        <input
          v-model="directory"
          type="text"
          placeholder="例：sound"
          autocomplete="off"
        >
        <small>
          英小文字・数字・ハイフンを使用します。
        </small>
      </label>

      <label>
        <span>表示順</span>
        <input
          v-model.number="categoryOrder"
          type="number"
          min="0"
          step="1"
        >
      </label>

      <label class="category-create-checkbox">
        <input
          v-model="initiallyOpen"
          type="checkbox"
        >
        初期状態でカテゴリを開く
      </label>
    </div>

    <p
      v-if="formError"
      class="category-create-error"
    >
      {{ formError }}
    </p>

    <div class="category-create-destination">
      <strong>作成先</strong>
      <code>{{ destinationPath }}</code>
    </div>

    <div class="category-create-editor">
      <label class="category-create-markdown">
        <span>Markdown</span>
        <textarea
          v-model="markdownSource"
          rows="14"
          spellcheck="false"
        />
      </label>

      <section
        class="category-create-rendered"
        aria-label="リアルタイム表示"
      >
        <span>リアルタイム表示</span>
        <div
          class="category-create-rendered-body"
          v-html="renderedPreview"
        />
      </section>
    </div>

    <div class="category-create-actions">
      <button
        type="button"
        :disabled="Boolean(formError)"
        @click="copyMarkdown"
      >
        {{ copied ? 'コピーしました' : '本文をコピー' }}
      </button>

      <button
        type="button"
        class="primary"
        :disabled="Boolean(formError)"
        @click="openGitHub"
      >
        GitHubでカテゴリを作成
      </button>
    </div>
  </div>
</template>
