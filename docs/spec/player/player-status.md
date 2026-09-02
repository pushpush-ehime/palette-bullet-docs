---
title: "Playerステータス"
description: Palette BulletにおけるPlayerのHP・スタミナ仕様
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# Playerステータス

## 目的

本ページでは、Playerが持つ基本ステータスについて定義します。

現在、本ページで管理するステータスは以下です。

```text
PlayerStatus
├─ HP
└─ Stamina
```

本ページでは主に以下を扱います。

- HP
- ダメージによるHP減少
- HP回復
- HP0判定
- スタミナ
- スタミナ消費
- スタミナ不足時の処理
- スタミナ回復

被弾が成立する条件や`SmallHit / BigHit`については「Playerリアクション｜被弾」を正とします。

`RootState = Dead`への遷移と死亡後の処理については「Player死亡」を正とします。

---

## HP

Playerは現在HPと最大HPを持ちます。

```text
CurrentHP
MaxHP
```

現在HPは以下の範囲で管理します。

```text
0 ～ MaxHP
```

HPの具体的な最大値は調整パラメータとし、現時点では未定とします。

---

## HPの初期値

ステージ開始時は、現在HPを最大HPに設定します。

```text
ステージ開始
↓
CurrentHP = MaxHP
```

死亡後にステージをリスタートした場合も、最大HPの状態から開始します。

---

## ダメージ

Playerへの被弾が成立した場合、攻撃側が持つダメージ値を現在HPから減算します。

```text
被弾成立
↓
ダメージ取得
↓
CurrentHP -= Damage
↓
HP0判定
```

被弾そのものが成立するかどうかについては「Playerリアクション｜被弾」を正とします。

例えば、以下の状況では被弾側の仕様によってダメージが無効になります。

- Dashの無敵時間中
- BigHitの無敵時間中
- Conversation中
- Parry成功時

本ページでは、**ダメージが成立した後のHP処理**を定義します。

---

## HP0判定

ダメージ適用後、現在HPが`0`以下になった場合は死亡条件成立とします。

```text
ダメージ適用
↓
CurrentHP <= 0 ?
│
├─ Yes
│   ↓
│   CurrentHP = 0
│   ↓
│   RootState = Dead
│
└─ No
    ↓
    通常の被弾処理
```

HPは負の値として保持せず、最低値を`0`とします。

```text
CurrentHP = Max(CurrentHP, 0)
```

死亡条件が成立した場合、`SmallHit / BigHit`などのReaction開始より`Dead`への遷移を優先します。

具体的な死亡処理については「Player死亡」を正とします。

---

## HPの自然回復

PlayerのHPは自然回復しません。

```text
時間経過
↓
HPは変化しない
```

HPを回復する場合は、回復アイテムやゲーム固有の回復処理など、明示的な回復効果によって回復します。

具体的な回復手段については、それぞれのシステム側で定義します。

---

## HP回復

HP回復が成立した場合、現在HPへ回復量を加算します。

```text
HP回復
↓
CurrentHP += HealAmount
↓
MaxHPを超えないよう制限
```

現在HPは最大HPを超えません。

```text
CurrentHP = Min(CurrentHP, MaxHP)
```

`Dead`成立後の通常回復による復活は行いません。

死亡後の復帰は「Player死亡」で定義するリスタート処理によって行います。

---

# スタミナ

Playerは現在スタミナと最大スタミナを持ちます。

```text
CurrentStamina
MaxStamina
```

現在スタミナは以下の範囲で管理します。

```text
0 ～ MaxStamina
```

最大スタミナの具体値は調整パラメータとし、現時点では未定とします。

---

## スタミナの初期値

ステージ開始時は、スタミナを最大値に設定します。

```text
ステージ開始
↓
CurrentStamina = MaxStamina
```

死亡後にステージをリスタートした場合も、最大スタミナから開始します。

---

## スタミナを使用するAction

現在、スタミナを消費するActionは以下です。

| ActionState | スタミナ消費 |
| --- | --- |
| `Dashing` | 開始時に消費 |
| `Parrying` | 開始時に消費 |

今後スタミナを使用するActionが追加された場合は、本ページへ追加します。

---

## モード切替操作のコスト

モード切替操作自体は無料です。

- HPを消費しない
- スタミナを消費しない
- アイテムを消費しない
- 使用回数制限を設けない
- 切替操作に独自の数値コストを設けない

連続した切替を制限するのは、選択したモードが実際に適用された時点から始まる1小節相当秒数のクールタイムだけです。クールタイムを含むモード切替の詳細は、[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)を正本とします。

