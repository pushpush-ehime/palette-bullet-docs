---
title: "Gameplay Runtime Trace Core・Session・Event／Entity／Correlation ID・Snapshot"
description: Gameplay Runtime Traceの共通記録基盤として、Trace Session、Event、各種ID、時間情報、Context Snapshotを記録できるCoreを実装する
pageType: task
taskId: PB-TASK-0008
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/gameplay-runtime-trace
---

# PB-TASK-0008｜Gameplay Runtime Trace Core・Session・Event／Entity／Correlation ID・Snapshot

## タスクの目的

Gameplay Runtime Traceの最初の実装として、後続のViewerやGameplay接続が共通利用する**Runtime記録のCore基盤**を作ります。

このタスクでは、Gameplay中に発生した事実を同一Sessionへ記録し、Event・Entity・一連の処理を識別できる状態までを担当します。

## 完成時にできるようになること

- Trace Sessionを開始・終了できる
- Runtime Eventを共通形式で記録できる
- 同一Session内のEvent順序を復元できる
- Event、Entity、一連の処理をIDで追跡できる
- Frame、Runtime Time、Physics Step等をEventへ記録できる
- 重要な時点でContext Snapshotを保存できる
- どのRepository／Commit／Buildで取得したTraceか確認できる
- Trace Recorder自身の記録欠落を隠さず確認できる
- 後続タスクからTrace Eventを追加できる

## 関連する仕様

<PageRelations />

詳細は[Gameplay Runtime Trace仕様](/spec/common-technology/gameplay-runtime-trace)を正本とします。

特に以下を確認してください。

- 基本原則
- Trace Session
- 時間情報
- Event ID
- Entity ID
- Correlation ID
- Context Snapshot
- Git／Build Snapshot
- Trace欠落／Error
- Performance
- 初期版完了条件

## 実施内容

### 1. Trace Sessionを作る

Recording開始から終了までを一つのSessionとして管理します。

Sessionには少なくとも、以下を関連付けられるようにします。

- Session ID
- 開始／終了時刻
- Repository／Branch／Commit SHA
- Unity／Build Version
- Scene／Stage／Battle ID
- Trace Schema／Recorder Version
- Event／Snapshot／Dropped Event件数

Session開始・終了の具体的なTriggerは実装担当判断で構いません。

### 2. 共通Trace Eventを記録できるようにする

後続の各Gameplay Systemが、同じRecorderへEventを登録できる共通基盤を作ります。

Eventには少なくとも以下を持てるようにします。

- Event ID
- Event Type／Category
- Event Sequence
- Frame
- Runtime Time
- Fixed Step／Physics Step
- 関連Entity
- Correlation ID
- Event固有Payload
- Snapshot Reference

全Eventがすべての項目を持つ必要はありません。

### 3. Event／Entity／Correlation IDを扱えるようにする

#### Event ID

Session内の各Eventを一意に識別し、後続ViewerやExportから参照できるようにします。

#### Entity ID

Player、Enemy、Projectile等のRuntime個体を追跡できるIDをEventへ関連付けられるようにします。

#### Correlation ID

複数Systemをまたぐ一連の処理を、同じ流れとして追跡できるようにします。

具体的なID文字列形式は実装担当判断とします。

### 4. 時間・順序を記録する

最低限、次を区別して扱えるようにします。

- Event Sequence
- Frame
- Runtime Time
- Fixed Step／Physics Step

同一frame内に複数Eventが発生しても、記録順を復元できることを重視します。

MusicChart Time等は後からEventへ追加接続できる構造にしてください。

### 5. Context Snapshotを保存できるようにする

Eventだけでは状況が分からない場合に、重要な時点のRuntime状態をSnapshotとして保存できる仕組みを作ります。

Snapshotには、必要に応じて以下のような情報を入れられる構造にします。

- Player State／HP等
- Position
- Battle Context
- Music Context
- 関連Entity

毎frame全Objectを保存する方式にはしません。

