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
* 複数のAttackEventが存在する場合にどれを優先するか
* 同一音のSlotが複数存在する場合にどこへ入れるか
* 対応する未充填Slotが存在しない場合にどう扱うか
* 万能シャオンダマをどのSlotへ割り当てるか
* Weak Attackを使用できる状態へいつ移行するか
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

については、`bgm/bgm-attack-judgement.md` を正とします。

本ページでは、発火時のGameplay判定を再定義しません。

---

# 基本原則

Charge先の決定では、常に、

**現在Charge対象となる通常AttackEventが存在するか**

を最初に判定します。

```text
Charge判定
↓
現在Charge対象となる通常AttackEventが存在する？
│
├─ Yes
│   ↓
│   現在AttackEventだけを対象としてSlot割り当て
│
└─ No
    ↓
    Weak Attackとして処理
```

現在Charge対象となる通常AttackEventが存在する場合は、必ずそのAttackEventだけを対象としてSlot割り当てを行います。

選択したシャオンダマが現在AttackEventに適合しない場合でも、

* 後続AttackEventを検索する
* Weak Attackへ切り替える

ことはありません。

---

# 用語

## 通常AttackEvent

曲進行に合わせて表示・蓄積され、通常のAttackEvent UI上で扱われるAttackEventを、本ページでは便宜上**通常AttackEvent**と呼びます。

通常AttackEventには1つ以上の要求Slotが存在し、Chord / Arpeggio等の攻撃を構成できます。

---

## 現在Charge対象の通常AttackEvent

表示・蓄積されている通常AttackEventのうち、現在シャオンダマを割り当てる対象となっている1つのAttackEventです。

同時に複数の通常AttackEventをCharge対象にはしません。

---

## Weak AttackEvent

現在Charge対象となる通常AttackEventが存在しない場合に、単音弱攻撃を成立させるため実行時に動的生成するAttackEventです。

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
* どのシャオンダマ実体がどのAttackEvent / Slotへ対応しているか

を管理するために使用します。

通常AttackEventの要求Slotは、

**1 Slotにつき最大1 Shaondama**

を保持します。

1つのSlotへ複数のShaondamaを重複してChargeすることはありません。

Slotの中に物理的な弾丸オブジェクトそのものを格納し、Slotから新しい弾丸を生成するわけではありません。

---

## 同音Slot

同じAttackEvent内で同一音名を複数要求している場合、それぞれを独立したSlotとして扱います。

例えば、

```text
C / C / G
```

であれば、

```text
C Slot 1
C Slot 2
G Slot
```

という3つの別々のSlotを持ちます。

この場合にCを2つChargeすることは可能ですが、1つのSlotへの重複Chargeではありません。

```text
C Shaondama
↓
C Slot 1

C Shaondama
↓
C Slot 2
```

のように、異なる要求Slotを1つずつ充填します。

---

## 先頭Slot

本ページでいう**先頭Slot**とは、AttackEventが保持している要求Slot順のうち最も先頭にあるSlotを指します。

同じ条件を満たす未充填Slotが複数存在する場合は、この順序を使用して一意に解決します。

---

# Charge対象となる通常AttackEventの決定

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

現在Charge対象のAttackEventが処理中である間は、後続AttackEventをCharge対象にしません。

以下の条件によって後続AttackEventを優先することもありません。

* 選択したシャオンダマと音が一致する
* 発火タイミングが近い
* Playerから見て扱いやすい
* 任意に選択した

---

# 前のAttackEventを飛ばさない

現在Charge対象となっているAttackEventがCharge受付中かつ未完成である場合、後続AttackEventを先に埋めることはできません。

例えば、

```text
AttackEvent A
C / E / G

AttackEvent B
A / C / E
```

で、現在Charge対象がAの場合を考えます。

PlayerがCをChargeした場合は、

```text
AttackEvent A
C Slot
```

だけを対象とします。

