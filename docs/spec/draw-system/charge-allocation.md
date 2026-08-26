---
title: "チャージ先・スロット割り当て仕様"
pageType: spec
category: "チャージシステム"
status: 仮仕様
relatedTasks: []
---

# チャージ先・スロット割り当て仕様

## 目的

本ページでは、PlayerがシャオンダマをChargeした際に、

* 現在どの通常AttackEventをCharge対象とするか
* 選択されたShaondamaをAllocation対象として扱えるか
* 複数の通常AttackEventが存在する場合に、どの論理順でCurrent AttackEventを一意に決定するか
* Click ChargeでどのSlotへ割り当てるか
* Drag Chargeで複数Shaondamaをどのように一括判定・一括commitするか
* 同一音のSlotが複数存在する場合にどう扱うか
* 対応する未充填Slotが存在しない場合にどう扱うか
* 万能シャオンダマを通常AttackEventのどのSlotへ割り当てるか
* 万能シャオンダマの実効Note・Pitch・RGBをどのEntryから解決するか
* Weak Attackを使用できる状態へいつ移行するか
* 通常Shaondama / 万能ShaondamaをWeak AttackEventへどう割り当てるか
* Charge成功後のShaondama実体をどの状態でAttackEvent発火まで保持するか
* Charge成功と自然破裂が同一フレームで競合した場合に、どちらを先に確定するか

を定義します。

本ページを、**Current AttackEventの決定、通常AttackEventのSlot割り当て、Weak AttackEventへの割り当て、Allocation結果、Charge成功後の`Reserved`確定、およびCharge commitと自然破裂の競合順の正本**とします。

Click / Dragそのものの入力、ActionState、対象選択、Release検出、キャンセル、Actionとしてのsuccess / miss通知等は、`player/player-action-charge.md` を正とします。

通常AttackEventの音楽情報、Charge受付期間、音楽時間上のCharge対象順、発火時刻等は、`bgm/bgm-attack-event.md` を正とします。

AttackEvent発火時の、

* Complete / Incomplete / Zero Chargeの結果
* Chord / Arpeggioの発射処理
* 使用するCharge済みShaondama実体の確定
* Palette Bullet化
* Palette Bulletの発射

については、`bgm/bgm-attack-judgement.md` を正とします。

通常Shaondamaが自身のsource NoteEvent occurrenceを保持するためのruntime dataは、`shaondama-music/orb-data.md` を正とします。

未使用の通常Shaondamaがsource NoteEvent発音時刻へ到達した場合の破裂・弱い範囲攻撃・消滅、および通常Lifetimeは、`shaondama-music/floating-behavior.md` を正とします。

本ページでは、これら他ページの責務を再定義しません。

本ページは実装が保持すべき意味と決定規則を定義します。具体的なC#型、class・struct・enum名、field名、ID形式、collection構造、および処理を分割するcomponent数は固定しません。

---

# 基本原則

Charge先を決定する前に、選択されたShaondamaがその判定時点でAllocation対象として有効かを確認します。

Allocation対象にできるのは、次の両方を満たすShaondamaだけです。

* **出現演出が完了している**
* **現在選択可能である**

出現演出中、選択不可、消滅済み、旧Battle所属、またはすでに`Reserved`となっているShaondamaはAllocation対象にしません。ClickではCharge判定Event時点、DragではRelease後のbatch検証・commit時点に、対象の有効性を確認します。

選択可能性、出現演出、および`Reserved`を区別する個体dataは`shaondama-music/orb-data.md`、それらの状態遷移は`shaondama-music/floating-behavior.md`を正とします。本ページは状態遷移を再定義せず、有効な個体だけを割り当てる規則を所有します。

```text
Charge判定Event / Drag Release
↓
選択Shaondamaは出現演出完了済み・現在選択可能？
│
├─ No
│   ↓
│   Allocationをcommitしない
│
└─ Yes
    ↓
    Current Normal AttackEventの有無を判定
```

Allocation対象の有効性を確認できた後、各Charge判定Eventごとに、

**その時点でCurrentとなる通常AttackEventが存在するか**

を判定します。

```text
Charge判定Event
↓
Current Normal AttackEventが存在する？
│
├─ Yes
│   ↓
│   そのCurrent AttackEventだけを対象として通常Slot割り当て
│
└─ No
    ↓
    Weak Attackとして割り当て
```

Current Normal AttackEventが存在する場合は、必ずそのAttackEventだけを対象とします。

選択したShaondamaがCurrent AttackEventに適合しない場合でも、

* 後続AttackEventを検索する
* 別の通常AttackEventへ送る
* Weak Attackへ切り替える

ことはありません。

ClickとDragではSlotへのcommit方法が異なります。

* **Click**：Charge判定Event時点のCurrent AttackEventに対して、1 Shaondamaを判定する
* **Drag**：Drag中にはSlotを書き換えず、Release時点のCurrent AttackEvent 1つに対して選択Shaondama群を一括検証し、成功した場合のみ一括commitする

---

# 用語

## 通常AttackEvent

曲進行に合わせて通常AttackEvent UI上で扱われるAttackEventを、本ページでは便宜上**通常AttackEvent**と呼びます。

通常AttackEventには1つ以上の要求Slotが存在し、Chord / Arpeggio等の攻撃を構成できます。

---

## Current Normal AttackEvent

現在Shaondamaを通常Chargeする対象として選ばれている、**ただ1つの通常AttackEvent**です。

同時に複数の通常AttackEventをCurrentにはしません。

本ページでは「Current AttackEvent」と記載した場合、特記がない限りこのCurrent Normal AttackEventを指します。

---

## Weak AttackEvent

Current Normal AttackEventが存在しない場合に、単音弱攻撃を成立させるため**Charge判定時に動的生成できるAttackEvent**です。

Weak Chargeを開始するために、Weak AttackEventが事前に表示・生成・蓄積されている必要はありません。

Weak AttackEventは通常AttackEventとは別枠で管理します。

---

## Slot

AttackEventが要求する各音に対応するCharge先です。

例えば、

```text
C / E / G
```

を要求するAttackEventでは、

```text
Slot C
Slot E
Slot G
```

を持ちます。

Slotは、

* どの要求音が満たされているか
* どのShaondama実体がどのAttackEvent / Slotへ対応しているか

を管理するために使用します。

通常AttackEventの要求Slotは、

