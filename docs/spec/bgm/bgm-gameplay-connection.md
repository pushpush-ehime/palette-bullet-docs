---
title: "BGMとGameplayの接続"
description: Palette BulletにおけるBGMの時間軸、Gameplay結果の音響接続、Battle終了時の同期解除仕様
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
- Battle開始時の準備gateとsystem pre-roll
- Pause / Resume
- BGM Loop
- Battle終了時のGameplay同期解除・cleanup / Room Retry
- Parry HitStop中のBGM Audio・3時計・AttackEvent同期
- 戦闘BGM / Palette Bullet音程音 / Gameplay SEのレイヤー関係
- Mode／Conductの最低音響保証とGameplay結果との分離

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
- Battle結果の確定・同一frame終了候補の優先順位
- Result表示・Result操作解禁・Result後のroute
- Parry判定batchの収集・Normal / Just評価・HitStop中のParry入力保持

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
Battle ID配布後の準備gate
Battle／Gameplay／MusicChart時計
system pre-rollとBGM Audio開始
Palette Bullet発射と音程音
Gameplay SEとの音響接続
Parry HitStop中のBGM Audio・3時計継続
Parry HitStop中のAttackEvent同期維持
Battle結果確定時の3時計停止
MusicChart Event出力停止
発行待ち通知・予約callback無効化
旧battleId同期event拒否
Gameplay同期解除cleanup完了通知
→ 本ページ

Parry判定batch
Normal / Just評価
Parry HitStop中の入力保持
→ player/player-action-parry.md
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
Battle ID発行・配布
↓
3時計を停止したまま初期化・初期Shaondama生成
↓
Enemy Ready
+
Shaondama Supply Ready
↓
Ready gate成立
↓
Combat受付・Player戦闘入力を有効化
+
Battle／Gameplay／MusicChart時計を同時開始
↓
system pre-roll
+
MusicChart時計進行
↓
既存の戦闘BGMを音源位置0から再生
+
MusicChart時計継続
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

ただし、この接続フローは現在のBattleが結果未確定で、MusicChartからGameplayへのEvent出力gateが有効な間だけ動作します。Battle結果確定後は3時計とGameplay向け同期eventを停止し、「Battle終了」で定義するcleanupへ移行します。

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

# Mode／Conductの音響接続

## 最低音響保証

Modeは、少なくとも完成済みの戦闘BGMへ、Playerが聞き分けられる変化を与えます。Conductは、少なくともPalette Bulletの発射音へ、Playerが聞き分けられる変化を与えます。

ここでいう発射音は、Palette Bulletの発射時にPlayerへ聞こえる音を指します。Conductを音程音、Gameplay上の発射SE、またはその両方のどこへ適用するかは未決です。

完成済みの戦闘BGMを継続して使用し、Player由来音を別レイヤーとして追加する既存構造と、戦闘BGM／Palette Bullet音程音／Gameplay SEのレイヤー分離を維持します。現時点のMode仕様には、BGMの恒常的なTempo変更、拍子変更、楽器編成の変更、別アレンジへの交換、およびRuntimeでのStem／楽器レイヤー切替を含めません。

Conductによる一時的な「だんだん速く／遅く」は将来候補であり、採用するか、および採用する場合のBGM／MusicChart同期方法は未決です。

具体的なAudio Mixer／Mixer Group、DSP、Effect、パラメーター、Wet／Dry、Crossfade、残響Tail、ModeのBGM以外への適用範囲、およびConductの具体的な適用先は未決です。Gameplay上の意味と適用規則は[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)を正本とします。

## 音響とGameplay結果の境界

音、Palette Bulletの見た目・挙動、およびGameplay上の値や結果は、同じ安定したMode／Conduct設定データを参照して別々に決定します。実際にスピーカーから出力された音声波形を解析してDamageなどを決めず、Audio出力の遅延、音量、または端末差によってGameplay結果が変化する方式にはしません。

Mode／Conductを音だけが変わる装飾機能にも、音楽性を伴わない単なる数値装備にもせず、音響とGameplayの双方が同じ設定を参照します。

具体的なDamage、回復、弾速、範囲、および計算順は未決です。本ページでは音響とGameplay結果の接続境界だけを定義し、具体的なGameplay効果を確定しません。

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

# Battle開始とBGMとの同期基準

## 同期開始前の準備gate

Battleの音楽runtimeに対する準備gateは、対象BattleのBattle IDが発行・配布された後に構築します。

Battle IDの発行・配布は、対象Battleの準備開始を示す境界です。この時点では、Combat受付、Player戦闘入力、`Battle／Gameplay／MusicChart`の3時計、system pre-roll、およびBGM Audioを開始しません。

