---
title: "Playerアクション｜マーカー"
description: Palette BulletにおけるPlayerのマーカー発射仕様
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Playerアクション｜マーカー

## 目的

本ページでは、Playerアクションの一つであるマーカー発射について定義します。

本ページでは主に以下を扱います。

* `MarkerFiring`の開始条件
* `ActionState = MarkerFiring`への遷移
* 発射モーション
* MarkerFiring内部Phase
* マーカーの生成・発射
* Dashキャンセル
* Marker再入力
* Aimingとの関係
* Airborneとの関係
* 被弾やRootState変更による終了
* MarkerFiringの正常終了

照準そのもののカメラ・Player向き・移動速度・入力方式については「Playerアクション｜照準」を正とします。

ActionState間の遷移、キャンセル、Action先行入力、Dashキャンセル入力バッファなどの共通ルールについては「Playerアクション遷移」を正とします。

マーカーオブジェクト自体の移動、衝突、付着、寿命などについては、マーカーオブジェクト側の仕様で定義します。

## マーカーとは

マーカーは、Playerの攻撃であるパレットブレットの飛行先を指定するために使用するオブジェクトです。

Playerは敵、地面、壁などへマーカーを発射・付着させ、パレットブレットの攻撃先を指定します。

本ページでは、Playerがマーカーを発射するまでのActionを扱います。

## MarkerFiringとは

マーカー発射中は、`ActionState = MarkerFiring`として管理します。

```text
ActionState
None
↓
Marker入力
↓
MarkerFiring
```

MarkerFiringは短時間のActionです。

発射モーションを行い、その途中でマーカーを生成・発射します。

MarkerFiringが正常終了すると、`ActionState`は`None`へ戻ります。

## 使用可能条件

MarkerFiringは、以下の条件をすべて満たしている場合に開始できます。

* `RootState = Gameplay`
* `MovementState = Grounded`
* `ActionState = None`
* `AimState = Aiming`
* `ReactionState = None`

MarkerFiringを開始するには、**Aiming中であることを必須**とします。

```text
MovementState = Grounded
ActionState   = None
AimState      = Aiming
ReactionState = None

↓

Marker入力

↓

ActionState = MarkerFiring
```

`AimState = Normal`の状態から、通常のMarker入力だけで直接MarkerFiringを開始することはできません。

ただし、ワンボタン方式ではMarker入力によって先にAimingを開始し、入力を離した時点でMarkerFiring開始条件を評価します。

ワンボタン方式の詳細については「Playerアクション｜照準」および「Player入力と操作」で定義します。

## MarkerFiring開始

MarkerFiring開始条件を満たした状態でMarker発射要求を受け取ると、`ActionState`を`None`から`MarkerFiring`へ変更します。

```text
AimState    = Aiming
ActionState = None

↓

Marker発射要求

↓

ActionState = MarkerFiring
```

MarkerFiring開始によって`AimState`は変更しません。

そのため、通常は以下の状態になります。

```text
MovementState = Grounded
ActionState   = MarkerFiring
AimState      = Aiming
ReactionState = None
```

## MarkerFiring内部Phase

MarkerFiringは、以下の内部Phaseを持ちます。

```text
MarkerFiring
│
├─ 発射前・キャンセル不可Phase
│
└─ 発射後・Dashキャンセル可能Phase
```

Phaseは別のStateではありません。

`ActionState`はMarkerFiring開始から終了まで`MarkerFiring`のままです。

### 発射前・キャンセル不可Phase

MarkerFiring開始直後から、実際にマーカーが発射されるまでのPhaseです。

このPhaseでは以下の処理を行います。

* 発射モーションを再生する
* マーカー発射前のモーションを行う
* Dashによる即時キャンセルはできない
* キャンセル受付開始直前のDash入力は短時間バッファできる
* Marker再入力を受け付けない

```text
MarkerFiring開始
↓
発射前・キャンセル不可Phase
↓
発射タイミング
```

Dash要求がバッファされている場合でも、このPhaseを途中で終了しません。

マーカーは予定どおり発射し、その後にDashキャンセルを評価します。

### 発射後・Dashキャンセル可能Phase

マーカーが実際に生成・発射された直後から、MarkerFiring終了までのPhaseです。

このPhaseでは以下の処理を行います。

* 発射後モーションを継続する
* Dashキャンセルを受け付ける
* 有効なDashキャンセル入力バッファがあればDash要求を評価する
* Marker再入力を受け付けない
* Dashキャンセルが成立しない場合は通常終了までMarkerFiringを継続する

```text
発射タイミング
↓
マーカー生成・発射
↓
Dashキャンセル受付開始
↓
有効なDash要求があれば評価
↓
発射後モーション
↓
MarkerFiring終了
```

