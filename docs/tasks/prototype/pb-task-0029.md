---
title: Stage登録・最小objective・浄化からClearへの接続
description: 検証用Enemyの生成予定と確定状態をStageで管理し、浄化が所定の完了条件へ届いたときだけClear候補を通知します。
pageType: task
taskId: PB-TASK-0029
category: プロトタイプ
order: 40
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/stage/
  - /spec/combat/
  - /spec/game/
  - /spec/enemy/damage-and-purify
---

# PB-TASK-0029｜Stage登録・最小objective・浄化からClearへの接続

## 目的と実現する動作

検証用Enemyの生成予定と確定状態をStageで管理し、浄化が所定の完了条件へ届いたときだけClear候補を通知します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C02・C12。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠1（Battle／共通接続）の実装担当。担当決定済み。個人の割当は非公開のチーム管理で扱う。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Stage/` | 初期登録、生成要求、objectiveと浄化通知受付 |
| 新規 | `Assets/PaletteBullet/Prototype/Settings/` | 一種類の対象Enemyで検証できる初期配置とobjective設定 |
| 共有 | `Assets/PaletteBullet/Prototype/Scenes/PrototypeBattle.unity` | Stageと生成先Prefabを接続 |

## 実装範囲

- 最小構成は明示登録した検証対象の浄化を追う。未生成・生成待ちの登録も残し、worldのEnemy数が0という理由だけでClearにしない。Stage内部がobjectiveと登録状態の正本を持つ。
- Enemyの準備／生成結果からEnemy Readyを判定してGameへ通知する。ShaondamaのReadyは数えない。浄化通知はBattle IDとEnemy IDで照合し、重複を一度にまとめる。
- Enemy RGB確定後にStageが評価し、CombatはClear候補を変えずGameへ転送する。終了後の生成・浄化通知は旧状態を復活させない。

今回の範囲外：複数waveの本編制作、Enemy AI、Stage GeometryとCamera Rig（PB-TASK-0023）。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Stage → Enemy生成先 | Battle ID、安定したEnemy ID、設定、Spawn位置 |
| Enemy → Stage → Combat → Game | 浄化済みの事実→objective評価後のClear候補。実EnemyはPB-TASK-0044 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 登録済みだが未生成のEnemyを残す | worldが空でもClearしない |
| 全登録対象をFake浄化し最後の通知を再送する | Clear候補が一度だけ出る |
| 生成失敗と終了後の生成完了を送る | 失敗をReady扱いせず、終了後の個体をGameplayへ公開しない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

登録状態とobjective評価のEditMode試験、Fake Enemy生成先でのPlayMode確認。実Enemyの登録・浄化通知はPB-TASK-0045、ClearからResultへの接続はPB-TASK-0046で確認する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
