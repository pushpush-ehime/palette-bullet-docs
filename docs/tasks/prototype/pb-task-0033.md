---
title: Shaondama個体・浮遊・予約・寿命
description: 出現完了したNormal／補充Wildcardを選択でき、予約・消費・寿命終了を同じ個体の状態として扱えるようにします。
pageType: task
taskId: PB-TASK-0033
category: プロトタイプ
order: 80
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/shaondama-music/orb-data
  - /spec/shaondama-music/floating-behavior
  - /spec/shaondama-music/wildcard-orb
  - /spec/draw-system/charge-allocation
---

# PB-TASK-0033｜Shaondama個体・浮遊・予約・寿命

## 目的と実現する動作

出現完了したNormal／補充Wildcardを選択でき、予約・消費・寿命終了を同じ個体の状態として扱えるようにします。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C05・C07・C11・C17。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠3（Shaondama／RadioWhale供給）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Shaondama/` | 個体状態、選択対象の公開、浮遊、予約と寿命 |
| 新規 | `Assets/PaletteBullet/Prototype/Prefabs/` | Normal／Wildcardの確認用PrefabとCollider |

## 実装範囲

- Battle IDと個体ID、生成元、Normalのsource Note occurrence・音程・実効値を保持し、未出現・選択可能・Reserved・消費／終了を区別する。Wildcardへ架空のNormal sourceを入れない。
- 出現側からの移譲後に選択対象として公開する。浮遊とLifetimeは正本に従い、Reserved中の通常Lifetimeを止める。二重予約・消費済み個体の再利用を拒否する。
- Normal自然破裂の候補は有効Charge commitより後で確定する。Damage候補にBattle・作用ID・対象・最終RGBを載せる。Wildcardの一般Lifetime終了とNormal自然破裂を混同しない。
- commit済みReservedのConsumed／Releasedの確定は攻撃解決から受ける。個体側は一度だけ状態を適用し、Allocation側と独自に解放し合わない。

今回の範囲外：RadioWhaleの出現制御、Slotの選択判断、Palette Bullet生成、Parry由来変換の実処理。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| RadioWhale → Shaondama → 供給 | 個体の一度限りの制御移譲、選択可能化・予約・消費・終了の事実 |
| Charge／Allocation ↔ Shaondama | 現在の選択有効性、予約要求と成否。攻撃解決は実発射時のworld位置を参照 |
| Shaondama → Enemy Damage | 自然破裂のRGB候補。PB-TASK-0044までFake受信先で確認 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 出現途中、移譲後、Reserved後に同じ個体を選ぶ | 移譲後かつ非Reservedのときだけ新規選択できる |
| 予約要求と消費通知をそれぞれ再送する | 一個体を二重予約・二重消費しない |
| 受付期間内のCharge成功と自然破裂を同frameにする | Charge成功が優先され、自然破裂Damageを二重発生させない |
| Reservedのまま終了・Retryする | 終了要求で一度だけ無効化され、新Battleへ残らない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

状態遷移・寿命・競合のEditMode試験、Prefabの浮遊／選択公開とFake予約によるPlayMode確認。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
