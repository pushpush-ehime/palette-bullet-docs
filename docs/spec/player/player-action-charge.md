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
* 入力判定中にStateが変化した場合の処理
* Dashing中のCharge先行入力
* `ClickCharging`の開始・対象保持・判定・終了
* `DragCharging`の開始・選択・判定・終了
* Charge中のJump
* Dashによる終了・キャンセル
* SmallHit / BigHitによる中断
* RootState変更による強制終了
* チャージ成功と`miss`の扱い

ActionState間の遷移可否、キャンセル、Action先行入力、Dashキャンセル入力バッファの共通ルールについては「Playerアクション遷移」を正とします。

本ページでは、Charge固有の入力判定、対象の保持、判定タイミング、中断時の処理を定義します。

Aiming中のカメラ・Playerの向き・Aim固有の移動補正については「Playerアクション｜照準」を正とします。

シャオンダマ自体の仕様、AttackEventのスロット仕様、パレットブレット化した後の挙動については、それぞれの仕様ページを正とします。

## チャージとは

チャージとは、Playerがシャオンダマを選択し、AttackEventが要求しているSlotへ登録するPlayerアクションです。

チャージに成功したシャオンダマはパレットブレット化され、対応するAttackEventのSlotへ登録されます。

チャージには以下の2種類があります。

| ActionState     | 用途                 |
| --------------- | ------------------ |
| `ClickCharging` | 1つのシャオンダマを選択する     |
| `DragCharging`  | 複数のシャオンダマを連続して選択する |

両者は同じCharge入力から判定しますが、別のActionStateとして管理します。

## 共通使用可能条件

ClickChargingおよびDragChargingを開始する場合は、以下の条件を満たしている必要があります。

* `RootState = Gameplay`
* `ReactionState = None`
* チャージ可能なAttackEventが存在する
* 戦闘BGMが再生されている
* 現在の`ActionState`から対象Chargeへの遷移が許可されている

ClickChargingとDragChargingは、`Grounded`と`Airborne`のどちらでも開始できます。

```text
MovementState = Grounded
または
MovementState = Airborne
↓
Charge開始可能
```

通常は、

```text
ActionState = None
↓
ClickCharging / DragCharging
```

として開始します。

`Dashing`中はその場でChargeを開始しません。

Dashing中にCharge入力を行った場合は、Click / Dragを判定した後、対応するActionをAction先行入力として保持できます。

```text
ActionState = Dashing
↓
Charge入力
↓
Click / Drag判定
↓
ClickCharging または DragChargingを先行入力
```

`Dashing → ClickCharging`および`Dashing → DragCharging`の遷移種別については「Playerアクション遷移」を正とします。

`MarkerFiring`、`ClickCharging`、`DragCharging`、`Parrying`中は、新しいCharge入力を受け付けません。

## チャージ対象

チャージ対象は以下の2種類です。

* シャオンダマ
* 万能シャオンダマ

### シャオンダマ

通常のシャオンダマは、それぞれ音程を持ちます。

チャージ判定時に、そのシャオンダマを要求している有効なSlotが存在する場合はチャージに成功します。

要求しているSlotが存在しない場合は`miss`となります。

### 万能シャオンダマ

万能シャオンダマは、通常のシャオンダマとは異なり、音程による制限を受けずチャージできます。

万能シャオンダマの具体的なSlot割り当てルールについては、AttackEvent側の仕様を正とします。

## 対象選択

シャオンダマの選択には、画面中央のレティクルを使用します。

基本的な対象選択は以下の条件で行います。

* レティクルが対象のシャオンダマを示している
* Playerからチャージ可能距離以内に存在する
* 対象が現在選択可能な状態である

チャージ可能な対象とチャージできない対象は、UI上で判別できるようにします。

レティクル自体の表示条件については本ページでは定義しません。

ClickChargingとDragChargingでは、レティクルを利用するタイミングが異なります。

```text
ClickCharging
→ 開始時のレティクル対象を1つ保持する

DragCharging
→ Action中にレティクルが通過した対象を順次選択する
```

## Click / Drag入力判定

ClickChargingとDragChargingは同じCharge入力を使用します。

