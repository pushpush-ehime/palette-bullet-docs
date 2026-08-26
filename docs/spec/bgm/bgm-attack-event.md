---
title: "BGM 攻撃イベント仕様"
description: Palette BulletにおけるAttackEventの音楽構造・Charge受付時間・発火時間・exact MIDI Note契約
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
---

# BGM 攻撃イベント仕様

## 目的

本ページでは、Palette BulletにおけるAttackEventについて、

> **AttackEventがGameplayへ提供する音楽情報・音楽時間情報**

を定義します。

本ページを、以下の正本とします。

- AttackEventの音楽構造
- Normal AttackEventの発火音楽位置
- AttackEventの予告開始・Charge受付開始
- Charge受付終了
- system pre-roll中の冒頭AttackEvent予告・Charge受付
- BGM実再生位置との時間関係
- Chord / Arpeggioの音楽構造
- 各要求音のexact MIDI Note
- Gameplay照合用Pitch Classとの分離
- Arpeggioの音楽的順序・各音の音楽的Timing
- Harmony
- Weak AttackEventが保持する解決済み音楽情報
- BGM Loop時のNormal AttackEvent occurrence
- 1つのAttackEventを同一loop内へ収める音楽境界
- Random Section CandidateとAttackEvent occurrenceの関係
- MusicChartへ要求するAttackEventデータ契約
- Gameplay上のArpeggio AttackEvent分割単位
---

## 本ページの責務

AttackEventは、Gameplayへ「いつCharge対象になるか」「いつ発火するか」「どの音を音楽上要求するか」を提供します。

```text
MusicChart
↓
AttackEvent音楽情報
↓
予告 / Charge受付開始
↓
Charge受付終了
↓
AttackEvent発火
↓
Gameplay側で発火結果を解決
```

本ページでは、AttackEventの**音楽的な意味と時間契約**を定義します。

---

## 他ページとの責務境界

| 内容 | 正本 |
| --- | --- |
| AttackEvent音楽情報 | **本ページ** |
| AttackEvent Fire音楽位置 | **本ページ** |
| 3 Progressの音楽時間関係 | **本ページ** |
| system pre-roll中のPreview / Charge開始条件 | **本ページ** |
| Charge受付開始 / 終了の音楽条件 | **本ページ** |
| 各要求Entryのexact MIDI Note | **本ページ** |
| Chord / Arpeggio構造 | **本ページ** |
| Arpeggio順序 / 音楽的Timing | **本ページ** |
| AttackEventの同一loop内完結条件 | **本ページ** |
| Harmony | **本ページ** |
| Click / Drag入力・ActionState | [Player Charge仕様](/spec/player/player-action-charge) |
| Current Normal AttackEvent | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Slot構造・Slot Allocation | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Weak Allocation / Weak用NoteEvent解決・次loop検索 | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Charge成功時のReserved確定・保持 | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Complete / Incomplete / Zero Charge | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| 使用Reserved Shaondama | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Palette Bullet化・発射対象決定 | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Arpeggio snapshot / 解決完了 | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Palette Bullet発射時の音程音 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| BGMとの実音響同期 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| system pre-roll時計・音源開始offset | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| Pause / Resume音響同期 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| MusicChart上の保存構造・Import・loop validation | [MusicChart仕様](/spec/bgm/bgm-music-chart) |

本ページでは、他ページが正本となるGameplay処理を再判定しません。

---

# AttackEventとは

AttackEventは、BGMの音楽時間上に配置され、GameplayのChargeと攻撃を音楽へ接続するイベントです。

AttackEventには、大きく次の2種類があります。

```text
AttackEvent
├─ Normal AttackEvent
│  ├─ Chord
│  └─ Arpeggio
│
└─ Weak AttackEvent
   └─ 単音
```

---

## Normal AttackEvent

Normal AttackEventは、MusicChartへ事前設定される音楽Gameplay用AttackEventです。

Normal AttackEvent自身が、少なくとも以下の音楽情報を持てる必要があります。

```text
Normal AttackEvent
├─ Fire Music Position
├─ Type
│  ├─ Chord
│  └─ Arpeggio
├─ Music Requirement Entries
│  ├─ exact MIDI Note
│  ├─ Gameplay用Pitch Class
│  └─ Arpeggioの場合は音楽的順序 / Timing
├─ Harmony
│  ├─ Root
│  └─ Quality
└─ Charge timingに必要な情報
```

実際のC#フィールド名、Serializable構造、Inspector上の保存形式は[MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

## Weak AttackEvent

Weak AttackEventは、Normal AttackEventが存在しない場合にAllocation側で生成・割り当てられる単音AttackEventです。

基本構造は、

```text
1 Weak AttackEvent
=
1 Slot
=
1 Reserved Shaondama
```

です。

Weak AttackEventは、

- Chordではない
- Arpeggioではない
- Harmonyを用いたComplete Chordバフ対象ではない

単音Weak Attack用のAttackEventです。

