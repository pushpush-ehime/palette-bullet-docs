---
title: "Playerインタラクション｜Conversation"
description: Palette BulletにおけるPlayerのConversation仕様
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Playerインタラクション｜Conversation

## 目的

本ページでは、PlayerがNPCと会話する際に使用する`RootState = Conversation`について定義します。

本ページでは主に以下を扱います。

- Conversationの開始条件
- `Gameplay → Conversation`
- Conversation開始時のGameplay内部State終了
- Conversation中の操作制限
- Conversation中の移動
- Conversation中の被弾無効
- Conversationの正常終了
- Gameplayへ戻る際のState初期化
- Gameplay復帰時に再開しないもの
- Deadとの優先順位

Interact入力そのもののキー割当については「Player入力と操作」で定義します。

NPCごとの会話内容、会話送り、選択肢、会話終了条件などについては、会話側の仕様で定義します。

## Conversationとは

`Conversation`は、NPCとの会話中に使用するRootStateです。

```text
RootState
Gameplay
↓
NPCとの会話開始
↓
Conversation
```

ConversationはGameplay内部のStateではありません。

そのため、Conversationへ遷移した時点でGameplay内部のStateMachineによる通常操作を終了します。

## Conversation開始条件

Conversationは、以下の条件を満たしている場合に開始できます。

- `RootState = Gameplay`
- `ReactionState = None`
- 有効な会話対象のNPCが存在する
- NPC固有の会話開始条件を満たしている

`SmallHit`または`BigHit`中はConversationを開始できません。

```text
ReactionState = SmallHit / BigHit
↓
Interact入力
↓
Conversation開始不可
```

距離や進行状況など、NPC固有の会話開始条件については会話側の仕様で定義します。

## GameplayからConversationへの遷移

NPCに対するInteractが成立した場合、`RootState = Gameplay`から`Conversation`へ変更します。

```text
RootState = Gameplay
↓
NPCへInteract
↓
Gameplay内部State終了
↓
RootState = Conversation
↓
会話開始
```

会話システム自体の開始処理や表示内容については、会話側の仕様で定義します。

## Conversation開始時のGameplay内部State

GameplayからConversationへ遷移する場合、現在のGameplay Actionを強制終了します。

基本的には以下の状態へ変更します。

```text
ActionState
現在のAction → None

AimState
Aiming → Normal

ReactionState
None
```

Conversationは`ReactionState = None`の場合のみ開始できるため、通常のConversation開始時に`SmallHit`または`BigHit`が同時成立することはありません。

### Action実行中の場合

Conversation開始時には、現在のActionStateに関係なくGameplay Actionを終了します。

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
Conversation開始
↓
DragCharging強制終了
↓
RootState = Conversation
```

となります。

Action強制終了時のAction固有処理については、それぞれのAction仕様を正とします。

## Conversation開始時の先行入力

Conversationへの遷移によってGameplay Actionを強制終了した場合、保持しているAction先行入力を破棄します。

Aim開始要求を保持している場合も破棄します。

```text
Gameplay
↓
Action先行入力あり
↓
Conversation開始
↓
Gameplay Action強制終了
↓
先行入力破棄
```

Conversation終了後に、Conversation開始前のActionを自動的に再開することはありません。

## Conversation中の操作

Conversation中はGameplay中の通常操作を使用できません。

主な操作は以下のように扱います。

| Gameplay操作 | Conversation中 |
| --- | --- |
| Move | 使用不可 |
| Jump | 使用不可 |
| Dash | 使用不可 |
| Aim | 使用不可 |
| Marker | 使用不可 |
| Charge | 使用不可 |
| Parry | 使用不可 |
| Interactによる新規Interaction | 使用不可 |

会話選択肢の決定や会話送りなど、Conversation専用の入力が必要な場合は会話システム側で定義します。

## Conversation中の移動

Conversation中はPlayerの通常移動を行いません。

```text
RootState = Conversation
+
Move入力
↓
通常移動しない
```

Conversation開始時には、Gameplay中の通常移動を停止します。

## Conversation中の被弾

Conversation中はPlayerへの被弾を成立させません。

```text
RootState = Conversation
↓
敵攻撃判定
↓
被弾しない
```

そのためConversation中は、以下のように扱います。

- HPダメージを受けない
- `SmallHit`を開始しない
- `BigHit`を開始しない
- Conversationを被弾によって中断しない

Conversation中の被弾無効は、Conversation RootStateそのもののルールとして扱います。

## Conversation終了

会話が終了した場合、Conversationを終了してGameplayへ戻ります。

```text
RootState = Conversation
↓
会話終了
↓
RootState = Gameplay
```

会話がどの条件で終了するかについては、会話システム側の仕様で定義します。

## Gameplayへの復帰

Conversationが正常終了した場合、RootStateをGameplayへ戻します。

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

Conversation開始前に行っていたGameplay操作は、復帰時に自動再開しません。

例えば、

```text
DragCharging
↓
Conversation開始
↓
DragCharging強制終了
↓
Conversation終了
↓
Gameplay
↓
ActionState = None
```

となります。

以下は自動復帰しません。

- Conversation開始前のActionState
- `Aiming`
- Action先行入力
- Aim開始要求
- Conversation開始前の被弾リアクション

Gameplayへ戻った後、新しい入力を受け取ってActionを開始します。

## Deadとの関係

`Dead`はConversationより優先されるRootStateです。

```text
RootState = Conversation
↓
死亡条件成立
↓
RootState = Dead
```

Deadへの遷移が成立した場合は、現在のConversationを終了します。

死亡処理については「Playerステータス」または「Player死亡」を正とします。

## RootState遷移一覧

Conversationに関係する主なRootState遷移を以下に示します。

| 現在のRootState | 条件 | 遷移先 |
| --- | --- | --- |
| `Gameplay` | NPCとの会話開始 | `Conversation` |
| `Conversation` | 会話正常終了 | `Gameplay` |
| `Conversation` | Dead条件成立 | `Dead` |

Conversation中の通常攻撃では被弾が成立しないため、被弾によるGameplayへの遷移は行いません。

## 各ページとの責務分離

Conversation関連の仕様は、以下のように管理します。

| 内容 | 管理ページ |
| --- | --- |
| `Conversation`のRootState | 本ページ |
| `Gameplay → Conversation` | 本ページ |
| Conversation開始時のGameplay State終了 | 本ページ |
| Gameplay復帰時のState初期化 | 本ページ |
| Conversation中の被弾無効 | 本ページ |
| Interact入力のキー割当 | Player入力と操作 |
| Gameplay Actionの強制終了共通ルール | Playerアクション遷移 |
| Action強制終了時の固有処理 | 各Action仕様 |
| NPCごとの会話内容 | 会話側の仕様 |
| 会話送り・選択肢操作 | 会話側の仕様 |
| HP・Dead | Playerステータス / Player死亡 |

## 未決事項

- 会話対象NPCの検出方法
- 複数の会話対象が存在する場合の選択優先順位
- 会話可能対象を示すUI
- Conversation中の会話送り・選択肢操作
- ConversationをPlayer操作で途中終了できるようにするか

<PageRelations />
