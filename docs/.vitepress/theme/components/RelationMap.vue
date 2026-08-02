<script setup lang="ts">
import { computed, ref } from 'vue'
import { data as catalog } from '../../content/catalog.data.js'
import { pageHref } from '../utils'
import {
  indexTasksBySpec,
  relationState,
  relationStateLabels,
  relationStateOptions,
  sortSpecs,
  type RelationState
} from '../relations'
import StatusBadge from './StatusBadge.vue'

const specs = sortSpecs(catalog.filter((page) => page.pageType === 'spec'))
const tasksBySpec = indexTasksBySpec(catalog)
const categories = [
  ...new Map(specs.map((spec) => [spec.category, spec.categoryOrder])).entries()
]
  .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0], 'ja'))
  .map(([category]) => category)

const query = ref('')
const selectedCategory = ref(categories.includes('Player') ? 'Player' : (categories[0] ?? ''))
const selectedRelation = ref<RelationState | ''>('')
const view = ref<'diagram' | 'table'>('diagram')

function relatedTasks(specUrl: string) {
  return tasksBySpec.get(specUrl) ?? []
}

function stateFor(spec: (typeof specs)[number]) {
  return relationState(spec, relatedTasks(spec.url).length)
}

const filteredSpecs = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('ja')

  return specs.filter((spec) => {
    const tasks = relatedTasks(spec.url)
    const matchesCategory =
      !selectedCategory.value || spec.category === selectedCategory.value
    const matchesRelation =
      !selectedRelation.value || stateFor(spec) === selectedRelation.value
    const matchesSearch =
      !search ||
      [
        spec.title,
        spec.description,
        spec.category,
        ...tasks.flatMap((task) => [task.taskId, task.title, task.description])
      ]
        .join(' ')
        .toLocaleLowerCase('ja')
        .includes(search)

    return matchesCategory && matchesRelation && matchesSearch
  })
})

const relationCount = computed(() =>
  filteredSpecs.value.reduce(
    (count, spec) => count + relatedTasks(spec.url).length,
    0
  )
)
</script>

<template>
  <div class="relation-map">
    <div class="catalog-filters">
      <label>
        <span>仕様・タスクを検索</span>
        <input v-model="query" type="search" placeholder="仕様名、タスクID、タスク名" />
      </label>

      <label>
        <span>分類</span>
        <select v-model="selectedCategory">
          <option value="">すべて</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>

      <label>
        <span>関係</span>
        <select v-model="selectedRelation">
          <option value="">すべて</option>
          <option v-for="state in relationStateOptions" :key="state" :value="state">
            {{ relationStateLabels[state] }}
          </option>
        </select>
      </label>
    </div>

    <div class="relation-toolbar">
      <p class="catalog-count" aria-live="polite">
        {{ filteredSpecs.length }}仕様・{{ relationCount }}関係
      </p>
      <div class="relation-view-toggle" role="group" aria-label="表示方法">
        <button
          type="button"
          :class="{ 'is-active': view === 'diagram' }"
          :aria-pressed="view === 'diagram'"
          @click="view = 'diagram'"
        >
          図で見る
        </button>
        <button
          type="button"
          :class="{ 'is-active': view === 'table' }"
          :aria-pressed="view === 'table'"
          @click="view = 'table'"
        >
          表で見る
        </button>
      </div>
    </div>

    <div v-if="filteredSpecs.length && view === 'diagram'" class="relation-diagram">
      <div class="relation-diagram-head" aria-hidden="true">
        <span>仕様</span>
        <span></span>
        <span>タスク</span>
      </div>

      <div v-for="spec in filteredSpecs" :key="spec.url" class="relation-row">
        <a class="relation-node relation-spec-node" :href="pageHref(spec.url)">
          <span class="relation-node-title">{{ spec.title }}</span>
          <span class="relation-node-meta">
            <StatusBadge :status="spec.status" />
            <span>{{ spec.category }}</span>
          </span>
        </a>

        <div class="relation-task-stack">
          <div
            v-for="task in relatedTasks(spec.url)"
            :key="task.url"
            class="relation-edge"
          >
            <span class="relation-connector" aria-hidden="true"></span>
            <a
              class="relation-node relation-task-node"
              :href="pageHref(task.url)"
            >
              <span class="relation-task-id">{{ task.taskId }}</span>
              <span class="relation-node-title">{{ task.title }}</span>
              <span v-if="task.relatedSpecs.length > 1" class="relation-shared-count">
                {{ task.relatedSpecs.length }}仕様に関連
              </span>
            </a>
          </div>
          <div
            v-if="!relatedTasks(spec.url).length"
            class="relation-edge"
          >
            <span class="relation-connector" aria-hidden="true"></span>
            <span
              class="relation-empty-node"
              :class="'relation-state-' + stateFor(spec)"
            >
              {{ relationStateLabels[stateFor(spec)] }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="filteredSpecs.length" class="catalog-table-wrap">
      <table>
        <thead>
          <tr>
            <th>仕様</th>
            <th>状態</th>
            <th>関連タスク</th>
            <th>関係</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="spec in filteredSpecs" :key="spec.url">
            <td><a :href="pageHref(spec.url)">{{ spec.title }}</a></td>
            <td><StatusBadge :status="spec.status" /></td>
            <td>
              <template v-if="relatedTasks(spec.url).length">
                <template v-for="(task, index) in relatedTasks(spec.url)" :key="task.url">
                  <span v-if="index">、</span>
                  <a :href="pageHref(task.url)">{{ task.taskId }}</a>
                </template>
              </template>
              <span v-else>なし</span>
            </td>
            <td>
              <span class="relation-state" :class="'relation-state-' + stateFor(spec)">
                {{ relationStateLabels[stateFor(spec)] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="catalog-empty">該当する仕様はありません。</p>
  </div>
</template>
