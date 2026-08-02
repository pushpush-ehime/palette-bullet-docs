---
title: 新しいページを作る
description: 仕様ページとタスクページの追加手順
---

# 新しいページを作る

## 仕様ページ

1. 下の雛形をコピーします。
2. [GitHubで新しい仕様を作る](https://github.com/pushpush-ehime/palette-bullet-docs/new/main/docs/spec?filename=player/new-spec.md)を開きます。
3. ファイル名と内容を書き換えます。
4. `Propose changes`からPull Requestを作ります。

::: details 仕様ページの雛形
<<< ../../.github/page-templates/spec.md
:::

## タスクページ

1. 下の雛形をコピーします。
2. [GitHubで新しいタスクを作る](https://github.com/pushpush-ehime/palette-bullet-docs/new/main/docs/tasks?filename=player/pb-task-0000.md)を開きます。
3. ファイル名、タスクID、内容を書き換えます。
4. `Propose changes`からPull Requestを作ります。

::: details タスクページの雛形
<<< ../../.github/page-templates/task.md
:::

## 入力する管理情報

| 項目 | 内容 |
|---|---|
| `status` | 確定、仮仕様、未決、対象外、廃止 |
| `category` | 同じフォルダの概要ページと同じ分類 |
| `taskId` | `PB-TASK-0001`形式 |
| `order` | 同じ分類内の表示順。10刻みを推奨 |
| `relatedSpecs` | このタスクが実現する仕様ページのURL |

仕様ページにはタスクIDを入力しません。`relatedSpecs`から、仕様側の関連タスク、対応表、関係図を自動生成します。

ページを追加すると、公開時にサイドバーと一覧へ自動で登録されます。

ローカルで新しいファイルを追加した場合は、開発画面を一度再起動します。
