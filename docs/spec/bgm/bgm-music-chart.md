---
title: "BGM MusicChart仕様"
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
  - /tasks/music-chart-scriptableobject/pb-task-0012
  - /tasks/music-chart-scriptableobject/pb-task-0013
  - /tasks/music-chart-scriptableobject/pb-task-0014
  - /tasks/music-chart-scriptableobject/pb-task-0015
  - /tasks/music-chart-scriptableobject/pb-task-0016
---

# BGM MusicChart仕様

## MusicChartとは
MIDIからゲームに必要な音楽情報を変換して保存するデータ。

ゲーム実行中はMIDIを直接解析せず、MusicChartを使用する。
## MusicChartが持つ情報
```text
MusicChart
├─ BGM
│  └─ AudioClip
│
├─ Music Data
│  ├─ TempoMap
│  └─ NoteEvents
│     ├─ 音程
│     ├─ Track
│     └─ 演奏位置
│
├─ Shaondama Settings
│  ├─ 使用するTrack
│  ├─ InitialTargetCount・・・最低何個保証するか
│  └─ MinimumLeadTime・・・最小先行時間
│
├─ Attack Events
│  ├─ 発生位置
│  ├─ 必要音
│  ├─ Type（Chord / Arpeggio）
│  ├─ アルペジオ順序
│  ├─ 予告時間
│  └─ Harmony
│     ├─ Root（例：C）
│     └─ Quality（例：Major）
│
├─ Random Sections
│  ├─ 開始位置
│  ├─ 終了位置
│  ├─ AttackEvent候補
│  └─ 選択数
│ 
└─ Sync Settings
   └─ 同期補正値
```
## 基本ルール

- **攻撃イベントなどが発生する場所は、「何小節目の何拍目か」で記録する。**
  - 例：16小節目の3拍目
  - より細かい位置が必要な場合はTickも使用する。

- **ゲーム実行時は、小節・拍・Tickの位置をTempoMapを使って秒数に変換する。**
  - 例：16小節目の3拍目 → BGM開始から20.384秒
  - Unityは、この秒数を使ってBGMとゲームイベントを同期する。

- **MIDIを再Importした場合は、MIDIから作られた音楽情報だけを更新する。**
  - TempoMap
  - NoteEvents
  - 音程
  - Track
  - 演奏位置

- **Unity上で手動設定したゲーム情報は、MIDIを再Importしても削除・上書きしない。**
  - Attack Events
  - Random Sections
  - Shaondama Settings
  - Sync Settings

- **Random Sectionsでは、その区間に登録されたAttackEvent候補から、実際に使用する攻撃をゲーム側が選択する。**

- **同期補正値は、BGMとUIや攻撃イベントのタイミングにズレがある場合に調整するために使用する。**
  - 通常は `0` とする。