Ready gateを成立させるには、少なくとも以下をすべて満たす必要があります。

- 対象BattleのBattle IDが発行・配布済みである
- 対象Battleの初期化が完了している
- 対象RoomのEnemyが準備完了している
- 必要な初期Shaondamaの出現演出が完了している
- 初期ShaondamaがGameplayへhand-offされ、Playerの選択対象として公開されている
- 必要数の、**現在選択可能かつ`Reserved`ではないShaondama**が準備完了している
- 前Battleの音楽runtime、時計、Audio状態、および同期eventが現在Battleへ残っていない

必要数の定義、算入条件、生成要求、出現演出完了による選択可能化は、Shaondama生成側の正本へ委譲します。

論理生成済み、生成要求中、出現演出中、またはGameplayへのhand-off前のShaondamaは、Shaondama Supply Readyの最低保証数へ算入しません。

準備gateを満たす前は、3時計を開始せず、system pre-roll時間も消費しません。準備待ちの間にBGM AudioまたはMusicChart eventだけを先行させません。

Shaondama Supply Readyの通知後、3時計の開始前に選択可能かつ非`Reserved`のShaondamaが必要数を下回った場合は、準備完了状態を解除し、再びReady条件の成立を待ちます。

本ページは、Ready gateと3時計・BGM Audioの開始関係を正本とします。Enemy Readyの内部判定、初期Shaondama生成、hand-off、選択可能化、および最低保証数の集計方法は、それぞれの所有ページへ委譲します。

---

## Battle開始順

Battle開始時の順序は以下を正とします。

```text
Battle開始要求
↓
新しいBattle IDを発行
↓
Battle IDを各参加システムへ配布
↓
3時計を停止したまま対象Battleを初期化
↓
初期Shaondama生成・出現演出・Gameplayへのhand-off
↓
Enemy Ready
+
Shaondama Supply Ready
↓
Ready gate成立
↓
Combat受付・Player戦闘入力を有効化
+
Battle／Gameplay／MusicChart時計を同じ基準点から同時開始
↓
system pre-roll
├─ AttackEventの予告開始可能
└─ Charge受付可能
↓
system pre-roll終了
↓
既存の戦闘BGMを音源位置0から再生
```

Battle ID配布、Ready gate成立、およびsystem pre-roll終了は、以下の異なる境界として扱います。

| 境界 | 意味 |
| --- | --- |
| Battle ID発行・配布 | 対象Battleの準備を開始する |
| Ready gate成立 | Combat受付・Player戦闘入力・3時計を同じ基準点から開始する |
| system pre-roll終了 | BGM Audioを音源位置0から開始する |

3時計の同時開始点を、当該Battleの音楽runtime開始点とします。戦闘BGMの音源位置0はこの開始点ではなく、system pre-roll終了点へ対応します。

system pre-roll中は、BGM Audioがまだ再生されていなくても、対象BattleのCombat受付とPlayer戦闘入力が有効です。AttackEvent Previewを開始でき、Charge固有の開始条件を満たす場合はChargeも開始できます。

Chargeの具体的な受付条件は[Playerアクション｜チャージ](/spec/player/player-action-charge)を正本とします。本ページでは、Charge開始条件としてBGM Audioの再生状態を要求しません。

---

## system pre-roll

system pre-rollは、音源へ埋め込んだ無音ではなく、**システム側がBattleの音楽runtime上に持つ無音区間**です。

以下の素材へ、system pre-roll用の無音や空小節を追加しません。

- 音源ファイル
- 完成曲
- FLACからImportする`AudioClip`の元素材
- MIDI

MusicChartはsystem pre-roll時間との対応を静的な曲定義として保持できるものとしますが、MIDI由来データそのものへ無音を追加して表現しません。system pre-roll終了時に、既存の戦闘BGMを編集せず音源位置0から再生します。

音源位置0とMIDI由来の曲本編位置0は、いずれもBattle音楽runtime上のsystem pre-roll終了点へ対応します。

system pre-roll時間、最初のAttackEvent Preview開始位置、最初のCharge受付開始位置、および曲本編位置0との対応を保持する静的データ契約は、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正本とします。

MusicChartの保存、Import、再Import、およびEditor validationでは、system pre-rollによって最初のAttackEventに必要なPreview leadとCharge準備時間を確保できているか検証します。検証条件と不正データの扱いはMusicChart側の正本へ委譲し、本ページのruntime側で最初のPreviewやCharge時間を暗黙に短縮・補正しません。

