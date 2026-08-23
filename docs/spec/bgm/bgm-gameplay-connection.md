---
title: "BGMとGameplayの接続"
description: Palette BulletにおけるBGMの時間軸とGameplay結果の音響接続仕様
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks: []
---

# BGMとGameplayの接続

## 目的

本ページでは、Palette Bulletにおける、

> **BGMの時間軸とGameplay側で確定したAttackEvent結果が、最終的にプレイヤーへ聞こえる音としてどのように接続されるか**

を定義します。

本ページは、主に以下の音響接続を扱います。

- 戦闘BGMとGameplay由来音の関係
- Palette Bullet発射と音程音の同期
- `Complete / Incomplete / Zero Charge`と発音の関係
- Chordの発音
- Arpeggioの発音
- Weak Attackの発音
- Gameplay照合用Pitch Classと実発音用MIDI Noteの関係
- BGM時間軸との同期
- Pause / Resume
- BGM Loop
- Battle終了 / Retry
- 戦闘BGM / Palette Bullet音程音 / Gameplay SEのレイヤー関係

一方、以下は本ページでは再定義しません。

- Charge入力
- Click / DragのAction処理
- Current Normal AttackEventの決定
- Slot割り当て
- Weak Allocation
- Reserved化
- `Complete / Incomplete / Zero Charge`のGameplay上の判定条件
- Chord / Arpeggioで使用するReserved Shaondamaの決定
- Palette Bullet化する対象の決定
- Palette Bullet発射後のTarget / 飛翔 / 命中 / Damage / 消滅
- AttackEventの音楽データ構造そのもの

これらは各正本ページへ委譲します。

---

## 責務の全体構造

```text
Charge入力
Click / Drag
Charge Action success / miss
→ player/player-action-charge.md

Current Normal AttackEvent
Slot割り当て
Weak Allocation
Reserved
→ draw-system/charge-allocation.md

AttackEventの音楽位置
必要音
Chord / Arpeggio
音楽的順序・タイミング
発火時刻
→ bgm/bgm-attack-event.md

AttackEvent発火時
Complete / Incomplete / Zero Charge
使用Reserved Shaondama
Palette Bullet化・発射対象
→ bgm/bgm-attack-judgement.md

BGM時間軸
Palette Bullet発射と音程音
Gameplay SEとの音響接続
→ 本ページ
```

本ページではGameplay判定を再実行しません。

**Gameplay側で確定済みの結果と音楽情報を、実際の再生結果へ接続すること**を責務とします。

---

## BGMとGameplayの全体接続

Palette Bulletでは、完成済みの戦闘BGMを再生しながら、Gameplayによって発生した音をその上へ追加します。

基本構造は以下です。

```text
DAW Project
├─ FLAC
│   ↓
│   UnityへImport
│   ↓
│   AudioClip
│   ↓
│   戦闘BGMとして再生
│
└─ MIDI
    ↓
    MusicChart
    ├─ TempoMap
    └─ NoteEvents
         ↓
         Gameplayで音楽情報として使用
```

AttackEventは`MusicChart`上のGameplay用音楽情報として管理します。

Gameplay側の大まかな接続は以下です。

```text
戦闘BGM再生
+
MusicChart時間軸進行
↓
AttackEvent発火
↓
bgm-attack-judgement.md
でGameplay結果確定
│
├─ Complete
│   ↓
│   全Occupied Slotを使用
│
├─ Incomplete
│   ↓
│   Occupied Slotだけ使用
│
└─ Zero Charge
    ↓
    使用対象なし

使用対象あり
↓
各Slotに対応する音楽タイミング
↓
Reserved ShaondamaをPalette Bullet化
↓
Palette Bullet発射
+
対応するMIDI Noteの音高を発音
+
必要に応じてGameplay SE

使用対象なし
↓
Shaondama由来音程音なし

戦闘BGM自体は継続
```

AttackEventの結果によって、元の戦闘BGMを置き換えたり停止したりはしません。

---

## 音楽再生の基本構造

### 戦闘BGM

ゲーム内で使用する戦闘BGMのマスター素材にはFLACを使用します。

FLACをUnityへImportし、生成された`AudioClip`を戦闘BGMとして再生します。

```text
FLAC
↓
Unity Import
↓
AudioClip
↓
戦闘BGM
```

Unity内部の圧縮形式やLoad TypeなどのImport設定は、対象プラットフォームやパフォーマンス要件に応じて決定します。

