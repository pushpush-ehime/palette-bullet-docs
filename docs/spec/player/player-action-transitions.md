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
* キャンセル遷移
* 先行入力
* `AimState`との同時成立
* `MovementState`による開始制限
* `ReactionState`による強制中断
* `RootState`変更時の強制終了

## 基本原則

PlayerのGameplay中のアクションは、`ActionState`によって管理します。

`ActionState`は排他的であり、同時に複数のActionStateになることはありません。

```text id="7dzkib"
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
* 入力を先行入力として保持する
* 入力を無視して現在のActionを継続する

各Actionが正常終了した場合、`ActionState`は原則として`None`へ戻ります。

ただし、先行入力が保持されている場合は、現在のAction終了後に保持している入力を評価し、開始条件を満たしていれば次のActionを開始します。

`MovementState`、`AimState`、`ReactionState`は`ActionState`とは別のStateMachineとして管理します。

そのため、異なるStateMachineに属するStateは、ルール上許可されている場合に同時成立できます。

例：

```text id="39csnt"
MovementState = Grounded
ActionState   = ClickCharging
AimState      = Aiming
ReactionState = None
```

## 遷移記号

本ページでは、ActionState間の遷移を以下の記号で表します。

| 記号   | 意味                                |
| ---- | --------------------------------- |
| `→`  | 入力を受け付け、現在のActionを終了して即時遷移する      |
| `C→` | 現在のActionがキャンセル受付可能になっている場合のみ遷移する |
| `B→` | 入力を先行入力として保持し、現在のAction正常終了後に遷移する |
| `×`  | 入力を受け付けず、現在のActionを継続する           |
| `―`  | 同一Action。個別の再入力ルールに従う             |

## ActionState遷移表

各Action実行中に別のAction入力を行った場合の処理を以下に示します。

| 現在のActionState  | Dashing | MarkerFiring | ClickCharging | DragCharging | Parrying |
| --------------- | ------- | ------------ | ------------- | ------------ | -------- |
| `None`          | `→`     | `→`          | `→`           | `→`          | `→`      |
| `Dashing`       | `―`     | `B→`         | `×`           | `B→`         | `×`      |
| `MarkerFiring`  | `C→`    | `×`          | `×`           | `×`          | `×`      |
| `ClickCharging` | `C→`    | `×`          | `×`           | `×`          | `×`      |
| `DragCharging`  | `→`     | `×`          | `×`           | `―`          | `×`      |
| `Parrying`      | `×`     | `×`          | `×`           | `×`          | `B→`     |

`C→`が可能になる具体的なタイミングは、それぞれのAction仕様で定義します。

`B→`はActionStateを即座に変更するものではありません。現在のActionを最後まで継続し、正常終了後に保持している入力を評価します。

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

```text id="j017wt"
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

## Action終了時の共通ルール

Actionが正常終了した場合、`ActionState`は原則として`None`へ戻ります。

```text id="zfcn2j"
Action開始
↓
Action実行
↓
Action正常終了
↓
ActionState = None
```

キャンセル遷移の場合は、遷移先Actionの開始条件を確認した後、現在のActionを終了して対象Actionへ遷移します。

```text id="349b50"
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

先行入力が存在する場合は、現在のAction正常終了後に一度`None`へ戻り、保持している入力を評価します。

```text id="1j6prp"
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

先行入力を評価するのは、原則として現在のActionが**正常終了した場合のみ**です。

被弾やRootState変更などによってActionが強制終了した場合は、保持している先行入力を破棄します。

Actionによっては、Jumpや接地喪失など、そのAction固有の終了条件でも先行入力を破棄する場合があります。

例えば`Dashing`では以下のように扱います。

| Dashing終了原因              | 先行入力 |
| ------------------------ | ---- |
| 初動高速移動Phase終了時にDash入力がない | 評価する |
| Dash継続PhaseでDash入力を離す    | 評価する |
| Jump                     | 破棄   |
| 接地喪失                     | 破棄   |
| `SmallHit`               | 破棄   |
| `BigHit`                 | 破棄   |
| `Conversation`           | 破棄   |
| `Interacting`            | 破棄   |
| `Dead`                   | 破棄   |

各Action固有の正常終了・強制終了の判定については、それぞれのAction仕様で定義します。

## 先行入力

先行入力とは、現在のAction実行中に入力された次のActionを一時的に保持し、現在のAction正常終了後に実行する仕組みです。

