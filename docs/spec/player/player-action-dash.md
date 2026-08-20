---
title: "Playerアクション｜ダッシュ"
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Playerアクション｜ダッシュ

## 目的

本ページでは、Playerアクションの一つであるダッシュについて定義します。

本ページでは主に以下を扱います。

* Dashの使用可能条件
* `ActionState = Dashing`への遷移
* Dashing内部Phase
* Dash中の移動
* スタミナ消費
* 無敵時間
* Jumpによる終了
* 接地を失った場合の終了
* 被弾による終了
* Dashing終了条件
* Dash固有のパラメータ

他ActionからDashingへ遷移できるかどうかや、キャンセル・先行入力などの横断的なルールについては「Playerアクション遷移」を正とします。

## ダッシュとは

Dash入力を受け付けると、`ActionState`を`Dashing`へ変更し、高速移動を開始します。

`Dashing`は1つの`ActionState`として管理します。

```text
ActionState
None
↓
Dash入力
↓
Dashing
```

従来の「ダッシュアクション」「ダッシュ状態」は別々のStateとして扱わず、`Dashing`内部のPhaseとして管理します。

```text
Dashing
│
├─ 初動高速移動Phase
│
└─ Dash継続Phase
```

Dash開始時は必ず初動高速移動Phaseから開始します。

初動高速移動Phase終了時にDash入力が継続している場合のみ、Dash継続Phaseへ移行します。

## 使用可能条件

Dashは、以下の条件をすべて満たしている場合に開始できます。

* `RootState = Gameplay`
* `MovementState = Grounded`
* 現在のStateから`Dashing`への遷移が許可されている
* Dash開始に必要なスタミナが残っている

Airborne中はDashを開始できません。

開始条件を満たしていない状態でDash入力が行われた場合、Dashingへ遷移しません。

### スタミナ不足の場合

スタミナが不足している場合、Dashは開始しません。

他ActionからDashへ遷移しようとしていた場合も、Dashの開始条件を確認してから現在のActionを終了します。

そのため、スタミナ不足によってDashを開始できない場合は、現在のActionを継続します。

例：

```text
MarkerFiring
↓
キャンセル可能区間でDash入力
↓
Dash開始条件確認
↓
スタミナ不足
↓
MarkerFiring継続
```

```text
DragCharging
↓
Dash入力
↓
Dash開始条件確認
↓
スタミナ不足
↓
DragCharging継続
```

## Dash開始時の処理

Dash開始時は、以下の処理を行います。

```text
Dash入力
↓
開始条件確認
↓
スタミナ消費
↓
必要に応じてAim解除
↓
ActionState = Dashing
↓
Dash移動方向を決定
↓
初動高速移動Phase開始
```

Dash開始によって`MovementState`は変更しません。

通常は以下の状態になります。

```text
MovementState = Grounded
ActionState   = Dashing
AimState      = Normal
```

### Aiming中から開始する場合

`AimState = Aiming`の状態からDashを開始する場合は、Dash開始時に`AimState`を`Normal`へ戻します。

```text
AimState    = Aiming
ActionState = None

↓ Dash開始

AimState    = Normal
ActionState = Dashing
```

他ActionとAimingが同時成立している場合も同様に、Dashing開始時にAimingを終了します。

## Dash移動方向

初動高速移動Phaseの移動方向は、Dash開始時に決定します。

移動方向は以下の優先順位で決定します。

* Move入力がある場合：Move入力が示す方向
* Move入力がない場合：Playerの正面方向

Move入力から移動方向を求める場合は、Player基本移動と同様にカメラの水平方向を基準とします。

初動高速移動Phase開始後は、Phase終了まで移動方向を変更できません。

## Dashing内部Phase

`Dashing`は以下の2つの内部Phaseを持ちます。

| Phase       | 内容                        |
| ----------- | ------------------------- |
| 初動高速移動Phase | Dash開始直後に必ず実行する短時間の高速移動   |
| Dash継続Phase | Dash入力を継続している場合に行う高速な通常移動 |

## 初動高速移動Phase

Dash開始時は必ず初動高速移動Phaseへ入ります。

初動高速移動Phaseでは、以下の挙動を行います。

* 短時間、高速で移動する
* Dash開始時に決定した方向へ移動する
* Phase中は移動方向を変更できない
* 開始直後に無敵時間を持つ
* Jumpできない
* Dash入力を途中で離してもPhase終了までは継続する
* 壁などに衝突してもPhaseそのものは終了しない

### Dash入力を途中で離した場合

初動高速移動Phase中にDash入力を離しても、Phaseを途中終了しません。

