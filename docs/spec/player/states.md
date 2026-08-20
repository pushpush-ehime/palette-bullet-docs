---
title: Player状態
description: Palette BulletのPlayer状態仕様
pageType: spec
category: Player
order: 30
status: 仮仕様
---

# Playerステート

## 目的

本ページでは、Palette BulletにおけるPlayerのState構造と、各Stateの役割、StateMachine間の基本的な関係を定義します。

Playerの具体的なAction挙動、入力受付時間、モーション、判定処理、数値パラメータなどは各仕様ページで定義します。

本ページでは主に以下を扱います。

* Player全体のState構造
* `RootState`
* Gameplay中の並列StateMachine
* `MovementState`
* `ActionState`
* `AimState`
* `ReactionState`
* Action内部Phase
* StateMachine間の基本的な連携
* 強制State遷移と通常Action入力の優先関係
* Gameplay開始・終了時のState

ActionState同士の詳細な遷移可否、キャンセル、先行入力については「Playerアクション遷移」を正とします。

各Action固有の開始条件、内部Phase、終了条件については、それぞれのAction仕様を正とします。

---

## Playerアクション・ステート・遷移ルール

Playerの主な行動について、State上の管理先と、他Stateとの関係を以下に示します。

### 記号

* **○**：同時成立可能
* **→**：現在のStateを変更して遷移可能
* **C→**：キャンセル受付タイミング以降のみ遷移可能
* **B→**：現在のAction正常終了後に実行する先行入力として保持可能
* **×**：現在のStateでは開始不可、または入力を受け付けない
* **強制→**：通常のAction遷移より優先して現在のStateを終了・変更する
* **継続**：別Stateの変化が発生しても現在のStateを維持する

