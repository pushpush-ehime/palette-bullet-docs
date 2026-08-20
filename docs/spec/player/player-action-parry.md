---
title: "Playerアクション｜パリィ"
description: Palette BulletにおけるPlayerのパリィ仕様
pageType: spec
category: "Player"
order: 40
status: 仮仕様
relatedTasks: []
---

# Playerアクション｜パリィ

## 目的

本ページでは、Playerアクションの一つであるパリィについて定義します。

本ページでは主に以下を扱います。

* `Parrying`の開始条件
* `ActionState = Parrying`への遷移
* Parrying内部Phase
* パリィ判定
* 成功・失敗・空振り
* 連続パリィ
* Parrying中の再入力
* Aimingとの関係
* 接地喪失による終了
* ReactionStateによる終了
* RootState変更による強制終了
* Parryingの終了条件

ActionState間の遷移可否については「Playerアクション遷移」を正とします。

被弾時に`SmallHit`または`BigHit`のどちらになるかについては「Playerリアクション｜被弾」で定義します。

## パリィとは

パリィは、敵の攻撃に合わせて入力することで、その攻撃を無効化するPlayerアクションです。

Parry入力を受け付けると、

```text
ActionState
None
↓
Parrying
```

へ遷移し、パリィモーションを開始します。

敵の攻撃が存在しない場合でもParrying自体は開始できます。

敵の攻撃に対してパリィ判定が有効なタイミングで攻撃を受けた場合、パリィ成功となります。

## 使用可能条件

Parryingは、以下の条件をすべて満たしている場合に開始できます。

* `RootState = Gameplay`
* `MovementState = Grounded`
* `ReactionState = None`
* 現在の`ActionState`からParryingの開始が許可されている

通常状態では、

```text
MovementState = Grounded
ActionState   = None
ReactionState = None
↓
Parry入力
↓
ActionState = Parrying
```

となります。

Airborne中はParryingを開始できません。

また、以下のActionStateからParryingへ直接遷移することはできません。

* `Dashing`
* `MarkerFiring`
* `ClickCharging`
* `DragCharging`

これらのAction中にParry入力が行われた場合は、入力を無視します。

先行入力としても保持しません。

## Parrying開始

Parry入力を受け付け、開始条件を満たしている場合、Parryingを開始します。

基本的な処理は以下です。

```text
Parry入力
↓
Parry開始条件確認
↓
必要に応じてAiming終了
↓
通常移動停止
↓
Playerの向きを確定
↓
ActionState = Parrying
↓
Parryモーション開始
```

Parrying開始時にPlayerの通常移動を停止します。

また、開始時点のPlayerの向きを保持し、Parryingが終了するまでPlayer本体の向きを変更しません。

## Parrying内部Phase

Parryingは、1つの`ActionState`として管理します。

モーション内部では、以下のPhaseを持ちます。

```text
Parrying
│
├─ Startup Phase
│
├─ Parry Window Phase
│
└─ Recovery Phase
    │
    ├─ 再入力受付前
    │
    └─ Parry再入力受付区間
```

これらは別のPlayer Stateではありません。

Parrying開始から終了まで、`ActionState`は`Parrying`のままです。

## Startup Phase

Parrying開始直後から、パリィ判定が有効になるまでのPhaseです。

このPhaseではパリィ判定は発生しません。

```text
Parrying開始
↓
Startup Phase
↓
Parry Window Phase
```

Startup Phase中に敵の攻撃を受けた場合、パリィは成立せず通常の被弾として処理します。

Parry再入力も受け付けません。

## Parry Window Phase

パリィ判定が有効になるPhaseです。

```text
Startup Phase
↓
Parry Window Phase
↓
パリィ判定有効
```

このPhase中に、有効な敵攻撃を受けた場合にパリィ成功となります。

1回のParryingでパリィできる攻撃は**1回のみ**です。

### 1回目の攻撃

Parry Window Phase中にまだパリィ成功していない状態で攻撃を受けた場合、パリィが成立します。

```text
Parry Window Phase
↓
敵攻撃
↓
パリィ成功
↓
ダメージ無効
↓
Parrying継続
```

パリィ成功によってParrying自体を終了しません。

また、成功時にParryモーションを最初から再生し直しません。

現在のParryモーションをそのまま継続します。

### パリィ成功後

一度パリィに成功したParryingでは、それ以降の攻撃に対してパリィ判定を行いません。

```text
Parrying
↓
攻撃A
↓
パリィ成功
↓
同じParrying中に攻撃B
↓
パリィ不成立
```

その後に受けた攻撃は通常の被弾判定へ進みます。

次の攻撃をパリィするためには、新しいParryingを開始する必要があります。

## Recovery Phase

Parry Window Phase終了後から、Parryモーションが終了するまでのPhaseです。