system pre-roll時間は調整可能なパラメータとし、具体値は現時点で固定しません。フィールド名、時間型、保存単位、内部timer、およびAudio再生予約の実装方式も本ページでは固定しません。ただし、system pre-rollとの対応をMusicChartから取得可能にすることは必須とします。

| phase | Combat受付 | Player戦闘入力 | 3時計 | BGM Audio | Shaondama | Preview／Charge |
| --- | --- | --- | --- | --- | --- | --- |
| Battle準備中 | 無効 | 無効 | 停止 | 停止・音源位置0で待機 | 初期生成・出現演出・hand-offを進行 | 無効 |
| Ready gate成立時 | 有効化 | 有効化 | 同じ基準点から同時開始 | 停止・音源位置0で待機 | 必要数が選択可能 | 開始可能 |
| system pre-roll中 | 有効 | 有効 | 同じ時間関係で進行 | 停止・音源位置0で待機 | 選択・Charge可能 | Preview・Charge可能 |
| system pre-roll終了後 | 有効 | 有効 | 同じ時間関係で進行 | 音源位置0から再生 | 通常Battle規則 | 通常のTiming規則 |
| Pause中 | 受付停止 | 受付停止 | 同じ時点で停止 | system pre-roll中なら未再生のまま、再生開始後なら現在位置で停止 | Gameplay状態を保持 | 進行しない |
| Battle結果確定後 | 無効 | 無効 | 3時計を終了位置で停止し、再開しない | Gameplay同期から切り離す。停止・Fade・演出継続はいずれも可 | Gameplay対象として無効 | 新規開始せず、発行待ち通知・callbackも無効 |

Parry HitStopは、この表へ新しい音楽runtime phaseを追加しません。HitStop開始前のphaseを維持したまま、BGM Audio、3時計、system pre-roll、およびAttackEventの進行を継続します。Parry HitStopを理由として`Pause中`の行へ遷移してはいけません。

---

## 同期の基準

BGMとGameplayの音楽同期は、**実際に再生中のBGM Audio時間だけ**を基準とはしません。Audioがまだ再生されていないsystem pre-rollを含め、以下の対応関係を一体として扱います。

- `Battle／Gameplay／MusicChart`時計の共通開始点
- system pre-roll時間
- system pre-roll終了後に始まるBGMの実再生位置
- MusicChart上の音楽位置と`TempoMap`
- 必要な`Sync Settings`補正

```text
Battle／Gameplay／MusicChart時計の共通開始点
↓
system pre-roll
↓
BGM音源位置0
↕
MusicChart上の音楽位置
↓ TempoMap / Sync Settings
AttackEvent
↓
Palette Bullet発射
+
音程音発音
```

Audio再生開始後は実際のBGM再生位置も同期確認に使用しますが、system pre-rollを含む共通の時間関係を捨ててAudio時間だけへ切り替えません。

Gameplay側の描画フレームや、この関係から独立して進む通常ゲーム時間を、BGM同期Gameplayの単独の同期基準にはしません。

Chord / Arpeggio / Weakを含むBGM同期Gameplay音は、同じBattle音楽runtimeとMusicChartの時間関係を使用します。

---

## Sync Settings

BGMとGameplay音の間に再生環境などによるズレが存在する場合は、MusicChartの`Sync Settings`による補正を使用します。`Sync Settings`はsystem pre-rollとの対応を維持したうえで適用し、音源やMIDIへ無音を追加する代わりには使用しません。

具体的な補正値・データ構造・実装方法については、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

# Pause / Resume

## Pause

Pause時は、system pre-rollを含む以下の進行を同じ音楽時間関係のまま停止します。

```text
Pause
↓
Battle／Gameplay／MusicChart時計
+
system pre-roll進行
+
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

system pre-roll中にPauseした場合は、戦闘BGMを開始せず、system pre-rollの残り時間を保持します。Pause中にsystem pre-rollだけを完了させたり、戦闘BGMを音源位置0から開始したりしません。

## Resume

Resume時は、Pauseしたsystem pre-rollまたはBGM位置と音楽時間関係から再開します。

```text
Pause位置
↓
Resume
↓
system pre-roll中
→ 残りsystem pre-rollから再開し、終了後にBGMを音源位置0から再生

