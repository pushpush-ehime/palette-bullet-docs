---
title: Playerの基本移動を実装する
description: Playerの基本移動を実装するタスク
pageType: task
taskId: PB-TASK-0001
category: Player
order: 10
relatedSpecs:
  - /spec/player/basic-movement
---

# PB-TASK-0001｜Playerの基本移動を実装する

## タスクの目的

Playerがキーボード入力でゲーム空間を移動できるようにします。

## 完成時にできるようになること

- `W` `A` `S` `D`でPlayerを移動できます。
- 入力をやめるとPlayerが停止します。
- 斜め入力でも移動速度が一定になります。

## 関連する仕様

<PageRelations />

## 実施内容

- `W` `A` `S` `D`の入力を受け取る
- 入力方向へPlayerを移動させる
- 移動速度をInspectorから変更できるようにする
- 斜め移動時の速度を補正する
- 入力をやめたときに移動を停止させる

## 対象範囲

- 通常時の基本移動
- ドローモード中の基本移動
- 移動速度パラメータ

## 対象外

- ジャンプ
- ダッシュ
- ドローモードへの切り替え
- 移動アニメーション
- 足音
- カメラ演出

## 完了条件

- [ ] `W` `A` `S` `D`でPlayerが移動できる
- [ ] 入力をやめると停止する
- [ ] 斜め移動だけ速くならない
- [ ] 移動速度をInspectorから変更できる
- [ ] Consoleに新しいエラーが発生しない
- [ ] 関連仕様と矛盾していない

## 確認手順

1. Unityで確認用シーンを開きます。
2. Play Modeを開始します。
3. `W` `A` `S` `D`を順番に入力します。
4. 前後左右へ正しく移動することを確認します。
5. `W`と`D`を同時に押します。
6. 斜め移動だけ速くならないことを確認します。
7. Inspectorで移動速度を変更します。
8. 移動速度へ反映されることを確認します。

## 前提・依存タスク

- [Player基本移動](/spec/player/basic-movement)の未決事項を確認する

## 実装時の注意点

- 仕様と異なる挙動を独断で追加しない
- 新しいConsoleエラーを残さない

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