**1 Slotにつき最大1 Shaondama**

を保持します。

1つのSlotへ複数Shaondamaを重複してChargeすることはありません。

Slotの中に物理的なPalette Bulletを格納するわけではなく、SlotからCharge時点でPalette Bulletを新規生成することもありません。

---

## 同音Slot

同じAttackEvent内で同一音名を複数要求している場合、それぞれを独立したSlotとして扱います。

例えば、

```text
C / C / E
```

であれば、

```text
C Slot 1
C Slot 2
E Slot
```

という3つの別々のSlotを持ちます。

この場合にCを2つChargeすることは可能ですが、1 Slotへの重複Chargeではありません。

Drag判定でも、同音Slotを単なる集合としてまとめず、**必要個数を含む独立Slot群**として扱います。

---

## 先頭Slot

本ページでいう**先頭Slot**とは、AttackEventが保持している要求Slot順のうち最も先頭にあるSlotを指します。

同じ条件を満たす未充填Slotが複数存在する場合は、このSlot順を使用して一意に解決します。

---

## source NoteEvent occurrence

通常Shaondamaを生成した元となる、MusicChart上の**特定周回に属する特定NoteEvent実体**を指します。

単なるNote名や時刻だけではなく、Loop中のどの周回のNoteEventであるかまで区別します。

通常ShaondamaのWeak Attackでは、別周回の同名NoteEventへ自動的に付け替えません。

---

## Reserved

Charge成功したShaondama実体がAttackEvent / Slotへ対応付けられ、AttackEventの解決を待っている状態です。

Reserved中のShaondamaは世界上の対応実体として保持され、通常Lifetimeの進行を停止します。

`Reserved`確定時には、Shaondama実体、Battle ID、AttackEvent、Slot、および必要なAllocation実効値を対応付けます。これはPalette Bullet実体の生成ではありません。

---

# Current AttackEventの決定

## UI表示順を使用しない

複数の通常AttackEventが同時にCharge対象候補となり得る場合、**UI上の表示順をゲームロジックの根拠にしません**。

Current AttackEventは、以下の論理順で一意に決定します。

1. **音楽時間上のCharge対象順**
2. 1が完全同時の場合、**MusicChart定義順**

```text
Charge対象候補を抽出
↓
音楽時間上のCharge対象順で整列
↓
完全同時の候補はMusicChart定義順で整列
↓
先頭のAttackEventをCurrentにする
```

「音楽時間上のCharge対象順」を決定するための時間情報そのものは、`bgm/bgm-attack-event.md` を正とします。

UIはこの論理順を視覚化しても構いませんが、UI表示結果からCurrent AttackEventを逆算してはいけません。

---

## 前のAttackEventを飛ばさない

Current AttackEventがCharge受付中かつCharge対象として有効である間、後続AttackEventを先に埋めることはできません。

例えば、

```text
AttackEvent A
C / E / G

AttackEvent B
A / C / E
```

でCurrentがAの場合、CをChargeすると、

```text
AttackEvent A
C Slot
```

だけを対象とします。

AttackEvent AがCurrentである限り、AttackEvent BのC Slotは検索しません。

以下の理由で後続AttackEventを優先することもありません。

* 選択したShaondamaと音が一致する
* 後続AttackEventの発火タイミングが近い
* Playerから見て扱いやすい
* UI上で近く表示されている
* Playerが任意に選択した

---

# 完全充填

Current AttackEventについて、

**すべての要求SlotにShaondamaが1つずつ割り当てられた状態**

を完全充填とします。

```text
C [●]
E [●]
G [●]
```

であれば完全充填です。

```text
C [●]
E [ ]
G [●]
```

であれば未完成です。

Slotは1 Slotにつき最大1 Shaondamaであるため、完全充填後に同じAttackEventへ追加Chargeすることはありません。

---

# 次のAttackEventへ進む条件

Current AttackEventから次の通常AttackEventへ進む条件は、以下です。

## 全要求Slotが完全充填された場合

Current AttackEventの全要求Slotが完全充填された時点で、そのAttackEventへの追加Charge受付を終了します。

AttackEvent自体がまだ音楽上で発火していなくても構いません。

次のCharge判定Eventでは、再度論理順を評価し、次にCurrentとなる通常AttackEventを決定します。

```text
AttackEvent A
全要求Slot完全充填
↓
AttackEvent Aへの追加Charge終了
↓
次のCharge判定Event
↓
論理順からCurrent AttackEventを再決定
```

完全充填済みのAttackEventを再びCurrentへ戻しません。

---

## Charge受付期間が終了した場合

Current AttackEventが未完成のままCharge受付期間を終了した場合、そのAttackEventへのChargeを終了します。

AttackEvent自体の実際の発火を待ってからCurrentを切り替える必要はありません。

```text
AttackEvent A
↓
Charge受付期間終了
↓
AttackEvent Aは未完成
↓
AttackEvent AへのCharge終了
↓
次のCharge判定EventでCurrentを再決定
```

Charge受付期間を終了した過去のAttackEventは、その後再びCurrentにはしません。

そのAttackEventに未充填Slotが残っていても、後からChargeして補完しません。

Charge受付期間そのものの時間情報は、`bgm/bgm-attack-event.md` を正とします。

---

## Currentとなる通常AttackEventが存在しない場合

完全充填やCharge受付期間終了等により、Charge判定Event時点でCurrentとなる通常AttackEventが存在しない場合は、

**Current Normal AttackEventなし**

として扱います。

この場合にWeak Attack割り当てを使用できます。

過去に未完成のAttackEventが存在しているかどうかは、Weak Attackの可否判定に使用しません。

---

# 最大蓄積AttackEvent数

通常AttackEventは複数個を表示・蓄積できる設計とします。

現在の想定規模は、

**3～5個程度**

です。

ただし、最終的な最大蓄積数は通常AttackEvent UIの設計と合わせて決定するため、現時点では固定値としません。

Weak AttackEventは、この通常AttackEventの最大蓄積数には含めません。

---

# Click ChargeのSlot割り当て

## 判定対象

Click Chargeは、`player/player-action-charge.md` が発生させる**Charge判定Event時点**のCurrent AttackEventだけを対象とします。

判定開始後に後続AttackEventを検索しません。

---

## 通常Shaondama

通常Shaondamaは、自身が持つ音名とCurrent AttackEventの**未充填要求Slot**を照合します。