Charge入力を押した瞬間には、まだ`ActionState`を変更しません。

まず入力方法を判定し、その結果によってClickChargingまたはDragChargingの開始を要求します。

```text
Charge入力Press
↓
Click / Drag入力判定
│
├─ Drag条件成立
│   ↓
│   DragCharging要求
│
└─ Drag条件が成立せずRelease
    ↓
    ClickCharging要求
```

このClick / Drag入力判定中はPlayerのStateではありません。

また、この時点では`Pending Action`にも登録しません。

ClickChargingまたはDragChargingのどちらであるかが確定した時点で、初めて対象Actionの開始要求として扱います。

### 入力判定を開始できるState

Charge入力PressによってClick / Drag入力判定を開始できるのは、以下の場合です。

```text
RootState = Gameplay
ReactionState = None
+
ActionState = None
または
ActionState = Dashing
```

`ActionState = None`では、判定結果に応じてChargeを通常開始します。

`ActionState = Dashing`では、その場でChargeを開始せず、判定結果をAction先行入力として使用します。

それ以外のActionStateでは、Charge入力Press自体を無視します。

| ActionState     | Charge入力判定 |
| --------------- | ---------- |
| `None`          | ○          |
| `Dashing`       | ○：先行入力用    |
| `MarkerFiring`  | ×          |
| `ClickCharging` | ×          |
| `DragCharging`  | ×          |
| `Parrying`      | ×          |

入力判定を開始しなかったCharge入力は、後からStateが変化しても復活させません。

```text
Parrying
↓
Charge Press
↓
入力を無視
↓
Parrying終了
↓
Charge Release
↓
何も開始しない
```

新しくChargeを開始するには、改めてCharge入力をPressする必要があります。

### Click判定

Charge入力を押してから、Drag条件を満たさないまま入力を離した場合、ClickChargingとして扱います。

```text
Charge入力Press
↓
Drag条件未成立
↓
Charge入力Release
↓
ClickCharging要求
```

Charge入力Releaseの時点では、AttackEventやSlotを確定しません。

### Drag判定

Charge入力を押し続けた状態で、入力が設定されたDrag開始条件を満たした場合、DragChargingとして扱います。

Drag条件には、マウス移動量などを使用します。

```text
Charge入力Press
↓
入力継続
↓
Drag開始条件成立
↓
DragCharging要求
```

Drag判定に使用する具体的な閾値はパラメータとして調整します。

## 入力判定中にStateが変化した場合

Click / Drag入力判定を開始した後、判定結果が確定する前にPlayerのStateが変化する場合があります。

入力判定は、現在のStateでもCharge入力を有効に扱える場合のみ継続します。

### ActionStateがNoneからDashingへ変化した場合

入力判定中にDashingが開始された場合は、入力判定を破棄しません。

```text
ActionState = None
↓
Charge Press
↓
Click / Drag入力判定中
↓
Dash開始
↓
ActionState = Dashing
↓
入力判定継続
```

その後ClickまたはDragが確定した場合は、DashingからのAction先行入力として扱います。

### Dashingが正常終了した場合

Dashing中にCharge入力判定を開始し、Click / Dragがまだ確定していない状態でDashingが正常終了した場合、入力判定は継続します。

```text
Dashing
↓
Charge Press
↓
Click / Drag入力判定中
↓
Dashing正常終了
↓
ActionState = None
↓
入力判定継続
```

その後、

* Releaseした場合はClickCharging
* Drag条件が成立した場合はDragCharging

として、現在の`ActionState = None`から開始を試みます。

開始時にはChargeの共通使用可能条件を改めて確認します。

### Charge開始不可のActionStateへ変化した場合

入力判定中にCharge開始不可のActionStateへ遷移した場合は、入力判定を破棄します。

対象は主に以下です。

* `MarkerFiring`
* `ClickCharging`
* `DragCharging`
* `Parrying`

破棄した入力を後から復活させません。

### ReactionStateが開始した場合

Click / Drag入力判定中に`SmallHit`または`BigHit`が成立した場合、入力判定を破棄します。

```text
Charge Press
↓
入力判定中
↓
SmallHit / BigHit
↓
入力判定破棄
```

