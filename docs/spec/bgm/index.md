---
title: "戦闘BGM"
description: このカテゴリで扱う仕様
pageType: spec
category: "BGM"
categoryOrder: 90
order: 0
status: 未決
collapsed: false
---
# BGM

## 音楽ファイル

1曲につき、以下の3点を用意してください。

1. **DAWプロジェクト**
2. **FLACファイル**

   * ゲーム内で再生する完成BGM
3. **MIDIファイル**

   * 音程・楽器・タイミング取得用

### 書き出しルール

* FLACとMIDIは**同じDAWプロジェクトから書き出す**
* FLACとMIDIの**曲の開始位置を必ず揃える**
* 冒頭の無音部分を片方だけ削除しない
* MIDIには、ゲームで使用する楽器のノート情報を残す

::: info
```text
FLAC + MIDI
      ↓
Unity Editor
      ↓
MusicChart
      ↓
ゲームで使用
```
:::
