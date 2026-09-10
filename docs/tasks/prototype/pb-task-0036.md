---
title: 標準VS PlayerのBattle接続・共有Input／Prefab統合
description: 提供済みの移動・Jump・Dash・Animatorを使い、Gameの準備と開始、Pause、終了、RetryへPlayerを接続します。
pageType: task
taskId: PB-TASK-0036
category: プロトタイプ
order: 120
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/common-technology/action-state-manage
  - /spec/player/
  - /spec/game/
  - /spec/bgm/bgm-gameplay-connection
---

# PB-TASK-0036｜標準VS PlayerのBattle接続・共有Input／Prefab統合

## 目的と実現する動作

提供済みの移動・Jump・Dash・Animatorを使い、Gameの準備と開始、Pause、終了、RetryへPlayerを接続します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C01〜C03・C06・C16〜C18、Q01。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠4（Player／Camera／Aim／Marker）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 既存 | [Assets/PaletteBullet/Player/Runtime/PlayerBattleHost.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerBattleHost.cs) | Game発行IDとPrepare／開始の接続 |
| 既存 | [Assets/PaletteBullet/Player/Runtime/PlayerSession.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerSession.cs) | 既存Token・Tick・終了処理との整合 |
| 共有 | `Assets/PaletteBullet/Player/Prefabs/Player.prefab` | 枠4が変更を取りまとめる |
| 共有 | `Assets/PaletteBullet/Player/Input/Player.inputactions` | 物理キーではなくInput Actionを各機能へ渡す |
| 共有 | `Assets/PaletteBullet/Player/Graphs/Shared/Action.asset` | 保存VSのAction排他と接続 |

## 実装範囲

- 開発Sceneの自動BeginBattleと独自GUID発行を、本体のGame発行ID・準備／開始分離へ接続する。既存の単独開発確認も意図した入口から継続できるようにする。
- 準備中は本番入力と動作を開始せず、共通開始後に有効化する。既存の移動・Jump・Dash・Animatorを再実装せず保存VSを使う。Player内部の状態遷移をC#の別State Machineへ移さない。
- 各Actionへ現在Tokenと入力時刻を渡し、古いrunやBattleの通知を拒否する。Pauseと通常終了を既存の停止・cleanupへ接続する。局所ResultReadyはPlayerだけの完了応答とする。
- 枠5のChargeと枠4のAim／Markerが必要なInput・Prefab・共有グラフの変更をここで取りまとめる。機能専用グラフは各タスクで編集し、共有アセットを別々に上書きしない。

今回の範囲外：Charge・Parry・Damage／Deadの本番実装、旧Player Runtimeの再導入、全Player値のTuning移行、任意減速の実装。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Game → Player | Battle ID、Prepare／開始／Pause／終了。Retryでは新しいactor／generation |
| Player → Charge・Aim・Marker・Camera | Input Action、現在Token、確定状態・Target参照 |
| Player → Combat | Player局所のcleanup成功／失敗 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 実Playerだけ準備し他Readyを保留する | 移動・戦闘入力が先に始まらない |
| 共通開始後に移動・Jump・Dashを操作する | 提供済みの動作とAnimatorが動く |
| Pause・終了中にInputを送る | 不正にActionを開始しない |
| 旧Tokenで通知した後、新Battleを準備する | 旧actorへ作用せず新Playerが操作できる |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

変更した開始／終了／入力境界のPlayMode回帰と、保存グラフを再読込した操作確認。全基盤の再監査はこのタスクの目的にしない。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
