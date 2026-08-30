---
title: "MusicChart Workbench Runtime Monitor"
description: Play Mode中のMusicChart時計、Audio同期、AttackEvent occurrence、シャオンダマ先行生成状況をRuntime確定値から読み取り専用でLive表示する
pageType: task
taskId: PB-TASK-0016
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/music-chart-workbench
  - /spec/common-technology/gameplay-runtime-trace
  - /spec/bgm/bgm-music-chart
  - /spec/bgm/bgm-attack-event
  - /spec/bgm/bgm-gameplay-connection
  - /spec/bgm/bgm-make-syaonndama
  - /spec/bgm/bgm-random-section
  - /spec/draw-system/charge-allocation
---

# PB-TASK-0016｜MusicChart Workbench Runtime Monitor

## タスクの目的

MusicChart Workbench完成版の監視機能として、Play Mode中のMusicChart関連Runtime状態をLive表示します。

> **MusicChart時計とAudioが同期しているか、現在どのAttackEvent occurrenceを処理しているか、シャオンダマ供給が先行生成条件を満たしているかを、Runtime本体が確定した値から確認できる読み取り専用Monitor**

を完成させます。

Runtime MonitorはGameplayを操作する機能でも、Gameplay Runtime Traceを再実装する機能でもありません。

## 完成時にできるようになること

- 現在の小節／拍／TickをLive確認できる
- MusicChart時計と実際のAudio再生位置を区別して確認できる
- system pre-rollを考慮した期待Audio位置と同期差を確認できる
- Current AttackEventのDefinitionと今回のRuntime occurrenceを区別できる
- Preview中／Charge受付中／Fire済み等のRuntime確定状態を確認できる
- Tempo変更をまたいでもFireまでの残り時間を確認できる
- 現在のLoop occurrenceを確認できる
- Runtimeで実際に選択されたRandom Candidateを確認できる
- シャオンダマ先行生成の必要LeadTime、現在LeadTime、生成済み位置、次の未生成Note、Ready／Shortageを確認できる
- Monitorを開いていない場合と同じGameplay結果を維持できる
- Gameplay Runtime Traceが未導入でもRuntime Monitor単体を利用できる

## 関連する仕様

<PageRelations />

Runtime Monitorの必須表示、読み取り専用方針、Gameplay Runtime Traceとの責務境界は[MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench)を正本とします。

表示するRuntime値の意味は以下を正本としてください。

- [BGM MusicChart仕様](/spec/bgm/bgm-music-chart)
- [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)
- [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)
- [BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama)
- [BGM Random Section仕様](/spec/bgm/bgm-random-section)
- [Charge Allocation仕様](/spec/draw-system/charge-allocation)

複数System横断の永続的な時系列Evidence、Correlation追跡、Session保存、Exportは[Gameplay Runtime Trace仕様](/spec/common-technology/gameplay-runtime-trace)の責務です。

## 実施内容

### 1. Play ModeのRuntimeへ読み取り専用で接続する

Workbench上にRuntime Monitorを用意し、現在実行中のBattleとMusicChartを識別してLive表示できるようにします。

少なくとも以下の接続状態を区別します。

- Play Mode外
- Play Mode中だが対象Battle／MusicChartなし
- Battle準備中
- system pre-roll中
- BGM Audio再生中
- Battle終了済み
- Runtime接続切断／参照不能

Runtime Monitorと各Runtime Systemを接続するAPIの具体形は現在の実装構成に合わせて構いません。ただし、Monitor専用にGameplay状態を複製して別正本を作らず、Runtime本体の確定状態を読み取るAdapterまたは等価な境界を使用します。

### 2. MusicChart時計とAudio同期を表示する

同じ画面で少なくとも以下を表示します。

- 現在の小節
- 現在の拍
- 必要に応じて現在Tick
- MusicChart時計
- 実際のAudio再生位置
- system pre-rollを適用した期待Audio再生位置
- 実際のAudio再生位置と期待位置の同期差

同期差は概念上、次の関係で表示します。

```text
実際のAudio再生位置
-
system pre-rollを考慮した期待Audio再生位置
=
同期差
```

符号は正本仕様の推奨どおり、正をAudio先行、負をAudio遅延として扱います。

system pre-roll中は、Audioが未再生で音源位置0にあることを正常な状態として表示し、MusicChart時計とAudio位置を同じ値として比較しません。

同期差の数値表示は必須です。Warning閾値の最終値は未決のため、実装内の固定値を確定仕様として扱わず、閾値を設ける場合は調整可能な設定または明示的な暫定値として管理します。

### 3. Current AttackEventとTiming状態を表示する

Runtime本体が現在処理対象として確定したAttackEventについて、少なくとも以下を表示します。

- AttackEvent DefinitionのStable IDとDisplay Code
- MusicChart上のDefinition順
- 今回のRuntime occurrence
- Fire Music Position
- Preview中か
- Charge受付中か
- Fire待ち／Fire済み／対象外等の状態
- Fireまでの残り時間