FLACそのものを実行時形式として固定することは本ページの目的ではありません。

### MIDI

MIDIはゲーム内の音源として直接再生しません。

MIDIは、

- Tempo
- 拍子
- Note
- Pitch
- octave
- Track
- Velocity
- 演奏位置

などの音楽情報をUnityへ渡すために使用します。

```text
MIDI
↓
MusicChart
├─ TempoMap
└─ NoteEvents
↓
Gameplayで参照
```

MIDIの書き出し条件については、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)を正とします。

MusicChartのデータ構造については、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

## 音の3レイヤー

戦闘中に聞こえる音は、少なくとも以下の3レイヤーへ分けて扱います。

| レイヤー | 役割 |
| --- | --- |
| 戦闘BGM | 完成済み楽曲を再生する |
| Palette Bullet音程音 | Playerが音楽へ参加した結果を鳴らす |
| Gameplay SE | 発射・着弾などGameplayの手触りを表現する |

Palette Bulletの音程音は通常の攻撃SEとは別の役割を持ちます。

```text
Palette Bullet発射
├─ 音楽としての音程音
└─ Gameplayとしての発射SE
```

両方を同時に使用できます。

戦闘BGM、Palette Bullet音程音、Gameplay SEは、最終Mixで個別に調整できる構造とします。

具体的な、

- dB
- EQ
- Compressor
- Reverb
- Ducking
- Spatial設定

などは本ページでは固定しません。

---

# Palette Bullet発射と発音

## 音程音は発射時に鳴らす

Palette Bulletの音程音は、そのPalette Bulletを**実際に発射する音楽タイミング**で鳴らします。

命中時を音程音の基準タイミングにはしません。

```text
Reserved Shaondama
↓
対応する発射タイミング
↓
Palette Bullet化
↓
Palette Bullet発射
+
対応する音程音を発音
```

したがって、

```text
Palette Bullet発射タイミング
=
そのPalette Bulletの音程音発音タイミング
```

を基本とします。

Palette Bulletの飛翔時間や命中タイミングが変化しても、音程音の発音タイミングを命中へ移しません。

---

## Charge成功時にはPalette Bullet化・発音しない

Charge成功時点では、ShaondamaをPalette Bulletへ変換しません。

また、AttackEvent用の音程音も発音しません。

```text
Shaondama
↓
Charge success
↓
AttackEvent / Slot
または
Weak AttackEventへAllocation
↓
Reserved
↓
AttackEvent発火待ち
```

その後、AttackEvent発火処理で使用対象となったReserved Shaondamaを、対応する発射タイミングでPalette Bullet化します。

```text
Reserved Shaondama
↓
AttackEvent発火
↓
使用対象確定
↓
対応する音楽タイミング
↓
Palette Bullet化
↓
発射
+
音程音発音
```

Charge成功時のAllocation / Reserved化については、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

AttackEvent発火時の使用実体・Palette Bullet化・発射対象については、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正とします。

---

## 1 Palette Bullet = 1発音対象

通常AttackEventではGameplay側の基本関係として、

```text
1 Occupied Slot
=
1 Reserved Shaondama
=
1 Palette Bullet
```

を使用します。

音響側もこれに合わせ、

> **発射された1 Palette Bulletについて、そのBulletに対応する1つの音程音を発音する**

ことを基本とします。

Empty Slotについて、架空のPalette Bulletや音程音を生成しません。

同一Slotへ複数Shaondamaを蓄積し、複数音を鳴らす処理は行いません。

---

# 通常AttackEventのGameplay結果と発音

通常AttackEventのGameplay結果は、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)で確定した、

- `Complete`
- `Incomplete`
- `Zero Charge`

をそのまま使用します。

本ページでは、これらの条件を再判定しません。

---

## Complete

`Complete`では、Gameplay側で使用対象となった全Occupied SlotのReserved ShaondamaをPalette Bullet化・発射し、それぞれに対応する音程音を発音します。

```text
Complete
↓
全Occupied Slotを使用
↓
Palette Bullet化・発射
+
使用Bulletすべての音程音を発音
```

`Complete`であることだけを理由に、存在しない追加音を自動生成しません。

実際に発射するPalette Bulletに対応する音だけを鳴らします。

Complete Chordによるバフ条件・効果はGameplay側の正本へ委譲し、本ページでは定義しません。

---

## Incomplete

`Incomplete`でも、Occupied Slotに対応するPalette Bulletは通常どおり発射・発音します。

