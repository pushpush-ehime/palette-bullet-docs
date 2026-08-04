---
title: ページを追加する
description: 新しいカテゴリ・仕様・タスクの追加方法
---

# ページを追加する

## 新しいカテゴリを作る

### 仕様カテゴリ

1. 下のテンプレートをコピーします。
2. 「仕様カテゴリを作成」を押します。
3. 新しいフォルダ名を付けます。
4. `index.md`を作成します。

::: details テンプレート
<<< ../../.github/page-templates/spec.md
:::

[仕様カテゴリを作成](https://github.com/pushpush-ehime/palette-bullet-docs/new/main/docs/spec?filename=new-category/index.md)

---

### タスクカテゴリ

::: details テンプレート
<<< ../../.github/page-templates/task.md
:::

[タスクカテゴリを作成](https://github.com/pushpush-ehime/palette-bullet-docs/new/main/docs/tasks?filename=new-category/index.md)

---

## 既存カテゴリへ追加する

以下のリンクから追加してください。

---

## 仕様からタスクを作る

タスクページは、もとになる仕様ページから作れます。

1. タスクにしたい仕様ページを開きます。
2. ページ上部のステータス表示の右にある`＋ タスクを生成`を押します。
3. GitHubの新規ファイル作成画面が開きます。ファイル名、タスクID、カテゴリ、`relatedSpecs`、仕様から転記した目的と注意点が入力済みです。
4. 空欄（実施内容、完了条件など）を書き足します。
5. `Commit changes`を押し、`Create a new branch for this commit and start a pull request`を選びます。

::: warning
`Commit directly to the main branch`は選ばないでください。mainへ直接コミットすると、記入漏れがあったときに公開が失敗します。
:::

タスクIDは、ボタンを押した時点で使われている最大の番号＋1です。2人が続けて生成すると同じ番号になることがあります。Pull Requestの検査がタスクIDの重複で失敗したら、ファイル名と`taskId`を空いている番号へ書き換えてください。

タスクの保存先は、仕様と同じ名前のタスクカテゴリです。同じ名前のタスクカテゴリがない場合は`other`へ保存します。別のカテゴリへ入れたいときは、GitHubの画面でファイル名の先頭にあるフォルダ名と、`category`をそのカテゴリの`index.md`に合わせて書き換えてください。