対応する未充填Slotが1つ以上存在する場合は、**先頭の未充填同音Slot**へ割り当てます。

例えば、

```text
C Slot 1 = 未充填
C Slot 2 = 未充填

C ShaondamaをClick Charge
↓
C Slot 1へ割り当て
```

次にCをChargeした場合は、

```text
C Slot 1 = 充填済み
C Slot 2 = 未充填

C ShaondamaをClick Charge
↓
C Slot 2へ割り当て
```

となります。

---

## Slot照合ではオクターブを区別しない

通常AttackEventのSlot照合ではオクターブを区別しません。

```text
C3
C4
C5
```

はいずれも要求Slot上は、

```text
C
```

として扱います。

したがって要求SlotがCであれば、オクターブに関係なくCの通常Shaondamaを使用できます。

---

## 対応する未充填Slotがない場合

Current AttackEventに、選択した通常Shaondamaの音名に対応する未充填Slotが存在しない場合、割り当ては失敗します。

```text
Current AttackEvent
C [●]
E [ ]
G [ ]

C ShaondamaをCharge
↓
Cの未充填Slotなし
↓
Charge失敗
```

この場合、

* 充填済みC Slotへ重複Chargeする
* 後続AttackEventのC Slotを検索する
* Weak Attackへ変換する

ことはありません。

---

## 万能Shaondama

万能Shaondamaは音名によるSlot制限を受けません。

Current AttackEventの未充填要求Slotだけを候補とし、**先頭の未充填Slot**へ割り当てます。

```text
C Slot = 未充填
E Slot = 未充填
G Slot = 未充填

万能ShaondamaをClick Charge
↓
C Slotへ割り当て
```

C Slotが充填済みなら、

```text
C Slot = 充填済み
E Slot = 未充填
G Slot = 未充填

万能ShaondamaをClick Charge
↓
E Slotへ割り当て
```

となります。

万能Shaondamaであっても、

* 充填済みSlotへ追加Chargeする
* Current AttackEventを飛び越えて後続AttackEventへ入る

ことはありません。

## 万能Shaondamaの実効値解決

万能Shaondamaを通常AttackEventへ割り当てる場合は、割り当て先Slotに対応する**Music Requirement Entry**から、その攻撃で使用する実効値を解決します。

最低限、次の意味をAllocation結果として保持します。

* 割り当て先AttackEvent / Slot / Entry
* Entryが要求するexact MIDI Noteとoctave
* Entryから得られるpitch class
* Entryの音程に対応する実効色と実効RGB

```text
万能Shaondama
↓
Current AttackEventの先頭未充填Slotを決定
↓
そのSlotに対応するMusic Requirement Entryを取得
↓
Entryから実効Note / Pitch / RGBを解決
↓
Slot対応と実効値を同じAllocation結果としてcommit
↓
Reserved
```

虹色の表示をRGB payloadとして使用しません。万能Shaondama自身へ恒久的な固有Note・Pitch・RGBを書き込まず、今回のAllocation結果として保持します。実効値の個体data契約は`shaondama-music/orb-data.md`、Entryが持つ音楽情報は`bgm/bgm-attack-event.md`を正とします。

---

# Drag Chargeのatomic判定

## 基本方針

Drag Chargeは、**複数の単体Click Chargeを順番に実行する処理ではありません**。

Drag中はShaondamaの選択状態だけを保持し、Slot状態を書き換えません。

Releaseした瞬間に、その時点で選択されているShaondama群を1つのbatchとして判定します。

```text
DragCharging
↓
Shaondamaを複数選択
↓
Release
↓
Release時点のCurrent AttackEventを1つ確定
↓
選択Shaondama群と未充填要求Slot群を一括照合
│
├─ 全体として過不足なく割り当て可能
│   ↓
│   各Slotへの対応を一括確定
│   ↓
│   一括commit
│   ↓
│   success
│
└─ 過剰 / 不足 / 不適合
    ↓
    Slot変更なし
    ↓
    Drag全体miss
```

---

## Release時点のCurrent AttackEvent 1つだけを見る

Drag batchの判定対象は、**Release時点のCurrent AttackEvent 1つだけ**です。

Drag開始時点のCurrent AttackEventに固定するわけではありません。

一方、Release後にbatch判定を開始した後は、判定対象AttackEventを途中で変更しません。

```text
Release
↓
Current AttackEvent Aを確定
↓
Aだけに対してbatch判定
↓
途中でAがFull相当になっても
残りShaondamaをBへ送らない
```

1回のDragで複数AttackEventをまたぐことはありません。

---

## 成立条件

Dragがsuccessとなるのは、Release時点のCurrent AttackEventが持つ**未充填要求Slot群すべて**に対して、選択Shaondama群を**過不足なく有効に割り当て可能な場合だけ**です。

判定では、

* 通常Shaondamaは同音の未充填Slotだけを満たせる
* 万能Shaondamaは任意の未充填Slotを満たせる
* 1 Shaondamaは1 Slotだけを満たす
* 1 Slotには最大1 Shaondamaだけを割り当てる
* 同音Slotは必要個数まで含めて独立に数える

ものとします。

成立可否の判定では、ShaondamaのDrag選択順を要求Slot順と一致させる必要はありません。

---

## 過剰なShaondamaがある場合

Current AttackEventの未充填要求Slot群より、選択Shaondama群に余分なShaondamaが含まれる場合はDrag全体をmissとします。

例えば、

```text
Current AttackEvent
C / E

Drag
C / E / G
```

の場合、

```text
Gが余分
↓
全体不成立
↓
Drag全体miss
↓
C / EもChargeされない
```

となります。

C / Eだけを部分成功させません。

---

## 不足する場合

Current AttackEventの未充填要求Slot群をすべて満たせない場合もDrag全体をmissとします。

```text
Current AttackEvent
C / E / G

Drag
C / E
↓
G Slotを満たせない
↓
Drag全体miss
```

C / Eだけを先にcommitしません。

---

## 音が不適合な場合

選択数が未充填Slot数と一致していても、通常Shaondamaを有効に割り当てられない場合はDrag全体をmissとします。

```text
Current AttackEvent
C / E

Drag
C / G
↓
GをE Slotへ割り当てられない
↓
Drag全体miss
```

後続AttackEventにG Slotが存在していても検索しません。

