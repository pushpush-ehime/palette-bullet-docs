---
title: Drag Chargeの複数選択・一括判定
description: Drag中に選んだ個体をRelease時にまとめて判定し、成功した一組だけを予約します。
pageType: task
taskId: PB-TASK-0041
category: プロトタイプ
order: 170
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

# PB-TASK-0041｜Drag Chargeの複数選択・一括判定

## 目的と実現する動作

Drag中に選んだ個体をRelease時にまとめて判定し、成功した一組だけを予約します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C06・C07。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠5（Charge／Allocation）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 既存 | [Assets/PaletteBullet/Player/Graphs/Charge/DragStart.asset](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Graphs/Charge/DragStart.asset) | Drag開始と一時選択 |
| 既存 | [Assets/PaletteBullet/Player/Graphs/Charge/Drag.asset](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Graphs/Charge/Drag.asset) | Release判定・中断と表示 |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Charge/` | 複数選択・個体重複排除・Click共通境界 |

## 実装範囲

- Clickと共通の入力・選択入口を使い、同じ個体を複数回なぞっても一個体として保持する。選択中とReservedは別状態であり、選択だけではcommitしない。
- Release時点のCurrent一つへ選択全体を渡す。Drag途中の過去Currentへ割り当てたり、一部だけ成功を残したりしない。正本の成功／miss後処理と費用へ接続する。
- Dash終了前後、開始不可Action、Reaction、Root変更による中断規則を保存VSへ接続する。判定前の中断では一時選択を破棄し、commit済み予約は攻撃解決の終了に従う。

今回の範囲外：Allocationアルゴリズムの重複実装、Mode／Conductの効果、正式な選択VFX。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0039](/tasks/prototype/pb-task-0039)、[PB-TASK-0040](/tasks/prototype/pb-task-0040)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Charge選択 → Allocation | Release時刻とCurrent判定に必要な選択個体集合 |
| Allocation → Drag VS／表示 | 全体成功／miss・理由と一度のcommit結果 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 同じ個体を往復してなぞりReleaseする | 選択数と予約数が重複しない |
| 不足・過剰・不適合な組をReleaseする | SlotとReservedに部分成功を残さない |
| Drag中にCurrentが切り替わる | Release時のCurrent一つで評価し、複数Eventへ分配しない |
| Release前に中断、終了後に遅延Releaseする | 一時選択が消え、Allocationが成立しない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

保存VSと実AllocationでのPlayMode確認。全体判定の組合せはPB-TASK-0039の試験を再利用し、ここでは入力時系列を検査する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