| 項目 | State上の管理 | 内容 | 同時成立できる主な行動・State | 主な遷移 | 実行中に禁止される主な行動 | 強制終了・特殊ルール |
| --- | --- | --- | --- | --- | --- | --- |
| **通常移動** | Stateにはしない | `Grounded / Airborne`中にMove入力に応じて行う基本移動 | Aiming、MarkerFiring、ClickCharging、DragCharging | Jump → `Airborne` / Dash → `Dashing` / Parry → 通常移動停止 | Conversation、Interacting、Dead、Parrying、Reaction中の通常移動 | Aiming・MarkerFiring・DragChargingでは低速補正。ClickChargingでは通常速度 |
| **Grounded** | `MovementState` | Playerが地面に接地している状態 | 各種Gameplay State | Jump → `Airborne` | ― | 停止・歩行はStateに分けずMove入力の有無で処理する |
| **Airborne** | `MovementState` | Playerが空中にいる状態。Move入力による空中制御が可能 | MarkerFiring、ClickCharging、DragCharging | 着地 → `Grounded` | Dash開始、Aim開始、MarkerFiring開始、Parry開始 | ChargeはAirborneでも開始・継続可能。MarkerFiringはGroundedで開始済みの場合、接地喪失後も継続可能 |
| **Jump** | Stateにはしない | Playerへ上方向速度を与え、`Grounded → Airborne`へ変更する単発処理 | ClickCharging、DragCharging | `Grounded → Airborne` | Aiming、MarkerFiring、Parrying、Reaction中など | ClickCharging / DragCharging中はActionを維持したままJump可能。DashingではDash継続PhaseのみJump可能で、Jump時にDashingを終了する |
| **Dashing** | `ActionState` | Dash固有の高速移動を行うAction | 指定PhaseでJump | Aim → Dash終了後Aiming / MarkerFire → **B→** / ClickCharge → **B→** / DragCharge → **B→** | Parry、AirborneからのDash開始 | Dash入力をHoldしている間は、Move入力がなくても`Dashing`を維持する。Move入力なしでは移動しない。Dash方向はPlayerの向きを基準とする |
| **Aiming** | `AimState` | 照準状態を管理する | 移動、MarkerFiring、ClickCharging、DragCharging | Dash → Aim終了後Dashing / Parry → Aim終了後Parrying | Jump、AirborneからのAim開始 | MarkerFiring開始後にAimを終了してもMarkerFiringは継続する。カメラ詳細はAim仕様を正とする |
| **MarkerFiring** | `ActionState` | マーカーを発射する短時間Action | 移動、Aiming | Dash → **C→** | Jump、ClickCharge、DragCharge、Parry、Marker再入力 | Dashキャンセル直前のDash入力は短時間バッファ可能。Reaction・RootState変更では強制終了 |
| **ClickCharging** | `ActionState` | 1つのシャオンダマを選択する短時間Action | 移動、Aiming、JumpによるMovementState変更 | Dash → **C→** | MarkerFire、DragCharge、Parry、Charge再入力 | JumpしてもClickChargingを継続する。Dashキャンセル直前のDash入力は短時間バッファ可能。SmallHit / BigHitでは強制終了 |
| **DragCharging** | `ActionState` | 複数のシャオンダマを連続選択する継続Action | 移動、Aiming、JumpによるMovementState変更 | Dash → 即時`→` | MarkerFire、ClickCharge、Parry、新規Charge入力 | JumpしてもDragChargingを継続する。SmallHit / BigHitのどちらでも強制終了 |
| **Parrying** | `ActionState` | 敵攻撃をパリィするAction | 他のGameplay Actionとは同時成立しない | 通常状態・Aimingから開始可能 | 移動、Jump、Dash、Aim、MarkerFire、ClickCharge、DragCharge | 開始時に通常移動を停止し、Aiming中ならAimを終了する。Reaction・Deadなどの強制イベントでは終了する |
| **SmallHit** | `ReactionState` | 小さい被弾リアクション | Gameplay Actionとの同時継続なし | SmallHit → SmallHit再開始 / BigHit → `BigHit`へ上書き | 通常のGameplay操作 | Actionを強制終了しAimも解除する。SmallHit固有の強制移動・ノックバックは発生しない |
| **BigHit** | `ReactionState` | 大きい被弾リアクション | Gameplay Actionとの同時継続なし | SmallHit → BigHitへ上書き | 通常のGameplay操作 | Actionを強制終了しAimも解除する。地上ノックバックを行うが、BigHitによってPlayerを空中へ打ち上げない |
| **Conversation** | `RootState` | NPCとの会話を行う状態 | なし | `Gameplay → Conversation` | Gameplay中の全Action・通常移動 | `Grounded`かつ`ReactionState = None`の場合のみ開始可能。開始時にGameplay内部Stateを終了する。Conversation中は被弾しない |
| **Interacting** | `RootState` | 宝箱・アイテム・ギミックなどを操作する状態 | なし | `Gameplay → Interacting` | Gameplay中の全Action・通常移動 | `Grounded`かつ`ReactionState = None`の場合のみ開始可能。開始時にGameplay内部Stateを終了する。被弾時はInteractionを中断する |
| **Dead** | `RootState` | HPが0になりPlayer操作を停止する状態 | なし | 死亡条件成立 → **強制→ Dead** | すべてのPlayer操作 | Player State中で最優先。Gameplay内部Stateを終了する。空中でDeadへ入った場合も重力による落下は継続する |

この表はState間の関係を把握するための概要です。

ActionState同士の遷移種別や先行入力の保持・評価などの詳細については「Playerアクション遷移」を正とします。

---

## 短時間Actionのキャンセルルール

`MarkerFiring`と`ClickCharging`は、Action内部にキャンセル受付タイミングを持ちます。

基本構造は以下です。

```text
Action開始
↓
キャンセル不可区間
↓
キャンセル受付開始
↓
キャンセル可能区間
↓
Action正常終了
```

現在、これらのActionからキャンセル遷移できるActionは`Dashing`です。

```text
MarkerFiring  → Dashing = C→
ClickCharging → Dashing = C→
```

キャンセル受付可能になる直前にDash入力が行われた場合は、Dash要求を短時間だけ入力バッファへ保持できます。

```text
Dash入力
↓
現在はキャンセル不可
↓
Dash要求を短時間保持
↓
保持中にキャンセル可能区間へ到達
↓
Dash開始条件確認
↓
条件成立
↓
Dashing
```