どのNoteEventをWeakへ使用するかは本ページでは決定しません。

[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)でAllocation時に解決済みの情報を受け取ります。

---

# Normal AttackEventが持つ音楽情報

Normal AttackEventは、Gameplay上のSlot要求だけでなく、楽曲上でその要求音が本来表現している**octave込みMIDI Note**を取得できる必要があります。

概念上、各要求音は独立した`Music Requirement Entry`として扱います。

```text
Normal AttackEvent
├─ Fire Music Position
├─ Type
├─ Entry 1
├─ Entry 2
├─ Entry 3
├─ ...
└─ Harmony
```

同じPitch Classを複数要求する場合でもEntryを統合しません。

---

# BGM時間軸

## 基準となる1本のMusic Time

AttackEventごとに独立した複数の時計を進める方式にはしません。

> **1本のBGM音楽時間軸を正本とし、その時間軸に対してオフセットされた3つの参照Progressを使用します。**

3つのProgressは同じ速度で進行します。

```text
① Preview / Charge Start Progress
   最も先行

② Charge Close Progress
   ①より後ろ、Actual BGMより前

③ Actual BGM Progress
   最も後ろ
```

同じAttackEvent音楽位置`T`に対して、それぞれのProgressが`T`へ到達した時点をイベント境界として使用します。

---

## system pre-rollとの接続

Battle開始時は、実音源の再生開始より前にsystem側のpre-roll区間を設けます。冒頭のNormal AttackEventについても、このpre-roll中に`Preview / Charge Start Progress`がFire Music Positionへ到達でき、AttackEventの予告とCharge受付を開始できます。

```text
Battle / MusicChart基準時計開始
↓
system pre-roll
├─ 冒頭AttackEventの予告開始が可能
└─ 冒頭AttackEventのCharge受付開始が可能
↓
pre-roll終了
↓
既存音源を再生位置0から開始
```

pre-rollはGameplay／MusicChart時間側の先行区間です。完成楽曲、音源ファイル、MIDI、およびMIDI由来NoteEventへ物理的な無音を追加する仕様ではありません。

AttackEventのFire Music Positionは、無音を追加して後ろへずらした仮想的な音源位置ではなく、既存の楽曲／MusicChart上の位置を使用します。最初のAttackEventだけPreview時間やCharge受付時間を短縮したり、曲頭より前に必要な予告を破棄したりせず、必要な先行時間をsystem pre-rollで確保します。

