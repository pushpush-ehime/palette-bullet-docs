<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as catalog } from '../../content/catalog.data.js'
import DeletePageButton from './DeletePageButton.vue'
import NewTaskButton from './NewTaskButton.vue'
import StatusBadge from './StatusBadge.vue'
import TaskProgress from './TaskProgress.vue'
import { RECORDS_ANCHOR } from '../../content/task-records.mjs'

const task = computed(() => frontmatter.value.pageType === 'task'
  ? catalog.find((entry) => entry.pageType === 'task' && entry.taskId === frontmatter.value.taskId)
  : undefined)

const { frontmatter } = useData()

const isManagedPage = computed(() =>
  ['spec', 'task'].includes(frontmatter.value.pageType)
)

/*
 * NotionチケットのURLは、公開の直前に作られる対応表から入る。
 * frontmatterには載らないので、カタログから引く。
 */
const notionUrl = computed(
  () =>
    catalog.find(
      (entry) =>
        entry.taskId === frontmatter.value.taskId
    )?.notionUrl ?? ''
)
</script>

<template>
  <div
    v-if="isManagedPage"
    class="page-meta"
    aria-label="ページ情報"
  >
    <StatusBadge
      v-if="frontmatter.pageType === 'spec' && frontmatter.status"
      :status="frontmatter.status"
    />

    <span
      v-if="frontmatter.taskId"
      class="page-meta-id"
    >
      {{ frontmatter.taskId }}
    </span>

    <span
      v-if="frontmatter.category"
      class="page-meta-category"
    >
      {{ frontmatter.category }}
    </span>

    <a
      v-if="notionUrl"
      class="page-meta-notion"
      :href="notionUrl"
      target="_blank"
      rel="noopener noreferrer"
    >
      Notionタスク
    </a>

    <NewTaskButton
      v-if="frontmatter.pageType === 'spec'"
    />

    <DeletePageButton />
    <div v-if="task?.progress" class="task-page-progress">
      <strong>Notionの進捗</strong>
      <TaskProgress :progress="task.progress" />
      <p class="task-progress-note">取得時点の情報です。リアルタイムではありません。</p>
      <a :href="`#${RECORDS_ANCHOR}`">
        {{ task.implementationRecords?.count ? `実装記録あり（${task.implementationRecords.count}件）` : '実装記録は未登録' }}
      </a>
    </div>
  </div>
</template>
