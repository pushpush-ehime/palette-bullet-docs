<script setup lang="ts">
import { formatProgressTime, taskProgress } from '../../content/task-progress.mjs'

defineProps<{ progress: ReturnType<typeof taskProgress> }>()
</script>

<template>
  <div class="task-progress">
    <span class="task-progress-badge" :data-state="progress.status || progress.kind">
      {{ progress.label }}
    </span>
    <small v-if="progress.fetchedAt">
      取得：<time :datetime="progress.fetchedAt">{{ formatProgressTime(progress.fetchedAt) }}</time>
    </small>
    <small v-else>取得日時なし</small>
    <small v-if="progress.stale" class="task-progress-warning">
      {{ progress.failure === 'unconfigured' ? '取得設定なし' : '最新の取得に失敗' }}・前回情報
    </small>
    <small v-else-if="progress.failure === 'unconfigured'">取得設定なし</small>
  </div>
</template>
