---
title: "Playerリアクション｜被弾"
description: Palette BulletにおけるPlayerの被弾リアクション仕様
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Playerリアクション｜被弾

## 目的

本ページでは、Playerが敵の攻撃を受けた際の被弾処理と`ReactionState`について定義します。

本ページでは主に以下を扱います。

* `SmallHit / BigHit`の判定
* `ReactionState`の開始・終了
* 被弾時のダメージ
* ActionStateの共通中断
* Aimingの解除
* 被弾中の通常移動停止
* Reaction固有の強制移動
* SmallHit中の追加被弾
* BigHit中の追加被弾と無敵
* Reaction中の入力
* Interacting中の被弾
* HPが0になった場合のDead遷移

各Actionが被弾によって終了した際のAction固有処理については、それぞれのAction仕様で定義します。

例えば、DragCharging中断時の選択内容や`miss`の扱いなどは「Playerアクション｜チャージ」を正とします。

HPの最大値やダメージによるHP減少処理については「Playerステータス」で定義します。

## ReactionState

Gameplay中の被弾状態は、`ReactionState`によって管理します。

```text
ReactionState
├─ None
├─ SmallHit
└─ BigHit
````

### None

被弾リアクションを行っていない通常状態です。

通常のGameplayでは、

```text
ReactionState = None
```

となります。

### SmallHit

小さい被弾リアクションを再生している状態です。

SmallHit成立時は、実行中の通常Actionを強制終了し、Aimingも終了します。

SmallHit中は通常のGameplay操作を停止します。

また、SmallHit固有のノックバックや強制移動は発生しません。

```text
SmallHit
↓
通常Move入力による移動停止
↓
Reaction固有の強制移動なし
```

SmallHit中も新しい攻撃による被弾は成立します。

### BigHit

大きい被弾リアクションを再生している状態です。

BigHit成立時は、実行中の通常Actionを強制終了し、Aimingも終了します。

BigHit中は通常のGameplay操作を停止します。

`MovementState = Grounded`の場合は、BigHit固有の地上ノックバックを発生させます。

```text
BigHit
↓
通常Move入力による移動停止
↓
Reaction固有の地上ノックバック
```

また、**BigHit中は無敵状態**とし、新しい攻撃によるダメージや追加の被弾リアクションを受けません。

## SmallHit / BigHitの決定

SmallHitまたはBigHitのどちらを発生させるかは、**攻撃側のデータによって指定します。**

Player側でダメージ量から自動的に判定しません。

攻撃側は被弾種類として、以下のいずれかを持ちます。

```text
HitReactionType
├─ Small
└─ Big
```

攻撃がPlayerへ命中した際、攻撃側に設定された`HitReactionType`を使用してReactionStateを決定します。

```text
HitReactionType = Small
↓
ReactionState = SmallHit
```

```text
HitReactionType = Big
↓
ReactionState = BigHit
```

これにより、ダメージ量とは独立して被弾リアクションの強さを設定できます。

## 被弾成立

Playerへ攻撃が命中した場合、まず現在の状態でその攻撃による被弾が成立するかを確認します。

被弾が成立した場合は、

1. ダメージを適用する
2. HPが0になったか確認する
3. HPが残っている場合はReactionStateを変更する
4. 実行中のActionを強制終了する
5. Aimingを終了する
6. Reaction固有の移動処理を適用する
7. 被弾リアクションを再生する

という流れで処理します。

```text
攻撃命中
↓
被弾可能か確認
↓
ダメージ適用
↓
HP確認
│
├─ HP = 0
│   ↓
│   Dead
│
└─ HP > 0
    ↓
    ReactionState変更
    ↓
    Action / Aim終了
    ↓
    Reaction固有処理
    ↓
    被弾リアクション