## マーカー発射

### 発射タイミング

マーカーは、発射モーション中の指定されたタイミングで生成・発射します。

```text
MarkerFiring
↓
発射Event
↓
発射方向を決定
↓
マーカー生成
↓
発射
```

具体的な発射タイミングは、Animation Eventなどで調整できるようにします。

Dash要求がバッファされていても、発射Eventを中止しません。

### 発射方向

マーカーは、発射Eventが実行された時点の画面中央のレティクル方向へ発射します。

```text
発射Event
↓
現在のレティクル方向を取得
↓
発射方向を確定
↓
Marker発射
```

Marker入力時点やMarkerFiring開始時点では、発射方向を固定しません。

発射方向が確定した後にAimStateやPlayerの向きが変化しても、すでに発射されたマーカーの進行方向には影響しません。

### 発射位置

マーカーは、Playerの武器に設定された発射位置から生成します。

```text
武器のMarker発射位置
↓
Marker生成
↓
発射
```

発射位置には、武器先端などに設定した専用のTransformを使用します。

## Aimingとの関係

MarkerFiringを開始するには`AimState = Aiming`である必要があります。

ただし、MarkerFiring開始後はAimingを維持する必要はありません。

### Aimingを維持している場合

MarkerFiring開始後もAim入力が継続している場合は、

```text
ActionState = MarkerFiring
AimState    = Aiming
```

を維持します。

MarkerFiringが正常終了しても、Aim入力が継続している場合はAimingを終了しません。

```text
MarkerFiring
+
Aiming

↓

MarkerFiring正常終了

↓

ActionState = None
AimState    = Aiming
```

### MarkerFiring中にAimを終了した場合

MarkerFiring中にAim終了条件が成立した場合、AimStateのみを`Normal`へ戻します。

```text
ActionState = MarkerFiring
AimState    = Aiming

↓

Aim終了

↓

ActionState = MarkerFiring
AimState    = Normal
```

MarkerFiring自体は継続します。

つまり、MarkerFiringは**開始時にAimingであることを要求しますが、開始後にAimingを維持することまでは要求しません。**

Aim終了によってMarkerFiringをキャンセルすることはありません。

## 移動

MarkerFiring中もMove入力による移動は可能です。

ただし、通常時より移動速度を低下させます。

```text
ActionState = MarkerFiring
+
Move入力

↓

低速移動
```

`Aiming + MarkerFiring`が同時成立している場合は、AimingとMarkerFiringの両方による低速補正が存在します。

複数の移動速度補正が同時成立した場合は補正値を乗算せず、「Player基本移動」で定義する優先ルールに従います。

移動速度の具体的な値についても「Player基本移動」を正とします。

## Dashingとの関係

`MarkerFiring → Dashing`はキャンセル遷移です。

Playerアクション遷移では`C→`として定義します。

MarkerFiringでは、**マーカーが実際に発射された直後からDashキャンセルを許可**します。

```text
MarkerFiring開始
↓
発射前・キャンセル不可Phase
↓
Marker発射
↓
Dashキャンセル受付開始
↓
Dash開始条件確認
↓
条件成立
↓
MarkerFiring終了
↓
Dashing
```

Dashキャンセル入力バッファを使用する場合も、遷移種別は`C→`のままです。

`B→`によるAction先行入力として扱いません。

### 発射前のDash入力

発射前・キャンセル不可Phaseでは、Dash入力によってMarkerFiringを即座にキャンセルできません。

ただし、Dashキャンセル受付開始直前にDash入力が行われた場合は、Dash要求を短時間だけ保持できます。

```text
MarkerFiring
↓
発射前・キャンセル不可Phase
↓
キャンセル受付直前にDash入力
↓
Dash要求を短時間保持
↓
MarkerFiring継続
↓
Marker発射
↓
Dashキャンセル可能Phase
↓
保持中のDash要求を評価
```

Dash要求を保持している間もMarkerFiringは継続し、マーカー発射Eventを予定どおり実行します。

Dash入力を理由に発射前のMarkerFiringを終了しません。

### Dashキャンセル入力バッファ

発射前に保持したDash要求が、Marker発射後のDashキャンセル受付開始時点でも有効な場合、その時点でDashingの開始条件を確認します。

```text
MarkerFiring
↓
発射前にDash入力
↓
Dash要求を短時間保持
↓
Marker発射
↓
Dashキャンセル受付開始
↓
Dash要求がまだ有効
↓
Dash開始条件確認
│
├─ 条件成立
│   ↓
│   MarkerFiring終了
│   ↓
│   Dashing
│
└─ 条件不成立
    ↓
    Dashingへ遷移しない
    ↓
    MarkerFiring継続
```

