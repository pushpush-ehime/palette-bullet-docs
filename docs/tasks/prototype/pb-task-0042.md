---
title: AttackEvent解決・発射snapshot・予約消費
description: 音楽上の発火に合わせてComplete／Incomplete／Zero Charge／Weakを確定し、使用するReservedだけを一度消費して発射します。
pageType: task
taskId: PB-TASK-0042
category: プロトタイプ
order: 180
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/bgm/bgm-attack-judgement
  - /spec/combat/palette-bullet
  - /spec/draw-system/charge-allocation
  - /spec/bgm/bgm-gameplay-connection
---

# PB-TASK-0042｜AttackEvent解決・発射snapshot・予約消費

## 目的と実現する動作

音楽上の発火に合わせてComplete／Incomplete／Zero Charge／Weakを確定し、使用するReservedだけを一度消費して発射します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C08〜C10・C17、Q05。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠6（攻撃解決／Palette Bullet／Enemy RGB）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Attack/` | 攻撃解決、発火snapshot、Entry待機と予約終了 |
| 参照 | [Assets/Scripts/MusicChart/AttackEvent.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/AttackEvent.cs) | Chord／Arpeggioの定義とEntry時刻 |

## 実装範囲

- 発火時の既存SlotとReservedから結果を確定する。Allocationをやり直さず、Incompleteの空Slotを補わず、Zero Chargeでは弾を作らない。WeakはAllocationで確定したNoteを使う。
- Targetは有効Marker→Playerに最も近い有効Enemy→レティクルRay接触点→所定距離の順で一度snapshotする。同距離Enemyは安定した登録順で選ぶ。同occurrenceのArpeggio全弾で共有する。
- Mode／Conductは段階1では中立値を使用し、snapshotを渡す境界を保持する。Chordの同時発射とArpeggioのEntry順を正本どおり実行し、開始位置は各弾丸化時点のShaondama world座標を取得する。
- Q05の生成と消費を実体化する。生成先の準備成功と一度限りの消費確定を一組として扱い、再送で二重生成・消費しない。生成失敗は明示結果を返し、発射成功・音程音を通知せず、予約／途中生成物を追跡可能にする。再送による自動再発射をしない。復旧方針の変更が必要なら仕様判断へ戻す。
- commit済みReservedのConsumed／Releasedは本Ownerだけが確定する。終了時に未発射Entryを取消し、未消費分を一度だけ解放し、Allocationへ関係解消を通知する。

今回の範囲外：Bullet飛行・衝突、RGB集約、Mode／Conduct効果、生成失敗からの自動復旧。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0031](/tasks/prototype/pb-task-0031)、[PB-TASK-0039](/tasks/prototype/pb-task-0039)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| 音楽／Allocation／Target参照 → 攻撃解決 | 発火・Entry時刻、予約snapshot、有効Marker／Enemy／Ray |
| 攻撃解決 → Bullet／Audio | occurrence・Entry・作用識別、固定Target、実発射位置、確定RGB・exact Note。Audioへは発射事実だけ |
| 攻撃解決 → Shaondama／Allocation／Combat | 一度の消費／解放と終了結果 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| Complete・Incomplete・Zero・Weakを固定入力で発火する | 結果に対応する実予約分だけを使う |
| Arpeggio途中でMarkerとReserved個体を動かす | Targetは初回snapshot、各発射位置はその時点の個体位置になる |
| 発射要求再送と生成準備失敗を注入する | 二重消費・二重弾・失敗時の発射事実通知がない |
| Arpeggio途中で終了し残Entry通知を送る | 残りを発射せず、未消費Reservedだけを一度解放する |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

Fake Bullet生成先・Target・音楽位置による自動試験。PB-TASK-0043・0038・0044との実接続はPB-TASK-0045。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