BGM再生開始後
→ 同じBGM位置から再開
↓
AttackEvent / Arpeggio / Gameplay音
の同期関係を維持
```

BGMだけが先に進んだり、system pre-rollだけが消費されたり、Arpeggioの発射・発音順序がずれたりしないようにします。

Pauseは同じ`battleId`の同期状態・予約event・再開位置を保持する一時停止です。Battle結果確定時の終了停止は、発行待ち通知と予約callbackを無効化して同じBattleを再開不能にする処理であり、Pause / Resumeと共通化して意味を曖昧にしません。

---

# Parry HitStop

Parry HitStopは、Parry成功時の手触りを強調するための局所的な演出です。

HitStopによってBGM Audio、音楽runtime、またはAttackEventの音楽同期を変更しません。

## 発生条件とbatch単位

Normal ParryとJust Parryのどちらでも、Parry判定batchが成功した場合にHitStopを発生させます。

HitStopの発生単位は邪音玉1弾ではなく、**成功したParry判定batch**です。

同一Physics Stepの同じ成功batch内に複数の邪音玉が含まれていても、HitStopは1batchにつき1回だけ発生させます。

```text
同一Physics Step
↓
邪音玉A / B / Cを同じParry判定batchとして処理
↓
batch成功
↓
A / B / CすべてParry成功
+
HitStopはbatch全体に1回
```

各邪音玉のParry成功callbackからHitStopを個別に要求し、同じbatchで複数回発生させてはいけません。

Just Parryでは、Normal Parryと区別できるようにHitStopの強さと長さを変更できます。Normal / Justそれぞれの具体的な強さ・時間は調整パラメータとし、本ページでは数値を固定しません。

Parry判定batchの収集、Normal / Just評価、およびHitStopパラメータは、[Playerアクション｜パリィ](/spec/player/player-action-parry)を正本とします。本ページは、確定済みのHitStop要求をBGM・3時計・AttackEventへどう接続するかだけを定義します。

## HitStop中のBGM Audioと3時計

Parry HitStop中も、再生中の戦闘BGM Audioを停止しません。

また、以下の3時計を停止、減速、巻き戻し、補正しません。

- `Battle Clock`
- `Gameplay Clock`
- `MusicChart Clock`

```text
Parry HitStop開始
├─ 局所的なHitStop演出を適用
├─ 戦闘BGM Audioは継続
├─ Battle Clockは継続
├─ Gameplay Clockは継続
├─ MusicChart Clockは継続
└─ AttackEvent同期は継続
```

3時計はHitStop開始前と同じ時間関係を保ったまま進行します。HitStop終了時にBGM Audio位置やMusicChart位置をseekしたり、停止していた時間分のoffsetを追加したりしません。

system pre-roll中にParry HitStopが発生した場合も、3時計とsystem pre-rollを進行させます。HitStopによってBGM Audio開始を遅延させず、system pre-roll終了点へ到達した時点で予定どおり音源位置0からBGM Audioを開始します。

HitStop自体とは別にPauseまたはBattle結果確定が成立した場合は、それぞれの節で定義する停止規則を適用します。HitStop中であることを理由として、それらの上位境界を無効化しません。

## HitStop中のAttackEvent

HitStop中も`MusicChart Clock`が進行するため、AttackEventと関連eventは元の音楽時刻どおりに処理します。

対象には少なくとも以下を含みます。

- AttackEvent Preview
- Charge timing
- AttackEvent Fire
- Arpeggio Entry timing
- NoteEventに基づくGameplay通知
- Palette Bullet発射と音程音の発音

HitStopと重なったことを理由として、これらを遅延、再発行、欠落、重複させてはいけません。

```text
MusicChart上の予定時刻へ到達
↓
HitStop中かどうかにかかわらず
対象eventを予定時刻に1回だけ処理
```

HitStop中に到達したAttackEventを終了後までqueueへ保留してまとめて実行したり、HitStop終了時に同じeventを再発行したりしません。

HitStopによってAttackEventの`Complete / Incomplete / Zero Charge`を再判定せず、発火対象、Arpeggio順序、音程音の発音時刻も変更しません。

## Pauseとの分離

Parry HitStopをPauseとして扱いません。

HitStop開始時にPause用の入力gate、時計停止、Audio停止、予約event保持、Resume位置保存を使用しません。HitStop終了時にもPause Resume処理を実行しません。

したがって、Parry HitStopの前後でBGM AudioとMusicChartを再同期する特別な処理は不要です。HitStopは音楽runtimeから見ると時間軸を変更しない局所演出として扱います。

## HitStop中のParry入力

HitStop中のParry Pressを1回分だけ保持する規則、Holdとの区別、HitStop終了時の開始条件・スタミナ再確認、および強制終了時の保持入力破棄は、[Playerアクション｜パリィ](/spec/player/player-action-parry)を正本とします。

本ページではParry入力を保持・再判定しません。また、入力保持のためにBGM Audio、3時計、MusicChart Event出力gateを停止しません。

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

system pre-rollはBattle音楽runtimeの開始時に置く区間であり、通常のBGM Loopごとに音源やMIDIへ無音区間を挿入しません。Loop時は、再度Battle準備gateやsystem pre-rollへ戻らず、BGMとMusicChartを同じ新しい周回へ進めます。

現在位置より後のMusicChart eventを検索する規則がloop境界を越える場合、音楽上の検索は次loopへ連続します。Wildcard Weakの「次のNoteEvent」検索などの具体条件とoccurrence識別は、AllocationおよびMusicChart側の正本へ委譲します。

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

# Battle終了 / Room Retry

## Battle終了

### 本節の責務と同期解除の開始条件

Battle結果の確定、同一frameに複数の終了候補が成立した場合の優先順位、およびResultへの接続は、[ゲーム全体](/spec/game/)を正本とします。

本ページでは、Gameから現在のBattleに対する確定済みBattle結果を受け取った後、BGMとGameplayの同期接続を終了する処理を定義します。`Clear / Game Over`のどちらであっても、Gameplay同期解除の内容は同じです。

Battle終了候補を受け取っただけでは停止しません。同一frame内の終了候補が収集され、Gameが最終Battle結果を一度だけ確定した時点を、同期解除の開始境界とします。

```text
同一frame内のBattle終了候補を収集
↓
GameがBattle結果を確定
↓
BGM / Gameplay同期Ownerへ
BattleResultFinalized(battleId, result)
↓
現在のbattleIdに対する同期解除を開始
```

本ページでは`result`を再判定せず、Gameから通知された確定結果だけを使用します。

---

### 3時計の終了停止

Battle結果確定時に、現在のBattleに属する次の3時計を停止します。

- `Battle Clock`
- `Gameplay Clock`
- `MusicChart Clock`

3時計は、同じBattle終了境界で停止します。

```text
Battle結果確定
↓
Battle Clock停止
+
Gameplay Clock停止
+
MusicChart Clock停止
```

この停止はPauseとは異なり、同じBattleを後からResumeするための一時停止ではありません。停止した3時計を旧Battleのまま再開したり、Retry時に位置を巻き戻して再利用したりしません。

3時計の停止後は、BGM Audioが演出として物理的に再生を続けていても、そのAudio再生位置を現在BattleのGameplay同期基準として使用しません。

system pre-roll中にBattle結果が確定した場合も、3時計とsystem pre-roll進行を停止します。予約済みのBGM Audio開始を無効化し、system pre-roll終了時刻へ後から到達した扱いにして旧BattleのBGMを音源位置0から開始しません。

---

### MusicChart EventのGameplay出力停止

Battle結果確定時に、MusicChartからGameplayへのEvent出力gateを閉じます。

```text
Battle結果確定
↓
MusicChart → Gameplay Event出力gateを閉じる
↓
3時計停止
↓
新しいMusicChart EventをGameplayへ送らない
```

結果確定後は、旧BattleのMusicChart時間軸から、以下を含む新しいGameplay処理を開始しません。

- AttackEventの予告通知
- AttackEventのCharge timing通知
- AttackEvent発火通知
- Arpeggio Entryのtiming通知
- NoteEventに基づくGameplay通知
- Palette Bullet音程音の新規発音要求
- MusicChartに同期したShaondama生成・供給要求
- その他、MusicChart Eventを起点とするGameplay状態変更

各Gameplay Ownerが受け取った後のAttackEvent取消、Reserved Shaondama解放、Projectile無効化などは、それぞれのOwnerページを正本とします。本ページは、それらの起点となるMusicChart同期eventを新たに送らないことを保証します。

終了したBattleに紐づくAttackEventから、新しいPalette Bullet音程音を後から発音しません。Battle結果確定より前にすでに発音開始済みの音を巻き戻すことはしません。

---

### 発行待ち通知・予約callbackの無効化

3時計の停止だけでは、すでにqueueへ登録済みの通知やcallbackが後から実行される可能性があります。そのため、Battle結果確定時に、現在のBattleに属する以下を無効化します。

- Gameplayへの発行待ちMusicChart通知
- system pre-roll終了時のBGM Audio開始予約
- AttackEvent Preview / Charge / Fire用の予約callback
- Arpeggio Entry timing用の予約callback
- BGM同期Gameplay音の予約発音callback
- MusicChart Loop境界に予約されたGameplay callback
- Gameplay Ownerへまだhand-offされていない同期event

予約自体を解除できる場合は取消し、実行基盤の都合でcallbackが呼び出される可能性が残る場合は、実行直前の`battleId`判定とEvent出力gateによって副作用のないno-opとして終了させます。

無効期間中に到達した通知やcallbackをqueueへ保存し、Result中またはRetry後にまとめて実行してはなりません。

AttackEvent Ownerへすでにhand-off済みの発火前AttackEventや発火途中Arpeggioについては、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)のBattle終了cleanupへ委譲します。本ページ側で同じReserved ShaondamaやAttackEvent snapshotを重複して解放・破棄しません。

---

### `battleId`による旧Battle同期eventの拒否

MusicChart Event、Gameplay向け通知、予約callback、Audio開始予約、および同期解除完了通知には、所属Battleを識別できる`battleId`を対応付けます。

本ページ内の「Battle ID」はBattle識別情報の概念名、`battleId`は通知・runtime dataで保持する識別値を表し、同じBattle識別契約を指します。

Gameplay向け同期eventを送る直前に、少なくとも次を確認します。

```text
eventのbattleId
==
現在のBattleのbattleId

