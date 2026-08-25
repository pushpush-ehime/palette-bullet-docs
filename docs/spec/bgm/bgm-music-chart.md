---
title: "BGM MusicChart仕様"
description: Palette BulletにおけるMusicChartのImportデータ、Battle開始pre-roll、Shaondama最低保証、AttackEvent音楽データ、loop validation
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
---

# BGM MusicChart仕様

## 別チャットへ渡すための短い概略

このページは、**1曲分の静的なMusicChartデータ契約**の正本です。

- MIDIから`TempoMap`と`NoteEvents`をImportする
- Unity上でBGM、使用Track、Shaondama最低保証数、system pre-roll時間、AttackEvent、Random Section、同期補正を設定する
- AttackEvent、特にArpeggioが1つのBGM loopをまたがないことをvalidationする
- Runtimeの選択可能数監視、Wildcard補充、AttackEvent進行、loop occurrence、Charge判定そのものは保存しない

別チャットでこのページを修正するときは、**「MusicChartに何を保存するか」だけを決め、保存値をGameplayでどう処理するかは各正本へ委譲する**方針を維持します。

## MusicChartとは

`MusicChart`は、1曲のBGMについて、

- 実際に再生するBGM
- MIDIから取得した音楽情報
- Gameplayで使用する手動設定データ

をまとめて保持するUnity上の静的な曲定義データです。

ゲーム実行中はMIDIを直接解析せず、あらかじめImport・設定された`MusicChart`を参照します。

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

+

Unity上の手動設定
├─ Shaondama Settings
├─ Battle Timing Settings
├─ AttackEvent Timing Settings
├─ Attack Events
├─ Random Sections
└─ Sync Settings
```

---

## 本ページの責務

本ページでは、

> **MusicChartのデータ構造と、MIDI Importデータ・Unity上の手動設定データの境界**

を正とします。

主に以下を定義します。

- MusicChart全体のデータ構造
- `BGM AudioClip`
- `TempoMap`
- `NoteEvents`
- `Shaondama Settings`
- `Battle Timing Settings`
- `AttackEvent Timing Settings`
- `Attack Events`
- `Random Sections`
- `Sync Settings`
- MIDI Import / 再Import
- 各データの決定者・入力者
- 静的DefinitionとRuntime状態の境界

一方、MusicChartに保存した値をGameplay上でどのように使用するかは、各正本仕様へ委譲します。

```text
AttackEventに
なぜその情報が必要か
どうGameplay上使用するか
→ bgm-attack-event.md

Current Normal AttackEvent
Slot Allocation
Weak Allocation
Reserved
→ draw-system/charge-allocation.md

Complete / Incomplete / Zero Charge
Palette Bullet化
→ bgm-attack-judgement.md

発音・BGM同期
→ bgm-gameplay-connection.md
```

MusicChartは、これらの処理に必要な**静的データを保持する側**に徹します。

---

## MusicChart全体構造

MusicChartは、概念上以下の情報を持ちます。

```text
MusicChart
├─ BGM
│  └─ AudioClip
│
├─ Music Data                         [MIDIから生成]
│  ├─ TempoMap
│  └─ NoteEvents
│     ├─ exact MIDI Noteを復元可能な情報
│     │  ├─ Pitch
│     │  └─ octave
│     ├─ Velocity
│     ├─ Track
│     ├─ Music Position
│     └─ Note Length
│
├─ Shaondama Settings                 [手動設定]
│  ├─ 使用するTrack
│  ├─ Minimum Selectable Shaondama Count
│  └─ MinimumLeadTime
│
├─ Battle Timing Settings             [手動設定]
│  └─ System Pre-roll Duration
│
├─ AttackEvent Timing Settings        [手動設定]
│  ├─ Preview / Charge Start Offset
│  └─ Charge Close Offset
│
├─ Attack Events                      [手動設定]
│  ├─ Fire Music Position
│  ├─ Type
│  │  ├─ Chord
│  │  └─ Arpeggio
│  ├─ Music Requirement Entries
│  │  ├─ exact MIDI Note
│  │  └─ Arpeggioの場合
│  │     ├─ 音楽的順序
│  │     └─ 音楽的Timing
│  ├─ Harmony
│  │  ├─ Root
│  │  └─ Quality
│  └─ Timing Override [optional]
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

これは**仕様上の概念構造**です。

C#クラス名、`SerializedField`名、専用structの具体形までは本ページでは固定しません。

大きく分けると、

```text
MIDIから自動生成
├─ TempoMap
└─ NoteEvents

Unity上の手動設定
├─ BGM AudioClip
├─ Shaondama Settings
├─ Battle Timing Settings
├─ AttackEvent Timing Settings
├─ Attack Events
├─ Random Sections
└─ Sync Settings
```

となります。

---

## BGM

### AudioClip

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

