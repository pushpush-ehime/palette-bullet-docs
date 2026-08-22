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

* 現在どのAttackEventをCharge対象とするか
* どのSlotへ割り当てるか
* 複数の候補が存在する場合にどれを優先するか
* 同一音のSlotが複数存在する場合にどこへ入れるか
* 重複Chargeをどのように扱うか
* 万能シャオンダマをどのSlotへ割り当てるか
* 通常AttackEventが存在しない場合にどう扱うか

を定義します。

本ページを、**Charge対象AttackEventの決定およびSlot割り当て規則の正本**とします。

Click / Dragそのものの入力・ActionState・キャンセル等は、`player/player-action-charge.md` を正とします。

AttackEventの音楽情報・時間情報は、`bgm/bgm-attack-event.md` を正とします。

AttackEvent発火時の、

* 完全成立
* 不完全完成
* Chord / Arpeggioの発射
* 使用するPalette Bullet
* 重複Chargeされた実体の使用

については、`bgm/bgm-attack-judgement.md` を正とします。

本ページでは、発火時のGameplay判定を再定義しません。

---

# 基本フロー

Charge判定時は、まず現在Charge対象となる通常AttackEventが存在するかを確認します。

```text
Charge判定
↓
現在Charge対象となる通常AttackEventが存在する？
│
├─ Yes
│   ↓
│   通常AttackEventのSlot割り当て
│
└─ No
    ↓
    Weak AttackEventによる単音弱攻撃
```

通常AttackEventが存在する場合は、必ずそのAttackEventを対象としてSlot割り当てを行います。

選択したシャオンダマの音が現在AttackEventに適合しないからといって、Weak AttackEventへ逃がしたり、後続AttackEventを検索したりしません。

---

# 用語

## 通常AttackEvent

曲進行に合わせて表示・蓄積され、通常のAttackEvent UI上で扱われるAttackEventを、本ページでは便宜上**通常AttackEvent**と呼びます。

通常AttackEventには1つ以上の要求Slotが存在し、Chord / Arpeggio等の攻撃を構成できます。

## Weak AttackEvent

Charge対象となる通常AttackEventが存在しない場合に、単音弱攻撃を成立させるため実行時に動的生成するAttackEventです。

Weak AttackEventは通常AttackEventとは別枠で管理します。

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
* どのSlotへ何個Chargeされているか
* どのシャオンダマ実体がどのAttackEvent / Slotへ対応しているか

を管理するために使用します。

Slotの中に物理的な弾丸オブジェクトそのものを格納し、Slotから新しい弾丸を生成するわけではありません。

## 先頭Slot

本ページでいう**先頭Slot**とは、AttackEventが保持している要求Slot順のうち最も先頭にあるSlotを指します。

同じ条件を満たすSlotが複数存在する場合は、この順序を使用して一意に解決します。

---

# Charge可能な通常AttackEvent

## AttackEventは表示順で処理する

複数の通常AttackEventが表示・蓄積されている場合、Charge対象は**表示順**で決定します。

例えば、

```text
AttackEvent A
AttackEvent B
AttackEvent C
```

の順で表示されている場合、

```text
A
↓
B
↓
C
```

の順でCharge対象とします。

以下の条件によって後続AttackEventを優先することはありません。

* 選択したシャオンダマと音が一致する
* 発火タイミングが近い
* Playerから見て扱いやすい
* 任意に選択した

---

# 前のAttackEventを飛ばさない

現在Charge対象となっているAttackEventがCharge受付中かつ未完成である場合、後続AttackEventを先に埋めることはできません。

```text
AttackEvent A
C / E / G

AttackEvent B
A / C / E
```

で、現在Charge対象がAの場合を考えます。

PlayerがCをChargeした場合、

```text
AのC Slot
```

を対象とします。

Aが未完成である限り、BのC SlotへChargeしません。

---

# 次のAttackEventへ進む条件

現在Charge対象のAttackEventから次のAttackEventへ進む条件は、以下です。

## 全要求Slotが充填された場合

現在AttackEventのすべての要求Slotに1発以上Chargeされた場合、そのAttackEventは要求を満たした状態となります。

この時点で、そのAttackEvent自体がまだ音楽上で発火していなくても、既に表示されている次のAttackEventへCharge対象を進めます。

```text
AttackEvent A
全要求Slot充填
↓
AttackEvent Bが表示済み
↓
BをCharge対象にする
```

## Charge受付期間が終了した場合

現在AttackEventが未完成のままCharge受付期間を終了した場合、そのAttackEventの実際の発火を待たず、既に表示されている次のAttackEventへCharge対象を進めます。

