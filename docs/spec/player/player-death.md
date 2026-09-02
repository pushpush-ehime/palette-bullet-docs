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

本ページでは、PlayerのHPが0になった場合の`RootState = Dead`成立、Game Over候補の通知、およびGameが確定した最終Battle結果に従う死亡側の処理を定義します。

本ページでは主に以下を扱います。

- 死亡条件
- `RootState → Dead`
- Game Over候補の通知
- Deadの優先順位
- Dead開始時のState終了
- 先行入力の破棄
- 最終Battle結果確定後のClear／Game Over分岐
- Game Over確定時の死亡モーション
- Dead中の操作制限
- 共通Result画面のGame Over variantへの接続
- Retry
- ステージリスタート
- リスタート時のPlayer State初期化
- HP・スタミナの復元

HPやスタミナ自体については「Playerステータス」を正とします。

Battle結果の候補収集、同一フレームのClear優先規則、最終結果の確定、共通Result画面、およびResultからのrouteは[ゲーム全体](/spec/game/)を正とします。本ページではPlayer側の`Dead`成立と、確定結果を受けた後の死亡側処理だけを定義します。

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

死亡条件が成立した場合、現在行っているGameplay Action、被弾、Interactionなどを終了して、最終Battle結果の確定を待たずに`Dead`へ遷移します。

`Dead`の成立はPlayer内部状態の確定であり、最終Battle結果がGame Overに確定したことや、死亡演出を開始してよいことを意味しません。死亡演出、Game Over Result、およびRetry受付は、Gameから通知された最終Battle結果に従って開始します。

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
CurrentHP = 0
↓
死亡条件成立
↓
RootState = Dead
↓
GameへGame Over候補を通知
```

HPは死亡時に`0`として扱います。

`RootState = Dead`はHPが0になった時点で成立させます。Gameによる最終Battle結果の確定まで`Dead`遷移を保留しません。一方、Game Over候補の通知だけで死亡演出やGame Over Resultを開始してはいけません。

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
Game Over候補を通知
```

致死ダメージを受けた場合、最後の`SmallHit / BigHit`モーションを挟みません。

その後の死亡モーションは最終Battle結果がGame Overの場合だけ開始します。同一フレームのClearによって最終結果がClearとなった場合は、`Dead`を維持したまま死亡モーションを開始しません。


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
死亡時の`MovementState`が`Grounded / Airborne`のどちらであってもDeadへ遷移できます。

```text
MovementState = Airborne
↓
死亡条件成立
↓
Gameplay内部のMovementState管理終了
↓
RootState = Dead
```

Deadへ遷移した後は`MovementState`による空中制御を行いません。

ただし、Playerに作用する重力そのものは停止せず、空中で死亡した場合はDead中も落下を継続します。
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
GameへGame Over候補を通知
↓
RootState = Deadを維持したまま最終Battle結果を待つ
```

Playerの行動終了、先行入力破棄、`RootState = Dead`、および通常操作停止は、最終Battle結果の確定前でも直ちに成立します。死亡演出、Game Over Result、およびRetry受付はこの処理へ直結させません。

## Dead中の移動

Dead中はPlayerの通常移動およびPlayer入力による空中制御を行いません。

```text
RootState = Dead
+
Move入力
↓
通常移動しない
```

ただし、**Dead中も重力による落下は継続します。**

空中で死亡した場合は、Deadへ遷移してGameplay内部の`MovementState`管理を終了した後も、Playerは重力によって落下します。

```text
Airborne中
↓
死亡条件成立
↓
RootState = Dead
↓
通常移動・空中制御停止
↓
重力による落下継続
↓
地面へ着地
```

Dead中に地面へ到達した場合は、その位置で接地します。

Dead中に`MovementState = Grounded`へ遷移するわけではありません。

`MovementState`はGameplay内部のStateであるため、Dead中は管理しません。

死亡モーションによって必要な追加移動がある場合は、重力による落下とは別に死亡演出側の処理として扱います。

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

ResultのContinue／RetryはGameplay入力ではなく、Gameplay Stateから分離されたResult操作です。`RootState = Dead`を解除してResult操作を受け付けるのではなく、Game／UI側のResult受付gateに従います。

# 最終Battle結果確定後の分岐

Game Over候補を通知した後は、Gameから通知された最終Battle結果だけを使用してPlayerの死亡側処理を分岐します。Player側でHPやEnemy状態を再確認してBattle結果を決め直しません。

```text
CurrentHP = 0
↓
RootState = Dead
↓
Game Over候補を通知
↓
Gameが同一フレームのBattle終了候補を収集して最終結果を確定
│
├─ Clear
│   ↓
│   RootState = Deadを維持
│   ↓
│   死亡モーション／死亡演出・Game Over Result・Retry受付を開始しない
│   ↓
│   Clear Resultだけを表示
│
└─ Game Over
    ↓
    死亡モーション開始
    ↓
    Game Over Resultへ接続