MusicChartでは、FLACそのものではなくUnityへImportされた`AudioClip`を参照します。

FLAC / MIDIの制作・Export条件については、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)を正とします。

---

## MIDIから生成するデータ

MIDI Importによって、最低限以下を生成します。

```text
MIDI
↓
Import
├─ TempoMap
└─ NoteEvents
```

これらはGameplay担当者がUnity上で一つずつ手入力するデータではありません。

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

AttackEvent、Arpeggio Timing、Random Sectionなど、BGMと同期するデータの位置変換にも同じ`TempoMap`を使用します。

TempoMapの元情報はMIDIを正とします。

---

## NoteEvents

`NoteEvents`は、MIDIのNote情報から生成される**楽曲そのもののNote定義**です。

各NoteEventは、主に以下を保持します。

| データ | 内容 |
| --- | --- |
| Pitch | 元NoteのPitch |
| octave | 元Noteのoctave |
| Velocity | 元NoteのVelocity |
| Track | 元Noteが所属するTrack |
| Music Position | 曲中の演奏位置 |
| Note Length | 元Noteの長さ |

### exact MIDI Note

NoteEventは、`Pitch`と`octave`等から、そのNoteが表すoctave込みの**exact MIDI Note**を一意に復元できる必要があります。

例：

```text
C4
E4
G4
C5
A3
...
```

exact MIDI Noteの具体的なC#表現は本ページでは固定しません。

重要なのは、

> **NoteEventからoctave込みのNoteを一意に取得できること**

です。

### NoteEventsとNormal AttackEventの分離

`NoteEvents`とNormal AttackEventの`Music Requirement Entries`は同じものではありません。

```text
NoteEvents
=
MIDIからImportされた
楽曲そのもののNote情報
```

```text
Normal AttackEvent
=
Gameplay用に手動設定された
AttackEvent音楽情報
```

Normal AttackEventの各`Music Requirement Entry`は、原則として特定の`NoteEvent`への直接参照を必須にしません。

NoteEventからどのようにシャオンダマを生成するかは、[BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama)を正とします。

MIDIへどのTrack・Note情報を残すかについては、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)を正とします。

---

## 手動設定するデータ

以下はMIDIから自動生成しません。

```text
手動設定
├─ BGM AudioClip
├─ Shaondama Settings
├─ Battle Timing Settings
├─ AttackEvent Timing Settings
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

`Shaondama Settings`は、MIDIに存在するNoteEventsをシャオンダマ生成へ使用するためのGameplay設定です。

```text
Shaondama Settings
├─ 使用するTrack
├─ Minimum Selectable Shaondama Count
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

### Minimum Selectable Shaondama Count

MusicChartは、その曲のBattle中に維持するShaondama最低保証数を設定できるようにします。

本ページでは概念名を`Minimum Selectable Shaondama Count`とします。具体的なC#フィールド名は固定しません。

この値が表す対象は、

> **現在選択可能で、かつ`Reserved`ではないShaondamaの最低個数**

です。

以下は最低保証数へ算入しません。

- 出現演出中で、まだ選択可能ではないShaondama
- `Reserved`のShaondama
- 論理生成要求だけが存在し、world上で選択可能になっていないShaondama

同じ値を、次の2つの境界で使用します。

```text
Battle開始時
→ 選択可能・非Reserved数が最低保証数へ到達するまで開始gateを満たさない

Battle中
→ 最低保証数を下回った場合、不足数分のWildcard生成要求へ接続する
```

出現演出中は一時的に最低保証数を下回って構いません。MusicChart自身は個数監視やWildcard生成要求を実行せず、静的な設定値だけを保持します。

算入判定、要求中個数を含む重複防止、不足数分のWildcard補充は[BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama)を正とします。出現演出完了と選択可能化は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正とします。

最低保証数の具体値は調整パラメータとし、本ページでは固定しません。

### MinimumLeadTime

`MinimumLeadTime`は、NoteEvent由来のNormal Shaondamaを必要時刻より前に生成要求するための先行時間設定として保持します。

これは選択可能数の最低保証値ではありません。また、Battle開始時だけ必要個数分のNoteEventを先読みする旧`InitialTargetCount`方式の代替でもありません。

具体的な先行生成規則は[BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama)を正とします。

### 旧InitialTargetCountの扱い

Battle開始時にNormal NoteEventを先読みして一定個数を生成するための旧`InitialTargetCount`は、最終仕様のパラメータとして使用しません。

既存assetや実装に同名データが残っている場合は、`Minimum Selectable Shaondama Count`へ意味だけを読み替えず、migration対象として明示的に置換します。

```text
旧InitialTargetCount
= Battle開始時のNormal先読み個数

Minimum Selectable Shaondama Count
= Battle開始時とBattle中を通した選択可能・非Reserved数の最低保証
```

両者は意味が異なります。

---

