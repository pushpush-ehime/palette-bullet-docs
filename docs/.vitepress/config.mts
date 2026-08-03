import { defineConfig } from 'vitepress'
import {
  assertValidCatalog,
  buildSidebars,
  loadCatalog
} from './content/catalog.mjs'

const catalog = loadCatalog()
// assertValidCatalog(catalog)
const generatedSidebars = buildSidebars(catalog)

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
        ]
      },      { text: '仕様・設計', link: '/spec/' },
      { text: 'タスク説明', link: '/tasks/' },
      { text: '仕様・タスク対応', link: '/relations' }, 
      { text: '用語集', link: '/glossary' }
    ],

    editLink: {
      pattern: 'https://github.com/pushpush-ehime/palette-bullet-docs/edit/main/docs/:path',
      text: 'このページを編集'
    },

// ▼ ここを大改造！ URLごとの切り替えをやめ、1つの大きな配列にまとめました ▼
    sidebar: [
      {
        text: '全体ガイド',
        items: [
          { text: 'ホーム', link: '/' },
          { text: 'このサイトの使い方', link: '/guide/how-to-use' },
          { text: 'ゲーム概要', link: '/game-overview' },
          { text: '仕様・タスク対応', link: '/relations' },
          { text: '新しいページを作る', link: '/guide/new-page' },
          { text: '用語集', link: '/glossary' }
        ]
      },
      {
        items: generatedSidebars.spec // 自動生成された仕様書の目次をここに合流
      },
      {
        items: generatedSidebars.tasks // 自動生成されたタスクの目次をここに合流
      }
    ],
    // ▲ 変更ここまで ▲

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