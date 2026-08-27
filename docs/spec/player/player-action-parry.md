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
* スタミナ消費
* Parrying内部Phase
* Parry判定batch
* 成功batch内の対象ごとの弾き方向の確定と受け渡し
* Normal Parry / Just Parry
* 成功・失敗・空振り
* 連続パリィ
* Parrying中の再入力
* HitStop中のParry入力保持
* Aimingとの関係
* 接地喪失による終了
* ReactionStateによる終了
* RootState変更による強制終了
* Parryingの終了条件

ActionState間の遷移可否については「Playerアクション遷移」を正とします。

HP・スタミナの共通仕様については「Playerステータス」を正とします。

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

Parryingを開始するたびにスタミナを消費します。

## 使用可能条件

Parryingは、以下の条件をすべて満たしている場合に開始できます。

* `RootState = Gameplay`
* `MovementState = Grounded`
* `ReactionState = None`
* 現在の`ActionState`からParryingの開始が許可されている
* Parry開始に必要なスタミナが残っている

通常状態では、

```text
MovementState = Grounded
ActionState   = None
ReactionState = None
↓
Parry入力
↓
Parry開始条件確認
↓
必要スタミナあり
↓
ActionState = Parrying
```

となります。

Airborne中はParryingを開始できません。

スタミナが不足している場合もParryingを開始できません。

また、以下のActionStateからParryingへ直接遷移することはできません。

* `Dashing`
* `MarkerFiring`
* `ClickCharging`
* `DragCharging`

これらのAction中にParry入力が行われた場合は、入力を無視します。

先行入力としても保持しません。

## スタミナ不足

Parry開始に必要なスタミナが不足している場合、Parryingを開始しません。

```text
Parry入力
↓
Parry開始条件確認
↓
スタミナ不足
↓
Parrying開始不可
```

Parryingを開始できない場合は、現在成立しているGameplay Stateを維持します。

例えばAiming中にParry入力を行っても、スタミナ不足の場合はAimingを終了しません。

```text
ActionState = None
AimState    = Aiming
↓
Parry入力
↓
スタミナ不足
↓
ActionState = None
AimState    = Aiming
```

スタミナ不足を理由に、現在のActionやAimを先に終了してはいけません。

## Parrying開始

Parry入力を受け付け、開始条件を満たしている場合、Parryingを開始します。

基本的な処理は以下です。

```text
Parry入力
↓
Parry開始条件確認
↓
必要スタミナあり
↓
スタミナ消費
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

Parry開始条件が成立していることを確認してから、スタミナを消費します。

スタミナ消費後にParryingを開始します。

Parrying開始時にPlayerの通常移動を停止します。

また、開始時点のPlayerの向きを保持し、Parryingが終了するまでPlayer本体の向きを変更しません。

## スタミナ消費

Parryは、Parryingを1回開始するたびにスタミナを1回消費します。

```text
Parry開始条件確認
↓
必要スタミナあり
↓
スタミナ消費
↓
Parrying開始
```

Parrying中に継続的なスタミナ消費は行いません。

ただし、Parry再入力によって新しいParryingを開始する場合は、新しいParryingの開始分として再びスタミナを消費します。

Parryのスタミナ消費量、スタミナ回復、最大スタミナについては「Playerステータス」を正とします。

## Parrying中のスタミナ回復

`ActionState = Parrying`の間はスタミナを回復しません。

```text
Parrying
↓
スタミナ回復なし
↓
Parrying終了
↓
Playerステータス側の回復待機処理へ
```

Parry再入力によって新しいParryingを連続して開始している場合も、Parryingが続いている間はスタミナを回復しません。

具体的な回復開始条件や回復速度については「Playerステータス」を正とします。

## Parrying内部Phase

Parryingは、1つの`ActionState`として管理します。

モーション内部では、以下のPhaseを持ちます。

```text
Parrying
│
├─ Startup Phase
│
├─ Parry Window Phase
│   └─ 成功batch処理後は早期再入力可能
│
└─ Recovery Phase
    │
    ├─ 再入力受付前
    └─ 空振り時のParry再入力受付区間