```text
Dashing開始
↓
初動高速移動Phase
↓
Dash入力を離す
↓
初動高速移動Phase継続
↓
Phase終了
↓
Dashing終了
```

初動高速移動Phase終了時点でDash入力が継続していない場合、Dash継続Phaseには移行せずDashingを終了します。

### Dash入力を継続している場合

初動高速移動Phase終了時点でDash入力が継続している場合、Dash継続Phaseへ移行します。

```text
Dashing開始
↓
初動高速移動Phase
↓
Dash入力継続
↓
初動高速移動Phase終了
↓
Dash継続Phase
```

Phaseが変化しても`ActionState`は`Dashing`のままです。

## Dash継続Phase

Dash継続Phaseでは、通常移動より速い速度で移動できます。

以下の挙動を行います。

* Move入力によって移動する
* 移動方向を自由に変更できる
* Dash入力を押している間継続する
* Dash入力を離すとDashingを終了する
* Jumpできる

移動方向の決定方法はPlayer基本移動に従います。

ただし移動速度にはDash継続Phase固有の速度を使用します。

### Move入力がない場合

Dash継続Phase中にMove入力がない場合の移動処理は、通常移動と同様にMove入力による移動を行いません。

`ActionState = Dashing`自体は、Dash入力が継続している限り維持します。

## スタミナ消費

Dashでは、Dashing開始時にスタミナを1回消費します。

```text
Dash開始条件確認
↓
必要スタミナあり
↓
スタミナ消費
↓
Dashing開始
```

Dash継続Phase中に継続的なスタミナ消費は行いません。

Dash開始に必要なスタミナが不足している場合は、Dashingを開始できません。

スタミナの最大値や回復方法などはPlayerの体力・スタミナ仕様で定義します。

## 無敵時間

初動高速移動Phaseの開始直後には無敵時間があります。

無敵時間中に敵の攻撃判定を受けた場合、被弾を成立させません。

そのため、無敵時間中は`SmallHit`または`BigHit`へ移行しません。

```text
Dashing
↓
無敵時間中に攻撃を受ける
↓
被弾しない
↓
Dashing継続
```

無敵時間終了後は、Dashing中でも通常どおり被弾します。

無敵時間は初動高速移動Phase全体と同じ長さである必要はありません。

具体的な無敵時間はパラメータとして調整します。

## 壁などへ衝突した場合

初動高速移動Phase中に壁や移動できない障害物へ衝突しても、Dashingを終了しません。

移動できない場合は、その場で初動高速移動Phaseを継続します。

Phaseの終了条件は通常どおり時間によって判定します。

Dash継続Phase中の壁との衝突は、通常のPlayer移動と同様に処理します。

## Jumpによる終了

初動高速移動Phase中はJumpできません。

Dash継続Phase中はJumpできます。

| Dashing内部Phase | Jump |
| -------------- | ---- |
| 初動高速移動Phase    | ×    |
| Dash継続Phase    | ○    |

Dash継続Phase中にJump入力を受け付けた場合、Dashingを終了します。

```text
MovementState = Grounded
ActionState   = Dashing
↓
Jump入力
↓
Dashing終了
↓
ActionState   = None
MovementState = Airborne
```

Jump開始時には、Dashing中の水平方向の速度をAirborneへ引き継ぎます。

Jumpによる`Grounded → Airborne`、上方向速度の付与、水平速度の引き継ぎについては「Player移動｜ジャンプ」を正とします。

JumpによってDashingが終了した場合、Dashing中に保持していた先行入力は破棄します。

## 接地を失った場合

Dashing中にJump以外の理由で地面との接地を失った場合も、Dashingを終了します。

例：

* 崖から落下する
* 足場が消える
* 地面から押し出される

基本的なState変更は以下です。

```text
MovementState = Grounded
ActionState   = Dashing
↓
接地を失う
↓
MovementState = Airborne
ActionState   = None
```

Airborneへ移行する際は、接地を失う直前の水平方向速度を維持します。

接地喪失によってDashingが終了した場合、Dashing中に保持していた先行入力は破棄します。

## 他ActionからDashingへの遷移

どのActionからDashingへ遷移できるかは「Playerアクション遷移」を正とします。

現在の主な遷移は以下です。

| 現在のActionState  | Dashingへの遷移 |
| --------------- | ----------- |
| `None`          | 即時遷移        |
| `MarkerFiring`  | キャンセル受付後に遷移 |
| `ClickCharging` | キャンセル受付後に遷移 |
| `DragCharging`  | 即時遷移        |
| `Parrying`      | 遷移不可        |

どの経路からDashingへ遷移した場合でも、Dashingは初動高速移動Phaseから開始します。

### MarkerFiringから