Stable IDとDisplay Codeは、PB-TASK-0013で実装する正本Identifier Contractを使用します。Runtime Monitor用の別Identifierを作りません。

Current AttackEvent、Preview、Charge受付、Fire状態はRuntime本体の確定値を表示し、Workbench側でMusicChart定義と現在時刻から独自に成立判定しません。

Fireまでの残り時間は正式なMusicChart時計とTempoMapを用い、Tempo変更をまたぐ場合も正しく算出します。Fire済み、Current未確定、対象外等の場合は誤解を招く数値を表示せず、該当状態を表示します。

### 4. Loop occurrenceとRandom Candidateを表示する

少なくとも以下を区別して表示します。

- 現在のLoop番号
- AttackEvent Definition
- 今回のRuntime occurrence

Random Section内では、Runtime抽選で実際に選択されたCandidateを表示します。Workbench側でRandom抽選を再実行したり、同じSeedから結果を再計算して表示値を作ったりしません。

Random Section／CandidateのStable IDとDisplay CodeはPB-TASK-0015で実装する正本Identifier Contractを使用します。Random Candidateは通常AttackEventと同じ`ATK-xxx`系列、Random Sectionは`RSEC-xxx`系列として表示します。

### 5. シャオンダマ先行生成状況を表示する

単なる生成済み個数ではなく、先行生成が間に合っているか判断できるRuntime確定情報を表示します。

少なくとも以下を扱います。

- 必要なMinimumLeadTime
- 現在確保できているLeadTime
- どの音楽位置まで生成済みか
- 次の未生成NoteEvent
- 未処理NoteEvent数
- Ready／Shortage
- Shortage時の不足時間

次の未生成NoteEventについてRuntime本体が情報を持つ場合は、Music Position、Track、exact MIDI Note等の調査に必要な識別情報も表示します。

Ready／ShortageはSpawn／Supply Runtimeの正式状態または正式な判定結果を読み取ります。Workbench側で別の供給判定を実装しません。

### 6. 読み取り専用を保証する

Runtime Monitorの通常操作から、以下を変更できないようにします。

- Battle進行
- MusicChart時計
- Audio再生位置
- Current AttackEvent
- Preview／Charge／Fire状態
- Loop occurrence
- Random抽選結果
- シャオンダマ生成／供給状態
- Gameplay Parameter

Debug Seek、再生制御、状態変更等を将来追加する場合も、本タスクの通常Monitorとは別機能・別操作として明確に分離します。

Monitorの開閉、選択、更新頻度、表示Filter等によってGameplayの処理順や結果が変わらないようにしてください。

### 7. Gameplay Runtime Traceと責務を分離する

Runtime MonitorはGameplay Runtime Traceへ依存せず、各Runtime本体の確定状態から現在値をLive表示できるようにします。

本タスクでは以下を再実装しません。

- Trace Sessionの開始／終了
- 全EventのTimeline記録
- Event／Entity／Correlation ID基盤
- Snapshot保存
- 過去Session閲覧
- JSON／JSONL／Trace Bundle Export
- Input、Player State、Projectile、Damage等の横断追跡

Gameplay Runtime Traceが利用可能な場合に共通Identifier等を表示へ利用することは構いませんが、Trace Recordingの有無をRuntime Monitorの必須動作条件にしません。

## 対象範囲

- MusicChart WorkbenchのRuntime Monitor画面
- Play Mode／Battle／MusicChart接続状態表示
- 小節／拍／Tick
- MusicChart時計
- 実Audio位置／期待Audio位置／同期差
- system pre-roll状態
- Current AttackEvent Definition／Runtime occurrence
- Preview／Charge／Fire状態
- Fireまでの残り時間
- Loop occurrence
- Runtime選択済みRandom Candidate
- シャオンダマ先行生成状況
- Ready／Shortageと不足時間
- 読み取り専用接続
- Monitor開閉によるGameplay非干渉

## 対象外

- Gameplay Runtime Traceの記録／保存／Export再実装
- Input／Player State／Projectile／Damage等の横断Timeline
- Replay
- Runtime抽選シミュレーション
- Workbench側でのCurrent AttackEvent再判定
- Workbench側でのShaondama Supply再判定
- Battle進行の操作
- Runtime MonitorからのSeek／Pause／強制Fire
- Runtime値の編集
- Gameplay ParameterのHot Reload
- 同期差Warning閾値の最終調整値確定

## 完了条件

