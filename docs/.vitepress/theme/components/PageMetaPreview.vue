<script setup lang="ts">
import { computed } from 'vue'
import type { PreviewFrontmatter } from '../markdown-preview'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{
  frontmatter: PreviewFrontmatter
}>()

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
      v-if="status"
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
  </div>
</template>
