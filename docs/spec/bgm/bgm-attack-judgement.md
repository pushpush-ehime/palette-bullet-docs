---
title: "AttackEvent成立判定"
description: Palette BulletにおけるAttackEvent発火時のGameplay結果判定・Reserved Shaondama使用実体仕様
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
---

# AttackEvent成立判定

## 目的

本ページでは、AttackEvent発火時に、

> **Charge時に確定済みのSlot / Reserved Shaondamaを、Gameplay上どの結果として解決し、どの実体を攻撃へ使用するか**

を定義します。

本ページを、以下の正本とします。

- 通常AttackEvent発火時の `Complete / Incomplete / Zero Charge`
- 発火時に使用するReserved Shaondama
- Chordの発射対象・発射タイミング
- Arpeggioの発射対象・発射順・解決完了タイミング
- AttackEvent発火時のPalette Bullet化
- Weak AttackEvent発火時の使用実体・終了処理
- Complete Chord時のバフ発生条件
- AttackEvent発火時のTarget座標snapshot

一方、本ページでは、以下を再定義しません。

- Current Normal AttackEventの決定
- Slot割り当て
- Click / Dragの入力・ActionState
- Charge Actionの`success / miss`
- Weak AttackEventの生成条件・割り当て
- 通常Shaondama / 万能ShaondamaのWeak用NoteEvent解決
- AttackEventの音楽的位置
- Chord / Arpeggio構造
- Arpeggio順序・音楽的タイミング
- AttackEventの発火時刻
- Palette Bullet発射後の飛翔・命中・Damage・消滅
- Markerの有効条件・Lifecycle
- Target候補の優先順位・座標計算・Raycast条件

これらは、それぞれの正本ページへ委譲します。

---

## 責務の全体構造

```text
Click / Drag入力
Charge Action success / miss
→ player/player-action-charge.md

Current Normal AttackEvent
Slot割り当て
Weak Allocation
Reserved化
→ draw-system/charge-allocation.md

AttackEvent音楽位置
Chord / Arpeggio
Arpeggio順序・音楽的タイミング
Harmony
発火時刻
→ bgm/bgm-attack-event.md

AttackEvent発火時
Complete / Incomplete / Zero Charge
使用Reserved Shaondama
Chord / Arpeggio発射対象
Palette Bullet化
Weak発火時処理
→ bgm/bgm-attack-judgement.md
```

本ページでは、他ページの詳細仕様を重複して定義しません。

---

# SlotとReserved Shaondama

## 1 Slot = 最大1 Reserved Shaondama

通常AttackEventの各要求Slotは、以下の2状態で扱います。

```text
Empty
または
Occupied
```

`Occupied`なSlotには、Reserved Shaondamaが**1つだけ**対応します。

```text
1 Slot
=
0 または 1 Reserved Shaondama
```

同一Slotへ複数Shaondamaを蓄積することはありません。

したがって、本ページでは通常AttackEventの成立判定に「SlotごとのCharge数」を使用しません。

---

## Reserved Shaondama

Charge成功したShaondamaは、`charge-allocation.md`で確定したAttackEvent / Slotへ対応付けられ、`Reserved`としてAttackEvent発火を待ちます。

```text
Shaondama
↓
Charge success
↓
AttackEvent / Slotへ対応付け
↓
Reserved
↓
AttackEvent発火待ち
```

Reserved中の、

- Lifetime
- 自然破裂対象からの除外
- 対応AttackEvent解決までの存在保証

などは、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

本ページでは、

> **発火時に各Occupied Slotへ対応付けられているReserved Shaondamaを使用する**

ことだけを定義します。

---

## Charge成功時にはPalette Bullet化しない

Charge成功時点では、ShaondamaをPalette Bulletへ変換しません。

基本フローは以下です。

```text
Shaondama
↓
Charge success
↓
AttackEvent / Slotへ対応付け
↓
Reserved
↓
AttackEvent発火
↓
発火処理でPalette Bullet化
↓
攻撃
```

Palette Bullet化は、AttackEvent発火処理の一部として行います。

---

# 発火時の基本原則

## Allocationをやり直さない

AttackEvent発火時は、Charge時にすでに確定している、

```text
AttackEvent
+
Slot
+
Reserved Shaondama
```

を使用します。

発火時に、以下は行いません。

