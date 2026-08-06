<script setup lang="ts">
import { computed } from 'vue'
import MarkdownPreviewFrame from './MarkdownPreviewFrame.vue'

type EditorVariant = 'page' | 'category'

const props = withDefaults(defineProps<{
  modelValue: string
  variant?: EditorVariant
}>(), {
  variant: 'page'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorClass = computed(() => `${props.variant}-create-editor`)
const markdownClass = computed(() => `${props.variant}-create-markdown`)
const renderedClass = computed(() => `${props.variant}-create-rendered`)
const renderedBodyClass = computed(
  () => `${props.variant}-create-rendered-body`
)
</script>

<template>
  <div :class="editorClass">
    <label :class="markdownClass">
      <span>Markdown</span>
      <textarea
        :value="modelValue"
        rows="14"
        spellcheck="false"
        @input="emit(
          'update:modelValue',
          ($event.target as HTMLTextAreaElement).value
        )"
      />
    </label>

    <section
      :class="renderedClass"
      aria-label="リアルタイム表示"
    >
      <span>リアルタイム表示</span>
      <div
        :class="renderedBodyClass"
        class="markdown-editor-preview"
      >
        <MarkdownPreviewFrame :source="modelValue" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.markdown-editor-preview {
  padding: 0;
  overflow: hidden;
}
</style>
