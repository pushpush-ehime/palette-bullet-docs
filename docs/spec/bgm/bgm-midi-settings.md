---
title: "BGM MIDIファイルの設定"
pageType: spec
category: "BGM"
status: 仮仕様
---

# BGM MIDI仕様

## MIDIの役割

MIDIは、BGMの音楽情報をUnityへ渡すために使用する。

ゲーム内で実際に再生する音にはFLACを使用し、MIDI自体は再生しない。

```text
FLAC
└─ プレイヤーが実際に聞くBGM

MIDI
└─ Unityが音程・楽器・演奏位置などを取得するためのデータ
```

MIDIから取得した情報は、Unity Editorで`MusicChart.asset`へ変換して使用する。

```text
MIDI
 ↓
DryWetMIDI
 ↓
MusicChart
 ↓
ゲームで使用
```

## MIDIに必要な情報

MIDIには、ゲームで使用する楽器のNote情報を残す。

各Noteから、主に以下の情報を取得する。

```text
Note
├─ 音程・・・シャオンダマが持つ音を決めるため
├─ オクターブ
├─ Velocity
├─ Track・・・そのNoteが、どの楽器から鳴っているかを取得するため
├─ 演奏位置・・・そのNoteが曲のどこで鳴るかを取得するため（TempoMapを使って秒数へ変換）
└─ Noteの長さ
```
## Trackについて

作曲時の楽器Trackは、MIDI書き出し時にも判別できる状態にする。

例：

```text
Piano
Guitar
Bass
LeadSynth
Pad
Drums
```

ゲーム内ですべてのTrackをシャオンダマ生成に使用するとは限らない。

どのTrackを使用するかは、Unityの`MusicChart`で設定する。

```text
MusicChart

Shaondama Settings

Piano      ON
Guitar     ON
Bass       OFF
Pad        OFF
Drums      OFF
```

## 攻撃イベントについて

攻撃イベントはMIDIには記録しない。

以下の情報はUnityの`MusicChart`で設定する。

```text
Attack Events
├─ 発生位置
├─ 必要音
├─ Chord / Arpeggio
├─ アルペジオ順序
├─ 予告時間
└─ Harmony

Random Sections
├─ 開始位置
├─ 終了位置
└─ AttackEvent候補
```

そのため、作曲者がMIDIへ`PB_ATTACK`や`PB_RANDOM`などのゲーム専用Trackを作成する必要はない。

## MIDI書き出しルール

FLACとMIDIは、同じDAWプロジェクトから書き出す。

以下を必ず揃える。

* 曲の開始位置
* テンポ
* テンポ変更
* 拍子
* 演奏位置

FLACだけ冒頭の無音を削除するなど、FLACとMIDIの開始位置が変わる編集は行わない。

また、ゲームで使用する楽器のNote情報をMIDIに残す。

## 将来の拡張

将来、作曲者がDAW上からAttackEventやRandom Sectionを指定する必要が出た場合は、ゲーム専用TrackやMarker / Cueの利用を検討する。

現段階では使用しない。
