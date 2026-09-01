---
title: プロトタイプ用Enemyのキャラクターコンセプト
description: 追跡・邪音玉射撃・RGB浄化を一種類で検証できるプロトタイプEnemyの外観、Scale、攻撃点、浄化状態を設計する
pageType: task
taskId: PB-TASK-0025
category: 敵
order: 10
team: デザイン
priority: B
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/enemy/
  - /spec/enemy/basic-behavior
  - /spec/enemy/movement-chase
  - /spec/enemy/attack-shoot
  - /spec/enemy/jaon-bullet
  - /spec/enemy/damage-and-purify
---

# PB-TASK-0025｜プロトタイプ用Enemyのキャラクターコンセプト

## タスクの目的

プロトタイプで1種類以上必要となるEnemyについて、追跡、邪音玉射撃、RGB Damageによる浄化を一体で検証できるキャラクターコンセプトを作成します。

本タスクは最終3D Model制作ではなく、Gameplay上必要なScale、Silhouette、射撃位置、移動方向、黒から白へ変化する浄化表現を比較し、後続制作へ渡す基準案を決めます。

## 完成時にできるようになること

- 戦闘中にEnemyを背景、RadioWhale、Shaondamaから識別できる
- 追跡方向と邪音玉の発射元を見た目から理解できる
- 未浄化から浄化完了までのMaterial／色変化を確認できる
- Collider、Target位置、射撃Originの候補を3D担当へ渡せる
- 1種類の検証用Enemy Model制作へ進める

## 関連する仕様

<PageRelations />

## 実施内容

### 1. Gameplay制約をBriefへ整理する

- Playerを追跡する
- 邪音玉を発射する
- RGB3チャンネルの浄化値を持つ
- 浄化進行に応じて黒から白へ変化する
- 全チャンネル最大で浄化され、Clear対象として解決する
- Player、RadioWhale、Shaondamaと誤認しない
- Prototypeでは1種類で主要確認を行える

### 2. Silhouette案を作る

異なる方向性の案を3案以上作り、各案にPlayerとのScale比較、正面・側面・背面、移動方向、射撃Origin候補、Target／Hit範囲の注記を付けます。

### 3. 浄化状態を作る

採用候補について、少なくとも次の状態を同じLighting条件で比較します。

- 未浄化
- RGB浄化途中
- 浄化完了

単に彩度を下げるだけでなく、黒から白への進行をゲーム画面上で読み取れるか確認します。

### 4. プロトタイプ用制作指示をまとめる

後続の3D Modelまたは仮Asset制作に必要な、Scale、Pivot、前方、射撃Origin、Target位置、Collider候補、Material分割候補を整理します。

## 対象範囲

- EnemyデザインBrief
- Silhouette案3案以上
- PlayerとのScale比較
- 採用候補の正面・側面・背面
- 射撃Origin、Target位置、Collider候補
- 未浄化／途中／浄化完了の状態比較
- レビューと決定記録

## 対象外

- 最終3D Model、Rig、Animation、VFX、SE
- Enemy AI、追跡、射撃、DamageのRuntime実装
- 複数Enemy種、Boss
- 邪音玉そのものの最終デザイン
- 製品版のLore・命名・バリエーション展開

## 完了条件

- [ ] Gameplay制約がBriefへ記録されている
- [ ] Silhouetteの異なる案が3案以上ある
- [ ] 各案にPlayerとのScale比較がある
- [ ] 追跡時の前方と射撃Origin候補を識別できる
- [ ] Target位置とCollider候補が注記されている
- [ ] 未浄化／途中／浄化完了の比較がある
- [ ] 背景、RadioWhale、Shaondamaと誤認しにくい
- [ ] 採用案または修正方針がレビューで決定している
- [ ] 後続の3D／実装担当へ渡す制作指示がある

## 確認手順

1. 各案をPlayer画像および仮Battle背景と並べます。
2. 想定するゲーム画面Scaleへ縮小し、Silhouetteを識別できることを確認します。
3. 射撃OriginからJaon Bulletが発射される簡易図で、方向を読み取れることを確認します。
4. 未浄化／途中／浄化完了を通常表示とグレースケールで比較します。
5. デザイン、企画、実装担当でレビューし、採用または修正方針を記録します。

## 前提・依存タスク

なし。Player実装やEnemy Runtimeの完成を待たずに開始できます。

PB-TASK-0021の視認性設計と並行可能です。両タスクで色・発光・浄化表現が競合した場合は、レビューで共通方針を決めます。

## 実装時の注意点

- 黒から白への表示変化をRGB Damage計算そのものの正本にしないでください。
- 画面から消えることと浄化成立を同じ意味として扱わないでください。
- Model制作前にScale、射撃Origin、Target位置を実装担当と確認してください。
- Prototype対象外の複数種展開やBoss要素を本タスクへ追加しないでください。

## 提出・報告方法

1. 元データと確認用画像を共有ストレージへ配置します。
2. Notionタスクへ共有リンク、案の比較、レビュー結果を記載します。
3. 決定内容と未決事項をEnemy仕様へ反映するための原稿を添付します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- デザイン資料：未登録
