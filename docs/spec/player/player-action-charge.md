---
title: "Playerアクション｜チャージ"
description: Palette BulletにおけるPlayerのシャオンダマ選択・チャージ仕様
pageType: spec
category: "Player"
order: 50
status: 仮仕様
relatedTasks: []
---

# Playerアクション｜チャージ

## 目的

本ページでは、Playerがシャオンダマを選択し、AttackEventへチャージするPlayerアクションについて定義します。

チャージは、以下の2つの`ActionState`として管理します。

```text
ActionState
├─ ClickCharging
└─ DragCharging
```

本ページでは主に以下を扱います。

* チャージの共通使用条件
* チャージ対象
* Click / Dragの入力判定
* `ClickCharging`の開始・判定・終了
* `DragCharging`の開始・選択・判定・終了
* Dashとの遷移
* Aimingとの同時成立
* Grounded / Airborneとの関係
* SmallHit / BigHitによる中断
* RootState変更による強制終了
* チャージ成功と`miss`の扱い

ActionState間の遷移可否については「Playerアクション遷移」を正とします。

Aiming中のカメラ・Playerの向き・Aim固有の移動補正については「Playerアクション｜照準」を正とします。

シャオンダマ自体の仕様、AttackEventの仕様、パレットブレット化した後の挙動については、それぞれの仕様ページで定義します。

## チャージとは

チャージとは、AttackEventが要求する音程に対応するシャオンダマをPlayerが選択し、AttackEventへ登録するPlayerアクションです。

チャージに成功したシャオンダマはパレットブレット化され、対応するAttackEventのスロットへ登録されます。

チャージには以下の2種類があります。

| ActionState     | 用途                 |
| --------------- | ------------------ |
| `ClickCharging` | 1つのシャオンダマを選択する     |
| `DragCharging`  | 複数のシャオンダマを連続して選択する |

両者は同じ「Charge入力」から開始しますが、別のActionStateとして管理します。

## 共通使用可能条件

ClickChargingおよびDragChargingは、以下の条件を満たしている場合に開始できます。

* `RootState = Gameplay`
* `ReactionState = None`
* チャージ可能なAttackEventが存在する
* 戦闘BGMが再生されている
* 現在の`ActionState`から対象Chargeへの開始が許可されている

`Grounded`と`Airborne`のどちらでも開始できます。

```text
MovementState = Grounded
または
MovementState = Airborne
↓
Charge開始可能
```

ただし、現在のActionStateによって開始が禁止されている場合はChargeを開始しません。

例えば、以下のAction中はChargeを開始できません。

* `Dashing`
* `MarkerFiring`
* `Parrying`

ActionState間の開始可否については「Playerアクション遷移」の遷移表を正とします。

## チャージ対象

チャージ対象は以下の2種類です。

* シャオンダマ
* 万能シャオンダマ

### シャオンダマ

通常のシャオンダマは、それぞれ音程を持ちます。

AttackEventが要求している音程と一致するシャオンダマを選択した場合、チャージに成功します。

要求していないシャオンダマを選択結果として確定した場合は`miss`となります。

### 万能シャオンダマ

万能シャオンダマは、AttackEventが要求している音程に関係なくチャージできます。

チャージ成功後のスロットへの登録方法については、AttackEvent側の仕様に従います。

## 対象選択

シャオンダマの選択には、画面中央のレティクルを使用します。

基本的な対象選択は以下の条件で行います。

* レティクルが対象のシャオンダマを示している
* Playerからチャージ可能距離以内に存在する
* 対象が現在選択可能な状態である

チャージ可能な対象とチャージできない対象は、UI上で判別できるようにします。

レティクル自体の表示条件については本ページでは定義しません。

## Click / Drag入力判定

ClickChargingとDragChargingは同じCharge入力を使用します。

Charge入力を押した瞬間には、まだ`ActionState`を変更しません。

まず入力方法を判定し、その結果によってClickChargingまたはDragChargingを開始します。

```text
Charge入力押下
↓
入力判定
│
├─ Drag条件成立
│   ↓
│   DragCharging開始
│
└─ Drag条件が成立せずRelease
    ↓
    ClickCharging開始
```

この入力判定中はPlayerのStateではありません。

### Click判定

Charge入力を押してから、Drag条件を満たさないまま入力を離した場合、ClickChargingとして扱います。

```text
Charge入力押下
↓
Drag条件未成立
↓
Charge入力Release
↓
ClickCharging開始
```

### Drag判定

Charge入力を押し続けた状態で、入力が設定されたDrag開始条件を満たした場合、DragChargingを開始します。

