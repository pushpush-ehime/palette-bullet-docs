---
title: "MusicChart Workbench 基本画面・Timeline・MIDI・Tempo／拍子・Track／Note・Audio Preview"
description: MusicChart Workbenchの基礎Editorを実装し、MIDI由来の音楽情報とBGM AudioClipを同一Timeline上で確認できるようにする
pageType: task
taskId: PB-TASK-0012
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/music-chart-workbench
  - /spec/bgm/bgm-music-chart
  - /spec/bgm/bgm-midi-settings
  - /spec/bgm/bgm-gameplay-connection
---

# PB-TASK-0012｜MusicChart Workbench 基本画面・Timeline・MIDI・Tempo／拍子・Track／Note・Audio Preview

## タスクの目的

MusicChart Workbenchの最初の実装として、MusicChartをUnity Editor上で開き、

> **MIDIから生成された音楽情報とBGM AudioClipの対応を、同じ音楽時間軸上で確認できる作業画面**

を作ります。

このタスクは後続のAttackEvent編集、MIDI再Import Diff、Random Section、Runtime Monitorが載るための共通Editor基盤も担当します。

## 完成時にできるようになること

- 対象MusicChartを選択してWorkbenchで開ける
- BGM AudioClipとMIDI Import元／Import状態を確認できる
- Tempo変更と拍子変更をTimeline上で確認できる
- MIDI TrackごとのNoteを音楽時間上で確認できる
- NoteのPitch／octave／Velocity／位置／長さを確認できる
- シャオンダマ生成に使用するTrackを確認・設定できる
- system pre-rollと曲本編位置0、BGM Audio開始位置の関係を確認できる
- Edit ModeでBGMを再生・停止・Seekできる
- BGMの現在位置をTimeline上で追える
- 後続機能が同じTimelineと選択UIを利用できる

## 関連する仕様

<PageRelations />

Workbenchの画面・操作方針は[MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench)を正本とします。

MusicChartデータそのものは以下を正本としてください。

- [BGM MusicChart仕様](/spec/bgm/bgm-music-chart)
- [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)
- [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)

Workbench側でTempoMapやNoteEventsの意味を独自に再定義しないでください。

## 実施内容

### 1. Workbenchの基本画面を作る

MusicChartを選択し、現在どのAssetを確認・編集しているか分かるEditor画面を作ります。

少なくとも以下を確認できるようにします。

- 対象MusicChart
- BGM AudioClip
- MIDI Import元
- MIDI Import済みか
- 未保存変更の有無

Validation状態等の詳細表示は後続タスクで拡張できる構造にしてください。

具体的なレイアウトやUI Toolkit／IMGUI等の選択は実装担当判断とします。

### 2. 共通の音楽Timelineを作る

横方向を音楽時間として扱うTimelineを用意します。

少なくとも以下を表示できるようにします。

- 小節
- 拍
- Tick
- system pre-roll
- 曲本編 Music Position 0
- BGM Audio開始位置
- Tempo変更
- 拍子変更
- NoteEvents
- Audio Previewの現在位置

`system pre-roll`、MusicChart時計、AudioClipの音源位置を同じ値として扱わないでください。

### 3. MIDI Import結果を確認できるようにする

MusicChartへImportされたMIDI由来データをWorkbenchから確認できるようにします。

対象は少なくとも、

- TempoMap
- 拍子
- Track
- NoteEvents

です。

初回ImportをWorkbenchから実行できるようにするか、既存Import機能を呼び出すかは現在の実装構成に合わせて構いません。

ただし、**MIDI再Import・Diff・影響候補確認はPB-TASK-0014で担当**し、本タスクでは扱いません。

### 4. Tempo／拍子をTimelineへ表示する

曲中のTempo変更・拍子変更を位置付きで確認できるようにします。

表示方法は自由ですが、

- どの位置から値が変わるか
- NoteやAudio Previewと同じ音楽時間上で比較できること

を満たしてください。

### 5. Track／Noteを表示する

MIDI TrackごとにNoteを確認できる表示を作ります。

各Noteについて少なくとも以下を確認できるようにします。

- exact MIDI Note
- octave
- Velocity
- Music Position
- Note Length
- Track

Track数が多い場合でも確認しやすいように、折り畳みや表示対象の絞り込み等を追加できる構造にします。

高度なMIDI編集機能は不要です。

### 6. シャオンダマ使用Trackを確認・設定できるようにする

MusicChartのShaondama Settingsが参照する「使用Track」を、Track表示と対応付けて確認・設定できるようにします。