モード効果によって将来HPやスタミナなどのStatusが変化する場合でも、その変化はモード切替操作のコストとは区別します。具体的な効果、数値、および計算方法は未決であり、本ページでは採用済みとして定義しません。

---

## スタミナ消費の基本ルール

スタミナを使用するActionは、**Action開始前に必要なスタミナが残っているか確認します。**

```text
Action入力
↓
必要スタミナ確認
│
├─ 足りる
│   ↓
│   スタミナ消費
│   ↓
│   Action開始
│
└─ 足りない
    ↓
    Action開始不可
```

必要量を満たしていない場合、スタミナを一部だけ消費することはありません。

Actionも開始しません。

---

## Dashのスタミナ消費

Dashは`Dashing`開始時にスタミナを1回消費します。

```text
Dash入力
↓
Dash開始条件確認
↓
必要スタミナあり
↓
スタミナ消費
↓
ActionState = Dashing
```

`Dashing`継続中に追加のスタミナ消費はありません。

```text
Dashing開始
↓
スタミナ消費
↓
初動高速移動Phase
↓
Dash継続Phase
↓
追加消費なし
```

Dash固有の処理については「Playerアクション｜ダッシュ」を正とします。

---

## Parryのスタミナ消費

Parryは`Parrying`開始時にスタミナを1回消費します。

```text
Parry入力
↓
Parry開始条件確認
↓
必要スタミナあり
↓
スタミナ消費
↓
ActionState = Parrying
```

スタミナが不足している場合はParryingを開始できません。

---

## 連続Parryのスタミナ消費

次のどちらの経路で連続Parryを行う場合も、**新しいParryingを開始するたびにスタミナを消費します。**

- 通常のRecovery後半の再入力受付区間から新しいParryingを開始する場合
- Parry成功後の早期再入力によって、現在のParryingを上書きして新しいParryingを開始する場合

```text
Parrying
↓
Parry再入力受付
├─ Recovery後半の再入力受付
└─ Parry成功後の早期再入力受付
↓
Parry入力
↓
新しいParryingの開始条件を確認
│
├─ 条件不成立
│   ↓
│   再開始しない
│
└─ 条件成立
    ↓
    必要スタミナを確認
    │
    ├─ 足りる
    │   ↓
    │   スタミナ消費
    │   ↓
    │   現在のParrying終了
    │   ↓
    │   新しいParrying開始
    │
    └─ 足りない
        ↓
        再開始しない
        ↓
        現在のParrying継続
```

スタミナ不足の場合、現在のParryingを先に終了してはいけません。新しいParryingの開始条件と必要スタミナを満たしていることを確認してから、現在のParryingを終了します。

HitStop中にParry入力を1回分保持した時点では、スタミナを消費しません。

```text
HitStop中
↓
Parry Pressを保持
↓
スタミナ消費なし
↓
HitStop終了
↓
新しいParryingの開始条件を再確認
│
├─ 条件不成立
│   ↓
│   再開始しない
│
└─ 条件成立
    ↓
    必要スタミナを再確認
    │
    ├─ 足りる
    │   ↓
    │   スタミナ消費
    │   ↓
    │   現在のParrying終了
    │   ↓
    │   新しいParrying開始
    │
    └─ 足りない
        ↓
        再開始しない
        ↓
        現在のParrying継続
```

スタミナを消費するのは、HitStop終了後に確認を行い、実際に新しいParryingを開始するときです。入力を保持しただけでは、スタミナ消費や現在のParryingの終了を行いません。

開始条件を満たさない場合の現在のParryingの終了・継続や、保持入力の破棄はスタミナでは決めません。成功後の早期再入力、空振り時の再入力受付、HitStop中の入力保持および保持入力の破棄条件については「Playerアクション｜パリィ」を正とします。

---

## スタミナ不足

必要スタミナを満たしていないAction入力は無効とします。

例えばDashの場合、

```text
CurrentStamina < DashStaminaCost
↓
Dash入力
↓
Dashing開始不可
```

となります。

他ActionからDashへキャンセルしようとしていた場合も、スタミナ不足なら現在のActionを終了しません。

同様にParryでも、スタミナ不足により新しいParryingを開始できない場合は、現在のParryingを先に終了しません。

---

# スタミナ回復

スタミナは自動回復します。

ただし、スタミナを消費するActionの実行中には回復しません。

現在対象となるActionは、

- `Dashing`
- `Parrying`

です。

---

## スタミナ回復開始