```

これらは別のPlayer Stateではありません。

Parrying開始から終了まで、`ActionState`は`Parrying`のままです。

Parry成功後の早期再入力受付は、独立したPhaseやPlayer Stateではありません。

そのParryingで成功batchが成立したことを条件として、通常のRecovery後半より前から新しいParryingへの再開始を許可する専用規則です。

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

このPhase中に、そのParryingの成功枠が未使用の状態で有効な敵攻撃を受けた場合、パリィ成功となります。

1回のParryingで成功できるのは、**1つのParry判定batchのみ**です。

### Parry判定batch

Parry判定batchは、パリィ成功結果を一度に確定し、そのParryingの成功枠を消費する単位です。

同一Physics StepでPlayerのParry判定へ接触した有効な邪音玉を、1つのParry判定batchとして収集します。

各接触callbackの到着順によって1弾ずつ成否を確定してはいけません。

同一Physics Step内の対象を収集した後、batch全体をまとめて判定します。

batchへ参加できるのは、そのPhysics Stepの判定時点で有効かつ、まだDamage、Parry成功、Wildcard変換のいずれも確定していない邪音玉です。
そのPhysics Stepより前に、Damage、Parry成功、Wildcard変換のいずれかが確定済みの邪音玉はbatchへ参加できません。

同一Physics Step内の接触候補を収集している間は、対象邪音玉のDamage、Parry成功、Wildcard変換を確定しません。batch判定完了後に、各対象の最終結果を確定します。同一Physics Step内のcallback到着順によってDamageを先に確定してはいけません。

成功batchの結果適用では、各対象についてParry成功結果を1回だけ確定します。邪音玉については、変換後のWildcardへ渡す弾き方向を対象ごとに確定し、Parry成功結果とともに各邪音玉へ1回だけ通知します。Damage無効化、攻撃projectile終了、およびWildcard変換要求の成立は、通知を受けた邪音玉側で1弾につき1回だけ行います。

邪音玉ごとの有効性と重複解決防止については「邪音玉」を正とします。

邪音玉以外の有効なParry対象にも「1回のParryingにつき1成功batch」の上限を適用しますが、対象固有の成功結果は各攻撃仕様を正とします。

```text
Parry Window Phase
+
成功枠が未使用
↓
同一Physics Stepで邪音玉A、B、Cが接触
↓
A、B、Cを1つのbatchとして収集
↓
batch全体をNormal / Just判定
↓
A、B、CがすべてParry成功
↓
A、B、CそれぞれのParry成功結果と弾き方向を1回ずつ確定
↓
各邪音玉へ成功結果と弾き方向を1回通知
↓
各邪音玉側でDamage無効化・攻撃projectile終了・Wildcard変換要求を1回だけ成立
↓
Wildcard側で、変換commit後の各個体へ対応する弾き方向の力を1回適用
↓
batch処理完了後に成功枠を消費
```

同じbatch内の有効な邪音玉は、弾数にかかわらずすべてParry成功とします。

最初に到着したcallbackだけで成功枠を消費し、同一Physics Step内の後続callbackを失敗させてはいけません。

batch内の全対象に成功結果を適用した後、そのParryingの成功枠を消費します。

### 対象ごとの弾き方向

成功batchに複数の邪音玉が含まれる場合も、変換後のWildcardへ渡す弾き方向は対象ごとに確定します。同一batchであることを理由に、全対象へ1つの共通方向を一括適用しません。

弾き方向はParry結果の一部として本ページで確定し、対応する邪音玉へ成功結果とともに1回だけ通知します。通知を受けた邪音玉は、Parry成立位置、`battleId`、変換元邪音玉ID、および弾き方向を1弾ごとの変換要求としてWildcard側へ渡します。この方向は邪音玉自身を移動させるためには使用しません。

実際に力を受けて移動する対象は、邪音玉ではなく変換commit後のWildcardです。邪音玉を弾いて移動させてからWildcardへ変換する中間Stateは設けません。変換commit、同時の選択可能化、および力の適用後の基本規則は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)、その後の衝突・浮遊・Lifetime・`Reserved`・消費・Battle終了は[浮遊・挙動](/spec/shaondama-music/floating-behavior)を正とします。

弾き方向を固定の「Playerから離れる方向」と決め打ちしません。入力方向、Playerの向き、接触方向などのどれを使用して弾き方向を算出するか、その具体式は現時点では未確定です。確定するまでは、いずれかの情報から実装側で独自に補完せず、実装・操作感の検討事項として扱います。

Battle結果確定後、または現在Battleと異なる`battleId`の遅延結果から、弾き方向の受け渡し、Wildcard変換、選択可能化、または力の付与を発生させません。

### 成功batch処理後

成功枠を消費したParryingでは、次のPhysics Step以降に接触した攻撃に対してパリィ判定を行いません。

```text
Parrying
↓
Physics Step Nでbatch AがParry成功
↓
成功枠を消費
↓
Physics Step N+1以降に攻撃Bが接触
↓
同じParryingのままならParry不成立
```

その後に受けた攻撃は通常の被弾判定へ進みます。

次の攻撃をパリィするためには、新しいParry入力によって新しいParryingを開始する必要があります。

パリィ成功だけでは現在のParryingを終了せず、Parryモーションも最初から再生し直しません。

新しいParryingが開始されなければ、現在のParryモーションをそのまま継続します。

## Normal Parry / Just Parry

Parry Window内には、通常の成功範囲であるNormal Parry Windowと、その内側に配置するより狭いJust Parry Windowを設けます。

```text
Normal Parry Window
└─ Just Parry Window
```

batch判定時点がJust Parry Window内であれば、そのbatchをJust Parryと評価します。

Normal Parry Window内かつJust Parry Window外であれば、Normal Parryと評価します。

同じbatch内のすべての邪音玉には、batch判定時点の同じNormal / Just評価を適用します。

callbackごと、または邪音玉ごとにNormal / Justを別々に評価してはいけません。

Normal ParryとJust Parryは、Damage無効化、Reaction抑止、Wildcard変換、変換commit時の選択可能化、弾き方向の受け渡し、弾き移動の基本性能、および成功枠消費については同じ結果になります。ただし、スタミナ精算は異なります。

| 結果 | Normal Parry | Just Parry |
| --- | --- | --- |
| Damage | 無効 | 無効 |
| 通常被弾・ReactionState | 発生させない | 発生させない |
| 邪音玉の変換 | 1弾につきWildcard 1個 | 1弾につきWildcard 1個 |
| Wildcardの選択可能化 | 変換commitと同時 | 変換commitと同時 |
| 弾き方向と力の対象 | 対象ごとに方向を確定し、変換後のWildcardへ1回適用 | 対象ごとに方向を確定し、変換後のWildcardへ1回適用 |
| 成功枠 | batch処理後に消費 | batch処理後に消費 |
| HitStop | 1batchにつき1回 | 1batchにつき1回 |
| スタミナ精算 | Parrying開始時に消費したコストを維持 | 現在のParrying開始時に消費した`ParryStaminaCost`を1回だけ返却し、実質消費0 |

Just ParryによってWildcardの生成数、種別、選択条件、弾き方向の算出規則、または弾き移動の基本性能を変えません。追加Wildcard、強いWildcard、またはJust専用の強い弾き移動は発生させません。

Just Parryのスタミナ返却は、現在のParryingについて最大1回です。同一batchに含まれる邪音玉の弾数に応じて`ParryStaminaCost`を複数回返却せず、同じbatch結果の重複処理によって再返却もしません。

Normal / Justの違いは、スタミナ精算、VFX、SE、画面効果、およびHitStopの強さ・長さによって表現します。

HitStopの具体的な音楽同期規則は「BGMとGameplayの接続」を正とし、本ページではHitStop中のParry入力だけを定義します。

Parry由来Wildcardは、Parry成立位置での変換commitと同時に選択可能になります。即時選択可能化、最低保証数への算入、RadioWhale経路を使用しないこと、および変換後の弾き移動の詳細は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正とします。

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

Recovery Phaseの後半には、空振り時でも次のParryingを開始できる**空振り時のParry再入力受付区間**を設けます。

すでにParry成功batchが成立している場合は、この区間を待たずに成功後の早期再入力規則を使用できます。

## Parry再入力

Parrying中に新しいParryingを開始する経路は、以下の2つです。

* Parry成功後の早期再入力
* 空振り時のRecovery後半における通常再入力

どちらの場合も、Holdではなく新しく行われたParry Pressが必要です。

### Parry成功後の早期再入力

そのParryingでParry成功batchが成立した後は、通常のRecovery後半を待たずにParry再入力を受け付けます。

HitStop外で新しいParry Pressを受けた場合、その時点で新しいParryingの開始条件とスタミナを確認します。

開始条件を満たし、必要なスタミナが残っている場合のみ、現在のParryingを終了して新しいParryingを即座に最初から開始します。

```text
Parrying
↓
Parry成功batch成立
↓
新しいParry Press
↓
新しいParryingの開始条件とスタミナを確認
↓
開始可能
↓
新しいParry分のスタミナを消費
↓
現在のParryingを終了
↓
新しいParryingを開始
↓
Startup Phaseから再生
```

この再開始によって、現在のParryモーションを新しいParryモーションで上書きします。

成功後の早期再入力は、Recovery Phaseへ入る前や空振り時の再入力受付開始前であっても使用できます。

### 空振り時の通常再入力

そのParryingでParry成功batchが成立していない場合は、従来どおりRecovery Phase後半の空振り時再入力受付区間だけでParry再入力を受け付けます。

これは先行入力ではありません。

受付区間中に新しいParry入力が行われた場合、新しいParryingの開始条件を確認します。

開始条件を満たしている場合のみ、スタミナを消費して現在のParryingを終了し、新しいParryingを即座に最初から開始します。

```text
Parrying
↓
Recovery Phase
↓
空振り時のParry再入力受付区間
↓
新しいParry Press
↓
新しいParryingの開始条件確認
↓
必要スタミナあり
↓
スタミナ消費
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

