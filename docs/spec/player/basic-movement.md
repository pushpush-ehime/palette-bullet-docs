---
title: Player移動｜WASD移動
description: Palette BulletにおけるPlayerの基本移動仕様
pageType: spec
category: Player
order: 20
status: 仮仕様
---

# Player基本移動

## 目的

本ページでは、Gameplay中のPlayerの基本移動について定義します。

本ページでは主に以下を扱います。

* `Grounded`中の地上移動
* `Airborne`中の空中制御
* 移動方向の決定
* 基本移動速度
* 他Stateによる移動速度の変更・移動制限
* 複数の移動制限が同時に成立した場合の処理

ジャンプやダッシュなど、それ自体が独立したActionとして扱われる移動については、それぞれの仕様ページで定義します。

## 基本ルール

通常移動そのものはStateとして管理しません。

Gameplay中のPlayerは、`MovementState`として以下のいずれかの状態になります。

```text
MovementState
├─ Grounded
└─ Airborne
```

`Grounded`または`Airborne`中にMove入力を受け取ることで、それぞれのStateに応じた移動処理を行います。

```text
Grounded
+
Move入力
↓
地上移動
```

```text
Airborne
+
Move入力
↓
空中制御
```

停止状態や歩行状態などを個別のStateとしては管理しません。

Move入力がない場合は、通常移動による移動処理を行いません。

また、`ActionState`、`AimState`、`ReactionState`、`RootState`によって移動が制限されている場合は、それらのルールを優先します。

## 移動方向

Playerの移動方向は、カメラの向きを基準に決定します。

カメラの前後左右とMove入力の方向を対応させます。

カメラの上下角度は移動方向に影響させず、水平方向のみを使用します。

```text
Move入力
+
カメラの水平方向
↓
Playerの移動方向を決定
```

前後左右および斜め方向で移動速度が変わらないように、移動入力から求めた方向ベクトルは必要に応じて正規化します。

基本的な操作感は、『スプラトゥーン』や『原神』の移動を参考にします。

## Grounded中の移動

`MovementState = Grounded`の場合、Move入力によって地上を移動します。

基本的な処理は以下です。

```text
Grounded
↓
Move入力を取得
↓
カメラ基準で移動方向を計算
↓
現在適用される移動速度を決定
↓
地上を移動
```

Move入力がない場合は、通常移動による水平方向の移動を行いません。

移動速度は、現在成立している`ActionState`や`AimState`などによって変更される場合があります。

## Airborne中の空中制御

`MovementState = Airborne`の場合もMove入力を受け付けます。

Airborne中のMove入力は、地上移動ではなく空中での水平方向の制御として扱います。

```text
Airborne
↓
Move入力を取得
↓
カメラ基準で移動方向を計算
↓
空中制御を適用
```

空中では、地上と同じ強さで自由に移動方向を変更できるとは限りません。

空中でどの程度Playerの移動方向を変更できるかは、空中制御用のパラメータによって調整します。

Actionによる移動速度補正が成立している場合は、空中制御にもその補正を適用します。

例えば、

* `Airborne + ClickCharging`では通常の空中制御を行う
* `Airborne + DragCharging`では低速補正を適用した空中制御を行う

とします。

## 移動速度

Playerの基本移動には、通常移動速度を使用します。

通常移動速度はUnity上で調整可能なパラメータとして管理し、具体的な値は調整によって決定します。

```text
基本移動速度
↓
現在成立しているStateによる補正
↓
最終的な移動速度
```

通常時は補正を行わず、基本移動速度をそのまま使用します。

## 他Stateによる移動制御

Gameplay中は、`ActionState`、`AimState`、`ReactionState`などによって、通常移動の速度や可否が変化します。

| 状態              | 基本移動      | 移動速度・処理             |
| --------------- | --------- | ------------------- |
| 通常時             | 可能        | 通常速度                |
| `Aiming`        | 可能        | 通常速度より低下            |
| `MarkerFiring`  | 可能        | 通常速度より低下            |
| `ClickCharging` | 可能        | 通常速度                |
| `DragCharging`  | 可能        | 通常速度より低下            |
| `Parrying`      | 不可        | 通常移動を停止             |
| `SmallHit`      | 不可        | 通常移動を停止             |
| `BigHit`        | 不可        | 通常移動を停止             |
| `Dashing`       | Dash仕様に従う | `Dashing`固有の移動処理を使用 |
| `Conversation`  | 不可        | Gameplayの通常移動を行わない  |
| `Interacting`   | 不可        | Gameplayの通常移動を行わない  |
| `Dead`          | 不可        | Gameplayの通常移動を行わない  |

### Aiming

`AimState = Aiming`では、PlayerはMove入力によって移動できます。

ただし、通常時より移動速度を低下させます。

具体的な速度補正値はパラメータとして調整します。

### MarkerFiring

`ActionState = MarkerFiring`では、PlayerはMove入力によって移動できます。

