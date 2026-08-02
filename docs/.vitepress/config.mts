import { defineConfig } from 'vitepress'

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
          { text: 'サイトの更新方法', link: '/guide/updating-site' }
        ]
      },
      { text: '仕様・設計', link: '/spec/' },
      { text: 'タスク説明', link: '/tasks/' },
      { text: '用語集', link: '/glossary' }
    ],

    editLink: {
      pattern: 'https://github.com/pushpush-ehime/palette-bullet-docs/edit/main/docs/:path',
      text: 'このページを編集'
    },

    sidebar: {
      '/spec/': [
        {
          text: '仕様・設計',
          items: [
            { text: '仕様・設計一覧', link: '/spec/' },
            { text: 'ゲーム全体', link: '/spec/game/' },
            {
              text: 'Player',
              collapsed: false,
              items: [
                { text: 'Player概要', link: '/spec/player/' },
                { text: '入力と操作', link: '/spec/player/input-and-controls' },
                { text: '基本移動', link: '/spec/player/basic-movement' },
                { text: 'Player状態', link: '/spec/player/states' },
                { text: 'ドローモードへの移行', link: '/spec/player/draw-mode-transition' },
                { text: 'シャオンダマ選択との接続', link: '/spec/player/shaondama-selection-connection' },
                { text: '戦闘システムとの接続', link: '/spec/player/combat-connection' },
                { text: 'カメラとの接続', link: '/spec/player/camera-connection' }
              ]
            },
            { text: 'カメラ', link: '/spec/camera/' },
            { text: 'ドローシステム', link: '/spec/draw-system/' },
            { text: 'シャオンダマ・音楽連動', link: '/spec/shaondama-music/' },
            { text: '戦闘', link: '/spec/combat/' },
            { text: '敵', link: '/spec/enemy/' },
            { text: 'ステージ', link: '/spec/stage/' },
            { text: 'UI', link: '/spec/ui/' },
            { text: '演出', link: '/spec/effects/' },
            { text: '共通技術', link: '/spec/common-technology/' }
          ]
        }
      ],

      '/tasks/': [
        {
          text: 'タスク説明',
          items: [
            { text: 'タスク一覧', link: '/tasks/' },
            {
              text: 'Player',
              collapsed: false,
              items: [
                { text: 'Playerタスク', link: '/tasks/player/' },
                { text: 'PB-TASK-0001 基本移動', link: '/tasks/player/pb-task-0001' }
              ]
            },
            { text: 'カメラ', link: '/tasks/camera/' },
            { text: 'ドローシステム', link: '/tasks/draw-system/' },
            { text: 'その他', link: '/tasks/other/' }
          ]
        }
      ],

      '/guide/': [
        {
          text: 'ガイド',
          items: [
            { text: 'このサイトの使い方', link: '/guide/how-to-use' },
            { text: 'ゲーム概要', link: '/game-overview' },
            { text: 'サイトの更新方法', link: '/guide/updating-site' },
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
            { text: 'タスク説明', link: '/tasks/' },
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