本ページでは、ActionState間の先行入力による遷移を`B→`と表記します。

基本的な流れは以下です。

```text id="11ocj9"
現在のAction
↓
次のAction入力
↓
入力を保持
↓
現在のAction正常終了
↓
ActionState = None
↓
保持している入力を評価
↓
次のAction開始
```

先行入力は、ActionState遷移表で`B→`と定義されている組み合わせでのみ使用します。

現在、ActionState間で先行入力を使用する遷移は以下です。

| 現在のAction  | 先行入力するAction   |
| ---------- | -------------- |
| `Dashing`  | `MarkerFiring` |
| `Dashing`  | `DragCharging` |
| `Parrying` | `Parrying`     |

先行入力されたActionは、現在のActionが正常終了した時点で開始条件を再確認します。

開始条件を満たしている場合は、保持しているActionを開始します。

開始条件を満たしていない場合は、保持していた入力を破棄します。

## Action用先行入力の保持数

ActionStateへ遷移するための先行入力は、同時に**1件のみ**保持します。

すでにActionの先行入力を保持している状態で、別の有効なAction先行入力が行われた場合は、後から入力されたActionで上書きします。

例：

```text id="tw01tv"
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

入力を上書きするのは、現在のStateから`B→`が許可されている有効な先行入力のみです。

遷移表で`×`となっているAction入力によって、保持中の先行入力を削除または上書きしません。

## Aimの先行入力

`AimState`は`ActionState`とは別のStateMachineであるため、Aimの先行入力はAction用の先行入力とは別に管理します。

現在、`Dashing`中は`Aiming`と同時成立できないため、その場でAimingを開始することはできません。

ただし、Dashing中にAim開始入力が行われた場合は、Aim開始要求を先行入力として保持できます。

```text id="znrydh"
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

```text id="oq85k3"
Dashing中

Pending Aim    = Aiming
Pending Action = MarkerFiring
```

Dashing正常終了時は、以下の順序で評価します。

```text id="63j2v7"
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

```text id="sn9cmi"
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

```text id="53tgh3"
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

保持している先行入力は、以下の場合に破棄します。

* 現在のActionが強制終了した
* 現在のAction固有のルールで先行入力を破棄する終了が発生した
* 正常終了時に遷移先Actionの開始条件を満たしていなかった
* RootStateがGameplay以外へ変更された

保持していた入力を破棄した場合、その入力を後から自動実行しません。

先行入力を受け付ける具体的な時間やタイミングが必要な場合は、各Action仕様で定義します。

## キャンセル受付

一部のActionは、正常終了する前に別のActionへ遷移できるキャンセル受付区間を持ちます。

本ページでは、キャンセルによる遷移を`C→`と表記します。

`C→`は、現在のActionがキャンセル可能な状態になっている場合のみ実行できます。

基本的なActionの流れは以下です。

```text id="wl1cqb"
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

キャンセル可能区間で、遷移表に`C→`として定義されているActionが入力された場合、遷移先Actionの開始条件を確認します。

開始条件を満たしている場合のみ、現在のActionを終了して対象Actionへ遷移します。

現在、キャンセル遷移を使用する組み合わせは以下です。

| 現在のAction       | キャンセル先    |
| --------------- | --------- |
| `MarkerFiring`  | `Dashing` |
| `ClickCharging` | `Dashing` |

例えば、`MarkerFiring → Dashing`は`C→`であるため、MarkerFiring開始直後にはDashへ遷移できません。

```text id="7m55yw"
MarkerFiring
↓
キャンセル不可区間
↓
Dash入力
↓
遷移しない
```

キャンセル受付開始後にDash入力が行われ、かつDashの開始条件を満たしている場合のみDashingへ遷移します。

