---
title: Click Chargeの選択・判定・中断
description: 実Inputから一個体を選んでClick Chargeを進め、判定時に有効ならAllocationへ渡します。既存のCharge雛形を本番動作へつなぎます。
pageType: task
taskId: PB-TASK-0040
category: プロトタイプ
order: 160
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/player/player-action-charge
  - /spec/draw-system/charge-allocation
  - /spec/common-technology/action-state-manage
---

# PB-TASK-0040｜Click Chargeの選択・判定・中断

## 目的と実現する動作

実Inputから一個体を選んでClick Chargeを進め、判定時に有効ならAllocationへ渡します。既存のCharge雛形を本番動作へつなぎます。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C06・C07・C16。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠5（Charge／Allocation）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 既存 | [Assets/PaletteBullet/Player/Graphs/Charge/ClickStart.asset](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Graphs/Charge/ClickStart.asset) | 開始条件・選択とPress時情報 |
| 既存 | [Assets/PaletteBullet/Player/Graphs/Charge/Click.asset](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Graphs/Charge/Click.asset) | 判定・成功／miss／中断の標準VS |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Charge/` | 選択照会・Allocationへの型付き接続・最小表示 |

## 実装範囲

- Input ActionのPress／Releaseと入力時刻を受け、正本のClick／Drag識別を行う。画面上の選択と個体の現在有効性を確認する。Example.*の固定成功を本番判定へ置き換える。
- 開始条件・スタミナ・判定時点・成功／miss処理はCharge正本へ接続する。Press時snapshotを保持し、段階1ではMode／Conductを中立値として扱う。Charge成功自体でPalette Bulletを出さない。
- 判定前のAction／Reaction／Root変化による中断と判定済みmissを区別する。旧Tokenや終了後の遅延判定を無効にする。Dash先行入力等の確定ルールを単なる即時Action開始へ変更しない。
- 選択対象・進行・成功／miss／cancelを操作確認できる最小表示を付ける。Input／Prefab／共通グラフの変更は枠4へまとめる。

今回の範囲外：Drag全体操作、Damage／Parryの本番判定、Mode／Conductの効果、旧独自Runtimeの再実装。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0036](/tasks/prototype/pb-task-0036)、[PB-TASK-0037](/tasks/prototype/pb-task-0037)、[PB-TASK-0039](/tasks/prototype/pb-task-0039)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Player／Camera／Shaondama → Charge | Input時刻・現在Token・選択候補の有効性・Press時snapshot |
| Charge → Allocation | 判定時の対象個体と要求。一度の結果をVSへ反映 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 有効な個体をClickし判定まで継続する | 成功時だけSlotに予約され、この時点では発射しない |
| 判定前に対象を無効化またはReactionを開始する | 仕様の拒否／中断となり、未判定の成功や部分予約を残さない |
| 同じ判定callbackを再送する | 費用と予約を二重適用しない |
| 終了後にReleaseと旧run判定を送る | Actionと割当を再開しない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

保存VSを再読込したPlayMode操作確認。Input→判定→予約の一連を実接続し、ReactionはFakeの判定済み通知でも確認可能とする。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
