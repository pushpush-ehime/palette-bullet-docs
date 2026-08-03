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
          { text: 'ゲーム概要', link: '/game-overview' },
          { text: 'サイトの更新方法', link: '/guide/updating-site' },
          { text: '新しいページを作る', link: '/guide/new-page' }
        ]
      },
      {
        text: '仕様・設計',
        items: [
          { text: '仕様・設計一覧', link: '/spec/' },
          { text: '仕様・タスク対応', link: '/relations' }
        ]
      },
      { text: 'タスク説明', link: '/tasks/' },
      { text: '用語集', link: '/glossary' }
    ],

    editLink: {
      pattern: 'https://github.com/pushpush-ehime/palette-bullet-docs/edit/main/docs/:path',
      text: 'このページを編集'
    },

    sidebar: {
      '/spec/': generatedSidebars.spec,
      '/tasks/': generatedSidebars.tasks,

      '/guide/': [
        {
          text: 'ガイド',
          items: [
            { text: 'このサイトの使い方', link: '/guide/how-to-use' },
            { text: 'ゲーム概要', link: '/game-overview' },
            { text: 'サイトの更新方法', link: '/guide/updating-site' },
            { text: '新しいページを作る', link: '/guide/new-page' },
            { text: '用語集', link: '/glossary' }
          ]
        }
      ],

      '/': [
        {
          text: '全体を知る',
          items: [
            { text: 'ホーム', link: '/' },
            { text: 'このサイトの使い方', link: '/guide/how-to-use' },
            { text: 'ゲーム概要', link: '/game-overview' },
            { text: '仕様・設計', link: '/spec/' },
            { text: '仕様・タスク対応', link: '/relations' },
            { text: 'タスク説明', link: '/tasks/' },
            { text: '新しいページを作る', link: '/guide/new-page' },
            { text: '用語集', link: '/glossary' }
          ]
        }
      ]
    },

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