pre-roll中を含む基準時計、実音源の開始offset、および音響同期は[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。pre-roll設定の保存とvalidationは[MusicChart仕様](/spec/bgm/bgm-music-chart)へ委譲します。本ページでは、pre-roll中にもAttackEventのPreview／Charge開始境界を評価できるという音楽時間上の契約だけを定義します。

---

## 3つのProgress

```text
Preview / Charge Start Progress が T へ到達
↓
AttackEvent予告開始
+
Charge受付開始

Charge Close Progress が T へ到達
↓
Charge受付終了

Actual BGM Progress が T へ到達
↓
AttackEvent発火
```

したがって、時間関係は以下です。

```text
Preview / Charge Start
↓
Charge受付中
↓
Charge Close
↓
Charge受付終了
↓
Actual BGM
↓
AttackEvent発火
```

---

## Preview / Charge Start

`Preview / Charge Start Progress`がAttackEventのFire Music Positionへ到達した時点で、

```text
AttackEvent予告開始
=
Charge受付開始
```

とします。

「予告されているが、まだChargeできない」という中間状態は設けません。

---

## Charge Close

`Charge Close Progress`が同じAttackEventのFire Music Positionへ到達した時点で、そのNormal AttackEventのCharge受付を終了します。

Charge受付終了後、そのAttackEventは新しいChargeの対象にはなりません。

Current Normal AttackEventの決定アルゴリズム自体は[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

---

## Actual BGM / Fire

Actual BGMの音楽時間がAttackEventのFire Music Positionへ到達した時点で、そのAttackEventは発火します。

発火後の、

- `Complete / Incomplete / Zero Charge`
- 使用Reserved Shaondama
- Palette Bullet化
- Chord / ArpeggioのGameplay発射対象
- Arpeggio snapshot / 解決完了
- Weak発火時の使用実体

は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正とします。

---

## Charge成功時点とAttackEvent発火時点の分離

Charge成功時点で行うのは、Allocation結果を確定し、対象Shaondamaを`Reserved`として保持することまでです。この時点ではPalette Bullet化せず、実際に発射へ使用するReserved Shaondama／Entryも本ページでは確定しません。

```text
Charge成功
↓
Allocation commit
↓
ShaondamaをReservedとして確定
↓
AttackEvent発火まで保持
```

AttackEvent発火後の`Complete / Incomplete / Zero Charge`、使用Reserved Shaondama、Palette Bullet化、およびChord／Arpeggioの発射対象決定は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正とします。本ページは、それらの処理を開始するFire Music Positionと各Entryの音楽的Timingだけを提供します。

---

## Offsetパラメータ

3つのProgressの位置差はパラメータ化します。

概念上、

```text
Preview Lead Offset
Charge Close Lead Offset
```

等により、

```text
Preview Progress
>
Charge Close Progress
>
Actual BGM Progress
```

の関係を作ります。

ただし、以下は本ページでは固定しません。

- 実際のフィールド名
- 秒で保存するか、別の音楽時間単位で保存するか
- Inspector上の構造
- 共通値 / 曲単位override / AttackEvent単位overrideの保存方式
- 具体的なOffset値
- system pre-rollの具体的な長さ

これらの保存構造は[MusicChart仕様](/spec/bgm/bgm-music-chart)で整理します。

本ページが正とするのは、

> **1本のBGM時間軸から一定のoffset関係を持つ3つのProgressによって、予告・Charge開始・Charge終了・発火を判定する**

という音楽時間上の意味です。

Pause / Resume等によって3つの独立タイマーが互いにずれる構造にはしません。

---

# Charge受付期間

## 予告開始 = Charge受付開始

Normal AttackEventのCharge受付期間は、

```text
Preview / Charge Start ProgressがFire位置へ到達
↓
受付開始

〜

Charge Close ProgressがFire位置へ到達
↓
受付終了
```

です。

この期間内にあるNormal AttackEventだけが、Current Normal AttackEventの候補になり得ます。

---

## Charge受付終了

Charge Close到達後は、そのAttackEventへ新たなChargeを受け付けません。

すでに確定済みのAllocation / Reservedをどう保持するかは[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

---

## Current判定へ提供する情報

AttackEvent側は、Current Normal AttackEventの決定に必要な以下の情報を参照可能にします。

- 現在Charge受付中か
- Fire Music Position
- MusicChart定義順

Current Normal AttackEventの最終決定そのものはAllocation側の責務です。

---

# Normal AttackEventの論理順

複数のNormal AttackEventが同時にCharge受付中の場合、音楽時間上の順序はFire Music Positionによって決まります。

## 発火時刻順

```text
AttackEvent A
Fire = T1

AttackEvent B
Fire = T2

T1 < T2
↓
Aが音楽時間上先
```

> **Fire Music Positionが早いAttackEventを先とします。**

---

## 完全同時時のMusicChart定義順

Fire Music Positionが完全に同一の場合のみ、

```text
MusicChart定義順
```

をtie-breakとして使用します。

UI表示順はGameplayロジックの順序判定へ使用しません。

---

# Music Requirement Entry

Normal AttackEventの各要求音は、独立した`Music Requirement Entry`として扱います。

各Entryから、少なくとも以下の音楽情報を一意に取得できる必要があります。

```text
Music Requirement Entry
├─ exact MIDI Note
├─ Gameplay用Pitch Class
└─ Arpeggioの場合
   ├─ 音楽的順序
   └─ 音楽的Timing
```

---

## exact MIDI Note

各Entryは、楽曲上でその要求音が本来表現している**octave込みMIDI Note**を一意に取得できる必要があります。

例：

```text
Entry 1 = C4
Entry 2 = E4
Entry 3 = G4
```

実データ型は現時点では固定しません。

例えば、

- MIDI Note numberを直接保持する
- Pitch + octaveで保持する
- 専用structで保持する

等の実装方法は[MusicChart仕様](/spec/bgm/bgm-music-chart)側で決定できます。

ただし、

> **各Normal AttackEventのMusic Requirement Entryからexact MIDI Noteを一意に取得できること**

は確定仕様です。

---

## Gameplay用Pitch Class

GameplayのSlot照合では、Entryのexact MIDI NoteからPitch Classを扱います。

```text
C4 → C
E4 → E
G4 → G
```

Slot照合時にはoctaveを区別しません。

Slotそのものの構造やAllocation規則は[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

---

## 同音Entry

同じPitch Classを複数要求する場合でも、各要求は独立したEntryとして保持します。

例えば、

```text
Entry 1 = C3
Entry 2 = C4
Entry 3 = E4
```

はGameplay上、

```text
C Slot 1
C Slot 2
E Slot
```

に対応します。

同じPitch Classであることを理由にEntryを統合しません。

また、これは1つのSlotへ複数Shaondamaを重複Chargeすることを意味しません。

---

# Chord

`Type = Chord`では、各要求音を独立したMusic Requirement Entryとして扱います。

例：

```text
Chord AttackEvent

Entry 1
MIDI Note = C4

Entry 2
MIDI Note = E4

Entry 3
MIDI Note = G4
```

Gameplay Allocationでは、各EntryのPitch Classが対応Slotの照合に使用されます。

```text
C4 → C Slot
E4 → E Slot
G4 → G Slot
```

---

## Chord Entry

Chordの各Entryは、AttackEvent内で独立した音楽要求です。

同音を複数要求する場合も独立Entryとして扱います。

```text
C3
C4
E4
```

のようなChordで、2つのCを1つのEntryへ統合しません。

---

## Chord Timing

Chordでは、各Entryは同一のChord音楽タイミングを使用します。

発火時に、どのEntryが実際の攻撃へ使用されるかは[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)へ委譲します。

---

## Harmony

Chordは必要に応じてHarmony情報を保持します。

基本情報は、

```text
Harmony
├─ Root
└─ Quality
```

です。

後続Gameplayが「Complete Chordがどのコード種類だったか」を判断できる音楽情報を提供します。

具体的なバフ内容・数値・継続時間等は本ページでは定義しません。

---

# Arpeggio

Arpeggioでも、各音を独立したMusic Requirement Entryとして扱います。

各Entryは最低限、

```text
exact MIDI Note
+
音楽上の順序
+
音楽的Timing
```

を一意に持ちます。

例：

```text
Entry 1
C4
Timing 1

Entry 2
E4
Timing 2

Entry 3
G5
Timing 3
```

---

## 音楽的順序

Arpeggioの順序には、

- Click順
- Drag選択順
- Shaondama取得順

を使用しません。

AttackEvent自身に定義された音楽順序を正とします。

```text
Entry 1
↓
Entry 2
↓
Entry 3
```

Gameplay側の発射対象判定やEmpty Entryの処理は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)へ委譲します。

---

## 各Entryのexact MIDI Note

Arpeggioの各EntryもChordと同様に、octave込みのexact MIDI Noteを保持できる必要があります。

```text
C4
E4
G5
```

のように、同じAttackEvent内でもEntryごとにoctaveが異なり得ます。

---

## 各Entryの音楽的Timing

各Arpeggio Entryは、自身の音楽的Timingを一意に持ちます。

各Timingは同じBGM音楽時間軸へ変換可能な情報とし、実時間への変換にはMusicChartのTempoMapを利用できる構造とします。

すべてのArpeggio Entryの音楽的Timingは、そのAttackEventのFire Music Positionと同じloop occurrence内へ収めます。loop境界を越えるTimingは許可しません。

Arpeggio発火時のsnapshot、Empty Entryのスキップ、最後のTimingでの解決完了は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正とします。

---
## Gameplay上のArpeggio AttackEvent単位

1つのArpeggio AttackEventは、以下を共有する短い攻撃フレーズとして定義します。

```text
1つのArpeggio AttackEvent
=
1つのCharge受付・解決単位
+
1つのTarget座標snapshot
+
複数のArpeggio Entry
```
ここでいう「1つのCharge受付・解決単位」は、1回のClickまたはDrag入力だけに限定する意味ではありません。

そのAttackEventの各Slotへ確定したAllocation結果全体を、1つのAttackEventとして解決することを表します。

音楽上のアルペジオが長く連続する場合は、Gameplay上の攻撃単位ごとに複数のArpeggio AttackEventへ分割します。
```text
長い音楽上のArpeggio
↓
Gameplay上の攻撃単位で分割
↓
Arpeggio AttackEvent A
Arpeggio AttackEvent B
Arpeggio AttackEvent C
```
MusicChart上の各Arpeggio AttackEventは、それぞれ独立して以下を持ちます。

- Fire Music Position
- Charge受付期間
- Music Requirement Entries
- Arpeggio順序・Timing

Gameplay Runtimeでは、各AttackEvent occurrenceに対して以下を個別に対応付けます。

- Allocation結果
- 発火時のTarget座標snapshot
- 解決完了状態

前のArpeggio AttackEventで確定したTarget座標を、後続のArpeggio AttackEventへ引き継ぎません。

長いArpeggioをRuntimeで自動分割しません。MusicChart上で、プランナーまたはサウンド担当者がGameplay上のAttackEvent単位を明示的に設定します。

Target候補の優先順位は[パレットブレット](/spec/combat/palette-bullet)、発火時のTarget座標snapshotは[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正本とします。
# Gameplay Pitch Classと実発音MIDI Note

## octaveを無視するSlot照合

Normal AttackEventでは、Gameplay Slot照合と実発音に使用する音高情報を分離します。

```text
Gameplay Slot照合
→ Pitch Class
→ octaveを区別しない
```

例えば、Entryが`C4`で、Shaondamaが`C3`でも、Pitch ClassがCであればC Slotへの照合対象になり得ます。

Allocation成立条件そのものは[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

---

## octaveを含む実発音

Palette Bulletの実発音では、Normal AttackEventのMusic Requirement Entryが持つexact MIDI Noteを使用します。

```text
AttackEvent Entry
C4

Reserved Shaondama
C3

Gameplay Allocation
C3 → C Slot

発音
→ C4
```

したがって、Normal AttackEventでは、

> **AttackEvent側のMusic Requirement Entryが実発音のoctaveを決定します。**

実際の発音処理・音響同期は[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## Shaondama自身のoctaveとの分離

Normal AttackEventでは、Shaondama自身のsource octaveを、そのAttackEventの実発音octaveとして使用しません。

Shaondamaが保持している元の音楽情報を消去するという意味ではありません。

Gameplay上のSlot照合と、AttackEvent発火時の実発音音高の責務を分離します。

---

# 万能Shaondamaとの接続

## Normal AttackEvent

万能Shaondama自身には固有Pitchを持たせません。

万能ShaondamaがNormal AttackEventのEntryへ対応するSlotにAllocationされた場合、その攻撃では、

> **対応するMusic Requirement Entryのexact MIDI Note**

を実効音高として使用します。

例：

```text
Entry = G4
↓
Gameplay上はG Slot
↓
万能ShaondamaをAllocation
↓
AttackEvent発火
↓
G4を実発音音高として使用
```

万能Shaondama自身へ恒久的な`G4`を設定する仕様ではありません。

---

## Weak AttackEvent

Weak AttackEventでは、Normal AttackEventのMusic Requirement Entryを使用しません。

Allocation時に解決済みのNoteEvent / Fire Timing / exact MIDI Noteを使用します。

---

# Weak AttackEvent

## 基本構造

Weak AttackEventが保持する音楽契約は、概念上以下です。

```text
Weak AttackEvent
├─ Resolved NoteEvent information
├─ Resolved Fire Timing
└─ Resolved exact MIDI Note
```

重要なのは、

> **どのNoteEventを使用するかはAllocation時点ですでに解決済みである**

ことです。

---

## Allocation済みNoteEvent

Weak AttackEventは、Allocation時に解決された特定のNoteEventを基準にします。

```text
Weak Allocation
↓
使用NoteEventを解決
↓
Weak AttackEventへ
Resolved NoteEvent
Resolved Fire Timing
Resolved exact MIDI Note
を設定
↓
その確定済み情報を使用
```

発火時にNoteEventを再検索しません。

---

## 発火Timing

Weak AttackEventは、`Resolved Fire Timing`へ到達した時点で発火するための音楽時間情報を保持します。

どのNoteEventが選ばれるか、その検索条件やtie-breakは[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

---

## exact MIDI Note

Weak AttackEventの実発音音高は、Allocation時に解決された`Resolved exact MIDI Note`を使用します。

Normal AttackEventのようにMusic Requirement Entryから音高を再取得する構造ではありません。

```text
Normal AttackEvent
→ Music Requirement Entryのexact MIDI Note

Weak AttackEvent
→ Allocation済みNoteEventのResolved exact MIDI Note
```

---

## Normal / Wildcard差はAllocationへ委譲

Normal Shaondamaと万能Shaondamaでは、Weak Allocation時のNoteEvent解決方法が異なります。

ただし、その差を本ページでWeak AttackEventの一般ルールとして再定義しません。

Allocation側では、現行仕様として、

```text
Normal Shaondama
→ Shaondama自身のsource NoteEvent occurrence

万能Shaondama
→ Charge判定時点より後で最初に発音するNoteEvent
```

へ解決します。万能Shaondamaの検索は現在loop内だけで終了せず、現在loopに候補がなければ次loop occurrenceの先頭から継続します。

次loopを含む検索範囲、完全同時候補のtie-break、解決するNoteEvent definition／loop occurrence、およびWeak AttackEventへの保持方法は[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。本ページでは検索を実行しません。

本ページでは、

```text
Weak AttackEvent
↓
Allocation時に解決済みのNoteEvent
↓
そのNoteEventに対応するFire Timing
↓
そのNoteEventに対応するexact MIDI Note
```

という共通契約だけを定義します。

「Weak AttackEventは必ずChargeしたShaondama自身の生成元NoteEventで発火する」とは一般化しません。

---

# Harmony

HarmonyはAttackEventの音楽情報として保持します。

基本情報は、

```text
Harmony
├─ Root
└─ Quality
```

です。

後続GameplayがChordの種類を判断できるだけの音楽情報を提供します。

本ページでは以下を定義しません。

- バフ内容
- 数値
- 継続時間
- 重複仕様
- Buff Object構造
- UI / VFX

Complete Chordのみがバフ発生条件を満たすという結果判定は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正とします。

---

# Fixed AttackEvent

Random SectionのCandidateとして抽選されないNormal AttackEventについても、本ページで定義するNormal AttackEventの共通契約を使用します。

固有の追加ルールは本ページでは設けません。

すなわち、Fixed側でも、

- Fire Music Position
- Preview / Charge Start
- Charge Close
- Type
- Music Requirement Entries
- exact MIDI Note
- Harmony
- LoopごとのOccurrence

を、同じNormal AttackEvent契約として扱います。

---

# Random Sectionとの関係

Random Sectionの抽選アルゴリズム自体は[BGM ランダムセクション仕様](/spec/bgm/bgm-random-section)を正とします。

AttackEvent側では、

> **その周回で選択されたCandidateだけが、その周回のNormal AttackEvent occurrenceになる**

ものとします。

選択されなかったCandidateは、その周回では、

- 予告しない
- Charge対象にならない
- 発火しない

ものとします。

Random Section Candidateとして使用するAttackEventにも、本ページで定義するNormal AttackEventの音楽データ契約を満たす情報が必要です。

---

# BGM Loop

## AttackEventの同一loop内完結

1つのNormal AttackEvent occurrenceについて、Fire Music Positionと、そのAttackEventに属するChord／Arpeggioの全Music Requirement Entryを同じloop occurrence内へ収めます。

```text
1つのNormal AttackEvent occurrence
├─ Fire Music Position
├─ Chord Entryの発火Timing
└─ Arpeggio全Entryの音楽的Timing

すべて同一loop occurrence内
```

Fire Music Positionが属するloop occurrenceと、いずれかのEntry Timingが属するloop occurrenceが異なるAttackEvent定義は、無効なMusicChartデータとして扱います。MusicChart作成・validation時に検出し、Runtimeへ有効なAttackEvent occurrenceとして渡しません。

Runtimeでは、loopをまたぐAttackEventに対して次の補正を行いません。

- AttackEventをloop境界で複数のEventへ分割する
- 境界を越えたArpeggio Entryを次loopへ繰り越す
- Entry Timingをloop終端へclampまたは自動移動する
- 前loopの途中状態を次loop occurrenceへ持ち越して解決を継続する
- 無効な定義から別の有効なTimingを推測して補完する

同一loop内完結は本ページが定義するauthoring constraintです。保存時・Import時・編集時の具体的なvalidation方法とerror表示は[MusicChart仕様](/spec/bgm/bgm-music-chart)へ委譲します。

この制約はNormal AttackEventのFire Music Positionと発火Entryに対するものです。冒頭AttackEventの先行Preview／Charge開始はsystem pre-rollで確保し、Wildcard Weakの次NoteEvent検索はAllocation側で次loopまで継続します。これらを、Normal AttackEventの発火Entryがloopをまたいでよい根拠にはしません。

---

## AttackEvent Definition

MusicChart上に保存されるAttackEvent定義と、BGM各周回で実際に発生する論理Occurrenceを分離します。

```text
AttackEvent Definition A
├─ Loop 1 / Occurrence A
├─ Loop 2 / Occurrence A
└─ Loop 3 / Occurrence A
```

同じAttackEvent Definitionを再利用しても、各周回のOccurrenceは仕様上区別できる必要があります。

---

## LoopごとのOccurrence

各Normal AttackEvent occurrenceごとに、少なくとも以下を別周回として扱える必要があります。

- Preview / Charge Start
- Charge Close
- Current候補
- 発火
- Slot / Reservedとの対応

これはGameObjectを必ず周回ごとに新規生成するという実装指定ではありません。

> **仕様上、どの周回のAttackEvent occurrenceかを区別できること**

を要求します。

各loop occurrenceは論理上区別しますが、loop境界を理由に音楽時間の進行そのものを不連続にはしません。先行Progressが次loopのAttackEvent occurrenceを評価する場合も、どのloop occurrenceに対するPreview／Charge／Fireかを識別したまま扱います。

この音楽時間上の連続性は、前節の同一loop内完結条件を緩和しません。Normal AttackEventのFire Music Positionと全発火Entryは、引き続き同じloop occurrenceへ属する必要があります。

---

## Random Section再抽選との関係

Random Sectionは各Loopで再抽選する既存仕様を維持します。

各周回で選択されたCandidateだけが、その周回のNormal AttackEvent occurrenceになります。

前周で選択されたCandidateが、次周でも自動的に選択済みとして扱われる仕様ではありません。

---

## Weak occurrenceとの分離

Weak AttackEventは、Allocation済みの特定NoteEvent occurrenceへ紐づきます。

別周回の同名NoteEventへ自動的に付け替えません。

万能ShaondamaのWeak Allocationが次loopまで検索した結果、次loopのNoteEvent occurrenceへ解決された場合は、その解決済みoccurrenceへ最初から紐づくWeak AttackEventとして扱います。これはRuntimeでの自動付け替えではありません。

次loop検索とoccurrence解決の詳細は[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)へ委譲します。

source NoteEvent occurrence等のruntime保持方法は、Shaondamaデータ・生成側の正本へ委譲します。

---

# MusicChartとのデータ契約

## NoteEvents

MIDIからImportするMusicChartのNoteEventsは、引き続き楽曲中の音情報を保持します。

少なくとも現在仕様にある、

- Pitch
- octave
- Velocity
- Track
- 演奏位置
- Note長

を保持します。

したがってMusicChartは、楽曲中の、

```text
C4
E4
G4
C5
...
```

といったexact MIDI Note情報を表現できます。

---

## Attack Events

Normal AttackEventはMIDIから自動生成するものではありません。

手動設定するAttackEvent側にも、そのAttackEventが音楽上表現する各Music Requirement Entryのexact MIDI Noteを保持できる必要があります。

通常のNormal AttackEventでは、NoteEventへの直接参照を必須とはしません。

概念上、

```text
MusicChart
├─ TempoMap
├─ NoteEvents
│  └─ MIDI由来の楽曲情報
│
└─ Attack Events
   └─ Gameplay用AttackEvent音楽情報
      ├─ Fire Music Position
      ├─ Type
      ├─ Music Requirement Entries
      │  ├─ exact MIDI Note
      │  └─ Arpeggio timing等
      ├─ Harmony
      └─ Charge timingに必要な情報
```

という分離とします。

---

## Importデータと手動設定データの境界

```text
MIDI由来のNoteEvents
→ 楽曲そのものの音情報

手動設定するAttack Events
→ Gameplay用AttackEventの音楽情報
```

と分離します。

本ページが定義するのは、

```text
AttackEventに何の情報が必要か
```

です。

Unity / MusicChart上でその情報をどう保存するかは[MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

本ページではC#クラス名や`SerializedField`名まで固定しません。

---

# Gameplayへの出力

Normal AttackEventは、Gameplay側が少なくとも以下を参照できる状態にします。

```text
Normal AttackEvent occurrence
├─ Fire Music Position
├─ Charge受付中か
├─ MusicChart定義順
├─ Type
├─ Music Requirement Entries
│  ├─ exact MIDI Note
│  ├─ Pitch Class
│  └─ Arpeggio順序 / Timing
└─ Harmony
```

Weak AttackEventは、Gameplay側が少なくとも以下を参照できる状態にします。

```text
Weak AttackEvent
├─ Resolved NoteEvent information
├─ Resolved Fire Timing
└─ Resolved exact MIDI Note
```

結果判定・使用実体・Palette Bullet化は本ページでは行いません。

---

# サウンド班・プランナー・プログラマーの責務

本ページでは、役職ごとの具体的な作業手順までは固定しません。

ただし仕様上は、次の責務境界を維持します。

```text
音楽データ
↓
MusicChart.NoteEvents / TempoMap

Gameplay用AttackEvent音楽定義
↓
MusicChart.Attack Events

AttackEventに必要な音楽上の意味
↓
本ページ

Unity上の保存形式・Import・Serialized構造
↓
bgm-music-chart.md

Allocation・Reserved・Current決定
↓
charge-allocation.md

発火時Gameplay結果
↓
bgm-attack-judgement.md

実際の発音・音響同期
↓
bgm-gameplay-connection.md
```

---

# 中心フロー

## Normal AttackEvent

```text
MIDI
↓
MusicChart
├─ TempoMap
├─ NoteEvents
└─ Attack Events
↓
Normal AttackEvent occurrence
↓
system pre-roll中を含む基準時間で
Preview / Charge Start ProgressがFire位置へ到達
↓
AttackEvent予告開始
+
Charge受付開始
↓
Current Normal AttackEvent候補
↓
Allocation
↓
Reserved
（この時点ではPalette Bullet化しない）
↓
Charge Close ProgressがFire位置へ到達
↓
Charge受付終了
↓
Actual BGMがFire位置へ到達
↓
AttackEvent発火
↓
Complete / Incomplete / Zero Charge
↓
使用Reserved Shaondama確定
↓
対応Music Requirement Entry
↓
Palette Bullet化
↓
発射
↓
Entry本来のexact MIDI Noteで発音
```

`Complete / Incomplete / Zero Charge`以降のGameplay結果判定は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正とし、発音は[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## Weak AttackEvent

```text
Current Normal AttackEventなし
↓
Weak Allocation
↓
使用NoteEventを解決
↓
Resolved Fire Timing
+
Resolved exact MIDI Note
↓
Weak AttackEvent
↓
Reserved
（この時点ではPalette Bullet化しない）
↓
Resolved Fire Timing到達
↓
Weak AttackEvent発火
↓
Palette Bullet化
↓
発射
↓
Resolved exact MIDI Noteで発音
```

Normal AttackEventではAttackEvent自身のMusic Requirement Entryが実発音音高を決め、Weak AttackEventではAllocation済みNoteEventのResolved exact MIDI Noteが実発音音高を決めます。

---

# 基本ルールまとめ

- 本ページをAttackEventがGameplayへ提供する音楽情報・音楽時間情報の正本とする
- Normal AttackEventはMusicChartへ事前設定される
- AttackEventごとに独立した3本の時計を持たず、1本のBGM音楽時間軸を正本とする
- その音楽時間軸に対して`Preview / Charge Start`、`Charge Close`、`Actual BGM`の3 Progressを同じ速度で進める
- 冒頭AttackEventの予告・Charge受付はsystem pre-roll中に開始可能とする
- system pre-rollを完成楽曲・音源・MIDI内の無音として追加しない
- 最初のAttackEventだけPreview／Charge受付時間を短縮または破棄しない
- `Preview / Charge Start`到達時に予告開始とCharge受付開始を同時に行う
- `Charge Close`到達時にCharge受付を終了する
- `Actual BGM`がFire Music Positionへ到達した時点でAttackEventを発火する
- 3 Progress間の位置差はパラメータ化する
- Current Normal AttackEventの決定そのものは`charge-allocation.md`を正とする
- 複数の受付中Normal AttackEventはFire Music Positionが早いものを音楽時間上先とする
- Fire Music Positionが完全同時の場合のみMusicChart定義順をtie-breakに使用する
- UI表示順をGameplayロジックの順序判定へ使用しない
- Normal AttackEventの各要求音は独立したMusic Requirement Entryとして扱う
- 各Music Requirement Entryからexact MIDI Noteを一意に取得できるようにする
- Gameplay Slot照合ではPitch Classを使用し、octaveを区別しない
- Normal AttackEventの実発音ではEntry本来のoctave込みexact MIDI Noteを使用する
- Shaondama自身のsource octaveをNormal AttackEventの実発音octaveとして使用しない
- 同じPitch Classを複数要求する場合もEntryを統合しない
- Chordでは各Entryが同一のChord音楽タイミングを使用する
- ArpeggioではAttackEvent自身の音楽的順序・Timingを使用し、Playerの選択順を使用しない
- Normal AttackEventのFire Music PositionとChord／Arpeggio全Entryを同一loop occurrence内へ収める
- loopをまたぐAttackEvent定義は無効なMusicChartデータとし、Runtimeで分割・繰越・自動補正しない
- 万能ShaondamaがNormalへAllocationされた場合は対応Entryのexact MIDI Noteを実効音高として使用する
- Weak AttackEventは`1 Event = 1 Slot = 1 Reserved Shaondama`の単音AttackEventとする
- Weak AttackEventはAllocation時に解決済みのNoteEvent / Fire Timing / exact MIDI Noteを使用する
- Weak発火時にNoteEventを再検索しない
- Normal Shaondama / 万能ShaondamaのWeak用NoteEvent解決方法と、万能Weakの次loop検索は`charge-allocation.md`へ委譲する
- 「Weakは必ずShaondama自身のsource NoteEventで発火する」と一般化しない
- HarmonyはAttackEventの音楽情報として保持する
- MusicChart上のAttackEvent Definitionと各BGM周回の論理Occurrenceを分離する
- Random Sectionでは各周回で選択されたCandidateだけがNormal AttackEvent occurrenceになる
- 選択されなかったCandidateはその周回では予告・Charge対象・発火の対象にしない
- Weak AttackEventはAllocation済みの特定NoteEvent occurrenceに紐づき、別周回へ自動付け替えしない
- Charge成功時点では対象ShaondamaをReservedとして確定するだけで、Palette Bullet化しない
- MusicChart上の具体的な保存形式・C#データ型は`bgm-music-chart.md`へ委譲する
- `Complete / Incomplete / Zero Charge`、使用Reserved Shaondama、Palette Bullet化、発射対象、Arpeggio snapshotは`bgm-attack-judgement.md`へ委譲する
- 実際の発音処理・BGMとの音響同期・Pause / Resumeは`bgm-gameplay-connection.md`へ委譲する
- 1つのArpeggio AttackEventを、1つのCharge受付・解決単位と1つのTarget座標を共有する短い攻撃フレーズとする
- 長い音楽上のArpeggioは、Gameplay上の攻撃単位ごとに複数のArpeggio AttackEventへ分割する
- Arpeggio AttackEventの分割はMusicChart上で明示し、Runtimeで自動分割しない
- 分割後の各AttackEventは、発火時にTarget座標を個別に確定する
---

# 未決事項

今回、AttackEventのゲームロジック上必要な主要な音楽時間・音高契約は確定しています。

残る未決事項は、主に調整値と実装表現です。

## 3 ProgressのOffset具体値

以下の具体的な時間差は未確定です。

```text
Preview / Charge Start
と
Charge Close

Charge Close
と
Actual BGM
```

具体値は調整パラメータとします。

---

## system pre-rollの具体値

system pre-rollの具体的な秒数は未確定です。

pre-roll長は、冒頭AttackEventのPreview／Chargeに必要な先行時間を確保できる調整パラメータとして扱います。具体値を調整しても、完成楽曲・音源・MIDIへ無音を追加しない契約は変更しません。

---

## パラメータ保存構造

以下の具体的な保存方法は[MusicChart仕様](/spec/bgm/bgm-music-chart)で整理します。

- 共通デフォルト値
- 曲単位override
- AttackEvent単位overrideの要否
- Inspector構造
- 実フィールド名
- 時間単位

時間モデル自体は本ページの3 Progress方式で確定しています。

---

## MIDI Entryの実データ型

以下の具体的なC#表現は未固定です。

- MIDI Note numberを直接持つか
- Pitch + octaveで持つか
- 専用structを持つか

ただし、

> **各Normal AttackEventのMusic Requirement Entryからexact MIDI Noteを一意に取得できる**

ことは確定仕様です。

---

## 関連タスク

<PageRelations />