- 別AttackEventを検索する
- Slotを再割り当てする
- 同音の別Slotへ移す
- 後続AttackEventへ送る
- Weak / Normalを再判定する
- 万能ShaondamaのSlotを再解決する
- 万能ShaondamaのWeak用NoteEventを再検索する
- 実効Pitchを再解決する
- 不足音を再計算する

発火時の責務は、

> **確定済みAllocation結果を解決すること**

です。

## Target座標を発火時にsnapshotする

AttackEventは、発火時にTarget座標を1回だけ確定してsnapshotします。

```text
AttackEvent発火
↓
combat/palette-bullet.mdのTarget優先順位を評価
↓
Target座標を1つ確定
↓
AttackEvent Target Position Snapshotとして保持
↓
同じAttackEventが発射する全Palette Bulletへ使用
```

Target候補の優先順位および座標計算は、パレットブレット(../spec/combat/palette-bullet)を正本とします。

本ページは、その規則をAttackEvent発火時に1回だけ実行し、結果をAttackEventの解決情報として固定することを定義します。

TargetとなったMarkerまたはEnemyへの追従参照は保持しません。

発火後にMarkerやEnemyが移動・消滅してもTarget座標を再取得しません。

この規則は、以下のすべてへ適用します。

- Normal Chord AttackEvent
- Normal Arpeggio AttackEvent
- Weak AttackEvent
- Complete
- Incomplete
- Zero Charge

Zero ChargeでもAttackEvent発火時のsnapshot処理は行いますが、使用するPalette Bulletが存在しないため、確定したTarget座標を使用する攻撃は発生しません。
## Click / Dragの違いを判定材料にしない

発火時には、そのReserved Shaondamaが、

- Click Charge由来
- Drag Charge由来

のどちらであるかを結果判定へ使用しません。

Drag Chargeの、

- Atomic判定
- Release時Current AttackEvent
- 選択リスト
- 全体`success / miss`
- 無効Shaondamaが含まれる場合の全体`miss`
- 部分commit禁止

などは、`player-action-charge.md` / `charge-allocation.md`側で発火前に解決済みとします。

本ページは、最終的なSlot / Reserved結果のみを参照します。

---

# 通常AttackEventの結果判定

通常AttackEventは、発火時点の各要求Slotについて、`Occupied / Empty`を確認します。

判定結果は以下の3種類です。

| 結果 | 条件 | 使用対象 |
| --- | --- | --- |
| `Complete` | すべての要求Slotが`Occupied` | 全Occupied SlotのReserved Shaondama |
| `Incomplete` | 1つ以上`Occupied`かつ1つ以上`Empty` | Occupied SlotのReserved Shaondamaのみ |
| `Zero Charge` | すべての要求Slotが`Empty` | なし |

`Zero Charge`は本ページ上の判定区分です。

プレイヤー向けの正式な失敗名称・UI・VFX・SE等は未決です。

---

## Complete

すべての要求Slotが`Occupied`なら`Complete`です。

```text
C [●]
E [●]
G [●]

→ Complete
```

各`●`は、そのSlotへ対応付けられた1つのReserved Shaondamaを表します。

---

## Incomplete

1つ以上のSlotが`Occupied`で、1つ以上のSlotが`Empty`なら`Incomplete`です。

```text
C [●]
E [ ]
G [●]

→ Incomplete
```

`Incomplete`でも、Occupied Slotに対応するReserved Shaondamaは攻撃へ使用します。

```text
C Reserved Shaondama
+
G Reserved Shaondama
↓
攻撃へ使用
```

未充填Slotが存在することを理由に、AttackEvent全体をキャンセルしません。

また、Empty Slotのために存在しないPalette Bulletを生成しません。

---

## Zero Charge

すべての要求Slotが`Empty`なら`Zero Charge`です。

```text
C [ ]
E [ ]
G [ ]

→ Zero Charge
```

この場合、

- AttackEvent自体の音楽上の発火は行う
- Palette Bullet化するShaondamaは存在しない
- Shaondama由来の攻撃は発生しない

とします。

正式な失敗名称・UI・VFX・SE等は、本ページでは確定しません。

---

# 使用実体とPalette Bullet数

通常AttackEventでは、原則として、

> **1 Occupied Slot = 1 Reserved Shaondama = 1 Palette Bullet**

です。

例えば、

```text
C [●]
E [ ]
G [●]
```

なら、

```text
Occupied Slot = 2
Reserved Shaondama = 2
↓
Palette Bullet = 2
```

です。

Empty Slotから架空のPalette Bulletを生成しません。

