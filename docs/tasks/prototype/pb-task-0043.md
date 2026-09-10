---
title: Palette Bullet飛行・衝突・第一爆発
description: 発射時に確定した情報でPalette Bulletを飛ばし、Direct Contactと第一爆発のRGB候補をEnemyへ渡します。
pageType: task
taskId: PB-TASK-0043
category: プロトタイプ
order: 190
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/combat/palette-bullet
  - /spec/combat/marker
  - /spec/enemy/damage-and-purify
---

# PB-TASK-0043｜Palette Bullet飛行・衝突・第一爆発

## 目的と実現する動作

発射時に確定した情報でPalette Bulletを飛ばし、Direct Contactと第一爆発のRGB候補をEnemyへ渡します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C10・C11・C17。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠6（攻撃解決／Palette Bullet／Enemy RGB）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Projectile/` | Palette Bullet生成、直線飛行、衝突、第一爆発 |
| 新規 | `Assets/PaletteBullet/Prototype/Prefabs/` | 確認用弾と爆発範囲 |
| 新規 | `Assets/PaletteBullet/Prototype/Settings/` | 速度・寿命・衝突Layer・RGB倍率の採用設定 |

## 実装範囲

- PB-TASK-0042の生成準備／消費確定境界に従う。受け取った実発射位置から固定Targetへ直線飛行し、Target objectを追尾しない。
- 衝突対象・除外対象・距離／寿命等の終了条件、第一爆発、壁や地形による爆風遮蔽を正本へ接続する。Markerへの作用も正本の有効性と消滅境界を使う。
- ProducerとしてDamage倍率を適用した最終RGB payloadを出す。DirectとExplosionは別作用として識別し、一つのExplosionから同Enemyの複数Colliderが検出されても受信側が重複を除けるIDを渡す。
- 終了で移動・Collider・Damage出力を無効化し、遅れた衝突で新しい爆発やDamageを起こさない。任意の見た目を残す場合もGameplay作用を分離する。

今回の範囲外：Enemy HP／RGBの所有、Mode／Conduct固有効果と第二爆発／音響Repeat、最終VFX。後続効果用の識別余地は残すが実装済みとはしない。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0042](/tasks/prototype/pb-task-0042)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| 攻撃解決 → Palette Bullet | Battle・occurrence・Entry、準備／確定、位置・Target・実効値snapshot |
| Palette Bullet → Enemy Damage／Marker | 作用種別・作用ID・対象と最終RGB候補、Markerへの規定作用 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 発射後にMarkerとEnemyを移動する | 弾は保存Targetへ飛び、追尾へ変わらない |
| 一体の複数Colliderへ接触／爆風検出する | 同作用を識別でき、DirectとExplosionは区別される |
| 壁越しに爆風対象を置く | 正本の遮蔽条件を満たす対象へDamageを通さない |
| 飛行中に終了し旧衝突を再送する | Damageも第一爆発も新規発生しない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

Fake Enemy受信先と物理Colliderを使うPlayMode試験。実RGB結果はPB-TASK-0044・0045で確認する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