Drag条件には、マウス移動量などを使用します。

```text
Charge入力押下
↓
入力継続
↓
Drag開始条件成立
↓
DragCharging開始
```

Drag判定に使用する具体的な閾値はパラメータとして調整します。

## ClickCharging

## ClickChargingとは

ClickChargingは、1つのシャオンダマを選択する短時間Actionです。

開始すると、

```text
ActionState
None
↓
ClickCharging
```

へ遷移します。

ClickCharging中はチャージモーションを再生し、その途中でチャージ結果を確定します。

## ClickCharging開始

Click判定が成立し、ClickChargingの開始条件を満たしている場合、`ActionState`を`ClickCharging`へ変更します。

```text
ActionState = None
↓
Click判定成立
↓
ClickCharging開始条件確認
↓
ActionState = ClickCharging
```

ClickCharging開始時に、レティクルが示しているチャージ対象を取得して保持します。

```text
ClickCharging開始
↓
現在のレティクル対象を取得
↓
対象を保持
```

保持した対象は、ClickCharging中にカメラが動いても変更しません。

## ClickCharging内部Phase

ClickChargingは、以下の内部Phaseを持ちます。

```text
ClickCharging
│
├─ 判定前・キャンセル不可Phase
│
└─ 判定後・Dashキャンセル可能Phase
```

Phaseは別のPlayer Stateではありません。

`ActionState`はClickCharging開始から終了まで`ClickCharging`のままです。

### 判定前・キャンセル不可Phase

ClickCharging開始からCharge判定EventまでのPhaseです。

このPhaseでは以下を行います。

* チャージモーションを再生する
* 保持した対象への判定はまだ確定しない
* Dashキャンセル不可
* ClickCharging再入力を受け付けない
* 他Action入力は遷移表に従って処理する

```text
ClickCharging開始
↓
判定前・キャンセル不可Phase
↓
Charge判定Event
```

### 判定後・Dashキャンセル可能Phase

Charge判定Eventによって結果が確定した後から、ClickCharging正常終了までのPhaseです。

このPhaseでは以下を行います。

* チャージ後モーションを継続する
* Dashキャンセルを受け付ける
* ClickCharging再入力を受け付けない
* 確定済みのチャージ結果は維持する

```text
Charge判定Event
↓
チャージ結果確定
↓
Dashキャンセル受付開始
↓
モーション終了
↓
ClickCharging終了
```

## ClickChargingの判定

Charge判定Eventが発生した時点で、ClickCharging開始時に保持した対象を判定します。

```text
ClickCharging開始時に対象保持
↓
Charge判定Event
↓
対象を判定
↓
成功 / miss
```

### 成功

保持していた対象が現在のAttackEventに対して有効な場合、チャージに成功します。

成功時は以下の処理を行います。

* 対応するAttackEventのスロットへ登録する
* 対象のシャオンダマをパレットブレット化する
* 成功に応じたコンボ処理を行う

### miss

保持していた対象がAttackEventの要求に一致しない場合は`miss`となります。

`miss`時は以下の処理を行います。

* 対象をチャージしない
* 継続中のコンボを中断する

## ClickCharging中の移動

ClickCharging中は通常移動を制限しません。

Move入力が可能な状態であれば、通常時と同じ基本移動速度で移動できます。

```text
ActionState = ClickCharging
+
Move入力
↓
通常速度で移動
```

Aimingも同時成立している場合は、Aiming側の移動速度補正が適用されます。

移動速度の最終決定については「Player基本移動」を正とします。

## ClickChargingとDashing

`ClickCharging → Dashing`はキャンセル遷移です。

「Playerアクション遷移」では`C→`として定義します。

ClickChargingでは、**Charge判定Eventによって結果が確定した後からDashキャンセルを許可**します。

```text
ClickCharging
↓
判定前
↓
Dash不可
↓
Charge判定Event
↓
Dashキャンセル受付開始
```

### 判定前のDash入力

判定前・キャンセル不可PhaseでDash入力が行われた場合は、入力を無視します。

先行入力として保持しません。

```text
ClickCharging
↓
判定前
↓
Dash入力
↓
入力を無視
↓
ClickCharging継続
```

### 判定後のDash入力

判定後にDash入力が行われ、Dashingの開始条件を満たしている場合はClickChargingを終了してDashingへ遷移します。

```text
ClickCharging
↓
Charge判定済み
↓
Dash入力
↓
Dash開始条件成立
↓
ClickCharging終了
↓
Dashing
```

確定済みのチャージ結果はDashキャンセルによって取り消しません。