```text id="ys60sq"
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

### キャンセル受付前の入力

キャンセル受付前に入力されたActionを先行入力として保存するかどうかは、`C→`とは別に定義します。

現在、以下の入力は先行入力として保持しません。

* `MarkerFiring`中のキャンセル受付前のDash入力
* `ClickCharging`中のキャンセル受付前のDash入力

この場合、入力は無視し、キャンセル受付開始後に再度Dash入力が必要です。

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

```text id="275mpn"
AimState    = Aiming
ActionState = None
↓
Dash開始
↓
AimState    = Normal
ActionState = Dashing
```

`MarkerFiring`、`ClickCharging`、`DragCharging`を開始した場合は、`Aiming`を継続できます。

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

`×`となっている状態で対応する入力を行った場合、入力は無視します。

`MarkerFiring`は`Aiming`中に使用するActionであるため、`Aiming`を開始できない`Airborne`では開始できません。

Action実行中に`MovementState`が変化した場合、そのActionを継続するか終了するかは各Actionの仕様に従います。

例えば、`Dashing`中にJumpまたは接地喪失によって`Airborne`へ移行した場合はDashingを終了します。

一方、`ClickCharging`や`DragCharging`はAirborneでも成立できるため、着地だけを理由にActionを終了しません。

## ReactionStateによる強制中断

`SmallHit`または`BigHit`が発生した場合、通常のActionState遷移ルールよりもReactionStateによる割り込みを優先します。

| 現在の状態           | SmallHit | BigHit |
| --------------- | -------- | ------ |
| `Dashing`       | 強制終了     | 強制終了   |
| `MarkerFiring`  | 強制終了     | 強制終了   |
| `ClickCharging` | 強制終了     | 強制終了   |
| `DragCharging`  | 継続       | 強制終了   |
| `Parrying`      | 強制終了     | 強制終了   |
| `Aiming`        | 終了       | 終了     |

Actionを強制終了した場合、`ActionState`は`None`へ戻します。

`Aiming`を終了した場合、`AimState`は`Normal`へ戻します。

`DragCharging`のみ、`SmallHit`が発生してもActionを継続します。

強制終了時に保持されていたAction先行入力およびAim開始要求は破棄します。

ただし、Action中断によって発生するAction固有の処理は各Action仕様で定義します。

例えば、以下のような処理は本ページでは定義しません。

* DragCharging中断時に、それまで選択していたシャオンダマをどう扱うか
* MarkerFiring中断時に、すでに発射されたマーカーをどう扱うか
* Action中断を`miss`として扱うか

## RootState遷移による強制終了

`Gameplay`から別の`RootState`へ遷移する場合、Gameplay内部のStateを終了します。

| 遷移先RootState   | ActionState | AimState    | ReactionState |
| -------------- | ----------- | ----------- | ------------- |
| `Conversation` | `None`へ強制終了 | `Normal`へ終了 | `None`へ終了     |
| `Interacting`  | `None`へ強制終了 | `Normal`へ終了 | `None`へ終了     |
| `Dead`         | `None`へ強制終了 | `Normal`へ終了 | `None`へ終了     |

例えば、`ClickCharging + Aiming`の状態から`Conversation`へ遷移する場合は、以下のようになります。

```text id="vthcbi"
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

HPが0になった場合は、実行中のActionやReactionに関係なく`Dead`へ遷移します。

## 各Actionページとの責務分離

Action間の共通遷移ルールは本ページで管理し、各ActionページにはそのAction固有の仕様のみを記載します。

| 内容                         | 管理ページ      |
| -------------------------- | ---------- |
| Action AからAction Bへ遷移できるか  | 本ページ       |
| 即時遷移・キャンセル・先行入力・入力無視のどれか   | 本ページ       |
| Action先行入力の保持数・上書きルール      | 本ページ       |
| Aim先行入力とAction先行入力の評価順序    | 本ページ       |
| Aimとの同時成立可否                | 本ページ       |
| Grounded / Airborneによる開始制限 | 本ページ       |
| SmallHit / BigHitによる中断可否   | 本ページ       |
| RootState変更時の強制終了          | 本ページ       |
| キャンセル受付を開始する具体的なタイミング      | 各Actionページ |
| 先行入力を受け付ける具体的なタイミング        | 各Actionページ |
| モーション時間                    | 各Actionページ |
| Action固有の入力処理              | 各Actionページ |
| Actionが中断された場合の固有処理        | 各Actionページ |
| Action固有のパラメータ             | 各Actionページ |

例えば、`MarkerFiring → Dashing`が`C→`であることは本ページで定義します。

一方、MarkerFiringのモーションのどのタイミングからDashキャンセルを受け付けるかは「Playerアクション｜マーカー」で定義します。

また、Dashing中に`MarkerFiring`を先行入力できることは本ページで定義し、Dashingのどのタイミングから入力受付を開始するかを個別に設定する必要がある場合は「Playerアクション｜ダッシュ」で定義します。

このように、Action同士の関係を本ページへ集約することで、各Actionページ間で異なる遷移ルールが記載されることを防ぎます。

## 未決事項

現時点ではありません。

<PageRelations />
