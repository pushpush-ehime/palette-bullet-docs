---
title: Notionタスクとの連携
description: タスクページからNotionチケットが自動で作られる仕組みと書き方
---

# Notionタスクとの連携

タスクページを`main`へマージすると、NotionのタスクDBにチケットが自動で作られます。
作られたチケットのURLは、タスクページへ自動で書き戻されます。

## 役割分担

| 決めること | 正となる場所 | 変える方法 |
|---|---|---|
| 作業内容・完了条件・関連仕様 | 設計書サイト（このサイト） | Pull Requestで直す |
| 状態・担当・期限・優先度 | Notionチケット | Notion上で動かす |

タスク名と設計書URLは、マージのたびに設計書サイトの内容でNotionへ上書きされます。
状態・担当・期限・優先度は起票時に一度書き込むだけで、そのあとは自動で変わりません。

## 使い方

1. 「＋ このカテゴリにページを追加」からタスクページを作ります（→[ページを追加する](/guide/new-page)）。
2. Pull Requestを作り、`main`へマージします。
3. 数分待つと、Notionにチケットができます。
4. タスクページの「関連リンク > Notionタスク」と、ページ上部の「Notionタスク」バッジからチケットへ移動できます。

チケットを作る前に担当や期限を決めておきたいときは、frontmatterへ書いておくとそのまま反映されます。

## frontmatterに書ける項目

必須の項目に加えて、次の項目を書けます。すべて任意です。

```yaml
---
title: Playerの基本移動を実装する
description: Playerの基本移動を実装するタスク
pageType: task
taskId: PB-TASK-0001
category: Player
order: 10
team: プログラム
priority: A
milestone: プロトタイプ
assignees: [下條]
due: 2026-08-10
relatedSpecs:
  - /spec/player/basic-movement
---
```

| 項目 | Notionのプロパティ | 書ける値 | 書かないときの値 |
|---|---|---|---|
| `team` | 班 | 企画／プログラム／デザイン／サウンド／全体管理 | プログラム |
| `priority` | 優先度 | S／A／B／C | B |
| `milestone` | マイルストーン | プロトタイプ／α版／β版／完成版 | プロトタイプ |
| `assignees` | 担当 | メンバー名の配列（例: `[高平, 下條]`） | 空 |
| `due` | 期限 | `2026-08-10`の形式 | 空 |
| `notionUrl` | — | 連携後に自動で入る | 空 |

一覧にない値を書くと、Pull Requestの検査で止まります。
メンバーや選択肢を増やしたときは、Notion側と`docs/.vitepress/content/notion-fields.mjs`の両方を更新してください。

::: warning 起票後の変更
`team`・`priority`・`milestone`・`assignees`・`due`は、チケットを作るときだけ使われます。
あとから書き換えてもNotionには反映されません。進行管理はNotion上で行ってください。
:::

## うまく連携されないとき

- **チケットができない**：GitHubの「Actions」タブで`Sync tasks to Notion`の結果を確認します。
- **タスクページにURLが入らない**：連携の直後は公開が一度走り直します。数分待ってから読み込み直してください。
- **Notionのチケットを消してしまった**：同じタスクIDのチケットがなくなるため、次の同期で作り直されます。

## 管理者向けの設定

連携には、リポジトリのSecretsに次の2つが必要です。

| 名前 | 内容 |
|---|---|
| `NOTION_TOKEN` | Notionインテグレーションのトークン |
| `NOTION_TASK_DB_ID` | タスクDBのID |

1. [Notionのインテグレーション設定](https://www.notion.so/profile/integrations)で内部インテグレーションを作り、トークンを控えます。
2. NotionのタスクDBのページで「…」→「接続」から、作ったインテグレーションを追加します。
3. GitHubの`Settings` → `Secrets and variables` → `Actions`で、上の2つを登録します。

手元で試すこともできます。

```bash
NOTION_TOKEN=xxx NOTION_TASK_DB_ID=xxx npm run notion:sync:dry
```

`--dry-run`では、Notionにも設計書サイトにも書き込まずに、実行内容だけを表示します。