Dashを開始できない場合はClickChargingを継続します。

## ClickCharging再入力

ClickCharging中に再度ClickCharging入力が成立しても、その入力は無視します。

先行入力として保持しません。

```text
ClickCharging
↓
ClickCharging再入力
↓
無視
```

## ClickChargingと被弾

`SmallHit`または`BigHit`が成立した場合、ClickChargingを強制終了します。

### 判定前に被弾した場合

```text
ClickCharging
↓
Charge判定前
↓
SmallHit / BigHit
↓
ClickCharging終了
↓
チャージ未成立
```

この中断自体は`miss`として扱いません。

### 判定後に被弾した場合

```text
ClickCharging
↓
Charge判定済み
↓
SmallHit / BigHit
↓
ClickCharging終了
```

すでに確定したチャージ結果は取り消しません。

## ClickChargingの終了

ClickChargingの主な終了条件を以下に示します。

| 終了原因        | 結果                      |
| ----------- | ----------------------- |
| モーション正常終了   | `ActionState = None`    |
| Dashキャンセル   | `ActionState = Dashing` |
| `SmallHit`  | `ActionState = None`    |
| `BigHit`    | `ActionState = None`    |
| RootState変更 | Gameplay内部Actionを終了     |

正常終了した場合は、

```text
ClickCharging
↓
モーション終了
↓
ActionState = None
```

となります。

## DragCharging

## DragChargingとは

DragChargingは、複数のシャオンダマを連続して選択する継続Actionです。

Drag開始条件が成立すると、

```text
ActionState
None
↓
DragCharging
```

へ遷移します。

DragCharging中はCharge入力を押し続けながらカメラを動かし、レティクルが通過したシャオンダマを選択します。

## DragCharging開始

Drag入力判定が成立し、DragChargingの開始条件を満たしている場合、`ActionState`を`DragCharging`へ変更します。

```text
ActionState = None
↓
Drag条件成立
↓
DragCharging開始条件確認
↓
ActionState = DragCharging
```

DragCharging開始時に、そのDrag操作用の選択リストを初期化します。

## DragCharging中の選択

DragCharging中は、レティクルがチャージ可能な対象を通過した場合、そのシャオンダマを選択リストへ追加します。

```text
DragCharging
↓
レティクルがシャオンダマを通過
↓
選択可能か確認
↓
選択リストへ追加
```

### 同じシャオンダマを再び通過した場合

同じDragCharging中に、一度選択したシャオンダマを再びレティクルが通過しても追加しません。

```text
シャオンダマA
↓
初回通過
↓
選択リストへ追加
↓
再度Aを通過
↓
追加しない
```

1回のDragChargingにつき、同一シャオンダマは1回だけ選択できます。

## DragChargingのRelease

DragCharging中にCharge入力を離すと、その時点までに選択した内容を確定します。

```text
DragCharging
↓
Charge入力Release
↓
選択内容確定
↓
まとめて判定
↓
成功 / miss
↓
ActionState = None
```

Charge入力Releaseによる判定は、DragChargingの正常終了として扱います。

## DragChargingの判定

Release時に、選択リスト内のシャオンダマを現在のAttackEventに対して判定します。

### 成功

選択内容が有効な場合、選択されたシャオンダマをチャージします。

成功した対象について以下の処理を行います。

* 対応するAttackEventのスロットへ登録する
* シャオンダマをパレットブレット化する
* 成功に応じたコンボ処理を行う

### miss

選択した内容にAttackEventが要求していないシャオンダマが含まれているなど、選択結果が不正解だった場合は`miss`となります。

`miss`時はコンボを中断します。

DragChargingにおける`miss`は、**PlayerがReleaseして選択内容を確定した結果が不正解だった場合**に発生します。

## DragCharging中の移動

DragCharging中もMove入力による移動は可能です。

ただし、通常時より移動速度を低下させます。

```text
ActionState = DragCharging
+
Move入力
↓
低速移動
```

Aimingも同時成立している場合は、AimingとDragChargingの両方による移動速度補正が存在します。

複数の補正が同時成立した場合は乗算せず、「Player基本移動」のルールに従って最も強い制限を使用します。

## DragChargingとDashing

`DragCharging → Dashing`は即時遷移です。

「Playerアクション遷移」では`→`として定義します。

DragCharging中は、どのタイミングでもDash入力による遷移を試みることができます。

```text
DragCharging
↓
Dash入力
↓
Dash開始条件確認
↓
DragCharging終了
↓
Dashing
```

### Dash開始条件を満たさない場合