```

## 同一フレームでClearが確定した場合

Playerの死亡条件とClear条件が同一フレームに成立した場合、GameはClearを最終Battle結果として確定します。

この場合も、すでに成立した次のPlayer状態は巻き戻しません。

- `CurrentHP = 0`
- `RootState = Dead`
- そのフレームまでにPlayerへ適用済みのDamageと状態変更

一方、最終結果はClearであるため、次のGame Over側処理は開始しません。

- 死亡モーション、およびGame Over向けの死亡演出
- Game Over Result
- Game Over専用の入力待機
- Retry受付

Playerは`RootState = Dead`を維持したままClear Resultへ接続します。現在のBattle内で`Gameplay`へ戻したり、死亡をなかったことにしたりしません。Clear ResultのContinueによる拠点／Stage選択への遷移は、Game／UI側の仕様に従います。

## Game Overが確定した場合

最終Battle結果がGame Overの場合に限り、Playerの死亡モーションと付随する死亡演出を開始し、その終了後に共通Result画面のGame Over variantへ接続します。

Game Over確定後も`RootState = Dead`を維持し、PlayerのGameplay操作は再開しません。RetryはGame Over Resultの操作が解禁された後にだけ受け付けます。

# 死亡モーション

死亡モーションおよび付随する死亡演出は`RootState = Dead`への遷移だけでは開始せず、最終Battle結果がGame Overに確定した後に開始します。

```text
RootState = Dead
+
最終Battle結果 = Game Over
↓
死亡モーション開始
↓
死亡モーション終了
↓
共通Result画面のGame Over variant
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
RootState = Dead
↓
最終Battle結果を待つ
│
├─ Clear：死亡モーションを開始しない
└─ Game Over：死亡モーションを開始する
```

致死時は被弾Reactionより`Dead`を優先しますが、死亡モーションの開始可否は最終Battle結果に従います。


# Game Over Result

従来「死亡画面」としていた画面は、共通Result画面の`Game Over` variantとして扱います。Player側から独立した死亡画面用RootStateは追加しません。

```text
最終Battle結果 = Game Over
↓
死亡モーション
↓
Game Over Result表示
```

Game Over Result表示中もPlayerの`RootState`は`Dead`のままとします。UI側でPlayer HPを参照してGame Overを再判定せず、Gameから通知された確定結果だけを表示します。

同一フレームのClearによって最終Battle結果がClearとなった場合は、Game Over Resultを表示せず、Clear variantだけを表示します。

Game Over Resultには、現在のStageを最初から再開する`Retry`を表示します。Result操作のlockと解禁条件は[ゲーム全体](/spec/game/)およびUI仕様を正とします。


# Retry

RetryはGame Over Resultからのみ受け付けます。Retryを選択した場合、終了したBattleの状態を再利用せず、現在のステージを新しいBattleとして最初からやり直します。

```text
最終Battle結果 = Game Over
↓
死亡モーション
↓
Game Over Result
↓
Result操作解禁後にRetry
↓
旧Battleの状態を破棄
↓
現在のステージを最初から開始
```

死亡地点からその場で復活する方式は使用しません。

チェックポイントからの復帰も、現在の仕様では使用しません。

同一フレームのClearによって最終Battle結果がClearとなった場合はRetryを受け付けません。


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


## Retry時のMode／Conduct

Retryでは、Player側から見たMode／Conductを次の状態から開始します。

- 使用中モードをモード1へ戻す
- 未適用のモード変更要求を解除する
- 進行中のモード切替クールタイムを解除する
- Player側の選択中コンダクトを解除し、コンダクト未選択状態から開始する
- 前回のStage挑戦でAttackEvent occurrenceへ付与済みだったコンダクトを持ち越さない

一方、拠点で作ったモード2～4の構成内容は失いません。これらはPlayer Stateの初期化とは別のMode／Conduct固有のRetry結果です。詳細は[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)を正本とし、本ページではPlayer側のRetry結果だけを扱います。


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

Retryでは旧BattleのRuntime状態を再利用せず、新しいBattle IDを持つBattleとして現在のステージを最初からやり直します。

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

Game Over時の`Dead`は、Retryによって新しいステージ開始処理へ移行し、Playerを初期化する際に終了します。

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

同一フレームClear時は、現在のBattle内で`Dead`を終了しません。Clear ResultのContinueによって拠点／Stage選択へ遷移するまで`Dead`を維持し、遷移先SceneのPlayer初期化によってそのSceneの初期`RootState`を設定します。

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
    Game Over候補を通知
    ↓
    Gameが最終Battle結果を確定
    │
    ├─ Clear
    │   ↓
    │   RootState = Deadを維持
    │   ↓
    │   死亡モーション／死亡演出・Game Over Result・Retryなし
    │   ↓
    │   Clear Result
    │
    └─ Game Over
        ↓
        死亡モーション
        ↓
        Game Over Result
        ↓
        Retry
        ↓
        現在のステージを最初から開始
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
| `Dead` | Game Over ResultのRetryによる新しいステージ開始 | `Gameplay` |
| `Dead` | 同一フレームClear後のContinue | 現在Battleでは`Dead`を維持し、遷移先Sceneの初期`RootState`へ初期化 |

## 各ページとの責務分離

| 内容 | 管理ページ |
| --- | --- |
| `Dead` RootState | 本ページ |
| HP 0による死亡条件成立とGame Over候補通知 | 本ページ |
| Battle終了候補の収集、Clear優先、最終Battle結果の確定 | ゲーム全体 |
| 同一フレームClear時の`Dead`維持と死亡側演出の抑止 | ゲーム全体 / 本ページ |
| Game Over確定後の死亡モーション | 本ページ |
| 共通Result画面のvariantと表示 | ゲーム全体 / UI |
| Result操作のlock・解禁とContinue／Retry route | ゲーム全体 / UI |
| Retry時のPlayer初期化 | 本ページ |
| Mode／Conduct固有のRetry結果 | [Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct) |
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
- Game Over Resultの具体的なレイアウト・表示文言
- Retry選択までの操作方法
- ステージリスタート時のロード・フェード演出

<PageRelations />
