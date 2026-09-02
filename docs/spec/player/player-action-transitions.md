---

title: "Playerアクション遷移"
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Playerアクション遷移

## 目的

本ページでは、Gameplay中に使用するPlayerアクションについて、各State間の遷移ルールを定義します。

各Actionの具体的な挙動やモーション、パラメータは個別のAction仕様で定義し、本ページでは主に以下を扱います。

* `ActionState`同士の遷移可否
* 即時遷移
* キャンセル遷移
* Action先行入力
* Dashキャンセル入力バッファ
* `AimState`との同時成立
* `MovementState`による開始制限
* `ReactionState`による強制中断
* `RootState`変更時の強制終了
* 強制イベントと通常Action入力の優先関係
* 通常Action入力同士の基本的な評価順

## 基本原則

PlayerのGameplay中のアクションは、`ActionState`によって管理します。

`ActionState`は排他的であり、同時に複数のActionStateになることはありません。

```text
ActionState
├─ None
├─ Dashing
├─ MarkerFiring
├─ ClickCharging
├─ DragCharging
└─ Parrying
```

新しいActionの入力を受けた場合、現在の`ActionState`と入力されたActionの組み合わせに応じて、以下のいずれかを行います。

* 現在のActionから即時遷移する
* キャンセル可能なタイミングで遷移する
* 入力をAction先行入力として保持する
* 入力を受け付けず現在のActionを継続する

一部のキャンセル遷移では、キャンセル受付直前の入力を短時間だけ保持するキャンセル入力バッファを使用します。

各Actionが正常終了した場合、`ActionState`は原則として`None`へ戻ります。

ただし、Action先行入力が保持されている場合は、現在のAction終了後に保持している入力を評価し、開始条件を満たしていれば次のActionを開始します。

`MovementState`、`AimState`、`ReactionState`は`ActionState`とは別のStateMachineとして管理します。

そのため、異なるStateMachineに属するStateは、ルール上許可されている場合に同時成立できます。

例：

```text
MovementState = Grounded
ActionState   = ClickCharging
AimState      = Aiming
ReactionState = None
```

## モードチェンジ／コンダクトとの責務境界

モード変更要求とコンダクト選択はPlayer入力ですが、入力であることだけを理由に`ActionState`の開始・遷移として扱いません。本ページの遷移表、Action先行入力、およびDashキャンセル入力バッファは、現在記載している既存Actionだけを対象とします。

* モード変更要求を`ActionState`遷移またはbuffered Actionとして追加しない
* コンダクト選択を`ActionState`遷移として追加せず、その選択状態をAction先行入力やDashキャンセル入力バッファとして保持しない
* クールタイム中に破棄されたモード入力を、クールタイム終了後に実行する予約入力として保持しない
* モード変更要求またはコンダクト選択だけを理由に、Charge、Aim、Movementへ既存仕様にない中断を追加しない
* Mode／Conduct入力と既存Actionが同Frameに成立した場合の処理順・優先順位を、本ページで推測して確定しない

Mode／ConductのRuntime Owner、Palette State Graphとの接続形式、Production Event／Command／payload、およびInput Action実装は未決です。本ページでは、新しいState、遷移、buffer、Event、またはCommandを定義しません。Gameplay上の意味と未決事項は[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)、入力割り当ては[Player入力と操作](/spec/player/input-and-controls)を正本とします。

## 遷移記号

本ページでは、ActionState間の遷移を以下の記号で表します。

| 記号   | 意味                                      |
| ---- | --------------------------------------- |
| `→`  | 入力を受け付け、現在のActionを終了して即時遷移する            |
| `C→` | 現在のActionがキャンセル受付可能になっている場合に遷移する        |
| `B→` | 入力をAction先行入力として保持し、現在のAction正常終了後に遷移する |
| `×`  | 入力を受け付けず、現在のActionを継続する                 |
| `―`  | 同一Action。個別の再入力ルールに従う                   |

`C→`と`B→`は異なる仕組みです。

`C→`は現在のActionを途中で終了して別Actionへ遷移するキャンセルです。

`B→`は現在のActionを正常終了まで継続し、その後に次Actionを開始する先行入力です。

## ActionState遷移表

各Action実行中に別のAction入力を行った場合の処理を以下に示します。