AttackEvent Aが現在Charge対象である限り、AttackEvent BのC Slotは検索しません。

---

# 完全充填

現在Charge対象の通常AttackEventについて、

**すべての要求SlotにShaondamaが1つずつ割り当てられた状態**

を完全充填とします。

例えば、

```text
C [●]
E [●]
G [●]
```

であれば完全充填です。

一方、

```text
C [●]
E [ ]
G [●]
```

であれば未完成です。

Slotは1 Slotにつき最大1 Shaondamaであるため、完全充填後に同じAttackEventへ追加Chargeすることはありません。

---

# 次のAttackEventへ進む条件

現在Charge対象のAttackEventから次の通常AttackEventへ進む条件は、以下です。

## 全要求Slotが完全充填された場合

現在AttackEventのすべての要求SlotにShaondamaが1つずつ割り当てられた場合、そのAttackEventは完全充填となります。

完全充填した時点で、そのAttackEvent自体がまだ音楽上で発火していなくても、そのAttackEventへの追加Chargeは終了します。

既に次の通常AttackEventが表示され、Charge対象となれる状態であれば、Charge対象を次へ進めます。

```text
AttackEvent A
全要求Slot完全充填
↓
AttackEvent AへのCharge終了
↓
AttackEvent BがCharge対象として存在
↓
AttackEvent Bへ進む
```

完全充填済みのAttackEventを再びCharge対象へ戻すことはありません。

---

## Charge受付期間が終了した場合

現在AttackEventが未完成のままCharge受付期間を終了した場合、そのAttackEventへのChargeを終了します。

AttackEvent自体の実際の発火を待ってから切り替える必要はありません。

```text
AttackEvent A
↓
Charge受付期間終了
↓
AttackEvent Aは未完成
↓
AttackEvent AへのCharge終了
↓
次の通常AttackEventへ進む
```

Charge受付期間を終了した過去のAttackEventは、その後再びCharge対象にはしません。

そのAttackEventに未充填Slotが残っていても、後からChargeして補完することはありません。

Charge受付期間そのものの時間情報は、`bgm/bgm-attack-event.md` を正とします。

---

## 次の通常AttackEventが存在しない場合

現在AttackEventが、

* 完全充填
* Charge受付期間終了

のいずれかによってCharge対象から外れ、次にCharge対象となる通常AttackEventが存在しない場合は、

**現在Charge対象となる通常AttackEventなし**

として扱います。

この状態ではWeak Attackを使用できます。

過去に未完成のAttackEventが存在しているかどうかは、Weak Attackの可否判定には使用しません。

Weak Attackの可否は、

**現在Charge対象となる通常AttackEventが存在するか**

だけで判定します。

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

通常シャオンダマは、自身が持つ音名と現在Charge対象AttackEventの**未充填要求Slot**を照合します。

例えばシャオンダマがCの場合、

```text
C Slot
```

のみが対応候補となります。

---

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

通常シャオンダマCをChargeした場合は、未充填のC Slotだけを候補として検索します。

---

## 先頭の未充填同音Slotへ割り当てる

未充填の同音Slotが複数存在する場合は、

**先頭の未充填Slot**

へ割り当てます。

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

## 充填済みSlotは候補にしない

既にShaondamaが割り当てられているSlotへ追加Chargeすることはありません。

例えば、

```text
C Slot 1 = 充填済み
C Slot 2 = 未充填

CをCharge
```

の場合は、

```text
C Slot 2
```

へ割り当てます。

```text
C Slot 1
```

へ重複Chargeしてはいけません。

---

# 対応する未充填Slotが存在しない場合

現在Charge対象となる通常AttackEventが存在している状態では、通常シャオンダマは、

**選択した音名に対応する未充填Slotが現在AttackEventに存在する場合のみ**

Slot割り当てに成功します。

例えば、

```text
要求
C / E / G

現在状態
C [●]
E [ ]
G [ ]
```

