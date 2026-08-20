---
title: "Player移動｜ジャンプ"
description: Palette BulletにおけるPlayerのジャンプ仕様
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Player移動｜ジャンプ

## 目的

本ページでは、Playerのジャンプについて定義します。

ジャンプは独立したStateとして管理せず、`MovementState`を`Grounded`から`Airborne`へ移行させる単発処理として扱います。

本ページでは主に以下を扱います。

* ジャンプの使用可能条件
* `Grounded → Airborne`の遷移
* ジャンプ開始時の上方向速度
* `Dashing`中のジャンプ
* ジャンプ後に開始できるAction
* 着地時の処理

Airborne中のMove入力による空中制御については「Player基本移動」で定義します。

## ジャンプとは

ジャンプ入力を受け付けると、Playerに上方向の速度を与え、`MovementState`を`Grounded`から`Airborne`へ変更します。

```text
Grounded
↓
Jump入力
↓
上方向の速度を付与
↓
Airborne
```

Jump専用のStateは作成しません。

ジャンプ処理は、Playerを`Airborne`へ移行させた時点で終了します。

その後の空中での移動、落下、着地は`MovementState = Airborne`として処理します。

## 使用可能条件

ジャンプは、以下の条件をすべて満たしている場合に開始できます。

* `RootState = Gameplay`
* `MovementState = Grounded`
* 現在のStateによってジャンプが禁止されていない

各状態からジャンプできるかを以下に示します。

| 現在の状態                | Jump | 備考                      |
| -------------------- | ---- | ----------------------- |
| `ActionState = None` | ○    | 通常ジャンプ                  |
| `Dashing`            | ○    | Jump可能なDash内部Phaseの場合のみ |
| `MarkerFiring`       | ×    | 入力を無視                   |
| `ClickCharging`      | ×    | 入力を無視                   |
| `DragCharging`       | ×    | 入力を無視                   |
| `Parrying`           | ×    | 入力を無視                   |
| `Aiming`             | ×    | 入力を無視                   |
| `SmallHit`           | ×    | 入力を無視                   |
| `BigHit`             | ×    | 入力を無視                   |
| `Airborne`           | ×    | 空中ジャンプは行わない             |

ジャンプできない状態でJump入力が行われた場合、入力は無視します。

## 通常ジャンプ

`MovementState = Grounded`かつ`ActionState = None`の場合、通常ジャンプを開始できます。

基本的な処理は以下です。

```text
MovementState = Grounded
ActionState   = None
↓
Jump入力
↓
上方向のJumpVelocityを付与
↓
MovementState = Airborne
ActionState   = None
```

ジャンプによって`ActionState`は変更しません。

Jump入力を受け付けた時点で、Playerへジャンプ用の上方向速度を与えます。

その後、`MovementState`を`Airborne`へ変更します。

## Dashing中のジャンプ

`ActionState = Dashing`中でも、Jump可能なDash内部Phaseであればジャンプできます。

Dashing中にジャンプした場合は、通常ジャンプとは異なり、`Dashing`を終了します。

```text
MovementState = Grounded
ActionState   = Dashing
↓
Jump入力
↓
Dashing終了
↓
上方向のJumpVelocityを付与
↓
MovementState = Airborne
ActionState   = None
```

### Jump可能なタイミング

`Dashing`の開始直後に行われる高速移動中はジャンプできません。

高速移動終了後のDash継続中からジャンプできます。

| Dashing内部Phase | Jump |
| -------------- | ---- |
| 開始直後の高速移動Phase | ×    |
| Dash継続Phase    | ○    |

Dashing内部Phaseの詳細については「Playerアクション｜ダッシュ」で定義します。

### 水平速度の引き継ぎ

Dashing中にジャンプした場合、Jump開始直前の水平方向の速度をAirborneへ引き継ぎます。

```text
Dashing中の水平速度
+
JumpVelocity
↓
Airborne
```

