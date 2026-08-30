---
title: "BGM MusicChart仕様"
description: Palette BulletにおけるMusicChartのImportデータ、AttackEvent音楽データ、system pre-roll対応、Timing Settings、validation
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
---

# BGM MusicChart仕様

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
├─ system pre-rollとの対応
├─ Shaondama Settings
├─ AttackEvent Timing Settings
├─ Attack Events
├─ Random Sections
└─ Sync Settings
```

---

## 本ページの責務

本ページでは、

> **MusicChartのデータ構造、MIDI Importデータ・Unity上の手動設定データの境界、および静的データvalidation**

を正とします。

主に以下を定義します。

- MusicChart全体のデータ構造
- `BGM AudioClip`
- `TempoMap`
- `NoteEvents`
- system pre-roll時間と曲本編位置0の対応
- `Shaondama Settings`
- `AttackEvent Timing Settings`
- `Attack Events`
- `Random Sections`
- `Sync Settings`
- MIDI Import / 再Import
- MusicChart保存・Import・再Import後のvalidation
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
├─ system pre-rollとの対応             [手動設定]
│  ├─ system pre-roll時間を取得可能な情報
│  └─ pre-roll終了点
│     └─ BGM Audio / 曲本編 Music Position 0
│
├─ Shaondama Settings                 [手動設定]
│  ├─ 使用するTrack
│  ├─ InitialTargetCount
│  └─ MinimumLeadTime
│
├─ AttackEvent Timing Settings        [手動設定]
│  ├─ Preview / Charge Start Offset
│  └─ Charge Close Offset
│
├─ Attack Events                      [手動設定]
│  ├─ Stable ID
│  ├─ Display Code
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
│  ├─ Stable ID
│  ├─ Display Code
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
├─ system pre-rollとの対応
├─ Shaondama Settings
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

## system pre-rollとの対応

MusicChartは、対象曲のBattle音楽runtimeで使用するsystem pre-roll時間と、曲本編位置0との対応を静的データとして保持できる必要があります。

具体的なフィールド名や保存形式は固定しません。ただし、MusicChartから少なくとも以下を一意に取得できることを必須とします。

- system pre-rollの時間
- Battle音楽runtimeの開始点
- system pre-rollの終了点
- system pre-roll終了点とBGM Audioの音源位置0との対応
- system pre-roll終了点と曲本編の`Music Position 0`との対応

概念上の時間関係は次のとおりです。

```text
Battle音楽runtime開始点
= system pre-roll開始点

Battle音楽runtime開始点
+ system pre-roll時間
= system pre-roll終了点
= BGM Audio 音源位置0
= 曲本編 Music Position 0
```

system pre-rollは、音源、完成BGM、またはMIDIへ追加した無音区間として保存しません。BGM Audioはsystem pre-roll中、音源位置0で停止し、pre-roll終了時に音源位置0から再生を開始します。

Battle音楽runtime開始からBGM Audio再生開始までの実行制御、`Battle／Gameplay／MusicChart`の3時計、およびsystem pre-roll中のPreview／Charge受付は、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。本ページは、そのRuntime処理に必要な静的な時間対応とvalidationを所有します。

system pre-rollの具体的な長さはTuning項目とします。秒、Tick、Beat、専用時間型のどれで保存するか、またMusicChart直下または専用Settings内のどこへ保持するかはImplementation Decisionとします。

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
├─ system pre-rollとの対応
├─ Shaondama Settings
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

`InitialTargetCount`と`MinimumLeadTime`は、現行MusicChart構造上のシャオンダマ生成パラメータとして保持します。

`MinimumLeadTime`の具体的な使用規則、および`InitialTargetCount`を最終的にどの生成方式で使用するかは、本ページで確定しません。

具体的な生成ルールは[BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama)を正とし、本ページはその決定に追随して保存構造を更新します。

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

system pre-roll中に発生するPreviewまたはCharge境界も、[system pre-rollとの対応](#system-pre-rollとの対応)を使用して同じBattle音楽runtime上の位置へ解決できる必要があります。BGM Audioがまだ再生されていないことを理由に、別のTiming値へ置き換えません。

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

現行構造ではPreview開始とCharge受付開始に同じOffsetを使用するため、両者は同時刻になり得ます。ただし、validationでは「Preview開始」と「Charge受付開始」を別の意味境界として解決し、両方がBattle音楽runtime開始点以後に存在することを確認します。

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
Preview開始
↓
Charge受付開始
↓
Charge Close
↓
Actual Fire
```

