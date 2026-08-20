---
title: "Playerインタラクション｜Interacting"
description: Palette BulletにおけるPlayerのInteracting仕様
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Playerインタラクション｜Interacting

## 目的

本ページでは、PlayerがNPCとの会話以外のInteractionを行う際に使用する`RootState = Interacting`について定義します。

本ページでは主に以下を扱います。

- Interactingの開始条件
- Interact対象の判定
- `Gameplay → Interacting`
- Interacting開始時のGameplay内部State終了
- Interacting中の操作制限
- Interacting中の移動
- Interactingの正常終了
- Interacting中の被弾
- 被弾によるInteraction中断
- Gameplayへ戻る際のState初期化
- Gameplay復帰時に再開しないもの
- Deadとの優先順位

Interact入力そのもののキー割当については「Player入力と操作」で定義します。

宝箱・アイテム・ギミックなど各Interact対象固有の処理については、それぞれの対象側の仕様で定義します。

## Interactingとは

`Interacting`は、NPCとの会話以外のInteraction中に使用するRootStateです。

主な対象は以下です。

- 宝箱
- アイテム
- ギミック
- ステージ選択
- 戦闘前の準備
- その他、Playerの通常Gameplay操作を停止して行うInteraction

```text
RootState
Gameplay
↓
Interaction開始
↓
Interacting
```

InteractingはGameplay内部のStateではありません。

そのため、Interactingへ遷移した時点でGameplay内部のStateMachineによる通常操作を終了します。

## Interact対象

Interactは、Playerが現在対象としているオブジェクトに対して操作を行うための入力です。

Interactingを使用する主な対象は以下です。

| 対象 | 使用するRootState |
| --- | --- |
| 宝箱 | `Interacting` |
| アイテム取得 | `Interacting` |
| ギミック操作 | `Interacting` |
| ステージ選択 | `Interacting` |
| 戦闘前の準備 | `Interacting` |

Interact対象固有の条件として、距離や進行状況などが必要な場合は対象側の仕様で定義します。

## Interacting開始条件

Interactingは、以下の条件を満たしている場合に開始できます。

- `RootState = Gameplay`
- `ReactionState = None`
- 有効なInteract対象が存在する
- 対象固有のInteraction開始条件を満たしている

`SmallHit`または`BigHit`中はInteractingを開始できません。

```text
ReactionState = SmallHit / BigHit
↓
Interact入力
↓
Interacting開始不可
```

## GameplayからInteractingへの遷移

会話以外のInteractionを開始する場合は、`RootState = Gameplay`から`Interacting`へ変更します。

```text
RootState = Gameplay
↓
対象へInteract
↓
Gameplay内部State終了
↓
RootState = Interacting
↓
Interaction処理開始
```

Interaction対象固有の開始処理については、対象側の仕様で定義します。

## Interacting開始時のGameplay内部State

GameplayからInteractingへ遷移する場合、現在のGameplay Actionを強制終了します。

基本的には以下の状態へ変更します。

```text
ActionState
現在のAction → None

AimState
Aiming → Normal

ReactionState
None
```

Interactingは`ReactionState = None`の場合のみ開始できるため、通常のInteracting開始時に`SmallHit`または`BigHit`が同時成立することはありません。

### Action実行中の場合

Interacting開始時には、現在のActionStateに関係なくGameplay Actionを終了します。

対象となる主なActionは以下です。

- `Dashing`
- `MarkerFiring`
- `ClickCharging`
- `DragCharging`
- `Parrying`

例えば、

```text
RootState   = Gameplay
ActionState = DragCharging
↓
Interacting開始
↓
DragCharging強制終了
↓
RootState = Interacting
```

となります。

Action強制終了時のAction固有処理については、それぞれのAction仕様を正とします。

例えばDragCharging中の選択内容の破棄については「Playerアクション｜チャージ」で定義します。

## Interacting開始時の先行入力

Interactingへの遷移によってGameplay Actionを強制終了した場合、保持しているAction先行入力を破棄します。

Aim開始要求を保持している場合も破棄します。

```text
Gameplay
↓
Action先行入力あり
↓
Interacting開始
↓
Gameplay Action強制終了
↓
先行入力破棄
```

Interacting終了後に、Interacting開始前のActionを自動的に再開することはありません。

## Interacting中の操作

Interacting中はGameplay中の通常操作を使用できません。

| Gameplay操作 | Interacting中 |
| --- | --- |
| Move | 使用不可 |
| Jump | 使用不可 |
| Dash | 使用不可 |
| Aim | 使用不可 |
| Marker | 使用不可 |
| Charge | 使用不可 |
| Parry | 使用不可 |
| 新しいInteract | 使用不可 |

Interaction専用の入力が必要な場合は、そのInteraction側で定義します。

## Interacting中の移動

Interacting中はPlayerの通常移動を行いません。

```text
RootState = Interacting
+
Move入力
↓
通常移動しない
```

Interacting開始時にはGameplay中の通常移動を停止します。

## Interactingの正常終了

Interaction対象側から処理完了が通知された場合、Interactingを終了してGameplayへ戻ります。

```text
RootState = Interacting
↓
Interaction完了
↓
RootState = Gameplay
```

Interactionごとの具体的な終了条件については対象側の仕様で定義します。

例えば、以下があります。