かつ

現在のBattleが結果未確定

かつ

MusicChart → Gameplay Event出力gateがOpen
```

いずれか一つでも満たさない場合、その同期eventをGameplayへ送らず破棄します。

旧`battleId`の同期event・callbackによって、以下を行ってはなりません。

- 3時計を進行または再開する
- system pre-rollを完了させる
- BGM Audioを開始する
- MusicChart EventをGameplayへ送る
- AttackEventやArpeggioを進行させる
- Palette Bullet音程音やGameplay SEを新規発音する
- 新Battleの同期状態やcleanup状態を変更する

Retryでは新しい`battleId`を使用します。前Battleのeventが新Battleと同じMusicChart位置・NoteEvent・AttackEventを指していても、別Battleのeventとして拒否します。

Battle結果確定通知とcleanup完了通知は、停止済みGameplay Event出力gateとは別の終了処理用経路で扱います。

---

### BGM Audio・終了SEとGameplay Eventの分離

Battle結果確定時に即時停止する正本対象は、3時計とMusicChartからGameplayへの同期eventです。

BGM Audioや終了SEについては、演出方針に応じて以下のいずれも採用可能とします。

- BGM Audioを即時停止する
- BGM AudioをFade Outする
- Result演出の一部として一定時間継続する
- Clear / Game Over用の終了SEを再生する

ただし、どの演出を採用してもGameplay同期はすでに終了済みです。

```text
Battle結果確定
↓
3時計停止
+
MusicChart → Gameplay Event停止
↓
Gameplay同期解除済み

