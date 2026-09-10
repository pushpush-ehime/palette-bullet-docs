<script setup lang="ts">
import { computed, ref } from 'vue'
import { data as catalog } from '../../content/catalog.data.js'
import { pageHref } from '../utils'
import { indexSpecsByTask, sortTasks } from '../relations'
import TaskProgress from './TaskProgress.vue'
import { PROGRESS_FILTERS, matchesTaskProgress } from '../../content/task-progress.mjs'
import { RECORDS_ANCHOR } from '../../content/task-records.mjs'

const props = withDefaults(
  defineProps<{
    category?: string
  }>(),
  { category: '' }
)

const query = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')

const tasks = sortTasks(catalog.filter((page) => page.pageType === 'task'))
const specsByTask = indexSpecsByTask(catalog)

const categories = [...new Set(tasks.map((task) => task.category))]

const filteredTasks = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('ja')
  const category = props.category || selectedCategory.value

  return tasks.filter((task) => {
    const relatedSpecTitles = relatedSpecs(task.url)
      .map((spec) => spec.title)
      .join(' ')
    const matchesCategory = !category || task.category === category
    const matchesSearch =
      !search ||
      `${task.taskId} ${task.title} ${task.category} ${relatedSpecTitles}`
        .toLocaleLowerCase('ja')
        .includes(search)
    return matchesCategory && matchesSearch && matchesTaskProgress(task, selectedStatus.value)
  })
})

function relatedSpecs(taskUrl: string) {
  return specsByTask.get(taskUrl) ?? []
}
</script>

<template>
  <div class="catalog-block task-catalog">
    <div class="catalog-filters">
      <label>
        <span>タスクを検索</span>
        <input v-model="query" type="search" placeholder="IDまたはタスク名" />
      </label>

      <label v-if="!props.category">
        <span>分類</span>
        <select v-model="selectedCategory">
          <option value="">すべて</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>
      <label>
        <span>Notionの進捗</span>
        <select v-model="selectedStatus">
          <option value="">すべて</option>
          <option v-for="status in PROGRESS_FILTERS" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
    </div>

    <p class="task-progress-note">進捗はNotionから取得した時点の情報です。リアルタイムではありません。</p>
    <p class="catalog-count">{{ filteredTasks.length }}件</p>

    <div v-if="filteredTasks.length" class="catalog-table-wrap">
      <table>
        <thead>
          <tr>
            <th>タスクID</th>
            <th>タスク名</th>
            <th>Notionの進捗</th>
            <th>実装・成果記録</th>
            <th v-if="!props.category">分類</th>
            <th>関連仕様</th>
            <th>Notion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in filteredTasks" :key="task.taskId">
            <td>
              <a :href="pageHref(task.url)">{{ task.taskId }}</a>
            </td>
            <td>{{ task.title }}</td>
            <td><TaskProgress v-if="task.progress" :progress="task.progress" /></td>
            <td>
              <a :href="`${pageHref(task.url)}#${RECORDS_ANCHOR}`">
                {{ task.implementationRecords?.count ? `記録あり（${task.implementationRecords.count}件）` : '実装記録は未登録' }}
              </a>
            </td>
            <td v-if="!props.category">{{ task.category }}</td>
            <td>
              <template
                v-for="(spec, index) in relatedSpecs(task.url)"
                :key="spec.url"
              >
                <span v-if="index">、</span>
                <a :href="pageHref(spec.url)">{{ spec.title }}</a>
              </template>
            </td>
            <td>
              <a
                v-if="task.notionUrl"
                :href="task.notionUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                チケット
              </a>
              <span v-else class="catalog-empty-cell">リンクなし</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="catalog-empty">該当するタスクはありません。</p>
  </div>
</template>
