---
title: Player状態
description: Palette BulletのPlayer状態仕様
pageType: spec
category: Player
order: 30
status: 仮仕様
---
# Playerステート

## 目的
本ページにはPlayerのステートの構造と、各ステートの簡単な詳細を記載します。
## Playerアクション・ステート・遷移ルール

Playerの各アクションについて、State上の管理先と、他アクションとの同時成立・遷移・中断ルールを以下に示す。

### 記号

* **○**：同時成立可能
* **→**：現在のアクションを終了して遷移可能
* **C→**：キャンセル受付タイミング以降のみ遷移可能
* **×**：現在のアクション終了まで開始不可、または入力を無視
* **強制→**：通常のキャンセル条件に関係なく現在のアクションを終了して遷移
* **継続**：他の状態が発生しても現在のアクションを維持

| 項目                | State上の管理       | 内容                                                | 同時成立できる主な行動                                 | 主な遷移                                                                                      | 実行中に禁止される行動                                                | 強制終了・特殊ルール                                                                                             |
| ----------------- | --------------- | ------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **通常移動**          | Stateにはしない      | WASDによる基本移動。`Grounded`または`Airborne`の中で入力に応じて移動する。 | Aim、MarkerFiring、ClickCharging、DragCharging | Jump → `Airborne` / Dash → `Dashing` / Parry → 停止して`Parrying`                             | Conversation、Interacting、Dead、Parrying、被弾中は移動不可            | Aim・MarkerFiring・DragCharging中は移動速度が低下する。ClickCharging中は通常速度。                                          |
| **Grounded**      | `MovementState` | Playerが地面に接地している状態。                               | 各種Gameplay Action                           | Jump入力 → `Airborne`                                                                       | ―                                                          | 「停止」「歩行」はStateに分けず、移動入力の有無で処理する。                                                                       |
| **Airborne**      | `MovementState` | Playerが空中にいる状態。WASDで多少の空中制御が可能。                   | MarkerFiring、ClickCharging、DragCharging     | 着地 → `Grounded`                                                                           | Dash開始、Aim開始、Parry開始                                       | Dash中にJumpした場合は、ダッシュの勢いを維持したまま`Airborne`へ移行する。                                                         |
| **Jump**          | Stateにはしない      | Groundedから上方向の速度を与えてAirborneへ移行させる単発アクション。        | ―                                           | `Grounded` → `Airborne` / `Dashing` → `Airborne`                                          | Aim、MarkerFiring、ClickCharging、DragCharging、Parrying中は開始不可 | Dash中からJumpした場合はDashの勢いを維持する。                                                                          |
| **Dashing**       | `ActionState`   | 入力方向へ高速移動するアクション。                                 | Jump                                        | Aim → Dash終了後Aiming / MarkerFire → Dash終了後MarkerFiring / DragCharge → Dash終了後DragCharging | ClickCharge、Parry、空中からのDash開始                              | Jumpでは勢いを維持してAirborneへ移行する。                                                                            |
| **Aiming**        | `AimState`      | カメラを寄せ、視野角・感度を変更し、照準用の低速移動へ切り替える。                 | 移動、MarkerFiring、ClickCharging、DragCharging  | Dash → Aim解除後Dashing / Parry → Aim解除後Parrying                                             | Jump、空中からのAim開始                                            | Aim中でもMarkerFire・ClickCharge・DragChargeを実行可能。                                                          |
| **MarkerFiring**  | `ActionState`   | 武器の先端からマーカーを発射する短時間アクション。                         | 移動、Aim                                      | Dash → **C→**                                                                             | Jump、ClickCharge、DragCharge、Parry、MarkerFire再入力            | 移動速度は低下する。発射中のMarkerFire再入力は無視する。Cancel受付タイミング以降はDashのみでキャンセル可能。Interact・Conversation・被弾・死亡では強制終了する。   |
| **ClickCharging** | `ActionState`   | 武器を短く振り、1つのシャオンダマを選択する短時間アクション。                   | 移動、Aim                                      | Dash → **C→**                                                                             | Jump、MarkerFire、DragCharge、Parry、ClickCharge再入力            | 移動速度は低下しない。ClickCharge再入力は終了まで無視する。Cancel受付タイミング以降はDashのみでキャンセル可能。Interact・Conversation・被弾・死亡では強制終了する。 |
| **DragCharging**  | `ActionState`   | 武器を使用して複数のシャオンダマを連続選択する継続アクション。                   | 移動、Aim                                      | Dash → **いつでも即時→**                                                                        | Jump、MarkerFire、ClickCharge、Parry                          | 移動速度は低下する。Dash入力ではいつでもDragChargeを終了してDashingへ遷移できる。小被弾ではDragChargeを継続する。大被弾では終了する。                     |
| **Parrying**      | `ActionState`   | 武器で敵の邪音玉を弾く。パリィモーション終了まで継続する。                     | なし                                          | 通常移動・AimからParry開始可能                                                                       | 移動、Jump、Dash、Aim、MarkerFire、ClickCharge、DragCharge         | 開始時に移動を停止し、Aim中の場合はAimを解除する。被弾・死亡などの強制イベントを除き、モーション終了まで他Actionへ遷移しない。                                  |
| **SmallHit**      | `ReactionState` | 小さい攻撃を受けた際の被弾リアクション。                              | DragChargingのみ継続可能                          | SmallHit → SmallHit再生し直し / BigHit → `BigHit`へ上書き                                          | 移動など通常操作                                                   | MarkerFire、ClickCharge、Dash、Aim、Parry、Interactなどは中断する。DragChargeだけは継続する。                               |
| **BigHit**        | `ReactionState` | 大きい攻撃を受けた際の被弾リアクション。                              | なし                                          | SmallHitからBigHitへ上書き可能                                                                    | 通常のGameplay Action                                         | すべての通常Actionを中断する。BigHit中にSmallHitまたはBigHitを受けても被弾モーションは再生し直さない。                                       |
| **Conversation**  | `RootState`     | NPCとの会話を行う状態。Playerは停止し、通常操作を行わない。                | なし                                          | Gameplay中のActionを強制終了してConversationへ遷移                                                    | Gameplay中の全Action、移動、被弾                                    | 会話開始時は現在のGameplay Actionを強制終了する。会話中は被弾しない。                                                             |
| **Interacting**   | `RootState`     | 宝箱を開ける、アイテムを拾う、ギミックを操作するなどの状態。                    | なし                                          | Gameplay中のActionを強制終了してInteractingへ遷移                                                     | Gameplay中の全Action、移動                                       | DragChargeなどの実行中でも強制終了してInteractを開始できる。被弾した場合はInteractを中断する。                                           |
| **Dead**          | `RootState`     | HPが0になり、死亡モーションを再生してPlayerを操作できなくする状態。            | なし                                          | HPが0になった時点で現在の状態から強制遷移                                                                    | すべてのPlayer操作                                               | すべてのGameplay Action、Reaction、Interactなどより優先して現在の行動を終了する。                                               |