並行して許可可能
├─ BGM Audio停止
├─ BGM Audio Fade Out
├─ 表示・演出用BGM Audio継続
└─ 終了SE
```

演出として残るAudioから、以下を発生させてはなりません。

- MusicChart Clockの再開・進行
- AttackEvent Preview / Charge / Fire
- Arpeggio Entry進行
- Palette Bullet音程音の新規発音
- Shaondama生成・供給
- Damageやその他のGameplay結果

BGM AudioのFade、終了SE、すでに発音済みの音の余韻は、BGM / Gameplay同期Ownerの必須cleanup完了条件に含めません。これらの演出が継続していても、Gameplay同期解除が完了していれば本Ownerはcleanup完了を通知できます。

---

### 同期解除cleanupの処理順と冪等性

BGM / Gameplay同期Ownerは、現在の`battleId`に対するBattle結果確定通知を一度だけ受理し、次の順序で処理します。

```text
1. BattleResultFinalized(battleId, result)を受理
↓
2. MusicChart → Gameplay Event出力gateを閉じる
↓
3. Battle / Gameplay / MusicChart Clockを同じ終了境界で停止する
↓
4. 発行待ちGameplay通知・予約callbackを無効化する
↓
5. system pre-roll / BGM Audio開始予約を無効化する
↓
6. 旧Battleの同期購読・Gameplay向け参照を終了する
↓
7. 必須cleanup完了条件を確認する
↓
8. battleId付きで同期Ownerの必須cleanup完了を通知する
```

同じBattle結果確定通知を複数回受け取っても、時計停止・callback取消・参照解除を重複実行して不正状態を発生させない冪等処理とします。

```text
Active
↓ 初回のBattle結果確定通知
Cleaning
↓ 必須同期解除完了
CleanupCompleted
```

`Cleaning`または`CleanupCompleted`のBattleへ同じ終了通知が届いても、旧Battleの時計やcallbackを再生成したり、現在Battleの状態へ誤って作用したりしません。

---

### 必須cleanup完了条件

BGM / Gameplay同期Ownerの必須cleanupは、現在の`battleId`について次のすべてを満たした時点で完了とします。

- `Battle Clock`が終了位置で停止している
- `Gameplay Clock`が終了位置で停止している
- `MusicChart Clock`が終了位置で停止している
- MusicChartからGameplayへのEvent出力gateが閉じている
- 発行待ちGameplay通知が無効化されている
- 予約済みGameplay callbackが無効化されている
- system pre-roll進行とBGM Audio開始予約が終了している
- 旧Battleの同期購読・Gameplay向け参照が解除されている
- 旧`battleId`の同期eventがGameplayへ到達できない
- Audio演出が継続していてもGameplay Eventへ再接続できない

すべてを満たした後、上位のcleanup集約Ownerへ、`battleId`付きでBGM / Gameplay同期Ownerの必須cleanup完了を通知します。

```text
BGM / Gameplay必須同期解除完了
↓
CleanupCompleted(battleId)
↓
上位cleanup集約Ownerへ通知
```

Result操作の解禁は本Owner単独では判断しません。全必須Ownerのcleanup完了を集約した上位Ownerが、[ゲーム全体](/spec/game/)の規則に従って判断します。

次の完了は待ちません。

- BGM AudioのFade Out
- 終了SE
- すでに発音済みの音の余韻
- Gameplay Eventを発生させない表示・音響演出

---

### 本ページで固定しないBattle終了詳細

以下は本ページでは固定しません。

- 発射済みPalette Bulletの飛翔継続
- 発射済みPalette Bulletの着弾処理
- Palette Bullet消滅
- すでに発音済みの音の余韻
- BGM Audioを即時停止・Fade Out・演出継続のどれにするか
- Clear / Game Overごとの終了SEと具体的な再生タイミング

これらはPalette Bullet側の正本または演出調整へ委譲します。

---

## Room Retry

Room Retry時は、旧Battleに属する音楽runtimeを破棄します。少なくとも以下を新しいBattleへ持ち越しません。

- 旧Battleの`Battle／Gameplay／MusicChart`時計とその進行位置
- 旧Battleのsystem pre-roll進行状態とBGM再生開始予約
- 旧BattleのBGM再生位置とLoop周回
- 旧Battleの未発音AttackEvent / Arpeggio音
- 旧Battleの発行待ちGameplay通知・予約callback
- 旧BattleのMusicChart Event出力gate・同期購読・Gameplay向け参照

旧Battleの必須Gameplay同期解除が完了したことを確認した後、新しいBattle IDとして新しい`battleId`を発行・配布し、現在Roomの先頭用に定義された音楽初期状態を時計停止中に構築します。新Battleでも、Enemy ReadyとShaondama Supply Readyを含むReady gateが成立するまで3時計、Combat受付、およびPlayer戦闘入力を開始しません。

```text
Room Retry
↓
旧Battleの音楽runtimeを破棄
↓
旧Battleの必須Gameplay同期解除完了を確認
↓
新しいbattleIdを発行・配布
↓
3時計を停止したままRoom先頭用の音楽初期状態を構築
↓
Enemy ReadyとShaondama Supply Readyを待つ
↓
Ready gate成立
↓
Combat受付・Player戦闘入力を有効化
+
新しいBattle／Gameplay／MusicChart時計を同時開始
↓
新しいsystem pre-roll
↓
system pre-roll終了時に既存の戦闘BGMを音源位置0から再生
```

Room Retryは、旧Battleの時計を巻き戻して再利用する処理ではありません。

旧Battleの同期eventやcallbackがRetry後に到着しても、`battleId`不一致として破棄し、新Battleの3時計・system pre-roll・BGM Audio・Gameplay Eventへ影響させません。

Shaondama / Reserved / Player等のGameplay状態リセットについては、それぞれのGameplay正本へ委譲します。

---

# サウンド班・プランナー・プログラマーの責務

本仕様における基本的な責務は以下です。

| 担当 | 主な責務 |
| --- | --- |
| サウンド班 | 戦闘BGM制作、AttackEventの音楽的意図、Palette Bullet音程音・Gameplay SEの音響制作、実際にBGMへ重ねた際の音響確認 |
| プランナー | AttackEventをGameplayとして採用可能か確認、Gameplayルールとの整合確認、必要なゲーム要件の決定 |
| プログラマー | Battle IDに属する準備gateの構築、Ready gate成立時の受付解禁と3時計同時開始、system pre-rollとBGM再生位置の同期、確定済みAttackEvent結果からの発音・発射タイミング制御、Parry HitStop中のBGM Audio・3時計・AttackEvent同期維持、Battle結果確定時の3時計停止・Event出力gate閉鎖・予約callback無効化・`battleId`検証・同期解除完了通知、各音レイヤーを調整可能な再生環境の実装 |

サウンド班は、GameplayのSlot割り当てや`Complete / Incomplete / Zero Charge`の判定ルールそのものを決定しません。

プログラマーは、楽曲上どこをAttackEventとして使用するか、どの音楽表現が適切かを独自に変更しません。

---

# 他仕様との責務境界

| 内容 | 正本 |
| --- | --- |
| Battle開始・終了の高レベルな順序 | [ゲーム全体](/spec/game/) |
| Battle結果の確定・Result操作解禁・Result後のroute | [ゲーム全体](/spec/game/) / `ui/index.md` |
| Battle ID・Combat状態・Combat受付 | [戦闘](/spec/combat/) |
| Ready gateと3時計・BGM Audio・system pre-rollのruntime接続 | **本ページ** |
| Parry HitStop中のBGM Audio・3時計・AttackEvent同期 | **本ページ** |
| Parry判定batch・Normal / Just評価・HitStopの強さと長さ・HitStop中のParry入力保持 | [Playerアクション｜パリィ](/spec/player/player-action-parry) |
| Battle結果確定時の`Battle / Gameplay / MusicChart Clock`停止 | **本ページ** |
| MusicChartからGameplayへのEvent出力停止 | **本ページ** |
| 発行待ちGameplay通知・予約callback・BGM Audio開始予約の無効化 | **本ページ** |
| 旧`battleId`のBGM同期event拒否 | **本ページ** |
| BGM / Gameplay同期Ownerの必須cleanup完了条件・通知 | **本ページ** |
| MIDI / FLAC書き出し条件 | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings) |
| MusicChart構造・TempoMap・Sync Settings・system pre-rollの保存・validation | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| 初期Shaondama生成・最低保証数・Shaondama Supply Ready | [BGM｜シャオンダマ生成](/spec/bgm/bgm-make-syaonndama) |
| RadioWhaleの出現演出・Gameplayへのhand-off | [ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning) |
| Shaondamaの選択可能状態・最低保証への算入可否 | [シャオンダマ｜浮遊挙動](/spec/shaondama-music/floating-behavior) |
| AttackEventの必要音・音楽情報・Chord / Arpeggio・発火時刻 | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| Current Normal AttackEvent / Slot / Weak / Reserved | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Charge入力・Click / Drag・受付gateを含む開始条件・`success / miss` | [Playerアクション｜チャージ](/spec/player/player-action-charge) |
| `Complete / Incomplete / Zero Charge`・使用Reserved・Palette Bullet化・発射対象 | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| 発火前AttackEvent・Arpeggio残Entry・AttackEvent snapshot・未消費ReservedのBattle終了cleanup | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| BGM / Palette Bullet音程音 / Gameplay SEの同期・発音 | **本ページ** |
| Mode／Conductの最低音響保証と、音響／Gameplay結果の分離 | **本ページ** |
| Mode／ConductのGameplay上の意味・選択・適用規則 | [Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct) |
| Shaondama runtime data | [玉のデータ](/spec/shaondama-music/orb-data) |
| 万能Shaondama固有仕様 | [万能シャオンダマ](/spec/shaondama-music/wildcard-orb) |
| Palette Bullet発射後のTarget / 飛翔 / 命中 / Damage / 消滅 | Palette Bullet側の正本 |

---

# Chord / Arpeggio / Weakの音響結果まとめ

以下は、現在のBattleが結果未確定で、MusicChartからGameplayへのEvent出力gateが有効な場合の通常接続です。Battle結果確定後は、未発音のChord / Arpeggio / Weak音を新しく発音しません。

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

## Battle終了時のAudio演出

- BGM Audioを即時停止・Fade Out・演出継続のどれにするか
- Clear / Game Overごとの終了SE
- 具体的な再生時間・Fade時間

これらの演出値は未決です。ただし、Battle結果確定時に3時計とMusicChartからGameplayへのEventを停止し、Audio演出をGameplay同期から切り離すことは確定しています。

## system pre-roll時間

system pre-rollをパラメータとして持つことは確定していますが、具体的な時間は未確定です。

なお、**実際に発音するoctaveそのものは未決事項ではありません。**

通常AttackEventでは、そのSlotが楽曲上で対応するMIDI Noteのoctaveを使用します。

Weak Attackでは、Allocation時に確定したNoteEventのMIDI Note / octaveを使用します。

---

## 関連タスク

<PageRelations />
