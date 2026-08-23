---
title: "Playerアクション｜チャージ"
description: Palette BulletにおけるPlayerのシャオンダマ選択・チャージ仕様
pageType: spec
category: "Player"
order: 50
status: 仮仕様
relatedTasks: []
---

# Playerアクション｜チャージ

## 目的

本ページでは、Playerがシャオンダマを選択し、Charge結果を確定するまでのPlayerアクションについて定義します。

チャージは、以下の2つの`ActionState`として管理します。

```text
ActionState
├─ ClickCharging
└─ DragCharging
```

本ページでは主に以下を扱います。

* Charge入力Press時の対象取得
* Click / Dragの入力判定
* `ClickCharging / DragCharging`の開始条件
* 入力判定中にStateが変化した場合の処理
* Dashing中のCharge先行入力
* `ClickCharging`の対象保持・判定タイミング・終了
* `DragCharging`の選択・Release時Atomic判定・終了
* Normal / Weak Allocationへの接続
* `success / miss`のAction側定義
* 判定前中断と判定後結果の扱い
* Charge成功後のReservedへの移行
* Charge中のJump
* Dashによる終了・キャンセル
* SmallHit / BigHitによる中断
* RootState変更による強制終了

ActionState間の遷移可否、キャンセル、Action先行入力、Dashキャンセル入力バッファの共通ルールについては「Playerアクション遷移」を正とします。

本ページは、`ClickCharging / DragCharging`の**入力、対象選択、判定タイミング、success / miss、中断・終了**の正本です。

現在のNormal AttackEventの決定、Slot構造、Slot割り当て、Weak AttackEventへの割り当て、万能シャオンダマの割り当て解決については`docs/spec/draw-system/charge-allocation.md`を正とします。

Aiming中のカメラ・Playerの向き・Aim固有の移動補正については「Playerアクション｜照準」を正とします。

AttackEvent発火時の完全成立・不完全完成、使用するReserved済みシャオンダマ実体、Palette Bullet化、Chord / Arpeggioの発射処理については`docs/spec/bgm/bgm-attack-judgement.md`を正とします。

AttackEventの必要音、Chord / Arpeggio、音楽的順序・タイミングなどの音楽情報については`docs/spec/bgm/bgm-attack-event.md`を正とします。

## チャージとは

チャージとは、Playerが世界上の選択可能なシャオンダマを選び、Charge判定時点のAllocation結果に従ってNormal AttackEvent / SlotまたはWeak AttackEventへ対応付けるPlayerアクションです。

Charge Action開始時点では、そのChargeがNormalになるかWeakになるかを固定しません。

```text
Charge入力
↓
対象Shaondamaを保持
↓
Player Action側の判定タイミング
↓
charge-allocation.mdへ解決要求
│
├─ Normal AttackEvent / Slotへ有効に割り当て
│   ↓
│   Charge success
│
├─ Weak AttackEventへ有効に割り当て
│   ↓
│   Charge success
│
└─ 有効なAllocationなし
    ↓
    miss
```

Chargeに成功したシャオンダマは、Charge成功時点で即座に攻撃用Palette Bulletへ変換しません。

```text
世界上のシャオンダマ
↓
Charge success
↓
AttackEvent / Slot または Weak AttackEventへ対応付け
↓
ShaondamaをReservedへ移行
↓
世界上でその場に停止
↓
AttackEvent発火待ち
↓
AttackEvent発火
↓
Palette Bullet化
↓
攻撃
```

Charge成功後も、実際に攻撃へ使用されるシャオンダマ実体は世界上に存在します。

チャージには以下の2種類があります。

| ActionState | 用途 |
| --- | --- |
| `ClickCharging` | Press時に保持した1つのシャオンダマを判定する |
| `DragCharging` | 複数のシャオンダマを選択し、Release時に全体を一括判定する |

両者は同じCharge入力から判定しますが、別のActionStateとして管理します。

## 共通使用可能条件

Charge入力判定を開始する基本条件は以下です。

* `RootState = Gameplay`
* `ReactionState = None`
* 戦闘BGMが再生されている
* 現在の`ActionState`でCharge入力判定を開始できる
* Charge入力Press時に、レティクル上から選択可能なCharge対象を1つ取得できる

**Normal AttackEventが存在することはCharge開始条件ではありません。**

現在のNormal AttackEventが存在しない場合でも、ClickChargingを経由してWeak Allocationを成立させることができます。

Normal / Weakの最終決定はCharge Action開始時ではなく、Player Action側の実際のCharge判定タイミングで`docs/spec/draw-system/charge-allocation.md`へ問い合わせた結果によって決定します。

ClickChargingとDragChargingは、`Grounded`と`Airborne`のどちらでも開始できます。

```text
MovementState = Grounded
または
MovementState = Airborne
↓
Charge入力判定可能
```

通常は、

```text
ActionState = None
↓
Charge入力判定
↓
ClickCharging / DragCharging
```

として開始します。

`Dashing`中はその場でCharge Actionを開始しません。

Dashing中にCharge入力を行った場合は、Click / Dragを判定した後、対応するActionをAction先行入力として保持できます。

`Dashing → ClickCharging`および`Dashing → DragCharging`の遷移種別については「Playerアクション遷移」を正とします。

`MarkerFiring`、`ClickCharging`、`DragCharging`、`Parrying`中は、新しいCharge入力を受け付けません。

## チャージ対象

チャージ対象は以下の2種類です。

* シャオンダマ
* 万能シャオンダマ

どちらも、Press時点で世界上に存在し、Playerから`ChargeMaxDistance`以内にあり、現在選択可能な状態である必要があります。

### シャオンダマ

通常のシャオンダマは、それぞれ音程と自身のsource NoteEvent情報を持つ前提でCharge処理へ渡されます。

Charge判定時にCurrent Normal AttackEventへ有効に割り当てられる場合はNormal側のCharge successです。

Charge判定時にCurrent Normal AttackEventが存在しない場合は、そのシャオンダマ自身のsource NoteEvent occurrenceを用いたWeak Allocationを`docs/spec/draw-system/charge-allocation.md`へ要求します。

後続Normal AttackEventに同じ要求音が存在していても、現在の判定でCurrent Normal AttackEventを飛び越えて後続へChargeしません。

音名照合、オクターブ、同音Slot、未充填Slot、1 Slotあたりの上限、Weak AttackEvent生成・割り当てを含む具体的なAllocation規則については`docs/spec/draw-system/charge-allocation.md`を正とします。

### 万能シャオンダマ

万能シャオンダマもNormal / Weakの両方でCharge対象にできます。

