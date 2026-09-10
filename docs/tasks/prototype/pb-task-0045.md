---
title: 段階1統合確認：通常ChargeからEnemy浄化まで
description: 各枠の実装を共有Sceneへ接続し、通常ChargeからEnemy浄化までを実物同士で確認します。Result・RetryやWindows確認と分けて段階1を判定する統合タスクです。
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
---

# PB-TASK-0045｜段階1統合確認：通常ChargeからEnemy浄化まで

## 目的と実現する動作

各枠の実装を共有Sceneへ接続し、通常Chargeから発射、RGB Damage、Enemy浄化までを実物同士で確認します。Fake単体の成功と段階1合格を分け、終了・Result・RetryやWindows確認の完成を待たずに最初の接続結果を判定するタスクです。

準備・部分接続は一部の完了を待たず進められます。下の依存一覧は段階1の合格判定までに必要な実装です。PB-TASK-0027・0028の終了・Result・Retryは依存に含めません。枠1が統合を取りまとめ、機能の修正は各枠が担当します。

## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C01〜C12・C16〜C19の段階1対象。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠1（Battle／共通接続）の実装担当。担当決定済み。個人の割当は非公開のチーム管理で扱う。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 共有 | `Assets/PaletteBullet/Prototype/Scenes/PrototypeBattle.unity` | 各実Ownerと仮表示・採用設定を組み込む |
| 共有 | `Assets/PaletteBullet/Prototype/Prefabs/` | 実機能のPrefab参照とStage配置 |
| 共有 | `Assets/PaletteBullet/Prototype/Tests/` | PB-TASK-0018のtest asmdefを使う接続境界の回帰と検証用の失敗注入 |

## 実装範囲

- 枠1を統合窓口に、各枠のPrefab・設定・接続コードを順に組み込む。共通Sceneは枠1、Player共有アセットは枠4が取りまとめ、統合で見つかった不具合は該当機能の差分として修正する。
- 保存Chart、実RadioWhale／Shaondama、実Player／Camera／Marker、実Charge／Allocation、実AttackEvent／Bullet／Enemy／Stageを使う。仮素材・仮値は許可するが、本番経路をFakeで代用して合格にしない。
- Clickを先に通し、Drag・Chord／Arpeggio／Weak・Incomplete／Zeroの対象ケースを続けて確認する。最小予告・Charge状態・RGBで操作結果を追えるようにする。
- 実Enemyへの命中、RGB Damage、浄化成立とStageへの浄化通知までを確認する。Clear／Game Overの最終結果確定、Result、Retry、cleanup失敗、Windows確認はPB-TASK-0046へ分ける。
- 準備失敗、旧Battle通知、遅延通知の拒否は段階1の開始と通常攻撃経路に影響する範囲で確認する。終了途中の失敗注入はPB-TASK-0046で確認する。

今回の範囲外：Clear／Game Overの最終確定、Result、Retry、Battle終了集約、Windows Build確認、プロトタイプ全機能の完了宣言、Enemy攻撃／Player被弾・死亡の実接続、Parry／Wildcard変換、固定プリセットMode／Conduct、最終Windows配布受入。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0023](/tasks/prototype/pb-task-0023)、[PB-TASK-0029](/tasks/prototype/pb-task-0029)、[PB-TASK-0030](/tasks/prototype/pb-task-0030)、[PB-TASK-0031](/tasks/prototype/pb-task-0031)、[PB-TASK-0032](/tasks/prototype/pb-task-0032)、[PB-TASK-0033](/tasks/prototype/pb-task-0033)、[PB-TASK-0034](/tasks/prototype/pb-task-0034)、[PB-TASK-0035](/tasks/prototype/pb-task-0035)、[PB-TASK-0036](/tasks/prototype/pb-task-0036)、[PB-TASK-0037](/tasks/prototype/pb-task-0037)、[PB-TASK-0038](/tasks/prototype/pb-task-0038)、[PB-TASK-0039](/tasks/prototype/pb-task-0039)、[PB-TASK-0040](/tasks/prototype/pb-task-0040)、[PB-TASK-0041](/tasks/prototype/pb-task-0041)、[PB-TASK-0042](/tasks/prototype/pb-task-0042)、[PB-TASK-0043](/tasks/prototype/pb-task-0043)、[PB-TASK-0044](/tasks/prototype/pb-task-0044)

各先行タスクの公開型・Prefab・設定・接続手順を受け取って組み込みます。段階1の通常攻撃経路の途中をFakeで代用した確認は、このタスクの合格に数えません。段階1の結果は[PB-TASK-0046](/tasks/prototype/pb-task-0046)へ引き継ぎ、後続のLifecycle確認で上書きしません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| 各枠 → 統合窓口 | 採用PR／Commit、Prefab・設定参照、接続確認手順と既知の未接続 |
| 統合 → 操作確認窓口 | 段階1の実操作、期待結果、実結果、使用Commit、残る未接続 |
| 本タスク → PB-TASK-0046・0024 | 段階1結果を独立した記録として引き継ぎ、Lifecycleと後続の完成条件を追加 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 起動し、供給完了後に通常個体をChargeする | 開始順を守り、Charge成功で予約、音楽時刻で発射する |
| Markerを使いEnemyへ攻撃を重ねる | RGBが変化し、実Enemyが浄化され、Stageへ浄化事実が一度だけ渡る |
| 不成立DragとZero Chargeを試す | 部分予約や架空の弾・音を生成しない |
| 旧Battle IDまたは期限後のCharge通知を送る | 現在Battleの予約・発射・RGBを変更せず、拒否理由を追える |
| 必須準備失敗を注入する | 理由と再起動案内が出て開始せず、遅延Readyで再開しない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

上表のEditor操作確認と必要な接続回帰を行う。Unity 6000.3.16f1、使用Commit、設定、ログ、実／Fake境界、段階1の合否をPRへ記録する。Windows64の短い確認はPB-TASK-0046で行う。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
