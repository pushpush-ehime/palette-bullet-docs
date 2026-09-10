---
title: RadioWhale出現・追従・Shaondama制御移譲
description: 供給要求を受けたRadioWhaleが個体を出現させ、演出が終わった個体だけをShaondama側へ渡します。
pageType: task
taskId: PB-TASK-0034
category: プロトタイプ
order: 90
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/radiowhale/shaondama-spawning
  - /spec/radiowhale/follow-and-floating
  - /spec/radiowhale/behavior-patterns
  - /spec/radiowhale/gameplay-lifecycle
---

# PB-TASK-0034｜RadioWhale出現・追従・Shaondama制御移譲

## 目的と実現する動作

供給要求を受けたRadioWhaleが個体を出現させ、演出が終わった個体だけをShaondama側へ渡します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C04・C05・C17、Q06の準備進行。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠3（Shaondama／RadioWhale供給）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/RadioWhale/` | 生成要求、出現進行、初期追従と終了 |
| 新規 | `Assets/PaletteBullet/Prototype/Prefabs/` | 確認用RadioWhale、背中の生成位置と演出 |

## 実装範囲

- 供給側からBattle ID・要求ID・個数・生成情報を受け、背中の生成位置からNormal／補充Wildcardを出現させる。生成するNoteや不足数をRadioWhale側で再計算しない。
- 初期の追従・浮遊パターンをPlayer位置の読取で動かす。正式モデルや最終演出を待たず、出現途中と移譲済みを見分けられる仮素材を使う。
- 準備中は3時計が止まっていても出現完了まで進められるようにする。要求受理やobject生成を完了通知にせず、演出完了→制御移譲→選択可能化を一度だけ成立させる。
- 未移譲個体はRadioWhale側、移譲後はShaondama側が片付ける。終了中に遅れた出現完了が届いても公開せず、失敗／取消を供給へ返す。

今回の範囲外：PB-TASK-0020のキャラクターデザイン、追加行動パターン、設定解放画面、演奏広場、Parryからの直接Wildcard変換。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0033](/tasks/prototype/pb-task-0033)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| 供給 → RadioWhale | Battle ID、生成要求ID、source occurrenceまたは補充元、個数と設定 |
| RadioWhale → Shaondama／供給 | 移譲対象個体、出現完了／失敗／取消。Playerは追従Target参照だけを渡す |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 3時計停止中に初期出現を要求する | 演出が進み、完了後にだけ選択可能になる |
| 同じ要求を2回送る | 要求個数が倍増しない |
| 出現途中でBattle終了し完了callbackを流す | 選択可能個体を残さず、一度だけ片付ける |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

Fake供給元とPlayer Transformを使うPlayMode確認。生成数・移譲数・終了解放数を記録する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