| 現在のActionState  | Dashing | MarkerFiring | ClickCharging | DragCharging | Parrying |
| --------------- | ------- | ------------ | ------------- | ------------ | -------- |
| `None`          | `→`     | `→`          | `→`           | `→`          | `→`      |
| `Dashing`       | `―`     | `B→`         | `B→`          | `B→`         | `×`      |
| `MarkerFiring`  | `C→`    | `×`          | `×`           | `×`          | `×`      |
| `ClickCharging` | `C→`    | `×`          | `×`           | `×`          | `×`      |
| `DragCharging`  | `→`     | `×`          | `×`           | `―`          | `×`      |
| `Parrying`      | `×`     | `×`          | `×`           | `×`          | `―`      |

`C→`が可能になる具体的なタイミングは、それぞれのAction仕様で定義します。

`MarkerFiring → Dashing`および`ClickCharging → Dashing`は、キャンセル受付直前のDash要求に対して短時間のキャンセル入力バッファを使用できます。

ただし、遷移種別そのものは`C→`のままです。

`B→`はActionStateを即座に変更するものではありません。

現在のActionを正常終了まで継続し、正常終了後に保持している入力を評価します。

遷移表で遷移が許可されている場合でも、対象Actionの開始条件を満たしていなければActionは開始しません。

## Action開始条件の確認

ActionState間の遷移が許可されていても、それだけでは対象Actionを開始できません。

遷移を実行する前に、対象Action固有の開始条件を確認します。

開始条件には、例えば以下があります。

* `MovementState`
* 必要なスタミナ
* 対象Action固有の使用条件
* 必要なAim状態

対象Actionの開始条件を満たしていない場合、そのActionへの遷移は実行しません。

### 即時遷移・キャンセル遷移の場合

現在のActionを終了する必要がある遷移では、**遷移先Actionの開始条件を確認してから現在のActionを終了します。**

例えば、`MarkerFiring → Dashing`がキャンセル可能なタイミングであっても、Dashに必要なスタミナが不足している場合はDashingへ遷移しません。

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

同様に、`DragCharging → Dashing`でもDashを開始できない場合は`DragCharging`を終了しません。

Dashキャンセル入力バッファからDashingを開始する場合も同様です。

```text
ClickCharging
↓
Dash入力を短時間保持
↓
キャンセル可能区間へ到達
↓
Dash開始条件確認
↓
開始条件不成立
↓
Dashingへ遷移しない
```

入力を保持していること自体は、Dashingの開始条件を保証しません。

## 同時イベント・入力の優先ルール

PlayerのState変更を強制するイベントと通常Action入力が同じ更新タイミングで処理対象になった場合、強制イベントを優先します。

基本的な考え方は以下です。

```text
強制イベント
↓ 優先
通常Action入力
```

### 強制イベント

主な強制イベントには以下があります。

* `Dead`への遷移
* `SmallHit`
* `BigHit`
* `RootState`変更
* その他、現在のActionを強制終了させるState遷移

例えば、Dash開始要求とSmallHitが同じ更新タイミングで処理対象となった場合は、Dash開始よりReactionStateによる割り込みを優先します。

```text
Dash開始要求
+
SmallHit成立
↓
SmallHitを優先
↓
Action開始要求よりReaction処理
```

同様に、HPが0になりDeadへの遷移条件が成立した場合は、通常Action入力よりDeadを優先します。

`Dead`はPlayer Stateの中で最優先です。

Dead以外の強制イベント同士について、必要以上に詳細な固定優先順位は本ページでは定義しません。

各強制イベント固有の優先関係が必要な場合は、それぞれのState仕様を正とします。

### 通常Action入力同士

Dash、Marker、Charge、Parryなどの通常Action入力同士には、固定のAction優先順位を設けません。

複数の通常Action要求が非常に近いタイミングで発生した場合は、**入力時刻順を基本として評価します。**

```text
通常Action入力A
↓
通常Action入力B
↓
Aから評価
↓
現在のStateと遷移ルールに従う
```

先に評価したActionによってStateが変更された場合、その後のAction要求は変更後のStateと本ページの遷移ルールに従って評価されます。

```text
Parry > Dash > Charge > Marker
```

のような通常Action同士の固定優先順位は作りません。

入力時刻だけでは区別できない完全な同時入力について、フレーム内部のイベント取得順などをPlayer仕様として固定しません。

実装上の決定性が必要な場合は、実装設計側で扱います。

## Action終了時の共通ルール

Actionが正常終了した場合、`ActionState`は原則として`None`へ戻ります。

```text
Action開始
↓
Action実行
↓
Action正常終了
↓
ActionState = None
```