このPhaseではパリィ判定は発生しません。

```text
Parry Window Phase終了
↓
Recovery Phase
↓
Parryモーション終了
↓
ActionState = None
```

Recovery Phaseの後半には、次のParryingを開始するための**Parry再入力受付区間**を設けます。

## Parry再入力

Parrying中のParry再入力は、モーション後半に設定されたParry再入力受付区間のみ受け付けます。

これは先行入力ではありません。

受付区間中に新しいParry入力が行われた場合、現在のParryingをその場で終了し、新しいParryingを即座に最初から開始します。

```text
Parrying
↓
Recovery Phase
↓
Parry再入力受付区間
↓
Parry入力
↓
現在のParryingを終了
↓
新しいParryingを開始
↓
Startup Phaseから再生
```

`ActionState`としては、

```text
Parrying
↓
Parrying
```

となります。

実装上は現在のParryingを再開始し、以下をすべて初期状態へ戻します。

* Parryモーションの再生位置
* Startup Phase
* Parry Window Phase
* Recovery Phase
* そのParryingですでにパリィ成功したかどうか

そのため、再開始されたParryingでは再び1回の攻撃をパリィできます。

## 再入力受付前のParry入力

Parry再入力受付区間へ入る前にParry入力が行われた場合、その入力は無視します。

```text
Parrying
↓
再入力受付前
↓
Parry入力
↓
入力を無視
↓
現在のParrying継続
```

入力を先行入力として保持しません。

Parry再入力受付区間へ入った後に、改めてParry入力を行う必要があります。

## Parry入力のHold

Parryは、1回のPressにつき1回実行します。

Parry入力を押し続けても、自動的に次のParryingを開始しません。

```text
Parry Press
↓
Parrying開始
↓
Parry入力をHold
↓
次のParryingは開始しない
```

連続してParryingを行う場合は、1回ごとにParry入力を押し直す必要があります。

## パリィ成功

Parry Window Phase中に、そのParryingでまだパリィ成功していない状態で有効な敵攻撃を受けた場合、パリィ成功となります。

成功時は以下の処理を行います。

* 対象攻撃のダメージを無効化する
* 通常の被弾を発生させない
* `ReactionState`を変更しない
* `ActionState = Parrying`を維持する
* 現在のParryモーションを継続する

```text
ActionState   = Parrying
ReactionState = None
↓
Parry成功
↓
ActionState   = Parrying
ReactionState = None
```

パリィ成功専用のPlayer Stateは作成しません。

## パリィ失敗

以下の場合、パリィは成立しません。

* Startup Phase中に攻撃を受ける
* Parry Window Phase終了後に攻撃を受ける
* 同じParryingですでに1回パリィ成功している
* その他、対象攻撃がパリィ対象ではない

パリィが成立しない攻撃を受けた場合は、通常の被弾として処理します。

```text
ActionState   = Parrying
ReactionState = None
↓
攻撃を受ける
↓
Parry不成立
↓
ActionState = None
↓
ReactionState = SmallHit / BigHit
```

`SmallHit`または`BigHit`の判定方法は「Playerリアクション｜被弾」を正とします。

## 空振り

Parrying中に敵の攻撃を一度もパリィしなかった場合は、空振りとなります。

空振りによる追加のState変更やペナルティは発生しません。

Parry再入力が行われなければ、モーション終了までParryingを継続します。

```text
Parrying
↓
パリィ成功なし
↓
モーション終了
↓
ActionState = None
```

## Parrying中の移動

Parrying中は通常移動を行いません。

Move入力が行われても、通常移動には使用しません。

```text
ActionState = Parrying
+
Move入力
↓
移動しない
```

Parry開始時に現在の通常移動を停止します。

移動制御の優先順位については「Player基本移動」を正とします。

## Parrying中のPlayerの向き

Parrying開始時にPlayerの向きを確定します。

確定したPlayerの向きは、現在のParryingが終了するまで維持します。

Parry再入力によって新しいParryingを開始した場合は、その時点で改めてPlayerの向きを確定します。

```text
Parrying
↓
再入力受付区間でParry入力
↓
新しいParrying開始
↓
現在のPlayer向きを再取得
↓
新しい向きとして固定
```

## Aimingとの関係

AimingとParryingは同時成立できません。

`AimState = Aiming`の状態からParryingを開始する場合は、Aimingを終了してからParryingを開始します。

```text
MovementState = Grounded
ActionState   = None
AimState      = Aiming
↓
Parry入力
↓
AimState      = Normal
ActionState   = Parrying
```

Parrying中のAim入力は受け付けません。

先行入力としても保持しません。

## Airborneとの関係

### Airborne中の開始

`MovementState = Airborne`ではParryingを開始できません。

```text
MovementState = Airborne
↓
Parry入力
↓
入力を無視
```

