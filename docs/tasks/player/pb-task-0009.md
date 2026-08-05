---
title: "Playerステートの基盤を作成する"
description: Playerの行動状態を管理するステートマシンを実装する
pageType: task
taskId: PB-TASK-0009
category: "Player"
relatedSpecs:
  - /spec/player/states
---

# PB-TASK-0009｜Playerステートの基盤を作成する

## 実施内容

関連仕様
<PageRelations />

に従い、Playerのステートマシンを実装する。

各ステートの名前と、ステートの開始・更新・終了処理を呼び出す仕組みを定義する。

## 実装時の注意点

- 移動、攻撃、ドローモードなどの具体的な処理は実装しない。
- 他のPlayer機能からステート変更を要求できる構成にする。
- 各ステートの正式なクラス分割は実装担当者に一任する。

## 完了条件

- [ ] 関連仕様に記載されたPlayerステートが定義されている。
- [ ] 現在のステートを保持し、別のステートへ切り替えられる。
- [ ] ステート切り替え時に開始処理と終了処理が呼び出される。

## 関連する仕様

<PageRelations />