---
title: "Gameplay Runtime Trace Raw Input→Input Action→Player State／Action経路接続"
description: Player入力の入口からGameplay Request、State確認、Action開始・拒否・中断までをGameplay Runtime Trace上で一続きに追跡できるようにする
pageType: task
taskId: PB-TASK-0010
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/gameplay-runtime-trace
  - /spec/player/input-and-controls
  - /spec/player/states
  - /spec/player/player-action-transitions
---

# PB-TASK-0010｜Gameplay Runtime Trace Raw Input→Input Action→Player State／Action経路接続

## タスクの目的

Gameplay Runtime TraceをPlayer入力経路へ接続し、

> **「ボタンを押したのにActionが発動しなかったとき、どこまで処理が届いたか」**

をTraceから確認できるようにします。

このタスクでは、少なくとも1つの代表的なPlayer Actionについて、入力の入口からAction結果までを同一Timeline上で追跡できる状態を完成させます。

## 完成時にできるようになること

- 物理キー／Mouse等のRaw InputをTraceで確認できる
- Unity Input System上のInput Action発火を別Eventとして確認できる
- Gameplay Requestへ変換されたか確認できる
- Request時点のPlayer State Snapshotを確認できる
- Runtimeで実際に確定したPlayer State変更を、State軸ごとのFrom／Toとして確認できる
- Actionが開始したか、拒否されたか、中断されたか確認できる
- Runtime本体が持つReasonがある場合、その理由をTraceへ残せる
- 入力経路のEventを同じCorrelationとして追跡できる
- PB-TASK-0009のTimeline Viewer上で入口から結果まで確認できる

## 関連する仕様

<PageRelations />

Traceの記録方法は[Gameplay Runtime Trace仕様](/spec/common-technology/gameplay-runtime-trace)を正本とします。

Player側の正しい入力・State・Action遷移条件は以下のGameplay仕様を正本としてください。

- [入力・操作仕様](/spec/player/input-and-controls)
- [Player State仕様](/spec/player/states)
- [Player Action遷移仕様](/spec/player/player-action-transitions)
- 実際に代表経路として採用するActionの個別仕様

Trace側でPlayer Actionの成立条件を再定義しないでください。

## 実施内容

### 1. Raw InputをTraceへ接続する

Player操作に使われる物理Controlについて、入力が発生した事実をPB-TASK-0008のTrace Coreへ記録します。

少なくとも代表経路で、

- Device／Control
- Press／Release等の入力状態
- Frame／Runtime Time

を確認できるようにします。

### 2. Input Actionを別Eventとして記録する

Raw InputとUnity Input System上のInput Actionを分離してTraceします。

これにより、

```text
Raw Inputあり
Input Actionなし
```

という状態を確認できるようにします。

Started／Performed／Canceled等、実際に利用しているPhaseを必要に応じて記録してください。

### 3. Gameplay Requestまで接続する

Input ActionからPlayer側のGameplay Requestへ変換された地点をTraceします。

これにより、

```text
Input Actionあり
Gameplay Requestなし
```

と、

```text
Gameplay Requestまで到達
```

を区別できるようにします。

### 4. Player State／Action結果を記録する

Gameplay Requestの処理結果として、Request時点のState Snapshotと、Runtimeで実際に確定したState変更を区別して記録します。

Request時点では少なくとも、判定に関係するPlayer State Snapshotを確認できるようにします。

State変更Eventでは、変更が起きた軸ごとに少なくとも以下を記録します。

- State Axis：Root／Movement／Action／Aim／Reaction
- From State
- To State
- Frame／Physics Step／Runtime Time
- Runtime本体が提供するTrigger／Cause／Reason
- 関連するGameplay Request／ActionとのCorrelation

複数軸が同じ処理で変化した場合も、どの軸がどの値からどの値へ変わったか追跡できるようにします。

Action結果として、少なくとも以下も追跡できるようにします。

- Action Start
- Action Rejected
- Action Interrupted／Ended

Request時State Snapshot、State変更Event、Action結果Eventは同じものとして潰さず、実際に変更がなかった拒否経路と、State遷移が確定した成功／中断経路を区別してください。

Player StateはRuntime本体が確定している値を記録し、Trace Recorder側でState条件や遷移結果を再判定して作らないでください。

### 5. Reasonを追跡できるようにする

Runtime本体が拒否理由や中断理由を持っている場合、そのReasonをTraceへ関連付けます。

例：

```text
Raw Input
↓
Input Action
↓
Gameplay Request
↓
Player State = Airborne
↓
Action Rejected
Reason = GroundOnly
```

Reason表現の具体形式は実装担当判断で構いません。

重要なのは、Trace側が理由を推測せず、Runtime本体で確定した情報を記録することです。