また、Slotの数値から新しいShaondama実体を作り直す構造にはしません。

---

# Charge Actionのsuccess / missとの分離

Player Charge Actionで発生する、

```text
success / miss
```

と、AttackEvent発火時の、

```text
Complete / Incomplete / Zero Charge
```

は別処理です。

例えば、

```text
C SlotへのClick Charge
→ success
```

した後にE / Gが埋まらなければ、

```text
AttackEvent発火
→ Incomplete
```

になり得ます。

`Incomplete`だったことを理由に、過去のCharge `success`を後から`miss`へ変更しません。

逆に、Charge時に`miss`だった入力をAttackEvent発火時に再評価しません。

---

# Chord

`Type = Chord`では、AttackEvent発火時に`Complete / Incomplete / Zero Charge`を確定します。

Chordの各Occupied Slotに対応するReserved Shaondamaは、**同一のChord音楽タイミング**でPalette Bullet化・発射します。

---

## Complete Chord

```text
Chord
C / E / G

C [●]
E [●]
G [●]
↓
Complete
↓
C / E / G のReserved ShaondamaをPalette Bullet化
↓
同一音楽タイミングで発射
```

この場合、3つのOccupied Slotに対して3つのReserved Shaondamaを使用し、3つのPalette Bulletを発射します。

---

## Incomplete Chord

```text
Chord
C / E / G

C [●]
E [ ]
G [●]
↓
Incomplete
↓
C / G のReserved ShaondamaのみPalette Bullet化
↓
同一音楽タイミングで発射
```

EmptyなE SlotからPalette Bulletを生成しません。

---

## Zero Charge Chord

```text
Chord
C / E / G

C [ ]
E [ ]
G [ ]
↓
Zero Charge
↓
発射対象なし
```

AttackEvent自体の音楽上の発火は行いますが、Shaondama由来のPalette Bulletは発生しません。

---

# Complete Chordのバフ発生条件

コードの種類によるバフは、今後追加する正式仕様として維持します。

`Complete`となったChordのみ、

> **そのChordの種類に対応するバフの発生条件を満たす**

ものとします。

```text
Chord Complete
↓
攻撃
+
コード種類に対応するバフ発生条件成立
```

`Incomplete`または`Zero Charge`では、Complete Chord用バフの発生条件を満たしません。

本ページが定義するのは、

> **Complete Chordによってバフ発生条件を満たしたか**

までです。

以下は本ページでは定義しません。

- どのコードでどのバフになるか
- バフの具体的効果
- 数値
- 継続時間
- 重複仕様
- UI

AttackEventが保持するHarmony等の音楽情報は、後続のバフ処理でコード種類を判断できるよう引き渡せるものとします。

具体的なバフデータ構造は、バフ側の仕様で定義します。

---

# Arpeggio

`Type = Arpeggio`でも、通常AttackEventと同じく発火時に、

- `Complete`
- `Incomplete`
- `Zero Charge`

を確定します。

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
Incomplete
```

です。

---

## 発火時にsnapshotする

Arpeggio AttackEventは、発火した瞬間に、以下を確定してsnapshotします。

- `Complete / Incomplete / Zero Charge`
- 各Slotの`Occupied / Empty`
- 使用するReserved Shaondama
- AttackEvent全体で共有するTarget座標

```text
AttackEvent発火

C [●]
E [ ]
G [●]
↓
Result = Incomplete
↓
使用対象snapshot
C Reserved Shaondama
G Reserved Shaondama
```

発火後に、Slot状態やAllocation結果を再評価しません。

snapshotした結果とTarget座標を、最後のArpeggio timingの処理が完了するまで維持します。

各Arpeggio timingでTargetを再取得しません。
---

## 発射順

Arpeggioでは、PlayerのCharge順・Drag選択順を使用しません。

発射順は、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)で定義されるAttackEvent側の、

- Arpeggio順序
- 音楽的タイミング

を使用します。

例えばPlayerが、

```text
G → C → E
```

の順で選択していても、AttackEventが、

```text
C → E → G
```

なら、発射処理順は、

```text
C
↓
E
↓
G
```

です。

Playerの入力順によってAttackEventの音楽構造を変更しません。

---

## 各Arpeggio timingでPalette Bullet化する

snapshot時に`Occupied`だったSlotは、そのSlotに対応するArpeggioの音楽的タイミングでReserved ShaondamaをPalette Bullet化・発射します。

例えば、

```text
C [●]
E [ ]
G [●]
```

なら、

```text
C timing
→ C Reserved ShaondamaをPalette Bullet化・発射