Weak Attackへも逃がしません。

---

## 同音Slotはmultisetとして照合する

同音要求は個数まで一致させます。

```text
Current AttackEvent
C / C / E
```

がすべて未充填の場合、

```text
Drag
C / C / E
```

は成立できます。

一方、

```text
Drag
C / E / E
```

は、Cが1個不足しEが1個余るため成立しません。

単なる`{C, E}`という集合比較にはしません。

---

## 選択順は成立条件にしない

要求が、

```text
C / E / G
```

である場合、

```text
Drag
G → C → E
```

の順に選択しても、各要求Slotへ過不足なく割り当て可能であればsuccessです。

Drag選択順をChord / Arpeggioの発射順には使用しません。

Arpeggioを含むAttackEventの発射順は、`bgm/bgm-attack-event.md` が定義するAttackEvent側の音楽的順序を使用します。

---

## 万能Shaondamaを含むDrag

万能Shaondamaは、通常Shaondamaだけでは満たせない残りの未充填Slotを満たすワイルドカードとして扱えます。

例えば、

```text
Current AttackEvent
C / E / G

Drag
C / E / 万能
```

であれば、

```text
C → C Slot
E → E Slot
万能 → G Slot
```

として全体を成立させられます。

万能Shaondamaが複数のSlotを満たせる場合は、通常の万能Shaondama規則と同様に、残っている未充填Slotの**先頭Slotから**対応させます。

万能Shaondamaを含むDragでは、仮のSlot対応を構築した後、各万能Shaondamaについて対応Entryから実効Note・Pitch・RGBを仮解決します。batch全体がsuccessの場合だけ、Slot対応と実効値を一括commitします。Drag全体がmissの場合は、仮解決した実効値もAllocation結果として残しません。

---

## commitは全体判定成功後に一度だけ行う

Drag判定中にSlotを逐次書き換えません。

```text
判定前Slot状態
↓
仮の対応関係を構築
↓
batch全体の成立可否を確定
│
├─ success
│   ↓
│   対応関係を一括commit
│
└─ miss
    ↓
    commitしない
    ↓
    判定前Slot状態を維持
```

そのため、途中まで有効なShaondamaが存在しても、後半で不成立が判明した場合に部分成功状態は残りません。

---

## commit後にCurrentを再評価する

Drag batchの一括commitによってCurrent AttackEventが完全充填した場合、そのbatch処理を完了した後にCurrentから外れます。

そのDrag中の残りShaondamaを次AttackEventへ送る処理は存在しません。

次のAttackEventへのChargeは、**次回以降の別Charge判定Event**で行います。

---

# 後続AttackEvent検索の禁止

Click / Dragのどちらでも、通常Slot割り当て時に検索対象としてよい通常AttackEventは、

**その判定で確定したCurrent AttackEvent 1つだけ**

です。

例えば、

```text
Current AttackEvent
C / E / G

後続AttackEvent
A / B / D
```

の状態でAをChargeしても、

```text
後続AttackEvent
A Slot
```

へ割り当ててはいけません。

```text
Current AttackEventにAの未充填Slotなし
↓
Charge失敗 / Drag全体miss
```

とします。

後続AttackEventへのChargeが可能になるのは、そのAttackEventが正式にCurrentへ切り替わった後です。

---

# 完全充填後の追加Charge禁止

通常AttackEventが完全充填した時点で、そのAttackEventへの追加Charge処理は終了します。

完全充填済みAttackEventに対して、

* 同じ音を追加Chargeする
* 要求音だけを追加で保持する
* 既存Slotへ複数Shaondamaを保持する

といった処理は行いません。

---

# Weak Attackを使用できる条件

Weak Attack割り当てを使用できる条件は、

**Charge判定Event時点でCurrent Normal AttackEventが存在しないこと**

です。

例えば、

* Charge可能な通常AttackEventが最初から存在しない
* それまでの通常AttackEventがすべて完全充填済みでCurrent候補から外れている
* Charge受付期間終了によってCurrent候補が存在しない
* 次の通常AttackEventがまだCharge対象時刻へ到達していない

といった状態を含みます。

Weak AttackEventが事前に存在していることは条件ではありません。

Current Normal AttackEventが存在する場合、Slot不一致をWeakへfallbackしません。

---

# 通常ShaondamaのWeak割り当て

## source NoteEvent occurrenceを使用する

通常ShaondamaをWeakへ割り当てる場合、そのShaondama自身が保持する**source NoteEvent occurrence**を使用します。

```text
通常Shaondama
↓
自身のsource NoteEvent occurrenceを取得
↓
そのoccurrenceに対応するWeak AttackEventを動的生成
↓
ShaondamaをWeak AttackEvent / Slotへ割り当て
↓
source NoteEvent発音時刻で発火
```

Weak AttackEventは、通常Shaondama 1個につき1つ生成します。

1つのWeak AttackEventを複数回のWeak Chargeで共有しません。

---

## Weak AttackEventのSlot

通常Shaondamaから生成するWeak AttackEventは、対象Shaondamaに対応する**単音Slot 1つ**を持ちます。

例えばCの通常Shaondamaであれば、

```text
C Shaondama
↓
Weak AttackEvent
└─ C Slot × 1
```

とします。

Weak AttackEventは通常AttackEventの複数Slot攻撃を構成するためのものではありません。

---

## 過去source NoteEvent用の例外分岐を設けない

通常Shaondamaについて、Weak Charge判定時に、

```text
source NoteEvent発音時刻がすでに過去か？
```

という例外分岐は設けません。

通常Shaondamaは、未使用のまま自身のsource NoteEvent発音時刻へ到達した場合、その時点で割れて弱い範囲攻撃を行い消滅することを前提とします。

したがって、**過去のsource NoteEvent occurrenceを持つ未使用の通常Shaondamaは世界上に存在しない**ものとして扱います。

この自然破裂・弱範囲攻撃・消滅の正本は、`shaondama-music/floating-behavior.md` とします。

---

## Loop時は特定occurrenceを維持する

BGMがLoopしている場合でも、通常ShaondamaのWeak割り当ては自身が属する**特定周回のsource NoteEvent occurrence**を使用します。

例えば第2周回のNoteEventから生成されたShaondamaを、第3周回の同名NoteEventへ自動的に付け替えません。

