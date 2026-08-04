<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as catalog } from '../../content/catalog.data.js'
import StatusBadge from './StatusBadge.vue'

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
    catalog.find((entry) => entry.taskId === frontmatter.value.taskId)
      ?.notionUrl ?? ''
)
</script>

<template>
  <div v-if="isManagedPage" class="page-meta" aria-label="ページ情報">
    <StatusBadge v-if="frontmatter.status" :status="frontmatter.status" />
    <span v-if="frontmatter.taskId" class="page-meta-id">{{ frontmatter.taskId }}</span>
    <span v-if="frontmatter.category" class="page-meta-category">
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
  </div>
</template>