Normalでは、Current Normal AttackEventの未充填Slotに対する解決を`docs/spec/draw-system/charge-allocation.md`へ要求します。

Weakでは、次に鳴るNoteEventへの解決を含むWeak Allocation処理を`docs/spec/draw-system/charge-allocation.md`へ委譲します。

本ページでは万能シャオンダマの実効Pitch、RGB、具体的なSlot・Weak AttackEvent解決方法を定義しません。

## 対象選択

シャオンダマの選択には、画面中央のレティクルを使用します。

Charge入力Press時に、以下の条件を満たす**選択可能なShaondama 1個**を開始対象として取得し、その実体参照を保持します。

* レティクルが対象のシャオンダマを示している
* Playerから`ChargeMaxDistance`以内に存在する
* 対象が現在選択可能な状態である

```text
Charge Press
↓
レティクル上の対象を取得
│
├─ 選択可能なShaondama Aあり
│   ↓
│   Aを開始対象として保持
│   ↓
│   Click / Drag入力判定へ
│
└─ 対象なし
    ↓
    Charge入力判定を開始しない
```

Press時に対象を取得できなかった入力は、Hold中に後からシャオンダマへレティクルが重なっても復活しません。

新しくChargeを行うには、改めてCharge入力をPressする必要があります。

Charge可能な対象とChargeできない対象は、UI上で判別できるようにします。

レティクル自体の表示条件については本ページでは定義しません。

Press時に保持した最初のShaondama Aは、Clickの場合もDragの場合もそのCharge操作の開始対象です。

DragChargingへ移行した場合、AもDrag選択リストへ含めます。

## Click / Drag入力判定

ClickChargingとDragChargingは同じCharge入力を使用します。

Charge入力Press時には、まずレティクル上の選択可能なShaondama Aを取得して保持します。

Pressした瞬間にはまだ`ActionState`を`ClickCharging / DragCharging`へ変更しません。

Click / Dragは**マウス移動量では判定しません**。

Press後、Charge入力をHoldしている間に**最初に保持したAとは別の選択可能なShaondamaを経由したか**と、その時点でCurrent Normal AttackEventが存在するかによって判定します。

```text
Charge Press
↓
Shaondama Aを保持
↓
Charge入力Hold
│
├─ Current Normal AttackEventなし
│   │
│   ├─ 別Shaondamaを通過
│   │   → 無視
│   │
│   └─ Release
│       ↓
│       ClickCharging要求
│
└─ Current Normal AttackEventあり
    │
    ├─ Releaseまで別Shaondamaを経由しない
    │   ↓
    │   ClickCharging要求
    │
    └─ 別Shaondama Bを経由
        ↓
        DragCharging要求
        ↓
        A / BをDrag選択リストへ保持
```

このClick / Drag入力判定中はPlayerのStateではありません。

また、`ActionState = None`で判定中の時点では`Pending Action`にも登録しません。

ClickChargingまたはDragChargingのどちらであるかが確定した時点で、初めて対象Actionの開始要求として扱います。

### 入力判定を開始できるState

Charge入力PressによってClick / Drag入力判定を開始できるのは、以下の場合です。

```text
RootState = Gameplay
ReactionState = None
戦闘BGM再生中
+
ActionState = None
または
ActionState = Dashing
```

さらにPress時に選択可能なShaondamaを1個取得できる必要があります。

`ActionState = None`では、判定結果に応じてChargeを通常開始します。

`ActionState = Dashing`では、その場でCharge Actionを開始せず、判定結果をAction先行入力として使用します。

それ以外のActionStateでは、Charge入力Press自体を無視します。

| ActionState | Charge入力判定 |
| --- | --- |
| `None` | ○ |
| `Dashing` | ○：先行入力用 |
| `MarkerFiring` | × |
| `ClickCharging` | × |
| `DragCharging` | × |
| `Parrying` | × |

入力判定を開始しなかったCharge入力は、後からStateやレティクル対象が変化しても復活させません。

### Click判定

Press時にShaondama Aを保持した後、DragChargingへ移行しないままCharge入力をReleaseした場合、ClickChargingとして扱います。

```text
Charge Press
↓
Aを保持
↓
別ShaondamaによるDrag成立なし
↓
Charge Release
↓
ClickCharging要求
```

Charge入力Releaseの時点では、Normal / Weak、AttackEvent、Slotを確定しません。

ClickChargingのCharge判定Event時にAllocationを解決します。

### Drag判定

Charge入力をHold中、**Current Normal AttackEventが存在する状態で**、最初に保持したAとは別の選択可能なShaondama Bをレティクルが経由した時点でDragChargingとして扱います。

```text
Charge Press
↓
Aを保持
↓
Charge入力Hold
↓
Current Normal AttackEventあり
↓
別Shaondama Bを通過
↓
DragCharging要求
↓
Drag選択リスト = A / B
```

Drag成立条件にマウス移動量や距離閾値は使用しません。

Current Normal AttackEventが存在しない間に通過した別Shaondamaは無視し、DragChargingへ移行しません。

したがって、Weak側となり得る入力ではClickChargingのみを使用できます。

なおNormal / Weak自体はここでは確定しません。最終的なAllocation先は実際のCharge判定時点で決定します。

## 入力判定中にStateが変化した場合

Click / Drag入力判定を開始した後、判定結果が確定する前にPlayerのStateが変化する場合があります。

入力判定は、現在のStateでもCharge入力を有効に扱える場合のみ継続します。

### ActionStateがNoneからDashingへ変化した場合

入力判定中にDashingが開始された場合は、入力判定を破棄しません。

```text
ActionState = None
↓
Charge Press
↓
Click / Drag入力判定中
↓
Dash開始
↓
ActionState = Dashing
↓
入力判定継続
```

その後ClickまたはDragが確定した場合は、DashingからのAction先行入力として扱います。

### Dashingが正常終了した場合

Dashing中にCharge入力判定を開始し、Click / Dragがまだ確定していない状態でDashingが正常終了した場合、入力判定は継続します。

```text
Dashing
↓
Charge Press
↓
Click / Drag入力判定中
↓
Dashing正常終了
↓
ActionState = None
↓
入力判定継続
```

その後、

* Releaseした場合はClickCharging
* Drag条件が成立した場合はDragCharging

として、現在の`ActionState = None`から開始を試みます。

開始時にはChargeの共通使用可能条件を改めて確認します。

### Charge開始不可のActionStateへ変化した場合

入力判定中にCharge開始不可のActionStateへ遷移した場合は、入力判定を破棄します。

対象は主に以下です。

* `MarkerFiring`
* `ClickCharging`
* `DragCharging`
* `Parrying`

破棄した入力を後から復活させません。