スタミナを消費するActionが終了した後、一定時間経過すると自動回復を開始します。

```text
スタミナ消費Action開始
↓
スタミナ消費
↓
Action実行中
↓
スタミナ回復なし
↓
Action終了
↓
StaminaRecoveryDelay
↓
スタミナ回復開始
```

回復待機時間の具体値はパラメータとして調整します。

---

## スタミナ回復中

回復開始後は、最大スタミナに到達するまで継続的に回復します。

```text
スタミナ回復開始
↓
CurrentStamina += StaminaRecoveryRate
↓
MaxStaminaまで回復
↓
回復終了
```

現在スタミナは最大スタミナを超えません。

```text
CurrentStamina = Min(CurrentStamina, MaxStamina)
```

---

## 回復中に再びスタミナを消費した場合

回復待機中または回復中に、新しくスタミナ消費Actionを開始した場合は回復処理を停止します。

```text
スタミナ回復中
↓
Dash / Parry開始
↓
スタミナ消費
↓
回復停止
↓
Action終了
↓
StaminaRecoveryDelayを最初から開始
```

回復待機時間も最初から数え直します。

---

## Dashing中の回復

`ActionState = Dashing`の間はスタミナを回復しません。

Dash入力を長押ししてDash継続Phaseを維持している場合も同様です。

```text
Dashing
↓
スタミナ回復なし
↓
Dashing終了
↓
RecoveryDelay
↓
回復開始
```

---

## Parrying中の回復

`ActionState = Parrying`の間はスタミナを回復しません。

Recovery後半からの再入力またはParry成功後の早期再入力によって新しいParryingを連続して開始した場合も、Parryingが継続している間は回復しません。HitStop中に保持した入力から新しいParryingを開始する場合も同様です。

```text
Parrying
↓
Recovery後半またはParry成功後の再入力
↓
開始条件と必要スタミナを確認
↓
スタミナ消費
↓
新しいParrying
↓
再入力
↓
スタミナ消費
↓
新しいParrying
↓
最終的にParrying終了
↓
RecoveryDelay
↓
回復開始
```

---

## スタミナ回復と強制終了

被弾やRootState変更などによってDashingまたはParryingが強制終了した場合も、そのActionが終了した時点から回復待機へ移行します。

```text
Dashing / Parrying
↓
強制終了
↓
RecoveryDelay
↓
スタミナ回復
```

`Dead`へ遷移した場合は、死亡中のスタミナ回復によるGameplay復帰は行いません。

リスタート時にスタミナを最大値へ戻します。

---

# ステージリスタート時のステータス

死亡後にステージをリスタートする場合、PlayerのHPとスタミナを最大値へ戻します。

```text
Retry
↓
CurrentHP      = MaxHP
CurrentStamina = MaxStamina
```

具体的なリスタート処理については「Player死亡」を正とします。

---

## パラメータ

Playerステータスに関する主な調整項目を以下に示します。

| パラメータ | 内容 | 値 |
| --- | --- | --- |
| `MaxHP` | Playerの最大HP | 未定 |
| `MaxStamina` | Playerの最大スタミナ | 未定 |
| `DashStaminaCost` | Dash1回のスタミナ消費量 | 未定 |
| `ParryStaminaCost` | Parry1回のスタミナ消費量 | 未定 |
| `StaminaRecoveryDelay` | Action終了から回復開始までの待機時間 | 未定 |
| `StaminaRecoveryRate` | スタミナの回復速度 | 未定 |

---

## 各ページとの責務分離

| 内容 | 管理ページ |
| --- | --- |
| HP・最大HP | 本ページ |
| HP回復 | 本ページ |
| スタミナ・最大スタミナ | 本ページ |
| スタミナ消費・回復 | 本ページ |
| ダメージが成立する条件 | Playerリアクション｜被弾 |
| `SmallHit / BigHit` | Playerリアクション｜被弾 |
| Dash固有処理 | Playerアクション｜ダッシュ |
| Parry固有処理 | Playerアクション｜パリィ |
| `Dead`への遷移・死亡処理 | Player死亡 |
| 攻撃側のダメージ値 | 攻撃側の仕様 |
| 回復アイテムなどの効果 | 各対象システム |

---

## 未決事項

- `MaxHP`の具体値
- `MaxStamina`の具体値
- `DashStaminaCost`
- `ParryStaminaCost`
- `StaminaRecoveryDelay`
- `StaminaRecoveryRate`
- HPを回復する具体的な手段
- 最大HP・最大スタミナをゲーム進行で強化できるか

<PageRelations />
