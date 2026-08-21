---
title: "BGM MusicChart仕様"
description: Palette BulletにおけるMusicChartのデータ構造とImport・手動設定データの境界
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

`MusicChart`は、1曲のBGMについて、

- 実際に再生するBGM
- MIDIから取得した音楽情報
- Gameplayで使用する手動設定

をまとめて保持するUnity上のデータです。

ゲーム実行中はMIDIを直接解析せず、あらかじめ生成・設定された`MusicChart`を使用します。

```text
FLAC
↓
Unity Import
↓
AudioClip
┐
│
├─────────→ MusicChart
│
MIDI
↓
Import
↓
TempoMap / NoteEvents
┘
```

さらに、MIDIには含めないGameplay用情報をUnity上で設定します。

```text
MusicChart
├─ MIDIから生成するデータ
└─ Unity上で手動設定するデータ
```

本ページでは、

> **MusicChartのデータ構造と、Importデータ・手動設定データの境界**

を正とします。

各Gameplay値をどのような考え方で決めるかまでは、本ページでは定義しません。

---

## データ構造

MusicChartは、基本的に以下の情報を持ちます。

```text
MusicChart
├─ BGM
│  └─ AudioClip
│
├─ Music Data                         [MIDIから生成]
│  ├─ TempoMap
│  └─ NoteEvents
│     ├─ 音程
│     ├─ オクターブ
│     ├─ Velocity
│     ├─ Track
│     ├─ 演奏位置
│     └─ Noteの長さ
│
├─ Shaondama Settings                 [手動設定]
│  ├─ 使用するTrack
│  ├─ InitialTargetCount
│  └─ MinimumLeadTime
│
├─ Attack Events                      [手動設定]
│  ├─ 発生位置
│  ├─ 必要音
│  ├─ Type
│  │  ├─ Chord
│  │  └─ Arpeggio
│  ├─ Arpeggioの順序
│  ├─ Arpeggioの音楽的タイミング
│  ├─ 予告時間
│  └─ Harmony
│     ├─ Root
│     └─ Quality
│
├─ Random Sections                    [手動設定]
│  ├─ 開始位置
│  ├─ 終了位置
│  ├─ AttackEvent候補
│  └─ 選択数
│
└─ Sync Settings                      [手動設定]
   └─ 同期補正値
```

大きく分けると、

```text
自動生成
├─ TempoMap
└─ NoteEvents

手動設定
├─ BGM AudioClip
├─ Shaondama Settings
├─ Attack Events
├─ Random Sections
└─ Sync Settings
```

となります。

---

## BGM

`BGM`には、UnityへImportした完成BGMの`AudioClip`を設定します。

```text
FLAC
↓
Unity Import
↓
AudioClip
↓
MusicChart.BGM
```

FLAC / MIDIの制作・Export条件については、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)を正とします。

MusicChartでは、FLACそのものではなくUnityへImportされた`AudioClip`を参照します。

---

## MIDIから生成するデータ

以下はMIDIから生成します。

```text
MIDI
↓
Import
├─ TempoMap
└─ NoteEvents
```

これらはUnity上でGameplay担当者が一つずつ手入力するデータではありません。

元となる音楽情報を変更する場合は、原則としてDAW / MIDI側を修正し、再Importします。

---

## TempoMap

`TempoMap`は、MIDIに含まれる時間情報から生成します。

主に、

- Tempo
- Tempo変更
- 拍子
- 拍子変更

をもとに、音楽上の位置と実際の再生時間を対応させるために使用します。

```text
小節
拍
Tick
↓
TempoMap
↓
BGM開始からの再生位置
```

AttackEventなど、BGMと同期するイベントの位置変換にも同じ`TempoMap`を使用します。

TempoMapの元情報はMIDIを正とします。

---

## NoteEvents

`NoteEvents`はMIDIのNote情報から生成します。

各NoteEventは、主に以下を保持します。

| データ | 内容 |
| --- | --- |
| 音程 | 元Noteの音程 |
| オクターブ | 元Noteのオクターブ |
| Velocity | 元NoteのVelocity |
| Track | 元Noteが所属するTrack |
| 演奏位置 | 曲中の演奏位置 |
| Noteの長さ | 元Noteの長さ |

NoteEventからどのようにシャオンダマを生成するかは、シャオンダマ側の仕様を正とします。

MIDIへどのTrack・Note情報を残すかについては、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)を正とします。

---

## 手動設定するデータ

以下はMIDIから生成しません。

```text
手動設定
├─ BGM AudioClip
├─ Shaondama Settings
├─ Attack Events
├─ Random Sections
└─ Sync Settings
```

これらはUnity上でMusicChartへ設定します。

::: info
**手動設定であることと、プログラマーが値を決定することは別です。**

値の決定者はデータごとに異なります。

プログラマーは、決定された内容をUnityへ入力できる環境を用意し、現在の運用ではその設定をMusicChartへ反映します。
:::

---

## Shaondama Settings

