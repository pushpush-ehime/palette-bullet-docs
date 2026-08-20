---
title: "Player死亡"
description: Palette BulletにおけるPlayerの死亡・Dead・リスタート仕様
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Player死亡

## 目的

本ページでは、PlayerのHPが0になった場合の死亡処理と`RootState = Dead`について定義します。

本ページでは主に以下を扱います。

- 死亡条件
- `RootState → Dead`
- Deadの優先順位
- Dead開始時のState終了
- 先行入力の破棄
- 死亡モーション
- Dead中の操作制限
- 死亡画面
- Retry
- ステージリスタート
- リスタート時のPlayer State初期化
- HP・スタミナの復元

HPやスタミナ自体については「Playerステータス」を正とします。

## Deadとは

`Dead`は、Playerが死亡して通常操作できない状態を表すRootStateです。

```text
RootState
├─ Gameplay
├─ Conversation
├─ Interacting
└─ Dead
```

Deadは他のPlayer Stateより優先します。

死亡条件が成立した場合、現在行っているGameplay Action、被弾、Interactionなどを終了して`Dead`へ遷移します。

---

## 死亡条件

基本的な死亡条件は、

```text
CurrentHP <= 0
```

です。

ダメージ適用後に現在HPを確認し、HPが0以下になった場合に死亡条件成立とします。

```text
被弾成立
↓
ダメージ適用
↓
CurrentHP <= 0
↓
死亡条件成立
```

HPは死亡時に`0`として扱います。

## 被弾による死亡

敵の攻撃によってHPが0になった場合は、通常の被弾リアクションよりDeadを優先します。

```text
攻撃命中
↓
ダメージ適用
↓
HP確認
↓
HP = 0
↓
SmallHit / BigHitを開始しない
↓
RootState = Dead
↓
死亡モーション
```

致死ダメージを受けた場合、最後の`SmallHit / BigHit`モーションを挟みません。

そのまま死亡モーションへ移行します。


## Deadの優先順位

`Dead`はPlayer Stateの中で最優先とします。

死亡条件が成立した場合、現在のStateに関係なくDeadへ遷移します。

主な例は以下です。

```text
Gameplay
↓
Dead
```

```text
Interacting
↓
Dead
```

```text
Conversation
↓
Dead
```

通常の攻撃ではConversation中に被弾しませんが、その他の理由で死亡条件が成立した場合はDeadを優先します。

## Gameplay中のDead遷移

Gameplay中に死亡条件が成立した場合、Gameplay内部Stateをすべて終了します。

基本的な処理は以下です。

```text
RootState = Gameplay
↓
死亡条件成立
↓
Gameplay内部State終了
↓
RootState = Dead
```

終了対象は以下です。

```text
MovementState
Gameplay管理終了

ActionState
現在のAction終了

AimState
Aiming終了

ReactionState
現在のReaction終了
```

DeadはGameplay外のRootStateであるため、Dead中はGameplay内部StateMachineによる通常処理を行いません。

## ActionStateの終了

死亡時は、現在のActionStateに関係なくActionを強制終了します。

対象となるActionは以下です。

- `Dashing`
- `MarkerFiring`
- `ClickCharging`
- `DragCharging`
- `Parrying`

```text
ActionState = 任意のAction
↓
死亡条件成立
↓
Action強制終了
↓
RootState = Dead
```

Action終了時のAction固有処理については、それぞれのAction仕様を正とします。

死亡による終了は正常終了として扱いません。

## AimStateの終了

Aiming中に死亡条件が成立した場合、Aimingを終了します。

```text
AimState = Aiming
↓
死亡条件成立
↓
Aim終了
↓
RootState = Dead
```

死亡後にAimingを自動再開しません。

## ReactionStateの終了

SmallHit中に追加ダメージを受け、HPが0になった場合は現在のSmallHitを終了してDeadへ遷移します。

```text
ReactionState = SmallHit
↓
追加被弾
↓
HP = 0
↓
SmallHit終了
↓
RootState = Dead
```

BigHit中は無敵であるため通常の追加攻撃ではダメージを受けません。

その他の理由で死亡条件が成立した場合は、BigHit中であってもDeadを優先します。


## Interacting中の死亡

Interacting中の被弾によってHPが0になった場合は、Gameplayへ戻してReactionを開始する処理よりDeadを優先します。

```text
RootState = Interacting
↓
被弾
↓
ダメージ適用
↓
HP = 0
↓
Interaction中断
↓
RootState = Dead
```

`SmallHit / BigHit`は開始しません。

Interaction固有のキャンセル処理については「Playerインタラクション｜Interacting」を正とします。

## Conversation中の死亡

Conversation中は通常の敵攻撃による被弾を受けません。

ただし、何らかのゲーム処理によって死亡条件が成立した場合はConversationを終了してDeadへ遷移します。

```text
RootState = Conversation
↓
死亡条件成立
↓
Conversation終了
↓
RootState = Dead
```

## 死亡時の先行入力

死亡時には、保持しているPlayer入力をすべて破棄します。

主な対象は以下です。

- Action先行入力
- Aim開始要求
- Dash中に保持していた次Action
- その他Gameplay Action開始要求

```text
先行入力あり
↓
死亡条件成立
↓
先行入力破棄
↓
RootState = Dead
```

死亡後に、死亡前の入力を自動的に実行しません。


# Dead開始時の処理

死亡条件成立後は以下の順序で処理します。

```text
死亡条件成立
↓
CurrentHP = 0
↓
現在のPlayer行動を終了
↓
先行入力を破棄
↓
RootState = Dead
↓
通常操作停止
↓
死亡モーション開始
```

## Dead中の移動

Dead中はPlayerの通常移動を行いません。

