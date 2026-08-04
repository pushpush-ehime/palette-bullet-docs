---
title: ページを追加する
description: 新しいカテゴリ・仕様・タスクの追加方法
---

# ページを追加する

## 新しいカテゴリを作る

### 仕様カテゴリ

1. 下のテンプレートをコピーします。
2. 「仕様カテゴリを作成」を押します。
3. ファイル名欄に「`新しいフォルダ名/index.md`」を入力します（例: `weapon/index.md`）。
4. テンプレートを貼り付けて内容を書き、コミットします。

::: details テンプレート
<<< ../../.github/page-templates/spec.md
:::

[仕様カテゴリを作成](https://github.com/pushpush-ehime/palette-bullet-docs/new/main/docs/spec)

---

### タスクカテゴリ

::: details テンプレート
<<< ../../.github/page-templates/task.md
:::

[タスクカテゴリを作成](https://github.com/pushpush-ehime/palette-bullet-docs/new/main/docs/tasks)

---

## 既存カテゴリへ追加する

サイドバーで開いているカテゴリの末尾に表示される「＋ このカテゴリにページを追加」から追加できます。

1. リンクを押すと、そのカテゴリのフォルダを開いた状態でGitHubのファイル作成画面が開きます。
2. ファイル名欄に新しいファイル名を入力します。**すでにあるファイルと同じ名前だとコミットできません。**
   - 仕様ページ: 内容がわかる英小文字の名前（例: `jump-action.md`）
   - タスクページ: `pb-task-XXXX.md`（既存のタスクIDの最大番号+1）
3. 上のテンプレートを貼り付けて内容を書き、コミットします。

## タスクページを追加したあと

タスクページが`main`へマージされると、NotionのタスクDBへチケットが自動で作られ、
そのURLがタスクページへ書き戻されます。担当や期限を先に決めておきたいときは、
frontmatterへ書いてからマージします（→[Notionタスクとの連携](/guide/notion-link)）。
