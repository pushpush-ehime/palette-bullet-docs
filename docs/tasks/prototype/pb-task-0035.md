---
title: Normal先行生成・Wildcard不足補充・Supply Ready
description: Noteに基づくNormalの先行生成と、選択可能な個体の不足補充を分けて動かし、実際に使える数で準備完了を判断します。
pageType: task
taskId: PB-TASK-0035
category: プロトタイプ
order: 100
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/bgm/bgm-make-syaonndama
  - /spec/bgm/bgm-music-chart
  - /spec/shaondama-music/wildcard-orb
---

# PB-TASK-0035｜Normal先行生成・Wildcard不足補充・Supply Ready

## 目的と実現する動作

Noteに基づくNormalの先行生成と、選択可能な個体の不足補充を分けて動かし、実際に使える数で準備完了を判断します。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C02・C04・C05・C19、Q07。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠3（Shaondama／RadioWhale供給）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 参照・必要箇所のみ変更 | [Assets/Scripts/MusicChart/ShaondamaSettings.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/ShaondamaSettings.cs) | 旧initialTargetCountの意味を無断で変えない |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Supply/` | 先読み、利用可能数・補充要求中数、Ready |
| 新規 | `Assets/PaletteBullet/Prototype/Settings/` | 最低保証と先行生成の明示設定 |

## 実装範囲

- MusicChartのsource Note occurrenceとMinimumLeadTimeから生成範囲を決める。準備前評価と実行中評価で同じNormalを再生成せず、次loopは別occurrenceとして扱う。
- 現在選択可能かつ非ReservedのNormal＋Wildcardだけを最低保証へ数える。不足分から有効な補充要求中数を引き、Wildcardを要求する。要求中数をReady達成数へ混ぜない。
- 旧initialTargetCountを最低保証数へ無確認で転用しない。段階1用の明示設定を追加し、保存場所とRuntime読取を一つにする。仮値は採用設定として見える形で指定する。
- 初期出現の移譲完了と必要数成立でSupply Readyを出す。全体開始直前の不足では解除する。開始後の不足は補充だけ行い、Battleと3時計を止めない。

今回の範囲外：Excel連携や全データMigration、新たなRuntime抽選、Parry実装、楽曲の制作範囲の拡張。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)、[PB-TASK-0031](/tasks/prototype/pb-task-0031)、[PB-TASK-0033](/tasks/prototype/pb-task-0033)、[PB-TASK-0034](/tasks/prototype/pb-task-0034)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| 音楽 → 供給 → RadioWhale | 準備時にも参照できる先読み情報、Normal／補充Wildcard生成要求 |
| Shaondama／RadioWhale → 供給 → Game | 状態変化と要求完了／取消→Supply Ready／解除／失敗 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 最低数3、選択可能1、補充要求中1で評価する | 新しく1個だけ補充要求し、まだReadyにしない。数値は試験用設定 |
| 3個目の移譲直後に1個をReservedにする | 開始前ならReadyを解除し、開始後なら時計を止めず補充する |
| 同一sourceを準備前と開始後で再評価する | Normalを重複生成しない |
| RadioWhale参照を欠けさせる | 別経路でNormalを生成してReadyにせず、準備失敗を返す |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

数え方・再送・loop・設定欠損のEditMode試験と、実出現を使うPlayMode Ready確認。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
