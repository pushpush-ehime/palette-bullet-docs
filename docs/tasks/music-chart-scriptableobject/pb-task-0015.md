---
title: "06. BGM再生同期"
pageType: task
taskId: PB-TASK-0015
category: "BGM"
team: プログラム
---

# PB-TASK-0015｜06. BGM再生同期

## 目的
FLACのBGM再生とMusicChartのイベント進行を同じ音楽時計で同期できるようにする。

## 実装

- MusicChartに設定されたAudioClipを再生する
- AudioSettings.dspTimeを基準にMusicClockを作る
- AudioSource.PlayScheduled()でBGMを開始する
- BGM開始時刻を保存する
- 現在のBGM再生位置を取得できるようにする
- MusicChart上の演奏位置・秒数と現在のBGM位置を比較できるようにする
- ゲーム側のTime.timeやdeltaTimeの累積を音楽時間の基準にしない
- Sync Settingsの補正値を反映できるようにする

## 完了条件

- BGMを指定したDSP時刻から再生できる
- 現在の曲位置を取得できる
- MusicChart上の指定時刻でConsoleへイベントを出せる
- 長時間再生しても時間のズレが累積しない
- 同期補正値を変更するとイベント位置を調整できる