E timing
→ 何もしない

G timing
→ G Reserved ShaondamaをPalette Bullet化・発射
```

とします。

AttackEvent発火時に、Arpeggioの全Reserved Shaondamaを一括でPalette Bullet化して先に保持する構造にはしません。

各Reserved Shaondamaは、自身に対応するArpeggio timingで使用します。

---

## Empty Slot

Arpeggioでsnapshot時に`Empty`だったSlotは、そのSlotの音楽タイミングで何も発射しません。

後からShaondamaを補完しません。

別Slotや別AttackEventからShaondamaを検索しません。

---

## Arpeggio AttackEventの解決完了タイミング

Arpeggio AttackEventは、

> **最後のArpeggio timingの処理が完了した時点**

で解決完了とします。

```text
AttackEvent発火
↓
Complete / Incomplete / Zero Chargeを確定
↓
使用Slot / Reserved Shaondamaをsnapshot
↓
C timing処理
↓
E timing処理
↓
G timing処理
↓
最後のArpeggio timing処理完了
↓
AttackEvent解決完了
↓
AttackEvent / Slot破棄
```

これは`Complete / Incomplete / Zero Charge`のいずれでも同じです。

`Zero Charge`で発射対象が存在しなくても、Arpeggio AttackEventの解決完了は最後のArpeggio timing処理後です。

AttackEvent発火直後にArpeggio全体を破棄しません。

---

# 同音Slot

同一AttackEvent内で同じ音を複数要求する場合、それぞれを独立したSlotとして扱います。

例えば、

```text
C / C / E
```

は、

```text
C Slot 1
C Slot 2
E Slot
```

です。

```text
C Slot 1 [●]
C Slot 2 [●]
E Slot     [●]
```

なら、3つのOccupied Slotに対して3つのReserved Shaondamaを使用できます。

これは、

```text
1つのC SlotへShaondamaを2つ重複Chargeする
```

こととは異なります。

どのShaondamaがどの同音Slotへ割り当てられるかは、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

Arpeggioで同音Slotごとに異なる音楽的タイミングが設定されている場合は、それぞれのSlotに対応するタイミングを使用します。

---

# 万能Shaondama

万能Shaondamaも、発火時にはすでにAllocation済みの実体として扱います。

Normal / Weakのどちらでも、Allocation時に確定した結果を使用します。

発火時に、

- Slotを再決定する
- NoteEventを再検索する
- 実効Pitchを再解決する
- 不足音を再計算する

ことはありません。

Normal AttackEventで万能Shaondamaが特定SlotへReserved済みなら、そのSlotのReserved Shaondamaとして通常Shaondamaと同様に使用します。

---

# オクターブ

AttackEvent発火時に、Slot成立判定をオクターブ情報でやり直しません。

Slot割り当て時に有効なShaondamaとしてReserved済みなら、そのAllocation結果を使用します。

例えば、

```text
C3
C4
C5
```

などの元のoctave情報をShaondamaが保持していても、発火時にoctaveを理由としてSlotを`Empty`へ戻したり、結果を不成立へ変更したりしません。

これはShaondamaが保持する元のoctave情報そのものを消去するという意味ではありません。

---

# Weak AttackEvent

## 基本構造

Weak AttackEventは、通常AttackEventの`Complete / Incomplete / Zero Charge`判定とは分離します。

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

- Chordを構成しない
- Arpeggioを構成しない
- Complete Chord用バフの対象にならない

単音Weak Attack用のAttackEventです。

Weak AttackEventの、

- 生成条件
- 割り当て
- Reserved化
- Weak用NoteEvent解決

は、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

本ページでは、Weak AttackEvent発火時の使用実体と終了処理を定義します。

---

## Weak AttackEvent発火時

Weak AttackEvent発火時には、

> **そのWeak AttackEventへすでに対応付けられている1つのReserved Shaondama**

を使用します。

```text
Weak AttackEvent発火
↓
対応Reserved Shaondama
↓
Palette Bullet化
↓
単音Weak Attack
```

発火時に、

- 別Shaondamaを検索する
- Normal AttackEventのSlotから取得する
- Normal AttackEventへ再割り当てする

ことはありません。

---

## Weak用NoteEvent解決を発火時にやり直さない

Weak AttackEventの発火情報・実効値は、Allocation時にすでに確定済みのものを使用します。

通常Shaondamaでは、Allocation側で、

```text
自身のsource NoteEvent occurrence
```

を使用します。

万能Shaondamaでは、Allocation側の現行仕様に従い、

```text
Charge判定時点より後で最初に発音するNoteEvent
```

へ解決します。

完全同時の候補がある場合は、Allocation側の現行仕様に従い、**MusicChart定義順**を使用します。

本ページでは、

> **すでにWeak AttackEventへ設定済みの発火情報・実効値を使用する**

だけとします。

したがって、本ページから「Weak AttackEventは必ずShaondama自身の生成元NoteEventで発火する」と一般化しません。

通常Shaondamaと万能Shaondamaで、Allocation時のNoteEvent解決方法が異なり得るためです。

---

## Weak待機中にNormal AttackEventがCurrentになった場合

一度Weak AttackEventへ割り当てられたShaondamaは、その後Normal AttackEventがCurrentになっても移動しません。

```text
Weak Allocation
↓
Weak AttackEvent待機
↓
Normal AttackEventがCurrentになる
↓
Weak Allocation維持
↓
Weak AttackEvent発火
```

発火時にNormal AttackEventへ再割り当てしません。

---

## Weak AttackEventの解決完了

Weak AttackEventは、対応Reserved ShaondamaをPalette Bullet化してWeak Attackとして使用した後、解決完了とします。

```text
Weak AttackEvent発火
↓
対応Reserved ShaondamaをPalette Bullet化
↓
Weak Attackとして使用
↓
Weak AttackEvent解決完了
↓
Weak AttackEvent破棄
```

Weak AttackEventを、発火後に通常AttackEventの蓄積枠へ残しません。

---

# 発射後の責務

本ページが扱うのは、

```text
Reserved Shaondama
↓
Palette Bullet化
↓
発射開始
```

までです。

Palette Bullet化された実体は、同じAttackEventのReserved Shaondamaとして再利用しません。

以下はPalette Bullet側の正本へ委譲します。

- Target決定
- Markerとの接続
- 飛翔
- Target消失
- 命中
- Damage / 浄化
- Enemyへの結果
- Bullet消滅
- 未着弾BulletのBattle終了処理

BGM・音程音・Gameplay SEとの同期については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)へ委譲します。

ただし、`Complete / Incomplete / Zero Charge`やPalette Bullet化タイミングなど、本ページが正本として定義するGameplay結果をBGM接続側で再判定しません。

---

# 責務境界

| 内容 | 正本 |
| --- | --- |
| Click / Drag Charge入力・ActionState | `player/player-action-charge.md` |
| Charge Actionの`success / miss` | `player/player-action-charge.md` |
| Current Normal AttackEventの決定 | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Slot構造・Slot割り当て | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| 1 Slot = 最大1 Shaondama | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| 同音Slotへの割り当て | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Weak AttackEventの生成・割り当て | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Reserved化・Reserved中Lifecycle | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| 通常 / 万能ShaondamaのWeak用NoteEvent解決 | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| AttackEventの必要音・Type・Harmony | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| Arpeggio順序・音楽的タイミング | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| AttackEventの予告・発火タイミング | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| 通常AttackEventの`Complete / Incomplete / Zero Charge` | **本ページ** |
| 発火時に使用するReserved Shaondama | **本ページ** |
| Chordの発射対象・発射タイミング | **本ページ** |
| Complete Chordのバフ発生条件 | **本ページ** |
| Arpeggioの使用対象snapshot | **本ページ** |
| Arpeggioの発射対象 | **本ページ** |
| Arpeggio AttackEventの解決完了タイミング | **本ページ** |
| Weak AttackEvent発火時の使用実体 | **本ページ** |
| Weak AttackEvent発火後の解決・破棄 | **本ページ** |
| バフの具体的効果・数値・継続時間等 | バフシステム側 |
| BGM / 音程音 / Gameplay SE同期 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| Palette Bullet発射後のTarget・飛翔・命中・Damage・消滅 | Palette Bullet側 |
| Markerの有効条件・置換・消滅 | [マーカー](/spec/combat/marker) |
| Target候補の優先順位・座標計算 | [パレットブレット](/spec/combat/palette-bullet) |
| AttackEvent発火時のTarget座標snapshot | **本ページ** |

---

# 中心フロー

## 通常AttackEvent

```text
AttackEvent発火
↓
発火時点のSlot / Reserved状態を確認
↓
各要求Slotを確認
│
├─ 全Slot Occupied
│   → Complete
│
├─ Occupied + Empty
│   → Incomplete
│
└─ 全Slot Empty
    → Zero Charge
