---
title: "AttackEvent成立判定"
description: Palette BulletにおけるAttackEvent発火時のGameplay成立判定・使用実体仕様
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
  - /tasks/music-chart-scriptableobject/pb-task-0016
---

# AttackEvent成立判定

## 目的

本ページでは、AttackEvent発火時に、

> **各SlotへCharge済みの結果をどのようにGameplay上の成立状態として判定し、どのシャオンダマ実体を攻撃へ使用するか**

を定義します。

本ページを、

- 通常AttackEvent発火時の完全成立 / 不完全完成判定
- 発火時に使用するCharge済みシャオンダマ実体
- Chord / Arpeggioの発射対象
- 重複Chargeされた実体の扱い
- Weak AttackEvent発火時の使用実体・終了処理

の正本とします。

一方、本ページでは、

- どのAttackEventを現在Charge対象とするか
- どのSlotへChargeするか
- Slot優先順位
- 重複Charge先
- 万能シャオンダマのSlot決定

を行いません。

これらは、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

AttackEventの、

- 必要音
- Chord / Arpeggio
- Arpeggio順序
- 音楽的タイミング
- Harmony
- 予告
- 発火タイミング
- Weak AttackEventの生成元NoteEventとの音楽的対応

については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

---

## 責務の全体構造

Critical-01に関係する責務は、以下のように分離します。

```text
Click / Drag Charge Action
→ player/player-action-charge.md

現在Charge対象AttackEvent・Slot割り当て
→ draw-system/charge-allocation.md

AttackEvent音楽情報・発火タイミング
→ bgm/bgm-attack-event.md

AttackEvent発火時の成立判定・使用実体
→ bgm/bgm-attack-judgement.md
```

本ページでは、他ページの詳細仕様を再定義しません。

---

# 判定対象

## 発火時は割り当て済み結果を使用する

AttackEvent発火時には、

> **そのAttackEventへ既に割り当てられているSlotとCharge済みシャオンダマ実体**

を参照します。

発火時に、

* 別のAttackEventを検索する
* Slotを再割り当てする
* 音が一致する別Slotへ移動する
* 万能シャオンダマの割り当てをやり直す

ことはありません。

```text
Charge
↓
charge-allocation.md
↓
AttackEvent / Slotへ割り当て
↓
世界上で待機
↓
AttackEvent発火
↓
本ページの判定
```

発火時の判定は、Charge時点で確定した割り当て結果を使用します。

---

## Charge済みシャオンダマ実体

Charge成功したシャオンダマは、Slot内部の数値だけに置き換えられるわけではありません。

```text
世界上のシャオンダマ
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

したがって発火時に攻撃へ使用する対象は、

> **そのAttackEventへCharge成功し、世界上で待機しているシャオンダマ実体**

です。

SlotのCharge数を見て新しいPalette Bulletを生成する構造にはしません。

---

# 通常AttackEventの成立判定

通常AttackEventは、発火時に各要求SlotのCharge状態を確認します。

判定の基本は以下です。

| 状態       | 条件                          | 攻撃             |
| -------- | --------------------------- | -------------- |
| 完全成立     | すべての要求Slotに1発以上Charge済み     | Charge済み全実体を使用 |
| 不完全完成    | 1発以上Charge済みだが、未充填要求Slotが存在 | Charge済み全実体を使用 |
| 0 Charge | Charge済み実体が存在しない            | 発射対象なし         |

「0 Charge」の状態に対する最終的な失敗名称・演出については未決です。

---

# 完全成立

AttackEventのすべての要求Slotに、1発以上のシャオンダマがChargeされている場合を**完全成立**とします。

例えば、

```text
必要音
C / E / G