## Battle Timing Settings

`Battle Timing Settings`は、Battle音楽runtime開始後、実際のBGM音源位置0を再生するまでに置くsystem側の無音pre-roll設定です。

```text
Battle Timing Settings
└─ System Pre-roll Duration
```

### System Pre-roll Duration

`System Pre-roll Duration`は、準備gateを満たしてBattle／Gameplay／MusicChart時計を開始してから、既存のBGMを音源位置0から再生し始めるまでの時間を表します。

```text
Enemy準備完了
+
必要数の選択可能・非Reserved Shaondama準備完了
↓
Battle / Gameplay / MusicChart時計を開始
↓
System Pre-roll Duration
├─ AttackEvent予告を開始可能
└─ Charge受付を開始可能
↓
既存BGMを音源位置0から再生
```

pre-rollはMusicChartから参照できる手動設定値として保持しますが、次の素材自体へ無音や空小節を追加しません。

- 完成BGMのAudioClip
- FLAC等の音源素材
- MIDI
- MIDIからImportした`TempoMap`／`NoteEvents`

音源位置0およびMIDI由来の曲本編位置0は、Battle音楽runtime上のpre-roll終了点へ対応します。具体的な内部timerやAudio再生予約方式は固定しません。

pre-rollの具体時間は調整パラメータです。値は0以上とし、冒頭AttackEventの予告／Charge開始に必要な時間を確保できるかEditor validationで確認できる構造にします。ただしvalidationの具体的なUIや自動修正方法は固定しません。

