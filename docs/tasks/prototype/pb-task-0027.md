---
title: Battle結果確定・終了集約・最小Result UI
description: Clear／Game Overを一度だけ確定し、全必須機能の片付けが終わってからResultの操作を許可します。PB-TASK-0018から終了側を分割したタスクです。
pageType: task
taskId: PB-TASK-0027
category: プロトタイプ
order: 20
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

# PB-TASK-0027｜Battle結果確定・終了集約・最小Result UI

## 目的と実現する動作

Clear／Game Overを一度だけ確定し、全必須機能の片付けが終わってからResultの操作を許可します。PB-TASK-0018から終了側を分割したタスクです。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C12・C17・C18、D03。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠1（Battle／共通接続）の実装担当。担当決定済み。個人の割当は非公開のチーム管理で扱う。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Battle/` | 結果候補の集約、Combat終了集約、GameのResult解禁 |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/UI/` | 最小Resultと失敗表示 |
| 共有 | `Assets/PaletteBullet/Prototype/Scenes/PrototypeBattle.unity` | Fake終了応答と確認ボタンを接続 |

## 実装範囲

- StageのClear候補とPlayer側のGame Over候補を同frameで集め、両方ならClearを優先してGameが一度だけ確定する。HP0等の確定済み状態を結果選択で巻き戻さない。
- 確定時に新規Gameplay受付を閉じ、Result表示開始と操作解禁を分離する。Combatが必須Ownerの終了応答を集約し、GameだけがUIへ解禁を通知する。Player局所のResultReadyで全体を解禁しない。
- 一つのOwnerが失敗しても他Ownerへの停止・cleanup要求を続ける。D03の中断表示は全cleanupを待たずに出し、遅れた成功で解除しない。lock中の入力を後から実行しない。

今回の範囲外：EnemyやPlayerの実Damage、Retry再生成（PB-TASK-0028）、正式UI素材。PB-TASK-0022のResult設計は参照素材として利用し、同じ設計作業を発行しない。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。本タスクの終了・Result実装は、段階1を独立確認した[PB-TASK-0045](/tasks/prototype/pb-task-0045)の結果を受けて[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Stage／Combat → Game | Battle ID・frame・Clear／Game Over候補 |
| 各Owner → Combat → Game → UI | 終了完了／失敗、確定variantと操作lock。UIは勝敗を再判定しない |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 同frameのClearとGame Overを順序を逆にして送る | どちらの順でもClearが一度だけ確定する |
| 一つのcleanupを保留しResultを操作する | 結果は見えるが操作は拒否され、解禁後も過去入力を再生しない |
| cleanup失敗後に完了を再送する | 他Ownerは片付けを進めるがResultは解禁されず、理由と再起動案内が残る |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

結果優先・二重確定・失敗ラッチのEditMode試験と、Fake Owner／最小UIを用いるPlayMode確認。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