Slot
C = 1発以上
E = 1発以上
G = 1発以上
```

の場合、

```text
全要求Slot充填
↓
完全成立
```

です。

---

## 重複数は完全成立条件へ影響しない

完全成立の判定では、

> **各要求Slotに1発以上存在するか**

を確認します。

例えば、

```text
C = 4
E = 2
G = 1
```

の場合でも、

```text
Cあり
Eあり
Gあり
↓
完全成立
```

です。

Cへ4発Chargeされていることによって、C Slotが4つ成立したと判定するわけではありません。

ただし、重複している追加3発は失われません。

発火時の攻撃には、後述する通り**7実体すべて**を使用します。

---

# 不完全完成

AttackEventへ1発以上Chargeされているものの、すべての要求Slotは充填されていない場合を**不完全完成**とします。

例えば、

```text
必要音
C / E / G

C = 1
E = 0
G = 0
```

の場合、

```text
Charge済み実体あり
+
未充填要求Slotあり
↓
不完全完成
```

です。

不完全完成でも、Charge済みシャオンダマによる攻撃は行います。

```text
Cシャオンダマ
↓
AttackEvent発火
↓
Palette Bullet化
↓
攻撃
```

不足しているE / Gのために、存在しないPalette Bulletを生成することはありません。

---

## 不完全完成は攻撃キャンセルではない

以下の仕様にはしません。

```text
全要求Slotが揃っていない
↓
AttackEvent全体をキャンセル
```

正しくは、

```text
全要求Slotが揃っていない
↓
不完全完成
↓
Charge済み実体だけを攻撃へ使用
```

です。

---

# 0 Charge時

AttackEvent発火時に、そのAttackEventへCharge成功したシャオンダマ実体が1つも存在しない場合、

```text
Charge済み実体 = 0
↓
発射対象なし
```

となります。

AttackEvent自体の音楽上の発火は発生しますが、使用できるPalette Bullet対象が存在しないため、シャオンダマによる攻撃は発生しません。

この状態について、

* 正式な失敗名称
* UI表示
* VFX
* SE
* その他の失敗演出

は現時点では未決です。

本ページでは推測で決定しません。

---

# Chordの成立判定

`Type = Chord`では、通常AttackEventと同じ成立条件を使用します。

## 完全成立

すべての要求Slotに1発以上Chargeされていれば完全成立です。

```text
Chord
C / E / G

C = 4
E = 2
G = 1
↓
完全成立
```

この場合、発火時には、

```text
C × 4
E × 2
G × 1
↓
Charge済み7実体
↓
Palette Bullet化
↓
同時発射
```

します。

各Slotから1発だけ選択して3発に減らしません。

---

## Chordの不完全完成

例えば、

```text
Chord
C / E / G

C = 2
E = 1
G = 0
```

の場合、

```text
G Slot未充填
↓
不完全完成
```

です。

ただし、

```text
C × 2
E × 1
↓
3実体すべてPalette Bullet化
↓
同時発射
```

します。

---

## 完全成立バフ

Chordが完全成立した場合は、完全Chord成立に対応するバフの発生条件を満たします。

```text
Chord完全成立
↓
攻撃
+
完全成立バフ
```

不完全完成の場合、

```text
Chord不完全完成
↓
攻撃
+
完全成立バフなし
```

となります。

本ページが定義するのは、

> **完全成立バフを発生させるかどうか**

までです。

バフの、

* 具体的効果
* 数値
* 継続時間
* 重複仕様
* UI

は本ページでは定義しません。

---

# Arpeggioの成立判定

`Type = Arpeggio`でも、完全成立 / 不完全完成の条件自体は通常AttackEventと同じです。

## 完全成立

```text
Arpeggio
C → E → G

C = 1発以上
E = 1発以上
G = 1発以上
↓
完全成立
```

となります。

---

## Arpeggioの不完全完成

例えば、

```text
Arpeggio
C → E → G

C = 1
E = 0
G = 2
```

の場合、

```text
E Slot未充填
↓
不完全完成
```

です。

この場合でも、CとGへCharge済みのシャオンダマは攻撃へ使用します。

Eについて架空のPalette Bulletを生成しません。

---

# Arpeggioの発射順

Arpeggioでは、PlayerがChargeした順番を使用しません。

発射順は、`bgm-attack-event.md` に設定されている、

* Arpeggio順序
* 音楽的タイミング

を使用します。

例えばAttackEventが、

```text
C → E → G
```

で、PlayerがDragChargingによって、

```text
G → C → E
```

の順に選択していても、

発射順は、

```text
C
↓
E
↓
G
```

です。

Playerの選択順によってAttackEventの音楽構造を変更しません。

---

# Arpeggioの発射タイミング

各SlotへChargeされているシャオンダマ実体は、そのSlotに対応するArpeggioの音楽的タイミングで使用します。

例えば、

```text
C Slot
C × 3

