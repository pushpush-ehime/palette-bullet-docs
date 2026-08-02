<script setup lang="ts">
import { computed, ref } from 'vue'
import { data as catalog } from '../../content/catalog.data.js'
import { pageHref } from '../utils'

const props = withDefaults(
  defineProps<{
    category?: string
  }>(),
  { category: '' }
)

const query = ref('')
const selectedCategory = ref('')

const pagesByUrl = new Map(catalog.map((page) => [page.url, page]))
const tasks = catalog
  .filter((page) => page.pageType === 'task')
  .sort(
    (left, right) =>
      left.categoryOrder - right.categoryOrder ||
      left.order - right.order ||
      left.taskId.localeCompare(right.taskId)
  )

const categories = [...new Set(tasks.map((task) => task.category))]

const filteredTasks = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('ja')
  const category = props.category || selectedCategory.value

  return tasks.filter((task) => {
    const matchesCategory = !category || task.category === category
    const matchesSearch =
      !search ||
      `${task.taskId} ${task.title} ${task.category}`
        .toLocaleLowerCase('ja')
        .includes(search)
    return matchesCategory && matchesSearch
  })
})

function specTitle(url: string) {
  return pagesByUrl.get(url)?.title ?? url
}
</script>

<template>
  <div class="catalog-block">
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
    </div>

    <p class="catalog-count">{{ filteredTasks.length }}件</p>

    <div v-if="filteredTasks.length" class="catalog-table-wrap">
      <table>
        <thead>
          <tr>
            <th>タスクID</th>
            <th>タスク名</th>
            <th v-if="!props.category">分類</th>
            <th>関連仕様</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in filteredTasks" :key="task.taskId">
            <td>
              <a :href="pageHref(task.url)">{{ task.taskId }}</a>
            </td>
            <td>{{ task.title }}</td>
            <td v-if="!props.category">{{ task.category }}</td>
            <td>
              <template v-for="(spec, index) in task.relatedSpecs" :key="spec">
                <span v-if="index">、</span>
                <a :href="pageHref(spec)">{{ specTitle(spec) }}</a>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="catalog-empty">該当するタスクはありません。</p>
  </div>
</template>