↓
使用対象
=
Occupied Slotに対応するReserved Shaondama
↓
AttackEvent Type
│
├─ Chord
│   ↓
│   同一音楽タイミングでPalette Bullet化・発射
│
└─ Arpeggio
    ↓
    発火時snapshot
    ↓
    各Slotの音楽タイミングでPalette Bullet化・発射
    ↓
    最後のArpeggio timing処理後に解決完了
```

---

## Weak AttackEvent

```text
Weak AttackEvent発火
↓
対応Reserved Shaondama 1つ
↓
Palette Bullet化
↓
単音Weak Attack
↓
Weak AttackEvent解決完了
↓
破棄
```

---

# 基本ルール

- 本ページをAttackEvent発火時のGameplay結果判定・使用Reserved Shaondama決定の正本とする
- 通常AttackEventは`Complete / Incomplete / Zero Charge`の3結果で扱う
- `1 Slot = 最大1 Reserved Shaondama`とする
- Slot状態は`Empty / Occupied`で扱う
- 発火時には`charge-allocation.md`で確定済みのAllocation結果を使用する
- 発火時に別AttackEvent検索・Slot再割り当て・Weak / Normal再判定を行わない
- Charge成功時にはPalette Bullet化せず、ReservedとしてAttackEvent発火を待つ
- `Complete`は全要求Slotが`Occupied`の場合とする
- `Incomplete`は`Occupied`と`Empty`が混在する場合とする
- `Incomplete`でもOccupied SlotのReserved Shaondamaを攻撃へ使用する
- `Zero Charge`は全要求Slotが`Empty`の場合とする
- `Zero Charge`ではShaondama由来の攻撃を発生させない
- 1 Occupied Slotから使用するReserved Shaondamaは1つだけとする
- Empty Slotのために架空のPalette Bulletを生成しない
- Click / Dragの違いを発火時結果判定へ持ち込まない
- Charge Actionの`success / miss`と発火時の`Complete / Incomplete / Zero Charge`を分離する
- ChordはOccupied SlotのReserved Shaondamaを同一音楽タイミングでPalette Bullet化・発射する
- Complete Chordのみ、コード種類に対応するバフの発生条件を満たす
- Arpeggioは発火時に結果・Slot状態・使用Reserved Shaondamaをsnapshotする
- ArpeggioはAttackEvent側の音楽的順序・タイミングを使用する
- ArpeggioではPlayerのCharge順・Drag選択順を発射順へ使用しない
- ArpeggioのEmpty Slot timingでは何も発射しない
- Arpeggioは最後のArpeggio timing処理完了時に解決完了・破棄する
- 同音を複数要求する場合は、同一Slotへの重複ではなく独立した複数Slotとして扱う
- 万能ShaondamaはAllocation時に確定したSlot / Weak発火情報・実効値を使用する
- オクターブによって発火時にSlot成立を再判定しない
- Weak AttackEventは`1 Event = 1 Slot = 1 Reserved Shaondama`とする
- Weak AttackEventには通常AttackEventの`Complete / Incomplete / Zero Charge`判定を適用しない
- Weak AttackEvent発火時は対応済みReserved Shaondamaだけを使用する
- Weak用NoteEvent解決を本ページでやり直さない
- Weak待機中にNormal AttackEventがCurrentになっても再割り当てしない
- Weak AttackEventは発火・使用後に解決完了し、破棄する
- Palette Bullet発射後のTarget・飛翔・命中・Damage・消滅は別正本へ委譲する

---

# 未決事項

以下は現時点では本ページで確定しません。

## Zero Charge

- プレイヤー向け正式な失敗状態名称
- UI表示
- VFX
- SE
- その他の失敗演出

## Complete Chordバフ

- 各コード種類に対応する具体的バフ内容
- バフ効果
- 数値
- 継続時間
- 重複仕様
- UI

## Palette Bullet発射後

- 飛翔
- 命中
- Damage / 浄化計算
- Enemy側処理
- Bullet消滅
- 未着弾BulletのBattle終了処理

## 表現

- AttackEvent / Slot UIの具体的な消去演出

本ページでは、これらを推測で追加しません。

---

## 関連タスク

<PageRelations />