### ReactionStateが開始した場合

Click / Drag入力判定中に`SmallHit`または`BigHit`が成立した場合、入力判定を破棄します。

```text
Charge Press
↓
入力判定中
↓
SmallHit / BigHit
↓
入力判定破棄
```

Reaction終了後に同じ入力のReleaseやDrag条件成立を検出しても、Chargeを開始しません。

新しいCharge入力Pressが必要です。

### RootStateが変更された場合

入力判定中に`Gameplay`から別のRootStateへ遷移した場合、入力判定を破棄します。

対象となる主なRootStateは以下です。

* `Conversation`
* `Interacting`
* `Dead`

Gameplayへ戻った後も入力判定を再開しません。

### MovementState・AimStateのみが変化した場合

`Grounded / Airborne`はどちらもChargeを使用できるため、MovementStateの変化だけを理由に入力判定を破棄しません。

ChargeはAimingとも同時成立できるため、AimStateの変化だけを理由に入力判定を破棄しません。

ただし、Dashing中のJumpや接地喪失など、Dashingを特殊終了させる処理が発生した場合は、Dashing側のAction先行入力破棄ルールを優先します。

## Dashing中のCharge先行入力

Dashing中は、ClickChargingまたはDragChargingをAction先行入力として保持できます。

遷移種別、保持数、上書き、評価順、破棄条件などの共通ルールについては「Playerアクション遷移」を正とします。

本ページでは、共通Charge入力からどちらのActionを先行入力するかを決定する処理と、Charge固有の保持対象のみ定義します。

Dashing中でもCharge Press時にレティクル上の選択可能なShaondama Aを取得できなければ、Charge入力判定を開始しません。

### ClickChargingの先行入力

Dashing中にCharge入力をPressしてAを保持し、DragChargingが成立しないままReleaseした場合、ClickChargingの先行入力として登録します。

```text
Dashing
↓
Charge Press
↓
Aを保持
↓
Drag成立なし
↓
Charge Release
↓
Pending Action = ClickCharging
```

Pending Actionには、Press時に保持したAをClick判定対象として引き継ぎます。

Dashingが正常終了した時点でClickChargingの開始条件を再確認し、条件を満たしている場合に開始します。

### DragChargingの先行入力

Dashing中にCharge入力をPressしてAを保持した後、Current Normal AttackEventが存在する状態で別Shaondama Bを経由した場合、DragChargingの先行入力として登録します。

```text
Dashing
↓
Charge Press
↓
Aを保持
↓
Current Normal AttackEventあり
↓
別Shaondama Bを通過
↓
Pending Action = DragCharging
```

Pending Actionには、Drag成立に使用した`A / B`を初期選択内容として引き継ぎます。

Dashingが正常終了した時点でDragChargingの開始条件を再確認します。

### DragCharging先行入力中にCharge入力を離した場合

DragChargingはCharge入力をHoldして継続するActionです。

そのため、DragChargingを先行入力として保持した後、Dashing終了前にCharge入力をReleaseした場合は、保持しているDragCharging開始要求と未確定の選択内容を破棄します。

この処理は`miss`として扱いません。

Dashing終了後に自動的にDragChargingを開始することもありません。

### 先行入力として登録するタイミング

Charge入力Pressの時点では、まだClickChargingとDragChargingのどちらであるか決まっていません。

Action先行入力へ登録するのはClick / Drag判定が確定した時点です。

Clickの場合はRelease時、Dragの場合はCurrent Normal AttackEvent存在中に別Shaondamaを経由した時点で確定します。

### Dashingが強制・特殊終了した場合

Dashingが正常終了以外の形で終了した場合は、Chargeに関する情報を破棄します。

対象には以下を含みます。

* まだClick / Dragが確定していない入力判定
* Press時に保持した開始対象
* すでに確定しているClickCharging / DragChargingのAction先行入力
* Drag先行入力が保持している未確定の選択内容

その後、自動的にChargeを開始しません。

この破棄自体は`miss`として扱いません。

具体的なDashingの正常終了・特殊終了・強制終了については「Playerアクション｜ダッシュ」を正とします。

## ClickCharging

### ClickChargingとは

ClickChargingは、1つのシャオンダマを選択する短時間Actionです。

```text
ActionState = None
↓
Click判定成立
↓
ActionState = ClickCharging
```

ClickCharging中はチャージモーションを再生し、その途中に存在するCharge判定Eventでチャージ結果を確定します。

### ClickCharging開始

Press時にShaondama Aを保持した入力がClickと確定し、ClickChargingの開始条件を満たしている場合、`ActionState`を`ClickCharging`へ変更します。

```text
Charge Press
↓
Aを保持
↓
Charge Release
↓
Drag成立なし
↓
ClickCharging開始条件確認
↓
ActionState = ClickCharging
```

Dashing中にClickChargingが先行入力されている場合は、Dashing正常終了後にPlayer State側の開始条件を確認して開始します。

この時点でNormal / Weak、AttackEvent、Slotは確定しません。

### Press時に保持した対象

ClickChargingが使用する対象は、**Charge Press時に取得したShaondama A**です。

ClickCharging開始時やRelease時に、レティクルから対象を取り直しません。

```text
Charge Press
↓
レティクル上のShaondama Aを保持
↓
Charge Release
↓
ClickCharging
↓
判定対象はAのまま
```

ClickCharging中にレティクルが別のShaondamaへ移動しても、A以外はClick判定対象にしません。

Current Normal AttackEventが存在しない間に別Shaondamaを通過しても、そのShaondamaは無視します。

ただし、ClickCharging開始前の入力判定中にCurrent Normal AttackEventが存在する状態で別Shaondamaを経由した場合は、ClickではなくDragChargingへ移行します。

Press時に保持するのはShaondama実体のみです。

AttackEvent / Slot / Weak AttackEventは保持しません。

```text
Charge Press
↓
Shaondama Aのみ保持
↓
AttackEvent未確定
Slot未確定
Normal / Weak未確定
```

AttackEventとAllocation先の判定は、後述するCharge判定Event発生時に行います。

### ClickCharging内部Phase

ClickChargingは、以下の内部Phaseを持ちます。

```text
ClickCharging
│
├─ 判定前・キャンセル不可Phase
│
└─ 判定後・Dashキャンセル可能Phase
```

Phaseは別のPlayer Stateではありません。

`ActionState`はClickCharging開始から終了まで`ClickCharging`のままです。

#### 判定前・キャンセル不可Phase

ClickCharging開始からCharge判定EventまでのPhaseです。

このPhaseでは以下を行います。