source NoteEventの識別・保持に必要なruntime dataは、`shaondama-music/orb-data.md` を正とします。

---

# 万能ShaondamaのWeak割り当て

## Weakで使用可能

万能Shaondamaも、Current Normal AttackEventが存在しない場合はWeak Attackへ使用できます。

ただし、万能Shaondama自身には通常Shaondamaのような固定source NoteEvent occurrenceを持たせません。

Weak Charge判定時に、その場で使用するNoteEventを解決します。

---

## 次に発音するNoteEventへ解決する

万能ShaondamaをWeakへ割り当てる場合、Weak Charge判定時点より**後で最初に発音するNoteEvent occurrence**を、Battle上の連続した音楽時間に沿ってMusicChartから検索します。

```text
万能Shaondama
↓
Weak Charge判定
↓
判定時点より後のNoteEventを検索
↓
最初に発音するNoteEvent occurrenceを選択
↓
そのNoteEvent definition + loop occurrenceへ一時的に解決
↓
Weak AttackEventを生成
↓
そのoccurrenceの発音時刻で発火
```

別の通常AttackEventや待機コードの不足音を検索して割り当てる方式にはしません。

## loop境界を越えて検索する

「次に発音するNoteEvent occurrence」の検索は、現在loopの終端で打ち切りません。

```text
Weak Charge判定
↓
現在loopの判定時刻より後を検索
│
├─ 候補あり
│   ↓
│   最初のNoteEvent occurrenceを採用
│
└─ 候補なし
    ↓
    次loop occurrenceの先頭から検索を継続
    ↓
    次loopで最初のNoteEvent occurrenceを採用
```

現在loopに候補がないこと、または検索中にloop境界へ到達したことを理由に、万能Weak Chargeを失敗させません。音楽的な検索順はloopを越えて連続させますが、NoteEvent occurrenceの同一性は周回ごとに分けます。

同じNoteEvent definitionであっても、現在loopと次loopでは別のoccurrenceです。解決結果には、少なくとも次を組み合わせて保持します。

* NoteEvent definition
* loop occurrence
* 対象Battle上の発音時刻を一意に解決できる情報

NoteEvent definitionだけを保存し、発火時に「その時点の同じNoteEvent」へ再解決してはいけません。loop occurrenceの識別形式や具体的なID型は本ページでは固定しません。

---

## 同時NoteEventのtie-break

「次に発音するNoteEvent occurrence」が完全同時に複数存在する場合は、

**MusicChart定義順の先頭**

を使用します。

```text
次の発音時刻 = T

NoteEvent A @ T
NoteEvent B @ T
NoteEvent C @ T
↓
MusicChart定義順の先頭を採用
```

これにより万能Weakの解決結果を決定的にします。

loopを越える場合もtie-breakは変更しません。Battle上で最も早く発音するoccurrenceを選び、発音時刻が完全同時の場合だけMusicChart定義順を使用します。Track順、Pitch順、object生成順、または実装上の列挙順など、新しいtie-breakを追加しません。

---

## 実効Pitch / octave / RGB等

万能Shaondamaは、Weak用に解決したNoteEventから、Weak Attackに必要な、

* 解決済みNoteEvent definition
* 解決済みloop occurrence
* exact MIDI Note
* 実効pitch class
* octave
* 実効色と実効RGB
* その他NoteEvent由来でWeak Attackに必要な値

を取得します。

これは、そのWeak AttackEventで使用する**実効値と発火対象occurrenceの解決**です。

万能Shaondama自身へ恒久的な固有音程を付与・書き換える処理ではありません。

---

## Weak AttackEventの生成

NoteEvent definitionとloop occurrenceを解決した後は、通常ShaondamaのWeak処理と同様に、対象万能Shaondama専用のWeak AttackEventを1つ動的生成し、単音Slotへ割り当てます。

```text
万能Shaondama
↓
次NoteEvent occurrenceへ解決
↓
definition / loop occurrence / 実効値確定
↓
Weak AttackEvent生成
↓
単音Slotへ割り当て
↓
Resolved NoteEvent発音時刻で発火
```

通常Shaondamaと万能Shaondamaは、**Weakで使用するNoteEventの決定方法だけが異なる**ものとし、それ以降のWeak AttackEvent処理は可能な限り共通化します。

---

# Weak Charge後に通常AttackEventがCurrentになった場合

一度Weak AttackEventへ割り当てられたShaondamaは、その後に通常AttackEventがCurrentになっても再割り当てしません。

```text
Current Normal AttackEventなし
↓
ShaondamaをWeakへ割り当て
↓
Weak AttackEvent生成
↓
その後、通常AttackEvent BがCurrentになる
```

となった場合でも、既にWeak AttackEventへ割り当て済みのShaondamaを、

```text
Weak AttackEvent
↓
通常AttackEvent BのSlot
```

へ付け替えません。

AttackEvent BがCurrentになった後に新しく発生するCharge判定Eventから、通常AttackEventのSlot割り当て規則を使用します。

---

# Weak AttackEventと通常AttackEventの蓄積枠

Weak AttackEventは、通常AttackEventの最大蓄積数とは別管理です。

Weak AttackEventが待機中であっても、通常AttackEventの表示・蓄積可能数を消費しません。

---

# Charge成功後のShaondama実体

## Reservedへ移行する

通常AttackEvent / Weak AttackEventのどちらであっても、Charge成功したShaondama実体は、対応するAttackEvent / Slotへ対応付けられ、**Reserved**として発火待ちします。

通常AttackEventの場合、

```text
Shaondama
↓
Charge成功
↓
AttackEvent / Slotへ対応付け
↓
Reserved
```

Weak AttackEventの場合も、

```text
Shaondama
↓
Weak割り当て成功
↓
Weak AttackEvent / Slotへ対応付け
↓
Reserved
```

となります。

Dragの場合は、batch全体がsuccessと判定された後の一括commitで、対象Shaondama群を同時にReservedへ移行させます。

Drag全体がmissの場合、どのShaondamaもそのbatchによってReservedへ移行しません。

---

## Charge commitと自然破裂の優先順位

Charge成功と、通常Shaondamaのsource NoteEvent時刻到達による自然破裂候補が同一フレームに成立した場合は、**Charge成功のcommitを先に確定**します。

ただし、同一フレームですでにBattle終了またはRoom Retryが確定している場合は、後述する旧Battle状態の破棄を優先し、そのBattleへ新しいCharge commitを残しません。