Reaction終了後に同じ入力のReleaseやDrag条件成立を検出しても、Chargeを開始しません。

新しいCharge入力Pressが必要です。

### RootStateが変更された場合

入力判定中に`Gameplay`から別のRootStateへ遷移した場合、入力判定を破棄します。

対象となる主なRootStateは以下です。

* `Conversation`
* `Interacting`
* `Dead`

Gameplayへ戻った後も入力判定を再開しません。

### MovementState・AimStateのみが変化した場合

`Grounded / Airborne`はどちらもChargeを使用できるため、MovementStateの変化だけを理由に入力判定を破棄しません。

ChargeはAimingとも同時成立できるため、AimStateの変化だけを理由に入力判定を破棄しません。

ただし、Dashing中のJumpや接地喪失など、Dashingを特殊終了させる処理が発生した場合は、Dashing側のAction先行入力破棄ルールを優先します。

## Dashing中のCharge先行入力

Dashing中は、ClickChargingまたはDragChargingをAction先行入力として保持できます。

遷移種別、保持数、上書き、評価順、破棄条件などの共通ルールについては「Playerアクション遷移」を正とします。

本ページでは、共通Charge入力からどちらのActionを先行入力するかを決定する処理のみ定義します。

### ClickChargingの先行入力

Dashing中にCharge入力をPressし、Drag条件が成立しないままReleaseした場合、ClickChargingの先行入力として登録します。

```text
Dashing
↓
Charge Press
↓
Drag条件未成立
↓
Charge Release
↓
Pending Action = ClickCharging
```

Dashingが正常終了した時点でClickChargingの開始条件を再確認し、条件を満たしている場合に開始します。

### DragChargingの先行入力

Dashing中にCharge入力をPressし、Drag条件が成立した場合、DragChargingの先行入力として登録します。

```text
Dashing
↓
Charge Press
↓
Drag条件成立
↓
Pending Action = DragCharging
```

Dashingが正常終了した時点でDragChargingの開始条件を再確認します。

### DragCharging先行入力中にCharge入力を離した場合

DragChargingはCharge入力をHoldして継続するActionです。

そのため、DragChargingを先行入力として保持した後、Dashing終了前にCharge入力をReleaseした場合は、保持しているDragCharging開始要求を破棄します。

```text
Dashing
↓
Drag条件成立
↓
Pending Action = DragCharging
↓
Dashing終了前にCharge Release
↓
Pending Actionを破棄
```

この処理は`miss`として扱いません。

Dashing終了後に自動的にDragChargingを開始することもありません。

### 先行入力として登録するタイミング

Charge入力Pressの時点では、まだClickChargingとDragChargingのどちらであるか決まっていません。

そのため、Action先行入力へ登録するのはClick / Drag判定が確定した時点とします。

```text
Charge Press
↓
入力判定中
↓
Click / Drag確定
↓
Pending Actionへ登録
```

### Dashingが強制・特殊終了した場合

Dashingが正常終了以外の形で終了した場合は、Chargeに関する情報を破棄します。

対象には以下の両方を含みます。

* まだClick / Dragが確定していない入力判定
* すでに確定しているClickCharging / DragChargingのAction先行入力

その後、自動的にChargeを開始しません。

具体的なDashingの正常終了・特殊終了・強制終了については「Playerアクション｜ダッシュ」を正とします。

## ClickCharging

### ClickChargingとは

ClickChargingは、1つのシャオンダマを選択する短時間Actionです。

```text
ActionState = None
↓
Click判定成立
↓
ActionState = ClickCharging
```

ClickCharging中はチャージモーションを再生し、その途中に存在するCharge判定Eventでチャージ結果を確定します。

### ClickCharging開始

Click判定が成立し、ClickChargingの開始条件を満たしている場合、`ActionState`を`ClickCharging`へ変更します。

```text
Charge Release
↓
Click判定成立
↓
ClickCharging開始条件確認
↓
ActionState = ClickCharging
```

Dashing中にClickChargingが先行入力されている場合は、Dashing正常終了後に開始条件を確認して開始します。

### 開始時に保持する対象

ClickCharging開始時に、その時点でレティクルが示しているシャオンダマを取得して保持します。