### Parrying中に接地を失った場合

Parrying中に地面との接地を失った場合、Parryingを終了します。

```text
MovementState = Grounded
ActionState   = Parrying
↓
接地喪失
↓
MovementState = Airborne
ActionState   = None
```

対象となる主な状況は以下です。

* 崖から落下する
* 足場が消える
* 外力によって地面から離れる

接地喪失による終了は、Parryingの正常終了として扱いません。

保持しているParry入力は存在しないため、接地喪失後に自動的にParryingを再開することはありません。

## 他Actionとの関係

Parryingは排他的な`ActionState`です。

Parrying中に他のGameplay Actionを開始することはできません。

| 入力            | Parrying中    |
| ------------- | ------------ |
| Dash          | ×            |
| MarkerFiring  | ×            |
| ClickCharging | ×            |
| DragCharging  | ×            |
| Aim           | ×            |
| Jump          | ×            |
| Parry         | 再入力受付区間のみ再開始 |

`×`となっている入力は無視します。

先行入力として保持しません。

Parry再入力のみ、本ページで定義する専用ルールに従います。

## ReactionStateによる終了

Parryが成立しなかった攻撃によって`SmallHit`または`BigHit`が開始される場合、Parryingを強制終了します。

```text
ActionState   = Parrying
ReactionState = None
↓
SmallHit / BigHit成立
↓
ActionState = None
ReactionState = SmallHit / BigHit
```

ParryingよりReactionStateによる割り込みを優先します。

被弾によって終了した場合、Parryingを自動的に再開始しません。

## RootStateによる強制終了

Parrying中に`Gameplay`から別のRootStateへ遷移する場合、Parryingを強制終了します。

主な対象は以下です。

* `Conversation`
* `Interacting`
* `Dead`

```text
RootState   = Gameplay
ActionState = Parrying
↓
RootState変更
↓
ActionStateを終了
```

`Dead`への遷移は、他のPlayer状態より優先します。

RootState変更による終了後にParryingを自動再開することはありません。

## Parryingの終了

Parryingの主な終了条件を以下に示します。

| 終了原因        | ActionState        | 備考                               |
| ----------- | ------------------ | -------------------------------- |
| モーション正常終了   | `None`             | 通常終了                             |
| Parry再入力    | `Parrying`         | 現在のParryingを終了し、新しいParryingを即時開始 |
| 接地喪失        | `None`             | `MovementState = Airborne`へ変更    |
| `SmallHit`  | `None`             | ReactionStateを優先                 |
| `BigHit`    | `None`             | ReactionStateを優先                 |
| RootState変更 | Gameplay内部Action終了 | 強制終了                             |
| `Dead`      | Gameplay内部Action終了 | Deadを最優先                         |

正常終了した場合は、

```text
Parrying
↓
モーション終了
↓
ActionState = None
```

となります。

## パラメータ

Parry固有の主な調整項目を以下に示します。

| パラメータ                      | 内容                       | 値  |
| -------------------------- | ------------------------ | -- |
| `ParryMotionDuration`      | Parryモーション全体の時間          | 未定 |
| `ParryStartup`             | Parrying開始からパリィ判定開始までの時間 | 未定 |
| `ParryWindow`              | パリィ判定が有効な時間              | 未定 |
| `ParryRestartAcceptTiming` | Parry再入力を受け付け始めるタイミング    | 未定 |
| `ParryEvaluationWindow`    | 段階評価に使用するタイミング範囲         | 未定 |

`ParryRestartAcceptTiming`はRecovery Phase後半になるよう調整します。

具体的な時間は、連続パリィ時の操作感とモーションのつながりを確認しながら決定します。

## 各ページとの責務分離

| 内容                      | 管理ページ           |
| ----------------------- | --------------- |
| Parryingの開始・Phase・判定・終了 | 本ページ            |
| Parry再入力による再開始          | 本ページ            |
| 1回のParryingでパリィ可能な回数    | 本ページ            |
| パリィ成功・失敗・空振り            | 本ページ            |
| ActionState間の遷移可否       | Playerアクション遷移   |
| Aimingのカメラ・移動・向き制御      | Playerアクション｜照準  |
| Player通常移動の停止           | Player基本移動      |
| Grounded / Airborne     | Player移動仕様      |
| SmallHit / BigHitの判定    | Playerリアクション｜被弾 |
| PlayerのHP減少             | Playerステータス     |

## 未決事項

* パリィのタイミング評価を何段階にするか
* 段階評価ごとのタイミング範囲と効果
* `ParryRestartAcceptTiming`の具体的な位置
* 体当たりなど、邪音玉以外の攻撃をパリィした場合に敵をひるませるか
* パリィ成功時にHitStopを使用するか
* パリィ成功時の演出・SE・VFX

<PageRelations />