```text
同一フレーム
├─ Charge成功候補
└─ source NoteEvent時刻到達による自然破裂候補
↓
Charge Allocationの成立可否を確定
│
├─ success
│   ↓
│   Slot / Weak Allocationをcommit
│   ↓
│   対象ShaondamaをReservedとして確定
│   ↓
│   その個体の自然破裂候補を無効化
│
└─ miss / commitなし
    ↓
    本ページでは状態を変更しない
    ↓
    自然破裂可否はFloating側で評価
```

commit済みのShaondamaへ、同一フレーム内または以後の更新で自然破裂を発生させません。Clickでは対象1個のcommit、Dragではbatch全体のatomic commitが完了した時点を優先確定点とします。

本ページはCharge commitの確定と優先境界を正本とし、自然破裂のHit・RGB payload・消滅処理そのものは`shaondama-music/floating-behavior.md`を正とします。

---

## Reserved中は通常Lifetimeを停止する

ReservedになったShaondamaは、通常の世界上Lifetimeの進行を停止します。

ReservedはすでにCharge先が確定した使用予約状態であるため、未使用Shaondamaに適用されるsource NoteEvent到達時の自然破裂・消滅の対象からも外れます。

対応AttackEventが解決する前に通常Lifetime切れや未使用時の自然破裂によって消滅しないよう、**対応AttackEventが解決するまで存在を保証**します。

```text
Charge成功
↓
Reserved
↓
通常Lifetime停止
↓
対応AttackEventの解決まで保持
```

Reserved解除後やAttackEvent解決後の詳細ライフサイクルは、発火時処理およびShaondama lifecycle側の正本へ委譲します。

---

## Charge成功時にはPalette Bullet化しない

Charge成功時点ではPalette Bulletを生成しません。

```text
Shaondama
↓
Charge成功
↓
AttackEvent / Slotへ対応付け
↓
Reserved
↓
AttackEvent発火
↓
発火時処理でPalette Bullet化
```

AttackEvent発火時にどのReserved Shaondamaを使用し、どのようにPalette Bullet化・発射するかは、`bgm/bgm-attack-judgement.md` を正とします。

本ページでは発火時の使用Bullet決定を再定義しません。

---

## Battle終了・Room Retry時の破棄

Battle終了またはRoom Retryが確定した場合は、旧Battle IDに属する次のruntime dataと待機状態を破棄します。

* 通常AttackEvent / Weak AttackEventへのAllocation結果
* 各Slotの充填状態とShaondama対応
* `Reserved`状態と予約関係
* 未発火のWeak AttackEvent
* Wildcardの解決済みNoteEvent definition / loop occurrence / 実効値
* commit待ち・解決待ちの通知や参照

AttackEvent発火待ち、Arpeggioの途中、または次loop occurrenceを参照するWildcard Weakであっても、旧Battleの状態を次Battleへ持ち越しません。Room Retry後は、新しいBattle IDと新しいMusicChart runtime occurrenceからAllocation状態を再構築します。

破棄後に旧BattleのSlotや`Reserved`参照を使ってPalette Bullet化・発音・Damage通知を行いません。Battle終了判断とRoom Retryの高レベルlifecycleは`game/index.md`および`combat/index.md`を正とします。

---

# 割り当てアルゴリズム

## 共通入口

```text
Charge判定Event
↓
選択Shaondamaの出現演出完了・選択可能・Battle IDを検証
│
├─ 無効 → commitなし
│
└─ 有効
    ↓
    Current Normal AttackEventを論理順で決定
    ↓
    Currentが存在する？
    │
    ├─ Yes
    │   ↓
    │   通常Slot割り当てへ
    │
    └─ No
        ↓
        Weak割り当てへ
```

---

## Click Charge

```text
Click Charge判定Event
↓
選択ShaondamaはAllocation対象として有効
↓
Current Normal AttackEventあり
↓
選択Shaondamaは？
│
├─ 通常Shaondama
│   ↓
│   同音の未充填Slotあり？
│   │
│   ├─ Yes → 先頭の未充填同音Slotへcommit → Reserved
│   └─ No  → Charge失敗
│
└─ 万能Shaondama
    ↓
    未充填Slotあり？
    │
    ├─ Yes → 先頭の未充填Slotへcommit → Reserved
    └─ No  → Charge失敗

※失敗時に後続AttackEventを検索しない
※失敗時にWeakへfallbackしない
```

---

## Drag Charge

```text
Drag中
↓
Shaondama選択だけを更新
↓
Release
↓
全選択Shaondamaの出現演出完了・選択可能・Battle IDを検証
│
├─ 1個でも無効 → commitなし → Drag全体miss
│
└─ 全個体有効
    ↓
    Release時点のCurrent AttackEventを1つ確定
    ↓
    未充填要求Slot群をsnapshot
    ↓
    選択Shaondama群を全体検証
    │
    ├─ 過不足なく割り当て可能
    │   ↓
    │   仮対応を確定
    │   ↓
    │   一括commit
    │   ↓
    │   全対象ShaondamaをReserved
    │   ↓
    │   success
    │
    └─ 過剰 / 不足 / 不適合
        ↓
        commitなし
        ↓
        Slot状態不変
        ↓
        Drag全体miss

※batch途中でCurrentを切り替えない
※残りShaondamaを後続Eventへ送らない
```

---

## Weak：通常Shaondama

```text
Current Normal AttackEventなし
↓
通常ShaondamaをWeakへ割り当て
↓
自身のsource NoteEvent occurrenceを使用
↓
専用Weak AttackEvent生成
↓
単音Slotへcommit
↓
Reserved
↓
source NoteEvent発音時刻で発火
```

---

## Weak：万能Shaondama

```text
Current Normal AttackEventなし
↓
万能ShaondamaをWeakへ割り当て
↓
判定時点より後で最初に発音するNoteEvent occurrenceを検索
↓
現在loopに候補がなければ次loop先頭から検索継続
↓
完全同時ならMusicChart定義順の先頭
↓
NoteEvent definition / loop occurrenceを保持
↓
実効Note / Pitch / octave / RGB等を解決
↓
専用Weak AttackEvent生成
↓
単音Slotへcommit
↓
Reserved
↓
Resolved NoteEvent発音時刻で発火
```

---

# 割り当て例

