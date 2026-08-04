<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as catalog } from '../../content/catalog.data.js'
import { data as taskTemplate } from '../../content/task-template.data.js'
import { pageUrlFromRelative } from '../utils'
import { newTaskLink, nextTaskId, taskFilePath, taskLocation } from '../task-draft'

const { page } = useData()
const currentUrl = computed(() => pageUrlFromRelative(page.value.relativePath))
const spec = computed(() =>
  catalog.find((entry) => entry.url === currentUrl.value && entry.pageType === 'spec')
)
const draft = computed(() => {
  if (!spec.value) return null

  const taskId = nextTaskId(catalog)
  const location = taskLocation(catalog, spec.value.url)

  return {
    taskId,
    filePath: taskFilePath(location, taskId),
    href: newTaskLink(taskTemplate, spec.value, taskId, location)
  }
})
</script>

<template>
  <a
    v-if="draft"
    class="new-task-button"
    :href="draft.href"
    target="_blank"
    rel="noopener"
    :title="`${draft.filePath} をGitHubで作成します。テンプレートとこの仕様の内容が入力済みです。コミットするときは「Create a new branch for this commit and start a pull request」を選んでください。`"
  >
    ＋ タスクを生成（{{ draft.taskId }}）
  </a>
</template>