の場合、

```text
E → Charge成功
G → Charge成功
A → Charge失敗
C → Charge失敗
```

となります。

C Slot自体は存在しますが、対応するC Slotは既にすべて充填済みであるため、追加のCはChargeできません。

---

## 要求されていない音

例えば、

```text
現在Charge対象
AttackEvent A
C / E / G

後続
AttackEvent B
A / B / D
```

でPlayerがAの通常シャオンダマをChargeした場合、AttackEvent AにはAの未充填Slotが存在しないため割り当てに失敗します。

```text
AttackEvent AにAの未充填Slotなし
↓
AttackEvent Bは検索しない
↓
割り当て失敗
```

---

## 対応Slotがすべて充填済みの音

例えば、

```text
AttackEvent A

C [●]
E [ ]
G [ ]
```

の状態でCをChargeした場合も、

```text
Cの未充填Slotなし
↓
割り当て失敗
```

となります。

既存のC Slotへ追加Chargeすることはありません。

---

## Weak Attackへ変換しない

現在Charge対象となる通常AttackEventが存在する限り、

* 要求されていない音
* 対応する同音Slotがすべて充填済みの音

をWeak Attackへ送ることはありません。

```text
現在Charge対象の通常AttackEventあり
↓
対応する未充填Slotなし
↓
Charge失敗
```

です。

```text
現在Charge対象の通常AttackEventあり
↓
対応する未充填Slotなし
↓
Weak Attack
```

とはしません。

Charge Actionとしての`miss`判定については、`player/player-action-charge.md` を正とします。

---

# 後続AttackEvent検索の禁止

Slot割り当て時に検索対象としてよい通常AttackEventは、

**現在Charge対象となっている1つのAttackEventだけ**

です。

例えば、

```text
現在AttackEvent
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
現在AttackEvent
↓
Aの未充填Slotなし
↓
Charge失敗
```

とします。

後続AttackEventへのChargeが可能になるのは、そのAttackEventが正式に現在Charge対象へ切り替わった後です。

---

# 完全充填後の追加Charge禁止

通常AttackEventが完全充填された時点で、そのAttackEventへのCharge処理は終了します。

例えば、

```text
AttackEvent A

C [●]
E [●]
G [●]
```

となった場合、その後にC / E / GのShaondamaをChargeしてもAttackEvent Aへ追加しません。

```text
AttackEvent A 完全充填
↓
AttackEvent AへのCharge終了
↓
次の通常AttackEventへ移行
```

とします。

完全充填済みAttackEventに対して、

* 同じ音を追加Chargeする
* 要求音だけ追加で保持する
* 既存Slotへ複数Shaondamaを保持する

といった処理は行いません。

---

# 万能シャオンダマのSlot割り当て

## 基本

万能シャオンダマは音名によるSlot制限を受けません。

ただし、通常シャオンダマと同様に、

**現在Charge対象となっている通常AttackEventのみ**

を対象とします。

後続AttackEventを飛び越えて自由なSlotへ入れることはできません。

---

## 未充填Slotだけを対象にする

万能シャオンダマは、現在AttackEventの未充填要求Slotだけを候補とします。

既に充填済みのSlotへ追加Chargeすることはありません。

---

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

# Weak Attackを使用できる条件

Weak Attackを使用できる基本条件は、

**現在Charge対象となる通常AttackEventが存在しないこと**

です。

これは例えば、

* Charge可能な通常AttackEventが最初から存在しない
* 存在していた通常AttackEventをすべて完全充填した
* Charge受付期間終了によって現在Charge対象となる通常AttackEventがなくなった
* 次の通常AttackEventがまだ表示されていない

といった状態を含みます。

過去に未完成のAttackEventが残っていること自体は、Weak Attackを禁止する理由にはなりません。

---

# 通常AttackEventが存在しない場合