```text
AttackEvent A
↓
Charge受付期間終了
↓
Aは未完成
↓
AttackEvent Bが表示済み
↓
BをCharge対象にする
```

Charge受付期間そのものの時間情報は、`bgm/bgm-attack-event.md` を正とします。

## 次の通常AttackEventがまだ存在しない場合

現在AttackEventが、

* 全要求Slot充填
* Charge受付期間終了

のいずれかによってCharge対象から外れ、次の通常AttackEventがまだ表示されていない場合は、

**現在Charge対象となる通常AttackEventなし**

として扱います。

この期間は、後述するWeak AttackEventによる単音弱攻撃を使用します。

---

# 最大蓄積AttackEvent数

通常AttackEventは複数個を表示・蓄積できる設計とします。

現在の想定規模は、

**3～5個程度**

です。

ただし、最終的な最大蓄積数は通常AttackEvent UIの設計と合わせて決定するため、現時点では固定値としません。

Weak AttackEventは、この通常AttackEventの最大蓄積数には含めません。

---

# 通常シャオンダマのSlot割り当て

## 音名で照合する

通常シャオンダマは、自身が持つ音名と現在Charge対象AttackEventの要求Slotを照合します。

例えばシャオンダマがCの場合、

```text
C Slot
```

のみが対応候補となります。

## オクターブは区別しない

Slot照合ではオクターブを区別しません。

```text
C3
C4
C5
```

はいずれも、

```text
C
```

として扱います。

したがって要求SlotがCであれば、オクターブに関係なくCの通常シャオンダマを使用できます。

---

# 同音Slotが複数存在する場合

例えばAttackEventが、

```text
C / C / E
```

を要求する場合、C Slotが複数存在します。

通常シャオンダマCをChargeした場合は、以下の規則で一意に解決します。

## 未充填Slotを優先する

同音の要求Slotに、

* 未充填Slot
* 既に充填されたSlot

が混在している場合、必ず未充填Slotを優先します。

```text
C Slot 1 = 充填済み
C Slot 2 = 未充填

CをCharge
↓
C Slot 2
```

既に充填済みのSlotへ重複するより、未充填Slotを埋めることを優先します。

## 未充填の同音Slotが複数ある場合

未充填の同音Slotが複数存在する場合は、**先頭の未充填Slot**へ割り当てます。

```text
C Slot 1 = 未充填
C Slot 2 = 未充填

CをCharge
↓
C Slot 1
```

次にCをChargeした場合は、

```text
C Slot 1 = 充填済み
C Slot 2 = 未充填

CをCharge
↓
C Slot 2
```

となります。

---

# 重複Charge

同一音を同じAttackEventへ複数回Chargeできます。

ただし、未充填の同音Slotが存在する場合は、重複より未充填Slotの充填を優先します。

## 同音Slotがすべて充填済みの場合

現在AttackEvent自体は他の要求Slot不足によって未完成であり、選択した音に対応するSlotだけがすべて充填済みの場合は、

**先頭の同音Slotへ重複Charge**

します。

例えば、

```text
AttackEvent A

C Slot = 充填済み
E Slot = 未充填
G Slot = 未充填
```

の状態で、さらにCをChargeした場合、

```text
先頭のC Slotへ重複Charge
```

します。

後続AttackEventに未充填のC Slotが存在しても、後続へは送りません。

## 重複は上書きしない

同一Slotへ複数Chargeされた場合、それぞれを別のChargeとして保持します。

```text
Slot C
├─ Cシャオンダマ
├─ Cシャオンダマ
├─ Cシャオンダマ
└─ Cシャオンダマ
```

後からChargeされたシャオンダマによって、先にChargeされたシャオンダマを上書きしません。

発火時にこれらをどのように攻撃へ使用するかは、`bgm/bgm-attack-judgement.md` を正とします。

---

# 対応Slotが存在しない場合

現在Charge対象となる通常AttackEventが存在している状態で、選択した通常シャオンダマの音に対応する要求Slotが存在しない場合は、Slot割り当てに失敗します。

例えば、

```text
現在Charge対象
AttackEvent A
C / E / G

後続
AttackEvent B
A / B / D
```

でPlayerがAのシャオンダマをChargeした場合、

AttackEvent AにはA Slotが存在しないため、AttackEvent Bへ送ることはありません。

```text
AttackEvent AにA Slotなし
↓
AttackEvent Bは検索しない
↓
割り当て失敗
```

Charge Actionとしての`miss`判定については、`player/player-action-charge.md` を正とします。