### 短時間アクションのキャンセルルール

`MarkerFiring`と`ClickCharging`は、モーション内部に以下のタイミングを持つ。

`開始 → キャンセル不可区間 → キャンセル受付タイミング → キャンセル可能区間 → 終了タイミング → Action終了`

キャンセル可能区間で遷移できるActionは、現時点では**Dashingのみ**とする。

`MarkerFiring`または`ClickCharging`の終了前に同じActionが再入力された場合、先行入力として保持せず、入力を無視する。

### State構成

```text
Player

RootState
├─ Gameplay
│
│  ├─ MovementState
│  │   ├─ Grounded
│  │   └─ Airborne
│  │
│  ├─ ActionState
│  │   ├─ None
│  │   ├─ Dashing
│  │   ├─ MarkerFiring
│  │   ├─ ClickCharging
│  │   ├─ DragCharging
│  │   └─ Parrying
│  │
│  ├─ AimState
│  │   ├─ Normal
│  │   └─ Aiming
│  │
│  └─ ReactionState
│      ├─ None
│      ├─ SmallHit
│      └─ BigHit
│
├─ Conversation
├─ Interacting
└─ Dead
```

これに沿って、Playerの仕様ページも以下のような構造にします。
```
Player
│
├─ Player概要
├─ Player入力と操作
├─ Player状態
├─ Playerアクション遷移
│
├─ Player移動
│   ├─ 基本移動
│   ├─ ジャンプ
│   └─ ダッシュ
│
├─ Playerアクション
│   ├─ 照準
│   ├─ マーカー
│   ├─ チャージ
│   └─ パリィ
│
├─ Playerリアクション
│   └─ 被弾
│
├─ Playerインタラクション
│   ├─ Interact
│   └─ 会話
│
└─ Playerステータス
    ├─ 体力・スタミナ
    └─ 死亡
```
## RootState

### Gameplay

### Conversation

### Interacting

### Dead

## Gameplay中の並列StateMachine

### MovementState

### ActionState

### AimState

### ReactionState

## Action内部Phase

## StateMachine間の連携

## 遷移の管理

## Gameplay開始・終了時のState

## Stateから決定するPlayer挙動

## 未決事項

<PageRelations />