Battle開始gate、pre-roll中の時計、Pause／Resume、Room Retry、HitStopとの同期は[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## AttackEvent Timing Settings

MusicChartには、曲内のNormal AttackEventで使用する基本Timing値として、`AttackEvent Timing Settings`を保持します。

```text
AttackEvent Timing Settings
├─ Preview / Charge Start Offset
└─ Charge Close Offset
```

これらは、AttackEvent本来の発火位置を基準とした**曲共通のデフォルト値**です。

### 基準BGM時間軸

Timingは3本の独立タイマーとして保持しません。

> **1本の基準BGM時間軸に対するOffsetとして保持します。**

概念上、

```text
Actual BGM Progress
= 基準

Preview / Charge Start Progress
= Actual BGM Progress + Preview / Charge Start Offset

Charge Close Progress
= Actual BGM Progress + Charge Close Offset
```

とします。

3つのProgressは、同じBGM時間軸を基準として同じ速度で進行します。

### Preview / Charge Start Offset

`Preview / Charge Start Offset`は、予告開始およびCharge受付開始に必要な時間差を表します。

AttackEventの`Fire Music Position`を`T`とした場合、

```text
Preview / Charge Start ProgressがTへ到達
↓
予告開始
+
Charge受付開始
```

として扱える値を保存します。

### Charge Close Offset

`Charge Close Offset`は、Charge受付終了に必要な時間差を表します。

```text
Charge Close ProgressがTへ到達
↓
Charge受付終了
```

として扱える値を保存します。

最終的に、

```text
Actual BGM ProgressがTへ到達
↓
AttackEvent発火
```

となります。

このGameplay上の意味・判定規則は、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

### 時間関係

具体的なOffset値は調整パラメータとし、本ページでは固定しません。

ただしGameplay上、

```text
Preview / Charge Start
↓
Charge Close
↓
Actual Fire
```

の順で各境界へ到達できる設定とします。

不正な順序を設定できないようEditor validationを設けることは推奨しますが、具体実装はプログラム設計へ委譲します。

### Offsetのデータ単位

Offsetは、BGMの音楽時間と一意に接続できる形式で保持する必要があります。

具体的な保存形式は、例えば、

- 秒
- Tick
- beat-relative値
- 専用`MusicTimeOffset`型

などが考えられますが、本ページでは固定しません。

重要なのは、

> **Tempo変更、Pause / Resume、Loop等が存在しても、1本のBGM時間軸との関係を維持できること**

です。

### AttackEvent単位Override

各Normal AttackEventは、必要な場合のみ曲共通の`AttackEvent Timing Settings`をoverrideできる構造を持ちます。

概念上、

```text
AttackEvent
└─ Timing Override
   ├─ Use Override
   ├─ Preview / Charge Start Offset
   └─ Charge Close Offset
```

のように表現します。

実際のフィールド名やInspector UIは固定しません。

値の解決順は、

```text
AttackEvent個別Overrideあり
↓
個別値を使用

Overrideなし
↓
MusicChart曲共通値を使用
```

とします。

---

## Attack Events

MusicChartの`Attack Events`には、事前定義する**Normal AttackEvent Definition**を保持します。

AttackEventはMIDIから自動生成しません。

サウンド班が提示した音楽的情報と、Gameplay上必要な情報をもとにUnity上で手動設定します。

```text
AttackEvent
├─ Fire Music Position
├─ Type
│  ├─ Chord
│  └─ Arpeggio
├─ Music Requirement Entries
│  ├─ exact MIDI Note
│  └─ Typeに応じた音楽情報
├─ Harmony
│  ├─ Root
│  └─ Quality
└─ Timing Override [optional]
```

旧構造の、

```text
必要音
C / E / G
```

のような独立したPitch Class配列は正本として保持しません。

また、単一の`予告時間`だけでAttackEvent timingを表現する方式は使用しません。

### Fire Music Position

`Fire Music Position`は、

> **AttackEvent本来の発火音楽位置**

です。

保存形式は、

```text
小節
拍
必要に応じてTick
```

で表現可能にします。

実行時は、

```text
Fire Music Position
↓
TempoMap
↓
BGM上の再生位置
```

へ変換します。

### Type

AttackEventのTypeとして、少なくとも以下を保持できるようにします。

```text
Type
├─ Chord
└─ Arpeggio
```

Typeごとの音楽的意味や発火処理は、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)および[BGM 攻撃判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

### Music Requirement Entries

Normal AttackEventの要求音は、単純なPitch Class配列ではなく、

> **Music Requirement Entryの集合**

として保持します。

概念上、

```text
Music Requirement Entry
├─ exact MIDI Note
└─ Typeに応じた音楽情報
```

とします。

### exact MIDI Note

各`Music Requirement Entry`は、そのAttackEventが音楽上表現するoctave込みの**exact MIDI Note**を一意に取得できる必要があります。

例：

```text
Chord AttackEvent

Entry 1 = C4
Entry 2 = E4
Entry 3 = G4
```

exact MIDI Noteの具体的な保存表現は本ページでは固定しません。

候補として、

```text
MIDI Note Number
```

または、

```text
Pitch
+
octave
```

または専用structを使用できます。

### Pitch Classの導出

GameplayのSlot照合に使用するPitch Classは、`Music Requirement Entry`のexact MIDI Noteから導出します。

```text
exact MIDI Note = C4
↓
Pitch Class = C
```

独立した`Required Pitch Classes`を正本として別保存しません。

これにより、

```text
Required Pitch = C
exact MIDI Note = D4
```

のような矛盾データを作らない構造とします。

Pitch Classを使用したSlot照合規則は、[Charge Allocation仕様](/spec/draw-system/charge-allocation)を正とします。

### 同音Entry

同じPitch Classを複数要求する場合も、Entryを統合しません。

例：

```text
Entry 1 = C3
Entry 2 = C4
Entry 3 = E4
```

この場合も3つのEntryをそのまま保持します。

Gameplay上は、

```text
C Slot 1
C Slot 2
E Slot
```

のように複数Slotへ対応できます。

一方、実際の発音に必要なNoteは、

```text
C Slot 1 → C3
C Slot 2 → C4
```

のように、対応するEntryからそれぞれ一意に取得できます。

Slotの生成・照合・占有規則そのものはMusicChartでは定義しません。

### MusicChart定義順

`Attack Events`の配列・リスト等の定義順は、実行時に決定的である必要があります。

```text
Attack Events
[0] A
[1] B
[2] C
```

同じ`Fire Music Position`を持つNormal AttackEvent同士を区別する必要がある場合、RuntimeからこのMusicChart定義順を取得できるようにします。

別途Gameplay用Priority値をMusicChartへ追加することは必須としません。

Current Normal AttackEventの決定アルゴリズムは、[Charge Allocation仕様](/spec/draw-system/charge-allocation)を正とします。

### Current判定へ提供するデータ

Allocation側がCurrent Normal AttackEventを一意に判断できるよう、MusicChartから少なくとも以下を取得可能にします。

```text
Normal AttackEvent
├─ Charge受付中か判断できるTiming情報
├─ Fire Music Position
└─ MusicChart定義順
```

MusicChart自身はCurrentを決定しません。

---

## Chord AttackEvent

`Type = Chord`では、各`Music Requirement Entry`にexact MIDI Noteを保持します。

例：

```text
Entry 1 = C4
Entry 2 = E4
Entry 3 = G4
```

Gameplay上のSlotは、それぞれのEntryから導出したPitch Classを使用して対応付けられます。

```text
C4 → C Slot
E4 → E Slot
G4 → G Slot
```

Chordの成立判定、使用するReserved Shaondama、Palette Bullet化、Buff発生条件は本ページでは定義しません。

---

## Arpeggio AttackEvent

`Type = Arpeggio`では、各`Music Requirement Entry`から少なくとも以下を一意に取得できる必要があります。

- exact MIDI Note
- 音楽上の順序
- 音楽的Timing

概念上、

```text
Entry 1
├─ MIDI Note = C4
└─ Timing = T1

Entry 2
├─ MIDI Note = E4
└─ Timing = T2

Entry 3
├─ MIDI Note = G5
└─ Timing = T3
```

とします。

### Entry順序

Arpeggioの配列順そのものを音楽上の順序として扱うか、`Order`等の値を明示するかは実装設計時に決めて構いません。

ただし仕様上、

> **各Entryの音楽的順序を一意に取得できること**

は必須です。

### Entry Timing

各Arpeggio EntryのTimingは、

> **同じMusicChart / TempoMapの音楽時間軸へ変換可能な情報**

として保持します。

具体的なSerializable表現は実装へ委譲します。

Arpeggioの発射順・各Timingでの消費・解決完了条件は、[BGM 攻撃判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

---

## AttackEventのloop境界validation

1つのNormal AttackEventは、1つのBGM loop occurrence内で完結するデータとして定義します。

特にArpeggioでは、次のすべてが同じloop区間内に存在しなければなりません。

- AttackEventの`Fire Music Position`
- 最初のArpeggio Entry Timing
- 途中のArpeggio Entry Timing
- 最後のArpeggio Entry Timing

```text
有効

Loop N
├─ Fire Music Position
├─ Entry 1
├─ Entry 2
└─ Entry 3
```

```text
無効

Loop N
├─ Fire Music Position
├─ Entry 1
└─ Entry 2

Loop N + 1
└─ Entry 3
```

曲末付近に配置したAttackEventのArpeggio Entryを、次loop先頭まで継続させるデータは作成しません。Runtime側で次loopへ分割、繰越、clamp、自動補正する方式も採用しません。

EditorまたはImport後validationでは、MusicChartが使用する有効なBGM loop区間を参照し、AttackEventが同一loop内で完結することを確認できるようにします。loop区間をMusicChartへ直接保存するか、BGM再生設定から参照するかという具体的な保存構造は本ページでは固定しません。

このvalidationはAttackEventの`Fire Music Position`とArpeggio Entry Timingを対象とします。冒頭AttackEventのPreview／Charge開始を曲本編位置0より前へ確保する処理は、loop跨ぎではなくsystem pre-rollとの接続として扱います。

---

## Harmony

AttackEventには、現行どおりHarmony情報を保持できるようにします。

```text
Harmony
├─ Root
└─ Quality
```

Harmonyの具体的な音楽的意味は、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

MusicChart側は、その値を保存できるデータ構造を提供します。

Complete Chord判定やBuff発生条件は本ページでは再定義しません。

---

## Fixed AttackEvent / Random Candidateの共通構造

通常配置する固定AttackEventと、Random Section内のAttackEvent Candidateで、別々のAttackEventデータ形式は作りません。

Random Candidateも通常AttackEventと同じ構造を使用し、少なくとも以下を表現できるようにします。

- `Fire Music Position`
- `Type`
- `Music Requirement Entries`
- 各Entryのexact MIDI Note
- Arpeggio順序 / Timing
- `Harmony`
- `Timing Override`

これにより、抽選後のCandidateを通常のNormal AttackEventと同じデータ契約で扱えるようにします。

---

## Random Sections

Random SectionはMIDIから自動生成せず、MusicChartへ手動設定します。

```text
Random Section
├─ 開始位置
├─ 終了位置
├─ AttackEvent候補
└─ 選択数
```

### CandidateのTiming Settings

Random Candidateにも通常AttackEventと同じTiming解決規則を使用します。

```text
MusicChart曲共通Timing Settings
↓
必要ならCandidate自身のTiming Override
```

Random専用の別Timingシステムは作りません。

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

## DefinitionとRuntime Occurrence

MusicChartは、BGM・NoteEvent・Normal AttackEvent等の**静的なDefinition**を保持します。

Runtimeで進行中の状態そのものはMusicChart.assetへ保存しません。

```text
MusicChart
= Definition

Runtime Gameplay
= Definitionを参照して生成・進行する状態
```

MusicChartに保存しないRuntime状態には、少なくとも以下を含みます。

- Current Normal AttackEvent
- AttackEvent occurrence
- Loop count
- Slot Occupied / Empty
- Reserved Shaondama
- Complete / Incomplete / Zero Charge
- 動的Weak AttackEvent
- Weak Reserved Shaondama
- PlayerのCharge状態

### BGM LoopとNormal AttackEvent occurrence

MusicChartにはNormal AttackEventの**Definition**を1つ保持します。

BGM Loop時は同じDefinitionを再利用しますが、Gameplay上は周回ごとに別の論理Occurrenceとして扱えるようにします。

```text
AttackEvent Definition A

Loop 1
→ Occurrence A1

Loop 2
→ Occurrence A2

Loop 3
→ Occurrence A3
```

周回ごとのAttackEvent DefinitionをMusicChartへ事前複製する必要はありません。

```text
MusicChart
= AttackEvent Definition

Runtime
= AttackEvent Definition + Loop Occurrence
```

### NoteEvent occurrence

NoteEventについても、MusicChartが保持するのは曲内の静的Definitionです。

Loop時の特定NoteEvent実体は、

```text
NoteEvent Definition
+
どの周回のOccurrenceか
```

によってRuntime上で一意に扱えるようにします。

具体的なsource NoteEvent occurrence identityの保持方法は、シャオンダマ側のデータ仕様へ委譲します。

### 次loopを含むNoteEvent occurrence検索

Runtimeは、現在loopの終端より後にある「次のNoteEvent」を検索するとき、検索をloop境界で終了せず、次loop先頭のNoteEvent occurrenceまで継続できる必要があります。

```text
Loop N 終端付近
↓
現在loop内に次のNoteEventなし
↓
Loop N + 1先頭から検索継続
↓
最初に成立するNoteEvent occurrence
```

これは、曲末でWildcard ShaondamaをWeak Chargeした場合の対象NoteEvent解決に使用します。

MusicChartは各NoteEventの静的Definitionと曲内位置を保持し、Runtimeが`Definition + loop occurrence`として次周回の実体を一意に解決できるデータを提供します。次NoteEventの検索algorithm、tie-break、Weak Allocation自体は[Charge Allocation仕様](/spec/draw-system/charge-allocation)を正とします。

この検索規則は、AttackEvent／Arpeggioをloop跨ぎで定義する許可ではありません。AttackEventは前節のvalidationどおり同一loop内で完結させます。

### Weak AttackEventとの分離

Weak AttackEventはNormal AttackEventのようにMusicChartへ事前登録しません。

```text
MusicChart.AttackEvents
=
Normal AttackEvent Definitions
```

Weak AttackEventはRuntimeで動的に生成されます。

Weak Allocationに必要なNoteEventは、MusicChartの`NoteEvents`から解決可能である必要があります。

ただし、

- Normal Shaondamaがsource NoteEvent occurrenceを使用する規則
- 万能Shaondamaが対象NoteEventを検索する規則
- tie-break
- Weak AttackEvent生成・Allocation

はMusicChartでは定義せず、[Charge Allocation仕様](/spec/draw-system/charge-allocation)を正とします。

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
| `Minimum Selectable Shaondama Count` | プランナー |
| `MinimumLeadTime` | プランナー |
| `System Pre-roll Duration` | プランナー |
| AttackEventの`Fire Music Position` | サウンド班が提示、プランナーがGameplay採用確認 |
| `Music Requirement Entry`のexact MIDI Note | サウンド班が音楽的内容として提示 |
| `Chord / Arpeggio` | サウンド班が提示 |
| Arpeggio順序 / Timing | サウンド班が提示 |
| `Harmony` | サウンド班が提示 |
| AttackEventをGameplayとして採用するか | プランナー |
| `Preview / Charge Start Offset` | プランナー |
| `Charge Close Offset` | プランナー |
| AttackEvent個別`Timing Override` | 必要に応じてプランナー |
| Random候補の音楽的内容 | サウンド班が提示 |
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
| `Battle Timing Settings` | プログラマー |
| `AttackEvent Timing Settings` | プログラマー |
| `Attack Events` | プログラマー |
| `Random Sections` | プログラマー |
| `Sync Settings` | プログラマー |

プログラマーは、サウンド班・プランナーが決定した内容を独自判断で変更して入力しません。

また、

> **プログラマーが入力する**

というルールは、

> **すべての値をプログラマーが手作業で入力し続けなければならない**

という意味ではありません。

Editor機能等によって入力を補助・自動化することは可能です。

入力方法を変更しても、各データの決定者は変わりません。

---

## Import

MusicChartのMIDI Importでは、MIDIから音楽情報を取得します。

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

- `TempoMap`
- `NoteEvents`

を生成します。

NoteEventsには、MIDIから取得した、

- Pitch
- octave
- Velocity
- Track
- Music Position
- Note Length

を保持し、exact MIDI Noteを復元可能にします。

### Importで生成しないもの

以下はMIDI Importによる自動生成対象としません。

- `BGM AudioClip`
- `Shaondama Settings`
- `Battle Timing Settings`
- `AttackEvent Timing Settings`
- `Attack Events`
- `Random Sections`
- `Sync Settings`

AttackEventの`Music Requirement Entry`にexact MIDI Noteを保存することは、AttackEventをMIDIから自動生成することを意味しません。

AttackEventは、サウンド班・プランナーが確定したGameplay用音楽情報を手動設定データとして保持します。

AttackEventやRandom SectionをMIDIのゲーム専用Trackから自動生成する方式は、現段階では採用しません。

---

## 再Import

MIDIを修正した場合は、MusicChartへ再Importします。

再Importでは、

> **MIDIから生成されたデータだけを更新し、手動設定データは保持する**

ことを基本ルールとします。

```text
再Import

更新
├─ TempoMap
└─ NoteEvents

保持
├─ BGM AudioClip
├─ Shaondama Settings
├─ Battle Timing Settings
├─ AttackEvent Timing Settings
├─ Attack Events
├─ Random Sections
└─ Sync Settings
```

### NoteEventsの更新

MIDI側で、

- Note
- Pitch
- octave
- Velocity
- Track
- Music Position
- Note Length

が変更された場合は、再Import後のNoteEventsへ反映します。

### TempoMapの更新

MIDI側の、

- Tempo
- Tempo変更
- 拍子
- 拍子変更

が変更された場合は、TempoMapへ反映します。

### 手動設定データの保持

MIDIを再Importしても、Unity上で手動設定したデータは自動的に削除・上書きしません。

ただし、

> **保持されることと、再Import後も内容が正しいことは別です。**

MIDI由来の音楽構造が変わった場合は、保持した設定と現在の楽曲との整合性を再確認します。

### AttackEvent exact MIDI Note

Normal AttackEventの`Music Requirement Entry`に保存されたexact MIDI Noteは、**AttackEvent側の手動設定データ**です。

したがって、MIDI再Importによって自動的に書き換えません。

例：

```text
MIDI変更前
AttackEvent Entry = C4

↓ MIDI修正

楽曲上ではC5へ変更
```

この場合でも、

```text
AttackEvent Entry C4
→ 自動でC5へ変更
```

とはしません。

Normal AttackEvent EntryをMIDIの特定NoteEventへ直接リンクすることを必須としていないためです。

### 再Import後の確認

MIDI由来の音楽構造が変更された場合は、少なくとも以下を再確認します。

- `Fire Music Position`
- `Music Requirement Entry`のexact MIDI Note
- Arpeggio Timing
- `Harmony`
- Random Candidate
- `Shaondama Settings`の使用Track
- `System Pre-roll Duration`が冒頭AttackEventの予告開始を確保できるか
- AttackEvent／Arpeggioが有効なloop区間内で完結しているか
- AttackEvent Timing Settingsとの音楽的・Gameplay上の妥当性

#### Track変更

MIDIのTrack名やTrack構成を変更した場合は、`Shaondama Settings`の使用Track設定が現在のMIDIと対応しているか確認します。

削除・変更されたTrackを別のTrackへ自動的に読み替えることは前提としません。

#### 演奏位置・Tempo変更

Tempo、拍子、演奏位置、曲構成等を変更した場合は、Attack EventsやRandom Sectionsが引き続き意図した音楽位置を指しているか確認します。

同時に、各AttackEvent／Arpeggioが1つの有効なBGM loop区間内で完結していることと、冒頭AttackEventのPreview／Charge開始にsystem pre-rollが不足していないことを再確認します。

#### AttackEventの再確認

AttackEventはMIDIから生成されないため、MIDI再ImportだけではAttackEventの音楽的内容は更新されません。

楽曲変更によってAttackEvent側も変更する必要がある場合は、サウンド班・プランナーで内容を再確認し、MusicChartの手動設定を更新します。

将来的にEditor validation等で不整合検出を補助することは可能ですが、現段階で手動設定値の自動修正は仕様化しません。

再Export / 再Importを含む制作工程については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

---

## Sync Settings

`Sync Settings`は、BGMとGameplay上の音楽イベントの**意図しない同期ズレ**を補正するために使用します。

```text
Sync Settings
└─ 同期補正値
```

通常は補正なしを基準とし、実際のゲーム内確認で同期ズレが確認された場合に調整します。

### AttackEvent Timing Settingsとの違い

`AttackEvent Timing Settings`と`Sync Settings`は別責務です。

```text
AttackEvent Timing Settings
=
Gameplayとして意図的に
予告開始・Charge受付終了等を
発火位置より前へ配置するための時間差
```

```text
Sync Settings
=
実行環境・再生処理等による
意図しない同期ズレを補正する値
```

したがって、`Preview / Charge Start Offset`や`Charge Close Offset`を`Sync Settings`へ含めません。

### 決定者

同期補正は、

- プログラマー
- QA

が実機・ゲーム内確認結果をもとに判断します。

### 入力

MusicChartへの補正値の入力はプログラマーが行います。

### 使用目的

FLAC / MIDIの開始位置やTempoが元データから一致していない問題を、恒常的にSync Settingsだけで解決することは前提としません。

元データに問題がある場合は、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)に従って元データを修正します。

---

## 音楽位置の基本ルール

BGM上の位置を指定するデータは、基本的に、

```text
小節
拍
必要に応じてTick
```

で記録可能にします。

例：

```text
16小節目
3拍目
120 Tick
```

実行時は`TempoMap`を使用して、実際のBGM再生位置へ変換します。

```text
小節 / 拍 / Tick
↓
TempoMap
↓
BGM上の再生位置
```

以下のデータは、同一の音楽時間基準へ接続できる必要があります。

- `System Pre-roll Duration`と曲本編位置0の対応
- NoteEventのMusic Position
- Normal AttackEventの`Fire Music Position`
- Arpeggio EntryのTiming
- Random Sectionの開始位置 / 終了位置
- AttackEvent Timing Settingsによる3 Progress
- Weak Allocationで解決されるNoteEvent Timing

BGMとGameplayの最終的な同期規則については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## 他仕様との責務境界

本ページは、MusicChartへ保存する静的データ構造とImport境界だけを正とします。

| 内容 | 正とする仕様 |
| --- | --- |
| MusicChart全体データ構造 | 本ページ |
| TempoMap / NoteEvents保存構造 | 本ページ |
| MIDI Import / 再Import | 本ページ |
| Shaondama最低保証数の保存構造 | 本ページ |
| `System Pre-roll Duration`の保存構造 | 本ページ |
| AttackEvent Timing Settings保存構造 | 本ページ |
| AttackEvent Entry / exact MIDI Note保存契約 | 本ページ |
| AttackEvent／Arpeggioの同一loop内完結validation | 本ページ |
| Random Section保存構造 | 本ページ |
| Sync Settings保存構造 | 本ページ |
| DAW / FLAC / MIDIの制作・Export条件 | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings) |
| サウンド班からUnityまでの制作・受け渡し工程 | [サウンド班制作フロー](/spec/bgm/sound-production-workflow) |
| AttackEventの音楽的意味・3 ProgressのGameplay上の意味 | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| Current Normal AttackEvent / Pitch Class照合 / Slot Allocation / Weak Allocation / Reserved | [Charge Allocation仕様](/spec/draw-system/charge-allocation) |
| Complete / Incomplete / Zero Charge / Palette Bullet化 | [BGM 攻撃判定仕様](/spec/bgm/bgm-attack-judgement) |
| BGMとGameplayの発音・同期 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| NoteEventからのシャオンダマ生成 | [BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama) |
| 選択可能・非Reserved数の監視とWildcard不足補充 | [BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama) |
| Random Sectionの候補・抽選ルール | [BGM Random Section仕様](/spec/bgm/bgm-random-section) |
| PlayerのCharge入力・Action | Player仕様 |