通常AttackEventが存在しているにもかかわらず、対応音がないことを理由にWeak AttackEventへ切り替えることもありません。

---

# 万能シャオンダマのSlot割り当て

## 基本

万能シャオンダマは音名によるSlot制限を受けません。

ただし、通常シャオンダマと同様に、

**現在Charge対象となっている通常AttackEventのみ**

を対象とします。

後続AttackEventを飛び越えて自由なSlotへ入れることはできません。

## 未充填Slotを優先する

現在AttackEventに未充填の要求Slotが存在する場合、万能シャオンダマはその未充填SlotへChargeします。

## 未充填Slotが複数ある場合

未充填Slotが複数存在する場合は、

**先頭の未充填Slot**

へ割り当てます。

例えば、

```text
C Slot = 未充填
E Slot = 未充填
G Slot = 未充填
```

の場合、

```text
万能シャオンダマ
↓
C Slot
```

となります。

その後、

```text
C Slot = 充填済み
E Slot = 未充填
G Slot = 未充填
```

で万能シャオンダマをChargeした場合は、

```text
E Slot
```

へ割り当てます。

万能シャオンダマだからといって、未完成の現在AttackEventを飛び越え、後続AttackEventへ割り当てることはありません。

---

# 通常AttackEventが存在しない場合

現在Charge対象となる通常AttackEventが存在しない期間でも、Playerはシャオンダマを使った弱攻撃を行えます。

この弱攻撃には、**Weak AttackEvent**を使用します。

---

# Weak AttackEvent

## 目的

Weak AttackEventは、通常AttackEventが存在しない期間にも、

```text
Charge
↓
音楽タイミング待機
↓
Palette Bullet化
↓
発射
```

という既存の音楽同期攻撃構造を維持するための、単音弱攻撃専用AttackEventです。

通常AttackEventのChord / Arpeggio等と同等の大攻撃を構成するものではありません。

## 生成条件

現在Charge対象となる通常AttackEventが存在しない状態で、弱攻撃としてシャオンダマ1個をChargeするたびに、

**そのシャオンダマ専用のWeak AttackEventを1つ動的生成**

します。

```text
現在Charge対象の通常AttackEventなし
↓
シャオンダマ1個をCharge
↓
Weak AttackEventを1つ生成
```

1つのWeak AttackEventを複数回の弱Chargeで共有しません。

## 要求Slot

Weak AttackEventが持つ要求Slotは、

**必ず1つ**

です。

対象シャオンダマ1個に対応する単音Slotのみを持ちます。

```text
Cシャオンダマ
↓
Weak AttackEvent
└─ C Slot × 1
```

## Chord / Arpeggio

Weak AttackEventは、

* Chord
* Arpeggio

を構成しません。

常に1音単位の弱攻撃として扱います。

## Harmony・完全成立バフ

Weak AttackEventは、

* Harmony
* Chord完全成立バフ
* Arpeggio完全成立効果
* その他通常AttackEventの複数Slot成立を前提とする効果

を持ちません。

Weak AttackEventの目的は、単音による弱攻撃を音楽タイミングへ同期させることです。

---

# Weak AttackEventの発火タイミング

Weak AttackEventの発火タイミングは、同じ音名のNoteEventを後から検索して決定するのではありません。

Chargeされたシャオンダマには、そのシャオンダマの生成元となった音楽情報が紐づいています。

そのため、

**対象シャオンダマ自身の生成元NoteEventの発音タイミング**

をWeak AttackEventの発火タイミングとして使用します。

例えば、

```text
MIDI / NoteEvent
C4
発音タイミング = T
↓
そのNoteEventからC4シャオンダマが生成される
↓
Tより前から世界上に存在
↓
PlayerがWeak Charge
↓
Weak AttackEvent生成
↓
発火タイミング = 元NoteEventのT
↓
曲がTへ到達
↓
Weak AttackEvent発火
```

となります。

したがって、

* 次に鳴る同名音を検索する
* 最も近いCを検索する
* 別のC NoteEventへ付け替える

といった処理は行いません。

---

# Weak Charge後に通常AttackEventが表示された場合

一度Weak AttackEventへ割り当てられたシャオンダマは、その後に通常AttackEventが表示されても再割り当てしません。

例えば、

```text
通常AttackEventなし
↓
CシャオンダマをWeak Charge
↓
Weak AttackEvent C生成
↓
元NoteEventの発音タイミング待機
↓
通常AttackEvent Bが表示
```

となった場合でも、

```text
Weak AttackEvent C
↓
そのまま維持
↓
元NoteEventの発音タイミングで発火
```

