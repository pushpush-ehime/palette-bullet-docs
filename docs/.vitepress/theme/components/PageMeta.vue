<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import StatusBadge from './StatusBadge.vue'

const { frontmatter } = useData()
const isManagedPage = computed(() =>
  ['spec', 'task'].includes(frontmatter.value.pageType)
)
</script>

<template>
  <div v-if="isManagedPage" class="page-meta" aria-label="ページ情報">
    <StatusBadge v-if="frontmatter.status" :status="frontmatter.status" />
    <span v-if="frontmatter.taskId" class="page-meta-id">{{ frontmatter.taskId }}</span>
    <span v-if="frontmatter.category" class="page-meta-category">
      {{ frontmatter.category }}
    </span>
  </div>
</template>