```text
RootState = Dead
+
Move入力
↓
通常移動しない
```

死亡モーションによって必要な移動がある場合は、死亡演出側の処理として扱います。

## Dead中の操作

Dead中はGameplay操作を使用できません。

| Gameplay操作 | Dead中 |
| --- | --- |
| Move | 使用不可 |
| Jump | 使用不可 |
| Dash | 使用不可 |
| Aim | 使用不可 |
| Marker | 使用不可 |
| Charge | 使用不可 |
| Parry | 使用不可 |
| Interact | 使用不可 |

Dead中に行われたGameplay入力は先行入力として保持しません。

# 死亡モーション

Deadへ遷移した直後に死亡モーションを開始します。

```text
RootState = Dead
↓
死亡モーション開始
↓
死亡モーション終了
↓
死亡画面
```

死亡モーション中も`RootState = Dead`を維持します。

死亡モーション専用の別Stateは作成しません。


## 致死被弾時のモーション

HPを0にした攻撃がSmallHitまたはBigHitに設定されている場合でも、通常の被弾モーションは再生しません。

```text
攻撃
↓
HP = 0
↓
被弾Reactionをスキップ
↓
死亡モーション
```

死亡モーションを優先します。


# 死亡画面

死亡モーション終了後、リザルトまたは死亡画面を表示します。

```text
死亡モーション終了
↓
死亡画面表示
```

死亡画面表示中もPlayerの`RootState`は`Dead`のままとします。

死亡画面を新しいPlayer RootStateとして追加しません。

死亡画面側では、ステージをやり直すための`Retry`を実行できます。


# Retry

Retryを選択した場合、現在のステージを最初からやり直します。

```text
Dead
↓
死亡モーション
↓
死亡画面
↓
Retry
↓
ステージを最初から開始
```

死亡地点からその場で復活する方式は使用しません。

チェックポイントからの復帰も、現在の仕様では使用しません。


## Retry時のPlayerステータス

ステージリスタート時にはHPとスタミナを最大値へ戻します。

```text
CurrentHP      = MaxHP
CurrentStamina = MaxStamina
```

死亡前のHP・スタミナは引き継ぎません。


## Retry時のPlayer State

ステージ開始時はPlayer Stateを初期状態へ戻します。

基本状態は以下です。

```text
RootState     = Gameplay
ActionState   = None
AimState      = Normal
ReactionState = None
```

`MovementState`はステージ開始地点の接地状態から決定します。

通常のステージ開始地点が地上であれば、

```text
RootState     = Gameplay
MovementState = Grounded
ActionState   = None
AimState      = Normal
ReactionState = None
```

となります。


## Retry時に引き継がないもの

死亡前のGameplay状態はリスタート後に引き継ぎません。

以下はすべて破棄します。

- 死亡前の`MovementState`
- 死亡前の`ActionState`
- `Aiming`
- `SmallHit / BigHit`
- Action先行入力
- Aim開始要求
- DragCharging中の選択状態
- Dashingの内部Phase
- Parryingの内部Phase

リスタート後はステージ開始時の初期状態からゲームを開始します。


## ステージ側のリセット

Retryではステージを最初からやり直します。

ただし、

- Enemyの復活
- AttackEventのリセット
- シャオンダマのリセット
- BGMの再開始
- ギミック状態
- 戦闘進行状況

などPlayer以外のステージリセット処理については、それぞれのシステム側で定義します。

本ページではPlayer側の死亡・復帰処理のみを定義します。


## Dead終了

DeadはRetryによって新しいステージ開始処理へ移行する際に終了します。

```text
RootState = Dead
↓
Retry
↓
ステージ初期化
↓
Player初期化
↓
RootState = Gameplay
```

Deadから直接Gameplayへその場で復活する処理は行いません。

## 死亡処理の全体フロー

```text
Player被弾
↓
ダメージ適用
↓
HP確認
│
├─ HP > 0
│   ↓
│   SmallHit / BigHit
│
└─ HP = 0
    ↓
    現在のPlayer State終了
    ↓
    先行入力破棄
    ↓
    RootState = Dead
    ↓
    死亡モーション
    ↓
    死亡画面
    ↓
    Retry
    ↓
    ステージを最初から開始
    ↓
    HP / Stamina全回復
    ↓
    Player State初期化
    ↓
    RootState = Gameplay
```


## RootState遷移一覧

Deadに関係する主なRootState遷移を以下に示します。

| 現在のRootState | 条件 | 遷移先 |
| --- | --- | --- |
| `Gameplay` | 死亡条件成立 | `Dead` |
| `Interacting` | 死亡条件成立 | `Dead` |
| `Conversation` | 死亡条件成立 | `Dead` |
| `Dead` | Retryによるステージ再開始 | `Gameplay` |

## 各ページとの責務分離

| 内容 | 管理ページ |
| --- | --- |
| `Dead` RootState | 本ページ |
| 死亡条件成立後の処理 | 本ページ |
| 死亡モーション | 本ページ |
| 死亡画面への移行 | 本ページ |
| Retry時のPlayer初期化 | 本ページ |
| HP・スタミナ | Playerステータス |
| ダメージ・被弾 | Playerリアクション｜被弾 |
| Gameplay Action終了 | Playerアクション遷移 / 各Action仕様 |
| Interacting中の死亡 | 本ページ / Playerインタラクション｜Interacting |
| Conversation | Playerインタラクション｜Conversation |
| ステージ全体の再初期化 | ステージ側の仕様 |

## 未決事項

- 死亡モーションの具体的な内容
- 死亡モーションの長さ
- 死亡時のSE・VFX・カメラ演出
- 死亡画面の具体的なUI
- Retry選択までの操作方法
- ステージリスタート時のロード・フェード演出

<PageRelations />
