---
title: 発射事実と音程音・AttackEvent予告の最小接続
description: 実際に発射した弾の音程音と、次のAttackEventの予告を確認できるようにし、BGMへGameplayの音を重ねます。
pageType: task
taskId: PB-TASK-0032
category: プロトタイプ
order: 70
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/bgm/bgm-gameplay-connection
  - /spec/bgm/bgm-attack-judgement
  - /spec/ui/
---

# PB-TASK-0032｜発射事実と音程音・AttackEvent予告の最小接続

## 目的と実現する動作

実際に発射した弾の音程音と、次のAttackEventの予告を確認できるようにし、BGMへGameplayの音を重ねます。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C08・C10・C16。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠2（BGM／MusicChart Runtime）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Music/` | 発射事実の発音と停止処理 |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/UI/` | AttackEventの予告・残時間・必要音の最小表示 |
| 新規 | `Assets/PaletteBullet/Prototype/Settings/` | 確認用音色と必要な音量設定 |

## 実装範囲

- 攻撃解決が確定した発射事実を受け、Slotに対応するexact MIDI Noteで発音する。通常攻撃はSlotのNote、WeakはAllocationで確定したNoteを使う。
- Chordの同時発音とArpeggioのEntryごとの発音を区別する。空SlotやZero Chargeから弾の音程音を捏造しない。音の再生結果からDamageや成功判定を逆算しない。
- PB-TASK-0031の通知と読取値から、次の攻撃・必要音・受付／発火までの残時間を最小表示する。表示側に別のCurrentや音楽時計を持たせない。
- 仮の音色・表示で接続を確認し、未決の楽器・Mixを完成仕様として埋めない。Pause・終了・旧Battle通知で未発生音が後から鳴らないようにする。

今回の範囲外：PB-TASK-0019の作曲・MIDI制作、最終UI、Mode音響効果・Repeat、Zero Chargeの完成演出。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0030](/tasks/prototype/pb-task-0030)、[PB-TASK-0031](/tasks/prototype/pb-task-0031)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| PB-TASK-0042 → Audio | Battle ID、occurrence／Entry、発射事実ID、確定exact Noteと音楽時刻 |
| PB-TASK-0031・0039 → 表示 | Preview時刻、必要Slot、割当済み状態の読取値。実接続はPB-TASK-0045 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| C4とC5の確定発射事実を送る | Pitch Classが同じでも異なるoctaveで発音する |
| IncompleteとZero Chargeを送る | 実在する発射分だけ鳴り、空Slotを補って鳴らさない |
| 同じ発射事実を再送し、終了後にも送る | 重複発音も終了後の新規発音も起きない |
| pre-rollでPreviewを表示してPauseする | 曲が未再生でも予告があり、Pause中は残時間が進まない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

Fake発射事実で発音数・Note・停止を検査し、PlayModeで音と予告を確認する。最終音質の受入とは区別する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
