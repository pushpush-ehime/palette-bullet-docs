<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const REPOSITORY_URL =
  'https://github.com/pushpush-ehime/palette-bullet-docs'
const DEFAULT_BRANCH = 'main'

const { frontmatter, page } = useData()

const isDeletablePage = computed(() => {
  if (frontmatter.value.pageType === 'task') {
    return true
  }

  if (frontmatter.value.pageType !== 'spec') {
    return false
  }

  return !page.value.relativePath.endsWith('/index.md')
})

const githubFileUrl = computed(() => {
  const repositoryPath = `docs/${page.value.relativePath}`

  const encodedPath = repositoryPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${REPOSITORY_URL}/blob/${DEFAULT_BRANCH}/${encodedPath}`
})

function confirmDelete(event: MouseEvent) {
  const pageTitle = String(
    frontmatter.value.title ||
      page.value.title ||
      'このページ'
  )

  const message = [
    `「${pageTitle}」の削除を開始します。`,
    '',
    'GitHubで「Delete file」を選択してください。',
    '',
    'mainへ直接コミットせず、',
    '新しいブランチとPull Requestを作成してください。'
  ].join('\n')

  if (!window.confirm(message)) {
    event.preventDefault()
  }
}
</script>

<template>
  <a
    v-if="isDeletablePage"
    :href="githubFileUrl"
    class="delete-page-button"
    target="_blank"
    rel="noopener noreferrer"
    @click="confirmDelete"
  >
    削除PRを作る
  </a>
</template>
