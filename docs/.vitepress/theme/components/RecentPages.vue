<script setup lang="ts">
import { computed } from 'vue'
import { data as catalog } from '../../content/catalog.data.js'
import { pageHref } from '../utils'

const props = withDefaults(
  defineProps<{
    limit?: number
  }>(),
  { limit: 5 }
)

const recentPages = computed(() =>
  catalog
    .filter((page) => page.pageType !== 'home' && page.title && page.updatedAt)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )
    .slice(0, props.limit)
)

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Tokyo'
})

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}
</script>

<template>
  <ul class="recent-page-list">
    <li v-for="page in recentPages" :key="page.url">
      <a :href="pageHref(page.url)">{{ page.title }}</a>
      <time :datetime="page.updatedAt">{{ formatDate(page.updatedAt) }}</time>
    </li>
  </ul>
</template>
