---
title: Aim・Camera・レティクル参照の接続
description: PlayerのAim状態に応じたカメラ操作と、Charge選択・Marker発射が同じ意味で使える現在の狙点を提供します。
pageType: task
taskId: PB-TASK-0037
category: プロトタイプ
order: 130
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/player/player-action-aim
  - /spec/camera/aim
  - /spec/camera/
  - /spec/common-technology/action-state-manage
---

# PB-TASK-0037｜Aim・Camera・レティクル参照の接続

## 目的と実現する動作

PlayerのAim状態に応じたカメラ操作と、Charge選択・Marker発射が同じ意味で使える現在の狙点を提供します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C06・C09・C16。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠4（Player／Camera／Aim／Marker）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 既存 | [Assets/PaletteBullet/Player/Graphs/AimMarker/Aim.asset](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Graphs/AimMarker/Aim.asset) | 標準VSのAim動作 |
| 参照・必要箇所のみ変更 | [Assets/PaletteBullet/Player/Runtime/PlayerTargetInfo.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerTargetInfo.cs) | 既存snapshot補助と現在参照を区別 |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Camera/` | Aim Camera・現在Ray・狙点参照 |

## 実装範囲

- 通常CameraへAim固有の視点・FOV・追従を接続し、Playerの確定状態から表示を切り替える。Camera側で別のAction状態を所有しない。
- 正本のRay起点・方向・接触点／非接触時の所定距離を取得する読取境界を用意する。現在world座標と過去snapshotを区別し、Marker発射Event時に取り直せるようにする。
- Chargeの選択用には画面上の範囲と現在有効な個体を照会できる入力を渡す。選択／Charge成功やAttackEvent Target優先順位をCameraが判定しない。

今回の範囲外：Markerの飛行・付着、Charge成功判定、最終カメラ調整、AttackEventのTarget snapshot。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0023](/tasks/prototype/pb-task-0023)、[PB-TASK-0036](/tasks/prototype/pb-task-0036)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Player → Camera | 確定Aim状態とTarget Transform |
| Camera → Charge／Marker／攻撃解決 | 現在Ray・画面上の選択情報・有効なworld狙点。採用時点は要求側が決める |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| Aim開始・終了と移動を繰り返す | カメラとPlayer状態の不一致が残らない |
| 壁の手前、障害物なし、視点変更直後に狙点を読む | 正本の現在Rayから値が取れ、古い狙点を使わない |
| Camera参照を欠けさせる | 必須接続不足を検出し、ゼロ座標を成功値として渡さない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

StageCameraVerificationで操作し、実Playerに差し替えたPlayMode確認。画面Rayとworld位置の関係を記録する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
