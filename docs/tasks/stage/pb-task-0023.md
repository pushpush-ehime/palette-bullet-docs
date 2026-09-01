---
title: プロトタイプ用グレーボックスStage・Camera Rig
description: Player実装に依存しない検証Sceneで、戦闘空間、Spawn Marker、差し替え可能なCamera Targetを備えたStageと通常カメラの土台を作る
pageType: task
taskId: PB-TASK-0023
category: ステージ
order: 10
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/stage/
  - /spec/camera/
  - /spec/camera/CameraBasicPosition
  - /spec/camera/CameraFreeRot
  - /spec/camera/collision
---

# PB-TASK-0023｜プロトタイプ用グレーボックスStage・Camera Rig

## タスクの目的

Player Action／State Graph基盤の完成を待たず、プロトタイプ戦闘で使用する空間Scaleと通常カメラを検証できるグレーボックスを作成します。

正式なPlayerの代わりに差し替え可能な`Camera Target`とScale確認用Dummyを使用し、後続のPlayer、Enemy、Battle lifecycleから再利用できるStage Prefab、Camera Rig、Spawn Markerを用意します。

## 完成時にできるようになること

- 仮の床、壁、遮蔽物でBattle空間のScaleを確認できる
- Player、Enemy、RadioWhale等のSpawn位置をScene上で識別できる
- 正式Playerなしで通常カメラの距離、FOV、回転、障害物処理を確認できる
- Camera Targetを正式Playerへ差し替えられる
- PB-TASK-0018の`PrototypeBattle` SceneへPrefab単位で組み込める

## 関連する仕様

<PageRelations />

## 実施内容

### 1. 独立した検証Sceneを作る

`StageCameraVerification`または同等の明確な名称で検証Sceneを作成します。PB-TASK-0018が所有する`PrototypeBattle` Sceneを本タスクで新規作成・上書きしません。

### 2. グレーボックスStageを作る

Primitiveまたは簡易Prefabで、少なくとも次を配置します。

- 床
- 外周または戦闘可能範囲
- 高さと奥行きを確認できる壁・遮蔽物
- Player Spawn Marker
- Enemy Spawn Marker
- RadioWhale初期位置候補
- Camera検証用の狭所と壁際

Stage objective、wave、Enemy AI、Clear判定は実装しません。

### 3. Camera Targetを差し替え可能にする

Camera Rigは正式Player型へ直接依存せず、Target Transformまたは同等の最小契約を受け取ります。SceneではScale確認用DummyをTargetにします。

DummyはPlayerアクションやState Machineを実装しません。必要な場合のみ、カメラ検証専用の単純な移動Driverを別Componentとして分離します。

### 4. 通常カメラの基盤を作る

本タスクでは通常状態だけを対象にします。

- 右肩越しのPivotとOffset
- 水平FOV 85度相当の仮値
- near clip 0.1
- Yaw 360度
- Pitch仮制限
- LateUpdateでの追従
- 壁へのめり込みを確認できる最小障害物処理
- Inspectorまたは設定AssetからのParameter調整

Dash、Aim等のPlayer Action固有Cameraは後続へ分離します。

### 5. 再利用単位を整理する

Stage Geometry、Spawn Marker、Camera Rig、Dummy TargetをPrefabまたは同等の再利用可能な単位に分け、`PrototypeBattle`へ組み込む手順を記録します。

## 対象範囲

- Stage／Camera専用検証Scene
- グレーボックスGeometry
- Spawn Marker
- Scale確認用Dummy
- 差し替え可能なCamera Target
- 通常カメラの配置・回転・基本障害物処理
- 調整可能Parameter
- PlayMode確認

## 対象外

- 正式Player入力・移動・Action／State Graph
- Dash／Aim／Charge／Parry固有Camera
- Enemy AI、攻撃、Spawn program、Clear判定
- 最終Level Design、Model、Texture、Lighting、VFX
- `PrototypeBattle` SceneのBattle lifecycle
- 最終Camera Parameterの確定

## 完了条件

- [ ] 独立したStage／Camera検証Sceneがある
- [ ] 床、外周、壁・遮蔽物でBattle空間のScaleを確認できる
- [ ] Player／Enemy／RadioWhaleのSpawn Markerを識別できる
- [ ] Camera Rigが正式Player型へ直接依存していない
- [ ] Dummy Targetを正式Playerへ差し替え可能である
- [ ] 通常カメラのPivot、Offset、FOV、near clip、Yaw、Pitchを確認できる
- [ ] Camera Parameterをコード変更なしで調整できる
- [ ] Camera更新がTarget移動後のLateUpdateで行われる
- [ ] 壁際・狭所・見下ろしで重大なめり込みや画面破綻がない
- [ ] 1920×1080でScaleと視界を確認できる
- [ ] `PrototypeBattle`へ組み込む手順が記録されている

## 確認手順

1. 検証Sceneを直接開いてPlay Modeを開始します。
2. Dummy Targetを基準にYaw、Pitch、距離、FOVを確認します。
3. 壁際、角、狭所、見下ろし限界でCameraを操作します。
4. Targetを急に移動させ、追従のジッターや1Frame遅れを確認します。
5. Inspector上で距離、Offset、FOV、Pitch制限を変更し、コード変更なしで反映されることを確認します。
6. Dummy Targetを別Transformへ差し替え、Camera Rigを再利用できることを確認します。
7. 1920×1080でScene全体とSpawn MarkerのScaleを記録します。

## 前提・依存タスク

なし。Player Action／State Graph基盤、PB-TASK-0017、PB-TASK-0018の完成を待たずに開始できます。

PB-TASK-0018は`PrototypeBattle` SceneとBattle lifecycleを所有します。本タスクの成果はPrefab等で後から組み込みます。

## 実装時の注意点

- 正式Playerの仮実装を本タスクへ含めないでください。
- CameraからPlayer Action Stateを独自定義しないでください。
- 調整値をコードへ固定しないでください。
- Dummy専用処理をCamera Runtime本体へ混入させないでください。
- Stage Clear条件やEnemy Spawn programをGeometry担当へ混入させないでください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文へScene、Prefab構成、Camera Target境界、仮Parameter、既知の問題を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