Dash要求をバッファしていたこと自体は、Dashingの開始を保証しません。

スタミナなどのDash開始条件は、キャンセルを実行する時点で確認します。

Dash開始条件を満たしていない場合、MarkerFiringだけを終了することはありません。

Dashキャンセル入力バッファの共通ルールについては「Playerアクション遷移」を正とします。

### バッファ時間を超えた場合

Dash要求は無期限に保持しません。

保持時間内にMarker発射およびDashキャンセル受付開始へ到達しなかった場合は、Dash要求を破棄します。

```text
発射前
↓
Dash入力
↓
Dash要求を保持
↓
保持時間を超過
↓
Dash要求を破棄
↓
MarkerFiring継続
```

その後Markerが発射されても、破棄済みのDash要求を使用してDashingへ遷移しません。

Dashingへ遷移するには、新しい有効なDash入力が必要です。

具体的なバッファ時間は調整パラメータとし、本ページでは固定しません。

### 発射後のDash入力

マーカー発射後・Dashキャンセル可能Phaseで直接Dash入力が行われた場合は、その時点でDash開始条件を確認します。

```text
Marker発射済み
↓
Dash入力
↓
Dash開始条件確認
│
├─ 条件成立
│   ↓
│   MarkerFiring終了
│   ↓
│   Dashing
│
└─ 条件不成立
    ↓
    MarkerFiring継続
```

この場合は発射前の入力バッファを経由せず、通常の`C→`としてDashキャンセルを評価します。

発射済みのマーカーオブジェクトは、Dashキャンセルによって削除しません。

### Dash開始時のAim

MarkerFiringとAimingが同時成立している状態からDashingを開始する場合、Dash側の共通ルールに従ってAimingを終了します。

```text
ActionState = MarkerFiring
AimState    = Aiming
↓
Dashキャンセル成立
↓
ActionState = Dashing
AimState    = Normal
```

すでにMarkerFiring中にAimを終了している場合は、`AimState = Normal`のままDashingへ遷移します。

Dashingの開始条件およびDash開始時の処理については「Playerアクション｜ダッシュ」を正とします。

## Marker再入力

MarkerFiring中のMarker再入力は受け付けません。

```text
MarkerFiring
↓
Marker入力
↓
入力を無視
↓
MarkerFiring継続
```

Marker入力をAction先行入力として保持することもありません。

MarkerFiringが正常終了して`ActionState = None`へ戻った後、再度MarkerFiring開始条件を満たしている場合に次のMarkerFiringを開始できます。

独立した発射クールタイムは設けません。

MarkerFiringのAction時間そのものを、次のMarker発射が可能になるまでの基本的な制限とします。

## Airborneとの関係

### Airborne中の開始

`MovementState = Airborne`ではMarkerFiringを開始できません。

Aiming自体をAirborne中に開始できないため、MarkerFiringの開始条件を満たしません。

```text
MovementState = Airborne
↓
Marker入力
↓
MarkerFiring開始不可
```

### MarkerFiring中にAirborneへ移行した場合

GroundedでMarkerFiringを開始した後に接地を失った場合、MarkerFiring自体は継続します。

```text
MovementState = Grounded
ActionState   = MarkerFiring
AimState      = Aiming

↓

接地喪失

↓

MovementState = Airborne
ActionState   = MarkerFiring
AimState      = Normal
```

Airborne移行によってAimingは終了しますが、MarkerFiringは終了しません。

対象となる主な状況は以下です。

* 崖から落下する
* 足場が消える
* 外力によって接地を失う

MarkerFiring中にAirborneへ移行した後の移動は「Player基本移動」の空中制御に従います。

Airborne中はDashingを開始できないため、Dashキャンセル入力バッファを保持していた場合でも、Dash開始条件を満たしていなければDashingへ遷移しません。

## ReactionStateによる強制終了

`SmallHit`または`BigHit`が成立した場合、MarkerFiringを強制終了します。

```text
MarkerFiring
↓
SmallHit / BigHit
↓
ActionState = None
```

ReactionStateによる強制終了は通常のDash要求より優先します。

### 発射前に被弾した場合

マーカー発射Eventより前に被弾した場合は、MarkerFiringを終了し、マーカーは発射しません。

```text
MarkerFiring
↓
発射前
↓
SmallHit / BigHit
↓
MarkerFiring強制終了
↓
Marker未発射
```

発射前に保持していたDashキャンセル入力バッファも使用しません。

### 発射後に被弾した場合

マーカー発射後に被弾した場合は、MarkerFiringを終了します。

ただし、すでに生成・発射されたマーカーは削除しません。

