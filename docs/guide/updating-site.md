---
title: サイトの更新方法
description: Palette Bullet Designの更新手順
---

# サイトの更新方法

更新には、リポジトリの書き込み権限が必要です。

::: warning 公開サイト
個人情報、認証情報、非公開URLは書かないでください。
:::

## GitHubで更新

1. ページ下部の「このページを編集」を押します。
2. Markdownを書き換えます。
3. `Propose changes`を押します。
4. Pull Requestを作ります。

新しく追加する場合は、[新しいページを作る](/guide/new-page)から雛形を使います。

## ローカルで更新

```bash
git pull
git switch -c docs/update-name
npm install
npm run docs:dev
```

Markdownを編集して保存します。

新しいファイルを追加した場合だけ、開発画面を一度再起動します。

## 確認

```bash
npm run docs:check
```

次の内容を確認します。

- 必須項目
- タスクIDの形式と重複
- ページ形式
- 内部リンク
- サイト全体のビルド

## 公開

```bash
git status
git add 変更したファイル
git commit -m "変更内容"
git push -u origin docs/update-name
```

GitHubでPull Requestを作ります。

検査に合格して`main`へマージされると、自動公開されます。
