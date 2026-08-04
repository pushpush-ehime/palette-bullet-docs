<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'spec' | 'task'
}>()

const rootDirectory = computed(() =>
  props.type === 'spec' ? 'spec' : 'tasks'
)

const label = computed(() =>
  props.type === 'spec'
    ? '＋ 仕様カテゴリを追加'
    : '＋ タスクカテゴリを追加'
)

const githubUrl = computed(() => {
  return (
    'https://github.com/pushpush-ehime/palette-bullet-docs/' +
    `new/main/docs/${rootDirectory.value}` +
    '?filename=new-category/index.md'
  )
})
</script>

<template>
  <a
    class="category-create-button"
    :href="githubUrl"
    target="_blank"
    rel="noopener noreferrer"
  >
    {{ label }}
  </a>
</template>