---
title: BGM再生・3時計・pre-roll・Pause同期
description: 保存済みMusicChartとAudioClipをRuntimeで使い、共通開始から無音のpre-roll、曲頭再生、Pause／Resumeまで同じ音楽位置で進めます。
pageType: task
taskId: PB-TASK-0030
category: プロトタイプ
order: 50
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/bgm/bgm-gameplay-connection
  - /spec/bgm/bgm-music-chart
---

# PB-TASK-0030｜BGM再生・3時計・pre-roll・Pause同期

## 目的と実現する動作

保存済みMusicChartとAudioClipをRuntimeで使い、共通開始から無音のpre-roll、曲頭再生、Pause／Resumeまで同じ音楽位置で進めます。


## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C01〜C03・C08・C19、Q02・Q07の時計／設定側。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠2（BGM／MusicChart Runtime）の実装担当。担当者未定。枠番号は担当範囲であり、個人への割当ではない。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。
- 正式着手gate：PB-TASK-0018の共通契約・Fake・assembly／テスト構成がレビュー済みCommitとして引き渡された後に開始する。gate前は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を実装しない。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 参照・必要箇所のみ変更 | [Assets/Scripts/MusicChart/MusicChart.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/MusicChart.cs) | 保存済みAudioClip・pre-roll・TempoMapを再利用 |
| 参照 | [Assets/Scripts/MusicChart/TempoMap.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/TempoMap.cs) | PPQNと可変TempoによるTick／秒変換 |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Music/` | Runtime時計、Audio同期、必要なSync Settings参照 |

## 実装範囲

- Battle／Gameplay／MusicChartの3時計を音楽側で管理し、Gameの共通開始通知で進める。Player内部のGameplayTimeを音楽時計へ流用しない。準備中は3時計とAudioを停止する。
- 保存pre-rollの終了でAudioを音源位置0から開始する。曲へ無音を足さず、MIDI由来Tickを書き換えない。pre-roll中は開始済みの入力・Preview・ChargeをAudio未再生という理由で閉じない。
- Pauseで時計とAudio位置を保持し、Resumeで対応関係を保つ。必要な同期補正を明示設定から読み、準備時に有効性を確認する。未設定を無言で0へ置き換えない。
- loop境界と終了位置を読取として公開し、終了でGameplay出力と予約callbackを閉じる。後続のPlayer局所減速が音楽時計へ影響しない境界を維持する。

今回の範囲外：Workbench／MIDI Import／Audio Previewの再実装、Runtimeランダム抽選、最終Mix、Mode／Conductの効果実装。

## 依存と受け渡し

先行タスク：[PB-TASK-0018](/tasks/prototype/pb-task-0018)

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Game → 音楽 | Battle IDとPrepare／開始／Pause／Resume／終了 |
| 音楽 → PB-TASK-0031・0035・各枠 | loopを識別できる音楽位置、絶対Tick、秒、現在phase。PPQNはChartの値 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 最後のReadyを保留して出現演出だけ進める | 3時計・Audioは動かない |
| pre-roll途中でPauseし、その後Resumeする | 残時間を保持し、残りを進めてからAudioが一度だけ曲頭で始まる |
| 可変Tempoの曲でPause／Resumeとloopを行う | AudioとChart位置の対応を追跡でき、時計を別々に巻き戻さない |
| 終了後にResumeと旧Audio callbackを送る | Gameplay時計とEvent出力を再開しない |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

Tick／秒とpre-rollの境界試験、PlayModeでのAudio位置記録と聴感確認。同期誤差は実測値と使用設定を記録する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
