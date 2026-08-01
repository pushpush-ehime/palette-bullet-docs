import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'ja-JP',
  title: 'Palette Bullet Design',
  description: 'Palette Bullet 仕様書・タスク説明書',
  base: '/palette-bullet-docs/',

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'Player仕様', link: '/spec/player/basic-movement' },
      { text: 'タスク', link: '/tasks/player/pb-ply-001' },
      { text: '更新方法', link: '/guide/updating-site' }
    ],

    sidebar: [
      {
        text: 'Player仕様',
        collapsed: false,
        items: [
          {
            text: '基本移動',
            link: '/spec/player/basic-movement'
          }
        ]
      },
      {
        text: 'タスク説明',
        collapsed: false,
        items: [
          {
            text: 'PB-PLY-001 基本移動',
            link: '/tasks/player/pb-ply-001'
          }
        ]
      },
      {
        text: 'ガイド',
        collapsed: false,
        items: [
          {
            text: 'サイトの更新方法',
            link: '/guide/updating-site'
          }
        ]
      }
    ],

    outline: {
      level: [2, 3],
      label: 'このページの目次'
    },

    search: {
      provider: 'local'
    },

    docFooter: {
      prev: '前のページ',
      next: '次のページ'
    }
  }
})