```text
ClickCharging開始
↓
その時点のレティクル対象を取得
↓
シャオンダマを保持
```

保持したシャオンダマは、ClickCharging終了まで変更しません。

ClickCharging中にレティクルが別の対象へ移動しても、判定対象は開始時に保持したシャオンダマのままです。

ただし、ClickCharging開始時にはAttackEventおよびSlotを固定しません。

```text
ClickCharging開始
↓
シャオンダマのみ保持
↓
AttackEventは未確定
Slotも未確定
```

Charge入力Release時にもAttackEventは固定しません。

AttackEventとSlotの判定は、後述するCharge判定Event発生時に行います。

### ClickCharging内部Phase

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

#### 判定前・キャンセル不可Phase

ClickCharging開始からCharge判定EventまでのPhaseです。

このPhaseでは以下を行います。

* チャージモーションを再生する
* 開始時に保持したシャオンダマのチャージ結果はまだ確定しない
* AttackEventとSlotはまだ確定しない
* Dashキャンセルはまだ成立しない
* ClickCharging再入力を受け付けない

ただし、キャンセル受付開始直前のDash入力については、Dashキャンセル入力バッファの対象にできます。

```text
ClickCharging
↓
判定前
↓
キャンセル受付直前にDash入力
↓
Dash要求を短時間保持
↓
Charge判定Event
↓
Dashキャンセル可能
```

Dashキャンセル入力バッファの共通ルールと具体的な保持時間については「Playerアクション遷移」を正とします。

#### 判定後・Dashキャンセル可能Phase

Charge判定Eventによってチャージ結果が確定した後から、ClickCharging正常終了までのPhaseです。

このPhaseでは以下を行います。

* チャージ後モーションを継続する
* Dashキャンセルを受け付ける
* ClickCharging再入力を受け付けない
* 確定済みのチャージ結果を維持する

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

Charge判定Eventが発生した時点で、ClickCharging開始時に保持したシャオンダマを判定します。

重要なのは、AttackEventをClick判定時やClickCharging開始時には固定せず、Charge判定Event発生時に決定することです。

基本的な処理は以下です。

```text
Charge Release
↓
Click判定成立
↓
ClickCharging開始
↓
その時点のレティクル対象を保持
↓
Charge判定Event
↓
その時点でチャージ可能なAttackEventを確認
↓
保持しているシャオンダマを要求するSlotを検索
│
├─ 存在する
│   ↓
│   対象Slotへ自動割り当て
│   ↓
│   success
│
└─ 存在しない
    ↓
    miss
```

つまり、ClickChargingで固定するタイミングは以下のように分かれます。

| 内容           | 確定タイミング          |
| ------------ | ---------------- |
| Click / Drag | Charge入力Release時 |
| 対象シャオンダマ     | ClickCharging開始時 |
| AttackEvent  | Charge判定Event時   |
| Slot         | Charge判定Event時   |

ClickCharging開始後からCharge判定Eventまでの間にチャージ可能なAttackEventが変化した場合は、Charge判定Event発生時点の状態を使用します。

### success

Charge判定Event時点で、保持しているシャオンダマを要求している有効なSlotが存在する場合はチャージ成功とします。

成功時は以下の処理を行います。

* 対象Slotへシャオンダマを自動割り当てする
* シャオンダマをパレットブレット化する
* 成功に応じたコンボ処理を行う

複数のAttackEventまたはSlotが候補になる場合の割り当て優先ルールについては、AttackEvent側の仕様を正とします。

### miss

Charge判定Event時点で、保持しているシャオンダマを要求する有効なSlotが存在しない場合は`miss`となります。

`miss`時は以下の処理を行います。

* シャオンダマをチャージしない
* Slotへ登録しない
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

## ClickCharging中のJump

ClickCharging中はJumpできます。

Jumpによって変更するのは`MovementState`のみです。

```text
MovementState = Grounded
ActionState   = ClickCharging
↓
Jump
↓
MovementState = Airborne
ActionState   = ClickCharging
```

JumpによってClickChargingを終了しません。

以下もそのまま継続します。

