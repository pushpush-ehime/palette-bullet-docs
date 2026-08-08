<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as catalog } from '../../content/catalog.data.js'
import { pageHref, pageUrlFromRelative } from '../utils'
import {
  relationIndexes,
  relationState,
  relationStateLabels
} from '../relations'
import StatusBadge from './StatusBadge.vue'

const { page } = useData()
const { tasksBySpec, specsByTask } = relationIndexes(catalog)
const currentUrl = computed(() => pageUrlFromRelative(page.value.relativePath))
const currentEntry = computed(() =>
  catalog.find((entry) => entry.url === currentUrl.value)
)
const relatedTasks = computed(() =>
  currentEntry.value?.pageType === 'spec'
    ? (tasksBySpec.get(currentEntry.value.url) ?? [])
    : []
)
const relatedSpecs = computed(() =>
  currentEntry.value?.pageType === 'task'
    ? (specsByTask.get(currentEntry.value.url) ?? [])
    : []
)
const emptyState = computed(() => {
  if (!currentEntry.value || currentEntry.value.pageType !== 'spec') return ''
  return relationStateLabels[
    relationState(currentEntry.value, relatedTasks.value.length)
  ]
})
</script>

<template>
  <div v-if="currentEntry" class="page-relations">
    <ul v-if="relatedTasks.length" class="page-relation-list">
      <li v-for="task in relatedTasks" :key="task.url">
        <a class="page-relation-link" :href="pageHref(task.url)">
          <span class="page-relation-heading">
            <span class="page-relation-id">{{ task.taskId }}</span>
            <span>{{ task.title }}</span>
          </span>
          <span class="page-relation-description">{{ task.description }}</span>
        </a>
      </li>
    </ul>

    <ul v-else-if="relatedSpecs.length" class="page-relation-list">
      <li v-for="spec in relatedSpecs" :key="spec.url">
        <a class="page-relation-link" :href="pageHref(spec.url)">
          <span class="page-relation-heading">
            <StatusBadge :status="spec.status" />
            <span>{{ spec.title }}</span>
          </span>
          <span class="page-relation-description">{{ spec.description }}</span>
        </a>
      </li>
    </ul>

    <p v-else class="page-relation-empty">{{ emptyState || '関連仕様なし' }}</p>
  </div>
</template>