現在Charge対象となる通常AttackEventが存在しない期間でも、Playerは通常シャオンダマを使ったWeak Attackを行えます。

この場合、通常AttackEventの要求音との照合は行いません。

通常シャオンダマの音名に関係なくWeak Attackとして扱います。

例えば、

```text
C → Weak Attack
D → Weak Attack
E → Weak Attack
F → Weak Attack
G → Weak Attack
A → Weak Attack
B → Weak Attack
```

となります。

---

# Weak AttackEventへの割り当て

## 生成条件

現在Charge対象となる通常AttackEventが存在しない状態で、通常シャオンダマ1個をWeak AttackとしてChargeするたびに、

**そのシャオンダマ専用のWeak AttackEventを1つ動的生成**

します。

```text
現在Charge対象の通常AttackEventなし
↓
通常シャオンダマ1個をCharge
↓
Weak AttackEventを1つ生成
```

1つのWeak AttackEventを複数回のWeak Chargeで共有しません。

---

## 要求Slot

Weak AttackEventが持つ要求Slotは、

**1つ**

です。

対象となる通常シャオンダマ1個に対応する単音Slotを持ちます。

```text
C Shaondama
↓
Weak AttackEvent
└─ C Slot × 1
```

Weak AttackEventの目的は、通常AttackEventの複数Slot攻撃を構成することではなく、通常AttackEventがCharge対象として存在しない期間の単音弱攻撃を扱うことです。

Weak AttackEventの発火時Gameplay処理やPalette Bullet化・発射の詳細については、本ページでは再定義しません。

---

# Weak Charge後に通常AttackEventが表示された場合

一度Weak AttackEventへ割り当てられた通常シャオンダマは、その後に通常AttackEventが表示されても再割り当てしません。

例えば、

```text
現在Charge対象の通常AttackEventなし
↓
C ShaondamaをWeak Attackへ割り当て
↓
Weak AttackEvent C生成
↓
その後、通常AttackEvent Bが表示
```

となった場合でも、既にWeak AttackEventへ割り当て済みのC Shaondamaを、

```text
Weak AttackEvent
↓
通常AttackEvent BのSlot
```

へ付け替えることはありません。

AttackEvent Bが現在Charge対象となった後に新しく行われるChargeから、通常AttackEvent BのSlot割り当て規則を使用します。

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

# Charge後のシャオンダマ実体

通常AttackEvent / Weak AttackEventのどちらであっても、Charge成功した瞬間に攻撃用Palette Bulletを新規生成して即時発射する構造にはしません。

通常AttackEventへChargeされたシャオンダマは、

```text
Shaondama
↓
Charge成功
↓
AttackEvent / Slotへ対応付け
```

されます。

Weak AttackEventの場合も、

```text
Shaondama
↓
Weak AttackとしてCharge
↓
Weak AttackEvent / Slotへ対応付け
```

されます。

Slotは対応関係を管理するためのものであり、物理オブジェクトそのものをSlot内部へ移動・格納するという意味ではありません。

AttackEvent発火時のPalette Bullet化・発射処理については、発火時処理の正本を参照します。

---

# 割り当てアルゴリズム

Charge入力に対する割り当ては、以下の順序で処理します。

```text
Charge入力
↓
現在Charge対象の通常AttackEventが存在する？
│
├─ No
│   ↓
│   Weak Attackとして処理
│
└─ Yes
    ↓
    選択したShaondamaを判定
    │
    ├─ 通常Shaondama
    │   ↓
    │   選択した音名に対応する
    │   未充填Slotが現在AttackEventに存在する？
    │   │
    │   ├─ Yes
    │   │   ↓
    │   │   先頭の対応未充填SlotへCharge
    │   │   ↓
    │   │   AttackEventが完全充填された？
    │   │       │
    │   │       ├─ Yes
    │   │       │   ↓
    │   │       │   現在AttackEventへのCharge終了
    │   │       │   ↓
    │   │       │   次の通常AttackEventへ進む
    │   │       │
    │   │       └─ No
    │   │           ↓
    │   │           現在AttackEventを継続
    │   │
    │   └─ No
    │       ↓
    │       Charge失敗
    │       ※後続AttackEventを検索しない
    │       ※Weak Attackへ変換しない
    │
    └─ 万能Shaondama
        ↓
        現在AttackEventの未充填Slotを抽出
        ↓
        先頭の未充填SlotへCharge
        ↓
        AttackEventが完全充填された？
            │
            ├─ Yes
            │   ↓
            │   現在AttackEventへのCharge終了
            │   ↓
            │   次の通常AttackEventへ進む
            │
            └─ No
                ↓
                現在AttackEventを継続
```