入力バッファは、Actionそのもののキャンセル受付タイミングを早める仕組みではありません。

保持時間を超えた場合はDash要求を破棄します。

具体的な入力バッファ時間は調整パラメータとし、本ページでは固定しません。

入力バッファの共通ルールについては「Playerアクション遷移」を正とします。

`MarkerFiring`または`ClickCharging`実行中の同一Action再入力は、次Actionとして保持せず、各Action仕様に従って処理します。

---

## State構成

Playerは以下のState構造を使用します。

```text
Player

RootState
├─ Gameplay
│
│  ├─ MovementState
│  │   ├─ Grounded
│  │   └─ Airborne
│  │
│  ├─ ActionState
│  │   ├─ None
│  │   ├─ Dashing
│  │   ├─ MarkerFiring
│  │   ├─ ClickCharging
│  │   ├─ DragCharging
│  │   └─ Parrying
│  │
│  ├─ AimState
│  │   ├─ Normal
│  │   └─ Aiming
│  │
│  └─ ReactionState
│      ├─ None
│      ├─ SmallHit
│      └─ BigHit
│
├─ Conversation
├─ Interacting
└─ Dead
```

`RootState = Gameplay`の間のみ、Gameplay内部の4つのStateMachineを使用します。

```text
MovementState
+
ActionState
+
AimState
+
ReactionState
```

4つのStateMachineは並列であり、それぞれ1つずつStateを持ちます。

例えば、

```text
RootState     = Gameplay
MovementState = Grounded
ActionState   = ClickCharging
AimState      = Aiming
ReactionState = None
```

という組み合わせが成立します。

`ActionState`内部ではState同士が排他的です。

そのため、

```text
ClickCharging + Dashing
```

のように複数のActionStateが同時成立することはありません。

---

## Player仕様ページ構成

State構造に対応するPlayer仕様ページは、以下の役割で管理します。

```text
Player
│
├─ Player概要
├─ Player入力と操作
├─ Player状態
├─ Playerアクション遷移
│
├─ Player移動
│   ├─ 基本移動
│   ├─ ジャンプ
│   └─ ダッシュ
│
├─ Playerアクション
│   ├─ 照準
│   ├─ マーカー
│   ├─ チャージ
│   └─ パリィ
│
├─ Playerリアクション
│   └─ 被弾
│
├─ Playerインタラクション
│   ├─ Interacting
│   └─ Conversation
│
└─ Playerステータス
    ├─ 体力・スタミナ
    └─ 死亡
```

State構造・各Stateの役割は本ページを正とします。

ActionState間の横断的な遷移ルールは「Playerアクション遷移」を正とします。

Action固有の内部処理は各Actionページを正とします。

---

## RootState

`RootState`は、Player全体が現在どのゲーム状態に属しているかを管理します。

```text
RootState
├─ Gameplay
├─ Conversation
├─ Interacting
└─ Dead
```

RootStateは排他的です。

Playerが同時に複数のRootStateへ所属することはありません。

### Gameplay

通常のPlayer操作を行うRootStateです。

Gameplay中は以下の4つのStateMachineを並列で管理します。

```text
MovementState
ActionState
AimState
ReactionState
```

通常移動、Jump、Dash、Aim、Marker、Charge、Parry、被弾などはGameplay中に処理します。

### Conversation

NPCとの会話中に使用するRootStateです。

Conversationは、

```text
RootState     = Gameplay
MovementState = Grounded
ReactionState = None
```

の場合に開始できます。

Conversationへ遷移するとGameplay内部StateMachineの管理を終了し、Gameplay用の通常操作を停止します。

Conversation中は通常の敵攻撃による被弾を成立させません。

具体的な開始・終了処理については「Playerインタラクション｜Conversation」を正とします。

### Interacting

会話以外のInteraction中に使用するRootStateです。

Interactingは、

```text
RootState     = Gameplay
MovementState = Grounded
ReactionState = None
```

の場合に開始できます。

Interactingへ遷移するとGameplay内部StateMachineの管理を終了し、Gameplay用の通常操作を停止します。

Interacting中に被弾が成立した場合はInteractionを中断し、Gameplayへ戻ったうえでReaction処理を行います。