します。

通常AttackEvent Bが表示されたことを理由に、

```text
Weak AttackEvent
↓
通常AttackEvent BのSlot
```

へ付け替えることはありません。

BがCharge対象となった後に新しく行われるChargeから、通常AttackEvent BのSlot割り当てを使用します。

---

# Weak AttackEventと通常AttackEventの蓄積枠

Weak AttackEventは、通常AttackEventの最大蓄積数とは別管理です。

そのため、

```text
通常AttackEvent最大蓄積数
```

の計算にはWeak AttackEventを含めません。

Weak AttackEventが待機中であっても、通常AttackEventの表示・蓄積可能数を消費しません。

---

# Weak AttackEventのUI

Weak AttackEventは、通常AttackEvent用UIには表示しません。

通常AttackEventの、

* Slot一覧
* Chord / Arpeggio表示
* AttackEvent蓄積表示

等へWeak AttackEventを追加しません。

Weak AttackEvent用の個別演出・表示を将来追加するかどうかは、本ページでは定義しません。

---

# Weak AttackEventの終了

Weak AttackEventは発火後に破棄します。

```text
Weak AttackEvent生成
↓
対象シャオンダマ待機
↓
元NoteEventの音楽タイミング
↓
発火
↓
攻撃処理
↓
Weak AttackEvent破棄
```

実際のPalette Bullet化・発射処理の詳細は、AttackEvent発火時処理の正本を参照します。

---

# Charge後のシャオンダマ実体

通常AttackEvent / Weak AttackEventのどちらであっても、Charge成功した瞬間に攻撃用Palette Bulletを新規生成して即時発射する構造にはしません。

通常AttackEventへChargeされたシャオンダマは、

```text
シャオンダマ
↓
Charge成功
↓
AttackEvent / Slotへ対応付け
↓
世界上で待機
↓
AttackEvent発火
```

という状態になります。

Weak AttackEventの場合も同様に、

```text
シャオンダマ
↓
Weak Charge
↓
Weak AttackEvent / Slotへ対応付け
↓
世界上で待機
↓
元NoteEventの発音タイミング
↓
Weak AttackEvent発火
```

となります。

Slotは対応関係を管理するためのものであり、物理オブジェクトそのものをSlot内部へ移動・格納するという意味ではありません。

---

# 割り当てアルゴリズム

通常AttackEventに対する割り当ては、以下の順序で処理します。

```text
1. 現在Charge対象となる通常AttackEventを決定
↓
2. 通常シャオンダマ / 万能シャオンダマを判定
↓
3-A. 通常シャオンダマ
     音名が一致する要求Slotを抽出
     ↓
     未充填Slotがある？
     │
     ├─ Yes
     │   ↓
     │   先頭の未充填同音Slot
     │
     └─ No
         ↓
         対応音Slot自体が存在する？
         │
         ├─ Yes
         │   ↓
         │   現在Eventが未完成なら
         │   先頭の同音Slotへ重複Charge
         │
         └─ No
             ↓
             割り当て失敗

3-B. 万能シャオンダマ
     ↓
     現在Eventの未充填要求Slotを抽出
     ↓
     先頭の未充填SlotへCharge
```

通常AttackEventが存在しない場合は、このアルゴリズムへ入らずWeak AttackEvent処理へ移ります。

```text
現在Charge対象の通常AttackEventなし
↓
弱攻撃としてシャオンダマ1個をCharge
↓
Weak AttackEventを1つ生成
↓
要求Slotを1つ生成
↓
対象シャオンダマを対応付け
↓
元NoteEventの発音タイミングを発火タイミングとして保持
```

---

# 割り当て例

## 例1：複数AttackEvent

```text
AttackEvent 1
C / E / G

AttackEvent 2
A / C / E

AttackEvent 3
G / B / D
```

AttackEvent 1が現在Charge対象の場合、CをChargeすると、

```text
AttackEvent 1
C Slot
```

へ入ります。

AttackEvent 1のCが既に充填済みでも、E / Gが未充填でAttackEvent 1が未完成なら、

```text
AttackEvent 1
先頭C Slotへ重複Charge
```

します。

AttackEvent 2のCへは送りません。

---

## 例2：同音Slot

```text
AttackEvent
C / C / E
```

すべて未充填の状態で最初のCをChargeすると、

```text
1つ目のC Slot
```

へ入ります。

次のCは、

```text
2つ目のC Slot
```

へ入ります。

さらにCをChargeし、Eがまだ未充填の場合は、

```text
1つ目のC Slot
```