例えば、

```text
Chord
C / E / G

C [●]
E [ ]
G [●]
↓
Incomplete
```

なら、

```text
C Palette Bullet発射
+
G Palette Bullet発射
↓
Cに対応する音程音
+
Gに対応する音程音
```

を鳴らします。

EmptyなE Slotについては、

```text
Palette Bulletなし
↓
Player由来E音なし
```

とします。

`Incomplete`であることを理由にAttackEvent全体を無音にしません。

---

## Zero Charge

`Zero Charge`では使用するReserved Shaondamaが存在しません。

```text
Zero Charge
↓
使用Reserved Shaondamaなし
↓
Palette Bulletなし
↓
Shaondama由来音程音なし
```

ただし、

- 戦闘BGM
- Zero Chargeを知らせるGameplay SE
- UI / VFX

などは別の責務です。

`Zero Charge`であることを理由に、戦闘BGMを停止・変更・ミュートしません。

正式な失敗SEについては別仕様へ委譲します。

---

# Chordの発音

`Type = Chord`では、使用対象となったOccupied SlotのPalette Bulletを、同じChord音楽タイミングで発射します。

音程音も各Palette Bulletの発射と同時に鳴らします。

Chordの音楽的位置・必要音などは、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

---

## Complete Chord

例えば、

```text
C [●]
E [●]
G [●]
↓
Complete
```

なら、

```text
Chord timing
↓
C / E / G Palette Bulletを同時発射
+
C / E / Gに対応する音程音を同時発音
```

とします。

---

## Incomplete Chord

例えば、

```text
C [●]
E [ ]
G [●]
↓
Incomplete
```

なら、

```text
Chord timing
↓
C / G Palette Bulletのみ同時発射
+
C / Gに対応する音程音のみ同時発音
```

とします。

EmptyなE Slotを補完するためにE音を自動生成しません。

---

## Zero Charge Chord

```text
C [ ]
E [ ]
G [ ]
↓
Zero Charge
↓
Palette Bulletなし
↓
Shaondama由来音程音なし
```

とします。

戦闘BGM自体はそのまま進行します。

---

# Arpeggioの発音

Arpeggioでは、AttackEvent発火時にGameplay側が使用対象をsnapshotします。

本ページではその確定結果を受け取り、**各Palette Bulletが実際に発射されるArpeggio timingで音程音を発音する**ことを定義します。

Arpeggioの、

- 音楽上の順序
- 各Slotの音楽的タイミング

は、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

使用Reserved Shaondamaのsnapshot・Palette Bullet化・解決完了タイミングは、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正とします。

---

## Arpeggioの例

例えば、

```text
Arpeggio
C → E → G

C [●]
E [ ]
G [●]
```

なら、

```text
AttackEvent発火
↓
Incomplete
↓
使用対象snapshot

C timing
→ C Reserved ShaondamaをPalette Bullet化・発射
→ Cに対応する音程音を発音

E timing
→ Palette Bulletなし
→ Player由来E音なし

G timing
→ G Reserved ShaondamaをPalette Bullet化・発射
→ Gに対応する音程音を発音
```

とします。

重要なのは、

> **Empty SlotのArpeggio timingでは、Palette Bullet発射もPlayer由来音程音も発生しない**

ことです。

`Zero Charge`のArpeggioでも、各timingでShaondama由来音程音は鳴りません。

Arpeggio AttackEvent自体の解決完了タイミングは本ページでは再定義しません。

---

# Weak Attackの発音

Weak AttackEventは、通常AttackEventの`Complete / Incomplete / Zero Charge`判定とは分離された単音攻撃です。

基本的な音響接続は以下です。

```text
Weak AttackEvent発火
↓
対応Reserved Shaondama 1つ
↓
Palette Bullet化
↓
単音Weak Attackとして発射
+
対応する音程音を発音
```

基本関係は、

```text
1 Weak AttackEvent
=
1 Reserved Shaondama
=
1 Palette Bullet
=
1音
```

です。

Weak AttackEventの生成・Allocation・使用NoteEventの解決については、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

発火時の使用実体とWeak AttackEvent終了処理については、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正とします。

---

## Weak Attackで使用する音高

Weak Attackの発音時には、**Weak Allocation時にすでに確定したNoteEventのMIDI Note**を使用します。

本ページからNoteEventを再検索しません。

