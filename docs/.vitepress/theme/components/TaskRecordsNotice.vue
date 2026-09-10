<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as catalog } from '../../content/catalog.data.js'
import { pageHref } from '../utils'
import { RECORDS_ANCHOR } from '../../content/task-records.mjs'

const { frontmatter } = useData()
const task = computed(() => frontmatter.value.pageType === 'task'
  ? catalog.find((entry) => entry.pageType === 'task' && entry.taskId === frontmatter.value.taskId)
  : undefined)
</script>

<template>
  <section v-if="task && !task.implementationRecords?.hasSection" class="vp-doc task-records-notice" aria-label="実装・成果記録">
    <h2 :id="RECORDS_ANCHOR" tabindex="-1">実装・成果記録</h2>
    <p>実装記録は未登録</p>
    <p><a :href="pageHref('/guide/task-records')">途中経過・成果の記録方法</a></p>
  </section>
</template>