どのEventでSnapshotを取得するかの詳細は、後続のGameplay接続時に追加できる形で構いません。

### 6. Trace自身の欠落を記録する

Recorder側でEventを取りこぼした場合、人間やAIが「完全なTrace」と誤認しないようにします。

少なくともDropped EventやBuffer Overflow等の欠落状態をSessionから確認できるようにしてください。

### 7. 後続タスクが利用できる入口を用意する

後続タスクから、

```text
Eventを記録する
Entityを関連付ける
Correlationを引き継ぐ
Snapshotを要求する
```

といった処理を追加できる共通入口を用意します。

このCore側でDashやDamage等のGameplay規則を知る必要はありません。

## 対象範囲

- Trace Session
- 共通Trace Event
- Event Sequenceと基本時間情報
- Event ID
- Entity ID
- Correlation ID
- Context Snapshot
- Git／Build Snapshot情報
- Dropped Event等のTrace欠落情報
- 後続System向けTrace記録API
- Coreの基本動作確認

## 対象外

- Timeline Viewer
- Filter／Event詳細表示
- JSON／JSONL Export
- Session Summary
- 選択範囲Export
- Raw Input／Input Actionの実Gameplay接続
- Player State／ActionへのTrace Point追加
- AttackEvent／Projectile／Damage／EnemyへのTrace Point追加
- 完全Replay
- Gameplay状態の編集
- 毎frame全状態保存

これらは後続のGameplay Runtime Traceタスクへ分割します。

## 完了条件

- [ ] Trace Sessionを開始・終了できる
- [ ] Sessionを一意に識別できる
- [ ] 共通形式でTrace Eventを記録できる
- [ ] 同一Session内のEvent順序を復元できる
- [ ] Frame／Runtime Time／Physics Stepを記録できる
- [ ] Event IDを一意に生成できる
- [ ] Entity IDをEventへ関連付けられる
- [ ] Correlation IDをEventへ関連付けられる
- [ ] 重要Event用のContext Snapshotを保存できる
- [ ] Trace生成元のRepository／Commit／Unity Version等を記録できる
- [ ] Dropped Event等のTrace欠落を識別できる
- [ ] 後続SystemからEvent／Correlation／Snapshotを追加できる
- [ ] Trace Recording自体がGameplay状態を変更しない
- [ ] Trace無効時に不要な大きなRuntime負荷を残さない

## 確認手順

1. Trace Sessionを開始し、複数のテストEventを記録します。
2. Event IDとSequenceが重複せず、記録順を復元できることを確認します。
3. 複数Eventへ同じEntity ID／Correlation IDを付与し、同じ対象・処理として追跡できることを確認します。
4. Snapshotを保存し、Eventから対応するSnapshotを参照できることを確認します。
5. Session終了後、Commit等のSession MetadataとEvent／Snapshot件数を確認します。
6. Trace欠落を模擬し、Dropped Event等として識別できることを確認します。

## 前提・依存タスク

必須の前提タスクはありません。

本タスクは、次の3タスクすべての共通基盤になります。

```text
PB-TASK-0008
Trace Core
├─ Timeline Viewer・Filter・Export・Session Summary
├─ Raw Input→Input Action→Player State／Action接続
└─ AttackEvent→Projectile→Damage→Enemy結果接続
```

## 実装時の注意点

- Traceは「実際に起きたこと」を記録し、Gameplayの正しさを独自判定しないでください。
- Gameplay仕様をTrace Core内へ再定義しないでください。
- Event／Entity／Correlation IDの具体形式や内部Class構成は実装担当判断で構いません。
- 毎frame全状態を保存せず、Event＋必要なSnapshotを基本としてください。
- Trace RecorderのためにGameplay Timingを大きく変えないことを重視してください。
- Project Code Catalogの静的解析機能をTrace側へ再実装しないでください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、Session／Event構造、各IDの方針、Snapshot方式、欠落検出方法、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
