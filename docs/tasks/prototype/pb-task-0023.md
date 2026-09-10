---
title: グレーボックスStage・差し替え可能な通常Camera Rig
description: 既存PB-TASK-0023を再利用し、Playerを差し替えられる通常Cameraと検証空間を作ります。プロトタイプカテゴリへ移し、Aim接続を後続へ分離します。
pageType: task
taskId: PB-TASK-0023
category: プロトタイプ
order: 110
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/stage/
  - /spec/camera/
  - /spec/camera/CameraBasicPosition
  - /spec/camera/CameraFreeRot
  - /spec/camera/collision
---

# PB-TASK-0023｜グレーボックスStage・差し替え可能な通常Camera Rig

## 目的と実現する動作

既存PB-TASK-0023を再利用し、Playerを差し替えられる通常Cameraと検証空間を作ります。プロトタイプカテゴリへ移し、Aim接続を後続へ分離します。

既存タスクIDを維持します。すでに作成済みの成果があれば再制作せず差分を確認します。PB-TASK-0018を待たず独立Sceneで着手できます。

## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C16、通常Cameraと共有Sceneの境界。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠4（Player／Camera／Aim／Marker）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Scenes/StageCameraVerification.unity` | Dummy Targetを使う独立検証Scene |
| 新規 | `Assets/PaletteBullet/Prototype/Prefabs/` | Stage Geometry・Spawn Marker・通常Camera Rig |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Camera/` | 通常追従・回転・最小障害物処理 |

## 実装範囲

- 床・外周・壁・遮蔽物・狭所を仮素材で作り、Player／Enemy／RadioWhaleのSpawn位置を識別できるようにする。Stage objectiveや生成プログラムをここへ混ぜない。
- CameraはTarget Transform等の小さな参照を受ける。右肩越しPivot／Offset、水平FOV85度相当の仮値、near clip0.1、Yaw360度、調整可能なPitch制限を用意する。
- Target移動後のLateUpdateで追従し、壁・狭所のめり込みを確認する。Dummy専用Driverは正式Playerの状態や入力を実装しない。
- Geometry・Spawn Marker・CameraをPrefab単位で渡し、枠1のPrototypeBattleを別に新規作成・上書きしない。

今回の範囲外：正式Playerの移動・入力、Aim等のAction固有Camera、Enemy AI、Clear判定、最終Level Design。

## 依存と受け渡し

先行タスク：なし。

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| 本タスク → 枠1 | Stage GeometryとSpawn MarkerのPrefab |
| Player → Camera／本タスク → PB-TASK-0037 | 差し替え可能なTargetと通常Camera Rig。Aim固有処理は後続 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| Dummyを別Transformへ差し替えて動かす | 正式Player型なしでCameraが追従する |
| 1920×1080で壁際・角・狭所を操作する | 重大なめり込みや視界破綻がない |
| Inspectorで距離・FOV・Pitchを変更する | コードを変えずに確認できる |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

独立SceneでのPlayMode操作確認。パラメータ、使用解像度、既知の視界問題を記録する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
