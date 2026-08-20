---
title: "Playerアクション｜照準"
description: Palette BulletにおけるPlayerの照準仕様
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Playerアクション｜照準

## 目的

本ページでは、Playerの照準機能について定義します。

照準は`ActionState`ではなく、独立した`AimState`として管理します。

本ページでは主に以下を扱います。

* `AimState`の遷移
* Aimingの使用可能条件
* Aiming中のカメラ
* Aiming中のPlayerの向き
* Aiming中の移動
* 各Actionとの同時成立
* Dash・ParryによるAim解除
* Airborne移行時のAim解除
* 被弾やRootState変更によるAim解除
* Aimの終了条件

マーカーの生成・発射処理については「Playerアクション｜マーカー」、シャオンダマの選択については「Playerアクション｜チャージ」で定義します。

## 照準とは

照準は、Playerが画面中央を基準として対象を狙いやすくするための操作です。

Aim入力によって`AimState`を`Normal`から`Aiming`へ変更します。

```text
AimState
├─ Normal
└─ Aiming
```

通常時の基本的な遷移は以下です。

```text
AimState    = Normal
ActionState = None
↓
Aim開始
↓
AimState    = Aiming
ActionState = None
```

Aimを開始しても、`ActionState`は変更しません。

そのため、Aiming中に別のActionStateを成立させることができます。

例：

```text
MovementState = Grounded
ActionState   = ClickCharging
AimState      = Aiming
ReactionState = None
```

## AimState

### Normal

通常のカメラ・移動・Player向きを使用する状態です。

Aim固有のカメラ補正や向き制御は行いません。

### Aiming

照準用のカメラ、移動速度、Player向き制御を使用する状態です。

Aimingは一部の`ActionState`と同時に成立できます。

```text
Aiming + MarkerFiring
Aiming + ClickCharging
Aiming + DragCharging
```

## 使用可能条件

Aimingは、以下の条件を満たしている場合に開始できます。

* `RootState = Gameplay`
* `MovementState = Grounded`
* 現在のActionStateがAimingとの同時成立を許可している
* `ReactionState = None`

主な状態との関係を以下に示します。

| 現在の状態                | Aiming開始 | 備考                              |
| -------------------- | -------- | ------------------------------- |
| `ActionState = None` | ○        | 通常のAim開始                        |
| `Dashing`            | 先行入力     | Dashing中には開始せず、正常終了後に開始可能       |
| `MarkerFiring`       | ―        | MarkerFiringは原則としてAiming中から開始する |
| `ClickCharging`      | ○        | ClickChargingを継続したままAim開始可能     |
| `DragCharging`       | ○        | DragChargingを継続したままAim開始可能      |
| `Parrying`           | ×        | 入力を無視                           |
| `SmallHit`           | ×        | 入力を無視                           |
| `BigHit`             | ×        | 入力を無視                           |
| `Airborne`           | ×        | 空中ではAim開始不可                     |

開始条件を満たしていない場合、Aimを開始しません。

## Aiming開始

Aim開始要求を受け付けた場合、`AimState`を`Normal`から`Aiming`へ変更します。

```text
AimState = Normal
↓
Aim開始条件確認
↓
AimState = Aiming
```

Aiming開始時には、以下の処理を行います。

* Aim用カメラへ変更する
* Aim用の移動速度補正を有効にする
* Playerの向きを照準方向へ追従させる
* Aim用のLook感度を適用する

Aim開始によって`ActionState`は変更しません。

## Aiming中のカメラ

Aiming中は、通常時より照準しやすいカメラへ変更します。

主に以下を変更します。

* カメラをPlayerへ近づける
* 肩越しに近いカメラ位置へ変更する
* FOVをAim用の値へ変更する
* Look感度をAim用の値へ変更する

```text
Normal Camera
↓
Aiming開始
↓
Aim Camera
```

NormalとAimingのカメラ切り替えは、瞬間的に切り替えるのではなく、設定した時間で補間できるようにします。

カメラ位置やFOVなどの具体値はパラメータとして調整します。

## Aiming中のPlayerの向き

Aiming中は、Player本体の正面方向を照準方向へ追従させます。

Player本体の向きには、カメラの水平方向を使用します。

```text
カメラの水平方向
↓
Playerの正面方向
```