- 宝箱を開け終わる
- アイテム取得処理が終了する
- ギミック操作が完了する
- ステージ選択画面を閉じる
- 戦闘準備を完了する

## Interacting中の被弾

Interacting中は被弾できます。

Interacting中に被弾が成立した場合、現在のInteractionを中断します。

ReactionStateはGameplay内部のStateであるため、一度Gameplayへ戻してから被弾リアクションを開始します。

```text
RootState = Interacting
↓
攻撃を受ける
↓
Interacting中断
↓
RootState = Gameplay
↓
ActionState = None
AimState    = Normal
↓
ダメージ適用
↓
HP確認
│
├─ HP = 0
│   ↓
│   RootState = Dead
│
└─ HP > 0
    ↓
    ReactionState = SmallHit / BigHit
```

`MovementState`はGameplayへ戻った時点の接地状態から決定します。

```text
接地している
↓
MovementState = Grounded
```

```text
接地していない
↓
MovementState = Airborne
```

被弾処理の詳細については「Playerリアクション｜被弾」を正とします。

## 被弾中断時のInteraction処理

被弾によってInteractingが中断された場合、そのInteractionを正常完了として扱いません。

Interactionの途中状態を、

- 破棄する
- 元へ戻す
- 完了済みの処理だけ維持する

などの具体的な扱いは、各Interaction対象側で定義します。

本ページでは、**被弾によってInteracting RootStateを終了すること**までを共通仕様とします。

## Gameplayへの復帰

Interactingが正常終了した場合、RootStateをGameplayへ戻します。

Gameplayへ戻る際は、Gameplay内部Stateを初期化します。

基本状態は以下です。

```text
RootState     = Gameplay
ActionState   = None
AimState      = Normal
ReactionState = None
```

`MovementState`は、その時点のPlayerの接地状態から決定します。

```text
接地している
↓
MovementState = Grounded
```

```text
接地していない
↓
MovementState = Airborne
```

したがって、Gameplay復帰時の基本状態は例えば以下になります。

```text
RootState     = Gameplay
MovementState = Grounded
ActionState   = None
AimState      = Normal
ReactionState = None
```

## Gameplay復帰時に再開しないもの

Interacting開始前に行っていたGameplay操作は、復帰時に自動再開しません。

例えば、

```text
DragCharging
↓
Interacting開始
↓
DragCharging強制終了
↓
Interacting終了
↓
Gameplay
↓
ActionState = None
```

となります。

以下は自動復帰しません。

- Interacting開始前のActionState
- `Aiming`
- Action先行入力
- Aim開始要求
- Interacting開始前の被弾リアクション

Gameplayへ戻った後、新しい入力を受け取ってActionを開始します。

## 被弾中断後のGameplay復帰

Interacting中の被弾は正常終了とは異なります。

この場合はGameplayへ戻した後、そのままReactionStateを開始します。

```text
RootState = Interacting
↓
被弾
↓
RootState = Gameplay
↓
MovementState = 現在の接地状態
ActionState   = None
AimState      = Normal
ReactionState = SmallHit / BigHit
```

したがって、被弾による復帰時には`ReactionState = None`へ初期化しません。

通常のGameplay復帰より被弾処理を優先します。

## Deadとの関係

`Dead`はInteractingより優先されるRootStateです。

```text
RootState = Interacting
↓
死亡条件成立
↓
RootState = Dead
```

Deadへの遷移が成立した場合は、現在のInteractionを終了します。

特にInteracting中の被弾によってHPが0になった場合は、`SmallHit` / `BigHit`を開始せず、そのままDeadへ遷移します。

```text
RootState = Interacting
↓
被弾
↓
ダメージ適用
↓
HP = 0
↓
RootState = Dead
```

死亡処理については「Playerステータス」または「Player死亡」を正とします。

## RootState遷移一覧

Interactingに関係する主なRootState遷移を以下に示します。

| 現在のRootState | 条件 | 遷移先 |
| --- | --- | --- |
| `Gameplay` | Interaction開始 | `Interacting` |
| `Interacting` | Interaction正常終了 | `Gameplay` |
| `Interacting` | SmallHit / BigHit成立 | `Gameplay` + Reaction |
| `Interacting` | Dead条件成立 | `Dead` |

## 各ページとの責務分離

Interacting関連の仕様は、以下のように管理します。

| 内容 | 管理ページ |
| --- | --- |
| `Interacting`のRootState | 本ページ |
| `Gameplay → Interacting` | 本ページ |
| Interacting開始時のGameplay State終了 | 本ページ |
| Gameplay復帰時のState初期化 | 本ページ |
| Interacting中の被弾中断 | 本ページ / Playerリアクション｜被弾 |
| Interact入力のキー割当 | Player入力と操作 |
| Gameplay Actionの強制終了共通ルール | Playerアクション遷移 |
| Action強制終了時の固有処理 | 各Action仕様 |
| SmallHit / BigHit | Playerリアクション｜被弾 |
| 宝箱・ギミックなどの処理 | 各Interaction対象の仕様 |
| HP・Dead | Playerステータス / Player死亡 |

## 未決事項

- Interaction対象の検出方法
- 複数のInteract対象が存在する場合の選択優先順位
- Interact可能対象を示すUI
- InteractingをPlayer操作で途中キャンセルできるようにするか

<PageRelations />
