<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as catalog } from '../../content/catalog.data.js'

/*
 * NotionチケットのURLは、公開の直前に作られる対応表から入る。
 * まだチケットがないときは「未登録」と出す。
 */
const { frontmatter } = useData()
const notionUrl = computed(
  () =>
    catalog.find((entry) => entry.taskId === frontmatter.value.taskId)
      ?.notionUrl ?? ''
)
</script>

<template>
  <a
    v-if="notionUrl"
    :href="notionUrl"
    target="_blank"
    rel="noopener noreferrer"
  >
    Notionでこのタスクを開く
  </a>
  <span v-else>未登録</span>
</template>