```text
Weak Allocation
↓
使用NoteEvent確定
↓
Weak AttackEvent待機
↓
発火
↓
Palette Bullet化
↓
確定済みMIDI Noteの音高で発音
```

通常Shaondamaと万能Shaondamaでは、使用NoteEventの決定方法が異なります。

### 通常Shaondama

通常Shaondamaでは、Weak Allocation側で解決済みの、

> **そのShaondama自身のsource NoteEvent occurrence**

に対応するMIDI Noteを使用します。

### 万能Shaondama

万能Shaondamaでは、Weak Allocation側で解決済みのNoteEventを使用します。

現行Allocation規則では、Weak Charge判定時点より後で最初に発音するNoteEventを解決対象とします。

本ページでは、その検索をやり直しません。

---

# Gameplay照合用Pitch Classと実発音用MIDI Note

## 2つの役割を分離する

通常AttackEventのSlot照合と、実際にPlayerへ聞かせる音高は、別の情報として扱います。

```text
Gameplay Slot照合
→ Pitch Classを見る
→ octaveは区別しない

実際の発音
→ AttackEventが楽曲上で対応しているMIDI Noteを見る
→ octaveを含む正確な音高で鳴らす
```

通常AttackEventのSlot照合では、引き続きoctaveを区別しません。

例えば、

```text
C3
C4
C5
```

のShaondamaは、Gameplay上はいずれも、

```text
C Slot
```

を満たし得ます。

ただし、Chargeに使用したShaondama自身の元octaveを、そのままPalette Bulletの実発音octaveとして使用するとは限りません。

---

## 実際に発音する音高

通常AttackEventで実際に発音する音高は、

> **そのAttackEvent / Slotが楽曲上で対応しているMIDI NoteのPitchとoctave**

へ合わせます。

例えば、AttackEventが楽曲上、

```text
C4 / E4 / G4
```

を表現している場合に、Playerが、

```text
C3 Shaondama
E5 Shaondama
G3 Shaondama
```

を使用してSlotを満たしても、Gameplay上は、

```text
C3 → C Slot
E5 → E Slot
G3 → G Slot
```

として成立し、発音時には、

```text
C4
E4
G4
```

を鳴らします。

つまり、

```text
Shaondamaの元octave
≠
必ずしもPalette Bulletの実発音octave
```

です。

---

## Palette Bulletは対応MIDI Noteに従って発音する

概念上の接続は以下です。

```text
AttackEvent
↓
Slotが楽曲上で対応するMIDI Note
↓
Reserved Shaondama
↓
対応する発射タイミング
↓
Palette Bullet化
↓
発射
+
対応MIDI Noteの音高を発音
```

そのため、Palette Bulletの発音に必要なのは単なる、

```text
C
E
G
```

というPitch Classだけではなく、

```text
C4
E4
G4
```

のようなoctaveを含む音楽上のNote情報です。

---

## 同音Slot

同じAttackEvent内に同じPitch ClassのSlotが複数存在する場合も、それぞれを独立したSlotとして扱います。

例えば、

```text
C Slot 1
C Slot 2
E Slot
```

があり、2つのC Slotが楽曲上で異なるMIDI Noteまたは異なるArpeggio timingへ対応している場合は、それぞれのSlotに対応する音楽情報を使用します。

単にPitch Classが同じという理由で、実発音音高や音楽タイミングを1つへ統合しません。

具体的なSlotと音楽上のMIDI Noteの対応データ構造は、本ページでは定義しません。

---

# 万能Shaondamaの発音

万能Shaondama自身には恒久的な固有音程を持たせません。

## Normal AttackEvent

Normal AttackEventで万能Shaondamaが特定SlotへAllocationされた場合は、

> **そのSlotが楽曲上で対応しているMIDI Noteの音高**

を、その攻撃での実効音高として使用します。

例えば、

```text
AttackEvent上の対応Note
G4

万能Shaondama
↓
G SlotへAllocation
↓
Reserved
↓
発火
↓
Palette Bullet化
↓
G4として発音
```

とします。

万能Shaondama自身へ恒久的な`G4`を設定する必要はありません。

## Weak AttackEvent

Weakでは、Allocation時に解決済みのNoteEventを使用します。

```text
万能Shaondama
↓
Weak Allocation
↓
使用NoteEventを解決
↓
実効Pitch / octave確定
↓
Weak AttackEvent
↓
発火
↓
Palette Bullet化
↓
確定済みMIDI Noteで発音
```

本ページではWeak用NoteEventを再検索しません。

