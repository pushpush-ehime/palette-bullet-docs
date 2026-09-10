---
title: Current AttackEvent・Slot Allocation・Reserved関係
description: Charge判定時のCurrent occurrenceへ選択した個体を割り当て、全体成立時にだけSlotとReserved関係を確定します。
pageType: task
taskId: PB-TASK-0039
category: プロトタイプ
order: 150
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/draw-system/charge-allocation
  - /spec/bgm/bgm-attack-event
  - /spec/shaondama-music/orb-data
  - /spec/shaondama-music/wildcard-orb
---

# PB-TASK-0039｜Current AttackEvent・Slot Allocation・Reserved関係

## 目的と実現する動作

Charge判定時のCurrent occurrenceへ選択した個体を割り当て、全体成立時にだけSlotとReserved関係を確定します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C07・C08・C17、Q04・Q05の予約側。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠5（Charge／Allocation）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Allocation/` | Current、Slot、通常／Weak割当と読取状態 |
| 参照 | [Assets/Scripts/MusicChart/AttackEvent.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/AttackEvent.cs) | 必要Slot・音楽順の保存定義 |
| 参照 | [Assets/Scripts/MusicChart/NoteEvent.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/NoteEvent.cs) | Weakのsource occurrence・exact Note |

## 実装範囲

- 受付中のCurrent Normal AttackEventを論理順で選び、不適合な音を後続Eventへ飛ばさない。Slotは同音を含む個数付き集合として扱い、Pitch Classで照合してもexact Noteの発音情報を残す。
- Clickの一個体割当とDragの全体判定を公開する。DragはRelease時のCurrent一つへ照合し、余分・不足・不適合があればSlotも個体も変更しない。全条件成立後に一度だけcommitする。
- 通常Currentがない経路では正本のWeak割当を行う。Normalは自身のsource occurrenceを維持し、Wildcardは正本の次Note検索・同時刻tie-breakで実効値を確定する。表示順や後から変わるNoteへ付け替えない。
- 予約成立の正本と読取snapshotを持つ。commit済みのConsumed／Releasedは攻撃解決が確定し、本タスクはその通知に従って関係を解消する。未commitの選択はCharge側が捨てる。

今回の範囲外：InputとActionの進行、攻撃結果のComplete判定、Bullet生成、commit済み予約の独自解放、Mode／Conduct効果実装。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0031](/tasks/prototype/pb-task-0031)、[PB-TASK-0033](/tasks/prototype/pb-task-0033)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Charge → Allocation | 現在Battle、判定時刻、Click／Drag、選択個体とPress時snapshot |
| Allocation → Shaondama／攻撃解決／表示 | 成否と理由、occurrence・Slot・個体の予約関係、確定exact Note／RGB。発射は要求しない |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| Currentに合わず後続に合う音をClickする | 後続へ飛ばして割り当てない |
| 必要音C・C・EにC・Eだけ、またはC・C・E・GをDragする | どちらも全体不成立でSlotとReserved数が変わらない |
| C・C・Eを異なる選択順で渡し成功通知を再送する | 一度だけ同じ必要数を予約する |
| 通常CurrentなしでNormalとWildcardをそれぞれ割り当てる | 正本のWeak source／次Note規則で確定し、loop後も同じ発生回を保持する |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

固定ChartとFake個体による割当の自動試験。特に同音Slot・全体commit・受付締切・Weak loopを検査し、実個体予約とPlayMode接続する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