キャンセル遷移の場合は、遷移先Actionの開始条件を確認した後、現在のActionを終了して対象Actionへ遷移します。

```text
MarkerFiring
↓
キャンセル可能区間でDash入力
↓
Dash開始条件成立
↓
MarkerFiring終了
↓
Dashing
```

Action先行入力が存在する場合は、現在のAction正常終了後に一度`None`へ戻り、保持している入力を評価します。

```text
Dashing
↓
MarkerFiring入力を保持
↓
Dashing正常終了
↓
ActionState = None
↓
開始条件を確認
↓
MarkerFiring
```

実装上、`None`を経由して次のActionへ遷移する処理が同一フレーム内で行われても問題ありません。

## 正常終了と強制終了

Action先行入力を評価するのは、原則として現在のActionが**正常終了した場合のみ**です。

被弾やRootState変更などによってActionが強制終了した場合は、保持しているAction先行入力を破棄します。

Actionによっては、Jumpや接地喪失など、そのAction固有の終了条件でもAction先行入力を破棄する場合があります。

例えば`Dashing`では以下のように扱います。

| Dashing終了原因              | Action先行入力 |
| ------------------------ | ---------- |
| 初動高速移動Phase終了時にDash入力がない | 評価する       |
| Dash継続PhaseでDash入力を離す    | 評価する       |
| Jump                     | 破棄         |
| 接地喪失                     | 破棄         |
| `SmallHit`               | 破棄         |
| `BigHit`                 | 破棄         |
| `Conversation`           | 破棄         |
| `Interacting`            | 破棄         |
| `Dead`                   | 破棄         |

各Action固有の正常終了・強制終了の判定については、それぞれのAction仕様で定義します。

## Action先行入力

Action先行入力とは、現在のAction実行中に入力された次のActionを一時的に保持し、現在のAction正常終了後に実行する仕組みです。

本ページでは、ActionState間のAction先行入力による遷移を`B→`と表記します。

基本的な流れは以下です。

```text
現在のAction
↓
次のAction入力
↓
Action先行入力として保持
↓
現在のAction正常終了
↓
ActionState = None
↓
保持している入力を評価
↓
次のAction開始
```

Action先行入力は、ActionState遷移表で`B→`と定義されている組み合わせでのみ使用します。

現在、ActionState間でAction先行入力を使用する遷移は以下です。

| 現在のAction | 先行入力するAction    |
| --------- | --------------- |
| `Dashing` | `MarkerFiring`  |
| `Dashing` | `ClickCharging` |
| `Dashing` | `DragCharging`  |

Action先行入力されたActionは、現在のActionが正常終了した時点で開始条件を再確認します。

開始条件を満たしている場合は、保持しているActionを開始します。

開始条件を満たしていない場合は、保持していた入力を破棄します。

## Action用先行入力の保持数

ActionStateへ遷移するためのAction先行入力は、同時に**1件のみ**保持します。

すでにAction先行入力を保持している状態で、別の有効なAction先行入力が行われた場合は、後から入力されたActionで上書きします。

例：

```text
Dashing
↓
MarkerFiring入力
↓
Pending Action = MarkerFiring
↓
DragCharging入力
↓
Pending Action = DragCharging
```

この場合、Dashing正常終了後に評価するActionは`DragCharging`です。

入力を上書きするのは、現在のStateから`B→`が許可されている有効なAction先行入力のみです。

遷移表で`×`となっているAction入力によって、保持中のAction先行入力を削除または上書きしません。

この1件制限は`B→`で使用するAction先行入力のルールです。

後述するDashキャンセル入力バッファには、この保持数ルールを適用しません。

## Aimの先行入力

`AimState`は`ActionState`とは別のStateMachineであるため、Aimの先行入力はAction用の先行入力とは別に管理します。

現在、`Dashing`中は`Aiming`と同時成立できないため、その場でAimingを開始することはできません。

ただし、Dashing中にAim開始入力が行われた場合は、Aim開始要求を先行入力として保持できます。

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
Aim開始条件を確認
↓
AimState = Aiming
```

Aim開始要求を保持する具体的な入力条件は、Aimの入力方式に従います。

Dashingが正常終了した時点でAim開始条件を満たしていない場合は、Aim開始要求を破棄します。

Jump、接地喪失、被弾、RootState変更などによってDashingが正常終了以外の形で終了した場合も、保持していたAim開始要求を破棄します。

## Aim先行入力とAction先行入力の併用

Aimの先行入力とActionState用の先行入力は別枠であるため、同時に保持できます。

例えばDashing中に、

* Aim開始要求
* `MarkerFiring`開始要求

の両方を保持できます。

```text
Dashing中

