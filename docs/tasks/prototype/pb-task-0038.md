---
title: Marker発射・飛行・付着・置換
description: Marker Actionの実発射時に取得した狙点へMarkerを飛ばし、有効な現在位置を攻撃側へ公開します。
pageType: task
taskId: PB-TASK-0038
category: プロトタイプ
order: 140
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/player/player-action-marker
  - /spec/combat/marker
  - /spec/camera/aim
  - /spec/common-technology/action-state-manage
---

# PB-TASK-0038｜Marker発射・飛行・付着・置換

## 目的と実現する動作

Marker Actionの実発射時に取得した狙点へMarkerを飛ばし、有効な現在位置を攻撃側へ公開します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C09・C17。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠4（Player／Camera／Aim／Marker）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 既存 | [Assets/PaletteBullet/Player/Graphs/AimMarker/MarkerStart.asset](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Graphs/AimMarker/MarkerStart.asset) | 開始条件とTokenを持つ動作開始 |
| 既存 | [Assets/PaletteBullet/Player/Graphs/AimMarker/Marker.asset](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Graphs/AimMarker/Marker.asset) | 発射Eventと終了の保存VS接続 |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Marker/` | 飛行・付着・置換・有効Target公開 |
| 新規 | `Assets/PaletteBullet/Prototype/Prefabs/` | Markerの確認用Prefab |

## 実装範囲

- Action開始時ではなく発射Event時に武器world位置と現在狙点を取得する。費用・開始条件・中断条件はMarker Action正本と標準VSへ接続する。
- 飛行、衝突後の付着、寿命、置換をMarker Ownerが扱い、現在有効なMarkerだけを参照可能にする。飛行中も正本の有効条件を満たせばTargetとして公開する。
- 古いMarkerの消滅・衝突callbackで置換後Markerを消したり復活させたりしない。爆風との接続には有効性・消滅要求の最小入口を渡す。終了で公開と作用を止める。

今回の範囲外：Palette Bulletの飛行、攻撃Targetの最終優先判断、最終VFX／SE。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0036](/tasks/prototype/pb-task-0036)、[PB-TASK-0037](/tasks/prototype/pb-task-0037)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Player／Camera → Marker | 現在Token、発射Event時の武器位置と狙点、Battle ID |
| Marker → 攻撃解決／Palette Bullet | 現在有効性・world位置、爆風による処理入口 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| Action開始後、発射Event前に視点を動かす | 発射時の新しい狙点へ飛ぶ |
| 飛行・付着中のMarker位置を読み、新Markerへ置換する | 常に現在有効なMarkerを参照できる |
| 置換後に旧衝突、終了後に発射Eventを送る | 旧Markerを復活させず、新規Markerも作らない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

保存グラフを用いるPlayMode確認。Fake攻撃側からTargetを読み、置換・旧callback・終了を検査する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
