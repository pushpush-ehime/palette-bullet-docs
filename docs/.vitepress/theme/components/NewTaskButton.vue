<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { data as catalog } from '../../content/catalog.data.js'
import { data as taskTemplate } from '../../content/task-template.data.js'
import { isTaskTeam } from '../../content/task-team.js'
import { pageUrlFromRelative } from '../utils'
import { newTaskLink, nextTaskId, taskFilePath, taskLocation } from '../task-draft'
import TaskTeamField from './TaskTeamField.vue'

const { page } = useData()
const team = ref('')
const currentUrl = computed(() => pageUrlFromRelative(page.value.relativePath))
const spec = computed(() =>
  catalog.find((entry) => entry.url === currentUrl.value && entry.pageType === 'spec')
)

watch(currentUrl, () => {
  team.value = ''
})

const taskContext = computed(() => {
  if (!spec.value) return null

  const taskId = nextTaskId(catalog)
  const location = taskLocation(catalog, spec.value.url)

  return {
    taskId,
    filePath: taskFilePath(location, taskId),
    location
  }
})

const draft = computed(() => {
  if (!spec.value || !taskContext.value || !isTaskTeam(team.value)) return null

  return {
    ...taskContext.value,
    href: newTaskLink(
      taskTemplate,
      spec.value,
      taskContext.value.taskId,
      taskContext.value.location,
      team.value
    )
  }
})
</script>

<template>
  <div
    v-if="taskContext"
    class="new-task-creator"
  >
    <TaskTeamField
      v-model="team"
      compact
      required
      :show-help="false"
    />

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

    <button
      v-else
      class="new-task-button"
      type="button"
      disabled
      title="担当班を選択してください。"
    >
      ＋ タスクを生成（{{ taskContext.taskId }}）
    </button>
  </div>
</template>