## 例1：AttackEvent論理順

```text
Charge対象候補
AttackEvent A：音楽時間上 2番目
AttackEvent B：音楽時間上 1番目
AttackEvent C：音楽時間上 3番目
```

UI表示が、

```text
A / B / C
```

であっても、CurrentはUI順では決めません。

```text
音楽時間上のCharge対象順
B
↓
A
↓
C
```

として決定します。

AとBが完全同時であれば、MusicChart定義順の先頭をCurrentにします。

---

## 例2：Clickで後続AttackEventへ送らない

```text
Current AttackEvent 1
C / E / G

後続AttackEvent 2
A / B / D
```

CurrentがAttackEvent 1のときにAをClick Chargeしても、AttackEvent 2のA Slotへは送りません。

```text
AttackEvent 1にAの未充填Slotなし
↓
Charge失敗
```

Weak Attackにも変換しません。

---

## 例3：同音Slot

```text
AttackEvent
C / C / E
```

最初のCは、

```text
C Slot 1
```

次のCは、

```text
C Slot 2
```

へ割り当てます。

2つとも充填済みなら、さらにCをChargeしても既存C Slotへ重複Chargeしません。

---

## 例4：Dragの選択順が異なってもsuccess

```text
Current AttackEvent
C / E / G

Drag選択順
G → C → E
```

選択順ではなく全体の割り当て可能性を見るため、

```text
C → C Slot
E → E Slot
G → G Slot
```

と対応可能ならsuccessです。

発射順はDrag選択順ではなくAttackEvent側の音楽的順序を使用します。

---

## 例5：Dragに余分な音がある

```text
Current AttackEvent
C / E

Drag
C / E / G
```

は、

```text
Gが余分
↓
Drag全体miss
↓
C / Eもcommitされない
```

となります。

---

## 例6：Dragが不足する

```text
Current AttackEvent
C / E / G

Drag
C / E
```

は、

```text
Gが不足
↓
Drag全体miss
↓
C / Eもcommitされない
```

となります。

---

## 例7：Dragと同音Slot

```text
Current AttackEvent
C / C / E

Drag
E / C / C
```

は、Cを2個・Eを1個持つため成立できます。

```text
Drag
E / C / E
```

はCが1個不足しEが1個余るためmissです。

---

## 例8：Drag中に次Eventへまたがない

```text
Current AttackEvent 1
C / E

後続AttackEvent 2
G / B

Drag
C / E / G
```

C / EでAttackEvent 1を満たし、GだけをAttackEvent 2へ送る処理は行いません。

```text
AttackEvent 1の未充填Slot = C / E
Drag = C / E / G
↓
Gが余分
↓
Drag全体miss
```

となります。

---

## 例9：万能Shaondamaを含むDrag

```text
Current AttackEvent
C / E / G

Drag
C / E / 万能
```

は、万能Shaondamaを残りのG Slotへ対応させられるためsuccessです。

---

## 例10：通常ShaondamaのWeak

```text
Current Normal AttackEventなし
↓
C ShaondamaをWeak Charge
↓
そのShaondama自身のsource NoteEvent occurrenceを取得
↓
Weak AttackEvent Cを生成
↓
Reserved
↓
source NoteEvent発音時刻で発火
```

別周回のC NoteEventへ付け替えません。

---

## 例11：万能ShaondamaのWeak

```text
Weak Charge判定時刻 = T0

次のNoteEvent
E4 @ T1
G4 @ T2
```

`T1 > T0`かつT1が最初の発音時刻であれば、万能ShaondamaはE4のNoteEventへ解決します。

そのNoteEventから実効Pitch / octave / RGB等を取得し、E4に対応するWeak AttackEventを生成します。

---

## 例12：万能Weakで次NoteEventが完全同時

```text
Weak Charge判定時刻 = T0

MusicChart定義順
1. C4 @ T1
2. E4 @ T1
3. G4 @ T1
```

3つが同時に次のNoteEventである場合、MusicChart定義順の先頭であるC4へ解決します。

---

## 例13：万能Shaondamaを通常AttackEventへ割り当てる

```text
Current AttackEvent
Slot E
└─ Music Requirement Entry：E4 / 対応色・RGB

万能ShaondamaをSlot Eへ割り当て
↓
EntryからE4、pitch class E、対応色・RGBを解決
↓
Slot Eへの対応と実効値をcommit
↓
Reserved
```

万能Shaondamaの虹色や生成元から実効RGBを決めません。

---

## 例14：万能Weakが次loopへ進む

```text
現在loop occurrence = Loop 2
Weak Charge判定時刻 = Loop 2終端直前
Loop 2の残り = NoteEventなし

次loop occurrence = Loop 3
先頭NoteEvent = E4
```

この場合、loop境界を理由にWeak Chargeを失敗させず、Loop 3のE4 occurrenceへ解決します。Allocation結果にはE4のNoteEvent definitionだけでなく、Loop 3のloop occurrenceも保持します。

---

## 例15：Charge successと自然破裂が同一フレーム

```text
同一Normal Shaondamaについて
├─ Click Chargeがsuccess
└─ source NoteEvent時刻へ到達
↓
Slot Allocationをcommit
↓
Reservedとして確定
↓
自然破裂させない
```

Chargeがmissとなりcommitされなかった場合の自然破裂可否は、Floating側のlifecycle規則に従います。

---

# 責務境界

## `player/player-action-charge.md`

以下を正とします。

* ClickCharging
* DragCharging
* 入力判定
* 対象選択と、出現演出中・選択不可の個体を入力対象から除外する処理
* Drag中の選択状態
* Release検出
* Charge判定Eventを発生させるタイミング
* ActionState
* キャンセル
* Actionとしてのsuccess / miss通知
* Charge中断処理

本ページでは、Charge判定Eventを受け取った後の**Allocation対象の再検証・Current決定・Slot割り当て・Weak割り当て・atomic commit**を定義します。

Weak時にClick / Drag入力をどのように許可・制限するかはPlayer Action側の責務であり、本ページでは新しいActionStateや入力遷移を追加しません。

---

## `bgm/bgm-attack-event.md`

以下を正とします。

* 通常AttackEventの音楽情報
* 必要音
* Chord / Arpeggio
* Arpeggio順序
* Harmony
* 音楽上のタイミング
* 音楽時間上のCharge対象順を決める時間情報
* Charge受付期間
* 発火タイミング
* Music Requirement Entryが持つexact MIDI Note等の音楽情報

