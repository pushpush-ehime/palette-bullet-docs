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
* 被弾中の移動制限
* ActionStateの中断
* Aimingの解除
* SmallHit中の追加被弾
* BigHit中の追加被弾と無敵
* Interacting中の被弾
* HPが0になった場合のDead遷移

各Actionが被弾によって終了した際のAction固有処理については、それぞれのAction仕様で定義します。

HPの最大値やダメージによるHP減少処理については「Playerステータス」で定義します。

## ReactionState

Gameplay中の被弾状態は、`ReactionState`によって管理します。

```text
ReactionState
├─ None
├─ SmallHit
└─ BigHit
```

### None

被弾リアクションを行っていない通常状態です。

通常のGameplayでは、

```text
ReactionState = None
```

となります。

### SmallHit

小さい被弾リアクションを再生している状態です。

SmallHit中はPlayerの通常操作を停止します。

ただし、`DragCharging`のみ例外としてActionを継続できます。

### BigHit

大きい被弾リアクションを再生している状態です。

BigHit中はPlayerの通常操作を停止し、すべての通常Actionを終了します。

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
4. 現在のActionやAimを必要に応じて終了する
5. 被弾リアクションを再生する

という順序で処理します。

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
    被弾リアクション
```

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

SmallHitまたはBigHitが成立した場合、通常のActionState遷移よりReactionStateによる割り込みを優先します。

### SmallHit

SmallHitでは、`DragCharging`のみ継続します。

| 現在のActionState  | SmallHit |
| --------------- | -------- |
| `None`          | 継続       |
| `Dashing`       | 強制終了     |
| `MarkerFiring`  | 強制終了     |
| `ClickCharging` | 強制終了     |
| `DragCharging`  | 継続       |
| `Parrying`      | 強制終了     |

強制終了するActionは、

```text
ActionState = 対象Action
↓
SmallHit成立
↓
ActionState = None
ReactionState = SmallHit
```

となります。

### DragCharging中のSmallHit

`DragCharging`のみ、SmallHitが成立しても継続します。

```text
ActionState   = DragCharging
ReactionState = None
↓
SmallHit
↓
ActionState   = DragCharging
ReactionState = SmallHit
```

DragCharging中に保持している選択内容も維持します。

ただし、SmallHit中は通常移動できません。

SmallHitが終了して`ReactionState = None`へ戻った後も、DragChargingが継続している場合は通常どおりDragChargingを続行します。

DragCharging固有の処理については「Playerアクション｜チャージ」を正とします。

### BigHit

BigHitが成立した場合、すべての通常Actionを強制終了します。

| 現在のActionState  | BigHit |
| --------------- | ------ |
| `None`          | 継続     |
| `Dashing`       | 強制終了   |
| `MarkerFiring`  | 強制終了   |
| `ClickCharging` | 強制終了   |
| `DragCharging`  | 強制終了   |
| `Parrying`      | 強制終了   |

```text
ActionState = 対象Action
↓
BigHit成立
↓
ActionState = None
ReactionState = BigHit
```

DragCharging中の場合も、BigHitではActionを終了します。

DragCharging中に保持していた選択内容の扱いについては「Playerアクション｜チャージ」を正とします。

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

SmallHit中にDragChargingが継続する場合でも、Aimは継続しません。

```text
ActionState   = DragCharging
AimState      = Aiming
ReactionState = None
↓
SmallHit
↓
ActionState   = DragCharging
AimState      = Normal
ReactionState = SmallHit
```

## 被弾中の移動

SmallHitまたはBigHit中は、Move入力による通常移動を行いません。

```text
ReactionState = SmallHit / BigHit
+
Move入力
↓
通常移動を行わない
```

ReactionStateによって`MovementState`そのものは変更しません。

そのため、被弾しただけで`Grounded / Airborne`を切り替えることはありません。

通常移動の制限については「Player基本移動」を正とします。

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

主な入力は以下のように扱います。

| 入力     | SmallHit | BigHit |
| ------ | -------- | ------ |
| Move   | 無視       | 無視     |
| Jump   | 無視       | 無視     |
| Dash   | 無視       | 無視     |
| Aim    | 無視       | 無視     |
| Marker | 無視       | 無視     |
| Charge | 新規開始不可   | 無視     |
| Parry  | 無視       | 無視     |

SmallHit開始前から`DragCharging`が成立している場合のみ、既存のDragChargingを継続できます。

SmallHit中に新しくDragChargingを開始することはできません。

Reaction中に行われたAction入力は、先行入力として保持しません。

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
ReactionState = SmallHit / BigHit
```

`MovementState`は、その時点のPlayerの接地状態に応じて`Grounded`または`Airborne`とします。

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

被弾によってActionが強制終了した場合、そのActionが保持していた先行入力を破棄します。

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

SmallHit中にDragChargingが継続する場合でも、被弾前に保持されていた別Actionへの先行入力は実行しません。

ActionState間の先行入力については「Playerアクション遷移」を正とします。

## 各ページとの責務分離

| 内容                          | 管理ページ                  |
| --------------------------- | ---------------------- |
| `SmallHit / BigHit`のState遷移 | 本ページ                   |
| SmallHit / BigHitの追加被弾ルール   | 本ページ                   |
| BigHit中の無敵                  | 本ページ                   |
| Reaction中の通常操作制限            | 本ページ                   |
| ActionStateの共通中断規則          | Playerアクション遷移 / 本ページ   |
| Action中断時のAction固有処理        | 各Action仕様              |
| DragCharging中の選択内容          | Playerアクション｜チャージ       |
| Aimingの終了                   | Playerアクション｜照準         |
| 通常移動の停止                     | Player基本移動             |
| Interacting中断処理             | Playerインタラクション         |
| HP・ダメージ処理                   | Playerステータス            |
| Dead                        | Playerステータス / Player死亡 |
| 攻撃ごとの`HitReactionType`      | 敵・攻撃側の仕様               |

## パラメータ

被弾リアクションに関する主な調整項目を以下に示します。

| パラメータ              | 内容                  | 値  |
| ------------------ | ------------------- | -- |
| `SmallHitDuration` | SmallHitリアクションの継続時間 | 未定 |
| `BigHitDuration`   | BigHitリアクションの継続時間   | 未定 |

BigHitの無敵時間は、原則として`BigHitDuration`と同じ期間とします。

## 未決事項

* SmallHitの具体的なモーション時間
* BigHitの具体的なモーション時間
* SmallHit / BigHitそれぞれのモーション
* BigHit時にノックバックや吹き飛ばしを発生させるか
* SmallHit時にノックバックを発生させるか
* 被弾時のSE・VFX・カメラ演出

<PageRelations />