具体的な処理については「Playerインタラクション｜Interacting」を正とします。

### Dead

Playerの死亡中に使用するRootStateです。

死亡条件が成立した場合は、現在のRootStateやGameplay内部StateよりDeadを優先します。

```text
死亡条件成立
↓
現在のPlayer状態を終了
↓
RootState = Dead
```

Deadは`Grounded / Airborne`のどちらからでも遷移できます。

Deadへ遷移した時点でGameplay内部の`MovementState`管理は終了します。

ただし、空中で死亡した場合もPlayerに作用する重力は停止せず、Dead中も落下を継続します。

Dead中の死亡モーション、死亡画面、Retryについては「Player死亡」を正とします。

---

## Gameplay中の並列StateMachine

Gameplay中は、以下の4軸を独立したStateMachineとして管理します。

```text
MovementState
ActionState
AimState
ReactionState
```

異なるStateMachineに所属するStateは、各仕様で許可されている場合に同時成立できます。

### MovementState

Playerが地上にいるか空中にいるかを管理します。

```text
MovementState
├─ Grounded
└─ Airborne
```

#### Grounded

Playerが地面へ接地している状態です。

通常移動、Jump、Groundedでのみ開始できるActionなどの判定に使用します。

#### Airborne

Playerが空中にいる状態です。

Airborne中は空中制御と重力・落下処理を行います。

`ClickCharging`と`DragCharging`はAirborneでも成立できます。

`MarkerFiring`はAirborne中に新規開始できませんが、Groundedで開始済みのMarkerFiring中に接地を失った場合はActionを継続できます。

### Jump

JumpはStateではありません。

```text
Grounded
↓
Jump入力
↓
上方向速度を付与
↓
Airborne
```

Jumpは`MovementState`を変更する単発処理として扱います。

`ClickCharging`または`DragCharging`中にJumpした場合、Chargeの`ActionState`は変更しません。

```text
MovementState = Grounded
ActionState   = ClickCharging
↓
Jump
↓
MovementState = Airborne
ActionState   = ClickCharging
```

```text
MovementState = Grounded
ActionState   = DragCharging
↓
Jump
↓
MovementState = Airborne
ActionState   = DragCharging
```

つまり、`ClickCharging / DragCharging`そのものはJumpを禁止しません。

ただし、同時に成立している別StateがJumpを禁止している場合は、そのStateの制限も考慮します。

Dashing中のJumpはDash固有ルールに従います。

### ActionState

Gameplay中に実行している排他的なActionを管理します。

```text
ActionState
├─ None
├─ Dashing
├─ MarkerFiring
├─ ClickCharging
├─ DragCharging
└─ Parrying
```

`ActionState`同士は排他的です。

```text
ActionState = Dashing
```

と

```text
ActionState = ClickCharging
```

が同時に成立することはありません。

#### None

ActionStateに属するActionを実行していない状態です。

通常移動やJumpはActionStateではないため、`ActionState = None`でも実行できます。

#### Dashing

Dashを実行している状態です。

Dashing内部には複数のPhaseがありますが、Phaseが変化しても`ActionState = Dashing`を維持します。

Dash継続PhaseではDash入力がHoldされている限りDashingを維持します。

Move入力がなくなった場合はPlayerを移動させませんが、それだけを理由にDashingを終了しません。

```text
Dashing
↓
Move入力なし
↓
Player移動なし
ActionState = Dashing
↓
Dash入力Release
↓
Dashing終了
```

Dashing中にMarkerFiring、ClickCharging、DragChargingを入力した場合の先行入力については「Playerアクション遷移」を正とします。

#### MarkerFiring

マーカー発射を行う短時間Actionです。

開始時にはAimingが必要ですが、MarkerFiring開始後にAimStateが`Normal`へ戻ってもMarkerFiring自体は継続できます。

```text
ActionState = MarkerFiring
AimState    = Aiming
↓
Aim終了
↓
ActionState = MarkerFiring
AimState    = Normal
```

MarkerFiringの発射処理や内部Phaseについては「Playerアクション｜マーカー」を正とします。

#### ClickCharging

