import { defineConfig } from 'vitepress'
import {
  assertValidCatalog,
  buildSidebars,
  loadCatalog
} from './content/catalog.mjs'

const catalog = loadCatalog()
// assertValidCatalog(catalog)

const generatedSidebars = buildSidebars(catalog, {
  leadingItems: [
    {
      text: '全体ガイド',
      items: [
        { text: 'ホーム', link: '/' },
        { text: 'このサイトの使い方', link: '/guide/how-to-use' },
        { text: 'ゲーム概要', link: '/game-overview' },
        { text: '仕様・タスク対応', link: '/relations' },
        { text: '新しいページを作る', link: '/guide/new-page' },
        { text: 'Notionタスクとの連携', link: '/guide/notion-link' },
        { text: '用語集', link: '/glossary' }
      ]
    }
  ]
})

export default defineConfig({
  lang: 'ja-JP',
  title: 'Palette Bullet Design',
  description: 'Palette Bullet 仕様書・タスク説明書',
  base: '/palette-bullet-docs/',
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      {
        text: 'はじめに',
        items: [
          { text: 'このサイトの使い方', link: '/guide/how-to-use' },
          { text: 'Notionタスクとの連携', link: '/guide/notion-link' }
        ]
      },
      { text: '仕様・設計', link: '/spec/' },
      { text: 'タスク説明', link: '/tasks/' },
      { text: '仕様・タスク対応', link: '/relations' },
      { text: '用語集', link: '/glossary' }
    ],

    editLink: {
      pattern:
        'https://github.com/pushpush-ehime/palette-bullet-docs/edit/main/docs/:path',
      text: 'このページを編集'
    },

    // 現在のURLに対応するカテゴリだけ、末尾に「ページを追加」を表示する。
    sidebar: generatedSidebars.sidebar,

    outline: {
      level: [2, 3],
      label: 'このページの目次'
    },

    search: {
      provider: 'local'
    },

    lastUpdated: {
      text: '最終更新'
    },

    docFooter: {
      prev: '前のページ',
      next: '次のページ'
    }
  }
})