* チャージモーションを再生する
* Press時から保持しているシャオンダマのチャージ結果はまだ確定しない
* AttackEventとSlotはまだ確定しない
* Dashキャンセルはまだ成立しない
* ClickCharging再入力を受け付けない

ただし、キャンセル受付開始直前のDash入力については、Dashキャンセル入力バッファの対象にできます。

```text
ClickCharging
↓
判定前
↓
キャンセル受付直前にDash入力
↓
Dash要求を短時間保持
↓
Charge判定Event
↓
Dashキャンセル可能
```

Dashキャンセル入力バッファの共通ルールと具体的な保持時間については「Playerアクション遷移」を正とします。

#### 判定後・Dashキャンセル可能Phase

Charge判定Eventによってチャージ結果が確定した後から、ClickCharging正常終了までのPhaseです。

このPhaseでは以下を行います。

* チャージ後モーションを継続する
* Dashキャンセルを受け付ける
* ClickCharging再入力を受け付けない
* 確定済みのチャージ結果を維持する

```text
Charge判定Event
↓
チャージ結果確定
↓
Dashキャンセル受付開始
↓
モーション終了
↓
ClickCharging終了
```

## ClickChargingの判定

Charge判定Eventが発生した時点で、Press時から保持しているShaondama Aを判定します。

重要なのは、AttackEventやSlotをPress時・Click判定時・ClickCharging開始時には固定せず、**Charge判定Event発生時点の状態**を使用することです。

```text
Charge Press
↓
Aを保持
↓
Release
↓
ClickCharging
↓
Charge判定Event
↓
Aが判定可能な実体として存在するか確認
│
├─ 存在しない / 無効
│   ↓
│   miss
│
└─ 存在する
    ↓
    charge-allocation.mdへAllocation解決要求
    │
    ├─ Normal AttackEvent / Slotへ有効に割り当て
    │   ↓
    │   success
    │
    ├─ Weak AttackEventへ有効に割り当て
    │   ↓
    │   success
    │
    └─ 有効なAllocationなし
        ↓
        miss
```

現在のNormal AttackEventの決定、Slot割り当て、Weak AttackEvent生成・割り当ての詳細は`docs/spec/draw-system/charge-allocation.md`を正とします。

ClickChargingで各情報が確定するタイミングは以下です。

| 内容 | 確定タイミング |
| --- | --- |
| 開始対象Shaondama | Charge Press時 |
| Click / Drag | Release時までDragが成立しなければClick |
| Normal / Weak | Charge判定Event時のAllocation結果 |
| Normal AttackEvent | Charge判定Event時 |
| Slot | Charge判定Event時 |
| Weak AttackEvent | Charge判定Event時 |

### Charge判定Eventまでに対象が消失した場合

Press時に保持したShaondama Aが、source NoteEvent到達などによってCharge判定Eventより前に消滅・無効化されても、その時点で自動的に別対象へ差し替えません。

Charge判定EventまでActionが継続した場合は、Aが有効な判定対象として存在しないため`miss`です。

```text
ClickCharging
↓
Aを保持中
↓
Charge成功前にAが消滅
↓
Charge判定Event
↓
Aが存在しない
↓
miss
```

判定Eventより前にDash、Reaction、RootState変更などでClickCharging自体が終了した場合は、判定結果を確定していないため`miss`にはしません。

### Normal / Weakの切り替わり

Normal / WeakはClickCharging開始時には固定しません。

そのため、以下の両方を許可します。

```text
Click開始時：Current Normal AttackEventあり
↓
Charge判定Event時：Current Normal AttackEventなし
↓
Weak Allocationを解決
```

```text
Click開始時：Current Normal AttackEventなし
↓
Charge判定Event時：Current Normal AttackEventあり
↓
Normal Slot Allocationを解決
```

通常ShaondamaをWeakへ解決する場合は、そのShaondama自身のsource NoteEvent occurrenceを使用します。

万能ShaondamaのWeak解決では、次に鳴るNoteEventへの解決を含め`docs/spec/draw-system/charge-allocation.md`を正とします。

Weakは`1 Charge = 1 Shaondama = 1 Weak AttackEvent`です。

### success

`docs/spec/draw-system/charge-allocation.md`による解決の結果、Shaondama AがNormal AttackEvent / SlotまたはWeak AttackEventへ有効に割り当てられた場合をCharge successとします。

Normal successとWeak successをPlayer Action側で別のAction結果にはしません。

成功時は以下の処理を行います。

* Allocation結果に従ってAttackEvent / SlotまたはWeak AttackEventへ対応付ける
* 成功したShaondamaを`Reserved`へ移行する
* 世界上でその場に停止させる
* 対応するAttackEventの発火待ち状態にする
* 成功に応じたコンボ処理を行う

この時点ではPalette Bulletへ変換しません。

### miss

PlayerがCharge結果を確定するCharge判定Eventまで進んだが、有効なAllocationが成立しなかった場合は`miss`です。

主な例は以下です。

* 保持Shaondamaが判定Event時点ですでに消滅・無効化されている
* Current Normal AttackEventは存在するが、有効な未充填Slotへ割り当てられない
* Current Normal AttackEventが存在せず、Weak Allocationも成立しない

`miss`時は以下の処理を行います。

* ShaondamaをReservedへ移行しない
* Normal Slot / Weak AttackEventへcommitしない
* AttackEvent発火待ち状態へ移行しない
* 継続中のコンボを中断する

## ClickCharging中の移動

ClickCharging中は通常移動を制限しません。

Move入力が可能な状態であれば、通常時と同じ基本移動速度で移動できます。

```text
ActionState = ClickCharging
+
Move入力
↓
通常速度で移動
```

Aimingも同時成立している場合は、Aiming側の移動速度補正が適用されます。

移動速度の最終決定については「Player基本移動」を正とします。

## ClickCharging中のJump

ClickCharging中はJumpできます。

Jumpによって変更するのは`MovementState`のみです。

```text
MovementState = Grounded
ActionState   = ClickCharging
↓
Jump
↓
MovementState = Airborne
ActionState   = ClickCharging
```

JumpによってClickChargingを終了しません。

以下もそのまま継続します。

* ClickChargingのモーション
* Charge判定Eventまでの進行
* Press時から保持しているシャオンダマ
* Charge判定Event後に確定したチャージ結果

Jump処理自体については「Player移動｜ジャンプ」を正とします。

## ClickChargingとDashing

`ClickCharging → Dashing`はキャンセル遷移です。

遷移種別は「Playerアクション遷移」で`C→`として定義します。

ClickChargingでは、Charge判定Event以降からDashキャンセルを成立させることができます。

```text
ClickCharging
↓
判定前
↓
Dashキャンセル不可
↓
Charge判定Event
↓
Dashキャンセル受付開始
```

