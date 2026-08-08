---
title: "04.MusicChart変換"
pageType: task
taskId: PB-TASK-0013
category: "BGM"
team: プログラム
---

# PB-TASK-0013｜04.MusicChart変換

## 目的

MIDIから取得した音楽情報を`MusicChart.asset`へ変換・保存できるようにする。

ゲーム実行時はMIDIを直接解析せず、ここで生成した`MusicChart`の音楽情報を使用する。

## 変換の流れ

```text
MIDI
 ↓
DryWetMIDIで読み取り
 ↓
ゲーム用データへ変換
 ↓
MusicChart.asset
```

MIDIから取得した情報は、`MusicChart.asset`の`Music Data`へ保存する。

```text
Music Data
├─ ①TempoMap・・・BPM・拍子・テンポ変更から、音楽上の位置と実際の再生時間を対応させるため
└─ ②NoteEvents・・・BGM内で「どの音が・いつ・どのTrackで鳴るか」をゲーム側で利用するため
```

## ①TempoMapの保存

MIDIから以下の情報を取得し、MusicChartへ保存する。

* BPM・テンポ変更
* 拍子
* 変更が発生する演奏位置

曲の途中でテンポや拍子が変化する場合も保存できるようにする。

## ②NoteEventの生成

MIDI内の各Noteから`NoteEvent`を生成する。

各NoteEventには以下の情報を保存する。

```text
NoteEvent

├─ MIDI Note番号・・・MIDI上の元の音符情報を保持し、音程を正確に識別するため
├─ 音程・・・C・D・Eなど、シャオンダマが持つ音を判定するため
├─ オクターブ・・・C4・C5など、同じ音名でも高さが異なる音を区別するため
├─ Velocity・・・MIDI上の音の強さを保持し、将来シャオンダマの大きさや演出などの拡張用（未定）
├─ Track・・・どの楽器由来の音かを識別し、シャオンダマ生成対象を選ぶため
├─ 演奏位置・・・BGMの正しい位置でNoteEventを処理し、シャオンダマなどを同期させるため
└─ Noteの長さ・・・その音がどれだけの間鳴っているかを取得し、将来の生成・表示・演出などに利用するため（未定）
```

### 例

```text
MIDI

Piano
12小節 3拍 240Tick
C4
Velocity 93
```

↓

```text
NoteEvent

Track      : Piano
MidiNote   : 60
Pitch      : C
Octave     : 4
Velocity   : 93
Position   : 12:3:240
```

## 演奏位置

演奏位置は、MIDIのTickを基準に扱う。

MusicChartでは、音楽上の位置を確認できるようにする。

```text
小節
拍
Tick
```

また、TempoMapを使用して実行時に使用する秒数へ変換できる状態にする。

```text
12小節 3拍 240Tick
        ↓
     TempoMap
        ↓
18.582秒
```

## Track情報

NoteEventには、元のMIDI Trackを識別できる情報を保存する。

```text
Piano
Guitar
Bass
Synth
```

この情報は後のタスクで、どのTrackをシャオンダマ生成に使用するか判定するために使用する。

## 更新するデータ

このタスクでMIDIから生成・更新するのは、MIDI由来の音楽情報のみとする。

```text
更新する

Music Data
├─ TempoMap
└─ NoteEvents
```

以下の手動設定データは変更しない。

```text
変更しない

BGM
Shaondama Settings
Attack Events
Random Sections
Sync Settings
```

## 動作確認

テスト用MIDIをMusicChartへ変換し、生成されたデータをInspectorで確認する。

### 確認例

```text
MusicChart

TempoMap
└─ 120 BPM / 4/4

NoteEvents

[0]
Track      : Piano
MidiNote   : 60
Pitch      : C
Octave     : 4
Velocity   : 93
Position   : 12:3:240

[1]
Track      : Piano
MidiNote   : 64
Pitch      : E
...
```

MIDI側のNoteとMusicChart側のNoteEventを比較し、正しい内容・順番・演奏位置で保存されていることを確認する。

---

## 今回実装しないもの

以下は後続タスクで実装する。

* シャオンダマの生成
* シャオンダマ生成対象Trackの判定
* AttackEventの実行
* Random Sectionの処理
* BGM再生
* BGMとの同期処理
* 攻撃予告UI
* GameplayCueの読み取り

---

## 完了条件

* MIDIから`TempoMap`を生成できる
* MIDIから`NoteEvent`を生成できる
* MIDI Note番号が正しく保存される
* 音程・オクターブが正しく保存される
* Velocityが正しく保存される
* Track情報が正しく保存される
* 演奏位置が正しく保存される
* Noteの長さが正しく保存される
* テンポ変更・拍子をMusicChartへ保存できる
* 生成した情報を`MusicChart.asset`として保存できる
* Unityを再起動しても生成した情報が保持される
* MIDI由来ではない手動設定データが変更されない