### 本ページで再定義しない内容

以下はMusicChartページで再定義しません。

- Battle準備gateとsystem pre-rollのRuntime進行
- 選択可能・非Reserved Shaondama数のRuntime監視
- 不足数分のWildcard生成要求
- Current AttackEvent選択アルゴリズム
- Click / Drag Charge
- Slot Allocation
- Slot Occupied / Empty
- Reserved
- Weak AttackEvent生成アルゴリズム
- 万能Weakの対象NoteEvent検索
- Complete / Incomplete / Zero Charge判定
- Palette Bullet化
- Palette Bulletの発射対象
- 発音処理
- Buff効果
- Random抽選アルゴリズム
- BGM Loop時のShaondama Lifecycle
- source NoteEvent occurrenceのShaondama保持方法

---

## 未決事項

MusicChartに必要な主要データ契約は確定しています。

残る未決事項は、主に実装表現・調整値です。

### exact MIDI NoteのC#表現

具体型は未確定です。

候補：

```text
MIDI Note Number
```

または、

```text
Pitch
+
octave
```

または専用struct。

ただし、**exact MIDI Noteを一意に取得できること**は確定です。

### Music Time型

小節・拍・Tick等の音楽位置をどのstruct / classで表現するかは未確定です。

### Offset型

`Preview / Charge Start Offset`、`Charge Close Offset`を、

- 秒
- Tick
- Beat
- 専用`MusicTimeOffset`

のどれで保存するかは実装設計時に確定できます。

### Offset具体値

具体値は未定です。

Gameplay調整パラメータとします。

### Shaondama最低保証数

`Minimum Selectable Shaondama Count`を保持することと、その算入条件は確定しています。

具体的な個数は未定で、曲・Battleの調整パラメータとします。

### System Pre-roll Duration

system pre-rollを使用し、MusicChartから時間設定を参照できることは確定しています。

具体的な秒数は未定です。完成BGM／MIDIへ無音を追加せず、冒頭AttackEventの予告／Charge時間を確保できる値として調整します。

### 有効なBGM loop区間の参照方法

AttackEvent／Arpeggioを同一loop内で完結させるvalidationは必須です。

validationが参照するloop開始／終了をMusicChartへ直接保存するか、BGM再生設定から参照するかは実装設計時に確定します。

### Timing Override UI

Inspector上で`Use Override`等をどのように入力させるかは、プログラム / Editor設計へ委譲します。

---

## 関連タスク

<PageRelations />