### キャンセル可能区間でDash入力した場合

Charge判定Event後にDash入力が行われ、Dashingの開始条件を満たしている場合は、ClickChargingを終了してDashingへ遷移します。

```text
ClickCharging
↓
Charge判定済み
↓
Dash入力
↓
Dash開始条件確認
↓
条件成立
↓
ClickCharging終了
↓
Dashing
```

確定済みのチャージ結果はDashキャンセルによって取り消しません。

Dashを開始できない場合はClickChargingを継続します。

### キャンセル受付直前にDash入力した場合

判定前・キャンセル不可Phaseであっても、キャンセル受付開始直前のDash入力は短時間だけ保持できます。

```text
ClickCharging
↓
Charge判定Event直前
↓
Dash入力
↓
Dash要求を短時間保持
↓
Charge判定Event
↓
Dashキャンセル受付開始
↓
Dash開始条件確認
│
├─ 条件成立
│   ↓
│   ClickCharging終了
│   ↓
│   Dashing
│
└─ 条件不成立
    ↓
    ClickCharging継続
```

この仕組みはDashキャンセル入力バッファです。

`B→`で使用するAction先行入力とは別の仕組みであり、

```text
ClickCharging → Dashing = C→
```

という遷移種別自体は変更しません。

### バッファ対象より早いDash入力

キャンセル受付開始まで十分な時間が残っており、Dashキャンセル入力バッファの有効期間にも入っていない状態でDash入力が行われた場合は、その入力を保持しません。

```text
ClickCharging
↓
キャンセル受付までまだ時間がある
↓
Dash入力
↓
保持しない
↓
ClickCharging継続
```

どの程度直前の入力を保持するかについては調整パラメータとし、本ページでは固定しません。

## ClickCharging再入力

ClickCharging中に再度Charge入力をPressしても、その入力は無視します。

Click / Drag入力判定も開始しません。

Action先行入力として保持することもありません。

```text
ClickCharging
↓
Charge Press
↓
無視
```

## ClickChargingと被弾

`SmallHit`または`BigHit`が成立した場合、ClickChargingを強制終了します。

### 判定前に被弾した場合

```text
ClickCharging
↓
Charge判定前
↓
SmallHit / BigHit
↓
ClickCharging強制終了
↓
ActionState = None
↓
ReactionState = SmallHit / BigHit
```

開始時に保持していたシャオンダマ情報を破棄します。

チャージ結果は発生しません。

この中断自体は`miss`として扱いません。

### 判定後に被弾した場合

```text
ClickCharging
↓
Charge判定済み
↓
SmallHit / BigHit
↓
ClickCharging強制終了
↓
ActionState = None
↓
ReactionState = SmallHit / BigHit
```

すでに確定したチャージ結果は取り消しません。

被弾による中断自体は`miss`として扱いません。

## ClickChargingの終了

ClickChargingの主な終了条件を以下に示します。

| 終了原因        | 未確定の対象 | 確定済み結果 | miss | 結果                   |
| ----------- | ------ | ------ | ---- | -------------------- |
| モーション正常終了   | ―      | 維持     | なし   | `ActionState = None` |
| Dashキャンセル   | 破棄     | 維持     | なし   | `Dashing`            |
| `SmallHit`  | 破棄     | 維持     | なし   | `ActionState = None` |
| `BigHit`    | 破棄     | 維持     | なし   | `ActionState = None` |
| RootState変更 | 破棄     | 維持     | なし   | Gameplay内部Action終了   |

正常終了した場合は、

```text
ClickCharging
↓
モーション終了
↓
ActionState = None
```

となります。

## DragCharging

### DragChargingとは

DragChargingは、複数のShaondamaを選択し、Charge入力Release時に**選択リスト全体をAtomicに判定する**継続Actionです。

DragChargingは、Current Normal AttackEventが存在する状態で、Press時に保持した最初のShaondama Aとは別の選択可能なShaondama Bを経由した時点で成立します。

```text
Charge Press
↓
Shaondama Aを保持
↓
Current Normal AttackEventあり
↓
別Shaondama Bを通過
↓
DragCharging成立
↓
選択リスト = A / B
```

Current Normal AttackEventが存在しない状態ではDragChargingへ移行しません。

### DragCharging開始

`ActionState = None`でDrag条件が成立し、DragChargingの開始条件を満たしている場合、`ActionState`を`DragCharging`へ変更します。

```text
ActionState = None
↓
Charge PressでAを保持
↓
Current Normal AttackEventあり
↓
別Shaondama Bを通過
↓
ActionState = DragCharging
↓
初期選択リスト = A / B
```

最初にPressしたAもDrag選択対象です。

Drag開始時に空の選択リストを作るのではなく、Drag成立に使った`A / B`を初期選択内容として保持します。

Dashing中にDragChargingが先行入力された場合は、Dashing正常終了時に以下を確認します。

* DragChargingのPlayer State側の開始条件を満たしている
* Charge入力が現在もHoldされている

両方を満たしている場合のみDragChargingを開始し、Pending Actionが保持していた`A / B`を初期選択内容として引き継ぎます。

## DragCharging中の選択

DragCharging中は、レティクルが**世界上で現在選択可能なCharge対象**を通過した場合、そのShaondamaを選択リストへ追加します。

選択時点では、そのShaondamaがCurrent Normal AttackEventの要求音へ適合するかを判定しません。

通常Shaondama / 万能Shaondamaのどちらも、世界上で選択可能なCharge対象であれば選択リストへ追加できます。

```text
DragCharging
↓
レティクルがShaondamaを通過
↓
現在選択可能か確認
│
├─ 選択可能
│   ↓
│   選択リストへ追加
│
└─ 選択不可
    ↓
    追加しない
```

### 同じShaondamaを再び通過した場合

同じDragCharging中に、一度選択した同一実体を再びレティクルが通過しても追加しません。

```text
Shaondama Aを選択済み
↓
再度Aを通過
↓
追加しない
```

1回のDragChargingにつき、同一Shaondama実体は1回だけ選択できます。

### 選択済みShaondamaが無効化・消滅した場合

Drag選択リストへ入ったShaondamaがRelease前に無効化・消滅しても、そのShaondamaだけを自動的に選択リストから削除しません。

残りのShaondamaだけで再判定することもありません。

Release時に、選択済みShaondamaの1つでも有効な判定対象として存在しない場合は**Drag全体miss**です。

### Drag選択順

DragChargingでShaondamaを選択した順序は、Allocationの成立条件に使用しません。

例えばCurrent Normal AttackEventの未充填Slot要求が、

