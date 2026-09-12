---
title: MusicChart occurrence・受付期間・発火通知
description: 同じ曲の次loopを別の発生回として識別し、AttackEvent予告・Charge受付・発火・Entry時刻とNormal生成用の情報を一度ずつ配送します。
pageType: task
taskId: PB-TASK-0031
category: プロトタイプ
order: 60
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/bgm/bgm-music-chart
  - /spec/bgm/bgm-attack-event
  - /spec/bgm/bgm-gameplay-connection
  - /spec/bgm/bgm-make-syaonndama
---

# PB-TASK-0031｜MusicChart occurrence・受付期間・発火通知

## 目的と実現する動作

同じ曲の次loopを別の発生回として識別し、AttackEvent予告・Charge受付・発火・Entry時刻とNormal生成用の情報を一度ずつ配送します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C04・C08・C19、Q04のoccurrence側。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠2（BGM／MusicChart Runtime）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 参照 | [Assets/Scripts/MusicChart/AttackEvent.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/AttackEvent.cs) | stableId、fireTick、Entryのexact MIDI NoteとentryTicks |
| 参照 | [Assets/Scripts/MusicChart/AttackEventTimingResolver.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/AttackEventTimingResolver.cs) | 静的Timing解決を再利用 |
| 参照 | [Assets/Scripts/MusicChart/NoteEvent.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/NoteEvent.cs) | 保存定義とRuntime発生回を区別 |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Music/` | occurrence索引と時刻境界の配送 |

## 実装範囲

- Battle・Chart・定義・loopからAttackEvent occurrenceとsource Note occurrenceを識別する。Noteの保存形式へIDがない点は、採用Chartを準備時に固定し、その定義内の安定した索引等を明示して扱う。表示コードや物理検索順を代用しない。
- 保存定義の論理順とTiming Resolverを使い、Preview・Charge期間・発火・Entryと小節境界を公開する。同小節のMode適用前に発火snapshotを取る構造にしない。段階1では中立のMode値で接続する。
- 更新間隔が広がり複数境界を越えても、通過した対象を定義順に配送する。Pause／Resumeやloopで同occurrenceを二度処理せず、次loopは新しい発生回として扱う。
- 供給に必要な先読み情報を準備中にも参照できるようにする。いつ何個生成するか・最低保証の計算は供給側に残す。

今回の範囲外：音楽データ制作、Editor機能改修、未採用Random Sectionの抽選、Allocationと発射結果の独自判定。

## 依存と受け渡し

0018の[引渡し版・公開状況](/tasks/prototype/pb-task-0018#handoff)と、[固定Note参照・明示順序Binding](/spec/bgm/bgm-music-chart#common-note-binding)を受け取ります。索引は同一性で、Gameplayの優先順には使いません。本タスクが本番Current／Weak検索とoccurrence配送を実装し、任意の順序読取失敗と必須採用時の準備失敗を区別します。

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0030](/tasks/prototype/pb-task-0030)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| 音楽 → Charge／Allocation・攻撃解決 | Current候補、受付期間、occurrence、Slot／Entry定義、発火境界 |
| 音楽 → 供給 | source Note occurrence、音楽位置と先読み対象。exact NoteをPitch Classへ縮めない |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 同じ発火通知を2回配送する | 同occurrenceは一回分として扱える識別を渡す |
| 1更新で複数Eventを越え、さらに次loopへ進む | 通過Eventが欠落せず、次loopは別occurrenceになる |
| Pauseの境界で停止・再開する | 未処理境界を一度だけ配送し、既処理分を再発火しない |
| Battle終了後に予約通知を実行する | 受付側へGameplay通知を出さない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

固定Chartで境界・loop・同Tickの順序・遅い更新を検査する自動試験。PB-TASK-0030の時計とPlayMode接続。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