---

## MIDI Note / octaveのデータ構造

本ページでは、

> **どの音を鳴らすか**

という音響規則を定義します。

一方、以下のデータ構造そのものは本ページで独自に定義しません。

- AttackEventの各SlotがどのMIDI Noteへ対応するか
- octave情報をAttackEvent側のどのフィールドへ保持するか
- NoteEventへの参照をどの形式で保持するか
- MusicChart上でどのように保存するか

これらは、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)および[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)側の正本へ反映します。

::: warning
現在の正本で、通常AttackEventの各Slotから「楽曲上で対応するoctave込みMIDI Note」を一意に取得できない場合は、実装前に`bgm-attack-event.md` / `bgm-music-chart.md`へデータ契約を追加する必要があります。

本ページだけに独自フィールドを追加して解決しません。
:::

Weakで使用するNoteEventやShaondama側のruntime dataについては、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)および[玉のデータ](/spec/shaondama-music/orb-data)を参照します。

---

# 元BGMとの音響的関係

Palette Bulletの音程音は、完成済み戦闘BGMを置き換えるものではありません。

基本構造は常に、

```text
完成済み戦闘BGM
+
Playerが発生させたPalette Bullet音程音
+
Gameplay SE
```

です。

AttackEventが`Complete`でも`Incomplete`でも、

- 元BGMを消さない
- 元BGMの特定音をミュートしない
- 元BGMをPlayer由来音へ置換しない

ものとします。

`Zero Charge`でも元BGMはそのまま進行します。

この構造によって、

> **完成された楽曲を維持しながら、Playerの行動結果によって音楽が追加される**

状態を作ります。

---

# BGMとの同期基準

BGMとGameplayの音楽同期では、

> **実際に再生されているBGMのオーディオ時間軸**

を基準とします。

Gameplay側の描画フレームや、音楽時間軸と独立した通常ゲーム時間を同期基準にはしません。

MusicChart上の、

```text
小節
拍
Tick
```

などの音楽位置を`TempoMap`によって実際のBGM再生位置へ対応させます。

```text
MusicChart上の音楽位置
↓
TempoMap
↓
BGM再生位置
↓
AttackEvent
↓
Palette Bullet発射
+
音程音発音
```

Chord / Arpeggio / Weakを含むBGM同期Gameplay音は、同じBGM時間軸を基準にします。

---

## Sync Settings

BGMとGameplay音の間に再生環境などによるズレが存在する場合は、MusicChartの`Sync Settings`による補正を使用します。

具体的な補正値・データ構造・実装方法については、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

# Pause / Resume

## Pause

Pause時は、以下を同じ音楽時間関係のまま停止します。

```text
Pause
↓
戦闘BGM
+
BGM同期AttackEvent進行
+
未完了Arpeggio
+
BGM同期Gameplay音
↓
停止
```

例えば、

```text
C発射・発音
↓
Pause
↓
E / Gの音楽時間だけ進む
```

という状態にはしません。

未完了Arpeggioの残りtimingもBGMとともに停止します。

## Resume

Resume時は、PauseしたBGM位置と音楽時間関係から再開します。

```text
Pause位置
↓
Resume
↓
同じBGM位置から再開
↓
AttackEvent / Arpeggio / Gameplay音
の同期関係を維持
```

BGMだけが先に進んだり、Arpeggioの発射・発音順序がずれたりしないようにします。

---

# BGM Loop

BGMがLoopする場合は、

```text
BGM再生位置
+
MusicChart音楽時間軸
```

を新しい周回へ同期します。

```text
BGM終端
↓
Loop
↓
新しい周回

MusicChart終端
↓
Loop
↓
同じ新しい周回
```

本ページが正とするのは、

> **新しい周回でもBGMとGameplay音楽イベントが同じ音楽時間軸を使用すること**

です。

以下のGameplay lifecycleは、本ページでは再定義しません。

- Shaondama再生成
- Reserved Shaondama
- 前周回の残存Shaondama
- source NoteEvent occurrence
- Weak AttackEvent
- RadioWhale
- 世界上オブジェクト

各システムのLoop時のライフサイクルは、それぞれの正本を参照します。

---

# Battle終了 / Retry

## Battle終了

Battle終了時は、

```text
Battle終了
↓
戦闘BGM終了
+
未発音のBGM同期音楽イベント終了
```

とします。

終了したBattleに紐づくAttackEventから、新しいPalette Bullet音程音を後から発音しません。

