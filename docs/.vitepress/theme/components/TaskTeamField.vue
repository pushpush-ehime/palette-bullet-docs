<script setup lang="ts">
import { TASK_TEAM_OPTIONS } from '../../content/task-team.js'

withDefaults(defineProps<{
  modelValue: string
  compact?: boolean
  required?: boolean
  showHelp?: boolean
}>(), {
  compact: false,
  required: false,
  showHelp: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label
    class="task-team-field"
    :class="{ 'is-compact': compact }"
  >
    <span>担当班</span>
    <select
      :value="modelValue"
      :required="required"
      aria-label="担当班"
      @change="emit(
        'update:modelValue',
        ($event.target as HTMLSelectElement).value
      )"
    >
      <option
        value=""
        :disabled="required"
      >
        担当班を選択
      </option>
      <option
        v-for="option in TASK_TEAM_OPTIONS"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <small v-if="showHelp && !compact">
      サイドバー表示とNotionの「班」に使用します。
    </small>
  </label>
</template>