Pending Aim    = Aiming
Pending Action = MarkerFiring
```

Dashing正常終了時は、以下の順序で評価します。

```text
Dashing正常終了
↓
ActionState = None
↓
1. Aim開始要求を評価
↓
2. Action先行入力を評価
```

### Aimを先に評価する理由

`MarkerFiring`は`Aiming`を開始条件とするため、Action先行入力より先にAim開始要求を評価します。

例えば、Dashing中にAimとMarkerFiringを先行入力していた場合は以下のようになります。

```text
Dashing
↓
Aim開始要求を保持
+
MarkerFiringを保持
↓
Dashing正常終了
↓
AimState = Aiming
↓
MarkerFiring開始条件確認
↓
ActionState = MarkerFiring
```

一方、MarkerFiringのみを保持しており、Dashing終了時点で`Aiming`ではない場合はMarkerFiringの開始条件を満たさないため、先行入力を破棄します。

```text
Dashing
↓
MarkerFiringを保持
↓
Dashing正常終了
↓
AimState = Normal
↓
MarkerFiring開始条件を満たさない
↓
MarkerFiring入力を破棄
```

`DragCharging`などAimingを必要としないActionは、Aim開始要求の有無に関係なく、そのAction自身の開始条件で判定します。

## 先行入力の破棄

保持しているAction先行入力は、以下の場合に破棄します。

* 現在のActionが強制終了した
* 現在のAction固有のルールでAction先行入力を破棄する終了が発生した
* 正常終了時に遷移先Actionの開始条件を満たしていなかった
* RootStateがGameplay以外へ変更された

保持していたAction先行入力を破棄した場合、その入力を後から自動実行しません。

Action先行入力を受け付ける具体的な時間やタイミングが必要な場合は、各Action仕様で定義します。

## キャンセル受付

一部のActionは、正常終了する前に別のActionへ遷移できるキャンセル受付区間を持ちます。

本ページでは、キャンセルによる遷移を`C→`と表記します。

`C→`は、現在のActionがキャンセル可能になった場合に成立します。

基本的なActionの流れは以下です。

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

現在、キャンセル遷移を使用する組み合わせは以下です。

| 現在のAction       | キャンセル先    |
| --------------- | --------- |
| `MarkerFiring`  | `Dashing` |
| `ClickCharging` | `Dashing` |

キャンセル可能区間でDash入力が行われた場合、Dashingの開始条件を確認します。

開始条件を満たしている場合のみ、現在のActionを終了してDashingへ遷移します。

```text
MarkerFiring
↓
キャンセル可能区間
↓
Dash入力
↓
Dash開始条件確認
↓
条件成立
↓
MarkerFiring終了
↓
Dashing
```

`C→`が可能になるAction内部の具体的なタイミング自体は、本ページでは変更しません。

MarkerFiringおよびClickChargingそれぞれのキャンセル受付開始タイミングは、各Action仕様を正とします。

## キャンセル入力バッファ

`MarkerFiring → Dashing`および`ClickCharging → Dashing`では、キャンセル可能区間へ入る直前のDash入力を救済するため、Dash要求を短時間だけ保持できます。

```text
MarkerFiring / ClickCharging
↓
Dash入力
↓
現在はまだDashキャンセル不可
↓
Dash要求を短時間保持
↓
保持時間内にキャンセル可能区間へ到達
↓
Dash開始条件確認
↓
条件成立
↓
現在のAction終了
↓
Dashing
```

この仕組みを**Dashキャンセル入力バッファ**として扱います。

### Action先行入力との違い

Dashキャンセル入力バッファは、`B→`で使用するAction先行入力とは別の仕組みです。

Action先行入力は、

```text
現在Action
↓
次Action入力
↓
正常終了まで保持
↓
現在Action正常終了
↓
次Action開始
```

となります。

一方、Dashキャンセル入力バッファは、

```text
MarkerFiring / ClickCharging
↓
Dash入力
↓
短時間保持
↓
キャンセル可能区間へ到達
↓
DashingへのC→を評価
```

となります。

したがって、

```text
MarkerFiring  → Dashing = C→
ClickCharging → Dashing = C→
```

の遷移記号は変更しません。

Dashキャンセル入力バッファを理由に`B→`へ変更することはありません。

また、Action先行入力の「1件のみ保持」というルールへDashキャンセル入力バッファを含めません。

### バッファの有効時間

Dash要求は無期限に保持しません。

保持時間内にキャンセル可能区間へ到達した場合のみ、Dashingへのキャンセル遷移を評価します。

```text
Dash入力
↓
Dash要求を保持
↓
保持時間終了
↓
まだキャンセル不可
↓
Dash要求を破棄
```

具体的な保持時間は調整パラメータとし、本ページでは固定しません。

### キャンセル可能区間へ到達した場合

保持中にキャンセル可能区間へ到達した場合、その時点でDashingの開始条件を確認します。

```text
Dash要求保持中
↓
キャンセル可能区間へ到達
↓
Dash開始条件確認
│
├─ 条件成立
│  ↓
│  現在Action終了
│  ↓
│  Dashing
│
└─ 条件不成立
   ↓
   Dashingへ遷移しない