以下は本ページでは固定しません。

- 発射済みPalette Bulletの飛翔継続
- 発射済みPalette Bulletの着弾処理
- Palette Bullet消滅
- すでに発音済みの音の余韻
- BGM Fade Out

これらはPalette Bullet側の正本または演出調整へ委譲します。

---

## Retry

Retry時は、

```text
Retry
↓
BGM
→ 0から再開始

MusicChart
→ 0から再開始

AttackEvent進行
→ 最初から再開始
```

とします。

Retry前の未発音AttackEvent / Arpeggio音を持ち越しません。

Shaondama / Reserved / Player等のGameplay状態リセットについては、それぞれのGameplay正本へ委譲します。

---

# サウンド班・プランナー・プログラマーの責務

本仕様における基本的な責務は以下です。

| 担当 | 主な責務 |
| --- | --- |
| サウンド班 | 戦闘BGM制作、AttackEventの音楽的意図、Palette Bullet音程音・Gameplay SEの音響制作、実際にBGMへ重ねた際の音響確認 |
| プランナー | AttackEventをGameplayとして採用可能か確認、Gameplayルールとの整合確認、必要なゲーム要件の決定 |
| プログラマー | BGM再生、MusicChartとの同期、確定済みAttackEvent結果からの発音・発射タイミング制御、各音レイヤーを調整可能な再生環境の実装 |

サウンド班は、GameplayのSlot割り当てや`Complete / Incomplete / Zero Charge`の判定ルールそのものを決定しません。

プログラマーは、楽曲上どこをAttackEventとして使用するか、どの音楽表現が適切かを独自に変更しません。

---

# 他仕様との責務境界

| 内容 | 正本 |
| --- | --- |
| MIDI / FLAC書き出し条件 | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings) |
| MusicChart構造・TempoMap・Sync Settings | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| AttackEventの必要音・音楽情報・Chord / Arpeggio・発火時刻 | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| Current Normal AttackEvent / Slot / Weak / Reserved | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Charge入力・Click / Drag・`success / miss` | [Playerアクション｜チャージ](/spec/player/player-action-charge) |
| `Complete / Incomplete / Zero Charge`・使用Reserved・Palette Bullet化・発射対象 | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| BGM / Palette Bullet音程音 / Gameplay SEの同期・発音 | **本ページ** |
| Shaondama runtime data | [玉のデータ](/spec/shaondama-music/orb-data) |
| 万能Shaondama固有仕様 | [万能シャオンダマ](/spec/shaondama-music/wildcard-orb) |
| Palette Bullet発射後のTarget / 飛翔 / 命中 / Damage / 消滅 | Palette Bullet側の正本 |

---

# Chord / Arpeggio / Weakの音響結果まとめ

| Attack種別 | Gameplay結果 | 発音 |
| --- | --- | --- |
| Chord | `Complete` | 全Occupied Slotに対応する音をChord timingで同時発音 |
| Chord | `Incomplete` | Occupied Slotに対応する音だけChord timingで同時発音 |
| Chord | `Zero Charge` | Shaondama由来音程音なし |
| Arpeggio | `Complete` | 各Occupied SlotのArpeggio timingで発音 |
| Arpeggio | `Incomplete` | Occupied SlotのArpeggio timingだけ発音 |
| Arpeggio | `Zero Charge` | 各timingでShaondama由来音程音なし |
| Weak | Weak AttackEvent発火 | 対応する1 Palette Bulletの単音を発音 |

---

# 未決事項

以下は現時点では、本ページで固定しません。

## Palette Bullet音色

- 使用楽器
- Synth / Sample方式
- 音色設計

## 音程音制作方式

- 1 Noteごとの個別素材
- Pitch Shift
- Sampler
- Synth
- その他

## Track / Velocity

元MIDIの、

- Track
- Velocity

をPalette Bulletの音色・強さ・表現へどこまで反映するかは未決です。

## Mix

- dB
- EQ
- Compressor
- Reverb
- Ducking
- Gameplay SEとのバランス

## Zero Charge演出

- 失敗SE
- UI
- VFX

これらの具体内容は未決です。

一方、**実際に発音するoctaveそのものは未決事項ではありません。**

通常AttackEventでは、そのSlotが楽曲上で対応するMIDI Noteのoctaveを使用します。

Weak Attackでは、Allocation時に確定したNoteEventのMIDI Note / octaveを使用します。

---

## 関連タスク

<PageRelations />