の順で各境界へ到達できる設定とします。Preview開始とCharge受付開始を同じ境界として保存する現行構造では、この2つの同時成立を許可します。

この順序はMusicChart validationで必ず確認します。不正な順序を警告だけで黙認したり、RuntimeでOffsetを自動補正したりしません。具体的なEditor UIや検証コードの構成はプログラム設計へ委譲します。

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

### 最初のAttackEventとsystem pre-roll

MusicChartは、最初のNormal AttackEventについて、曲共通値またはAttackEvent個別Overrideを解決した後の以下の位置を取得できる必要があります。

- Preview開始位置
- Charge受付開始位置
- Charge受付終了位置
- `Fire Music Position`

最初のNormal AttackEventは、`Fire Music Position`が最も早いDefinitionとします。完全に同じ`Fire Music Position`を持つDefinitionが複数ある場合は、MusicChart定義順の最初を基準にします。同時刻に存在するほかのAttackEventも、それぞれ同じvalidationを通過する必要があります。

各位置は、`TempoMap`、有効な`AttackEvent Timing Settings`、およびsystem pre-rollとの対応を使用して、Battle音楽runtime開始点を基準とするRuntime位置へ解決します。

有効なMusicChartでは、少なくとも次を満たす必要があります。

```text
Battle音楽runtime開始点
<= 最初のPreview開始
<= 最初のCharge受付開始
<= 最初のCharge受付終了
<= 最初のAttackEvent発火
```

現行構造では、最初のPreview開始とCharge受付開始が同時刻でも構いません。

最初のPreview開始またはCharge受付開始がBattle音楽runtime開始点より前へはみ出す場合、system pre-rollが必要な先行時間を確保できていないためvalidation errorとします。RuntimeでPreviewを途中から開始したり、Charge受付時間を暗黙に短縮したりして成立させません。

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

## Definition Identifier

MusicChartへ手動設定する固定AttackEvent、Random Candidate、Random Sectionは、並べ替え、Timing変更、MIDI再Import、Runtime Monitor等で同じDefinitionを継続して追跡できるIdentifierを持ちます。

本ページはMusicChartへ保存するIdentifierデータと不変条件を正本とし、Workbench上の表示・編集・Migration方法は[MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench)を正本とします。

### AttackEvent Definition

固定AttackEventとRandom Candidateは、共通のAttackEventデータ構造として次を持ちます。

- 同一MusicChart内で衝突しない内部Stable ID
- MusicChart内で人間が識別するDisplay Code：`ATK-001`、`ATK-002`等

Random Candidate専用の別Identifier形式は作りません。固定AttackEventとRandom Candidateを合わせた同一MusicChart内のAttackEvent Definition全体で、Stable IDおよびDisplay Codeの重複を許可しません。

### Random Section Definition

Random Section自身は、AttackEventとは別に次を持ちます。

- 同一MusicChart内で衝突しない内部Stable ID
- MusicChart内で人間が識別するDisplay Code：`RSEC-001`、`RSEC-002`等

Stable IDの一意性範囲は、固定AttackEvent、Random Candidate、Random Sectionを含む同一MusicChart全体です。Definition種別が異なっても、同じStable IDを使用しません。

### 発行・維持規則

Stable IDとDisplay CodeはDefinition作成時に一度だけ発行し、MusicChartの手動設定データとして保存します。

以下では同じIdentifierを維持します。

- 並べ替え
- Fire Music Position／Section範囲／Timing／音楽的内容の変更
- 同一MusicChart内での既存Definitionの移動
- CandidateのSection間移動
- MIDI再Import

Definitionの複製および別MusicChartへのコピーでは、新しいStable IDとDisplay Codeを発行します。削除済みIdentifierは同じMusicChart内の別Definitionへ再利用しません。

Display CodeはMusicChart単位の単調増加連番とし、`ATK`系列と`RSEC`系列で別々に採番します。固定AttackEventとRandom Candidateは同じ`ATK`採番状態を共有します。番号は1起点の10進数を最低3桁でゼロ埋めし、999を超えた場合も桁を増やして継続します。

別MusicChartでは同じDisplay CodeおよびStable IDが存在し得ます。同一MusicChart内の機械参照にはStable IDを使用し、MusicChartをまたぐ参照ではMusicChart AssetのIdentityとStable IDを組み合わせます。人間向け参照ではMusicChart名とDisplay Codeを組み合わせます。

削除済みDisplay Codeを再利用しないため、次番号等の採番状態もMusicChartの手動設定データとして保持します。採番状態の具体的なデータ表現はImplementation Decisionです。

