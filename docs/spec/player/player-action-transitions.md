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
* 入力を先行入力として保持する
* 入力を無視して現在のActionを継続する

各Actionが正常終了した場合、`ActionState`は原則として`None`へ戻ります。

ただし、先行入力が保持されている場合は、現在のAction終了後に保持している入力を評価し、開始条件を満たしていれば次のActionを開始します。

`MovementState`、`AimState`、`ReactionState`は`ActionState`とは別のStateMachineとして管理します。

そのため、異なるStateMachineに属するStateは、ルール上許可されている場合に同時成立できます。

例：

```text
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
| `B→` | 入力を先行入力として保持し、現在のAction終了後に遷移する   |
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

キャンセル遷移の場合は、現在のActionを終了したうえで、キャンセル先のActionへ遷移します。

```text
MarkerFiring
↓
キャンセル可能区間でDash入力
↓
MarkerFiring終了
↓
Dashing
```

先行入力が存在する場合は、現在のAction終了後に一度`None`へ戻り、保持している入力を評価します。

```text
Dashing
↓
MarkerFiring入力を保持
↓
Dashing終了
↓
ActionState = None
↓
開始条件を確認
↓
MarkerFiring
```

実装上、`None`を経由して次のActionへ遷移する処理が同一フレーム内で行われても問題ありません。

被弾や`RootState`の変更などによる強制終了については、通常終了とは別に本ページの各ルールに従います。

## 先行入力

先行入力とは、現在のAction実行中に入力された次のActionを一時的に保持し、現在のAction終了後に実行する仕組みです。

本ページでは、先行入力による遷移を`B→`と表記します。

基本的な流れは以下です。

```text
現在のAction
↓
次のAction入力
↓
入力を保持
↓
現在のAction終了
↓
ActionState = None
↓
保持している入力を評価
↓
次のAction開始
```

先行入力は、ActionState遷移表で`B→`と定義されている組み合わせでのみ使用します。

現在、先行入力を使用する遷移は以下です。

| 現在のAction  | 先行入力するAction   |
| ---------- | -------------- |
| `Dashing`  | `MarkerFiring` |
| `Dashing`  | `DragCharging` |
| `Parrying` | `Parrying`     |

先行入力されたActionは、現在のActionが正常終了した時点で開始条件を再確認します。

開始条件を満たしている場合は、保持しているActionを開始します。

開始条件を満たしていない場合は、保持していた入力を破棄します。

例えば、`Dashing`中に`MarkerFiring`を先行入力していても、Dash終了時点で`MarkerFiring`の開始条件を満たしていなければ開始しません。

先行入力を受け付ける具体的な時間やタイミングが必要な場合は、各Action仕様で定義します。

## キャンセル受付

一部のActionは、正常終了する前に別のActionへ遷移できるキャンセル受付区間を持ちます。

本ページでは、キャンセルによる遷移を`C→`と表記します。

`C→`は、現在のActionがキャンセル可能な状態になっている場合のみ実行できます。

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

キャンセル可能区間で、遷移表に`C→`として定義されているActionが入力された場合、現在のActionを終了して対象Actionへ遷移します。

現在、キャンセル遷移を使用する組み合わせは以下です。

| 現在のAction       | キャンセル先    |
| --------------- | --------- |
| `MarkerFiring`  | `Dashing` |
| `ClickCharging` | `Dashing` |

例えば、`MarkerFiring → Dashing`は`C→`であるため、MarkerFiring開始直後にはDashへ遷移できません。

MarkerFiring側で定義されたキャンセル受付タイミング以降にDash入力を行った場合のみ、`MarkerFiring`を終了して`Dashing`へ遷移します。

キャンセル受付前に入力されたActionを先行入力として保存するかどうかは、`C→`とは別に定義します。

現在、`MarkerFiring → Dashing`および`ClickCharging → Dashing`では、キャンセル受付前のDash入力を先行入力として保持しません。

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

例えば、地上で開始したActionの途中で足場から落下した場合にActionを継続するかどうかは、そのActionごとに定義します。

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

`Dead`への遷移は、Action、Aim、Reaction、Conversation、InteractingなどのPlayer状態より優先します。

HPが0になった場合は、実行中のActionやReactionに関係なく`Dead`へ遷移します。

## 各Actionページとの責務分離

Action間の共通遷移ルールは本ページで管理し、各ActionページにはそのAction固有の仕様のみを記載します。

本ページでは、主に以下を定義します。

| 内容                         | 管理ページ      |
| -------------------------- | ---------- |
| Action AからAction Bへ遷移できるか  | 本ページ       |
| 即時遷移・キャンセル・先行入力・入力無視のどれか   | 本ページ       |
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

このように、Action同士の関係を本ページへ集約することで、各Actionページ間で異なる遷移ルールが記載されることを防ぎます。

## 未決事項

現時点ではありません。

<PageRelations />