* ClickChargingのモーション
* Charge判定Eventまでの進行
* 開始時に保持したシャオンダマ
* Charge判定Event後に確定したチャージ結果

Jump処理自体については「Player移動｜ジャンプ」を正とします。

## ClickChargingとDashing

`ClickCharging → Dashing`はキャンセル遷移です。

遷移種別は「Playerアクション遷移」で`C→`として定義します。

ClickChargingでは、Charge判定Event以降からDashキャンセルを成立させることができます。

```text
ClickCharging
↓
判定前
↓
Dashキャンセル不可
↓
Charge判定Event
↓
Dashキャンセル受付開始
```

### キャンセル可能区間でDash入力した場合

Charge判定Event後にDash入力が行われ、Dashingの開始条件を満たしている場合は、ClickChargingを終了してDashingへ遷移します。

```text
ClickCharging
↓
Charge判定済み
↓
Dash入力
↓
Dash開始条件確認
↓
条件成立
↓
ClickCharging終了
↓
Dashing
```

確定済みのチャージ結果はDashキャンセルによって取り消しません。

Dashを開始できない場合はClickChargingを継続します。

### キャンセル受付直前にDash入力した場合

判定前・キャンセル不可Phaseであっても、キャンセル受付開始直前のDash入力は短時間だけ保持できます。

```text
ClickCharging
↓
Charge判定Event直前
↓
Dash入力
↓
Dash要求を短時間保持
↓
Charge判定Event
↓
Dashキャンセル受付開始
↓
Dash開始条件確認
│
├─ 条件成立
│   ↓
│   ClickCharging終了
│   ↓
│   Dashing
│
└─ 条件不成立
    ↓
    ClickCharging継続
```

この仕組みはDashキャンセル入力バッファです。

`B→`で使用するAction先行入力とは別の仕組みであり、

```text
ClickCharging → Dashing = C→
```

という遷移種別自体は変更しません。

### バッファ対象より早いDash入力

キャンセル受付開始まで十分な時間が残っており、Dashキャンセル入力バッファの有効期間にも入っていない状態でDash入力が行われた場合は、その入力を保持しません。

```text
ClickCharging
↓
キャンセル受付までまだ時間がある
↓
Dash入力
↓
保持しない
↓
ClickCharging継続
```

どの程度直前の入力を保持するかについては調整パラメータとし、本ページでは固定しません。

## ClickCharging再入力

ClickCharging中に再度Charge入力をPressしても、その入力は無視します。

Click / Drag入力判定も開始しません。

Action先行入力として保持することもありません。

```text
ClickCharging
↓
Charge Press
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
ClickCharging強制終了
↓
ActionState = None
↓
ReactionState = SmallHit / BigHit
```

開始時に保持していたシャオンダマ情報を破棄します。

チャージ結果は発生しません。

この中断自体は`miss`として扱いません。

### 判定後に被弾した場合

```text
ClickCharging
↓
Charge判定済み
↓
SmallHit / BigHit
↓
ClickCharging強制終了
↓
ActionState = None
↓
ReactionState = SmallHit / BigHit
```

すでに確定したチャージ結果は取り消しません。

被弾による中断自体は`miss`として扱いません。

## ClickChargingの終了

ClickChargingの主な終了条件を以下に示します。

| 終了原因        | 未確定の対象 | 確定済み結果 | miss | 結果                   |
| ----------- | ------ | ------ | ---- | -------------------- |
| モーション正常終了   | ―      | 維持     | なし   | `ActionState = None` |
| Dashキャンセル   | 破棄     | 維持     | なし   | `Dashing`            |
| `SmallHit`  | 破棄     | 維持     | なし   | `ActionState = None` |
| `BigHit`    | 破棄     | 維持     | なし   | `ActionState = None` |
| RootState変更 | 破棄     | 維持     | なし   | Gameplay内部Action終了   |

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

### DragChargingとは

DragChargingは、複数のシャオンダマを連続して選択する継続Actionです。

Drag開始条件が成立すると、

```text
ActionState = None
↓
Drag条件成立
↓
ActionState = DragCharging
```

へ遷移します。

DragCharging中はCharge入力を押し続けながらレティクルを移動させ、レティクルが通過したシャオンダマを選択します。