- [ ] Play Mode中の対象Battle／MusicChartへ接続できる
- [ ] Play Mode外、準備中、pre-roll中、再生中、終了済み等を区別できる
- [ ] 現在の小節／拍／Tickを確認できる
- [ ] MusicChart時計と実際のAudio再生位置を別々に確認できる
- [ ] system pre-rollを考慮した期待Audio位置と同期差を確認できる
- [ ] pre-roll中のAudio未再生を異常な同期差として扱わない
- [ ] Current AttackEvent DefinitionのStable ID／Display CodeとRuntime occurrenceを区別できる
- [ ] Preview／Charge受付／Fire状態をRuntime確定値から確認できる
- [ ] Tempo変更をまたぐFireまでの残り時間を確認できる
- [ ] 現在のLoop occurrenceを確認できる
- [ ] Runtimeで選択されたRandom Candidateを確認できる
- [ ] シャオンダマの必要LeadTime／現在LeadTimeを確認できる
- [ ] 生成済み位置／次の未生成Note／未処理件数を確認できる
- [ ] Ready／Shortageと不足時間をRuntime確定値から確認できる
- [ ] MonitorからGameplay状態を変更できない
- [ ] Monitor開閉でGameplay結果が変わらない
- [ ] Gameplay Runtime TraceがなくてもMonitorを利用できる
- [ ] Trace Session／Correlation／Exportを本タスクで再実装していない

## 確認手順

1. Workbenchで対象MusicChartを開き、Play Mode外では未接続状態が明示されることを確認します。
2. Battleを開始し、準備中からsystem pre-roll、Audio再生中への状態変化を確認します。
3. pre-roll中にMusicChart時計が進み、Audioが音源位置0で未再生と表示され、同期差が誤警告にならないことを確認します。
4. Audio開始後、小節／拍／Tick、MusicChart時計、実Audio位置、期待Audio位置、同期差を確認します。
5. Tempo変更をまたぐAttackEventを用意し、Fireまでの残り時間が正式なMusicChart時間変換と一致することを確認します。
6. Preview、Charge受付、Fireを発生させ、Runtime本体の確定状態とMonitor表示が一致することを確認します。
7. BGMをLoopさせ、同じAttackEvent DefinitionでもLoop occurrenceが別として表示されることを確認します。
8. Random Sectionを含むMusicChartで、Runtimeが選択したCandidateだけが今回のoccurrenceとして表示されることを確認します。
9. シャオンダマ供給が十分な状態で、必要LeadTime、現在LeadTime、生成済み位置、次の未生成Note、Readyが一致することを確認します。
10. 意図的に供給を遅らせ、Shortageと不足時間がSpawn／Supply Runtimeの確定結果と一致することを確認します。
11. 同じ入力と固定条件でMonitorを閉じた実行と開いた実行を比較し、Gameplay結果、AttackEvent、抽選結果、供給結果が変わらないことを確認します。
12. Gameplay Runtime Traceを無効または未導入の状態でもRuntime Monitorが動作することを確認します。
13. Monitorから時計、Audio位置、AttackEvent、生成状態等を変更できないことを確認します。

## 前提・依存タスク

### 前提

- [PB-TASK-0012｜MusicChart Workbench 基本画面・Timeline・MIDI・Tempo／拍子・Track／Note・Audio Preview](/tasks/project-foundation/pb-task-0012)
- [PB-TASK-0013｜MusicChart Workbench AttackEvent編集・Timing表示・Validation](/tasks/project-foundation/pb-task-0013)
- [PB-TASK-0015｜MusicChart Workbench Random Section静的編集・Validation](/tasks/project-foundation/pb-task-0015)

PB-TASK-0014のMIDI再Import・DiffはWorkbench完成版の前提ですが、Runtime MonitorのLive接続自体と強い実装依存はありません。

Gameplay側にはMusicChart時計、Audio、AttackEvent Runtime、Charge Allocation、Random Section Runtime、Shaondama Spawn／Supplyの正式状態が必要です。既存Runtimeから読み取れない項目がある場合は、Gameplay規則をWorkbenchへ複製せず、当該Runtimeが所有する読み取り専用状態または通知を最小限公開します。

```text
PB-TASK-0012
Workbench基盤
        ↓
PB-TASK-0013
AttackEvent編集・Identifier Contract
        ↓
PB-TASK-0015
Random Section編集・Identifier Contract
        ↓
PB-TASK-0016
Runtime Monitor
```

## 実装時の注意点

- Runtime MonitorはRuntime本体の確定状態を表示し、Gameplay規則を独自に再判定しないでください。
- Monitor用Snapshotを持つ場合も一時的な表示転送値とし、Gameplayの正本にしないでください。
- MusicChart時計、system pre-roll、Audio位置を混同しないでください。
- Fireまでの残り時間はAudio位置だけから算出しないでください。
- Random CandidateをWorkbench側で再抽選しないでください。
- Shaondama供給のReady／ShortageをWorkbench側で再判定しないでください。
- IdentifierはPB-TASK-0013／0015で実装するStable ID／Display Code契約を使用し、Runtime Monitor専用方式を作らないでください。
- Runtime occurrenceはDefinitionのStable IDとLoop occurrenceを対応付け、Display Codeだけを機械参照Keyにしないでください。
- Gameplay Runtime TraceのSession／Timeline／Export機能を重複実装しないでください。
- UI Toolkit／IMGUI、同一WindowのTab／別Window等は実装担当判断で構いません。
- 更新負荷がGameplay Timingへ影響しないよう、表示更新頻度やデータ転送量を調整してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、Runtime接続境界、表示項目、同期差計算、AttackEvent occurrence、シャオンダマ供給表示、読み取り専用／非干渉確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