成功後の早期再入力と空振り時の通常再入力のどちらでも、新しいParryingを開始するたびにParry1回分のスタミナを消費します。

実装上は現在のParryingを再開始し、以下をすべて初期状態へ戻します。

* Parryモーションの再生位置
* Startup Phase
* Normal Parry Window
* Just Parry Window
* Recovery Phase
* そのParryingの成功枠
* 成功batchの処理状態
* HitStop中の保持入力

そのため、再開始されたParryingでは再び1つのParry判定batchを成功させられます。

## HitStop中のParry入力

Normal ParryとJust Parryのどちらでも、成功batchに対してHitStopを発生させます。

同じbatch内の邪音玉数にかかわらず、HitStopは1batchにつき1回だけ発生させます。

HitStop中に新しく行われたParry Pressは、1回分だけ専用の保持枠へ保存できます。

```text
Parry成功batch
↓
HitStop開始
↓
新しいParry Press
↓
1回分だけ保持
↓
HitStop終了
↓
新しいParryingの開始条件とスタミナを再確認
```

保持対象は、HitStop中に新しく行われたPressだけです。

HitStop開始前からParry入力をHoldしている場合、そのHoldを新しいPressとして扱いません。

HitStop中に複数回Pressされても、複数のParryingを予約しません。すでに1回分を保持している場合、追加のPressによって予約数を増やしてはいけません。
HitStop中に最初に受け付けた有効なParry Pressを保持します。保持後の追加Pressでは、保持入力の内容、受付時刻、有効期限を更新しません。

