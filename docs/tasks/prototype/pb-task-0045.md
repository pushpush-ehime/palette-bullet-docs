---
title: 段階1統合確認：Chargeから浄化・Result・Retryまで
description: 各枠の実装を共有Sceneへ接続し、通常攻撃の一連の操作とBattle終了を実物同士で確認します。Fake単体の成功と段階1合格を分けるための統合タスクです。
pageType: task
taskId: PB-TASK-0045
category: プロトタイプ
order: 210
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/game/
  - /spec/combat/
  - /spec/ui/
---

# PB-TASK-0045｜段階1統合確認：Chargeから浄化・Result・Retryまで

## 目的と実現する動作

各枠の実装を共有Sceneへ接続し、通常攻撃の一連の操作とBattle終了を実物同士で確認します。Fake単体の成功と段階1合格を分けるための統合タスクです。

準備・部分接続は一部の完了を待たず進められます。下の依存一覧は段階1の合格判定までに必要な実装です。枠1が統合を取りまとめ、機能の修正は各枠が担当します。

## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C01〜C12・C16〜C19の段階1対象。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠1（Battle／共通接続）の実装担当。担当決定済み。個人の割当は非公開のチーム管理で扱う。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 共有 | `Assets/PaletteBullet/Prototype/Scenes/PrototypeBattle.unity` | 各実Ownerと仮表示・採用設定を組み込む |
| 共有 | `Assets/PaletteBullet/Prototype/Prefabs/` | 実機能のPrefab参照とStage配置 |
| 新規 | `Assets/PaletteBullet/Prototype/Tests/` | 接続境界の回帰と検証用の失敗注入 |

## 実装範囲

- 枠1を統合窓口に、各枠のPrefab・設定・接続コードを順に組み込む。共通Sceneは枠1、Player共有アセットは枠4が取りまとめ、統合で見つかった不具合は該当機能の差分として修正する。
- 保存Chart、実RadioWhale／Shaondama、実Player／Camera／Marker、実Charge／Allocation、実AttackEvent／Bullet／Enemy／Stageを使う。仮素材・仮値は許可するが、本番経路をFakeで代用して合格にしない。
- Clickを先に通し、Drag・Chord／Arpeggio／Weak・Incomplete／Zeroの対象ケースを続けて確認する。最小予告・Charge状態・RGB・Result表示で操作結果を追えるようにする。
- 実浄化からClearまでを確認し、正常Game Overは候補注入でResult／Retry接続を確認する。この注入は実Player死亡の完成には数えない。Pause、出現／Arpeggio途中終了、旧通知、D03失敗も確認する。
- PB-TASK-0017の既存Windows Build経路で段階1の起動・入力・音・浄化・再試行を短く確認する。これは最終配布受入ではなく、Player Damage／Parry・Mode／Conduct等を追加した後の段階3を残す。

今回の範囲外：プロトタイプ全機能の完了宣言、Enemy攻撃／Player被弾・死亡の実接続、Parry／Wildcard変換、固定プリセットMode／Conduct、最終Windows配布受入。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0023](/tasks/prototype/pb-task-0023)、[PB-TASK-0027](/tasks/prototype/pb-task-0027)、[PB-TASK-0028](/tasks/prototype/pb-task-0028)、[PB-TASK-0029](/tasks/prototype/pb-task-0029)、[PB-TASK-0030](/tasks/prototype/pb-task-0030)、[PB-TASK-0031](/tasks/prototype/pb-task-0031)、[PB-TASK-0032](/tasks/prototype/pb-task-0032)、[PB-TASK-0033](/tasks/prototype/pb-task-0033)、[PB-TASK-0034](/tasks/prototype/pb-task-0034)、[PB-TASK-0035](/tasks/prototype/pb-task-0035)、[PB-TASK-0036](/tasks/prototype/pb-task-0036)、[PB-TASK-0037](/tasks/prototype/pb-task-0037)、[PB-TASK-0038](/tasks/prototype/pb-task-0038)、[PB-TASK-0039](/tasks/prototype/pb-task-0039)、[PB-TASK-0040](/tasks/prototype/pb-task-0040)、[PB-TASK-0041](/tasks/prototype/pb-task-0041)、[PB-TASK-0042](/tasks/prototype/pb-task-0042)、[PB-TASK-0043](/tasks/prototype/pb-task-0043)、[PB-TASK-0044](/tasks/prototype/pb-task-0044)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| 各枠 → 統合窓口 | 採用PR／Commit、Prefab・設定参照、接続確認手順と既知の未接続 |
| 統合 → 操作確認窓口 | 段階1の実操作、期待結果、実結果、Fake注入したケースの識別 |
| 後続 → PB-TASK-0017・0024 | 段階1結果を引き継ぎ、残る完成条件を最終受入へ追加 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 起動し、供給完了後に通常個体をChargeする | 開始順を守り、Charge成功で予約、音楽時刻で発射する |
| Markerを使いEnemyへ攻撃を重ねる | RGBが変化し、実浄化→Stage→Clear→Resultへ進む |
| 不成立DragとZero Chargeを試す | 部分予約や架空の弾・音を生成しない |
| 正常Game Over候補注入→Retry後に同じ操作を行う | 新Battleで供給・Charge・発射が再び動く。実死亡の確認は後続として残す |
| 必須準備／cleanup失敗を注入する | 理由と再起動案内が出て中断し、遅延成功やRetry入力でも再開しない |
| WindowsビルドをUnityなしで起動する | 段階1の経路を操作でき、Commitと既知の未実装を記録できる |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

上表のEditor操作確認、必要な接続回帰、Windows64の短い確認。Unity 6000.3.16f1、使用Commit、設定、ログ、実／Fake境界をPRへ記録する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