本ページでは、これらの時間データ自体を再定義せず、Current決定時にその論理順を使用します。

---

## `bgm/bgm-attack-judgement.md`

以下を正とします。

* AttackEvent発火時のGameplay判定
* Complete / Incomplete / Zero Chargeの結果
* Chord / Arpeggioの攻撃処理
* 使用するReserved Shaondama実体
* Palette Bullet化
* Palette Bullet発射

本ページでは、発火時にSlotを再割り当てしません。

---

## `shaondama-music/orb-data.md`

通常ShaondamaがWeakへ割り当てられるために必要な、

* source NoteEvent identity
* source NoteEvent occurrence
* Loop周回を区別する情報
* Battle ID
* 出現演出・選択可能・`Reserved`を区別できる情報
* Normalのsource RGBとWildcardのAllocation後実効値
* その他NoteEvent由来runtime data

のデータ契約を正とします。

本ページでは、それらの値がShaondamaから取得可能であることを前提として割り当て規則を定義します。

---

## `shaondama-music/floating-behavior.md`

以下を正とします。

* 通常Lifetime
* 出現演出と選択可能化の状態遷移
* source NoteEvent発音時刻へ未使用で到達した場合の自然破裂
* 自然破裂時の弱い範囲攻撃
* 自然破裂後の消滅
* Reservedとのlifecycle接続

本ページでは、Weak割り当て時に過去source NoteEvent例外を作らないための前提として、このlifecycleを参照します。また、同一フレームのCharge commit結果をFloating側へ渡し、commit済み個体を自然破裂対象から除外します。

---

## `game/index.md`・`combat/index.md`

Battle終了とRoom Retryの高レベル通知、および新しいBattle IDでのruntime再構築開始を正とします。

本ページはその通知を受け、旧BattleのAllocation、Slot、`Reserved`、Weak AttackEvent、および解決済みoccurrenceを破棄します。

---

# 未決事項

## 通常AttackEvent最大蓄積数

現在の想定は**3～5個程度**です。

ただし、最終値は通常AttackEvent UI設計後に決定します。

この未決値はCurrent AttackEventの論理順、Click / DragのSlot割り当て、Weak割り当ての成立規則には影響しません。

---

# 実装上の禁止事項

以下の実装は行いません。

* 出現演出中、現在選択不可、消滅済み、旧Battle所属、または`Reserved`中のShaondamaをAllocation対象にする
* UI表示順をCurrent AttackEvent決定の根拠にする
* 音楽時間上のCharge対象順が完全同時の場合に、MusicChart定義順以外の実装依存順でCurrentを決める
* 1つの通常AttackEvent Slotへ複数ShaondamaをChargeする
* 充填済みSlotへ追加Chargeする
* 対応する未充填Slotがない場合に先頭の同音Slotへ重複Chargeする
* 通常AttackEventが完全充填した後も、そのAttackEventへ追加Chargeする
* 未完成の先行AttackEventを飛ばして後続AttackEventへChargeする
* 選択音が一致するという理由だけで後続AttackEventを検索する
* 発火が近いという理由だけで別AttackEventを優先する
* 同音未充填Slotが複数ある場合に実装依存でランダムに選択する
* 万能Shaondamaを任意の後続AttackEventへ入れる
* 万能Shaondamaを通常AttackEventへ割り当てる際、対応Entryを参照せず虹色表示や生成元から実効Note・Pitch・RGBを決める
* 万能Shaondamaの通常AttackEvent Allocation結果を、個体の恒久的な固有Note・Pitch・RGBとして書き込む
* Current Normal AttackEventが存在する状態でSlot不一致をWeak Attackへ逃がす
* Current Normal AttackEventが存在する状態で、対応する同音Slotがすべて充填済みであることを理由にWeak Attackへ逃がす
* Charge受付期間を終了した過去の未完成AttackEventを再びCurrentにする
* 過去に未完成AttackEventが存在することだけを理由にWeak Attackを禁止する
* Drag中にSlotへ逐次commitする
* Dragを複数の単体Chargeとして順番に処理する
* Drag途中でCurrent AttackEventが完全充填したことを理由に、残りShaondamaを後続AttackEventへ送る
* Dragの一部だけを成功として残す
* Drag miss時に一部Slotだけを書き換えた状態を残す
* Drag選択順をDrag成立条件にする
* Drag選択順をArpeggio発射順にする
* 同音Slotを集合として扱い、必要個数を無視する
* 通常ShaondamaのWeakで別周回の同名NoteEventへsourceを付け替える
* 通常ShaondamaのWeakで「source NoteEventが過去なら別NoteEventへ付け替える」という例外処理を追加する
* 万能ShaondamaをWeakで使用不可とする
* 万能ShaondamaのWeakを旧「待機コードの不足音」へ割り当てる
* 万能ShaondamaのWeakで次NoteEventが同時の場合にランダム選択する
* 万能ShaondamaのWeak検索を現在loopの終端で打ち切る
* 現在loopに候補がないことだけを理由に万能Weak Chargeを失敗させる
* 万能Weakの解決結果へNoteEvent definitionだけを保持し、loop occurrenceを失う
* 万能Weakのtie-breakへTrack順、Pitch順、object生成順等を追加する
* 万能ShaondamaへWeak解決結果のPitch / octave等を恒久的な固有値として書き込む
* Weak AttackEventを通常AttackEventの蓄積上限へ含める
* Weak Charge済みShaondamaを、後からCurrentになった通常AttackEventへ再割り当てする
* Charge成功した瞬間にPalette Bullet化する
* Charge successと自然破裂が同一フレームで競合したとき、commit前に自然破裂させる
* Charge commit済みで`Reserved`となったShaondamaへ自然破裂を発生させる
* Reserved中も通常Lifetimeを進行させ、AttackEvent解決前にShaondamaを通常Lifetimeで消滅させる
* Slotから物理Palette BulletをCharge時点で新規生成する
* Battle終了・Room Retry後も旧BattleのAllocation、Slot、`Reserved`、Weak AttackEvent、解決済みoccurrenceを保持・再利用する
* 本ページの契約として具体的なC#型、enum名、field名、ID形式を固定する
* 本ページ内でAttackEvent発火時の成立判定・使用Bullet決定を再定義する
