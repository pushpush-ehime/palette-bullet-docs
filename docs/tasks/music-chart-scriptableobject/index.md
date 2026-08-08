---
title: "00. BGM下準備"
description: このカテゴリで扱うタスク
pageType: task-category
category: "BGM"
categoryOrder: 90
collapsed: true
---

# BGM下準備

## 目的

BGMシステムの実装を始めるために、必要なフォルダとテスト用音楽データを準備する。

## フォルダ作成

BGMシステム用に以下のフォルダを作成する。

```text
Assets/
└─ PaletteBullet/
   └─ Music/
      ├─ Audio/
      ├─ MIDI/
      ├─ Charts/
      ├─ Scripts/
      ├─ Editor/
      └─ Test/
```

### 各フォルダの用途

| フォルダ       | 用途                           |
| ---------- | ---------------------------- |
| `Audio/`   | FLACなどのBGMファイル               |
| `MIDI/`    | BGMに対応するMIDIファイル             |
| `Charts/`  | `MusicChart.asset`           |
| `Scripts/` | BGMシステムのRuntime用スクリプト        |
| `Editor/`  | MIDI ImporterなどEditor専用スクリプト |
| `Test/`    | BGMシステム確認用のScene・テストデータ      |


## テスト用BGMを用意する

実装確認用として、同じ曲の以下のファイルを1セット用意する。

```text
BattleTest.flac
BattleTest.mid
```

### 条件

* FLACとMIDIは同じ曲であること
* 同じDAWプロジェクトから書き出すこと
* 曲の開始位置を揃えること
* MIDIとFLACでテンポ・演奏位置が一致していること
* MIDIにはゲームで使用したい楽器のNote情報が含まれていること

### ファイル配置

用意したファイルを以下へ配置する。

```text
Music/
├─ Audio/
│  └─ BattleTest.flac
│
└─ MIDI/
   └─ BattleTest.mid
```
## テストSceneを作成する

BGMシステムの動作確認専用Sceneを作成する。
`Music/Test/MusicSystemTest.unity`

本番Sceneではなく、このSceneを使用してBGM再生・MIDI読み込み・MusicChart・同期処理などを確認する。

## 完了条件
- BGM用フォルダが作成されている
- テスト用FLACが配置されている
- 同じ曲のMIDIが配置されている
- FLACとMIDIの開始位置が一致している
- MusicSystemTest Sceneが作成されている
## このページでは行わないこと

以下は後続タスクで実装する。

- MusicChartの作成
- DryWetMIDIの導入
- MIDI Importerの作成
- MIDI解析
- BGM再生処理
- BGMとゲームイベントの同期
- AttackEventの実行
- シャオンダマ生成