E Slot
E × 2

G Slot
G × 1
```

の場合、

```text
Cの音楽タイミング
↓
C × 3をPalette Bullet化・同時発射

Eの音楽タイミング
↓
E × 2をPalette Bullet化・同時発射

Gの音楽タイミング
↓
G × 1をPalette Bullet化・発射
```

します。

未充填Slotの音楽タイミングでは、対応する発射対象が存在しないため何も発射しません。

---

# 同音Slot

AttackEvent内に同じ音を要求するSlotが複数存在する場合、本ページではSlot割り当てをやり直しません。

どのシャオンダマがどの同音Slotへ属するかは、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)によってCharge時に決定済みです。

例えば、

```text
Arpeggio
C → C → E
```

のようにC Slotが複数存在する場合でも、

発火時には、

> **各シャオンダマがCharge時に割り当てられたSlot**

を使用します。

各C Slotに異なる音楽的タイミングが設定されている場合は、それぞれのSlotに対応するタイミングを使用します。

---

# 重複Charge

同一Slotへ複数のシャオンダマがChargeされている場合、発火時にはすべて使用します。

例えば、

```text
C Slot
├─ C1
├─ C2
├─ C3
└─ C4
```

であれば、

```text
C1
C2
C3
C4
```

の4実体すべてが発射対象です。

以下のように、

```text
Slot C = 4
↓
1発だけ選択
↓
残り3発を破棄
```

することはありません。

---

# 発火時に使用する実体

通常AttackEvent発火時に使用する対象は、

> **そのAttackEventへCharge成功し、各Slotへ対応付けられた世界上のシャオンダマ実体すべて**

です。

例えば、

```text
C Slot = 4
E Slot = 2
G Slot = 1
```

の場合、

```text
4 + 2 + 1
= 7実体
```

を使用します。

各SlotのCharge数だけを見て新しいPalette Bulletを生成するのではありません。

---

# Palette Bullet化

Charge成功時点では、シャオンダマを攻撃用Palette Bulletとして即時発射しません。

基本フローは、

```text
Charge成功
↓
AttackEvent / Slotへ対応付け
↓
シャオンダマ実体が世界上で待機
↓
AttackEvent発火
↓
発射対象になったシャオンダマ実体をPalette Bullet化
↓
攻撃
```

です。

Palette Bullet化は、AttackEvent発火に伴う攻撃処理と接続して行います。

---

# オクターブ

Slotへの音名照合ではオクターブを区別しないことが、`charge-allocation.md` の正本仕様です。

したがって本ページでは、発火時にオクターブを使ってSlot成立を再判定しません。

例えば、

```text
C3
C4
C5
```

のいずれかがC Slotへ正常に割り当て済みであれば、

本ページではそのC Slotを通常のCharge済みSlotとして扱います。

各シャオンダマが保持している元のオクターブ情報そのものを消去・変更するという意味ではありません。

---

# 万能シャオンダマ

万能シャオンダマのSlot決定は、本ページでは行いません。

[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)によって、万能シャオンダマが特定のAttackEvent / SlotへCharge成功した後は、

通常シャオンダマと同様に、

> **そのSlotへ割り当て済みのCharge実体**

として扱います。

例えば、

```text
万能シャオンダマ
↓
Charge時にE Slotへ割り当て
↓
E Slot所属として待機
↓
AttackEvent発火
↓
E Slotの発射対象として使用
```

となります。

発火時に万能シャオンダマのSlotを再解決しません。

---

# Charge時のsuccess / missとの分離

Player Charge Actionで発生する、

* `success`
* `miss`

と、本ページの発火時成立判定は別処理です。

```text
Charge時
↓
選択したシャオンダマを
現在Charge対象AttackEvent / Slotへ割り当て可能か
↓
success / miss
```

に対して、

```text
AttackEvent発火時
↓
最終的にどのSlotへ
どの実体がCharge済みか
↓
完全成立 / 不完全完成 / 0 Charge
```

を判定します。

AttackEventが不完全完成だったことを理由に、過去のCharge Actionへ後から`miss`を発生させません。

また、Charge時に`miss`だった入力をAttackEvent発火時に再評価しません。

---

# Weak AttackEvent

## 概要

Weak AttackEventは、通常AttackEventがCharge対象として存在しない期間に使用する単音弱攻撃用AttackEventです。

Weak AttackEventの、

* 生成条件
* 1 Chargeにつき1 Weak AttackEventを生成すること
* 単一Slotへの割り当て
* 通常AttackEventが後から表示されても再割り当てしないこと

については、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

Weak AttackEventの、

* 生成元NoteEvent
* 発火タイミング

については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

本ページでは、**Weak AttackEvent発火時に何を攻撃へ使用するか**を定義します。

---

## Weak AttackEventの成立構造

Weak AttackEventは、

* 要求Slotを必ず1つだけ持つ
* 1つのWeak AttackEventに1つのCharge済みシャオンダマが対応する
* Chordを構成しない
* Arpeggioを構成しない
* Harmony等による完全成立バフを持たない

単音弱攻撃です。

そのため通常AttackEventのような、

```text
複数Slot
↓
完全成立 / 不完全完成
```

を目的としたAttackEventではありません。

---

## Weak AttackEvent発火時

BGMが、対象シャオンダマの生成元NoteEventの発音タイミングへ到達するとWeak AttackEventが発火します。

発火時には、

> **そのWeak AttackEventへ対応付けられて待機している1つのシャオンダマ実体**

を使用します。

```text
Weak AttackEvent発火
↓
対応シャオンダマ実体
↓
Palette Bullet化
↓
単音弱攻撃として発射
```

別のシャオンダマを検索して使用しません。

通常AttackEventのSlotからシャオンダマを取得しません。

---

## 通常AttackEventが途中で表示された場合

Weak AttackEvent発火前に通常AttackEventが表示されても、

既存Weak AttackEventへ割り当て済みのシャオンダマはそのままWeak AttackEventで使用します。

```text
Weak Charge済み
↓
Weak AttackEvent待機
↓
通常AttackEvent B表示
↓
Weakへの割り当て維持
↓
元NoteEventのタイミング
↓
Weak AttackEvent発火
↓
単音弱攻撃
```

通常AttackEvent Bへ再割り当てしません。

---

## Weak AttackEvent発火後

Weak AttackEventは発火し、対応シャオンダマを単音弱攻撃へ使用した後に破棄します。

```text
Weak AttackEvent
↓
発火
↓
対応シャオンダマをPalette Bullet化
↓
単音弱攻撃
↓
Weak AttackEvent破棄
```

Weak AttackEventを発火後も通常AttackEventとして蓄積し続けません。

Weak AttackEventは通常AttackEventの最大蓄積枠にも含めません。

---

# 発射後の責務

AttackEventから発射対象となったシャオンダマ実体は、

```text
待機中シャオンダマ
↓
Palette Bullet化
↓
攻撃へ使用
```

となります。

その時点で、その実体を同じAttackEventの待機対象として再利用しません。

ただしPalette Bullet化後の、

* 飛翔
* 命中
* ダメージ
* 消滅
* VFX
* 最終的なObject Lifecycle

は本ページでは定義しません。

BGM・音程音・Gameplay SEとの同期については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を参照します。

---

# 責務境界

| 内容                                    | 正本                                                      |
| ------------------------------------- | ------------------------------------------------------- |
| Click / Drag Charge入力・ActionState     | `player/player-action-charge.md`                        |
| Charge Actionのsuccess / miss          | `player/player-action-charge.md`                        |
| 現在Charge対象となる通常AttackEvent            | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Slot構造・Slot割り当て                       | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| 同音Slot優先順位・重複Charge                   | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| 万能シャオンダマのSlot解決                       | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Weak AttackEventの生成・Charge先解決         | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| AttackEventの必要音・Type・Harmony          | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)              |
| Arpeggio順序・音楽的タイミング                   | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)              |
| AttackEventの予告・発火タイミング                | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)              |
| Weak AttackEventの生成元NoteEvent・発火タイミング | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)              |
| 通常AttackEventの完全成立 / 不完全完成            | **本ページ**                                                |
| 0 Charge時の発射対象有無                      | **本ページ**                                                |
| 発火時に使用するCharge済みシャオンダマ実体              | **本ページ**                                                |
| Chordの発射対象                            | **本ページ**                                                |
| Arpeggioの発射対象                         | **本ページ**                                                |
| 重複Chargeされた全実体の使用                     | **本ページ**                                                |
| Weak AttackEvent発火時の使用実体              | **本ページ**                                                |
| Weak AttackEvent発火後の破棄                | **本ページ**                                                |
| 完全Chord成立バフの発生可否                      | **本ページ**                                                |
| 完全成立バフの具体効果                           | バフシステム側                                                 |
| BGM / 音程音 / Gameplay SE同期             | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)    |
| Palette Bullet発射後の詳細Lifecycle         | Palette Bullet側                                         |

---

# 基本ルール

* 本ページをAttackEvent発火時のGameplay成立判定・使用実体決定の正本とする
* 発火時には`charge-allocation.md`で既に割り当て済みの結果を使用する
* 発火時にSlotを再割り当てしない
* すべての要求Slotへ1発以上Charge済みなら完全成立とする
* 1発以上Charge済みで未充填要求Slotが存在する場合は不完全完成とする
* 不完全完成でもCharge済みシャオンダマによる攻撃を行う
* Charge済み実体が0の場合は発射対象なしとする
* 0 Charge時の正式な失敗名称・演出は未決とする
* 同一Slotへ複数Chargeされている場合は全実体を使用する
* 各Slotから1発だけを選択しない
* 不足Slotのために架空のPalette Bulletを生成しない
* ChordはCharge済み全実体を同一のChord発火タイミングで使用する
* Chord不完全完成でも存在するCharge済み実体をすべて使用する
* 完全Chord成立時のみ完全成立バフの発生条件を満たす
* ArpeggioはAttackEvent側の音楽的順序・タイミングを使用する
* DragChargingの選択順をArpeggio発射順として使用しない
* Arpeggioの未充填Slotでは何も発射しない
* 同じSlotへ複数Chargeされた実体は、そのSlotのタイミングですべて使用する
* オクターブによって発火時にSlot成立を再判定しない
* 万能シャオンダマはCharge時に割り当て済みのSlot所属として扱う
* Charge時の`success / miss`とAttackEvent発火時の成立判定を分離する
* Charge成功したシャオンダマはAttackEvent発火まで世界上で待機する
* AttackEvent発火時に発射対象実体をPalette Bullet化する
* Weak AttackEventは対応する1つのシャオンダマ実体を単音弱攻撃として使用する
* Weak AttackEvent待機中に通常AttackEventが表示されても割り当てを変更しない
* Weak AttackEventは発火・攻撃処理後に破棄する

---

# 未決事項

以下は現時点では本ページで確定しません。

## 0 Charge時

* 正式な失敗状態の名称
* 失敗UI
* VFX
* SE
* その他の演出

## 完全成立バフ

* バフの具体的な効果
* 数値
* 継続時間
* 重複仕様
* UI

## Arpeggio

Arpeggio側に追加の完全成立効果・バフを持たせる場合の詳細は未決です。

本ページでは推測で追加しません。

## 発火後

* AttackEvent / Slot UIを正確にいつ消去するか
* Palette Bullet化後の詳細Object Lifecycle

は別仕様または今後の仕様確定へ委ねます。

---

## 関連タスク

<PageRelations />
