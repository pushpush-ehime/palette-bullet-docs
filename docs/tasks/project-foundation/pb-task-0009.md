---
title: "Gameplay Runtime Trace Timeline Viewer・Filter・詳細表示・Export・Session Summary"
description: 記録したTrace EventをTimelineで確認・絞り込み・詳細調査し、Session SummaryやAI向けTrace BundleとしてExportできるViewerを実装する
pageType: task
taskId: PB-TASK-0009
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/gameplay-runtime-trace
---

# PB-TASK-0009｜Gameplay Runtime Trace Timeline Viewer・Filter・詳細表示・Export・Session Summary

## タスクの目的

[PB-TASK-0008｜Gameplay Runtime Trace Core・Session・Event／Entity／Correlation ID・Snapshot](/tasks/project-foundation/pb-task-0008)で記録したTraceを、人間とAIが実際のデバッグに利用できる状態にします。

このタスクでは、**Timeline Viewer、絞り込み、Event詳細表示、Session Summary、AI向け構造化Export、人間向け要約Export、選択範囲Export**を担当します。

## 完成時にできるようになること

- 1つのTrace Sessionで起きたEventを時間順に確認できる
- Input、Player、Projectile、Damage等のEventをLane／Category単位で見分けられる
- Eventを選択してID、時刻、Entity、Correlation、Payload、Snapshot等の詳細を確認できる
- EntityやCorrelation ID等で問題に関係するEventだけへ絞り込める
- Session全体の概要をSummaryで把握できる
- TraceをAIが読める構造化データとしてExportできる
- Traceの概要と主要Event経路を人間が読めるMarkdownまたは同等形式でExportできる
- 問題周辺の時間範囲だけをTrace BundleとしてExportできる
- Dropped Event等のTrace欠落情報もExport先で確認できる

## 関連する仕様

<PageRelations />

詳細は[Gameplay Runtime Trace仕様](/spec/common-technology/gameplay-runtime-trace)を正本とします。

特に以下を確認してください。

- Timeline Viewer
- Timeline Lane
- Event詳細表示
- Filter／Navigation
- AI向け構造化Export
- Session Summary
- Git／Build Snapshot
- 選択範囲Export
- Trace欠落／Error
- 初期版完了条件

## 実施内容

### 1. Timeline Viewerを作る

PB-TASK-0008で記録したEventを、同一時間軸上で確認できるViewerを実装します。

Eventの種類をLaneまたは等価な分類で分け、異なるSystemのEventがどの順序で発生したか追えるようにしてください。

具体的なUIレイアウトやEditor技術は実装担当判断で構いません。

### 2. Eventの詳細を確認できるようにする

Timeline上のEventを選択すると、記録されている情報を詳細表示できるようにします。

少なくとも以下を確認できるようにしてください。

- Event ID
- Event Type／Category
- Frame／Physics Step／Runtime Time
- Source／Target Entity
- Correlation ID
- Event Payload
- Snapshot Reference

Event種類ごとの追加情報も、Coreに記録されていれば確認できる構造にします。

### 3. Filter／Navigationを実装する

大量のEventから問題箇所を絞り込めるようにします。

初期版では少なくとも以下で絞り込めることを目標とします。

- Entity
- Correlation ID
- Event Type／Category
- Lane
- Warning／Error
- 時間範囲

同じEntityやCorrelationに属するEventを続けて追えるようにしてください。

### 4. Session Summaryを生成する

Session全体を開いたとき、まず概要を確認できるSummaryを生成します。

以下のような情報を、Traceに記録された事実から集計できるようにします。

- Session／Build情報
- Duration
- Event／Snapshot件数
- Warning／Error件数
- Dropped Event件数
- 記録済み主要Eventの件数や結果

Summary側でGameplay結果を独自に再判定しないでください。

### 5. AI向け構造化Exportを実装する

Trace Event、Snapshot、Session MetadataをAIが検索・解析できる構造化形式でExportできるようにします。

JSON／JSONL、ファイル分割、ファイル名等の具体形式は実装担当判断で構いません。

ただし、Event ID、時系列、Entity、Correlation、Payload、Snapshotとの対応関係が失われないようにしてください。

### 6. 人間向け要約Exportを実装する

Session全体または選択範囲について、構造化データを直接開かなくても調査の入口にできるMarkdownまたは同等の人間可読形式をExportします。

少なくとも以下を含めます。

- Session／Build情報
- 対象時間範囲
- Event／Snapshot／Warning／Error／Dropped Event件数
- 関連する主要Entity／Correlation ID
- Traceに記録された主要Eventの時系列要約
- 構造化Export内のEvent／Snapshotを特定できる参照情報

