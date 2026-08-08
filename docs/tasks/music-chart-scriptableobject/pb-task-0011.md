---
title: "02. DryWetMIDIの導入"
pageType: task
taskId: PB-TASK-0011
category: "BGM"
team: プログラム
---

# 02. DryWetMIDIの導入

## 目的

**やること**
UnityからMIDIファイルを読み取るために、`DryWetMIDI`をプロジェクトへ導入する。

**完了**
このタスクでは、DryWetMIDIを使用してMIDIファイルを開けるところまで確認する。

## 導入するもの

`DryWetMIDI.Nativeless`をUnityプロジェクトへ導入する。

Palette BulletではDryWetMIDIから音を再生せず、MIDIファイルの解析だけに使用する。

```text
BattleTest.mid
      ↓
 DryWetMIDI
      ↓
MIDIデータを読み取る
```

*BGMとして実際に再生する音にはFLACを使用する。

## 実装内容

### DryWetMIDIを導入する

Unityから以下のNamespaceを使用できる状態にする。

```csharp
using Melanchall.DryWetMidi.Core;
using Melanchall.DryWetMidi.Interaction;
```

導入後、Unityでコンパイルエラーが発生しないことを確認する。

### テスト用MIDIを読み込む

`00. BGM下準備`で用意した以下のMIDIを使用する。

```text
Assets/
└─ PaletteBullet/
   └─ Music/
      └─ MIDI/
         └─ BattleTest.mid
```

DryWetMIDIの`MidiFile.Read()`を使用して、`BattleTest.mid`を開けることを確認する。

読み込みに成功した場合は、Consoleへ確認用ログを表示する。

```text
DryWetMIDI MIDI Load Success
```

## 今回実装する範囲

* DryWetMIDIをUnityへ導入する
* UnityからDryWetMIDIのAPIを使用できるようにする
* `BattleTest.mid`を読み込めることを確認する
* 読み込み成功をConsoleで確認する

## 今回実装しないもの

以下は後続タスクで実装する。

* MIDIのNote取得
* MIDI Note番号の取得
* Track名の取得
* TempoMapの取得
* 小節・拍・Tickの取得
* 秒数への変換
* MIDIからMusicChartへの保存
* MIDI再Import
* BGM再生
* DSP同期
* MIDIの再生

## 完了条件

* UnityプロジェクトにDryWetMIDIが導入されている
* DryWetMIDI導入によるコンパイルエラーが発生していない
* DryWetMIDIのNamespaceをC#から参照できる
* `BattleTest.mid`を`MidiFile.Read()`で読み込める
* 読み込み成功をUnity Consoleで確認できる
* Unityを再起動してもDryWetMIDIを使用できる