カメラの上下角度によってPlayer本体を上下へ傾けません。

上下方向の照準は、カメラや武器などのAim表現側で処理します。

## Aiming中の移動

Aiming中もMove入力による移動は可能です。

ただし、通常時より移動速度を低下させます。

```text
AimState = Aiming
+
Move入力
↓
低速移動
```

Aiming中の移動速度補正には`AimingMoveSpeedMultiplier`を使用します。

`MarkerFiring`や`DragCharging`など、別のStateによる低速補正も同時に成立している場合は、補正を乗算しません。

複数の移動速度補正が同時成立した場合の最終速度については「Player基本移動」の仕様を正とします。

## レティクルとの関係

Aiming中は、画面中央のレティクルを照準基準として使用します。

ただし、レティクル自体はAim専用のUIではありません。

通常状態でも、チャージによるシャオンダマ選択などで画面中央のレティクルを使用する場合があります。

そのため、本ページではレティクルの表示・非表示条件そのものは定義しません。

Aimingでは、現在表示されている画面中央の照準基準を使用して、MarkerFiringなどの方向を決定します。

## 他Actionとの同時成立

`AimState`は`ActionState`とは独立しているため、一部のActionとAimingを同時に成立させることができます。

| ActionState     | Aimingとの同時成立 | ルール            |
| --------------- | ------------ | -------------- |
| `None`          | ○            | Aimingのみを継続可能  |
| `Dashing`       | ×            | Dash開始時にAim解除  |
| `MarkerFiring`  | ○            | Aiming中に開始可能   |
| `ClickCharging` | ○            | Aiming中でも実行可能  |
| `DragCharging`  | ○            | Aiming中でも実行可能  |
| `Parrying`      | ×            | Parry開始時にAim解除 |

ActionState間の遷移については「Playerアクション遷移」を正とします。

## MarkerFiringとの関係

MarkerFiringは、原則としてAiming中に開始します。

```text
AimState    = Aiming
ActionState = None
↓
Marker入力
↓
AimState    = Aiming
ActionState = MarkerFiring
```

MarkerFiring開始によってAimingを自動終了しません。

そのため、

```text
Aiming + MarkerFiring
```

が成立します。

### MarkerFiring中にAimを終了した場合

MarkerFiringの開始後にAim終了条件が成立した場合、AimStateのみを`Normal`へ戻します。

MarkerFiring自体は終了しません。

```text
AimState    = Aiming
ActionState = MarkerFiring
↓
Aim終了
↓
AimState    = Normal
ActionState = MarkerFiring
```

つまり、MarkerFiringは**開始時にAimingであることを要求しますが、開始後にAimingを維持することまでは要求しません。**

MarkerFiringの発射処理や終了条件については「Playerアクション｜マーカー」で定義します。

## ClickChargingとの関係

Aimingと`ClickCharging`は同時に成立できます。

通常状態でClickCharging中にAimを開始した場合は、

```text
AimState    = Normal
ActionState = ClickCharging
↓
Aim開始
↓
AimState    = Aiming
ActionState = ClickCharging
```

となります。

逆にAiming中にClickChargingを開始した場合も、Aimingを継続します。

ClickChargingの処理については「Playerアクション｜チャージ」で定義します。

## DragChargingとの関係

Aimingと`DragCharging`は同時に成立できます。

```text
AimState    = Aiming
ActionState = DragCharging
```

Aiming開始・終了によって、DragCharging自体を自動終了しません。

例えばAiming + DragCharging中に接地を失った場合は、

```text
MovementState = Grounded
ActionState   = DragCharging
AimState      = Aiming
↓
接地喪失
↓
MovementState = Airborne
ActionState   = DragCharging
AimState      = Normal
```

となります。

DragChargingはAirborneでも成立できるため継続します。

## Dashingとの関係

AimingとDashingは同時成立できません。

Aiming中にDash開始条件を満たした場合は、Aimingを終了してからDashingを開始します。

```text
AimState    = Aiming
ActionState = None
↓
Dash開始
↓
AimState    = Normal
ActionState = Dashing
```

Aimingと別のActionが同時成立している場合も、Dashingへの遷移が成立した時点でAimを終了します。

ActionState間のDash遷移条件については「Playerアクション遷移」を正とします。

### Dashing中のAim入力