### DragCharging開始

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

Dashing中にDragChargingが先行入力された場合は、Dashing正常終了時に以下を確認します。

* DragChargingの開始条件を満たしている
* Charge入力が現在もHoldされている

両方を満たしている場合のみDragChargingを開始します。

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
success / miss
↓
ActionState = None
```

Charge入力Releaseによる判定は、DragChargingの正常終了として扱います。

## DragChargingの判定

Release時に、選択リスト内のシャオンダマをAttackEventに対して判定します。

### success

選択内容が有効な場合、選択されたシャオンダマをチャージします。

成功した対象について以下の処理を行います。

* 対応するAttackEventのSlotへ登録する
* シャオンダマをパレットブレット化する
* 成功に応じたコンボ処理を行う

AttackEvent側の具体的なSlot割り当て処理については、AttackEvent側の仕様を正とします。

### miss

選択結果がAttackEventの要求に対して不正解だった場合は`miss`となります。

`miss`時はコンボを中断します。

DragChargingにおける`miss`は、PlayerがReleaseして選択内容を確定した結果が不正解だった場合に発生します。

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

複数の補正が同時成立した場合の最終速度については「Player基本移動」を正とします。

## DragCharging中のJump

DragCharging中はJumpできます。

Jumpによって変更するのは`MovementState`のみです。

```text
MovementState = Grounded
ActionState   = DragCharging
↓
Jump
↓
MovementState = Airborne
ActionState   = DragCharging
```

JumpによってDragChargingを終了しません。

それまでに選択したシャオンダマも維持します。

```text
Grounded + DragCharging
↓
シャオンダマA・Bを選択済み
↓
Jump
↓
Airborne + DragCharging
↓
シャオンダマA・Bの選択を維持
```

Airborne移行後もCharge入力がHoldされている間はDragChargingを継続できます。

Jump処理自体については「Player移動｜ジャンプ」を正とします。

## DragChargingとDashing

`DragCharging → Dashing`の遷移種別については「Playerアクション遷移」を正とします。

Dash入力を受け付けた場合は、Dashingの開始条件を確認します。

```text
DragCharging
↓
Dash入力
↓
Dash開始条件確認
│
├─ 条件成立
│   ↓
│   DragCharging終了
│   ↓
│   選択内容を破棄
│   ↓
│   Dashing
│
└─ 条件不成立
    ↓
    DragCharging継続