へ重複Chargeします。

---

## 例3：万能シャオンダマ

```text
AttackEvent
C / E / G
```

がすべて未充填の場合、

```text
万能シャオンダマ
↓
C Slot
```

となります。

Cが充填済みなら、

```text
万能シャオンダマ
↓
E Slot
```

となります。

---

## 例4：現在Eventに対応音がない

```text
AttackEvent 1
C / E / G

AttackEvent 2
A / B / D
```

現在Charge対象がAttackEvent 1のときにAをChargeしても、

```text
AttackEvent 2
A Slot
```

へは送りません。

現在AttackEventにA Slotが存在しないため、割り当て失敗です。

---

## 例5：通常AttackEventが存在しない

現在Charge対象の通常AttackEventが存在しない状態で、生成元NoteEventがC4のシャオンダマを弱攻撃としてChargeします。

```text
C4シャオンダマ
↓
Weak AttackEvent生成
↓
C Slot × 1
↓
元C4 NoteEventの発音タイミングを保持
↓
そのタイミングまで待機
↓
Weak AttackEvent発火
↓
Weak AttackEvent破棄
```

待機中に通常AttackEventが新しく表示されても、このC4シャオンダマを通常AttackEventへ再割り当てしません。

---

# 責務境界

## `player/player-action-charge.md`

以下を正とします。

* ClickCharging
* DragCharging
* 入力判定
* 対象選択
* ActionState
* Charge判定を発生させるタイミング
* キャンセル
* Charge Actionとしてのsuccess / miss
* Charge中断処理

本ページではこれらを再定義しません。

Weak AttackEvent用Charge時にClick / Dragをどのように制限するかも、Action側の仕様として扱います。

本ページが要求するのは、**Weak AttackEvent 1個につき割り当て対象シャオンダマが1個であること**です。

## `bgm/bgm-attack-event.md`

以下を正とします。

* 通常AttackEventの音楽情報
* 必要音
* Chord / Arpeggio
* Arpeggio順序
* Harmony
* 音楽上のタイミング
* Charge受付期間に関係する時間情報
* 発火タイミング

本ページではこれらを再定義しません。

## `bgm/bgm-attack-judgement.md`

以下を正とします。

* AttackEvent発火時のGameplay判定
* 全Slot成立
* 不完全完成
* Chord / Arpeggioの攻撃処理
* 使用するCharge済みシャオンダマ実体
* 同一Slotへの重複分の使用
* Palette Bullet化
* 発射

本ページでは発火時にSlotを再割り当てしません。

---

# 未決事項

## 通常AttackEvent最大蓄積数

現在の想定は**3～5個程度**です。

ただし、最終値は通常AttackEvent UI設計後に決定します。

## Weak AttackEvent時のCharge Action制限

Weak AttackEventは1シャオンダマ単位で生成します。

ただし、通常AttackEventが存在しない場合に、

* DragCharging自体を開始不可とする
* Drag操作を別の方法で1個Chargeへ制限する

など、Player Actionとしてどのように入力を制限するかは `player/player-action-charge.md` 側で確定します。

本ページでは新しいActionStateや入力遷移を追加しません。

## 万能シャオンダマとWeak AttackEvent

万能シャオンダマは通常AttackEvent内のSlot解決規則については本ページで確定しています。

一方、通常AttackEventが存在しない期間に万能シャオンダマをWeak AttackEventへ使用できるか、および使用する場合の発火タイミングは現時点では確定していません。

生成元NoteEventとの対応が確認できないまま、通常シャオンダマと同じWeak AttackEvent規則を適用しません。

---

# 実装上の禁止事項

以下の実装は行いません。

* 未完成の先行AttackEventを飛ばして後続AttackEventへChargeする
* 選択音が一致するという理由だけで後続AttackEventを優先する
* 発火が近いAttackEventを優先する
* 未充填の同音Slotがあるのに充填済みSlotへ重複する
* 同音未充填Slotが複数ある場合に実装依存でランダムに選択する
* 万能シャオンダマを任意の後続AttackEventへ入れる
* Slotから物理弾丸を新規生成する
* 通常AttackEventが存在する状態でSlot不一致をWeak AttackEventへ逃がす
* Weak AttackEventを通常AttackEventの蓄積上限へ含める
* Weak AttackEventを通常AttackEvent UIへ表示する
* Weak Charge済みシャオンダマを、後から表示された通常AttackEventへ再割り当てする
* Weak AttackEventの発火先として別の同名NoteEventを検索する
* 本ページ内で発火時の成立判定・使用Bullet決定を再定義する
