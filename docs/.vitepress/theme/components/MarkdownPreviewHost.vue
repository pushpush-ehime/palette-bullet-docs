<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  MARKDOWN_PREVIEW_MESSAGE,
  MARKDOWN_PREVIEW_READY_MESSAGE,
  renderMarkdownPreview
} from '../markdown-preview'
import PageMetaPreview from './PageMetaPreview.vue'

const source = ref('')
const preview = computed(() => renderMarkdownPreview(source.value))

function handleMessage(event: MessageEvent) {
  if (
    event.origin !== window.location.origin ||
    event.source !== window.parent ||
    event.data?.type !== MARKDOWN_PREVIEW_MESSAGE ||
    typeof event.data.source !== 'string'
  ) {
    return
  }

  source.value = event.data.source
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
  window.parent.postMessage(
    { type: MARKDOWN_PREVIEW_READY_MESSAGE },
    window.location.origin
  )
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <main class="markdown-preview-host">
    <p
      v-if="preview.error"
      class="markdown-preview-error"
    >
      {{ preview.error }}
    </p>

    <PageMetaPreview :frontmatter="preview.frontmatter" />

    <div
      v-if="source"
      class="vp-doc"
      v-html="preview.html"
    />

    <p
      v-else
      class="markdown-preview-empty"
    >
      Markdownを入力すると、ここに表示されます。
    </p>
  </main>
</template>

<style scoped>
.markdown-preview-host {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px 24px 40px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.markdown-preview-host :deep(.vp-doc) {
  max-width: none;
}

.markdown-preview-host :deep(.vp-doc > :first-child) {
  margin-top: 0;
}

.markdown-preview-error {
  margin: 0 0 16px;
  padding: 12px 14px;
  color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
  border-radius: 8px;
  font-weight: 700;
}

.markdown-preview-empty {
  margin: 0;
  color: var(--vp-c-text-2);
}
</style>