1つのシャオンダマを選択するCharge Actionです。

ClickChargingはGrounded / Airborneの両方で成立できます。

JumpによってMovementStateが`Grounded → Airborne`へ変化してもClickChargingは継続します。

対象シャオンダマの保持、AttackEventへの割り当て、成功・missなどの処理は「Playerアクション｜チャージ」を正とします。

#### DragCharging

複数のシャオンダマを連続して選択するCharge Actionです。

DragChargingもGrounded / Airborneの両方で成立できます。

JumpによってMovementStateが`Grounded → Airborne`へ変化してもDragChargingは継続します。

`SmallHit`または`BigHit`が成立した場合はDragChargingを強制終了します。

```text
ActionState   = DragCharging
ReactionState = None
↓
SmallHit
↓
ActionState   = None
ReactionState = SmallHit
```

SmallHit中にDragChargingだけを継続する例外ルールは使用しません。

#### Parrying

パリィを行うActionです。

Parrying中は他のActionStateへ通常遷移しません。

Aiming中からParryingを開始する場合はAimを終了します。

被弾、接地喪失、Deadなどの強制終了条件についてはParry仕様を正とします。

### AimState

PlayerのAim状態を管理します。

```text
AimState
├─ Normal
└─ Aiming
```

#### Normal

Aimingしていない通常状態です。

#### Aiming

Aim操作中の状態です。

AimingはActionStateとは別軸であるため、以下のActionと同時成立できます。

```text
Aiming + MarkerFiring
Aiming + ClickCharging
Aiming + DragCharging
```

一方、`Dashing`または`Parrying`とは同時成立しません。

```text
Aiming
↓
Dash開始
↓
AimState = Normal
ActionState = Dashing
```

```text
Aiming
↓
Parry開始
↓
AimState = Normal
ActionState = Parrying
```

AimingはAirborne中に開始できません。

Aim固有のカメラ仕様については「Playerアクション｜照準」およびカメラ仕様側を正とし、本ページでは詳細を定義しません。

### ReactionState

Gameplay中の被弾リアクションを管理します。

```text
ReactionState
├─ None
├─ SmallHit
└─ BigHit
```

#### None

被弾リアクションが発生していない通常状態です。

通常のGameplay Actionは原則として`ReactionState = None`の場合に開始します。

#### SmallHit

小さい被弾リアクションです。

SmallHitが成立した場合、実行中の通常Actionを強制終了し、Aimingも終了します。

```text
ActionState = 任意のAction
↓
SmallHit
↓
ActionState   = None
AimState      = Normal
ReactionState = SmallHit
```

SmallHit固有の物理的なノックバック・強制移動は発生しません。

SmallHit中に再びSmallHitが成立した場合は、再度ダメージを受け、SmallHitリアクションを最初から再生します。

```text
ReactionState = SmallHit
↓
SmallHit成立
↓
ダメージ
↓
SmallHitリアクション再開始
↓
ReactionState = SmallHit
```

この連続被弾ルールは意図した仕様とします。

#### BigHit

大きい被弾リアクションです。

BigHitが成立した場合も、実行中の通常Actionを強制終了し、Aimingを終了します。

BigHitでは地上ノックバックを行います。

ただし、現時点ではBigHitによってPlayerを空中へ打ち上げるState遷移は行いません。

```text
Grounded
+
BigHit
↓
地上ノックバック
↓
MovementState = Grounded
```

ノックバックはMove入力による通常移動とは別のReaction固有処理として扱います。

具体的なノックバック挙動については「Playerリアクション｜被弾」を正とします。

---

## Action内部Phase

一部のActionは、1つのActionState内部に複数のPhaseを持ちます。

PhaseはPlayer Stateとして追加しません。

例えば、

```text
Dashing
├─ 初動高速移動Phase
└─ Dash継続Phase
```

```text
MarkerFiring
├─ 発射前Phase
└─ 発射後Phase
```

```text
ClickCharging
├─ 判定前Phase
└─ 判定後Phase
```

のように管理します。

内部Phaseが変化しても、そのActionが終了するまでは同じ`ActionState`を維持します。