```

Dash要求を保持していたことだけを理由に、開始条件を無視してDashingへ遷移することはありません。

## AimStateとの関係

`AimState`は`ActionState`とは別のStateMachineで管理します。

そのため、`Aiming`と一部のActionStateは同時に成立できます。

| ActionState     | `Aiming`との同時成立 | ルール                  |
| --------------- | -------------- | -------------------- |
| `None`          | ○              | Aimingを単独で継続できる      |
| `Dashing`       | ×              | Dash開始時にAimingを終了する  |
| `MarkerFiring`  | ○              | Aiming中にマーカーを発射できる   |
| `ClickCharging` | ○              | Aiming中でもクリックチャージできる |
| `DragCharging`  | ○              | Aiming中でもドラッグチャージできる |
| `Parrying`      | ×              | Parry開始時にAimingを終了する |

`Aiming`中に`Dashing`または`Parrying`を開始する場合は、`AimState`を`Normal`へ戻したうえでActionを開始します。

```text
AimState    = Aiming
ActionState = None
↓
Dash開始
↓
AimState    = Normal
ActionState = Dashing
```

`MarkerFiring`、`ClickCharging`、`DragCharging`を開始した場合は、`Aiming`を継続できます。

MarkerFiringは開始時にAimingを必要としますが、開始後にAimingが終了してもMarkerFiring自体は継続できます。

## MovementStateによる開始制限

Actionによって、`MovementState`による開始制限があります。

| Action / State  | Grounded | Airborne |
| --------------- | -------- | -------- |
| `Dashing`       | ○        | ×        |
| `MarkerFiring`  | ○        | ×        |
| `ClickCharging` | ○        | ○        |
| `DragCharging`  | ○        | ○        |
| `Parrying`      | ○        | ×        |
| `Aiming`        | ○        | ×        |

`×`となっている状態で対応する入力を行った場合、入力は受け付けません。

`MarkerFiring`は`Aiming`中に使用するActionであるため、`Aiming`を開始できない`Airborne`では新規開始できません。

Action実行中に`MovementState`が変化した場合、そのActionを継続するか終了するかは各Actionの仕様に従います。

例えば、`Dashing`中にJumpまたは接地喪失によって`Airborne`へ移行した場合はDashingを終了します。

一方、`ClickCharging`と`DragCharging`はAirborneでも成立できます。

そのため、Charge中にJumpした場合は`MovementState`のみを変更し、Chargeの`ActionState`を維持します。

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

着地によって`Airborne → Grounded`へ変化した場合も、それだけを理由にClickCharging / DragChargingを終了しません。

## ReactionStateによる強制中断

`SmallHit`または`BigHit`が成立した場合、通常のActionState遷移や通常Action入力よりReactionStateによる割り込みを優先します。

現在は、SmallHitによって継続するActionStateの例外を設けません。

| 現在の状態           | SmallHit | BigHit |
| --------------- | -------- | ------ |
| `Dashing`       | 強制終了     | 強制終了   |
| `MarkerFiring`  | 強制終了     | 強制終了   |
| `ClickCharging` | 強制終了     | 強制終了   |
| `DragCharging`  | **強制終了** | 強制終了   |
| `Parrying`      | 強制終了     | 強制終了   |
| `Aiming`        | 終了       | 終了     |

ActionState実行中にSmallHitまたはBigHitが成立した場合、共通のState遷移は以下です。

```text
ActionState = 何らかのAction
↓
SmallHit / BigHit成立
↓
現在Action強制終了
↓
ActionState = None
↓
ReactionState = SmallHit / BigHit
```

`Aiming`中の場合はAimも終了します。

```text
AimState = Aiming
↓
SmallHit / BigHit成立
↓
AimState = Normal
```

強制終了時に保持されていたAction先行入力およびAim開始要求は破棄します。

Action中断によって発生するAction固有の処理は各Action仕様で定義します。

例えば、以下のような処理は本ページでは定義しません。

* DragCharging中断時に、それまで選択していたシャオンダマをどう扱うか
* MarkerFiring中断時に、すでに発射されたマーカーをどう扱うか
* Action中断を`miss`として扱うか

## RootState遷移による強制終了

`Gameplay`から別の`RootState`へ遷移する場合、Gameplay内部のStateを終了します。

RootState変更による強制終了は、通常Action入力や通常のActionState遷移より優先します。

| 遷移先RootState   | ActionState | AimState    | ReactionState |
| -------------- | ----------- | ----------- | ------------- |
| `Conversation` | `None`へ強制終了 | `Normal`へ終了 | `None`へ終了     |
| `Interacting`  | `None`へ強制終了 | `Normal`へ終了 | `None`へ終了     |
| `Dead`         | `None`へ強制終了 | `Normal`へ終了 | `None`へ終了     |

例えば、`ClickCharging + Aiming`の状態から`Conversation`へ遷移する場合は、以下のようになります。

```text
RootState     = Gameplay
ActionState   = ClickCharging
AimState      = Aiming

