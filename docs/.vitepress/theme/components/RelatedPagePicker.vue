<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { data as catalog, type CatalogEntry } from '../../content/catalog.data.js'
import { canonicalRelationUrl } from '../../content/relation-graph.js'

type PageType = 'spec' | 'task'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    pageTypes?: PageType[]
    lockedUrls?: string[]
    excludeUrl?: string
    label?: string
  }>(),
  {
    pageTypes: () => ['spec', 'task'],
    lockedUrls: () => [],
    excludeUrl: '',
    label: '関連ページ'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const query = ref('')
const category = ref('')
const selectedType = ref<PageType | ''>(
  props.pageTypes.length === 1 ? props.pageTypes[0] : ''
)
const resultLimit = 40

const pages = computed(() =>
  catalog
    .filter(
      (page) =>
        props.pageTypes.includes(page.pageType as PageType) &&
        canonicalRelationUrl(page.url) !== canonicalRelationUrl(props.excludeUrl)
    )
    .sort(comparePages)
)

const pagesByUrl = computed(
  () => new Map(pages.value.map((page) => [canonicalRelationUrl(page.url), page]))
)

const categories = computed(() => [
  ...new Set(
    pages.value
      .filter((page) => !selectedType.value || page.pageType === selectedType.value)
      .map((page) => page.category)
      .filter(Boolean)
  )
].sort((left, right) => left.localeCompare(right, 'ja')))

const hasFilter = computed(() =>
  Boolean(
    query.value.trim() ||
    category.value ||
    (props.pageTypes.length > 1 && selectedType.value)
  )
)

const matchingPages = computed(() => {
  if (!hasFilter.value) return []

  const search = query.value.trim().toLocaleLowerCase('ja')

  return pages.value.filter((page) => {
    const matchesType = !selectedType.value || page.pageType === selectedType.value
    const matchesCategory = !category.value || page.category === category.value
    const matchesSearch =
      !search ||
      [page.taskId, page.title, page.description, page.category, page.url]
        .join(' ')
        .toLocaleLowerCase('ja')
        .includes(search)

    return matchesType && matchesCategory && matchesSearch
  })
})

const visiblePages = computed(() => matchingPages.value.slice(0, resultLimit))
const selectedSet = computed(() =>
  new Set(props.modelValue.map(canonicalRelationUrl))
)
const lockedSet = computed(() =>
  new Set(props.lockedUrls.map(canonicalRelationUrl))
)
const localSelectedPages = computed(() =>
  props.modelValue
    .filter((url) => !lockedSet.value.has(canonicalRelationUrl(url)))
    .map((url) => pagesByUrl.value.get(canonicalRelationUrl(url)))
    .filter((page): page is CatalogEntry => Boolean(page))
)
const lockedPages = computed(() =>
  props.lockedUrls
    .map((url) => pagesByUrl.value.get(canonicalRelationUrl(url)))
    .filter((page): page is CatalogEntry => Boolean(page))
)
const unknownUrls = computed(() =>
  props.modelValue.filter((url) => !pagesByUrl.value.has(canonicalRelationUrl(url)))
)
const totalSelected = computed(
  () => new Set(
    [...props.modelValue, ...props.lockedUrls].map(canonicalRelationUrl)
  ).size
)

watch(
  () => props.pageTypes.join(','),
  () => {
    selectedType.value = props.pageTypes.length === 1 ? props.pageTypes[0] : ''
    category.value = ''
    query.value = ''
  }
)

watch(categories, (nextCategories) => {
  if (category.value && !nextCategories.includes(category.value)) {
    category.value = ''
  }
})

function comparePages(left: CatalogEntry, right: CatalogEntry) {
  return (
    left.pageType.localeCompare(right.pageType) ||
    left.categoryOrder - right.categoryOrder ||
    left.order - right.order ||
    left.taskId.localeCompare(right.taskId) ||
    left.title.localeCompare(right.title, 'ja')
  )
}

function pageLabel(page: CatalogEntry) {
  return page.pageType === 'task' && page.taskId
    ? `${page.taskId}｜${page.title}`
    : page.title
}

function isSelected(url: string) {
  return selectedSet.value.has(canonicalRelationUrl(url))
}

function isLocked(url: string) {
  return lockedSet.value.has(canonicalRelationUrl(url))
}

function setChecked(url: string, checked: boolean) {
  const canonicalUrl = canonicalRelationUrl(url)
  if (lockedSet.value.has(canonicalUrl)) return

  const next = new Map(
    props.modelValue.map((item) => [canonicalRelationUrl(item), item])
  )
  if (checked) next.set(canonicalUrl, url)
  else next.delete(canonicalUrl)

  emit(
    'update:modelValue',
    pages.value
      .filter((page) => next.has(canonicalRelationUrl(page.url)))
      .map((page) => page.url)
      .concat(
        [...next.entries()]
          .filter(([key]) => !pagesByUrl.value.has(key))
          .map(([, value]) => value)
      )
  )
}

function changeChecked(event: Event, url: string) {
  setChecked(url, (event.currentTarget as HTMLInputElement).checked)
}
</script>

<template>
  <fieldset class="related-page-picker">
    <legend>{{ label }}</legend>

    <div class="related-page-picker-filters">
      <label>
        <span>ページ種別</span>
        <select v-model="selectedType" :disabled="pageTypes.length === 1">
          <option v-if="pageTypes.length > 1" value="">すべて</option>
          <option v-if="pageTypes.includes('spec')" value="spec">仕様</option>
          <option v-if="pageTypes.includes('task')" value="task">タスク</option>
        </select>
      </label>

      <label>
        <span>カテゴリ</span>
        <select v-model="category">
          <option value="">すべて</option>
          <option v-for="item in categories" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </label>

      <label>
        <span>テキスト検索</span>
        <input
          v-model="query"
          type="search"
          placeholder="タイトル、ID、内容、URL"
        />
      </label>
    </div>

    <div class="related-page-picker-summary" aria-live="polite">
      <strong>{{ totalSelected }}件を関連付け</strong>
      <span>カテゴリまたは検索語で候補を絞り込んでください。</span>
    </div>

    <ul
      v-if="localSelectedPages.length || lockedPages.length || unknownUrls.length"
      class="related-page-picker-selected"
      aria-label="選択済みの関連ページ"
    >
      <li v-for="page in localSelectedPages" :key="page.url">
        <span>{{ pageLabel(page) }}</span>
        <button
          type="button"
          :aria-label="`${pageLabel(page)}を解除`"
          @click="setChecked(page.url, false)"
        >解除</button>
      </li>
      <li v-for="page in lockedPages" :key="`locked-${page.url}`" class="is-locked">
        <span>{{ pageLabel(page) }}</span>
        <small>相手側のページで設定済み</small>
      </li>
      <li v-for="url in unknownUrls" :key="url" class="is-locked">
        <span>{{ url }}</span>
        <small>現在の一覧に未掲載のため保持</small>
      </li>
    </ul>

    <p v-if="!hasFilter" class="related-page-picker-hint">
      候補はまだ表示していません。カテゴリを選ぶか、検索語を入力してください。
    </p>

    <div v-else-if="visiblePages.length" class="related-page-picker-results">
      <label
        v-for="page in visiblePages"
        :key="page.url"
        class="related-page-picker-option"
        :class="{
          'is-selected': isSelected(page.url) || isLocked(page.url),
          'is-locked': isLocked(page.url)
        }"
      >
        <input
          type="checkbox"
          :checked="isSelected(page.url) || isLocked(page.url)"
          :disabled="isLocked(page.url)"
          @change="changeChecked($event, page.url)"
        />
        <span>
          <strong>{{ pageLabel(page) }}</strong>
          <small>
            {{ page.pageType === 'spec' ? '仕様' : 'タスク' }}・{{ page.category }}・{{ page.url }}
          </small>
        </span>
      </label>
    </div>

    <p v-else class="related-page-picker-hint">該当するページはありません。</p>

    <small v-if="matchingPages.length > resultLimit" class="related-page-picker-limit">
      {{ matchingPages.length }}件中{{ resultLimit }}件を表示しています。検索を追加して絞り込んでください。
    </small>
  </fieldset>
</template>