```text
ActionState = MarkerFiring
↓
発射前Phase
↓
発射Event
↓
発射後Phase
↓
ActionState = MarkerFiring
```

Phaseごとのキャンセル受付、判定タイミング、モーションなどは各Actionページを正とします。

---

## StateMachine間の連携

Gameplay中の4つのStateMachineは独立していますが、Player挙動を決定する際には相互に影響します。

### MovementStateとActionState

MovementStateが変化しても、現在のActionがそのMovementStateで継続可能であればActionStateを維持します。

代表例として、Charge中のJumpがあります。

```text
Grounded + ClickCharging
↓
Jump
↓
Airborne + ClickCharging
```

```text
Grounded + DragCharging
↓
Jump
↓
Airborne + DragCharging
```

一方、DashingはAirborneで継続しないため、Dash継続PhaseからJumpした場合はDashingを終了します。

```text
Grounded + Dashing
↓
Jump
↓
Airborne + None
```

### ActionStateとAimState

ActionStateとAimStateは別軸です。

そのため、MarkerFiring、ClickCharging、DragChargingはAimingと同時成立できます。

DashingまたはParryingを開始する場合はAimStateを`Normal`へ戻します。

MarkerFiringは開始時にAimingを必要としますが、開始後はAimが終了してもActionを継続します。

### ActionStateとReactionState

ReactionStateによる割り込みは通常のAction遷移より優先します。

SmallHit / BigHitが成立した場合、現在のActionStateを必要に応じて終了します。

現在は、SmallHitで継続できるActionStateの例外を設けません。

```text
DragCharging
↓
SmallHit
↓
ActionState = None
ReactionState = SmallHit
```

### MovementStateとReactionState

ReactionStateによって通常のMove入力は制限されます。

ただし、ReactionStateの開始だけを理由に`Grounded / Airborne`を変更しません。

SmallHitではReaction固有の強制移動を行いません。

BigHitでは地上ノックバックを行いますが、BigHitによる空中への打ち上げは行いません。

Reaction固有の物理移動は、通常のMove入力によるMovementとは別に扱います。

---

## 遷移の管理

### 通常Action入力

Dash、Marker、Charge、Parryなどの通常Action入力同士には、不必要な固定優先順位を設けません。

複数の通常Action入力が同一更新タイミング内で発生した場合も、基本的には入力された時刻順で処理します。

```text
通常Action入力
↓
入力時刻順に評価
↓
現在のStateと遷移ルールから実行可否を決定
```

ActionState間の具体的な遷移可否は「Playerアクション遷移」を正とします。

### 強制State遷移

Dead、Reaction、その他の強制State遷移は、通常Action入力より優先します。

基本的な考え方は以下です。

```text
強制State遷移
↓ 優先
通常Action入力
↓
通常Action同士は入力時刻順
```

特にDeadはPlayer Stateの中で最優先です。

```text
Action入力
+
致死ダメージ
↓
Deadを優先
```

また、SmallHit / BigHitが成立した場合は、通常のActionState遷移よりReactionStateによる割り込みを優先します。

本ページでは必要以上に細かな固定優先順位表を作成せず、個別の強制遷移条件は各仕様ページで定義します。

### Action先行入力

現在のAction中に次のActionを保持し、正常終了後に開始する遷移があります。

ActionState間では「Playerアクション遷移」で`B→`として管理します。

現在、Dashing中の次Action入力などが対象です。

先行入力の保持数、上書き、評価、破棄ルールについては「Playerアクション遷移」を正とします。

### Dashキャンセル入力バッファ

`MarkerFiring / ClickCharging → Dashing`のキャンセルでは、Dash入力を短時間保持する入力バッファを使用できます。

これは`B→`によるAction先行入力とは別の仕組みです。

```text
Dash入力
↓
まだC→不可
↓
Dash要求を短時間保持
↓
C→可能区間へ到達
↓
Dash開始条件確認
```

入力バッファ時間や具体的な評価処理については「Playerアクション遷移」を正とします。

---

## Gameplay開始・終了時のState

### Gameplay開始時

Gameplayを開始する場合、Gameplay内部StateMachineを初期化します。

基本状態は以下です。

