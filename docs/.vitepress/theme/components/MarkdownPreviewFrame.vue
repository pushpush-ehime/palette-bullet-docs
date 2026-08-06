<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import {
  MARKDOWN_PREVIEW_MESSAGE,
  MARKDOWN_PREVIEW_READY_MESSAGE
} from '../markdown-preview'

const props = defineProps<{
  source: string
  title?: string
}>()

const frame = ref<HTMLIFrameElement | null>(null)
const previewUrl = computed(() => withBase('/guide/preview-host.html'))

function postSource() {
  if (!frame.value?.contentWindow) {
    return
  }

  frame.value.contentWindow.postMessage(
    {
      type: MARKDOWN_PREVIEW_MESSAGE,
      source: props.source
    },
    window.location.origin
  )
}

function handleMessage(event: MessageEvent) {
  if (
    event.origin !== window.location.origin ||
    event.source !== frame.value?.contentWindow ||
    event.data?.type !== MARKDOWN_PREVIEW_READY_MESSAGE
  ) {
    return
  }

  postSource()
}

watch(() => props.source, postSource)

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <iframe
    ref="frame"
    class="markdown-preview-frame"
    :src="previewUrl"
    :title="title ?? 'Markdownプレビュー'"
    @load="postSource"
  />
</template>

<style scoped>
.markdown-preview-frame {
  display: block;
  width: 100%;
  min-height: 360px;
  height: 100%;
  border: 0;
  background: var(--vp-c-bg);
}
</style>
