---
title: "05. MIDI更新（再Import時）"
pageType: task
taskId: PB-TASK-0014
category: "BGM"
team: プログラム
---

# PB-TASK-0014｜05. MIDI更新（再Import時）

## 目的
作曲者がMIDIを更新したとき、既存のMusicChartへ最新の音楽情報を再反映できるようにする。

## 実装
既存のMusicChartに対してMIDIを再Importできるようにする

再Import時に以下のMIDI由来データを更新する
- TempoMap
- NoteEvents
- Track情報
- 演奏位置・実行用時間
- MIDIのNote追加・削除・変更を反映する
- BPM・拍子・テンポ変更を反映する

以下のUnity上で手動設定した情報は再Importしても保持する
- Shaondama Settings
- Attack Events
- Random Sections
- Sync Settings

Shaondama Settingsで指定しているTrackがMIDIから消えた場合は警告する

## 完了条件

- MIDIを変更して再ImportするとMusic Dataだけが更新される
- Attack Eventsなどの手動設定が消えない
- Note・Track・テンポ・拍子の変更が正しく反映される
- 存在しなくなったTrackを検出できる