```text
RootState     = Gameplay
ActionState   = None
AimState      = Normal
ReactionState = None
```

`MovementState`はPlayerの現在の接地状態から決定します。

```text
接地している
↓
MovementState = Grounded
```

```text
接地していない
↓
MovementState = Airborne
```

通常のステージ開始地点が地上である場合は、

```text
RootState     = Gameplay
MovementState = Grounded
ActionState   = None
AimState      = Normal
ReactionState = None
```

となります。

### Gameplay終了時

Gameplayから別のRootStateへ遷移する場合、Gameplay内部StateMachineによる管理を終了します。

```text
Gameplay
↓
Conversation / Interacting / Dead
↓
Gameplay内部State終了
```

実行中のAction、Aim、Reaction、およびGameplay用の保留入力は、遷移先RootStateの仕様に従って終了・破棄します。

Gameplayへ復帰した場合は、以前のGameplay内部Stateを自動的に再開せず、その時点のPlayer状態から再初期化します。

Deadからの復帰については、Retryによるステージリスタート処理を使用します。

---

## Stateから決定するPlayer挙動

Playerの最終的な挙動は、単一の巨大なStateではなく、現在成立している各Stateの組み合わせから決定します。

| State軸 | 主な責務 |
| --- | --- |
| `RootState` | Gameplay・Conversation・Interacting・DeadなどPlayer全体の状態 |
| `MovementState` | Grounded / Airborneと通常移動・空中制御 |
| `ActionState` | Dash・Marker・Charge・Parryなど排他的Action |
| `AimState` | Aimの有無 |
| `ReactionState` | SmallHit / BigHitなど被弾リアクション |
| Action内部Phase | 1つのActionState内部の進行状況 |

例えば、

```text
RootState     = Gameplay
MovementState = Grounded
ActionState   = ClickCharging
AimState      = Aiming
ReactionState = None
```

の場合は、

* Gameplay操作中
* 地上
* ClickCharging実行中
* Aiming中
* 被弾リアクションなし

という組み合わせからPlayerの挙動を決定します。

その状態からJumpが成立し、Aimingなど他のStateによるJump禁止が成立していない場合は、

```text
RootState     = Gameplay
MovementState = Airborne
ActionState   = ClickCharging
AimState      = Normal または現在のAim仕様に従う
ReactionState = None
```

のように、変更が必要なState軸だけを更新します。

StateMachine間の組み合わせによって発生する具体的な移動速度、モーション、判定、カメラ挙動などは、それぞれの担当ページを正とします。

---

## 各ページとの責務分離

| 内容 | 管理ページ |
| --- | --- |
| PlayerのState構造 | 本ページ |
| 各Stateの役割 | 本ページ |
| StateMachineの並列構造 | 本ページ |
| StateMachine間の基本的な関係 | 本ページ |
| 強制State遷移と通常Action入力の基本優先関係 | 本ページ |
| ActionState間の遷移可否 | Playerアクション遷移 |
| キャンセル・先行入力・入力バッファの詳細 | Playerアクション遷移 |
| MovementStateの具体的な移動処理 | Player基本移動 / Player移動｜ジャンプ |
| Dashing内部Phase・移動・スタミナ | Playerアクション｜ダッシュ |
| MarkerFiring内部Phase・発射処理 | Playerアクション｜マーカー |
| ClickCharging / DragChargingの判定・対象・成功 / miss | Playerアクション｜チャージ |
| Parrying内部Phase・パリィ判定 | Playerアクション｜パリィ |
| Aim固有挙動 | Playerアクション｜照準 |
| SmallHit / BigHitの詳細 | Playerリアクション｜被弾 |
| Conversation | Playerインタラクション｜Conversation |
| Interacting | Playerインタラクション｜Interacting |
| HP・スタミナ | Playerステータス |
| Dead・死亡・Retry | Player死亡 |
| カメラ設計 | カメラ仕様側 |

---

## 未決事項

現時点では、PlayerのState構造そのものに関する未決事項はありません。

各Actionの数値パラメータ、モーション、入力バッファ時間などの未決事項は、それぞれの担当ページで管理します。

<PageRelations />