現在AttackEventのCharge受付期間が終了した場合は、完全充填しているかどうかにかかわらず、そのAttackEventへのChargeを終了して次の対象へ進みます。

```text
現在AttackEvent
↓
Charge受付期間終了
↓
現在AttackEventをCharge対象から外す
↓
次の通常AttackEventが存在する？
│
├─ Yes
│   ↓
│   次の通常AttackEventをCharge対象にする
│
└─ No
    ↓
    現在Charge対象の通常AttackEventなし
    ↓
    Weak Attack使用可能
```

過去の未完成AttackEventへ戻る処理は行いません。

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

その後、

```text
AttackEvent 1

C [●]
E [ ]
G [ ]
```

の状態でさらにCをChargeした場合は、

```text
Cの未充填Slotなし
↓
Charge失敗
```

となります。

AttackEvent 2のC Slotは検索しません。

---

## 例2：同音Slot

```text
AttackEvent
C / C / E
```

すべて未充填の状態で最初のCをChargeすると、

```text
C Slot 1
```

へ入ります。

次のCは、

```text
C Slot 2
```

へ入ります。

その後、

```text
C Slot 1 = 充填済み
C Slot 2 = 充填済み
E Slot   = 未充填
```

の状態でさらにCをChargeした場合は、

```text
Cの未充填Slotなし
↓
Charge失敗
```

となります。

C Slot 1またはC Slot 2へ重複Chargeすることはありません。

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

既に充填済みのC Slotへ追加Chargeすることはありません。

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

```text
AttackEvent 1にAの未充填Slotなし
↓
Charge失敗
```

です。

Weak Attackにも変換しません。

---

## 例5：完全充填後に次へ進む

```text
AttackEvent 1
C [●]
E [●]
G [ ]

AttackEvent 2
D [ ]
F [ ]
A [ ]
```

ここでGをChargeすると、

```text
AttackEvent 1
C [●]
E [●]
G [●]
```

となり、AttackEvent 1が完全充填します。

その時点で、

```text
AttackEvent 1へのCharge終了
↓
AttackEvent 2を現在Charge対象にする
```

となります。

以降のChargeはAttackEvent 1ではなくAttackEvent 2に対して判定します。

---

## 例6：すべての通常AttackEventを処理した後

```text
AttackEvent 1 完全充填
AttackEvent 2 完全充填
AttackEvent 3 完全充填
↓
現在Charge対象の通常AttackEventなし
```

となった場合、以降の通常シャオンダマはWeak Attackとして使用できます。

```text
C → Weak Attack
D → Weak Attack
E → Weak Attack
F → Weak Attack
G → Weak Attack
A → Weak Attack
B → Weak Attack
```

通常AttackEventで要求されていた音名かどうかによってWeak Attackの可否を変更しません。

---

## 例7：受付終了した未完成AttackEvent

```text
AttackEvent 1
C [●]
E [ ]
G [ ]

↓
Charge受付期間終了
```

この場合、AttackEvent 1は未完成ですがCharge対象から外れます。

```text
AttackEvent 1
Charge受付終了
↓
過去のAttackEventとして処理
↓
再Charge不可
```

