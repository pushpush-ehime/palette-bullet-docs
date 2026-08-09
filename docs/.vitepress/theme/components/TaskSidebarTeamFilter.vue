<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import {
  TASK_SIDEBAR_FILTERS,
  readTaskSidebarFilter,
  writeTaskSidebarFilter,
  type TaskSidebarFilterKey,
  type TaskSidebarFilterStorage
} from '../../content/sidebar-team-filter.js'

const { page } = useData()
const selectedFilter = ref<TaskSidebarFilterKey>('all')
const isMounted = ref(false)

function browserStorage(): TaskSidebarFilterStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function applyFilterAttribute() {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.taskSidebarTeam = selectedFilter.value
}

function selectFilter(filter: TaskSidebarFilterKey) {
  selectedFilter.value = filter
}

onMounted(() => {
  selectedFilter.value = readTaskSidebarFilter(browserStorage())
  applyFilterAttribute()
  isMounted.value = true
})

watch(selectedFilter, (filter) => {
  writeTaskSidebarFilter(browserStorage(), filter)
  applyFilterAttribute()
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    delete document.documentElement.dataset.taskSidebarTeam
  }
})
</script>

<template>
  <Teleport
    v-if="isMounted"
    defer
    :key="page.relativePath"
    to=".VPSidebarItem:has(> .item .task-sidebar-team-filter-anchor)"
  >
    <div
      class="task-sidebar-team-filter task-sidebar-team-filter-buttons"
      role="group"
      aria-label="担当班で絞り込み"
    >
      <button
        v-for="option in TASK_SIDEBAR_FILTERS"
        :key="option.key"
        type="button"
        :class="{ 'is-active': selectedFilter === option.key }"
        :aria-pressed="selectedFilter === option.key"
        @click="selectFilter(option.key)"
      >
        {{ option.label }}
      </button>
    </div>
  </Teleport>
</template>
