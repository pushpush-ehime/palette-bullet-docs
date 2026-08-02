<script setup lang="ts">
import { computed, ref } from 'vue'
import { data as catalog } from '../../content/catalog.data.js'
import { pageHref } from '../utils'
import StatusBadge from './StatusBadge.vue'

const props = withDefaults(
  defineProps<{
    category?: string
    status?: string
  }>(),
  { category: '', status: '' }
)

const query = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const statusOrder = ['確定', '仮仕様', '未決', '対象外', '廃止']

const specs = catalog
  .filter((page) => page.pageType === 'spec')
  .sort(
    (left, right) =>
      left.categoryOrder - right.categoryOrder ||
      left.order - right.order ||
      left.title.localeCompare(right.title, 'ja')
  )

const categories = [...new Set(specs.map((spec) => spec.category))]

const filteredSpecs = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('ja')
  const category = props.category || selectedCategory.value
  const status = props.status || selectedStatus.value

  return specs.filter((spec) => {
    const matchesCategory = !category || spec.category === category
    const matchesStatus = !status || spec.status === status
    const matchesSearch =
      !search ||
      `${spec.title} ${spec.description} ${spec.category}`
        .toLocaleLowerCase('ja')
        .includes(search)
    return matchesCategory && matchesStatus && matchesSearch
  })
})
</script>

<template>
  <div class="catalog-block">
    <div class="catalog-filters">
      <label>
        <span>仕様を検索</span>
        <input v-model="query" type="search" placeholder="ページ名または内容" />
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

      <label v-if="!props.status">
        <span>仕様状態</span>
        <select v-model="selectedStatus">
          <option value="">すべて</option>
          <option v-for="status in statusOrder" :key="status" :value="status">
            {{ status }}
          </option>
        </select>
      </label>
    </div>

    <p class="catalog-count">{{ filteredSpecs.length }}件</p>

    <div v-if="filteredSpecs.length" class="catalog-table-wrap">
      <table>
        <thead>
          <tr>
            <th>仕様</th>
            <th v-if="!props.category">分類</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="spec in filteredSpecs" :key="spec.url">
            <td><a :href="pageHref(spec.url)">{{ spec.title }}</a></td>
            <td v-if="!props.category">{{ spec.category }}</td>
            <td><StatusBadge :status="spec.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="catalog-empty">該当する仕様はありません。</p>
  </div>
</template>