これにより、通常ジャンプよりも水平方向へ大きく移動できるダッシュジャンプになります。

現時点では、Dashから引き継ぐ水平速度に追加の倍率補正は行いません。

必要になった場合は、操作感を確認したうえで補正用パラメータを追加します。

## Airborne移行後の挙動

Jumpによって`MovementState = Airborne`へ移行した後は、Jump固有の処理を行いません。

空中での移動や落下については、Airborneの共通ルールに従います。

### 空中制御

Airborne中のMove入力による移動は「Player基本移動」で定義する空中制御に従います。

ジャンプページでは、空中制御の速度や方向変更量を個別に定義しません。

### Airborne中に開始できるAction

Airborneへ移行した後に開始できるActionは以下です。

| Action / State  | Airborne中の開始 |
| --------------- | ------------ |
| `ClickCharging` | ○            |
| `DragCharging`  | ○            |
| `Dashing`       | ×            |
| `MarkerFiring`  | ×            |
| `Parrying`      | ×            |
| `Aiming`        | ×            |

例えば、通常ジャンプ後に`ClickCharging`を開始した場合は以下の状態になります。

```text
MovementState = Airborne
ActionState   = ClickCharging
AimState      = Normal
```

Actionの開始可否については「Playerアクション遷移」のルールを正とします。

## 着地

Airborne中にPlayerが地面へ接地した場合、`MovementState`を`Airborne`から`Grounded`へ変更します。

```text
Airborne
↓
地面へ接地
↓
Grounded
```

Jump専用Stateは存在しないため、「Jump Stateを終了する」という処理は行いません。

### 着地時のActionState

着地は、原則として`MovementState`のみを変更します。

Airborne中に実行しているActionが存在する場合、そのActionは着地しただけでは終了しません。

例えば、

```text
MovementState = Airborne
ActionState   = ClickCharging
↓
着地
↓
MovementState = Grounded
ActionState   = ClickCharging
```

となります。

同様に、

```text
MovementState = Airborne
ActionState   = DragCharging
↓
着地
↓
MovementState = Grounded
ActionState   = DragCharging
```

となります。

各Actionに着地による終了条件が個別に設定されている場合のみ、そのAction固有のルールを優先します。

## 他Stateとの関係

Jumpは`ActionState`ではありません。

そのため、JumpそのものをActionState遷移表には含めません。

Jump入力を受け付けられるかどうかは、現在成立している各Stateによって判定します。

| State           | Jumpへの影響             |
| --------------- | -------------------- |
| `Grounded`      | Jump開始可能             |
| `Airborne`      | Jump開始不可             |
| `Dashing`       | 指定された内部PhaseのみJump可能 |
| `Aiming`        | Jump不可               |
| `MarkerFiring`  | Jump不可               |
| `ClickCharging` | Jump不可               |
| `DragCharging`  | Jump不可               |
| `Parrying`      | Jump不可               |
| `SmallHit`      | Jump不可               |
| `BigHit`        | Jump不可               |
| `Conversation`  | Jump不可               |
| `Interacting`   | Jump不可               |
| `Dead`          | Jump不可               |

Jumpによって変更するStateは原則として`MovementState`のみです。

例外として、`Dashing`中にJumpした場合は`ActionState = Dashing`を終了して`None`へ変更します。

## パラメータ

ジャンプ固有の主な調整項目を以下に示します。

| パラメータ          | 内容                      | 値  |
| -------------- | ----------------------- | -- |
| `JumpVelocity` | Jump開始時にPlayerへ与える上方向速度 | 未定 |

重力やAirborne中の空中制御については、Player基本移動側の仕様およびパラメータを使用します。

## 未決事項

* Jump入力を押している時間によってジャンプ高度を変化させるか
* Jump入力の先行受付を設けるか
* 地面へ着地する直前のJump入力を保持するか
* 崖から落下した直後にJump入力を受け付けるコヨーテタイムを設けるか

<PageRelations />