次の通常AttackEventが存在する場合は、そのAttackEventへ進みます。

存在しない場合は、

```text
現在Charge対象の通常AttackEventなし
↓
Weak Attack使用可能
```

となります。

AttackEvent 1に未充填のE / G Slotが残っていることを理由にWeak Attackを禁止しません。

---

## 例8：通常AttackEventが最初から存在しない

現在Charge対象となる通常AttackEventが最初から存在しない場合、

```text
現在Charge対象の通常AttackEventなし
↓
通常ShaondamaをCharge
↓
Weak Attackとして処理
```

となります。

この場合も通常AttackEvent用の音名照合は行いません。

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

Weak Attack用Charge時にClick / Dragをどのように制限するかも、Action側の仕様として扱います。

本ページが定義するのは、現在Charge対象となる通常AttackEventが存在しない場合にWeak Attack側へ割り当てることです。

---

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

---

## `bgm/bgm-attack-judgement.md`

以下を正とします。

* AttackEvent発火時のGameplay判定
* 全Slot成立
* 不完全完成
* Chord / Arpeggioの攻撃処理
* 使用するCharge済みシャオンダマ実体
* Palette Bullet化
* 発射

本ページでは、発火時にSlotを再割り当てしません。

---

# 未決事項

## 通常AttackEvent最大蓄積数

現在の想定は**3～5個程度**です。

ただし、最終値は通常AttackEvent UI設計後に決定します。

---

## Weak AttackEvent時のCharge Action制限

Weak AttackEventは通常シャオンダマ1個単位で生成します。

ただし、通常AttackEventが存在しない場合に、

* DragCharging自体を開始不可とする
* Drag操作を別の方法で1個Chargeへ制限する

など、Player Actionとしてどのように入力を制限するかは `player/player-action-charge.md` 側で確定します。

本ページでは新しいActionStateや入力遷移を追加しません。

---

## 万能シャオンダマとWeak AttackEvent

万能シャオンダマは、通常AttackEvent内のSlot解決規則については本ページで確定しています。

一方、現在Charge対象となる通常AttackEventが存在しない期間に、

* 万能シャオンダマをWeak Attackへ使用できるか
* 使用できる場合にどのようなWeak AttackEventへ割り当てるか
* 使用する場合の発火タイミング

は現時点では確定していません。

そのため、通常シャオンダマのWeak Attack規則を万能シャオンダマへ自動的に適用しません。

---

# 実装上の禁止事項

以下の実装は行いません。

* 1つの通常AttackEvent Slotへ複数のShaondamaをChargeする
* 充填済みSlotへ追加Chargeする
* 対応する未充填Slotがない場合に先頭の同音Slotへ重複Chargeする
* 通常AttackEventが完全充填した後も、そのAttackEventへ追加Chargeする
* 完全充填後に要求音だけを同じAttackEventへ追加Chargeする
* 未完成の先行AttackEventを飛ばして後続AttackEventへChargeする
* 選択音が一致するという理由だけで後続AttackEventを検索する
* 発火が近いAttackEventを優先する
* 同音未充填Slotが複数ある場合に実装依存でランダムに選択する
* 万能シャオンダマを任意の後続AttackEventへ入れる
* 現在Charge対象の通常AttackEventが存在する状態でSlot不一致をWeak Attackへ逃がす
* 現在Charge対象の通常AttackEventが存在する状態で、対応する同音Slotがすべて充填済みであることを理由にWeak Attackへ逃がす
* Charge受付期間を終了した過去の未完成AttackEventを再びCharge対象にする
* 過去に未完成AttackEventが存在することだけを理由にWeak Attackを禁止する
* Slotから物理弾丸を新規生成する
* Weak AttackEventを通常AttackEventの蓄積上限へ含める
* Weak Charge済みShaondamaを、後から表示された通常AttackEventへ再割り当てする
* 本ページ内で発火時の成立判定・使用Bullet決定を再定義する