```

`Dead`が成立する場合はSmallHit / BigHitを開始しません。

## 通常状態からの被弾

`ReactionState = None`の状態で攻撃を受けた場合、攻撃側の`HitReactionType`に応じたReactionStateへ遷移します。

### SmallHit

```text
ReactionState = None
↓
Small攻撃を受ける
↓
ダメージ適用
↓
ReactionState = SmallHit
```

### BigHit

```text
ReactionState = None
↓
Big攻撃を受ける
↓
ダメージ適用
↓
ReactionState = BigHit
```

## 被弾時のAction中断

SmallHitまたはBigHitが成立した場合、通常のActionState遷移や通常Action入力よりReactionStateによる割り込みを優先します。

現在は、SmallHitによって継続するActionStateの例外を設けません。

SmallHit / BigHitのどちらでも、実行中の通常Actionを強制終了します。

| 現在のActionState  | SmallHit | BigHit |
| --------------- | -------- | ------ |
| `None`          | そのまま     | そのまま   |
| `Dashing`       | 強制終了     | 強制終了   |
| `MarkerFiring`  | 強制終了     | 強制終了   |
| `ClickCharging` | 強制終了     | 強制終了   |
| `DragCharging`  | **強制終了** | 強制終了   |
| `Parrying`      | 強制終了     | 強制終了   |

Action実行中に被弾が成立した場合は、共通して以下のように遷移します。

```text
ActionState   = 対象Action
ReactionState = None
↓
SmallHit / BigHit成立
↓
Action強制終了
↓
ActionState   = None
ReactionState = SmallHit / BigHit
```

例えばDragCharging中にSmallHitが成立した場合も、他のActionと同様に強制終了します。

```text
ActionState   = DragCharging
ReactionState = None
↓
SmallHit
↓
DragCharging強制終了
↓
ActionState   = None
ReactionState = SmallHit
```

DragCharging中に選択していたシャオンダマの扱いや、Charge中断を`miss`として扱うかなどのAction固有処理は「Playerアクション｜チャージ」を正とします。

他のActionについても、中断後の固有処理は各Action仕様を正とします。

## 被弾時のAim解除

SmallHitまたはBigHitが成立した場合、Aimingを終了します。

```text
AimState      = Aiming
ReactionState = None
↓
SmallHit / BigHit
↓
AimState      = Normal
ReactionState = SmallHit / BigHit
```

ActionとAimingが同時成立している場合は、両方を終了します。

例えば、

```text
ActionState   = DragCharging
AimState      = Aiming
ReactionState = None
↓
SmallHit
↓
ActionState   = None
AimState      = Normal
ReactionState = SmallHit
```

となります。

被弾終了後にAimingを自動的に再開しません。

## 被弾中の移動

SmallHitまたはBigHit中は、Move入力による通常移動を行いません。

```text
ReactionState = SmallHit / BigHit
+
Move入力
↓
通常移動を行わない
```

ただし、**通常移動を停止することと、Reaction固有の強制移動を停止することは別です。**

SmallHitとBigHitでは、Reaction固有の強制移動が異なります。

| ReactionState | Move入力による通常移動 | Reaction固有の強制移動    |
| ------------- | ------------- | ------------------ |
| `SmallHit`    | 不可            | なし                 |
| `BigHit`      | 不可            | Grounded時に地上ノックバック |

通常移動の制限については「Player基本移動」を正とします。

### SmallHitの移動

SmallHit中はMove入力による通常移動を停止します。

SmallHit固有のノックバックや強制移動は発生しません。

```text
ReactionState = SmallHit
+
Move入力
↓
通常移動なし
+
Reaction固有の強制移動なし
```

SmallHitになったこと自体を理由にPlayerの位置を強制的に変更しません。

### BigHitの移動

BigHit中もMove入力による通常移動は行いません。

ただし、`MovementState = Grounded`の場合はBigHit固有の地上ノックバックを発生させます。

```text
MovementState = Grounded
ReactionState = BigHit
↓
通常Move入力による移動停止
↓
BigHit固有の地上ノックバック
```

このノックバックはMove入力による通常移動ではありません。

ReactionによってPlayerへ与えられる強制移動として扱います。

```text
ReactionState = BigHit
+
Move入力
↓
通常移動は行わない

