---
title: Notionタスクとの連携
description: タスクページからNotionチケットが自動で作られる仕組みと書き方
---

# Notionタスクとの連携

タスクページを`main`へマージすると、NotionのタスクDBにチケットが自動で作られます。
チケットへのリンクは、サイトを公開するたびに自動で埋め込まれます。

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
3. 数分待つと、Notionにチケットができ、同時にサイトへリンクが載ります。
4. タスクページの「関連リンク > Notionタスク」と、ページ上部の「Notionタスク」バッジからチケットへ移動できます。

チケットを作る前に担当や期限を決めておきたいときは、frontmatterへ書いておくとそのまま反映されます。

::: tip リンクの入り方
チケットのURLはMarkdownには書き込まれません。公開のたびにNotionから読み取って埋め込みます。
そのためGitHubで生のMarkdownを見ると`<NotionTaskLink />`と書かれていますが、サイト上ではリンクになります。
:::

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
| `notionUrl` | — | 自動連携より優先したいときだけ書く | 空（自動で入る） |

一覧にない値を書くと、Pull Requestの検査で止まります。
メンバーや選択肢を増やしたときは、Notion側と`docs/.vitepress/content/notion-fields.mjs`の両方を更新してください。

::: warning 起票後の変更
`team`・`priority`・`milestone`・`assignees`・`due`は、チケットを作るときだけ使われます。
あとから書き換えてもNotionには反映されません。進行管理はNotion上で行ってください。
:::

## うまく連携されないとき

- **チケットができない・リンクが出ない**：GitHubの「Actions」タブで`Deploy VitePress site to Pages`を開き、`Sync tasks to Notion`の結果を確認します。
- **Notionのチケットを消してしまった**：同じタスクIDのチケットがなくなるため、次の公開で作り直されます。
- **Notion側が不調のとき**：連携だけ飛ばして公開は続きます。リンクは次の公開で入ります。

## 管理者向けの設定

連携には、リポジトリのSecretsに次の2つが必要です。

| 名前 | 内容 |
|---|---|
| `NOTION_TOKEN` | Notionインテグレーションのトークン |
| `NOTION_TASK_DB_ID` | タスクDBのID（DBのURLをそのまま貼っても動きます） |

この2つが未設定のときは、連携だけ飛ばして公開が行われます（ワークフローは赤くなりません）。

連携はサイトの公開（`Deploy VitePress site to Pages`）の中で実行され、
リポジトリへは何もコミットしません。`main`の保護設定を変える必要はありません。

1. [Notionのインテグレーション設定](https://www.notion.so/my-integrations)で内部インテグレーションを作り、トークンを控えます。**「新しいインテグレーション」は、そのワークスペースのオーナーにしか表示されません。**
2. NotionのタスクDBのページで「…」→「接続」から、作ったインテグレーションを追加します。
3. GitHubの`Settings` → `Secrets and variables` → `Actions`で、上の2つを登録します。

トークンはワークスペースごとに発行されます。別のワークスペースにあるDBへは書き込めないため、
連携先を移すときはトークンも取り直してください。

### タスクDBを新しく作るとき

プロパティ名がずれると同期が止まります。手で作らず、次のどちらかで作ってください。
どちらの場合も、DBを置きたいページで「…」→「接続」からインテグレーションを追加しておきます。

GitHubの`Actions`タブ →`Create Notion task DB`→`Run workflow`で、ページのURLを入れて実行します。
手元にNode.jsがなくても実行できます（`NOTION_TOKEN`の登録が先に必要です）。

手元で実行する場合は次のコマンドです。

```bash
NOTION_TOKEN=xxx npm run notion:init-db -- --parent <ページのURL>
```

タスクDBに必要な10個のプロパティが、選択肢と色つきで作られ、
`NOTION_TASK_DB_ID`に登録するIDが表示されます。

手元で試すこともできます。

```bash
NOTION_TOKEN=xxx NOTION_TASK_DB_ID=xxx npm run notion:sync:dry
```

`--dry-run`では、Notionにも設計書サイトにも書き込まずに、実行内容だけを表示します。
