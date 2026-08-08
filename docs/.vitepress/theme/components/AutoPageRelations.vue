<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as catalog } from '../../content/catalog.data.js'
import { pageUrlFromRelative } from '../utils'
import PageRelations from './PageRelations.vue'

const { page } = useData()
const currentEntry = computed(() => {
  const url = pageUrlFromRelative(page.value.relativePath)
  return catalog.find((entry) => entry.url === url)
})
const shouldShow = computed(
  () =>
    ['spec', 'task'].includes(currentEntry.value?.pageType ?? '') &&
    !currentEntry.value?.hasInlineRelations
)
</script>

<template>
  <section v-if="shouldShow" class="auto-page-relations">
    <h2>{{ currentEntry?.pageType === 'spec' ? '関連タスク' : '関連仕様' }}</h2>
    <PageRelations />
  </section>
</template>