人間向け要約はTimeline Viewerと同じTrace Modelから生成し、表示専用の別正本を作りません。また、Gameplay結果の正誤や原因を独自に判定・推測しません。

### 7. 選択範囲Exportを実装する

Session全体ではなく、問題が起きた前後だけをExportできるようにします。

選択した時間範囲のEventに加え、調査に必要な以下の情報を含められるようにしてください。

- Session Metadata
- 関連Snapshot
- Entity／Correlation情報
- Dropped Event等のTrace欠落情報
- 同じ範囲から生成した人間向け要約

AIへ毎回Session全体を渡さなくても調査できる状態を目標とします。

## 対象範囲

- Timeline Viewer
- Lane／Category表示
- Event詳細表示
- Entity／Correlation／Event Type等のFilter
- 基本Navigation
- Session Summary
- AI向け構造化Export
- 人間向け要約Export
- 選択時間範囲のTrace Bundle Export
- ExportへのSession／Snapshot／Trace欠落情報の付与

## 対象外

- Raw Input／Input ActionのTrace Point追加
- Player State／ActionへのTrace Point追加
- AttackEvent／Projectile／Damage／EnemyへのTrace Point追加
- Gameplay仕様の判定
- Replay
- Gameplay状態の編集
- Screenshot
- 3D Runtime Visualization
- AIによる自動異常判定

実Gameplayの代表経路への接続は、次の2タスクで行います。

## 完了条件

- [ ] PB-TASK-0008のTrace SessionをTimelineで表示できる
- [ ] Eventの順序とLane／Categoryを視覚的に追える
- [ ] Eventを選択して詳細情報を確認できる
- [ ] Entity／Correlation ID／Event Type等で絞り込める
- [ ] 同じEntity／Correlationの関連Eventを追跡できる
- [ ] Session Summaryを生成できる
- [ ] SummaryがTrace内の記録事実を集計している
- [ ] TraceをAI向け構造化形式でExportできる
- [ ] Session全体または選択範囲の人間向け要約をExportできる
- [ ] 人間向け要約から主要Eventと構造化データ上の識別子を追える
- [ ] 人間向け要約がTraceにないGameplay判定や原因を生成しない
- [ ] EventとSnapshot／Entity／Correlationの関係をExport後も追える
- [ ] 選択した時間範囲だけをExportできる
- [ ] ExportにSession MetadataとTrace欠落情報を含められる

## 確認手順

1. PB-TASK-0008で複数Category・Entity・Correlationを持つテストTraceを記録します。
2. TimelineへEventが時系列で表示されることを確認します。
3. Eventを選択し、ID・時刻・Payload・Snapshot等を確認します。
4. Entity／Correlation／CategoryでFilterし、対象Eventだけに絞れることを確認します。
5. Session Summaryの件数が元Traceと一致することを確認します。
6. Session全体を構造化Exportし、Event間の識別情報が保持されていることを確認します。
7. 同じSessionを人間向け要約としてExportし、主要Event、件数、Entity／Correlation IDが元Traceと一致することを確認します。
8. 一部の時間範囲だけをExportし、関連Snapshot、Session情報、人間向け要約を一緒に確認できることを確認します。
9. 要約にTrace未記録の正誤判定や原因推測が追加されていないことを確認します。

## 前提・依存タスク

### 前提

- [PB-TASK-0008｜Gameplay Runtime Trace Core・Session・Event／Entity／Correlation ID・Snapshot](/tasks/project-foundation/pb-task-0008)

### 後続

本タスクでViewerとExportを完成させた後、実GameplayへTrace Pointを接続します。

```text
PB-TASK-0008
Trace Core
        ↓
PB-TASK-0009
Timeline Viewer・Filter・Export
        ↓
├─ Raw Input→Input Action→Player State／Action接続
└─ AttackEvent→Projectile→Damage→Enemy結果接続
```

## 実装時の注意点

- ViewerがGameplayの正誤を独自判定しないでください。
- Summaryおよび人間向け要約Exportも、Traceに存在しない結果や原因を推測しないでください。
- 構造化Exportと人間向け要約は同じTrace Modelから生成し、別々の集計正本を作らないでください。
- UIの見た目やLane構成の細部は実装担当判断で構いません。
- Export用に表示文字列だけを保存するのではなく、Coreの構造化値を利用してください。
- Trace量が多い場合でもFilterによって調査対象を絞れることを優先してください。
- Viewer／Export処理によってGameplay RecordingのTimingへ大きな影響を与えないようにしてください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、Viewerの基本構成、Filter、詳細表示、Export形式、Session Summary、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