既存データにIdentifierがない場合は、明示的な一回限りのMigrationまたは修復操作で発行します。Asset読込、画面表示、MIDI再Importのたびに暗黙発行・再発行しません。

### Gameplay規則との分離

Stable IDおよびDisplay Codeは追跡・表示・Validation用であり、Gameplayの処理順、Random抽選、固定AttackEvent優先等を決定しません。

AttackEventの論理順は従来どおりFire Music Positionを基準とし、同一位置ではMusicChart定義順を使用します。

Runtime occurrenceは、少なくともAttackEvent DefinitionのStable IDとLoop occurrenceを対応付けて識別します。所有MusicChartの外へ持ち出す場合はMusicChartのIdentityも含めます。具体的なRuntime ID型は実装へ委譲します。

---

## Fixed AttackEvent / Random Candidateの共通構造

通常配置する固定AttackEventと、Random Section内のAttackEvent Candidateで、別々のAttackEventデータ形式は作りません。

Random Candidateも通常AttackEventと同じ構造を使用し、少なくとも以下を表現できるようにします。

- Stable ID
- Display Code
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
├─ Stable ID
├─ Display Code
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
| system pre-roll時間 | Tuning項目。具体値と最終決定者は未確定 |
| pre-roll終了点とBGM Audio／曲本編位置0の対応 | 本ページの固定データ契約 |
| Gameplay利用候補Track | サウンド班が提示 |
| `使用するTrack` | プランナー |
| `InitialTargetCount` | プランナー |
| `MinimumLeadTime` | プランナー |
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
| system pre-rollとの対応 | プログラマー |
| `Shaondama Settings` | プログラマー |
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
- system pre-rollとの対応
- `Shaondama Settings`
- `AttackEvent Timing Settings`
- `Attack Events`
- `Random Sections`
- `Sync Settings`

AttackEventの`Music Requirement Entry`にexact MIDI Noteを保存することは、AttackEventをMIDIから自動生成することを意味しません。

AttackEventは、サウンド班・プランナーが確定したGameplay用音楽情報を手動設定データとして保持します。

AttackEventやRandom SectionをMIDIのゲーム専用Trackから自動生成する方式は、現段階では採用しません。

### Import後のvalidation