Parry Pressを保持した時点では、スタミナを消費しません。

HitStop終了時に、`RootState = Gameplay`、`MovementState = Grounded`、`ReactionState = None`などの開始条件と、必要なスタミナを改めて確認します。

開始可能な場合に限り、保持入力を消費し、新しいParry分のスタミナを消費して現在のParryingを終了し、新しいParryingを最初から開始します。

スタミナ不足などによって開始できない場合は再開始せず、保持入力を破棄します。現在のParryingが強制終了していなければ、そのParryingを継続します。

保持入力には調整可能な有効時間`ParryHitStopInputBufferDuration`を設定し、HitStop終了時点で有効な入力だけを再評価します。

次の場合は、HitStopの終了を待たずに保持入力を破棄します。

* Battle結果が確定した
* パリィ不成立の被弾によってParryingが強制終了した
* `RootState = Dead`が成立した
* 接地を失った
* その他の理由で現在のParryingが強制終了した

破棄した入力によって、後からParryingを自動再開してはいけません。

## Parry再入力時のスタミナ不足

成功後の早期再入力、HitStop終了時の保持入力再評価、または空振り時の通常再入力において、新しいParryingを開始するためのスタミナが不足している場合は再開始しません。

```text
Parrying
↓
再入力受付
↓
新しいParry Press
↓
新しいParryingの開始条件確認
↓
スタミナ不足
↓
再開始しない
↓
現在のParrying継続
```

