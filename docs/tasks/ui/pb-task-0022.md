---
title: プロトタイプ共通Result画面のワイヤーフレーム
description: ClearとGame Overで共用するResult画面について、操作lockを含む状態別ワイヤーフレームとUI仕様反映原稿を作成する
pageType: task
taskId: PB-TASK-0022
category: UI
order: 10
team: デザイン
priority: B
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/ui/
  - /spec/game/
  - /spec/combat/
  - /spec/player/input-and-controls
---

# PB-TASK-0022｜プロトタイプ共通Result画面のワイヤーフレーム

## タスクの目的

ClearとGame Overで共用するResult画面について、実装前に情報配置、状態変化、操作可否を確認できるワイヤーフレームを作成します。

PlayerやBattle Runtimeが未完成でも、仕様で確定している`Clear / Game Over`のvariant、`VisibleLocked / Interactive / RouteCommitted`を仮データで表現できるため、独立して着手できます。

## 完成時にできるようになること

- ClearとGame Overで共通化する領域と差し替える領域を確認できる
- Result表示直後の操作lockをPlayerが誤認しない表現を比較できる
- Continue／Retryの表示、Focus、決定後の状態を確認できる
- UI実装担当へ状態別画面とComponent構成を渡せる
- UI仕様の未決事項をレビューによって埋められる

## 関連する仕様

<PageRelations />

## 実施内容

### 1. 共通構成を整理する

Result画面の共通領域、variant差し替え領域、主要操作、補助情報をComponent単位で整理します。画面は1つの共通Resultを前提とし、Clear用とGame Over用の独立画面には分けません。

### 2. 状態別ワイヤーフレームを作成する

1920×1080を基準に、少なくとも次の画面を作成します。

- Clear／VisibleLocked
- Clear／Interactive
- Clear／RouteCommitted
- Game Over／VisibleLocked
- Game Over／Interactive
- Game Over／RouteCommitted

`VisibleLocked`では、操作できない理由または待機中であることを見た目から判断できるようにします。

### 3. 入力とFocusを注記する

プロトタイプ対象のMouse／Keyboardについて、初期Focus、Hover、決定、連打後のlockを注記します。ゲームパッド用の詳細Focus移動は対象外ですが、後からFocus表示を追加できない構成にはしません。

### 4. レビュー用Prototypeを作る

静止画またはクリック可能Prototypeを用意し、表示開始、unlock、最初の決定、遷移開始を順に確認できるようにします。

## 対象範囲

- 共通Result画面の情報構造
- Clear／Game Over variant
- VisibleLocked／Interactive／RouteCommitted
- Continue／Retry
- Mouse／KeyboardのFocus・Hover・決定
- 仮文言、仮色、仮Animation注記
- UI仕様へ反映する決定原稿

## 対象外

- UI Toolkit／uGUI等によるRuntime実装
- Battle結果の判定
- cleanup完了の集約
- Scene遷移
- HUD、Pause Menu、設定画面
- 最終VFX、SE、Animation
- ゲームパッド対応

## 完了条件

- [ ] 1920×1080基準のワイヤーフレームがある
- [ ] ClearとGame Overが同じ共通画面のvariantとして設計されている
- [ ] ClearにはContinueだけ、Game OverにはRetryだけが表示されている
- [ ] VisibleLockedとInteractiveを見た目で区別できる
- [ ] lock中の入力を後から実行するように見える表現になっていない
- [ ] 最初の決定後に全操作がlockされる状態を確認できる
- [ ] Mouse／KeyboardのFocus・Hover・決定が注記されている
- [ ] 仮文言と未決事項が明示されている
- [ ] UI、企画、実装担当のレビュー結果が記録されている

## 確認手順

1. Clear／Game Overの各状態を順番に表示します。
2. VisibleLockedで主要操作が利用可能に見えないことを確認します。
3. Interactiveでは利用できる主要操作が一つだけであることを確認します。
4. RouteCommitted後の再入力を受け付けない表現を確認します。
5. 1920×1080で文字、ボタン、余白が破綻していないことを確認します。
6. 仕様の状態遷移と各ワイヤーフレームの対応を企画・実装担当が確認します。

## 前提・依存タスク

なし。PB-TASK-0018やPlayer実装の完成を待たず、仮データで開始できます。

## 実装時の注意点

- UI側でHPやEnemy数からBattle結果を再判定する前提を置かないでください。
- Clear＋Dead同一frameではClearだけが表示される仕様を変更しないでください。
- AnimationやSEの終了をResult操作解禁の必須条件として設計しないでください。
- 仮文言や仮色を確定仕様と混同しないよう注記してください。

## 提出・報告方法

1. 元データ、確認用画像またはPrototypeリンクを共有ストレージへ配置します。
2. Notionタスクへ共有リンクとレビュー結果を記載します。
3. 決定事項と未決事項をUI仕様へ反映する原稿を添付します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- UIデザイン：未登録