`Shaondama Settings`は、MIDIに存在するNoteEventsのうち、どのようにシャオンダマ生成へ使用するかを指定するGameplay設定です。

```text
Shaondama Settings
├─ 使用するTrack
├─ InitialTargetCount
└─ MinimumLeadTime
```

### 使用するTrack

MIDIに存在するすべてのTrackを、必ずシャオンダマ生成へ使用するわけではありません。

```text
MIDI
├─ Piano
├─ Guitar
├─ Bass
├─ Pad
└─ Drums

↓

Shaondama Settings
├─ Piano    ON
├─ Guitar   ON
├─ Bass     OFF
├─ Pad      OFF
└─ Drums    OFF
```

サウンド班は、音楽的にGameplayへ利用可能なTrackを提示できます。

Gameplayとして実際に使用するTrackはプランナーが決定します。

### InitialTargetCount / MinimumLeadTime

`InitialTargetCount`と`MinimumLeadTime`はGameplay側の生成パラメータです。

これらの値はプランナーが決定します。

具体的なシャオンダマ生成ルールについては、シャオンダマ側の仕様を正とします。

---

## Attack Events

AttackEventはMIDIから生成しません。

サウンド班が提示した音楽的情報と、Gameplay上必要な情報をもとに、MusicChartへ手動設定します。

```text
AttackEvent
├─ 発生位置
├─ 必要音
├─ Type
├─ Arpeggio情報
├─ 予告時間
└─ Harmony
```

### 音楽的内容

以下のような音楽的内容は、サウンド班が決定・提示します。

- AttackEventとして使用したい演奏位置
- 必要音
- `Chord / Arpeggio`
- Arpeggioの順序
- Arpeggioの音楽的タイミング
- Harmony

プランナーは、それをGameplayとして採用可能か確認します。

### Gameplay側の値

予告時間など、Gameplay体験に関係する値はプランナーが決定します。

サウンド班は音楽的な観点から意見を提示できますが、Gameplay値を独自に確定しません。

AttackEventの具体的な音楽仕様については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

AttackEvent情報の受け渡し工程については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

---

## Random Sections

Random SectionもMIDIから生成しません。

MusicChartへ手動設定します。

```text
Random Section
├─ 開始位置
├─ 終了位置
├─ AttackEvent候補
└─ 選択数
```

### サウンド班

サウンド班は、

- Random Sectionとして音楽的に成立する区間
- AttackEvent候補
- 各候補の音楽的妥当性

を提示します。

### プランナー

プランナーは、

- Random SectionをGameplayとして採用するか
- 実際に使用する候補
- 選択数などのGameplay値

を決定します。

Random Sectionの抽選ルールや候補条件については、[BGM Random Section仕様](/spec/bgm/bgm-random-section)を正とします。

---

## 各データの決定者

MusicChartに存在する値の決定元は、以下を基本とします。

| データ | 決定元・決定者 |
| --- | --- |
| `BGM AudioClip`の元素材 | サウンド班 |
| `TempoMap` | MIDIから生成 |
| `NoteEvents` | MIDIから生成 |
| Gameplay利用候補Track | サウンド班が提示 |
| `使用するTrack` | プランナー |
| `InitialTargetCount` | プランナー |
| `MinimumLeadTime` | プランナー |
| AttackEventの音楽的内容 | サウンド班 |
| AttackEventをGameplayとして採用するか | プランナー |
| AttackEventのGameplay値 | プランナー |
| Random候補の音楽的妥当性 | サウンド班 |
| Random候補のGameplay上の採用 | プランナー |
| Random Sectionの選択数 | プランナー |
| `Sync Settings`の補正値 | プログラマー / QA |

MIDIから生成される値については、MusicChart上で別の担当者が同じ内容を再決定しません。

---

## 各データの入力者

現在の基本的な入力責務は以下です。

| データ | MusicChartへの入力 |
| --- | --- |
| `BGM AudioClip` | プログラマー |
| `TempoMap` | Import機構 |
| `NoteEvents` | Import機構 |
| `Shaondama Settings` | プログラマー |
| `Attack Events` | プログラマー |
| `Random Sections` | プログラマー |
| `Sync Settings` | プログラマー |

プログラマーは、サウンド班・プランナーが決定した内容を独自判断で変更して入力しません。

また、

> **プログラマーが入力する**

というルールは、

> **すべての値をプログラマーが手作業で入力し続けなければならない**

という意味ではありません。

Editor機能などによって入力を補助・自動化することは可能です。

ただし、入力方法を変更しても各データの決定者は変わりません。

---

## Import

MusicChartのImportでは、MIDIから音楽情報を取得します。

```text
MIDI
↓
Import
├─ TempoMap
└─ NoteEvents
```

Import機構そのものの実装はプログラマーが担当します。

### Importで生成するもの

最低限、

- TempoMap
- NoteEvents

を生成します。

NoteEventsには、MIDIから取得した、