```text
C / E / G
```

であれば、

```text
C → E → G
```

だけでなく、

```text
G → C → E
```

の順でPlayerが選択しても、音の組み合わせと必要個数が全体として一致すれば成立可能です。

Arpeggioの発射時にはPlayerの選択順ではなく、AttackEvent側に設定された音楽的順序・タイミングを使用します。

Arpeggioの音楽情報は`docs/spec/bgm/bgm-attack-event.md`、発火時の発射処理は`docs/spec/bgm/bgm-attack-judgement.md`を正とします。

## DragChargingのRelease

DragCharging中にCharge入力をReleaseすると、その時点の選択リストを確定し、全体を一括判定します。

```text
DragCharging
↓
Charge入力Release
↓
選択リスト確定
↓
Release時点のCurrent Normal AttackEventを1つ決定
↓
選択リスト全体をAtomic検証
│
├─ 全体成立
│   ↓
│   一括commit
│   ↓
│   success
│
└─ 全体不成立
    ↓
    commitなし
    ↓
    miss
↓
ActionState = None
```

Charge入力Releaseによる判定は、DragChargingの正常終了として扱います。

## DragChargingの判定

Release時に使用する判定対象は、**Release時点のCurrent Normal AttackEvent 1つだけ**です。

Current Normal AttackEventの決定自体は`docs/spec/draw-system/charge-allocation.md`を正とします。

DragではWeak Allocationを行いません。

Release時にCurrent Normal AttackEventが存在しない場合は、選択内容をWeakへ変換せずDrag全体`miss`とします。

### Atomic検証

Release後、Slot状態を書き換える前に以下をすべて検証します。

* 選択済みShaondamaがすべて有効な判定対象として存在する
* Release時点のCurrent Normal AttackEventが存在する
* 選択Shaondama群が、Current Normal AttackEventの**対象となる未充填Slot群へ全体として過不足なく割り当て可能**である
* 同音Slotを含む場合、必要個数を満たしている
* Slotへ割り当てられないShaondamaを1つも含まない

具体的な通常Shaondama / 万能ShaondamaのSlot解決は`docs/spec/draw-system/charge-allocation.md`を正とします。

検証中はSlotへ書き込みません。

すべての検証が成功した場合だけ、全Allocationを一括commitします。

### success

選択Shaondama群がCurrent Normal AttackEventの対象となる未充填Slot群へ全体として過不足なく割り当て可能な場合のみ、Drag Charge successです。

成功時は、検証済みの全Allocationを一括commitし、選択した全Shaondamaを`Reserved`へ移行します。

成功したShaondamaについて以下を行います。

* Current Normal AttackEvent / Slotへ対応付ける
* `Reserved`へ移行する
* 世界上でその場に停止させる
* 対応するAttackEventの発火待ち状態にする
* 成功に応じたコンボ処理を行う

この時点ではPalette Bulletへ変換しません。

### miss

以下のいずれかに該当する場合は、Drag全体`miss`です。

* Release時にCurrent Normal AttackEventが存在しない
* 選択済みShaondamaの1つ以上が消滅・無効化されている
* 要求より選択数が少ない
* 要求より選択数が多い
* 要求Slotへ割り当てられないShaondamaを1つ以上含む
* 同音Slotの必要個数を満たしていない
* その他、選択リスト全体を未充填Slot群へ過不足なく割り当てられない

`miss`時は**Slot状態を一切変更しません**。

部分successは存在しません。

すでに検証した一部Shaondamaだけをcommitすることもありません。

選択した一部だけをCurrent Normal AttackEventへ入れ、残りを次のAttackEventへ送ることもありません。

```text
Current Normal AttackEventの未充填要求
C / E / G
```

に対して、

```text
Drag C / E / G
→ success

Drag G / C / E
→ success

Drag C / E
→ miss

Drag C / E / G / A
→ miss

Drag C / F / G
→ miss
```

です。

また、

```text
要求 C / C / E
選択 C / E
```

のように同音Slotの必要個数を満たさない場合も`miss`です。

`miss`が確定した場合はコンボを中断します。

## DragCharging中の移動

DragCharging中もMove入力による移動は可能です。

ただし、通常時より移動速度を低下させます。

```text
ActionState = DragCharging
+
Move入力
↓
低速移動
```

Aimingも同時成立している場合は、AimingとDragChargingの両方による移動速度補正が存在します。

複数の補正が同時成立した場合の最終速度については「Player基本移動」を正とします。

## DragCharging中のJump

DragCharging中はJumpできます。

Jumpによって変更するのは`MovementState`のみです。

```text
MovementState = Grounded
ActionState   = DragCharging
↓
Jump
↓
MovementState = Airborne
ActionState   = DragCharging
```

JumpによってDragChargingを終了しません。

それまでに選択したShaondamaも維持します。

Airborne移行後もCharge入力がHoldされている間はDragChargingを継続できます。

Jump処理自体については「Player移動｜ジャンプ」を正とします。

## DragChargingとDashing

`DragCharging → Dashing`の遷移種別については「Playerアクション遷移」を正とします。

Dash入力を受け付けた場合は、Dashingの開始条件を確認します。

```text
DragCharging
↓
Dash入力
↓
Dash開始条件確認
│
├─ 条件成立
│   ↓
│   DragCharging終了
│   ↓
│   未確定の選択内容を破棄
│   ↓
│   Dashing
│
└─ 条件不成立
    ↓
    DragCharging継続
```

Dashingへの遷移が成立した場合、それまで選択していた未確定のShaondama選択内容はすべて破棄します。

Release判定まで進んでいないため、この終了は`miss`として扱いません。

コンボも中断しません。

## DragChargingとSmallHit

`SmallHit`が成立した場合、DragChargingを強制終了します。

```text
ActionState   = DragCharging
ReactionState = None
↓
SmallHit
↓
未確定の選択内容を破棄
↓
ActionState   = None
ReactionState = SmallHit
```

SmallHitによる中断ではRelease判定を行いません。

そのため、この終了は`miss`として扱いません。

コンボも中断しません。

Aimingも同時成立している場合は、被弾の共通ルールに従ってAimも終了します。

被弾処理自体については「Playerリアクション｜被弾」を正とします。

## DragChargingとBigHit

`BigHit`が成立した場合もDragChargingを強制終了します。

```text
DragCharging
↓
BigHit
↓
未確定の選択内容を破棄
↓
ActionState = None
ReactionState = BigHit
```

BigHitによる中断でもRelease判定を行いません。

この終了は`miss`として扱いません。

コンボも中断しません。

## DragChargingの終了

DragChargingの主な終了条件を以下に示します。

