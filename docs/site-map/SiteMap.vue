<script setup>
import { withBase } from 'vitepress'
// catalog.data.ts からデータを読み込む
import { data } from '../.vitepress/content/catalog.data'

// ガイド用のページ（pageTypeが 'guide' のもの）
const guidePages = data
  .filter(page => page.pageType === 'guide' || page.url.includes('/guide/'))
  .sort((a, b) => (a.order || 99) - (b.order || 99))

// トップレベルの単独ページ
const topLevelUrls = [
  '/game-overview',
  '/relations',
  '/glossary',
  '/open-questions'
]
const topLevelPages = topLevelUrls
  .map(url => data.find(page => page.url === url))
  .filter(Boolean)

// 特定のページタイプ（仕様やタスク）を「カテゴリごと」に分類する関数
const getGroupedData = (targetPageType) => {
  const pages = data.filter(p => p.pageType === targetPageType)
  const categories = {}

  pages.forEach(page => {
    const cat = page.category || 'その他'
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(page)
  })

  // order（並び順）でソート
  Object.keys(categories).forEach(cat => {
    categories[cat].sort((a, b) => (a.order || 99) - (b.order || 99))
  })

  return categories
}

// 仕様・設計とタスク説明のデータをカテゴリ別に取得
const specCategories = getGroupedData('spec')
const taskCategories = getGroupedData('task')
</script>

<template>
  <div class="sitemap-tree">
    <ul>
      <li><a :href="withBase('/')">ホーム</a></li>

      <!-- はじめに・ゲーム概要など -->
      <li v-for="page in guidePages" :key="page.url">
        <a :href="withBase(page.url)">{{ page.title }}</a>
      </li>
      <li v-for="page in topLevelPages" :key="page.url">
        <a :href="withBase(page.url)">{{ page.title }}</a>
      </li>

      <!-- 仕様・設計（カテゴリごとに階層化） -->
      <li v-if="Object.keys(specCategories).length > 0">
        <strong>仕様・設計</strong>
        <ul>
          <li v-for="(pages, categoryName) in specCategories" :key="categoryName">
            {{ categoryName }}
            <ul>
              <li v-for="page in pages" :key="page.url">
                <a :href="withBase(page.url)">{{ page.title }}</a>
              </li>
            </ul>
          </li>
        </ul>
      </li>

      <!-- タスク説明（カテゴリごとに階層化） -->
      <li v-if="Object.keys(taskCategories).length > 0">
        <strong>タスク説明</strong>
        <ul>
          <li v-for="(pages, categoryName) in taskCategories" :key="categoryName">
            {{ categoryName }}
            <ul>
              <li v-for="page in pages" :key="page.url">
                <a :href="withBase(page.url)">{{ page.title }}</a>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 階層を見やすくするためのデザイン */
.sitemap-tree ul {
  list-style-type: none;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  border-left: 1px dashed #ccc; /* 階層の縦線を引く */
}
.sitemap-tree > ul {
  border-left: none; /* 一番外側の線は消す */
  padding-left: 0;
}
.sitemap-tree li {
  margin-top: 0.5rem;
  position: relative;
}
/* 枝分かれの横線 */
.sitemap-tree ul ul li::before {
  content: "";
  position: absolute;
  top: 12px;
  left: -1.5rem;
  width: 1rem;
  border-top: 1px dashed #ccc;
}
</style>
