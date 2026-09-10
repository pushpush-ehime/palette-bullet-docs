---
title: Result操作・RetryによるBattle再生成
description: 正常終了したBattleから一度だけ次の操作を受け付け、Retryでは前回の予約・生成物・通知を引き継がず新Battleを準備します。PB-TASK-0018から再試行側を分割します。
pageType: task
taskId: PB-TASK-0028
category: プロトタイプ
order: 30
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

# PB-TASK-0028｜Result操作・RetryによるBattle再生成

## 目的と実現する動作

正常終了したBattleから一度だけ次の操作を受け付け、Retryでは前回の予約・生成物・通知を引き継がず新Battleを準備します。PB-TASK-0018から再試行側を分割します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C01・C17・C18。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠1（Battle／共通接続）の実装担当。担当決定済み。個人の割当は非公開のチーム管理で扱う。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Battle/` | Result操作受付とBattle再構築 |
| 共有 | `Assets/PaletteBullet/Prototype/Scenes/PrototypeBattle.unity` | 正常Resultからの操作と旧通知注入 |

## 実装範囲

- Result variantに対応するContinue／Retryを解禁後に一度だけ受け付ける。ClearのContinueはプロトタイプの検証用終了状態へ進める。Game OverのRetryは新しいBattle IDで全Ownerを準備し直す。
- 旧Ownerの購読・待機callback・予約・作用ID管理を閉じてから新Ownerの準備へ移る。既存objectのIDだけ付け替えて旧状態を再利用しない。
- D03中断中はResult Retryを受け付けず再起動案内を維持する。通常Game OverからのRetryはアプリ再起動を要求しない。

今回の範囲外：Room移動・セーブ・拠点遷移、障害からの自動復旧、アプリの自動再起動。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0027](/tasks/prototype/pb-task-0027)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| UI → Game | 対象BattleとResult操作要求 |
| Game → 各枠 | 旧Battleの終了境界、新Battle IDと初期設定。各Ownerは自身の状態を再生成 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 正常Game Overの解禁後にRetryを連打する | 新Battleが一つだけ準備される |
| Retry後に旧Ready・発火・cleanup通知を送る | 新Battleの状態・弾数・解禁状態が変わらない |
| 3回続けて正常Retryする | 購読・個体・予約が回数に応じて増殖せず、毎回新IDになる |
| D03中断画面からRetryを要求する | 新Battleを作らず、再起動案内を表示し続ける |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

Fake Ownerの生成／解放数を検査するPlayMode試験。実Ownerへの置換後はPB-TASK-0045で再確認する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
