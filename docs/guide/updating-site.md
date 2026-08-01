---
title: サイトの更新方法
description: Palette Bullet Designの更新手順
---

# サイトの更新方法

更新には、リポジトリの書き込み権限が必要です。

::: warning 公開サイト
個人情報、認証情報、非公開URLは書かないでください。
:::

## 初回準備

```bash
git clone https://github.com/pushpush-ehime/palette-bullet-docs.git
cd palette-bullet-docs
npm install
```

## 編集

```bash
git pull
npm run docs:dev
```

- トップ：`docs/index.md`
- 仕様：`docs/spec`
- タスク：`docs/tasks`

Markdownを編集して保存します。

## ページを追加

1. `docs`内に`.md`ファイルを作ります。
2. ファイル名は英小文字とハイフンにします。
3. `docs/.vitepress/config.mts`の`sidebar`に追加します。

例：`docs/spec/player/dash.md`を追加する場合

```ts
{
  text: 'ダッシュ',
  link: '/spec/player/dash'
}
```

## 公開

```bash
npm run docs:build
git add .
git commit -m "変更内容"
git push
```

pushすると自動公開されます。
