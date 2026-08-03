<script setup>
import { computed } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()


// 現在ページのURL
const path = computed(() => route.path)


// 仕様ページか？
const specCategory = computed(() => {

  const match = path.value.match(
    /^\/spec\/([^\/]+)/
  )

  return match ? match[1] : null

})


// タスクページか？
const taskCategory = computed(() => {

  const match = path.value.match(
    /^\/tasks\/([^\/]+)/
  )

  return match ? match[1] : null

})


const addSpecUrl = computed(() => {

  if (!specCategory.value) {
    return null
  }

  return `/guide/new-page?type=spec&category=${specCategory.value}`

})


const addTaskUrl = computed(() => {

  if (!taskCategory.value) {
    return null
  }

  return `/guide/new-page?type=task&category=${taskCategory.value}`

})

</script>


<template>

<div>

  <a
    v-if="addSpecUrl"
    :href="addSpecUrl"
    class="add-link"
  >
    ＋仕様を追加
  </a>


  <a
    v-if="addTaskUrl"
    :href="addTaskUrl"
    class="add-link"
  >
    ＋タスクを追加
  </a>


</div>

</template>


<style scoped>

.add-link {
  display:block;
  padding:8px 16px;
  color:#666;
  font-size:14px;
}

.add-link:hover {
  color:#3451b2;
}

</style>
