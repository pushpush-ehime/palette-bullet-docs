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

## 更新

```bash
git pull
git switch -c docs/update-name
npm run docs:dev
```

Markdownを編集して保存します。

- ホーム：`docs/index.md`
- ガイド：`docs/guide`
- ゲーム概要：`docs/game-overview.md`
- 仕様：`docs/spec`
- タスク：`docs/tasks`
- 用語集：`docs/glossary.md`

## ページを追加

1. 同じカテゴリのページを複製します。
2. ファイル名を英小文字とハイフンにします。
3. `docs/.vitepress/config.mts`の`sidebar`に追加します。
4. 仕様とタスクを相互にリンクします。

## 公開

```bash
npm run docs:build
git status
git add docs/変更したファイル
git commit -m "変更内容"
git push -u origin docs/update-name
```

GitHubでPull Requestを作ります。

`main`へマージすると自動公開されます。