ただし
↓
BigHit固有の地上ノックバックは発生
```

地上ノックバックの具体的な距離、速度、方向、減速方法などは本ページでは固定しません。

### MovementStateとの関係

SmallHit / BigHitが成立したこと自体を理由に、`MovementState`を直接変更しません。

```text
MovementState = Grounded
↓
SmallHit
↓
MovementState = Grounded
ReactionState = SmallHit
```

BigHitの場合も同様です。

```text
MovementState = Grounded
↓
BigHit
↓
MovementState = Grounded
ReactionState = BigHit
↓
地上ノックバック
```

BigHitによって直接、

```text
Grounded → Airborne
```

へ変更することはありません。

ただし、BigHitの地上ノックバックによってPlayerが崖や足場の外へ移動し、接地を失った場合は、通常の接地判定によって`Airborne`へ遷移します。

```text
MovementState = Grounded
ReactionState = BigHit
↓
地上ノックバック
↓
接地喪失
↓
MovementState = Airborne
ReactionState = BigHit
```

これはBigHit固有のState遷移ではなく、接地を失ったことによる通常の`Grounded → Airborne`です。

### Airborne中のBigHit

今回定義するBigHit固有のノックバックは、Grounded時の地上ノックバックです。

Airborne中のBigHitに対して、新しい空中ノックバック・吹き飛ばし・打ち上げは本ページでは定義しません。

BigHitが成立したこと自体を理由に`MovementState`を変更しないという基本ルールは、Airborne時にも同じです。

## SmallHit中の追加被弾

SmallHit中にも被弾判定は有効です。

追加攻撃が成立した場合、その攻撃によるダメージを受けます。

その後、攻撃側の`HitReactionType`に応じてReactionStateを処理します。

### SmallHit中にSmallHit

SmallHit中に再びSmallHitを受けた場合、ダメージを受け、SmallHitリアクションを最初から再生し直します。

```text
ReactionState = SmallHit
↓
Small攻撃
↓
ダメージ適用
↓
SmallHitを最初から再生
↓
ReactionState = SmallHit
```

SmallHitの残り時間は引き継がず、新しいSmallHitとしてリアクション時間を最初から開始します。

この連続被弾によってSmallHitが連続することは、現在の仕様として許可します。

### SmallHit中にBigHit

SmallHit中にBigHitを受けた場合、ダメージを受け、SmallHitを終了してBigHitへ上書きします。

```text
ReactionState = SmallHit
↓
Big攻撃
↓
ダメージ適用
↓
SmallHit終了
↓
ReactionState = BigHit
```

BigHitへの上書き後は、BigHitのリアクションを最初から再生します。

Groundedの場合は、BigHitへの遷移に伴ってBigHit固有の地上ノックバックを発生させます。

## BigHit中の無敵

BigHit開始からBigHit終了まで、Playerは無敵になります。

```text
ReactionState = BigHit
↓
無敵
↓
BigHit終了
↓
ReactionState = None
↓
無敵終了
```

BigHit中に敵の攻撃判定を受けても、被弾を成立させません。

そのため、

* HPダメージを受けない
* SmallHitへ遷移しない
* BigHitを再生し直さない
* BigHitの残り時間を変更しない

とします。

### BigHit中にSmall攻撃

```text
ReactionState = BigHit
↓
Small攻撃
↓
無敵
↓
ダメージなし
↓
BigHit継続
```

### BigHit中にBig攻撃

```text
ReactionState = BigHit
↓
Big攻撃
↓
無敵
↓
ダメージなし
↓
BigHit継続
```

BigHit中の追加Hitによって被弾モーションを最初から再生し直すことはありません。

## 追加被弾ルール一覧

現在のReactionStateと新しい攻撃の組み合わせを以下に示します。

| 現在のReactionState | Small攻撃            | Big攻撃               |
| ---------------- | ------------------ | ------------------- |
| `None`           | ダメージ → `SmallHit`  | ダメージ → `BigHit`     |
| `SmallHit`       | ダメージ → SmallHit再開始 | ダメージ → `BigHit`へ上書き |
| `BigHit`         | 無効・BigHit継続        | 無効・BigHit継続         |

基本ルールとして、**新しい被弾リアクションが反映される攻撃ではダメージを受け、現在のBigHitによって被弾リアクションが更新されない攻撃ではダメージも受けません。**

ただし、ダメージ適用によってHPが0になった場合はReactionStateの更新よりDeadを優先します。

## ReactionStateの終了

SmallHitまたはBigHitの被弾リアクションが正常終了した場合、`ReactionState`を`None`へ戻します。

### SmallHit終了

```text
ReactionState = SmallHit
↓
SmallHitリアクション終了
↓
ReactionState = None
```

### BigHit終了

```text
ReactionState = BigHit
↓
BigHitリアクション終了
↓
ReactionState = None
↓
無敵終了
```

ReactionState終了時に、被弾によって終了したActionを自動的に再開しません。

被弾前にAimingだった場合も、自動的にAimingへ戻りません。

Playerは現在の入力とStateに基づいて、新しくActionを開始します。

## Reaction中の入力

SmallHitまたはBigHit中は、通常のGameplay Actionを開始できません。

SmallHit成立時にもすべての通常ActionStateを終了するため、Reaction中に継続している通常ActionStateはありません。

主な入力は以下のように扱います。

| 入力     | SmallHit  | BigHit    |
| ------ | --------- | --------- |
| Move   | 無視        | 無視        |
| Jump   | 無視        | 無視        |
| Dash   | 無視        | 無視        |
| Aim    | 無視        | 無視        |
| Marker | 無視        | 無視        |
| Charge | 無視・新規開始不可 | 無視・新規開始不可 |
| Parry  | 無視        | 無視        |

Reaction中に行われた通常Action入力は、Action先行入力として保持しません。

Reaction終了後に、Reaction中に行われた入力を自動的に実行することもありません。

## Interacting中の被弾

`RootState = Interacting`中に被弾した場合、Interactingを中断します。

ReactionStateはGameplay内部のStateであるため、先にRootStateを`Gameplay`へ戻したうえで被弾リアクションを開始します。

```text
RootState = Interacting
↓
攻撃を受ける
↓
Interacting中断
↓
RootState = Gameplay
↓
ActionState   = None
AimState      = Normal
↓
ダメージ適用
↓
HP確認
↓
ReactionState = SmallHit / BigHit
```

`MovementState`は、その時点のPlayerの接地状態に応じて`Grounded`または`Airborne`とします。

BigHitが成立し、その時点で`MovementState = Grounded`の場合は、BigHit固有の地上ノックバックを適用します。

Interacting中に実行していた処理のキャンセル方法については「Playerインタラクション」で定義します。

## Conversation中の被弾

`RootState = Conversation`中は被弾しません。

Conversation中に敵の攻撃判定がPlayerへ到達しても、ダメージやReactionState変更を発生させません。

## Deadとの優先順位

被弾によるダメージ適用後にHPが0になった場合、SmallHitまたはBigHitより`Dead`への遷移を優先します。

```text
攻撃命中
↓
ダメージ適用
↓
HP = 0
↓
ReactionState開始よりDeadを優先
↓
RootState = Dead
```

例えば、SmallHitになる攻撃によってHPが0になった場合でも、

```text
ReactionState = SmallHit
```

を開始せず、そのままDeadへ遷移します。

同様に、BigHitになる攻撃でHPが0になった場合も、BigHitリアクションやBigHit固有の地上ノックバックを新しく開始せずDeadへ遷移します。

### SmallHit中にHPが0になった場合

```text
ReactionState = SmallHit
↓
追加攻撃
↓
ダメージ適用
↓
HP = 0
↓
RootState = Dead
```

Deadへ遷移する際は、現在のReactionStateを終了します。

`Dead`はActionState、AimState、ReactionState、Interactingなど他のPlayer状態より優先します。

死亡後の処理については「Playerステータス」または「Player死亡」を正とします。

## 被弾時の先行入力

被弾によってActionが強制終了した場合、そのActionが保持していたAction先行入力を破棄します。

Aim開始要求を保持していた場合も破棄します。

```text
Action実行中
↓
先行入力保持
↓
SmallHit / BigHit
↓
Action強制終了
↓
先行入力破棄
```

SmallHit / BigHit終了後に、被弾前に保持していたAction先行入力やAim開始要求を自動的に実行しません。

ActionState間の先行入力については「Playerアクション遷移」を正とします。

## 各ページとの責務分離

| 内容                              | 管理ページ                  |
| ------------------------------- | ---------------------- |
| `SmallHit / BigHit`のState遷移     | 本ページ                   |
| SmallHit / BigHit成立時のAction共通中断 | Playerアクション遷移 / 本ページ   |
| SmallHit / BigHit成立時のAim終了      | 本ページ                   |
| SmallHit / BigHitの追加被弾ルール       | 本ページ                   |
| BigHit中の無敵                      | 本ページ                   |
| Reaction中の通常Gameplay操作制限        | 本ページ                   |
| SmallHitの強制移動なし                 | 本ページ                   |
| BigHitの地上ノックバック有無               | 本ページ                   |
| Reactionと`MovementState`の関係     | 本ページ                   |
| Action中断時のAction固有処理            | 各Action仕様              |
| DragCharging中断時の選択内容・`miss`     | Playerアクション｜チャージ       |
| Aiming自体の仕様                     | Playerアクション｜照準         |
| 通常Move入力による移動                   | Player基本移動             |
| Interacting中断処理                 | Playerインタラクション         |
| HP・ダメージ処理                       | Playerステータス            |
| Dead                            | Playerステータス / Player死亡 |
| 攻撃ごとの`HitReactionType`          | 敵・攻撃側の仕様               |

## パラメータ

被弾リアクションに関する主な調整項目を以下に示します。

| パラメータ              | 内容                  | 値  |
| ------------------ | ------------------- | -- |
| `SmallHitDuration` | SmallHitリアクションの継続時間 | 未定 |
| `BigHitDuration`   | BigHitリアクションの継続時間   | 未定 |

BigHitの無敵時間は、原則として`BigHitDuration`と同じ期間とします。

BigHitの地上ノックバックに使用する具体的な距離・速度などは、実装およびプレイテストで調整します。

## 未決事項

* SmallHitの具体的なモーション時間
* BigHitの具体的なモーション時間
* SmallHit / BigHitそれぞれのモーション
* 被弾時のSE・VFX・カメラ演出

<PageRelations />
