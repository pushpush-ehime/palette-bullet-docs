---
title: "BGM情報読み取り"
description: MIDIファイルから音符・Track・テンポなどの基本情報を読み取る
pageType: task
taskId: PB-TASK-0012
category: "BGM"
team: プログラム
---

# PB-TASK-0012｜BGM情報読み取り
## 目的

DryWetMIDIを使用して、MIDIファイルからゲームに必要な基本情報を取得できるようにする。

このタスクでは、取得した情報を`MusicChart`へ保存せず、正しく読み取れることを確認する。

## 読み取る情報

### MIDI全体

* Track
* BPM・テンポ変更
* 拍子

### Note

各Noteから以下を取得する。

* MIDI Note番号
* 音程
* オクターブ
* Velocity
* 所属Track
* 演奏位置
* Noteの長さ


## 演奏位置

Noteの位置は、MIDI内のTickだけでなく以下の形式でも取得できるようにする。

```text
小節
拍
Tick
```

例：

```text
12小節 3拍 240Tick
```

また、TempoMapを使用して実際の再生時間にも変換できることを確認する。

```text
12小節 3拍 240Tick

↓

18.582秒
```

## Track名

各NoteがどのTrackに所属しているか取得する。

例：

```text
Track : Piano
Note  : C4
Time  : 18.582
```

Track情報は、後のタスクでシャオンダマ生成対象Trackを選択するために使用する。


## 動作確認

テスト用MIDIを読み込み、取得した情報をConsoleへ表示する。

例：

```text
Track : Piano
Note  : C4
MIDI  : 60
Velocity : 93
Position : 12:3:240
Time : 18.582 sec
```

Tempo・拍子についても確認する。

```text
Tempo : 120 BPM
Time Signature : 4/4
```

## 今回実装しないもの

以下は後続タスクで実装する。

* `MusicChart`へのデータ保存
* `NoteEvent`の自動生成
* シャオンダマ生成
* AttackEvent生成
* ランダム区間読み取り
* BGM再生
* BGMとの同期処理


## 完了条件

* テスト用MIDIを読み込める
* Track名を取得できる
* MIDI Note番号を取得できる
* 音程・オクターブを取得できる
* Velocityを取得できる
* Noteの演奏位置を取得できる
* Noteの長さを取得できる
* BPM・テンポ変更を取得できる
* 拍子を取得できる
* Tickから小節・拍・Tickへ変換できる
* TempoMapを使用して演奏位置を秒へ変換できる
* 取得結果をConsoleで確認できる