| 終了原因 | 選択内容 | Slot commit | miss | コンボ | 結果 |
| --- | --- | --- | --- | --- | --- |
| Releaseして全体成立 | Atomic判定・確定 | 全Allocationを一括commit | なし | 成功処理 | `ActionState = None` |
| Releaseして全体不成立 | Atomic判定 | なし | 発生 | 中断 | `ActionState = None` |
| Dash | 破棄 | なし | なし | 維持 | `Dashing` |
| `SmallHit` | 破棄 | なし | なし | 維持 | `ActionState = None` |
| `BigHit` | 破棄 | なし | なし | 維持 | `ActionState = None` |
| RootState変更 | 破棄 | なし | なし | 維持 | Gameplay内部Action終了 |

## Aimingとの関係

`ClickCharging`と`DragCharging`は、どちらもAimingと同時成立できます。

```text
Aiming + ClickCharging
```

```text
Aiming + DragCharging
```

Aiming中にChargeを開始した場合もAimを終了しません。

Charge中にAimingを開始することもできます。

### Aimを終了した場合

Charge中にAim終了条件が成立しても、Charge自体は終了しません。

```text
AimState    = Aiming
ActionState = ClickCharging
↓
Aim終了
↓
AimState    = Normal
ActionState = ClickCharging
```

```text
AimState    = Aiming
ActionState = DragCharging
↓
Aim終了
↓
AimState    = Normal
ActionState = DragCharging
```

Aiming中のカメラ・Player向き・移動補正については「Playerアクション｜照準」を正とします。

## Grounded / Airborneとの関係

ClickChargingとDragChargingは、どちらもGrounded / Airborneの両方で開始・継続できます。

| ActionState     | Grounded | Airborne |
| --------------- | -------- | -------- |
| `ClickCharging` | ○        | ○        |
| `DragCharging`  | ○        | ○        |

Charge実行中にJumpまたは接地喪失によって`Grounded → Airborne`へ移行しても、Chargeを終了しません。

```text
Grounded + ClickCharging
↓
Jump / 接地喪失
↓
Airborne + ClickCharging
```

```text
Grounded + DragCharging
↓
Jump / 接地喪失
↓
Airborne + DragCharging
```

同様に、Airborne中に着地して`Grounded`へ戻ってもChargeは継続します。

Airborne中の移動処理については「Player基本移動」を正とします。

ただし、Dashing中のCharge入力判定またはCharge先行入力を保持した状態で、Jumpや接地喪失によってDashingが特殊終了した場合は、Dashing側の先行入力破棄ルールを優先します。

## Parryingとの関係

ClickChargingおよびDragChargingからParryingへの遷移可否については「Playerアクション遷移」を正とします。

Charge中に受け付けられないParry入力が行われた場合は、現在のChargeを継続します。

Parrying中にCharge入力をPressした場合も、Click / Drag入力判定を開始しません。

その入力をParrying終了後のAction先行入力として保持することもありません。

## MarkerFiringとの関係

ClickChargingおよびDragChargingとMarkerFiringのActionState間遷移については「Playerアクション遷移」を正とします。

Charge実行中にMarker入力が行われても、遷移が許可されていない場合は現在のChargeを継続します。

AimingとChargeが同時成立している場合でも、Charge中であることを理由にActionStateの遷移ルールを変更しません。

MarkerFiring中にCharge入力をPressした場合も、Click / Drag入力判定を開始しません。

## RootStateによる強制終了

ClickChargingまたはDragCharging中にGameplayから別のRootStateへ遷移する場合、Charge Actionを強制終了します。

また、Click / Drag入力判定中の場合も入力判定を破棄します。

対象となる主なRootStateは以下です。

* `Conversation`
* `Interacting`
* `Dead`

RootState変更は通常のAction入力より優先します。

### ClickCharging

Charge判定Event前に強制終了した場合、Press時から保持していたShaondama情報を破棄し、Charge結果は発生しません。

この中断自体は`miss`として扱いません。

Charge判定Event後に強制終了した場合、すでに確定したCharge結果は取り消しません。

success済みで`Reserved`へ移行したShaondamaも、そのままAttackEvent発火待ちを継続します。

### DragCharging

DragCharging中にRootStateが変更された場合、Release判定を行わず、未確定の選択内容を破棄して終了します。

```text
DragCharging
↓
RootState変更
↓
未確定の選択内容を破棄
↓
DragCharging終了
```

この終了は`miss`として扱いません。

DragChargingはRelease時にのみ結果を確定するため、RootState変更より前にsuccessが確定しているケースはありません。

`Dead`への遷移は他のPlayer状態より優先します。

## チャージ成功とmiss

### success

`docs/spec/draw-system/charge-allocation.md`による解決の結果、選択Shaondamaが以下のいずれかへ有効に割り当てられた場合をCharge successとします。

* Normal AttackEvent / Slot
* Weak AttackEvent

Player Action側ではNormal successとWeak successを別Action結果にしません。

どちらもCharge successです。

Clickでは1個のShaondama、DragではAtomic判定に成功した選択Shaondama群全体がsuccess対象になります。

成功したShaondamaについて以下を行います。

* Allocation結果に従ってAttackEvent / SlotまたはWeak AttackEventへ対応付ける
* Shaondamaを`Reserved`へ移行する
* 世界上でその場に停止させる
* 対応するAttackEventの発火待ち状態にする
* コンボ加算などの成功処理を行う

Charge成功時点では攻撃用Palette Bulletへ変換しません。

AttackEvent発火時の成立判定、使用するReserved済み実体、Palette Bullet化、Chord / Arpeggioの発射については`docs/spec/bgm/bgm-attack-judgement.md`を正とします。

### miss

`miss`は、PlayerがCharge結果を確定する判定タイミングまで進んだが、有効なAllocationが成立しなかった場合に発生します。

判定タイミングは以下です。

| Action | Charge結果確定タイミング |
| --- | --- |
| `ClickCharging` | Charge判定Event |
| `DragCharging` | Charge入力Release |

主な例は以下です。

* ClickChargingのCharge判定Event時に保持Shaondamaが消滅・無効化されている
* ClickChargingのCharge判定Event時にNormal / WeakいずれのAllocationも成立しない
* DragChargingのRelease時にCurrent Normal AttackEventが存在しない
* Drag選択Shaondama群が未充填Slot群に対して不足・過剰・不適合である
* Drag選択済みShaondamaの1つ以上がReleaseまでに消滅・無効化されている

`miss`が発生した場合はコンボを中断します。

### missにしない処理

以下の処理自体は`miss`として扱いません。