```text
MarkerFiring
↓
キャンセル条件成立
↓
Dash開始条件確認
↓
Dashing
↓
初動高速移動Phase
```

### ClickChargingから

```text
ClickCharging
↓
キャンセル条件成立
↓
Dash開始条件確認
↓
Dashing
↓
初動高速移動Phase
```

### DragChargingから

```text
DragCharging
↓
Dash入力
↓
Dash開始条件確認
↓
Dashing
↓
初動高速移動Phase
```

各Action側のキャンセル受付タイミングや、Action中断時の固有処理についてはそれぞれのAction仕様で定義します。

## Dashing中の他Action入力

Dashing中に入力できる次のActionについては「Playerアクション遷移」の先行入力ルールに従います。

現在、Dashing中に先行入力として保持できるActionは以下です。

* `MarkerFiring`
* `DragCharging`
* `ClickCharging`

これらの入力はDashingを即座に終了させません。

Dashingが正常終了した後に開始条件を確認し、条件を満たしている場合のみ次のActionを開始します。

```text
Dashing
↓
MarkerFiring入力を保持
↓
Dashing正常終了
↓
ActionState = None
↓
開始条件確認
↓
MarkerFiring
```

先行入力の保持方法、複数入力時の優先方法、Aim入力との関係については「Playerアクション遷移」で定義します。

## 被弾による終了

Dashing中に`SmallHit`または`BigHit`が成立した場合、Dashingを強制終了します。

```text
Dashing
↓
SmallHit / BigHit成立
↓
Dash固有移動終了
↓
ActionState = None
↓
ReactionStateの処理へ
```

`SmallHit`と`BigHit`のどちらでもDashingは終了します。

被弾によってDashingが強制終了した場合、保持していた先行入力は破棄します。

ただし、初動高速移動Phaseの無敵時間中は被弾自体が成立しないため、Dashingを継続します。

## RootState変更による終了

Dashing中にGameplay以外のRootStateへ遷移する場合、Dashingを強制終了します。

対象となる主なRootStateは以下です。

* `Conversation`
* `Interacting`
* `Dead`

これらへの遷移ではDashingを終了し、保持していた先行入力も破棄します。

`Dead`への遷移は他のPlayer状態より優先します。

## Dashingの終了

Dashingの主な終了条件を以下に示します。

| 終了原因                     | 結果                                              | 先行入力 |
| ------------------------ | ----------------------------------------------- | ---- |
| 初動高速移動Phase終了時にDash入力がない | `ActionState = None`                            | 評価する |
| Dash継続PhaseでDash入力を離す    | `ActionState = None`                            | 評価する |
| Jump                     | `ActionState = None`、`MovementState = Airborne` | 破棄   |
| 接地を失う                    | `ActionState = None`、`MovementState = Airborne` | 破棄   |
| `SmallHit`               | `ActionState = None`                            | 破棄   |
| `BigHit`                 | `ActionState = None`                            | 破棄   |
| `Conversation`           | Gameplayから離脱                                    | 破棄   |
| `Interacting`            | Gameplayから離脱                                    | 破棄   |
| `Dead`                   | `RootState = Dead`                              | 破棄   |

### 正常終了

以下はDashingの正常終了として扱います。

* 初動高速移動Phase終了時にDash入力が継続していない
* Dash継続Phase中にDash入力を離した

正常終了時は、

```text
Dashing
↓
ActionState = None
↓
保持している先行入力を評価
```

の順で処理します。

### 強制終了・特殊終了

以下の場合は、Dashingの正常終了として扱いません。

* Jump
* 接地喪失
* SmallHit
* BigHit
* RootState変更

これらの場合、保持している先行入力は評価せず破棄します。

## パラメータ

Dash固有の主な調整項目を以下に示します。

| パラメータ                    | 内容                | 値  |
| ------------------------ | ----------------- | -- |
| `DashBurstSpeed`         | 初動高速移動Phaseの移動速度  | 未定 |
| `DashBurstDuration`      | 初動高速移動Phaseの継続時間  | 未定 |
| `DashRunSpeed`           | Dash継続Phaseの移動速度  | 未定 |
| `DashInvincibleDuration` | Dash開始時の無敵時間      | 未定 |
| `DashStaminaCost`        | Dash開始時に消費するスタミナ量 | 未定 |

Dash中のMarkerFiringやDragChargingの先行入力受付時間については、共通の先行入力仕様および必要に応じた各Action仕様で管理します。

## 未決事項

* 初動高速移動Phaseの加速・減速方法
* Dash継続Phaseの開始時に速度をどのように接続するか
* Dash継続Phase中にMove入力がない場合、完全停止とするか慣性を残すか
* Dash継続Phaseの旋回速度に制限を設けるか

<PageRelations />