Trackの意味やシャオンダマ生成規則そのものはWorkbenchで再定義しません。

### 7. BGM Audio Previewを実装する

Edit ModeでMusicChartのBGM AudioClipを確認できるようにします。

少なくとも以下を実装します。

- 再生
- 一時停止
- 停止
- Timeline位置へのSeek
- 現在再生位置のTimeline表示

Audio PreviewはMusicChart設定と音源の対応確認用です。

Battle RuntimeやGameplayをEdit Modeで完全再現する必要はありません。

## 対象範囲

- MusicChart Workbenchの基本Editor Window
- MusicChart／AudioClip／MIDI Import状態表示
- 共通音楽Timeline
- 小節／拍／Tick表示
- system pre-roll／曲本編位置0／Audio開始位置表示
- Tempo／拍子表示
- MIDI Track／Note表示
- Note詳細確認
- Shaondama使用Trackの確認・設定
- BGM Audio Preview
- 再生位置表示／Seek
- 後続Workbench機能を追加できる画面基盤

## 対象外

- AttackEventの本格編集
- Preview／Charge／Fire Timing編集・Validation
- MIDI再Import Diff
- 再Import影響候補確認
- Random Section編集
- Runtime Monitor
- Audio波形表示
- MIDI Note単体試聴
- DAW相当のMIDI編集
- Battle RuntimeのEdit Mode完全再現

これらは後続タスクまたは仕様上の対象外機能です。

## 完了条件

- [ ] MusicChartをWorkbenchで選択・表示できる
- [ ] AudioClipとMIDI Import元／Import状態を確認できる
- [ ] 小節／拍／Tickを持つTimelineを表示できる
- [ ] system pre-rollと曲本編位置0を区別して表示できる
- [ ] Tempo変更をTimeline上で確認できる
- [ ] 拍子変更をTimeline上で確認できる
- [ ] TrackごとにNoteを表示できる
- [ ] NoteのMIDI Note／octave／Velocity／位置／長さを確認できる
- [ ] シャオンダマ使用Trackを確認・設定できる
- [ ] BGMをEdit Modeで再生・一時停止・停止できる
- [ ] Timeline位置へSeekできる
- [ ] Audio再生位置をTimeline上で確認できる
- [ ] MIDI由来データをWorkbench側の別正本として二重保存していない
- [ ] Audio波形や高度なMIDI編集を不要に実装していない

## 確認手順

1. Tempo変更、拍子変更、複数Trackを含むMIDIを使用したMusicChartを開きます。
2. Tempo／拍子／Track／NoteがTimeline上の正しい位置へ表示されることを確認します。
3. 複数Noteを選択し、Pitch、octave、Velocity、位置、長さがMusicChartのImport結果と一致することを確認します。
4. シャオンダマ使用Trackを変更し、MusicChartの正式な手動設定へ反映されることを確認します。
5. system pre-rollと曲本編位置0、Audio開始位置が区別して確認できることを確認します。
6. BGMを再生し、Timeline上の現在位置が追従することを確認します。
7. Timeline上の別位置へSeekし、Audio Previewが対応する位置へ移動することを確認します。

## 前提・依存タスク

このタスクはMusicChart Workbench系の最初の基盤タスクです。

MusicChartの静的データ構造・MIDI Import機能について既存実装がある場合はそれを利用し、不足している場合は正本仕様に従ってWorkbenchで必要な最小接続を成立させてください。

```text
PB-TASK-0012
Workbench基本画面・Timeline・MIDI・Audio Preview
        ↓
PB-TASK-0013
AttackEvent編集・Timing表示・Validation
        ↓
PB-TASK-0014
MIDI再Import・Diff・影響候補確認
        ↓
PB-TASK-0015
Random Section静的編集・Validation
        ↓
PB-TASK-0016
Runtime Monitor
```

## 実装時の注意点

- MIDI由来データは元MIDI／MusicChart Import結果を正とし、Workbench専用データへ複製しないでください。
- Tempo、拍子、Track、NoteをWorkbench側で独自解釈しないでください。
- AudioClip位置とMusicChart時間、system pre-rollを混同しないでください。
- WorkbenchをDAWとして作り込まないでください。
- Audio波形表示は不要です。
- AttackEventやRandom Sectionを本タスクへ前倒しで作り込みすぎないでください。
- 後続タスクが同じTimeline・選択状態・詳細領域を再利用できる構造を優先してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、Workbench基本構成、Timelineの時間表現、MIDI表示、Audio Preview、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