この場合、現在のParryingを終了しません。

スタミナも消費しません。

現在のParryingは、そのまま通常のRecovery Phaseを継続します。

新しいParryingを開始できることを確認する前に、現在のParryingを終了してはいけません。

入力保持中にスタミナが不足していることだけを理由として、HitStop中に現在のParryingを先に終了してはいけません。

## 空振り時の受付前Parry入力

そのParryingでParry成功batchが成立していない状態で、空振り時のParry再入力受付区間へ入る前にParry入力が行われた場合、その入力は無視します。

```text
Parrying
↓
Parry成功なし
↓
再入力受付前
↓
新しいParry Press
↓
入力を無視
↓
現在のParrying継続
```

入力を先行入力として保持しません。

スタミナも消費しません。

空振り時のParry再入力受付区間へ入った後に、改めてParry入力を行う必要があります。

Parry成功後の早期再入力と、空振り時の通常再入力を同じ受付規則として扱ってはいけません。

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

Holdしているだけでは追加のスタミナも消費しません。

HitStop中の専用保持枠についても、Holdではなく新しく行われたPressだけを対象とします。

## パリィ成功

Parry Window Phase中に、そのParryingの成功枠が未使用の状態で有効なParry判定batchを処理した場合、パリィ成功となります。

成功時は以下の処理を行います。

* batch内のすべての対象攻撃についてParry成功結果を1回だけ確定する
* batch内の各邪音玉について、Damage無効化・Wildcard変換対象となる成功結果を1回だけ通知する
* batch内の各邪音玉について、変換後のWildcardへ渡す弾き方向を対象ごとに確定し、成功結果とともに1回だけ通知する
* 通常の被弾を発生させない
* `ReactionState`を変更しない
* `ActionState = Parrying`を維持する
* 現在のParryモーションを継続する
* batch全体に1つのNormal / Just評価を適用する
* batch全体に対してHitStopを1回だけ発生させる
* batch処理完了後に、そのParryingの成功枠を消費する

弾き方向を受け取って実際に力を受けるのは、邪音玉ではなくParry成立位置で即時変換された後のWildcardです。変換後のWildcardは変換commitと同時に選択可能になり、選択可能なまま弾き移動します。

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

Normal Parry成功では、Parrying開始時に消費したスタミナを返却しません。Just Parry成功では、現在のParrying開始時に消費した`ParryStaminaCost`を1回だけ返却し、実質的なスタミナ消費を0にします。同一batchの邪音玉数に応じて複数回返却したり、同じbatchの重複処理によって再返却したりしてはいけません。1回のParryingに対するJust返却は最大1回です。

ただし、成功後のParry再入力によって新しいParryingを開始する場合は、その新しいParryingの開始分としてスタミナを消費します。

邪音玉の攻撃projectileとしての終了、Parry成立位置・`battleId`・変換元邪音玉ID・弾き方向の受け渡し、および重複解決防止は[邪音玉](/spec/enemy/jaon-bullet)を正とします。Wildcardの即時変換、変換commitと同時の選択可能化、重複生成防止、および変換後の力の適用は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正とします。

## パリィ失敗

以下の場合、パリィは成立しません。

* Startup Phase中に攻撃を受ける
* Parry Window Phase終了後に攻撃を受ける
* 同じParryingの成功枠がすでに消費されており、後続のPhysics Stepで攻撃を受ける
* その他、対象攻撃がパリィ対象ではない

同一Physics Stepで接触した有効な邪音玉は1つのbatchとして扱うため、callbackの到着が遅かったことだけを理由として、そのbatch内の邪音玉をパリィ失敗にしてはいけません。

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

被弾によってParryingが強制終了した場合、スタミナを返却しません。

その後のスタミナ回復については「Playerステータス」の回復ルールに従います。

## 空振り

Parrying中にParry成功batchが一度も成立しなかった場合は、空振りとなります。

空振りによる追加のState変更やペナルティは発生しません。

消費したスタミナは返却しません。

空振り時は成功後の早期再入力を使用できません。