↓ Conversation開始

ActionState   = None
AimState      = Normal
ReactionState = None
RootState     = Conversation
```

RootState変更によってGameplayを終了する場合、保持しているAction先行入力およびAim開始要求はすべて破棄します。

`Dead`への遷移は、Action、Aim、Reaction、Conversation、Interactingなど他のPlayer状態より優先します。

HPが0になった場合は、実行中のAction、保持中のAction要求、Reactionなどに関係なく`Dead`へ遷移します。

Deadへの具体的な遷移処理については「Player死亡」を正とします。

## 各Actionページとの責務分離

Action間の共通遷移ルールは本ページで管理し、各ActionページにはそのAction固有の仕様のみを記載します。

| 内容                             | 管理ページ      |
| ------------------------------ | ---------- |
| Action AからAction Bへ遷移できるか      | 本ページ       |
| 即時遷移・キャンセル・Action先行入力・入力無視のどれか | 本ページ       |
| Action先行入力の保持数・上書きルール          | 本ページ       |
| Dashキャンセル入力バッファの共通ルール          | 本ページ       |
| Aim先行入力とAction先行入力の評価順序        | 本ページ       |
| 強制イベントと通常Action入力の基本優先関係       | 本ページ       |
| 通常Action入力同士の基本評価順             | 本ページ       |
| Aimとの同時成立可否                    | 本ページ       |
| Grounded / Airborneによる開始制限     | 本ページ       |
| SmallHit / BigHitによる中断可否       | 本ページ       |
| RootState変更時の強制終了              | 本ページ       |
| キャンセル受付を開始する具体的なタイミング          | 各Actionページ |
| Dashキャンセル入力バッファの具体的な保持時間       | 調整パラメータ    |
| Action先行入力を受け付ける具体的なタイミング      | 各Actionページ |
| モーション時間                        | 各Actionページ |
| Action固有の入力処理                  | 各Actionページ |
| Actionが中断された場合の固有処理            | 各Actionページ |
| Action固有のパラメータ                 | 各Actionページ |

例えば、`MarkerFiring → Dashing`が`C→`であることは本ページで定義します。

一方、MarkerFiringのモーションのどのタイミングからDashキャンセルを受け付けるかは「Playerアクション｜マーカー」で定義します。

キャンセル受付直前のDash入力を短時間保持できるという共通ルールは本ページで定義し、その具体的な保持時間は調整パラメータとして扱います。

また、Dashing中に`MarkerFiring`をAction先行入力できることは本ページで定義し、Dashingのどのタイミングから入力受付を開始するかを個別に設定する必要がある場合は「Playerアクション｜ダッシュ」で定義します。

このように、Action同士の関係を本ページへ集約することで、各Actionページ間で異なる遷移ルールが記載されることを防ぎます。

## 未決事項

現時点ではありません。

<PageRelations />