ただし、通常時より移動速度を低下させます。

`Aiming + MarkerFiring`が同時に成立している場合の速度決定については、「複数の移動制限が重なった場合」で定義します。

### ClickCharging

`ActionState = ClickCharging`では、通常移動を制限しません。

Move入力がある場合は、通常時と同じ移動速度で移動できます。

`Aiming + ClickCharging`の場合は、ClickChargingではなくAimingによる低速補正が適用されます。

### DragCharging

`ActionState = DragCharging`では、PlayerはMove入力によって移動できます。

ただし、通常時より移動速度を低下させます。

`DragCharging`はAirborne中にも継続できるため、Airborne中は空中制御に対して同様の低速補正を適用します。

### Parrying

`ActionState = Parrying`では、通常移動を行いません。

Move入力が行われても、通常移動には使用しません。

Parry開始時にはPlayerの通常移動を停止し、Parry固有の挙動に従います。

### ReactionState

`ReactionState = SmallHit`または`BigHit`では、通常移動を行いません。

Move入力が行われても、被弾リアクション中の通常移動には使用しません。

`SmallHit`中に`DragCharging`が継続している場合でも、DragCharging自体は継続しますが、通常移動は停止します。

### Dashing

`ActionState = Dashing`では、本ページの通常移動速度を使用した通常移動ではなく、Dash固有の移動処理を使用します。

Dashing中の移動速度、方向変更、入力処理などは「Playerアクション｜ダッシュ」で定義します。

## 複数の移動制限が重なった場合

複数のStateによる移動制限や速度補正が同時に成立する場合、補正値を重ね掛けしません。

移動制限は、以下の優先順位で決定します。

```text
移動不可
↓
Action固有の移動
↓
低速移動
↓
通常移動
```

### 移動不可

現在成立しているStateの中に、通常移動を禁止するStateが1つでも存在する場合は、通常移動を行いません。

対象となる主なStateは以下です。

* `Parrying`
* `SmallHit`
* `BigHit`
* `Conversation`
* `Interacting`
* `Dead`

例えば、`DragCharging + SmallHit`ではDragCharging自体は継続しますが、SmallHitによる移動禁止を優先するため通常移動は行いません。

### Action固有の移動

`Dashing`など、独自の移動処理を持つActionが成立している場合は、そのAction固有の移動処理を使用します。

通常移動の速度補正とは別に扱います。

### 複数の低速補正

複数の低速補正が同時に成立している場合、それぞれの補正値を乗算しません。

最も移動速度を低くする補正を1つだけ採用します。

例えば、

```text
Aiming
+
MarkerFiring
```

が成立している場合、AimingとMarkerFiringの移動速度補正を比較し、より移動速度が低くなる方を使用します。

```text
Aiming補正 = 0.6
MarkerFiring補正 = 0.7

↓

最終補正 = 0.6
```

この例の数値は説明用であり、実際の値ではありません。

同様に、

```text
Aiming
+
DragCharging
```

の場合も、より移動速度を低くする補正を採用します。

これにより、複数のStateが同時成立したことで意図せず移動速度が極端に低下することを防ぎます。

## RootStateによる移動制御

本ページで定義する通常移動は、`RootState = Gameplay`の場合に使用するGameplay用の移動処理です。

以下のRootStateへ遷移した場合は、Gameplayの通常移動を行いません。

* `Conversation`
* `Interacting`
* `Dead`

これらのState中にPlayerを移動させる必要がある場合は、Move入力による通常移動ではなく、それぞれのState固有の処理として定義します。

Gameplayの通常移動を行わないことと、Playerに作用する物理処理を停止することは同義ではありません。

Conversation / Interactingの開始可能なMovementStateについては、それぞれのRootState仕様を正とします。

Dead中の重力・落下については「Player死亡」を正とします。
## パラメータ

基本移動に関する主な調整項目を以下に示します。

| パラメータ                             | 内容                   | 値  |
| --------------------------------- | -------------------- | -- |
| `MoveSpeed`                       | Playerの基本移動速度        | 未定 |
| `AirControlMultiplier`            | Airborne中の空中制御の強さ    | 未定 |
| `AimingMoveSpeedMultiplier`       | Aiming中の移動速度補正       | 未定 |
| `MarkerFiringMoveSpeedMultiplier` | MarkerFiring中の移動速度補正 | 未定 |
| `DragChargingMoveSpeedMultiplier` | DragCharging中の移動速度補正 | 未定 |

各補正値の具体値は、実際の操作感を確認しながら調整します。

## 未決事項

* 移動の開始と停止に加速・減速を使用するか
* Airborne中の空中制御の強さ
* Aiming中の移動速度補正値
* MarkerFiring中の移動速度補正値
* DragCharging中の移動速度補正値
* ゲームパッド対応時にスティックの入力強度を移動速度へ反映するか

<PageRelations />