Dashing中はその場でAimingを開始できません。

ただし、Aim開始要求を先行入力として保持できます。

```text
ActionState = Dashing
AimState    = Normal
↓
Aim入力
↓
Aim開始要求を保持
↓
Dashing正常終了
↓
Aim開始条件確認
↓
AimState = Aiming
```

先行入力の保持・評価・破棄については「Playerアクション遷移」を正とします。

### 照準長押し方式の場合

照準長押し方式では、Dashing正常終了時にもAim入力が継続している場合のみAimingを開始します。

```text
Dashing中にAim入力
↓
Aim開始要求を保持
↓
Dashing正常終了
↓
Aim入力を現在も押している
↓
Aiming開始
```

Dashing正常終了前にAim入力を離した場合は、Aim開始要求を破棄します。

## Parryingとの関係

AimingとParryingは同時成立できません。

Aiming中にParry開始条件を満たした場合は、Aimを終了してからParryingを開始します。

```text
AimState    = Aiming
ActionState = None
↓
Parry開始
↓
AimState    = Normal
ActionState = Parrying
```

Parrying中のAim入力は先行入力として保持しません。

入力は無視します。

## Airborneとの関係

Aimingは`MovementState = Grounded`の場合のみ成立できます。

Airborne中にAimingを開始することはできません。

また、Aiming中に接地を失って`Grounded → Airborne`へ移行した場合は、Aimingを終了します。

```text
MovementState = Grounded
AimState      = Aiming
↓
接地喪失
↓
MovementState = Airborne
AimState      = Normal
```

対象となる主な状況は以下です。

* 崖から落下する
* 足場が消える
* 外力によって接地を失う

Aiming中はJump自体を開始できないため、通常のJumpによってAirborneへ移行することはありません。

Aim終了によって、Aimingと同時成立していたActionまで自動終了するわけではありません。

そのActionがAirborneでも成立できる場合は継続します。

## ReactionStateとの関係

`SmallHit`または`BigHit`が成立した場合、Aimingを終了します。

```text
AimState = Aiming
↓
SmallHit / BigHit
↓
AimState = Normal
```

Aim解除後のActionStateについては、各ActionおよびReactionStateの仕様に従います。

例えば`DragCharging`はSmallHitでも継続できますが、Aimは解除されます。

```text
ActionState   = DragCharging
AimState      = Aiming
ReactionState = None
↓
SmallHit
↓
ActionState   = DragCharging
AimState      = Normal
ReactionState = SmallHit
```

## RootStateとの関係

`Gameplay`から以下のRootStateへ遷移する場合、Aimingを終了します。

* `Conversation`
* `Interacting`
* `Dead`

```text
RootState = Gameplay
AimState  = Aiming
↓
Conversation / Interacting / Dead
↓
AimState = Normal
```

RootStateによるGameplay内部Stateの終了については「Playerアクション遷移」を正とします。

## Aimingの終了

Aimingは、以下のいずれかによって終了します。

| 終了原因                  | 結果                  |
| --------------------- | ------------------- |
| 入力方式に応じたAim終了操作       | `AimState = Normal` |
| Dashing開始             | `AimState = Normal` |
| Parrying開始            | `AimState = Normal` |
| `SmallHit`            | `AimState = Normal` |
| `BigHit`              | `AimState = Normal` |
| `Grounded → Airborne` | `AimState = Normal` |
| `Conversation`開始      | `AimState = Normal` |
| `Interacting`開始       | `AimState = Normal` |
| `Dead`へ遷移             | `AimState = Normal` |

一方、以下のActionを開始しただけではAimingを終了しません。

* `MarkerFiring`
* `ClickCharging`
* `DragCharging`

## 入力方式

Aimに使用する物理入力や入力方式については「Player入力と操作」を正とします。

Aimページでは、入力方式に応じて発生する以下の要求を受け取り、AimStateを変更します。

* Aim開始要求
* Aim終了要求

```text
物理入力
↓
Player入力と操作
↓
Aim開始要求 / Aim終了要求
↓
AimState変更
```

現在は以下の3つの入力方式を使用します。

| 入力方式     | Aiming開始    | Aiming終了     |
| -------- | ----------- | ------------ |
| 照準長押し方式  | Aim入力を押す    | Aim入力を離す     |
| 照準切り替え方式 | Aim入力を押す    | Aim入力をもう一度押す |
| ワンボタン方式  | Marker入力を押す | Marker入力を離す  |

