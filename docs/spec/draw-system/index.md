---
title: チャージシステム
description: Palette Bulletにおけるチャージシステム全体の概要と正本ページ案内
pageType: spec
category: チャージシステム
categoryOrder: 40
order: 0
status: 仮仕様
---

# チャージシステム

## 概要

チャージシステムは、Playerが世界上の選択可能なShaondamaをClick / Dragで選択し、Charge判定時点のAllocation結果に従って、Normal AttackEvent / SlotまたはWeak AttackEventへ対応付けるシステムです。

Chargeに成功したShaondamaは、その場でPalette Bulletへ変換せず、`Reserved`としてAttackEvent発火まで保持します。

```text
Shaondama
↓
Charge success
↓
Normal AttackEvent / Slot
または
Weak AttackEventへAllocation
↓
Reserved
↓
AttackEvent発火
↓
Palette Bullet化
↓
発射
```

このページは、チャージシステム全体の概要と各仕様の正本ページへの案内を担当します。

Click / Dragの入力判定、Slot割り当て、AttackEventの音楽情報、発火時の成立判定などの詳細仕様は、このページでは再定義しません。

---

## チャージシステム全体フロー

```text
戦闘BGM再生
↓
世界上のShaondamaを選択
↓
Click / Drag Charge
↓
Charge判定
↓
Current Normal AttackEventが存在する？
│
├─ Yes
│   ↓
│   Current Normal AttackEvent / SlotへAllocationを試行
│
└─ No
    ↓
    Weak AttackEventへAllocationを試行
↓
有効なAllocationが成立する？
│
├─ Yes
│   ↓
│   Charge success
│   ↓
│   ShaondamaをReservedとして保持
│   ↓
│   AttackEvent発火
│   ↓
│   Complete / Incomplete / Zero Chargeを解決
│   ↓
│   使用するReserved ShaondamaをPalette Bullet化
│   ↓
│   発射
│
└─ No
    ↓
    miss
    ↓
    Charge終了
```

このフローは、チャージシステム全体を把握するための概要です。

Current Normal AttackEventの決定方法、Slot選択規則、DragのAtomic判定、Weak Allocation、Reservedの詳細、AttackEvent発火時の結果や発射タイミングなどは、以下の正本ページを参照してください。

---

## 仕様の正本

| 仕様領域 | 正本 |
| --- | --- |
| Charge入力、Shaondama選択、Click / Drag、`ClickCharging / DragCharging`、`success / miss`、中断・終了 | [Playerアクション｜チャージ](/spec/player/player-action-charge) |
| Current Normal AttackEvent、Slot構造、Slot割り当て、Weak Allocation、Reserved | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| AttackEventの音楽的位置、Chord / Arpeggio構造、Charge受付期間、発火時刻 | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| AttackEvent発火時のComplete / Incomplete / Zero Charge、使用Reserved Shaondama、Palette Bullet化、Chord / Arpeggio発射 | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |

---

## 各正本の責務

### Charge入力・Player Action

[Playerアクション｜チャージ](/spec/player/player-action-charge) を正とします。

主に、PlayerによるShaondama選択、Click / Dragの入力判定、`ClickCharging / DragCharging`、Charge Actionとしての`success / miss`、中断・終了を扱います。

### Current AttackEvent・Slot Allocation

[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) を正とします。

主に、Current Normal AttackEventの決定、Slot構造、通常SlotへのAllocation、Weak Allocation、Charge成功後のReserved関係を扱います。

### AttackEventの音楽情報

[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) を正とします。

主に、AttackEventの音楽的位置、必要音、Chord / Arpeggio、Charge受付期間、音楽的順序・タイミング、発火時刻を扱います。

### AttackEvent発火時の結果

[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) を正とします。

主に、AttackEvent発火時の`Complete / Incomplete / Zero Charge`、使用するReserved Shaondama、Palette Bullet化、Chord / Arpeggioの発射処理、Weak AttackEvent発火時の処理を扱います。

---

## このページで定義しないもの

以下の詳細仕様は、それぞれの正本ページへ委譲します。

- 入力ボタンやClick / Dragの詳細判定
- DragのAtomic処理
- Current Normal AttackEventの論理順・tie-break
- Slot探索・Slot選択アルゴリズム
- Weak AttackEventの生成・Allocation詳細
- source NoteEvent occurrence
- Reserved中の詳細なライフサイクル
- Complete / Incomplete / Zero Chargeの詳細条件
- Chord / Arpeggioの各発射タイミング
- Palette Bullet発射後の飛翔・Target・命中・Damage
- Charge操作の難易度補助
- UI表示数・UIレイアウト
