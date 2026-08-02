<script setup lang="ts">
import { computed } from 'vue'
import { data as catalog } from '../../content/catalog.data.js'
import { pageHref } from '../utils'

const questions = computed(() =>
  catalog
    .filter((page) => page.pageType === 'spec')
    .flatMap((page) =>
      page.openQuestions.map((question) => ({
        pageTitle: page.title,
        pageUrl: page.url,
        category: page.category,
        question
      }))
    )
)
</script>

<template>
  <ul v-if="questions.length" class="open-question-list">
    <li v-for="item in questions" :key="`${item.pageUrl}-${item.question}`">
      <a :href="pageHref(item.pageUrl)">{{ item.pageTitle }}</a>
      <span class="open-question-category">{{ item.category }}</span>
      <span>{{ item.question }}</span>
    </li>
  </ul>
  <p v-else>未決事項はありません。</p>
</template>