```

Dashingへの遷移が成立した場合、それまで選択していたシャオンダマの選択内容はすべて破棄します。

この終了は`miss`として扱いません。

コンボも中断しません。

## DragChargingとSmallHit

`SmallHit`が成立した場合、DragChargingを強制終了します。

```text
ActionState   = DragCharging
ReactionState = None
↓
SmallHit
↓
選択途中内容を破棄
↓
ActionState   = None
ReactionState = SmallHit
```

それまでに選択していたシャオンダマはチャージしません。

SmallHitによる中断では選択結果を確定しません。

そのため、この終了は`miss`として扱いません。

コンボも中断しません。

```text
SmallHit
↓
DragCharging強制終了
↓
選択内容を破棄
↓
missなし
↓
Charge由来のコンボ中断なし
```

Aimingも同時成立している場合は、被弾の共通ルールに従ってAimも終了します。

被弾処理自体については「Playerリアクション｜被弾」を正とします。

## DragChargingとBigHit

`BigHit`が成立した場合もDragChargingを強制終了します。

```text
DragCharging
↓
BigHit
↓
選択途中内容を破棄
↓
ActionState = None
ReactionState = BigHit
```

BigHitによる中断でも選択結果を確定しません。

この終了は`miss`として扱いません。

コンボも中断しません。

## DragChargingの終了

DragChargingの主な終了条件を以下に示します。

| 終了原因         | 選択内容  | miss | コンボ  | 結果                   |
| ------------ | ----- | ---- | ---- | -------------------- |
| Releaseして正解  | 判定・確定 | なし   | 成功処理 | `ActionState = None` |
| Releaseして不正解 | 判定    | 発生   | 中断   | `ActionState = None` |
| Dash         | 破棄    | なし   | 維持   | `Dashing`            |
| `SmallHit`   | 破棄    | なし   | 維持   | `ActionState = None` |
| `BigHit`     | 破棄    | なし   | 維持   | `ActionState = None` |
| RootState変更  | 破棄    | なし   | 維持   | Gameplay内部Action終了   |

## Aimingとの関係

`ClickCharging`と`DragCharging`は、どちらもAimingと同時成立できます。

```text
Aiming + ClickCharging
```

```text
Aiming + DragCharging
```

Aiming中にChargeを開始した場合もAimを終了しません。

Charge中にAimingを開始することもできます。

### Aimを終了した場合

Charge中にAim終了条件が成立しても、Charge自体は終了しません。

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

## Grounded / Airborneとの関係

ClickChargingとDragChargingは、どちらもGrounded / Airborneの両方で開始・継続できます。

| ActionState     | Grounded | Airborne |
| --------------- | -------- | -------- |
| `ClickCharging` | ○        | ○        |
| `DragCharging`  | ○        | ○        |

Charge実行中にJumpまたは接地喪失によって`Grounded → Airborne`へ移行しても、Chargeを終了しません。

```text
Grounded + ClickCharging
↓
Jump / 接地喪失
↓
Airborne + ClickCharging
```

```text
Grounded + DragCharging
↓
Jump / 接地喪失
↓
Airborne + DragCharging
```

同様に、Airborne中に着地して`Grounded`へ戻ってもChargeは継続します。

Airborne中の移動処理については「Player基本移動」を正とします。

ただし、Dashing中のCharge入力判定またはCharge先行入力を保持した状態で、Jumpや接地喪失によってDashingが特殊終了した場合は、Dashing側の先行入力破棄ルールを優先します。

## Parryingとの関係

ClickChargingおよびDragChargingからParryingへの遷移可否については「Playerアクション遷移」を正とします。

Charge中に受け付けられないParry入力が行われた場合は、現在のChargeを継続します。

Parrying中にCharge入力をPressした場合も、Click / Drag入力判定を開始しません。

その入力をParrying終了後のAction先行入力として保持することもありません。

## MarkerFiringとの関係

ClickChargingおよびDragChargingとMarkerFiringのActionState間遷移については「Playerアクション遷移」を正とします。

Charge実行中にMarker入力が行われても、遷移が許可されていない場合は現在のChargeを継続します。

AimingとChargeが同時成立している場合でも、Charge中であることを理由にActionStateの遷移ルールを変更しません。

MarkerFiring中にCharge入力をPressした場合も、Click / Drag入力判定を開始しません。

## RootStateによる強制終了

ClickChargingまたはDragCharging中にGameplayから別のRootStateへ遷移する場合、Chargeを強制終了します。

また、Click / Drag入力判定中の場合も入力判定を破棄します。

対象となる主なRootStateは以下です。

* `Conversation`
* `Interacting`
* `Dead`

RootState変更は通常のAction入力より優先します。

### ClickCharging

Charge判定Event前に強制終了した場合、保持していたシャオンダマ情報を破棄し、チャージ結果は発生しません。

Charge判定Event後に強制終了した場合、すでに確定したチャージ結果は取り消しません。

強制終了自体は`miss`として扱いません。

### DragCharging

DragCharging中にRootStateが変更された場合、選択途中の内容を破棄して終了します。

```text
DragCharging
↓
RootState変更
↓
選択内容を破棄
↓
DragCharging終了
```

この終了も`miss`として扱いません。

`Dead`への遷移は他のPlayer状態より優先します。

## チャージ成功とmiss

### success

Playerが選択したシャオンダマを有効なAttackEventのSlotへ登録できた場合、チャージ成功とします。

成功したシャオンダマについて以下を行います。

* AttackEventの対象Slotへ登録
* パレットブレット化
* コンボ加算などの成功処理

AttackEventのすべてのSlotを埋める必要はありません。

一部のSlotのみ埋まっている場合のAttackEventの処理については、AttackEvent側の仕様を正とします。

### miss

`miss`は、Playerが選択結果を確定し、その内容がAttackEventの要求に対して不正解だった場合に発生します。

主な例は以下です。

* ClickChargingのCharge判定Event時に、保持しているシャオンダマを要求するSlotが存在しない
* DragChargingのRelease時に、選択結果がAttackEventの要求に対して不正解だった

`miss`が発生した場合はコンボを中断します。

### missにしない処理

以下の処理自体は`miss`として扱いません。

* Click / Drag入力判定の破棄
* DragCharging先行入力の破棄
* ClickChargingのDashキャンセル
* DragChargingのDashによる終了
* ClickChargingの`SmallHit / BigHit`による中断
* DragChargingの`SmallHit / BigHit`による中断
* RootState変更による強制終了
* その他、Playerが選択結果を確定する前の強制終了

強制終了時は、未確定の選択内容を破棄します。

## パラメータ

Charge固有の主な調整項目を以下に示します。

| パラメータ                             | 内容                               | 値              |
| --------------------------------- | -------------------------------- | -------------- |
| `ChargeMaxDistance`               | シャオンダマを選択可能な最大距離                 | 未定             |
| `DragStartThreshold`              | Click / Dragを判定するためのDrag開始閾値     | 未定             |
| `ClickChargingDuration`           | ClickCharging全体の継続時間             | 未定             |
| `ClickChargeJudgeTiming`          | ClickChargingのCharge判定Eventタイミング | 未定             |
| `ClickDashCancelTiming`           | ClickChargingのDashキャンセル受付開始タイミング | Charge判定Event後 |
| `DragChargingMoveSpeedMultiplier` | DragCharging中の移動速度補正             | 未定             |

Dashキャンセル入力バッファの具体的な保持時間は、共通の調整パラメータとして「Playerアクション遷移」のルールに従います。

ClickCharging中の移動速度は通常速度とします。

Aimingなど他Stateによる移動補正との組み合わせについては「Player基本移動」を正とします。

## 各ページとの責務分離

Chargeに関係する仕様は、以下のように管理します。

| 内容                               | 管理ページ           |
| -------------------------------- | --------------- |
| `ClickCharging`の開始・対象保持・判定・終了    | 本ページ            |
| `DragCharging`の開始・選択・判定・終了       | 本ページ            |
| Click / Drag入力判定                 | 本ページ            |
| Click / Drag入力判定の開始・破棄条件         | 本ページ            |
| Dashing中のCharge入力判定              | 本ページ            |
| DragCharging先行入力中のRelease処理      | 本ページ            |
| Click / Drag判定閾値                 | 本ページ            |
| ClickChargingの対象シャオンダマ保持タイミング    | 本ページ            |
| ClickChargingのAttackEvent判定タイミング | 本ページ            |
| Chargeによる`miss`                  | 本ページ            |
| ClickChargingのDashキャンセル受付開始タイミング | 本ページ            |
| Charge中Jump時のCharge固有処理          | 本ページ            |
| DragCharging中断時の選択内容             | 本ページ            |
| ActionState間の遷移可否                | Playerアクション遷移   |
| `C→` / `B→`の定義                   | Playerアクション遷移   |
| Action先行入力の保持・上書き・評価ルール          | Playerアクション遷移   |
| Dashキャンセル入力バッファの共通ルール            | Playerアクション遷移   |
| SmallHit / BigHitによるAction中断可否   | Playerアクション遷移   |
| Grounded / AirborneによるAction開始制限 | Playerアクション遷移   |
| Jump自体の処理                        | Player移動｜ジャンプ   |
| Aiming中のカメラ・Player向き             | Playerアクション｜照準  |
| Reaction自体の処理                    | Playerリアクション｜被弾 |
| 移動速度の最終決定                        | Player基本移動      |
| AttackEventのSlot構造・割り当て優先ルール     | AttackEvent側の仕様 |
| シャオンダマ自体の仕様                      | シャオンダマ側の仕様      |
| パレットブレット化後の挙動                    | パレットブレット側の仕様    |

## 未決事項

* Click / Dragを判定する`DragStartThreshold`の具体値
* ClickChargingのモーション時間
* ClickChargingのCharge判定Eventタイミング
* DragCharging中に複数の音程を選択する場合、選択順もAttackEventの要求順と一致させる必要があるか

<PageRelations />