### 6. 代表Actionの経路を完成させる

Dash、Parry等、現在のPlayer実装から調査価値の高いActionを少なくとも1つ選び、以下の経路を一続きで確認できる状態にします。

```text
Raw Input
↓
Input Action
↓
Gameplay Request
↓
Request時State Snapshot
↓
Runtime確定State変更
↓
Action Start／Reject／Interrupt
```

代表Actionの具体的な選択は実装担当判断で構いません。

ただし、成功経路だけでなく、State Gate等による拒否経路も確認できるActionを優先してください。

## 対象範囲

- Player操作に関するRaw Input Trace
- Input Action Trace
- Gameplay Request Trace
- Request時Player State Snapshotの関連付け
- Runtime確定Player State変更（Axis／From／To）
- Action Start／Reject／Interrupt結果
- Runtime本体が提供するReason
- 入力経路へのCorrelation ID付与
- 代表Player Action 1経路以上のEnd-to-End接続
- Timeline Viewer／Exportでの確認

## 対象外

- 全Player Actionへの完全導入
- Player Action仕様の変更
- Input Systemそのものの再設計
- Trace側でのState条件再判定
- AttackEvent／Projectile／Damage／Enemy経路
- Replay／Input Replay
- AIによる仕様違反の自動判定

本タスクでは、基盤がPlayer入力経路を正しく追跡できることを代表経路で確認できればよいものとします。

## 完了条件

- [ ] Raw InputとInput Actionを別Eventとして確認できる
- [ ] Input ActionからGameplay Requestまで到達したか確認できる
- [ ] Request時点のPlayer State SnapshotをTraceから確認できる
- [ ] Root／Movement／Action／Aim／Reactionの実際の変更をAxis／From／To付きで確認できる
- [ ] State変更がRuntime本体の確定通知から記録され、Trace側で推測されていない
- [ ] Action Start／Reject／Interruptの結果を確認できる
- [ ] Runtime本体が持つReasonをTraceへ記録できる
- [ ] 一連の入力経路をCorrelation ID等で追跡できる
- [ ] 代表Actionで成功経路を入口から結果まで追跡できる
- [ ] 代表ActionでState Gate等による拒否経路を追跡できる
- [ ] PB-TASK-0009のTimeline Viewer上で一連のEventを確認できる
- [ ] 構造化Export後も入力からAction結果まで関連付けられる
- [ ] Trace追加によってPlayer Actionの挙動そのものを変更していない

## 確認手順

1. Trace Recordingを開始して代表Actionの入力を行います。
2. Raw Input → Input Action → Gameplay Request → Request時State Snapshot → Runtime確定State変更 → Action StartがTimeline上で追えることを確認します。
3. 成功経路でAction軸等のFrom／Toが実際のRuntime遷移と一致することを確認します。
4. Actionを開始できないPlayer Stateを作り、同じ入力を行います。
5. Gameplay Requestまで到達し、Action RejectとRequest時State／Reasonが記録され、発生していないState変更Eventが捏造されないことを確認します。
6. 必要に応じてAction中断が発生するケースを作り、実際のState変更とInterrupt／Endまで追跡できることを確認します。
7. Correlation Filterで、その入力に関係するEventだけを確認できることを確認します。
8. 該当時間範囲をExportし、同じ経路とState変更のAxis／From／Toを構造化データから追跡できることを確認します。

## 前提・依存タスク

### 前提

- [PB-TASK-0008｜Gameplay Runtime Trace Core・Session・Event／Entity／Correlation ID・Snapshot](/tasks/project-foundation/pb-task-0008)
- [PB-TASK-0009｜Gameplay Runtime Trace Timeline Viewer・Filter・詳細表示・Export・Session Summary](/tasks/project-foundation/pb-task-0009)

```text
PB-TASK-0008
Trace Core
        ↓
PB-TASK-0009
Viewer・Export
        ↓
PB-TASK-0010
Raw Input→Input Action→Player State／Action
```

## 実装時の注意点

- Traceは既存Player処理を観測するだけとし、入力やState遷移を変更しないでください。
- Raw Input、Input Action、Gameplay Requestを同じEventへ潰さず、停止地点を切り分けられるようにしてください。
- Request時State Snapshotと実際のState変更Eventを混同しないでください。
- Player State変更やReject ReasonをTrace側で独自計算せず、Runtime本体の確定情報を記録してください。
- Trace Point追加のためにGameplay側へ過剰なデバッグ依存を持ち込まないでください。
- 代表Action以外へ拡張しやすい接続方法にしてください。
- 詳細なAction成立条件は各Player正本仕様を参照してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、採用した代表Action、追加したTrace Point、成功／拒否経路の確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
