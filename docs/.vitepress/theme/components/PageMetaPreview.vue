<script setup lang="ts">
import { computed } from 'vue'
import type { PreviewFrontmatter } from '../markdown-preview'
import StatusBadge from './StatusBadge.vue'
import { taskRecords } from '../../content/task-records.mjs'
import { taskProgress } from '../../content/task-progress.mjs'
import { data as catalog } from '../../content/catalog.data.js'
import TaskProgress from './TaskProgress.vue'

const props = defineProps<{
  frontmatter: PreviewFrontmatter
  source: string
}>()

const isTask = computed(() => props.frontmatter.pageType === 'task')
const records = computed(() => taskRecords(props.source))
const progress = computed(() => catalog.find((entry) => entry.pageType === 'task' &&
  entry.taskId === props.frontmatter.taskId)?.progress ?? taskProgress(null, ''))

const status = computed(() => String(props.frontmatter.status ?? ''))
const taskId = computed(() => String(props.frontmatter.taskId ?? ''))
const category = computed(() => String(props.frontmatter.category ?? ''))
const hasMeta = computed(
  () => Boolean(status.value || taskId.value || category.value)
)
</script>

<template>
  <div
    v-if="hasMeta"
    class="page-meta"
    aria-label="ページ情報のプレビュー"
  >
    <StatusBadge
      v-if="!isTask && status"
      :status="status"
    />

    <span
      v-if="taskId"
      class="page-meta-id"
    >
      {{ taskId }}
    </span>

    <span
      v-if="category"
      class="page-meta-category"
    >
      {{ category }}
    </span>
    <div v-if="isTask" class="task-page-progress">
      <strong>Notionの進捗（公開時の取得情報）</strong>
      <TaskProgress :progress="progress" />
      <p class="task-progress-note">この編集でNotionの進捗は変わりません。リアルタイムではありません。</p>
      <p>{{ records.count ? `実装記録あり（${records.count}件）` : '実装記録は未登録' }}</p>
    </div>
  </div>
</template>