スタミナ不足などによってDashingを開始できない場合は、DragChargingを終了しません。

```text
DragCharging
↓
Dash入力
↓
Dash開始条件不成立
↓
DragCharging継続
```

### Dashキャンセル時の選択内容

Dashingへの遷移が成立した場合、DragCharging中に保持していた選択内容はすべて破棄します。

```text
DragCharging
↓
シャオンダマ選択途中
↓
Dash
↓
選択内容を破棄
↓
Dashing
```

この終了は`miss`として扱いません。

コンボも中断しません。

## DragChargingとSmallHit

`SmallHit`が成立してもDragChargingは継続します。

```text
ActionState   = DragCharging
ReactionState = None
↓
SmallHit
↓
ActionState   = DragCharging
ReactionState = SmallHit
```

SmallHit中も、すでに選択したシャオンダマの選択内容は維持します。

ただし、SmallHit中のPlayer通常移動は停止します。

移動制限については「Player基本移動」を正とします。

### Aiming中にSmallHitを受けた場合

Aiming + DragCharging中にSmallHitが成立した場合は、Aimのみ解除します。

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

DragCharging自体と、それまでの選択内容は継続します。

## DragChargingとBigHit

`BigHit`が成立した場合、DragChargingを強制終了します。

```text
DragCharging
↓
BigHit
↓
選択内容を破棄
↓
ActionState = None
```

BigHitによる中断自体は`miss`として扱いません。

コンボも中断しません。

## DragChargingの終了

DragChargingの主な終了条件を以下に示します。

| 終了原因         | 選択内容  | miss | 結果                   |
| ------------ | ----- | ---- | -------------------- |
| Releaseして正解  | 判定・確定 | なし   | `ActionState = None` |
| Releaseして不正解 | 判定    | 発生   | `ActionState = None` |
| Dash         | 破棄    | なし   | `Dashing`            |
| `SmallHit`   | 維持    | なし   | DragCharging継続       |
| `BigHit`     | 破棄    | なし   | `ActionState = None` |
| RootState変更  | 破棄    | なし   | Gameplay内部Action終了   |

## Aimingとの関係

`ClickCharging`と`DragCharging`は、どちらもAimingと同時成立できます。

```text
Aiming + ClickCharging
```

```text
Aiming + DragCharging
```

Aiming中にChargeを開始した場合もAimを終了しません。

また、Charge中にAimingを開始することもできます。

### Aimを終了した場合

Charge中にAim終了条件が成立しても、Charge自体は原則として終了しません。

```text
AimState    = Aiming
ActionState = ClickCharging
↓
Aim終了
↓
AimState    = Normal
ActionState = ClickCharging
```

```text
AimState    = Aiming
ActionState = DragCharging
↓
Aim終了
↓
AimState    = Normal
ActionState = DragCharging
```

Aiming中のカメラ・Player向き・移動補正については「Playerアクション｜照準」を正とします。

## Airborneとの関係

ClickChargingとDragChargingは、どちらもGrounded / Airborneの両方で開始できます。

| ActionState     | Grounded | Airborne |
| --------------- | -------- | -------- |
| `ClickCharging` | ○        | ○        |
| `DragCharging`  | ○        | ○        |

Charge実行中に`Grounded → Airborne`へ移行しても、Chargeを終了しません。

```text
Grounded + ClickCharging
↓
接地喪失
↓
Airborne + ClickCharging
```

```text
Grounded + DragCharging
↓
接地喪失
↓
Airborne + DragCharging
```

同様に、Airborne中に着地して`Grounded`へ戻ってもChargeは継続します。

Airborne中のMove入力は「Player基本移動」の空中制御に従います。

DragCharging中は空中制御にもDragChargingの低速補正を適用します。

ClickCharging中は通常の空中制御を使用します。

## Parryingとの関係

ClickChargingおよびDragChargingからParryingへ遷移することはできません。

```text
ClickCharging → Parrying = ×
DragCharging  → Parrying = ×
```

Charge中にParry入力が行われた場合は入力を無視し、現在のChargeを継続します。

「チャージ中にパリィへ移行できるか」は未決事項ではなく、**開始不可として確定**します。

## MarkerFiringとの関係

ClickChargingおよびDragChargingからMarkerFiringへ直接遷移することはできません。

Charge実行中にMarker入力が行われても、ActionState遷移表に従って入力を無視します。

AimingとChargeが同時成立している場合でも、Charge中にMarkerFiringを開始することはできません。

```text
AimState    = Aiming
ActionState = ClickCharging
↓
Marker入力
↓
ClickCharging継続
```