MIDI Importによって`TempoMap`と`NoteEvents`を生成した後は、MusicChartに保持されている手動設定データと組み合わせて[MusicChart validation](#musicchart-validation)を実行します。

Import直後にAttackEventがまだ設定されていない場合、最初のAttackEventに依存する項目は検証対象なしとします。その後、AttackEvent、Timing Settings、system pre-rollとの対応を設定・変更して保存する時点で、同じvalidationを実行します。

Import処理は、validationを通すためにsystem pre-roll時間、AttackEvent Timing Settings、またはAttackEvent位置を自動変更しません。

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
├─ system pre-rollとの対応
├─ Shaondama Settings
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

AttackEvent、Random Candidate、Random SectionのStable IDとDisplay Codeも手動設定データとして維持し、再Import時に再発行・再採番しません。

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
- AttackEvent Timing Settingsとの音楽的・Gameplay上の妥当性
- system pre-roll終了点とBGM Audio／曲本編位置0の対応
- 最初のAttackEventのPreview／Charge先行時間

#### Track変更

MIDIのTrack名やTrack構成を変更した場合は、`Shaondama Settings`の使用Track設定が現在のMIDIと対応しているか確認します。

削除・変更されたTrackを別のTrackへ自動的に読み替えることは前提としません。

#### 演奏位置・Tempo変更

Tempo、拍子、演奏位置、曲構成等を変更した場合は、Attack EventsやRandom Sectionsが引き続き意図した音楽位置を指しているか確認します。

#### AttackEventの再確認

AttackEventはMIDIから生成されないため、MIDI再ImportだけではAttackEventの音楽的内容は更新されません。

楽曲変更によってAttackEvent側も変更する必要がある場合は、サウンド班・プランナーで内容を再確認し、MusicChartの手動設定を更新します。

再Import後は、保持されたsystem pre-rollとの対応、AttackEvent Timing Settings、Attack Eventsを、更新後の`TempoMap`に対して再解決し、[MusicChart validation](#musicchart-validation)を実行します。

不整合はvalidation errorとして検出しますが、手動設定値を自動修正しません。特に、最初のPreviewまたはCharge受付開始がBattle音楽runtime開始点より前へ移動した場合も、PreviewやCharge時間を暗黙に短縮して補正しません。

再Export / 再Importを含む制作工程については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

---

## MusicChart validation

MusicChartは、静的データを保存した時点と、MIDI Import／再Importが完了した時点で、同じvalidation規則を適用します。

少なくとも、以下の契機で検証結果を更新できる必要があります。

- MusicChartの保存
- 初回MIDI Importの完了
- MIDI再Importの完了
- system pre-rollとの対応の変更
- `AttackEvent Timing Settings`の変更
- AttackEvent個別`Timing Override`の変更
- `Fire Music Position`またはArpeggio Entry Timingの変更

Editorの`OnValidate`、保存前処理、Import後処理、専用validation commandなど、具体的な実行方式はImplementation Decisionとします。ただし、保存・Import・再Importの経路によって検証内容を変えてはいけません。

### 必須validation

有効なMusicChartは、少なくとも以下をすべて満たす必要があります。

1. system pre-roll時間と、Battle音楽runtime開始点・pre-roll終了点の対応を一意に取得できる
2. system pre-roll終了点が、BGM Audioの音源位置0および曲本編`Music Position 0`と一致する
3. `TempoMap`を用いて、各AttackEventのPreview開始、Charge受付開始、Charge受付終了、発火を同じBattle音楽runtime上へ解決できる
4. 各AttackEventで、`Preview開始 <= Charge受付開始 <= Charge受付終了 <= 発火`の順序が成立する
5. 各AttackEventのPreview開始がBattle音楽runtime開始点より前へはみ出さない。特に最初のAttackEventを必ず確認する
6. 各AttackEventのCharge受付開始がBattle音楽runtime開始点より前へはみ出さない。特に最初のAttackEventを必ず確認する
7. AttackEvent個別Overrideを使用する場合も、解決後の実効値で同じ条件を満たす
8. 固定AttackEventとRandom Candidateを含むすべてのAttackEvent DefinitionがStable IDとDisplay Codeを持ち、`ATK-xxx` Display Codeが同一MusicChart内で重複していない
9. すべてのRandom Section DefinitionがStable IDとDisplay Codeを持ち、`RSEC-xxx` Display Codeが同一MusicChart内で重複していない
10. 固定AttackEvent、Random Candidate、Random SectionのStable IDが、Definition種別をまたいで同一MusicChart内で重複していない
11. Display CodeがAttackEventでは`ATK-xxx`、Random Sectionでは`RSEC-xxx`の採番契約を満たす

Preview開始とCharge受付開始へ同じOffsetを使用する現行構造では、両者の同時成立を許可します。その他の境界についてもGameplay仕様が同時成立を許可する場合は等号を使用できますが、時間順を逆転させてはいけません。

固定AttackEventだけでなく、最初のAttackEventになり得るRandom Candidateを含むすべてのNormal AttackEvent Definitionを検証対象とします。Runtime抽選によって選ばれない可能性があることを理由に、不正なCandidateを有効データとして残しません。

### 最初のPreview／Charge lead

最初のAttackEventについて、system pre-rollはPreviewとCharge準備に必要な先行時間を確保できる必要があります。

```text
最初のAttackEvent Fire Music Position
+ 有効なPreview / Charge Start Offset
+ system pre-rollとの対応
↓
最初のPreview開始・Charge受付開始のRuntime位置
↓
Battle音楽runtime開始点以後か確認
```

この検証は、具体的なpre-roll秒数やOffset値を本ページで固定するものではありません。設定されたTuning値の組み合わせが、最初のAttackEventに必要な時間関係を満たしているかを確認するものです。

### validation error時の扱い

必須validationを満たさないMusicChartは、対象Battleで使用可能な有効データとして扱いません。

不足または不整合を検出した場合、以下の暗黙補正を行ってはいけません。

- 最初のPreviewをBattle音楽runtime開始時点から途中表示する
- 最初のCharge受付開始を遅らせ、受付時間を短縮する
- 最初のAttackEventだけPreviewなしで発火させる
- Battle音楽runtime開始点より前のPreview／Charge処理を黙って破棄する
- `Fire Music Position`またはTiming OffsetをRuntimeで自動移動する
- BGM AudioまたはMIDIへ無音を自動挿入して辻褄を合わせる
- 欠落・重複したIdentifierをAsset読込、MIDI再Import、Runtime開始時に暗黙再生成して成功扱いにする

validation errorは、system pre-roll時間、AttackEvent Timing Settings、個別Override、Fire Music Position、元の音楽データを明示的に修正するか、Identifier Migration／修復操作を明示的に実行して解消します。

具体的なError表示、保存を拒否するか警告付きで保存可能にするか、Build validationへ接続するかはEditor／Implementation Decisionとします。ただし、errorを無視してRuntimeで暗黙補正した状態を正式挙動にしてはいけません。

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

- Battle音楽runtime開始点
- system pre-roll終了点
- BGM Audio／曲本編の`Music Position 0`
- NoteEventのMusic Position
- Normal AttackEventの`Fire Music Position`
- Arpeggio EntryのTiming
- Random Sectionの開始位置 / 終了位置
- AttackEvent Timing Settingsによる3 Progress
- Weak Allocationで解決されるNoteEvent Timing

BGMとGameplayの最終的な同期規則については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## 他仕様との責務境界

本ページは、MusicChartへ保存する静的データ構造、Import境界、および保存・Import・再Import後のvalidationを正とします。

| 内容 | 正とする仕様 |
| --- | --- |
| MusicChart全体データ構造 | 本ページ |
| TempoMap / NoteEvents保存構造 | 本ページ |
| MIDI Import / 再Import | 本ページ |
| system pre-roll時間と、pre-roll終了点・BGM Audio／曲本編位置0の対応を保存する静的データ契約 | 本ページ |
| MusicChart保存・Import・再Import後のpre-roll／AttackEvent Timing validation | 本ページ |
| 最初のPreview／Charge開始に必要なleadを確保できているかのvalidation | 本ページ |
| AttackEvent Timing Settings保存構造 | 本ページ |
| AttackEvent Entry / exact MIDI Note保存契約 | 本ページ |
| Random Section保存構造 | 本ページ |
| Sync Settings保存構造 | 本ページ |
| DAW / FLAC / MIDIの制作・Export条件 | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings) |
| サウンド班からUnityまでの制作・受け渡し工程 | [サウンド班制作フロー](/spec/bgm/sound-production-workflow) |
| AttackEventの音楽的意味・3 ProgressのGameplay上の意味 | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| Current Normal AttackEvent / Pitch Class照合 / Slot Allocation / Weak Allocation / Reserved | [Charge Allocation仕様](/spec/draw-system/charge-allocation) |
| Complete / Incomplete / Zero Charge / Palette Bullet化 | [BGM 攻撃判定仕様](/spec/bgm/bgm-attack-judgement) |
| 3時計の開始、system pre-rollのRuntime進行、BGM Audio再生開始、およびBGMとGameplayの発音・同期 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| NoteEventからのシャオンダマ生成 | [BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama) |
| Random Sectionの候補・抽選ルール | [BGM Random Section仕様](/spec/bgm/bgm-random-section) |
| PlayerのCharge入力・Action | Player仕様 |

### 本ページで再定義しない内容

以下はMusicChartページで再定義しません。

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
- system pre-rollのRuntime進行
- BGM Audioの実際の再生開始処理
- Buff効果
- Random抽選アルゴリズム
- BGM Loop時のShaondama Lifecycle
- source NoteEvent occurrenceのShaondama保持方法

---

## 未決事項

MusicChartに必要な主要データ契約は確定しています。

残る未決事項は、主に実装表現・調整値です。

### Stable IDのC#表現

Stable IDを`string`、GUID専用型、`Hash128`、専用Value Object等のどれで表現するかはImplementation Decisionです。

ただし、作成後に維持されること、同一MusicChart内で衝突しないこと、複製時に新規発行すること、削除済みIDを再利用しないことは確定仕様です。

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

### system pre-rollの保存形式

system pre-roll時間をMusicChart直下、専用Settings、または等価な時間対応データのどれで保持するかはImplementation Decisionです。

秒、Tick、Beat、専用時間型のどれを使用するかも固定しません。ただし、Battle音楽runtime開始点、pre-roll終了点、および曲本編位置0の対応を一意に取得できる必要があります。

### system pre-roll具体値

system pre-rollの具体的な長さは未定です。最初のPreview／Charge leadを確保できる範囲で調整するTuning項目とします。

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

### Timing Override UI

Inspector上で`Use Override`等をどのように入力させるかは、プログラム / Editor設計へ委譲します。

### validationの実装方式

保存時、Import後、再Import後のvalidationを、`OnValidate`、専用Editor、Import pipeline、Build validation等のどこで実行するかはImplementation Decisionです。

ただし、どの経路でも同じ必須条件を検証し、Runtimeで暗黙補正しないことは確定仕様です。

---

## 関連タスク

<PageRelations />
