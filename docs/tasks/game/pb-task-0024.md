---
title: プロトタイプ受入テスト計画・記録テンプレート
description: プロトタイプ完成条件を担当者別の確認ケースへ分解し、Editor・Windows Buildで同じ形式の結果を記録できる受入テスト計画を作成する
pageType: task
taskId: PB-TASK-0024
category: ゲーム全体
order: 30
team: 企画
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/game/
  - /spec/combat/
  - /spec/ui/
  - /spec/player/input-and-controls
---

# PB-TASK-0024｜プロトタイプ受入テスト計画・記録テンプレート

## タスクの目的

プロトタイプ完成直前に初めて確認項目を考える状態を避けるため、現在の共通仕様から受入テストケース、必要Evidence、問題報告形式を先に作成します。

本タスクではゲーム機能を実装しません。未実装項目は`未実施`として扱えるため、PlayerやWindows Buildがない現在から開始できます。

## 完成時にできるようになること

- 各機能担当が何を満たせばプロトタイプへ統合できるか確認できる
- EditorとWindows Buildで同じ主要フローを確認できる
- Clear、Game Over、Result、Retryの結果を統一形式で記録できる
- 60fps確認に必要なPC環境と計測値を記録できる
- 未実装、失敗、Block、既知の問題を区別して報告できる

## 関連する仕様

<PageRelations />

## 実施内容

### 1. 完成条件をテストケースへ分解する

少なくとも次の区分でテストケースを作成します。

- 起動・Battle直接開始
- Player移動・Camera・Jump・Dash・Aim
- Marker、Shaondama選択、Charge、Allocation
- AttackEvent、Palette Bullet、RGB Damage、Enemy浄化
- Jaon Bullet、Parry、Wildcard変換
- Clear、Game Over、同一frame優先規則
- Result lock／unlock、Continue／Retry
- Retry後の旧Battle状態持ち越し防止
- Windows Build、配布ZIP、別メンバー起動
- 1920×1080、60fps、Error／Warning

### 2. ケース記録形式を統一する

各ケースに次を持たせます。

- Test ID
- 関連仕様
- 前提条件
- 操作手順
- 期待結果
- Editor／Windows Buildの対象区分
- 結果（未実施／Pass／Fail／Blocked）
- 使用Commit SHA
- 実行環境
- Screenshot、動画、Log等のEvidence
- Issueまたは修正タスク

### 3. Build・性能記録を作る

Windows Build確認用に、CPU、GPU、Memory、OS、Resolution、Quality、VSync、Build種別、Commit SHA、平均fpsまたはFrame Timeを記録できる欄を用意します。

### 4. 不具合報告テンプレートを作る

再現手順、期待結果、実際の結果、再現率、重大度、Commit SHA、実行環境、Evidence、回避策を統一形式で記録できるようにします。

## 対象範囲

- プロトタイプ受入テスト一覧
- ケース記録テンプレート
- Windows Build確認記録
- 性能確認記録
- 不具合報告テンプレート
- 仕様とTest IDの対応表

## 対象外

- Gameplay機能の実装
- 自動テストコードの実装
- Windows Buildの作成
- 実機テストの全件実施
- 製品版向けの互換性・アクセシビリティ試験
- 最終性能最適化

## 完了条件

- [ ] プロトタイプ仕様の全完成条件に対応するTest IDがある
- [ ] EditorとWindows Buildの確認対象を区別できる
- [ ] ClearとGame Overの両経路がある
- [ ] 同一frame Clear＋DeadとClear優先を確認するケースがある
- [ ] Result lock、unlock、連打、Retryを確認するケースがある
- [ ] Retry後の旧Battle通知・状態持ち越しを確認するケースがある
- [ ] ParryからWildcard変換までを確認するケースがある
- [ ] Build元Commit SHAと実行環境を記録できる
- [ ] 1920×1080・60fpsの計測条件を記録できる
- [ ] 未実施／Pass／Fail／Blockedを区別できる
- [ ] FailからIssueまたは修正タスクを追跡できる

## 確認手順

1. プロトタイプ仕様の完成条件を一つずつTest IDへ対応付けます。
2. 代表ケース1件を仮データで記入し、不足欄がないか確認します。
3. Clear、Game Over、Retry、性能確認の各ケースを企画・実装担当でレビューします。
4. Player未実装の現在状態でも、該当ケースを`未実施`または`Blocked`として記録できることを確認します。
5. PB-TASK-0017／0018および後続機能タスクからTest IDを参照できることを確認します。

## 前提・依存タスク

なし。実装やBuildの完成を待たずに作成できます。実際の全件実施はプロトタイプ統合後です。

## 実装時の注意点

- 仕様にない期待結果をテスト側だけで追加しないでください。
- 未実装をFailと混同せず、`未実施`または`Blocked`として扱ってください。
- 60fpsをVSync表示だけで達成判定しないでください。
- 個人PC固有の絶対パスやローカルAssetを手順の前提にしないでください。

## 提出・報告方法

1. テスト計画とテンプレートをリポジトリまたはチーム共有ストレージへ配置します。
2. Notionタスクへ成果物リンクとレビュー結果を記載します。
3. 各後続タスクが参照すべきTest IDを一覧化します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- テスト計画：未登録
