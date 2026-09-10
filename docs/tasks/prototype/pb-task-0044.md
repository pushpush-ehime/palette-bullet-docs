---
title: 最小Enemy・RGB Damage集約・浄化通知
description: 攻撃を受ける一種類の確認用Enemyを作り、RGB候補を一度だけ集約して浄化をStageへ通知します。
pageType: task
taskId: PB-TASK-0044
category: プロトタイプ
order: 200
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/enemy/damage-and-purify
  - /spec/stage/
  - /spec/combat/palette-bullet
---

# PB-TASK-0044｜最小Enemy・RGB Damage集約・浄化通知

## 目的と実現する動作

攻撃を受ける一種類の確認用Enemyを作り、RGB候補を一度だけ集約して浄化をStageへ通知します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C11・C12・C19、Q03のEnemy frame側。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠6（攻撃解決／Palette Bullet／Enemy RGB）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Enemy/` | RGB状態、Damage候補集約、浄化と有効Target参照 |
| 新規 | `Assets/PaletteBullet/Prototype/Prefabs/` | 一種類の確認用Enemy |
| 新規 | `Assets/PaletteBullet/Prototype/Settings/` | 正本に対応する初期RGB・浄化条件の仮設定 |

## 実装範囲

- Stageから渡されたBattle ID・Enemy ID・位置と設定で個体を準備し、初期状態・有効性を公開する。静止した仮モデルで始められるが、RGBと浄化は実処理にする。
- 有効な最終RGB候補を作用種別・作用ID・Enemy IDで重複排除し、正本の同frame集約順で合算・丸め・Clamp・浄化を確定する。Producerの倍率を二度掛けず、見た目のColor値をDamageへ流用しない。
- 浄化を一度だけStageへ通知する。自身でBattle Clearにせず、Stageの登録とobjectiveに従う。有効Target参照は浄化・終了で解除する。
- 必須設定不足と不正RGB値を検出し、拒否／失敗を理由付きで返す。終了後や別Battleからの候補を現在状態へ適用しない。

今回の範囲外：PB-TASK-0025のキャラクターデザイン、Enemy追跡AI・邪音玉攻撃、Player Damage／Parry、複数Enemy種類の制作。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0029](/tasks/prototype/pb-task-0029)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Stage → Enemy | 安定した登録ID、初期設定と生成位置 |
| Bullet／Normal自然破裂 → Enemy | frame、作用種別・作用ID・対象、最終RGB payload |
| Enemy → Stage／Target参照／表示 | 確定浄化の事実、有効性と現在world位置、RGB読取値 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 同Explosionを二つのColliderから同frameに送る | 一作用分だけ反映する |
| DirectとExplosionを順序を反転して送る | 別作用として合算し、同じ確定RGBになる |
| 浄化条件を満たす攻撃を重複通知する | 浄化通知は一度だけで、StageがClearを判断する |
| 終了・Retry後に旧Damage候補を送る | 新EnemyのRGBと登録状態が変わらない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

RGBの重複・合算・丸め・Clamp・浄化の自動試験と、実Prefab／Stageを使うPlayMode確認。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