Recovery Phase後半の空振り時再入力受付区間へ入るまで、新しいParry Pressを受け付けず、受付前の入力も保持しません。

空振り時の通常再入力が行われなければ、モーション終了までParryingを継続します。

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
成功後の早期再入力または空振り時の通常再入力
↓
新しいParrying開始条件成立
↓
新しいParrying開始
↓
現在のPlayer向きを再取得
↓
新しい向きとして固定
```

## Aimingとの関係

AimingとParryingは同時成立できません。

`AimState = Aiming`の状態からParryingを開始する場合は、Parryの開始条件をすべて確認した後、Aimingを終了してParryingを開始します。

```text
MovementState = Grounded
ActionState   = None
AimState      = Aiming
↓
Parry入力
↓
Parry開始条件確認
↓
必要スタミナあり
↓
スタミナ消費
↓
AimState      = Normal
ActionState   = Parrying
```

スタミナ不足などによってParryingを開始できない場合は、Aimingを終了しません。

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

この場合、スタミナは消費しません。

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

消費したスタミナは返却しません。

HitStop中のParry Pressを保持している場合は、接地喪失時にその保持入力を破棄します。

接地喪失後に、破棄した入力によってParryingを自動再開することはありません。

## 他Actionとの関係

Parryingは排他的な`ActionState`です。

Parrying中に他のGameplay Actionを開始することはできません。

| 入力 | Parrying中 |
| --- | --- |
| Dash | × |
| MarkerFiring | × |
| ClickCharging | × |
| DragCharging | × |
| Aim | × |
| Jump | × |
| Parry | 成功後は早期再入力可。空振り時はRecovery後半のみ。HitStop中は1 Pressだけ保持 |

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

HitStop中のParry Pressを保持している場合は、被弾による強制終了時にその保持入力を破棄します。

消費済みのスタミナも返却しません。

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

HitStop中のParry Pressを保持している場合は、RootState変更時にその保持入力を破棄します。

消費済みのスタミナは返却しません。

Battle結果が確定した場合も、Battle終了時の共通契約に従ってParryingと保留中のGameplay入力を停止し、HitStop中の保持入力を破棄します。

## Parryingの終了

Parryingの主な終了条件を以下に示します。

| 終了原因 | ActionState | スタミナ | 備考 |
| --- | --- | --- | --- |
| モーション正常終了 | `None` | 返却しない | 通常終了 |
| 成功後の早期再入力 | `Parrying` | 新しいParry分を追加消費 | 現在のモーションを上書きし、新しいParryingを即時開始 |
| 空振り時の通常再入力 | `Parrying` | 新しいParry分を追加消費 | Recovery後半で現在のParryingを終了し、新しいParryingを即時開始 |
| HitStop保持入力からの再開始 | `Parrying` | 実際の開始時に新しいParry分を追加消費 | HitStop終了時に条件とスタミナを再確認 |
| 接地喪失 | `None` | 返却しない | `MovementState = Airborne`へ変更 |
| `SmallHit` | `None` | 返却しない | ReactionStateを優先 |
| `BigHit` | `None` | 返却しない | ReactionStateを優先 |
| Battle結果確定 | Battle終了時の共通契約に従う | 返却しない | 保持入力を破棄し、新しいParryingを開始しない |
| RootState変更 | Gameplay内部Action終了 | 返却しない | 強制終了 |
| `Dead` | Gameplay内部Action終了 | 返却しない | Deadを最優先 |

正常終了した場合は、

```text
Parrying
↓
モーション終了
↓
ActionState = None
↓
Playerステータス側のスタミナ回復待機へ
```

となります。

## パラメータ

Parry固有の主な調整項目を以下に示します。

| パラメータ | 内容 | 値 |
| --- | --- | --- |
| `ParryMotionDuration` | Parryモーション全体の時間 | 未定 |
| `ParryStartup` | Parrying開始からパリィ判定開始までの時間 | 未定 |
| `NormalParryWindow` | Normal Parryが成立するParry Window全体の時間範囲 | 未定 |
| `JustParryWindow` | `NormalParryWindow`内に配置する、Just Parryが成立するより狭い時間範囲 | 未定 |
| `ParryRestartAcceptTiming` | 空振り時にParry再入力を受け付け始めるRecovery後半のタイミング | 未定 |
| `NormalParryHitStopDuration` | Normal Parry時のHitStop時間 | 未定 |
| `JustParryHitStopDuration` | Just Parry時のHitStop時間 | 未定 |
| `NormalParryHitStopStrength` | Normal Parry時のHitStopの強さ | 未定 |
| `JustParryHitStopStrength` | Just Parry時のHitStopの強さ | 未定 |
| `ParryHitStopInputBufferDuration` | HitStop中に受けた1回分のParry Pressを保持できる時間 | 未定 |
| `NormalParryFeedback` | Normal Parry時のVFX、SE、画面効果 | 未定 |
| `JustParryFeedback` | Just Parry時のVFX、SE、画面効果 | 未定 |

Parry1回あたりのスタミナ消費量`ParryStaminaCost`は「Playerステータス」で管理します。

HitStop中に入力を保持しただけでは`ParryStaminaCost`を消費せず、実際に新しいParryingを開始した時点で消費します。

`JustParryWindow`は必ず`NormalParryWindow`の内側へ収めます。

`ParryRestartAcceptTiming`は空振り時のRecovery Phase後半になるよう調整します。Parry成功後の早期再入力開始には使用しません。

具体的な時間、HitStopの強さ、VFX、SE、画面効果は、連続パリィ時の操作感、モーションのつながり、Normal / Justの識別性を確認しながら調整します。

## 各ページとの責務分離

| 内容 | 管理ページ |
| --- | --- |
| Parryingの開始・Phase・判定・終了 | 本ページ |
| Parry開始時のスタミナ確認・消費タイミング | 本ページ |
| 同一Physics StepのParry判定batch収集とbatch全体の評価 | 本ページ |
| 成功batch全体のParry成功確定と、各対象への成功結果の1回限りの通知 | 本ページ |
| 変換後のWildcardへ渡す対象ごとの弾き方向の確定 | 本ページ |
| 1回のParryingで成功できるbatch数 | 本ページ |
| Normal / Justの時間評価とGameplay上の共通結果 | 本ページ |
| 成功後早期・空振り時・HitStop保持入力による再開始 | 本ページ |
| Parry再入力時のスタミナ確認 | 本ページ |
| パリィ成功・失敗・空振り | 本ページ |
| ActionState間の遷移可否 | Playerアクション遷移 |
| スタミナ最大値・消費量・回復 | Playerステータス |
| 邪音玉ごとのDamage無効化・projectile終了・Wildcard変換要求の1回限りの成立・Parry成立位置・`battleId`・変換元ID・弾き方向の受け渡し・重複解決防止 | [邪音玉](/spec/enemy/jaon-bullet) |
| 邪音玉1弾からWildcard 1個への即時変換・重複生成防止・変換commitと同時の選択可能化・変換後の力の適用 | [万能シャオンダマ](/spec/shaondama-music/wildcard-orb) |
| 力適用後のWildcardの衝突・浮遊・Lifetime・`Reserved`・消費・Battle終了 | [浮遊・挙動](/spec/shaondama-music/floating-behavior) |
| HitStop中のBGM Audio・3時計・AttackEvent | BGMとGameplayの接続 |
| Aimingのカメラ・移動・向き制御 | Playerアクション｜照準 |
| Player通常移動の停止 | Player基本移動 |
| Grounded / Airborne | Player移動仕様 |
| SmallHit / BigHitの判定 | Playerリアクション｜被弾 |
| PlayerのHP減少 | Playerステータス |

## 未決事項

* 体当たりなど、邪音玉以外の攻撃をパリィした場合に敵をひるませるか
* 対象ごとの弾き方向を、入力方向、Playerの向き、接触方向などからどのように算出するかの具体式

Normal / Justの2段階評価とHitStopの採用自体は確定事項です。また、成功した邪音玉ごとに弾き方向を確定して変換後のWildcardへ渡すこと、力を受ける対象が変換後のWildcardであること、および変換commitと同時に選択可能になることも確定事項です。

各Window、空振り時の再入力受付開始、Normal / JustそれぞれのHitStop、入力保持時間、VFX、SE、画面効果の具体値は、未決仕様ではなく調整パラメータとして扱います。

<PageRelations />