- 音程
- オクターブ
- Velocity
- Track
- 演奏位置
- Noteの長さ

を保持します。

### Importで生成しないもの

以下はMIDI Importでは生成しません。

- Attack Events
- Random Sections
- Shaondama Settings
- Sync Settings

AttackEventやRandom SectionをMIDIのゲーム専用Trackから自動生成する方式は、現段階では採用していません。

---

## 再Import

MIDIを修正した場合は、MusicChartへ再Importします。

再Importでは、

> **MIDIから生成されたデータだけを更新する**

ことを基本ルールとします。

```text
再Import

更新
├─ TempoMap
└─ NoteEvents

保持
├─ BGM AudioClip
├─ Shaondama Settings
├─ Attack Events
├─ Random Sections
└─ Sync Settings
```

### NoteEventsの更新

MIDI側で、

- Note
- 音程
- オクターブ
- Velocity
- Track
- 演奏位置
- Noteの長さ

が変更された場合は、再Import後のNoteEventsへ反映します。

### TempoMapの更新

MIDI側の、

- Tempo
- Tempo変更
- 拍子
- 拍子変更

が変更された場合は、TempoMapへ反映します。

---

## 保持されるデータ

MIDIを再Importしても、Unity上で手動設定した以下のデータは自動的に削除・上書きしません。

```text
保持
├─ BGM AudioClip
├─ Shaondama Settings
├─ Attack Events
├─ Random Sections
└─ Sync Settings
```

これは、

> **再Import後も手動設定の内容が正しいことを保証する**

という意味ではありません。

---

## 再Import後の確認

MIDI由来の音楽構造が変わった場合、保持された手動設定との関係を再確認します。

例えば、

```text
MIDI修正
↓
AttackEventが設定されていた演奏位置の音楽が変化
↓
AttackEvent自体は保持される
↓
音楽的に正しいか再確認
```

となります。

### Track変更

MIDIのTrack名やTrack構成を変更した場合は、`Shaondama Settings`の使用Track設定が現在のMIDIと対応しているか確認します。

削除・変更されたTrackを、別のTrackへ自動的に読み替えることは前提としません。

### 演奏位置・Tempo変更

以下を変更した場合は、

- Tempo
- 拍子
- 演奏位置
- 曲構成

Attack EventsやRandom Sectionsの位置が引き続き意図した場所を指しているか確認します。

### AttackEventの再確認

AttackEventはMIDIから生成されないため、MIDI再ImportだけではAttackEventの音楽的内容は更新されません。

楽曲変更によってAttackEvent側も変更する必要がある場合は、サウンド班・プランナーで内容を再確認し、MusicChartの手動設定を更新します。

再Export / 再Importを含む制作工程については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

---

## Sync Settings

`Sync Settings`は、BGMとGameplay上の音楽イベントの同期を補正するために使用します。

```text
Sync Settings
└─ 同期補正値
```

通常は補正なしを基準とし、実際のゲーム内確認で同期ズレが確認された場合に調整します。

### 決定者

同期補正は、

- プログラマー
- QA

が実機・ゲーム内確認結果をもとに判断します。

### 入力

MusicChartへの補正値の入力はプログラマーが行います。

### 使用目的

Sync Settingsは、実行環境や再生処理などによる同期ズレを補正するためのものです。

FLAC / MIDIの開始位置やTempoが元データから一致していない問題を、恒常的にSync Settingsだけで解決することを前提としません。

元データに問題がある場合は、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)に従って元データを修正します。

---

## 音楽位置の基本ルール

AttackEventやRandom Sectionなど、BGM上の位置を指定するデータは、

```text
小節
拍
必要に応じてTick
```

で記録します。

例：

```text
16小節目
3拍目
120 Tick
```

ゲーム実行時は`TempoMap`を使用して、実際のBGM再生時間へ変換します。

```text
小節 / 拍 / Tick
↓
TempoMap
↓
BGM上の再生位置
```

BGMとGameplayの最終的な同期ルールについては、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## 他仕様との責務境界

本ページは、

> **MusicChartのデータ構造と、Importデータ・手動設定データの境界**

だけを正とします。

| 内容 | 正とする仕様 |
| --- | --- |
| DAW / FLAC / MIDIの制作・Export条件 | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings) |
| サウンド班からUnityまでの制作・受け渡し工程 | [サウンド班制作フロー](/spec/bgm/sound-production-workflow) |
| AttackEventの音楽的仕様 | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| Random Sectionの候補・抽選ルール | [BGM Random Section仕様](/spec/bgm/bgm-random-section) |
| BGMとGameplayの音響接続・同期 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| NoteEventからのシャオンダマ生成 | シャオンダマ側の仕様 |
| AttackEventのSlot割り当て・成立判定 | チャージシステム側の仕様 |
| PlayerのCharge入力・Action | Player仕様 |

MusicChartはこれらの仕様で決定されたデータを保持・受け渡す場所であり、Gameplay上の値の決め方そのものを定義する場所ではありません。