* Press時に選択可能なShaondamaを取得できず、Charge入力判定を開始しなかった
* Click / Drag入力判定の破棄
* DragCharging先行入力の破棄
* ClickChargingのCharge判定Event前のDash / Reaction / RootState変更等による終了
* ClickChargingの判定後Dashキャンセル
* DragChargingのRelease前のDashによる終了
* DragChargingの`SmallHit / BigHit`による中断
* RootState変更によるDragCharging強制終了
* その他、PlayerがCharge結果を確定する判定タイミングへ到達する前の強制終了

判定前中断では未確定の対象・選択内容を破棄します。

すでにsuccess / missが確定した後のAction終了は、その確定済み結果を変更しません。

## Charge成功後のReserved

Charge successが確定したShaondamaは`Reserved`へ移行します。

`Reserved`は、Charge済みShaondamaをAttackEvent発火まで世界上で保持するための状態です。

```text
Charge success
↓
Reserved
↓
世界上で停止
↓
AttackEvent発火待ち
```

Reserved中は通常Lifetimeの進行を停止し、対応するAttackEventが解決されるまでShaondama実体の存在を保証します。

Lifetimeの具体的な管理方法はShaondama側の正本である`docs/spec/shaondama-music/floating-behavior.md`へ委譲します。

一度successが確定してReservedへ移行したShaondamaは、その後に以下が発生してもCharge結果を取り消しません。

* ClickChargingのDashキャンセル
* `SmallHit / BigHit`
* RootState変更
* Charge Action自体の終了

未Chargeの通常Shaondamaがsource NoteEvent到達時に破裂する通常処理についてもShaondama側正本を参照します。

本ページでは以下の接続のみ定義します。

* Charge success前であれば、source NoteEvent到達などによって対象が消滅し、Click / Drag判定時に`miss`となる可能性がある
* Charge success後にReservedへ移行したShaondamaは、未Charge向けの通常Lifetime / source NoteEvent到達時処理から外れる
* Palette Bullet化はReserved移行時ではなくAttackEvent発火時に行う

## パラメータ

Charge固有の主な調整項目を以下に示します。

| パラメータ | 内容 | 値 |
| --- | --- | --- |
| `ChargeMaxDistance` | Shaondamaを選択可能な最大距離 | 未定 |
| `ClickChargingDuration` | ClickCharging全体の継続時間 | 未定 |
| `ClickChargeJudgeTiming` | ClickChargingのCharge判定Eventタイミング | 未定 |
| `ClickDashCancelTiming` | ClickChargingのDashキャンセル受付開始タイミング | Charge判定Event後 |
| `DragChargingMoveSpeedMultiplier` | DragCharging中の移動速度補正 | 未定 |


Dashキャンセル入力バッファの具体的な保持時間は、共通の調整パラメータとして「Playerアクション遷移」のルールに従います。

ClickCharging中の移動速度は通常速度とします。

Aimingなど他Stateによる移動補正との組み合わせについては「Player基本移動」を正とします。

## 各ページとの責務分離

Chargeに関係する仕様は、以下のように管理します。

| 内容 | 管理ページ |
| --- | --- |
| Charge Press時の開始対象取得 | 本ページ |
| `ClickCharging`の開始・対象保持・判定・終了 | 本ページ |
| `DragCharging`の開始・選択・Atomic判定・終了 | 本ページ |
| Click / Drag入力判定 | 本ページ |
| Click / Drag入力判定の開始・破棄条件 | 本ページ |
| Current Normal AttackEventなしでClickを継続できること | 本ページ |
| Weak時にDragへ移行しないこと | 本ページ |
| Dashing中のCharge入力判定 | 本ページ |
| Charge先行入力へ引き継ぐ対象情報 | 本ページ |
| DragCharging先行入力中のRelease処理 | 本ページ |
| ClickChargingのCharge判定Eventタイミング | 本ページ |
| DragChargingのRelease判定タイミング | 本ページ |
| Drag選択順がAllocation / Arpeggio順を拘束しないこと | 本ページ |
| DragのAtomic success / miss・commit有無 | 本ページ |
| 判定時の対象消失によるmiss | 本ページ |
| Chargeによる`success / miss` | 本ページ |
| success後のReserved移行 | 本ページ |
| ClickChargingのDashキャンセル受付開始タイミング | 本ページ |
| Charge中Jump時のCharge固有処理 | 本ページ |
| DragCharging中断時の未確定選択内容 | 本ページ |
| ActionState間の遷移可否 | Playerアクション遷移 |
| `C→` / `B→`の定義 | Playerアクション遷移 |
| Action先行入力の保持・上書き・評価ルール | Playerアクション遷移 |
| Dashキャンセル入力バッファの共通ルール | Playerアクション遷移 |
| SmallHit / BigHitによるAction中断可否 | Playerアクション遷移 |
| Grounded / AirborneによるAction開始制限 | Playerアクション遷移 |
| Jump自体の処理 | Player移動｜ジャンプ |
| Aiming中のカメラ・Player向き | Playerアクション｜照準 |
| Reaction自体の処理 | Playerリアクション｜被弾 |
| 移動速度の最終決定 | Player基本移動 |
| Current Normal AttackEventの決定 | `docs/spec/draw-system/charge-allocation.md` |
| Normal Slot構造・Slot割り当て・割り当て優先順位 | `docs/spec/draw-system/charge-allocation.md` |
| Drag選択群を未充填Slot群へ割り当てる具体的Allocation | `docs/spec/draw-system/charge-allocation.md` |
| Weak AttackEvent生成・割り当て | `docs/spec/draw-system/charge-allocation.md` |
| 通常Shaondamaのsource NoteEventを用いたWeak解決 | `docs/spec/draw-system/charge-allocation.md` |
| 万能ShaondamaのNormal / Weak解決 | `docs/spec/draw-system/charge-allocation.md` |
| AttackEventの必要音・Chord / Arpeggio・音楽的順序 | `docs/spec/bgm/bgm-attack-event.md` |
| AttackEvent発火時の完全成立・不完全完成 | `docs/spec/bgm/bgm-attack-judgement.md` |
| AttackEvent発火時の使用Reserved Shaondama実体決定 | `docs/spec/bgm/bgm-attack-judgement.md` |
| AttackEvent発火時のPalette Bullet化・Chord / Arpeggio発射 | `docs/spec/bgm/bgm-attack-judgement.md` |
| Reserved中のShaondama Lifetime詳細 | `docs/spec/shaondama-music/floating-behavior.md` |
| 未Charge Shaondamaのsource NoteEvent到達時処理 | Shaondama側正本 |

## 未決事項

* ClickChargingのモーション時間
* ClickChargingのCharge判定Eventタイミング


<PageRelations />