```text
AimState    = Aiming
ActionState = DragCharging
↓
Marker入力
↓
DragCharging継続
```

## RootStateによる強制終了

ClickChargingまたはDragCharging中にGameplayから別のRootStateへ遷移する場合、Chargeを強制終了します。

対象となる主なRootStateは以下です。

* `Conversation`
* `Interacting`
* `Dead`

### ClickCharging

判定Event前に強制終了した場合、チャージ結果は発生しません。

判定Event後に強制終了した場合、すでに確定したチャージ結果は取り消しません。

強制終了自体は`miss`として扱いません。

### DragCharging

DragCharging中にRootStateが変更された場合、選択途中の内容を破棄して終了します。

```text
DragCharging
↓
Conversation / Interacting / Dead
↓
選択内容を破棄
↓
DragCharging終了
```

この終了も`miss`として扱いません。

`Dead`への遷移は他のPlayer状態より優先します。

## チャージ成功とmiss

チャージ結果の基本ルールを以下に示します。

### 成功

AttackEventの要求に対して有効なシャオンダマを選択結果として確定した場合、チャージ成功とします。

成功したシャオンダマについて以下を行います。

* AttackEventの対象スロットへ登録
* パレットブレット化
* コンボ加算などの成功処理

AttackEventのすべてのスロットを埋める必要はありません。

一部のスロットのみ埋まっている場合でも、そのAttackEventの仕様に従って攻撃処理を行います。

### miss

`miss`は、Playerが選択結果を確定し、その内容がAttackEventの要求に対して不正解だった場合に発生します。

主な例は以下です。

* ClickChargingで間違ったシャオンダマを選択した
* DragChargingのRelease時に不正なシャオンダマが含まれていた

`miss`が発生した場合はコンボを中断します。

### missにしない終了

以下の終了自体は`miss`として扱いません。

* Dashキャンセル
* `SmallHit`
* `BigHit`
* `Conversation`
* `Interacting`
* `Dead`
* その他、Playerが選択結果を確定する前の強制終了

強制終了時は、未確定の選択内容を破棄します。

## パラメータ

Charge固有の主な調整項目を以下に示します。

| パラメータ                             | 内容                               | 値         |
| --------------------------------- | -------------------------------- | --------- |
| `ChargeMaxDistance`               | シャオンダマを選択可能な最大距離                 | 未定        |
| `DragStartThreshold`              | Click / Dragを判定するためのDrag開始閾値     | 未定        |
| `ClickChargingDuration`           | ClickCharging全体の継続時間             | 未定        |
| `ClickChargeJudgeTiming`          | ClickChargingの判定タイミング            | 未定        |
| `ClickDashCancelTiming`           | ClickChargingのDashキャンセル受付開始タイミング | 判定後を基準に調整 |
| `DragChargingMoveSpeedMultiplier` | DragCharging中の移動速度補正             | 未定        |

ClickCharging中の移動速度は通常速度とします。

Aimingなど他Stateによる移動補正との組み合わせについては「Player基本移動」を正とします。

## 各ページとの責務分離

Chargeに関係する仕様は、以下のように管理します。

| 内容                             | 管理ページ              |
| ------------------------------ | ------------------ |
| `ClickCharging`の開始・判定・終了       | 本ページ               |
| `DragCharging`の開始・選択・終了        | 本ページ               |
| Click / Drag入力の意味              | 本ページ / Player入力と操作 |
| Click / Drag判定閾値               | 本ページ               |
| チャージ対象の判定                      | 本ページ               |
| Chargeによる`miss`                | 本ページ               |
| ClickChargingのDashキャンセル受付タイミング | 本ページ               |
| DragChargingのDash中断結果          | 本ページ               |
| ActionState間の遷移可否              | Playerアクション遷移      |
| Aiming中のカメラ・Player向き           | Playerアクション｜照準     |
| 移動速度の最終決定                      | Player基本移動         |
| AttackEventのスロット処理             | AttackEvent側の仕様    |
| シャオンダマ自体の仕様                    | シャオンダマ側の仕様         |
| パレットブレット化後の挙動                  | パレットブレット側の仕様       |

## 未決事項

* DragChargingを正式採用するか
* Click / Dragを判定する`DragStartThreshold`の具体値
* ClickChargingのモーション時間
* ClickChargingの判定タイミング
* DragCharging中に複数の音程を選択する場合、選択順もAttackEventの要求順と一致させる必要があるか
* DragChargingを採用しない場合、複数シャオンダマをまとめて選択する操作をどのように置き換えるか

<PageRelations />