初期設定では照準長押し方式を使用します。

## 照準長押し方式

Aim入力を押している間Aimingを継続します。

```text
Aim入力押下
↓
Normal → Aiming
↓
Aim入力継続
↓
Aiming継続
↓
Aim入力を離す
↓
Aiming → Normal
```

Aiming中にMarkerFiringを開始した後でAim入力を離した場合も、Aimは即座に終了します。

MarkerFiringはそのまま継続します。

## 照準切り替え方式

Aim入力を押すたびに`Normal`と`Aiming`を切り替えます。

```text
Normal
↓ Aim入力
Aiming
↓ Aim入力
Normal
```

MarkerFiringを実行しても、自動的にはAimを終了しません。

## ワンボタン方式

ワンボタン方式では、Marker入力とAim操作を同じ入力で行います。

Marker入力を押した時点でAimingを開始します。

```text
Marker入力押下
↓
AimState
Normal → Aiming
```

Marker入力を離した場合、Aiming中の状態でMarkerFiringの開始条件を評価します。

```text
Marker入力を離す
↓
MarkerFiring開始条件を評価
↓
MarkerFiring開始
↓
AimState = Normal
```

MarkerFiringを開始できなかった場合でも、Marker入力を離した時点でワンボタン方式によるAimingは終了します。

つまり、ワンボタン方式ではMarker入力を押している間のみAimを維持します。

MarkerFiringの詳細については「Playerアクション｜マーカー」で定義します。

## Aim終了時のカメラ

Aimingを終了した場合、Aim用カメラから通常カメラへ戻します。

```text
Aim Camera
↓
Aim終了
↓
Normal Camera
```

以下のAim終了理由に関係なく、通常カメラへ戻す処理を行います。

* 通常のAim終了操作
* Dash開始
* Parry開始
* 被弾
* Airborne移行
* RootState変更

カメラは設定された遷移時間に従って通常状態へ補間します。

ただし、被弾や死亡など即時性が必要な場合に専用のCamera処理が設定されている場合は、その仕様を優先します。

## パラメータ

Aim固有の主な調整項目を以下に示します。

| パラメータ                          | 内容                     | 値  |
| ------------------------------ | ---------------------- | -- |
| `AimFOV`                       | Aiming中のCamera FOV     | 未定 |
| `AimCameraOffset`              | Aiming中のカメラ位置          | 未定 |
| `AimLookSensitivityMultiplier` | Aiming中のLook感度補正       | 未定 |
| `AimCameraTransitionDuration`  | NormalとAiming間のカメラ遷移時間 | 未定 |
| `AimingMoveSpeedMultiplier`    | Aiming中の移動速度補正         | 未定 |
| `AimRotationSpeed`             | Playerが照準方向へ追従する回転速度   | 未定 |

移動速度補正の最終的な決定ルールについては「Player基本移動」を正とします。

## 各ページとの責務分離

Aimに関係する仕様は、以下のように管理します。

| 内容                              | 管理ページ             |
| ------------------------------- | ----------------- |
| `Normal ↔ Aiming`               | 本ページ              |
| Aiming開始・終了条件                   | 本ページ              |
| Aiming中のカメラ                     | 本ページ              |
| Aiming中のPlayer向き                | 本ページ              |
| Aiming中の移動速度補正                  | 本ページ / Player基本移動 |
| ActionStateとの同時成立               | Playerアクション遷移     |
| Dashing中のAim先行入力                | Playerアクション遷移     |
| MarkerFiringの処理                 | Playerアクション｜マーカー  |
| ClickCharging / DragChargingの処理 | Playerアクション｜チャージ  |
| Aimの物理キー・入力方式                   | Player入力と操作       |
| レティクル自体の表示・UI仕様                 | UI関連仕様            |

MarkerやChargeの各ページでは、Aiming中のカメラ・Player向き・基本移動速度を再定義せず、本ページおよびPlayer基本移動を参照します。

## 未決事項

* Aim用カメラの具体的な位置
* Aiming中のFOV
* Aiming中のLook感度
* NormalとAiming間のカメラ補間時間
* Playerが照準方向へ追従する回転速度

<PageRelations />