```text
MarkerFiring
↓
Marker発射済み
↓
SmallHit / BigHit
↓
MarkerFiring強制終了
↓
発射済みMarkerは継続
```

ReactionStateによるAction中断の共通ルールについては「Playerアクション遷移」を正とします。

## RootStateによる強制終了

MarkerFiring中にGameplayから別のRootStateへ遷移する場合、MarkerFiringを強制終了します。

対象となるRootStateは以下です。

* `Conversation`
* `Interacting`
* `Dead`

```text
ActionState = MarkerFiring
↓
Conversation / Interacting / Dead
↓
MarkerFiring終了
```

発射Eventより前に強制終了した場合、マーカーは生成しません。

発射Event後に強制終了した場合、すでに発射済みのマーカーは削除しません。

強制終了時には、保持しているDashキャンセル入力バッファを使用しません。

`Dead`への遷移は他のPlayer状態より優先します。

## MarkerFiringの終了

MarkerFiringの主な終了条件を以下に示します。

| 終了原因           | ActionState | 発射済みMarker |
| -------------- | ----------- | ---------- |
| 発射モーション正常終了    | `None`      | 継続         |
| Dashキャンセル      | `Dashing`   | 継続         |
| `SmallHit`     | `None`      | 発射済みなら継続   |
| `BigHit`       | `None`      | 発射済みなら継続   |
| `Conversation` | Gameplay終了  | 発射済みなら継続   |
| `Interacting`  | Gameplay終了  | 発射済みなら継続   |
| `Dead`         | Deadへ遷移     | 発射済みなら継続   |

### 正常終了

MarkerFiringが発射モーションの最後まで正常に終了した場合、`ActionState`を`None`へ戻します。

```text
MarkerFiring
↓
発射モーション終了
↓
ActionState = None
```

MarkerFiring終了時に`AimState`は変更しません。

Aim入力が継続している場合は、

```text
ActionState = None
AimState    = Aiming
```

となります。

すでにAimを終了している場合は、

```text
ActionState = None
AimState    = Normal
```

となります。

## パラメータ

MarkerFiring固有の主な調整項目を以下に示します。

| パラメータ                             | 内容                              | 値          |
| --------------------------------- | ------------------------------- | ---------- |
| `MarkerFiringDuration`            | MarkerFiring全体の継続時間             | 未定         |
| `MarkerFireTiming`                | MarkerFiring開始から実際に発射するまでのタイミング | 未定         |
| `MarkerDashCancelTiming`          | Dashキャンセル受付を開始するタイミング           | 発射直後を基準に調整 |
| `MarkerFiringMoveSpeedMultiplier` | MarkerFiring中の移動速度補正            | 未定         |

実際の発射・キャンセル受付タイミングはAnimation Eventなどで調整可能にします。

Dashキャンセル入力バッファの具体的な保持時間は、共通の調整パラメータとして「Playerアクション遷移」のルールに従います。

移動速度の最終決定については「Player基本移動」を正とします。

## 各ページとの責務分離

Markerに関係する仕様は、以下のように管理します。

| 内容                            | 管理ページ                            |
| ----------------------------- | -------------------------------- |
| `None → MarkerFiring`         | 本ページ / Playerアクション遷移             |
| MarkerFiring開始条件              | 本ページ                             |
| Marker発射モーション                 | 本ページ                             |
| Marker発射タイミング                 | 本ページ                             |
| 発射方向・発射位置                     | 本ページ                             |
| Dashキャンセル受付開始タイミング            | 本ページ                             |
| 発射前後のDash入力に対するMarker固有処理     | 本ページ                             |
| MarkerFiring中の再入力             | 本ページ                             |
| MarkerFiring中の移動速度補正          | 本ページ / Player基本移動                |
| `MarkerFiring → Dashing = C→` | Playerアクション遷移                    |
| Dashキャンセル入力バッファの共通ルール         | Playerアクション遷移                    |
| Dash遷移時の共通開始条件確認              | Playerアクション遷移 / Playerアクション｜ダッシュ |
| `Normal ↔ Aiming`             | Playerアクション｜照準                   |
| Aiming中のカメラ                   | Playerアクション｜照準                   |
| Aiming中のPlayer向き              | Playerアクション｜照準                   |
| Aim入力方式                       | Player入力と操作                      |
| ActionState間の遷移可否             | Playerアクション遷移                    |
| SmallHit / BigHitによる共通中断      | Playerアクション遷移                    |
| マーカーオブジェクトの飛行・衝突・付着           | マーカーオブジェクト側の仕様                   |

## 未決事項

* MarkerFiring全体のモーション時間
* マーカーの具体的な発射タイミング
* MarkerFiring中の移動速度補正値

<PageRelations />
