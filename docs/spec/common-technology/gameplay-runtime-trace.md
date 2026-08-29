---
title: "Gameplay Runtime Trace仕様"
description: Input・Player State・Gameplay Event・Entity・Context Snapshotを同一時系列で記録し、人間とAIがRuntime上で実際に起きた処理を追跡するためのデバッグ基盤
pageType: spec
category: "共通技術"
status: 仮仕様
relatedTasks: []
---

# Gameplay Runtime Trace仕様

## 目的

`Gameplay Runtime Trace`は、

> **プレイヤーが何を入力し、その瞬間ゲームがどのような状態で、どの処理が発生し、最終的にどの結果へ到達したかを一本の時系列として記録・可視化するRuntimeデバッグ基盤**

です。

単なるLog ViewerやGameplay Event一覧ではありません。

少なくとも以下の情報を、相互に関連付けて追跡できることを目標とします。

- 物理キー／Mouse等のRaw Input
- Unity Input System上のInput Action
- Gameplay Request
- Player State
- Gameplay Event
- Physics Event
- AttackEvent
- Shaondama
- Projectile
- Damage
- Enemy
- Battle状態
- HitStop／Pause等のSystem Event
- Entity間の関係
- 重要時点のContext Snapshot
- Runtime時刻
- Frame
- Fixed Step／Physics Step
- MusicChart上の音楽時間
- BGM Loop occurrence
- Trace生成元のRepository／Commit／Build情報

本基盤の中心的な利用目的は、

> **「入力されたのに動かなかった」「発火したはずなのにDamageまで到達しなかった」等のRuntime問題について、処理がどこまで到達し、どこで拒否・中断・欠落したかをEvidenceとして追跡できるようにすること**

です。

---

## 背景

Palette Bulletでは、
Player Input、複数軸State、BGM／MusicChart、AttackEvent、Shaondama、
Projectile、RGB Damage、Enemy、Battle Result等が相互に接続します。

そのためRuntime上の不具合は、
単一Classや単一Eventだけを確認しても原因を特定できない場合があります。

例えば、

> Dashボタンを押したのにDashしなかった

という現象でも、原因候補には以下があります。

- 物理入力そのものが取得されていない
- Input Actionへ変換されていない
- Gameplay Requestが作られていない
- Player State条件で拒否された
- Dash開始は成立したが同frameの別処理で中断された
- State表示と実際のRuntime Stateに不整合があった
- Debug Log自体が必要な時点を記録していなかった

Gameplay Runtime Traceでは、
以下のように入口から結果までを一続きで確認できる状態を目指します。

```text
Keyboard Shift Pressed
↓
Dash InputAction Started
↓
DashRequested
↓
Player State確認
↓
Movement = Airborne
↓
Dash開始拒否
Reason = Airborne
```

これにより、

- Inputが届かなかった
- Input Actionで止まった
- Gameplay Requestで止まった
- State Gateで拒否された
- 開始後にInterruptされた

といった原因候補を切り分けます。

---

## 本ページの責務

本ページは、
Runtime上で実際に発生した事実をどのように記録・関連付け・表示・Exportするかを定義します。

主な責務は以下です。

- Trace Session
- Trace Event
- Raw Input Trace
- Input Action Trace
- Player State Trace
- Gameplay Event Trace
- Entity ID
- Event ID
- Correlation ID
- Parent／Child Event
- Context Snapshot
- Timeline Viewer
- Event詳細表示
- Filter／Navigation
- AI向け構造化Export
- Session Summary
- Git／Build Snapshot情報
- 選択範囲Export
- 直近N秒保存
- Bookmark
- Recording Level
- Trace Recorder自身の欠落情報
- Performance上の原則
- Project Code CatalogやBattle Scenario Runnerとの責務境界

本ページは、
各Gameplay機能が本来どのように動くべきかを定義しません。

---

## AI向け利用目的

Gameplay Runtime Traceは、
人間向けTimeline Viewerだけを目的としません。

AIがRuntime問題を解析するための正式なEvidence源として利用できる構造を持たせます。

将来的にAIは、以下の3つを組み合わせて調査できます。

```text
Web仕様書
=
本来どう動くべきか

Project Code Catalog
=
コード上に何が存在するか

Gameplay Runtime Trace
=
実際にRuntimeで何が起こったか
```

つまり、

```text
仕様
vs
静的コード構造
vs
Runtime実行結果
```

の3方向から監査できることを目標とします。

### AI利用例：入力拒否の調査

```text
ユーザー
「Parryを押したのに発動しなかった」

AI
↓
Traceの該当時間を確認
↓
Raw Inputあり
Input Action Startedあり
Parry Requestあり
Player Movement = Airborne
Parry Startなし
Rejection Reason = GroundOnly
↓
Player Parry仕様を確認
↓
仕様とRuntime Evidenceを比較
```

Traceは、
拒否が正しい仕様かどうかを自動判定しません。

### AI利用例：Damage経路の調査

```text
AttackEvent Fire
↓
Palette Bullet Spawn
↓
Palette Bullet Hit
↓
Damage Candidate
↓
Damage Batch
↓
Enemy Damage Apply
↓
Purify
```

途中Eventが存在しない場合、
AIは該当地点のコード・仕様・別Traceを追加確認できます。

---

## 他開発基盤との責務境界

### Project Code Catalog

`Project Code Catalog`は、

> **コード上に何が存在するか**

を機械収集する静的解析基盤です。

例：

- Class
- Field
- Method
- Event
- Test
- TODO
- 仕様書Reference
- Dependency

Gameplay Runtime Traceは、

> **実際のゲーム実行中に何が起きたか**

を記録するRuntime基盤です。

例：

- Inputされた
- Stateが変わった
- Requestが拒否された
- AttackEventがFireした
- Projectileが生成された
- Hitした
- Damage Candidateが生成された
- EnemyへDamageが反映された
- Battle Resultが確定した

Project Code Catalogの静的解析機能を、
Gameplay Runtime Trace側で再実装しません。

### MusicChart Workbench

[MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench)の
Runtime MonitorもRuntime情報を扱いますが、Gameplay Runtime Traceとは責務を分離します。

```text
MusicChart Workbench Runtime Monitor
=
MusicChart制作・確認の文脈で、
MusicChart時計、Audio位置、Current AttackEvent、
Preview／Charge受付状態、Loop occurrence、
シャオンダマ先行生成状況等をLive表示する

Gameplay Runtime Trace
=
Input、Player State、Gameplay Event、Entity、Damage等を含む
複数System横断のRuntime事実を時系列Evidenceとして
記録・保存・Filter・Exportする
```

Gameplay Runtime Traceは、
MusicChart WorkbenchのEditor制作・編集・Validation機能を再実装しません。

また、MusicChart WorkbenchのRuntime Monitor表示を成立させるために、
Gameplay Runtime TraceのSession記録やJSON／JSONL Exportを必須依存にはしません。

### Battle Scenario Runner

将来的に検討する`Battle Scenario Runner`とは以下のように分離します。

```text
Gameplay Runtime Trace
=
実際に起きたGameplayを記録・表示する

Battle Scenario Runner
=
特定条件を意図的に作り、再現・検証する
```

> **Traceは観測。Scenario Runnerは再現。**

通常のTrace RecordingからGameplay状態を変更しません。

### Gameplay正本仕様

Gameplay Runtime Traceでは、
各機能の成立条件や処理規則を再定義しません。

例えば、

```text
Parry成功時はWildcardへ変換する
```

という規則そのものは、
Player／Jaon Bullet／Wildcard等の正本仕様を参照します。

Trace側は、

```text
Parry Success
↓
Jaon Bullet End
↓
Wildcard Created
```

というRuntime Evidenceを記録します。

> **Traceは「実際に起きたこと」を記録する。何が正しい挙動かは各正本仕様が決める。**

---

## 基本原則

### 1. Inputから結果まで一本の時系列で追跡する

Input、State、Gameplay Event、Physics、Damage等を別々のLogへ分断せず、
同一Session・同一Timeline上で相互参照できるようにします。

### 2. Raw InputとInput Actionを可能な限り区別する

物理Controlへの入力と、
Unity Input System上のActionを区別します。

これにより、

```text
Raw Inputあり
Input Actionなし
```

と、

```text
Input Actionあり
Gameplay Requestなし
```

を区別できます。

### 3. Traceは実際に起きた事実を記録する

Trace Recorderは正しい挙動を推測しません。

Runtime本体が確定したStateや結果を記録します。

### 4. Gameplay仕様をTrace側で再定義しない

Trace Event名や表示ロジックを、
Gameplayの別正本にしません。

### 5. Entityを一意に追跡できるようにする

ProjectileやEnemy等について、
どの個体に対するEventかを追跡可能にします。

### 6. 一連の処理をCorrelation IDで追跡可能にする

複数システムをまたぐ一連の処理を、
同じCorrelationへ関連付けられるようにします。

### 7. 重要EventではContext Snapshotを取得可能にする

Event単体だけでは不足する状況情報を、
必要な時点だけSnapshotとして保存します。

### 8. 毎frame全状態を保存しない

通常はEvent／State差分を記録し、
必要な時点だけSnapshotを保存します。

### 9. 人間向けTimelineとAI向け構造化出力の両方を持つ

視覚的な原因調査と、
AIによる検索・比較の両方を成立させます。

### 10. 必要な時間範囲だけExportできる

AIへ毎回Session全体を渡さず、
問題周辺だけをTrace BundleとしてExportできるようにします。

### 11. Trace生成元のCommit／Build情報を記録する

TraceのRuntime Evidenceが、
どのSource Snapshotから生成されたものか判断可能にします。

### 12. Trace Recorder自身の欠落も記録する

Dropped EventやBuffer Overflow等を隠しません。

### 13. 通常RecordingはGameplayを変更しない

Traceは観測側です。

### 14. Performanceへの影響を抑える

Trace導入によって本来存在しないLagやPhysics変化を発生させないことを重視します。

### 15. Replay／Scenario機能とは責務を分離する

記録機能と再現・操作機能を混同しません。

---

## Trace Session

Trace Recordingの開始から終了までを、
一つの`Trace Session`として管理します。

各Sessionは一意に識別できる必要があります。

Sessionには少なくとも以下を関連付けます。

- Session ID
- Trace開始時刻
- Trace終了時刻
- Duration
- Repository
- Branch
- Commit SHA
- Unity Version
- Build Version
- Scene
- Stage
- Battle ID
- Trace Schema Version
- Trace Recorder Version
- Recording Level
- Event件数
- Snapshot件数
- Dropped Event件数
- Warning件数
- Error件数

Session IDの具体形式は未決です。

### Session開始／終了

少なくとも以下の操作またはTriggerからSessionを開始・終了できる設計を想定します。

- Play Mode開始時
- Battle開始時
- 手動Recording開始
- Automated Test開始時
- 手動Recording終了
- Battle終了時
- Play Mode終了時

どのTriggerを初期版で正式採用するかは未決です。

---

## 時間情報

Trace Eventには、
単一の時刻だけでなく、
問題調査に必要な複数の時間軸を保持できるようにします。

候補は以下です。

- Event Sequence
- Frame
- Fixed Step／Physics Step
- Runtime経過時間
- Battle Time
- Gameplay Time
- MusicChart Time
- BGM Loop occurrence
- 必要に応じて小節／拍／Tick

全Eventがすべての時間情報を持つ必要はありません。

ただし、

> **同一Session内でEvent順序を決定的に復元できること**

は必須です。

### Event Sequence

同frame・同時刻に複数Eventが発生する場合でも、
記録順を復元できるSequence情報を持たせることを推奨します。

具体的なSequence生成方式は未決です。

### Frame

Unity Frameを記録します。

同一frame競合の調査に利用します。

### Fixed Step／Physics Step

Physics処理に関連するEventについて、
どのPhysics Stepで発生したか識別できるようにします。

FrameとPhysics Stepを同一概念として扱いません。

### MusicChart Time

BGM／AttackEventに関連するEventでは、
MusicChartの正式Runtime時計と接続可能にします。

候補情報：

- MusicChart Time
- Music Position
- Bar
- Beat
- Tick
- Loop occurrence

具体的な接続APIは未決です。

---

## Input Trace

Gameplay Eventだけでなく、
ユーザーが実際にどの物理Controlへ入力したかを記録します。

可能な限り、

```text
Raw Input
↓
Input Action
↓
Gameplay Request
```

を分離します。

概念例：

```text
Raw Input
Keyboard / E
Pressed

↓

Input Action
Parry
Started

↓

Gameplay
ParryRequested
```

この分離により、

```text
物理入力はあった
Input Actionは発火しなかった
```

または、

```text
Input Actionまでは発火した
Gameplay側で拒否された
```

という切り分けができます。

### Input Trace情報

少なくとも以下を検討します。

- Event ID
- Frame
- Fixed Step／Physics Step
- Runtime Time
- Input Action
- Physical Control
- Device
- Input Phase
- Input Value
- Press／Release
- Started／Performed／Canceled
- Gameplay Requestへ変換されたか
- 必要に応じてInput sequence

概念例：

```text
Frame
18421

Time
32.416s

Action
Parry

Control
Keyboard/E

Phase
Started

Value
1
```

Mouse入力についても、

```text
Mouse/RightButton
Aim Started
```

```text
Mouse/LeftButton
Charge Performed
```

等を追跡できることを目標とします。

Raw InputをInput Systemのどの層で取得するかは未決です。

---

## Player State Trace

Playerについては、
Runtime本体が確定したState変更をTraceします。

少なくとも現在のPlayer State構造に合わせて、
以下の軸を扱える構造とします。

- Root
- Movement
- Action
- Aim
- Reaction

概念例：

```text
Player State Change

Axis
Action

From
None

To
Parrying
```

別軸例：

```text
Axis
Aim

From
Aiming

To
Normal
```

### State変更に関連する情報

取得可能な場合は、
State変更結果だけでなく以下も関連付けます。

- Trigger
- Request
- Cause
- Rejection Reason
- Interrupt Reason
- Parent Event
- Correlation ID

ただし、
Trace RecorderがState遷移条件を独自に再判定してReasonを作ることは避けます。

Runtime本体がReason Code等を確定している場合、
その値を記録する方向を優先します。

---

## Gameplay Event

Gameplay上で調査価値の高いEventをTraceへ登録できるようにします。

以下はEvent分類の候補であり、
Gameplay規則そのものを定義する一覧ではありません。

### Player

候補：

- Dash Request
- Dash Start
- Dash End
- Jump
- Aim Start
- Aim End
- Marker Fire
- Click Charge
- Drag Charge
- Charge Success
- Charge Failure
- Parry Start
- Parry Success
- Parry Failure
- Reaction
- Dead

### BGM／Music

候補：

- Battle music runtime start
- system pre-roll start
- system pre-roll end
- BGM Audio start
- AttackEvent Preview
- Charge受付開始
- Charge受付終了
- AttackEvent Fire
- Current AttackEvent変更
- Loop

### Shaondama

候補：

- Spawn Request
- Spawn
- Selectable
- Reserve
- Consume
- Natural Burst
- Wildcard変換
- Lifetime終了

### Projectile

候補：

- Marker Spawn
- Marker Hit
- Palette Bullet生成
- Palette Bullet Fire
- Palette Bullet Hit
- Explosion
- Jaon Bullet Spawn
- Jaon Bullet Hit
- Jaon Bullet Parry

### Combat／Damage

候補：

- Damage Candidate生成
- Damage倍率適用
- 同一frame集約
- EnemyへDamage反映
- RGB clamp
- Purify
- Damage無効化

### Enemy

候補：

- Spawn
- State変更
- Damage受付
- Purify
- FormallyExcluded
- Cleanup

### Battle

候補：

- Battle Start
- Battle Result確定
- Clear
- Game Over
- Result表示
- Cleanup完了

### System

候補：

- HitStop Start
- HitStop End
- Pause
- Resume
- Error
- Warning

主要Gameplay Eventの完全な正式一覧は未決です。

ただし、初期版完了判定に使用する最低限のTrace範囲は、
以下の2種類の代表経路を追跡できることとします。

### 初期版で必須とする代表経路

#### 1. Player入力／State経路

少なくとも以下を同一Timeline上で関連付けられることを必須とします。

```text
Raw Input
↓
Input Action
↓
Gameplay Request
↓
Player State確認
↓
Action開始／拒否／中断
```

これにより、
「入力が届かなかった」「State Gateで拒否された」等を切り分けられることを
初期版の最低条件とします。

#### 2. AttackEventから結果までの横断経路

少なくとも以下のカテゴリをまたぐ代表Eventを、
Correlation ID等で一続きに追跡できることを必須とします。

```text
AttackEvent
↓
Projectileまたは攻撃結果生成
↓
Hit／Damage Candidate
↓
Enemy Damage反映
↓
PurifyまたはBattle上の確定結果
```

すべてのAttackEvent種類、Projectile種類、Enemy種類を
初期版で網羅する必要はありません。

初期版では、
基盤が複数Systemをまたぐ一連の処理を記録・関連付けできることを
代表経路で確認できればよいものとします。

上記以外のGameplay Eventは、
Trace基盤自体をゲーム全体へ拡張可能にしつつ、
段階的にTrace Pointを追加できる構造とします。

---

## Event ID

すべてのTrace Eventは、
Session内で一意に識別できるEvent IDを持ちます。

概念例：

```text
EV-0001821
```

具体形式は未決です。

Event IDは、
Timeline上の選択、Parent／Child参照、AI Export、Bookmark等から利用できる必要があります。

---

## Entity ID

Runtime上のEntityについて、
どの個体に関するEventかを追跡できるようにします。

対象候補：

- Player
- Enemy
- Jaon Bullet
- Shaondama
- Wildcard
- Palette Bullet
- Marker
- AttackEvent occurrence
- Damage Candidate
- Damage Batch
- Parry Batch

概念例：

```text
PaletteBullet PB-012
↓
Enemy EN-004へHit
↓
DamageCandidate DC-083
```

### Entity IDの目的

Entity IDは、
以下を可能にするために使用します。

- 同じEnemyに関連するEventだけを表示する
- 同じProjectileのSpawnからHitまでを追う
- Damage Candidateの発生元を辿る
- Snapshot内のNearby EntityとEventを結び付ける
- AIが対象個体のEventだけを抽出する

具体的なEntity ID形式、
生成タイミング、
Object破棄後のID再利用規則は未決です。

---

## Correlation ID

一つのGameplay上の出来事が複数システムへまたがるため、

> **一連の処理をまとめて追跡するためのCorrelation ID**

を持てる構造を重視します。

### AttackEvent例

```text
AttackEvent occurrence
ATK-014 / Loop 2
```

を起点として、

```text
AttackEvent Fire
↓
Charge Result
↓
Palette Bullet生成
↓
Palette Bullet Fire
↓
Palette Bullet Hit
↓
Damage Candidate
↓
Enemy Damage Batch
↓
Purify
```

を同じCorrelationへ関連付けます。

### Parry例

```text
Parry Batch
PB-018
```

を起点として、

```text
Raw Input
↓
Input Action
↓
Parry Start
↓
Physics Contact
↓
Parry Success
↓
Jaon Bullet終了
↓
Wildcard生成
↓
HitStop
```

等を関連付けられるようにします。

Correlation IDの具体形式と、
どのシステムがCorrelationを発行・引き継ぐかは未決です。

---

## Parent／Child Event

Correlation IDだけでは、
同一Correlation内の直接的な因果関係が分からない場合があります。

可能な範囲でEvent間のParent／Child関係を持てる構造を検討します。

例：

```text
AttackEvent Fire
Event EV-100

↓

PaletteBullet Spawn
Event EV-101
Parent EV-100

↓

PaletteBullet Hit
Event EV-105
Parent EV-101

↓

DamageCandidate
Event EV-106
Parent EV-105
```

これによりAIや人間が、

> このDamage Candidateが直接どのHitから生成されたか

を辿りやすくなります。

すべてのEventへParentを強制する必要はありません。

Parent／Child Eventは初期版で高優先の追加目標としますが、
**初期版完了Gateには含めません。**

初期版ではCorrelation IDとEvent Sequenceによって
一連の処理と順序を追跡できることを必須とし、
直接因果を表すParent／Child関係は可能な範囲から追加します。

Event Graphの具体構造は未決です。

---

## Context Snapshot

Eventだけでは、
その瞬間にどのような状況だったか分からない場合があります。

そのため重要Event発生時には、
Context Snapshotを保存できる構造を持たせます。

概念例：

```text
Player
Position       (12.4, 0.0, -3.2)
Root           Gameplay
Movement       Grounded
Action         Parrying
Aim            Normal
Reaction       None
HP             75
Stamina        32

Battle
Time           48.321
Music Position 16:3:120
Loop           2

Nearby JaonBullet
JB-42
Distance       1.21m

Nearest Enemy
EN-04
Distance       8.4m
```

### Snapshotの目的

Snapshotは主に、

- Event発生時のPlayer State
- Battle Context
- Music Context
- Position
- HP／Stamina等の重要Runtime値
- 関連Entity
- Nearby Entity

等を補足します。

### 毎frame保存しない

すべてのGameObject状態を毎frame保存すると、

- データ量
- Performance負荷
- Disk使用量
- AI Context量

が過大になります。

基本方針は、

> **通常はEvent／State差分を記録し、重要Eventまたは明示Bookmark時のみContext Snapshotを保存する**

ことです。

### Snapshot Trigger候補

- Error
- Warning
- Death
- Clear
- Game Over
- Parry Success
- Damage発生
- Battle Result確定
- User Bookmark
- Trace Export開始地点
- 予期しないState

具体的なTrigger一覧は未決です。

### Snapshot対象

どのRuntime値を共通Snapshotへ含め、
どのEvent固有Payloadへ含めるかは未決です。

---

## Timeline Viewer

人間がInputから結果までを視覚的に理解できるように、
複数Laneを持つTimeline Viewerを中心UIとします。

概念例：

```text
Time      18.30       18.35       18.40       18.45

INPUT     [E Press]────────────────────────────

PLAYER    [Aiming]
                └─ Normal
                   [Parrying────────────]

PHYSICS               ● JB-42 Parry Contact

PARRY                 ★ Normal Success

BULLET                × JB-42 End

WILDCARD              + WC-31 Created

HITSTOP               [===========]

MUSIC     ───────────────────────────────▶
```

固定レイアウトやUI技術は仕様で強制しません。

重要なのは、

> **Inputから結果までを同じ時間軸上で視覚的に追えること**

です。

---

## Timeline Lane

Lane分類候補は以下です。

- Input
- Player State
- Player Action
- Physics
- Music
- AttackEvent
- Shaondama
- Projectile
- Combat
- Damage
- Enemy
- Battle
- System

必要なLaneだけ表示／非表示できる構造を目標とします。

具体的なLane分類は未決です。

Event数が多い場合でも、
LaneやFilterを利用して調査対象を絞れる必要があります。

---

## Event詳細表示

Timeline上のEventを選択したとき、
少なくとも以下を確認できるようにします。

概念例：

```text
Event ID
EV-0001821

Frame
33184

Fixed Step
10224

Runtime Time
54.231

Event Type
PaletteBullet Hit

Source
PB-012

Target
EN-004

AttackEvent
ATK-014

Correlation
ATK-014-L2

Parent
PB-012 Fired

Next
DamageCandidate DC-083
```

Event種類に応じて、
以下のような追加Payloadを表示します。

- Position
- Damage
- RGB Payload
- State
- Input Value
- Reason Code
- Target
- Batch
- Music Position
- Loop occurrence
- Result
- Snapshot Reference

表示用文字列だけではなく、
AI Exportへ使用できる構造化値として保持する方向を優先します。

---

## Filter／Navigation

Event詳細またはTimelineから、
調査対象を素早く絞り込めるようにします。

Filter候補：

- Entity
- Correlation ID
- Event Type
- Category
- Error／Warning
- Player Action
- Lane
- 時間範囲

Navigation候補：

- Source Entityへ移動
- Target Entityへ移動
- Parent Eventへ移動
- Child Eventへ移動
- Previous Event
- Next Event
- 同じCorrelationだけ表示
- 同じEntityだけ表示
- 同じEvent Typeだけ表示
- 前後N秒だけ表示
- Snapshotへ移動

具体UIは実装担当へ委譲します。

---

## AI向け構造化Export

Gameplay Runtime Traceは、
人間向けTimelineだけを持つツールにはしません。

AIが直接検索・比較できる構造化出力を必須とします。

概念的な出力構成：

```text
Trace/
├─ session-summary.json
├─ events.jsonl
├─ snapshots.jsonl
└─ human-readable.md
```

正式なファイル名や分割方式は未決です。

### events.jsonl

Eventを一件ずつ検索・diffしやすいJSON／JSONL形式を推奨します。

簡略例：

```json
{"time":18.330,"kind":"input","action":"Parry","phase":"Started"}
{"time":18.331,"kind":"state_change","axis":"Action","from":"None","to":"Parrying"}
{"time":18.340,"kind":"parry_success","batch":"PB-18","bullet":"JB-42"}
```

実際のSchemaでは、
少なくとも以下を保持できる構造を検討します。

- Session ID
- Event ID
- Sequence
- Event Type
- Category
- Frame
- Physics Step
- Runtime Time
- Battle Time
- Gameplay Time
- MusicChart Time
- Entity ID
- Source Entity
- Target Entity
- Correlation ID
- Parent Event
- Payload
- Snapshot Reference

JSONとJSONLの正式採用方式は未決です。

---

## Session Summary

AIがSession全体を最初に軽量把握できるように、
Session Summaryを生成します。

候補項目：

```text
Session ID

Repository
Branch
Commit SHA
Unity Version
Build Version

Scene
Stage
Battle ID

Duration
Frames

Input Events
Gameplay Events
Snapshots

Warnings
Errors

Dropped Events

Player Death
Clear
Game Over

AttackEvents Fired
Damage Events

Trace Start
Trace End
```

Summary自体がGameplay結果を独自再判定することは避け、
Trace内で記録された確定Event等を集計します。

---

## Git／Build Snapshot

Traceには、
どのコードSnapshot・Buildで取得されたかを判断するMetadataを持たせます。

候補：

- Repository
- Branch
- Commit SHA
- Unity Version
- Build Version
- Scene
- Stage
- Trace Schema Version
- Trace Recorder Version

Working TreeがDirtyな場合の表現は未決です。

Project Code Catalogと同じCommit SHAを持つ場合、
AIが静的構造とRuntime Traceを対応付けやすくなります。

---

## 選択範囲Export

AIへSession全体を毎回渡す必要がないように、
Timelineの一部だけをExportできるようにします。

例：

```text
48.0s ～ 58.0s
```

を選択し、

```text
Bug Trace Bundle
```

として出力します。

Bundleには必要に応じて以下を含めます。

- 選択時間範囲内のEvent
- 関連Snapshot
- Session Metadata
- 関連Entity情報
- 範囲外にある直接Parent Eventの最小参照
- Trace欠落情報

選択範囲Exportの具体形式は未決です。

---

## 直近N秒保存

Runtime問題を見つけた瞬間に、
直前のTraceを残せる機能を高優先で検討します。

ただし、直近N秒保存は初期版で高優先の追加目標とし、
**初期版完了Gateには含めません。**

例：

```text
[直近10秒を保存]
```

を実行すると、

```text
現在時刻 - 10秒
～
現在時刻
```

をTrace Bundleとして保存します。

具体実装としてRing Buffer等が考えられますが、
方式は実装へ委譲します。

以下は未決です。

- Buffer容量
- Default秒数
- 最大保存時間
- Snapshotとの連携
- Manual操作以外のTrigger

---

## Bookmark

Play Mode中に、

> この瞬間を後で確認したい

と判断した時点へBookmarkを付与できる機能を検討します。

Bookmark候補情報：

- Bookmark ID
- 時刻
- Frame
- Event ID
- Snapshot
- 任意Comment

Bookmarkはプロトタイプ優先度を中程度とし、
**初期版完了Gateには含めません。**

初期版運用で必要性が確認された場合に追加できる構造を維持します。

---

## Screenshot

重要Event時のGame View Screenshotは、
AIへ視覚的なRuntime状況を渡す補助として将来有用です。

候補Trigger：

- Error
- Death
- Clear
- Game Over
- Parry Success
- User Bookmark

ただし、

> **毎frame Screenshotを保存する**

仕様にはしません。

Screenshotはプロトタイプ低優先または後続機能とします。

---

## Performance

Runtime TraceがGameplayの挙動やTimingを大きく変えてはいけません。

最重要原則は、

> **デバッグ基盤のために、本来存在しないGameplay LagやPhysics変化を発生させない。**

ことです。

制御対象候補：

- Event量
- Snapshot量
- Buffer量
- Disk書き込み
- Export処理
- Screenshot
- Verbose Payload

Performance Budgetの具体値は未決です。

### Trace無効時

Trace無効時には、
Gameplay Runtimeへ不要な大きな負荷を残さない設計とします。

完全なゼロコストを仕様として断定はしませんが、
Debug基盤のための不要な処理をRelease時まで常時実行する構造を避けます。

---

## Recording Level

将来的にTrace量を切り替えられる構造を検討します。

例：

```text
Off
Minimal
Standard
Verbose
```

具体的なLevel数と各Levelの対象Eventは未決です。

最低限、
Release Build等で不要なTrace負荷を避けられる設計とします。

Recording Levelによって同じEvent Typeの意味を変更してはいけません。

Levelは主に、
記録量・Payload量・Snapshot量を調整するものとします。

---

## Trace欠落／Error

Trace Recorder自身の問題と、
Gameplay上のError／Warningを区別します。

例：

```text
Gameplay Warning
Damage Candidate duplicated
```

```text
Trace Warning
Snapshot Buffer full
```

Trace基盤自身の記録欠落が発生した場合、
AIや人間が完全なTraceだと誤認しないようにします。

Session Metadataへ少なくとも以下を保持できる構造を推奨します。

- Dropped Events
- Snapshot Missing
- Buffer Overflow
- Export Failure
- Recorder Error
- Recording Start遅延
- Recording End異常

Trace Eventの欠落が発生した場合でも、
その事実を可能な限り記録します。

---

## Traceはゲーム進行を変更しない

Trace Recorder／Viewerは基本的に観測側です。

通常のRecording中に、
以下を直接変更してはいけません。

- State
- Input
- Enemy生成
- Battle時間
- MusicChart時計
- AttackEvent発火
- Damage
- Entity生成／破棄
- Result

将来的にReplayやScenario機能を作る場合は、
Runtime Traceとは別責務として扱います。

---

## プロトタイプ優先度

初期版では、
Runtime調査の基礎となる機能を優先します。

| 機能 | プロトタイプ優先度 |
| --- | --- |
| Session ID | 必須 |
| Frame／Runtime Time | 必須 |
| Fixed Step／Physics Step | 必須 |
| Raw Input | 必須 |
| Input Action | 必須 |
| Player State変更 | 必須 |
| 主要Gameplay Event | 必須 |
| Event ID | 必須 |
| Entity ID | 必須 |
| Correlation ID | 必須 |
| Event前後関係 | 高。初期版完了Gate外 |
| Context Snapshot | 必須 |
| Timeline Viewer | 必須 |
| Event詳細表示 | 必須 |
| Event Filter | 高 |
| JSON／JSONL Export | 必須 |
| Session Summary | 必須 |
| Git／Build Snapshot | 必須 |
| 選択範囲Export | 必須 |
| 直近N秒保存 | 高。初期版完了Gate外 |
| Bookmark | 中。初期版完了Gate外 |
| Screenshot | 低 |
| 3D軌跡 | 低 |
| 完全Replay | 後続 |
| 動画Recording | 後続 |
| AI自動異常判定 | 後続 |

---

## 初期版で対象とするEvent範囲

Trace基盤自体はゲーム全体対応を前提とします。

ただし、
すべてのGameplay Systemへ一度に導入する必要はなく、
段階的にTrace Pointを追加できる構造とします。

初期版完了判定では、前述のとおり最低限、

1. Raw Input → Input Action → Gameplay Request → Player State → Action結果
2. AttackEvent → 攻撃結果生成 → Hit／Damage → Enemy反映 → Purify等のGameplay上の確定結果

の2種類の代表経路を追跡できることを必須とします。

そのうえで、Trace Pointの導入順は以下を例とします。

1. Input
2. Player State
3. Player Action
4. BGM／AttackEvent
5. Shaondama
6. Projectile
7. Damage
8. Enemy
9. Battle Result

この順序は仕様上固定しません。

実装タスクの依存関係や、
現在のデバッグ優先度に応じて変更できます。

代表経路以外の全Eventカテゴリを網羅していないことだけを理由に、
初期版未完了とは扱いません。

---

## 初期版完了条件

初期版は、少なくとも以下を満たすことを目標とします。

1. Trace Sessionを開始・終了できる
2. Sessionを一意に識別できる
3. FrameとRuntime Timeを記録できる
4. Fixed Step／Physics Stepを識別できる
5. Raw Inputを記録できる
6. Input Actionを記録できる
7. Player State変更を記録できる
8. 主要Gameplay Eventを登録・記録できる
9. Raw Input → Input Action → Gameplay Request → Player State → Action結果の代表経路を追跡できる
10. AttackEvent → 攻撃結果生成 → Hit／Damage → Enemy反映 → Purify等のGameplay上の確定結果の代表経路を追跡できる
11. Event IDを一意に生成できる
12. Entity IDをEventへ関連付けられる
13. Correlation IDをEventへ関連付けられる
14. Event順序を決定的に復元できる
15. 重要Event時にContext Snapshotを保存できる
16. Timeline上でEventを確認できる
17. Lane単位でEventを確認できる
18. Eventを選択して詳細を確認できる
19. Entity／Correlation等でFilterできる
20. AI向けJSON／JSONLをExportできる
21. 人間向け要約をExportできる
22. Session Summaryを生成できる
23. 選択した時間範囲だけExportできる
24. Trace生成元のRepository／Commit／Unity Version等を記録できる
25. MusicChart Timeへ接続可能な構造を持つ
26. Dropped Event等のTrace欠落を識別できる
27. Trace RecorderがGameplay状態を変更しない
28. Trace無効時にGameplay Runtimeへ不要な大きな負荷を残さない
29. Gameplay正本仕様をTrace側で再定義しない
30. Project Code Catalogの静的解析責務をTrace側へ重複実装しない

以下は初期版で優先して実装可能ですが、初期版完了Gateには含めません。

- Parent／Child等の直接的なEvent前後関係
- 直近N秒保存
- Bookmark

---



## 後続機能

初期版の運用結果を確認して、
以下を拡張候補とします。

- Screenshot
- Game View画像との関連付け
- Scene ViewでのEntity位置表示
- Projectile軌跡
- Player移動軌跡
- 3D Runtime Visualization
- 完全Replay
- Input Replay
- 動画Recording
- Trace Snapshot間比較
- AI向け自動Bug Report Package
- AIによる異常候補抽出
- Project Code Catalogとの自動Cross Reference
- Web仕様書との自動Cross Reference
- Test失敗時のTrace自動添付
- CI／Automated Test Trace
- Performance Profilerとの関連付け

初期版へすべてを含めません。

---

## 非目標

本基盤では以下を非目標とします。

- Gameplay仕様そのものをTrace側で再定義すること
- Project Code Catalogの代替
- Battle Scenario Runnerの代替
- 初期版で完全Replayを作ること
- 初期版で動画Recorderを作ること
- 毎frame全Object状態を保存すること
- 毎frameScreenshotを撮影すること
- Runtime TraceからGameplay状態を直接編集すること
- Traceだけを根拠に仕様違反を自動断定すること
- AIそのものをUnity Runtimeへ組み込むこと
- AIが自動的にゲーム進行を変更すること
- Trace基盤によってGameplay Timingを大きく変えること
- Project Code Catalogと同じ静的コード一覧を生成すること
- Debug用Trace DataをGameplay Runtimeの正本にすること
- Event名をGameplay APIそのものとして固定すること

---

## 未決事項

以下は現時点では確定しません。

### 基本識別子・Schema

- Trace Event Schema
- Event ID形式
- Entity ID形式
- Correlation ID形式
- Parent／Child Event構造
- Trace Session ID形式
- Sequenceの生成方式

### 時間

- Runtime Clock形式
- Fixed Step識別方法
- MusicChart Timeとの接続方法
- Battle Time／Gameplay TimeをどのEventへ保存するか
- Loop occurrenceの具体表現

### Input

- Raw Inputをどの層で取得するか
- Unity Input Systemとの接続方式
- Physical Control名の正規化方法
- Input Valueの型表現
- Gameplay Requestとの関連付け方法

### Gameplay Event

- 主要Gameplay Eventの正式一覧
- Event Type命名規則
- Event登録API
- Reason Codeの共通化範囲
- Event Payloadの共通部と個別部の分離方法

### Snapshot

- Snapshot Schema
- Snapshot Trigger
- Snapshot対象データ
- Nearby Entity情報をどこまで保存するか
- Position等のVector精度
- Snapshotの最大サイズ

### Timeline／Viewer

- Timeline UI
- Lane分類
- Filter機能
- Laneの自動グループ化
- Event密集時の表示方式

### Buffer／Recording

- Ring Buffer容量
- 直近N秒保存のDefault値
- Recording Level
- 各Recording Levelの記録対象
- Performance Budget
- Disk書き込み方式

### Export

- JSONかJSONLか
- Exportファイル構成
- Session Summary Schema
- 選択範囲Export形式
- Human-readable Markdownの構造

### Bookmark／Screenshot

- Bookmark Commentの保存方式
- Screenshot保存方式
- Screenshot Trigger

### 保存・運用

- TraceファイルをGit管理するか
- Trace保存先
- Trace保持期間
- Release BuildでTraceを有効化可能にするか
- Working Tree Dirty状態の記録方式

### Cross Reference

- Project Code CatalogとのCross Reference方法
- Web仕様書とのCross Reference方法
- Source Symbolや仕様ページReferenceをEventへ直接持つか

---

## 関連仕様

Gameplay Runtime Traceは以下の仕様を参照しますが、
それらのGameplay規則を本ページでは再定義しません。

| 内容 | 正とする仕様 |
| --- | --- |
| 共通技術カテゴリ全体 | [共通技術](/spec/common-technology/) |
| 静的コード構造・Evidence | [Project Code Catalog仕様](/spec/common-technology/project-code-catalog) |
| Planner調整Parameter | [Planner調整Parameter管理・Excel連携仕様](/spec/common-technology/planner-tuning-parameter) |
| MusicChart制作・Runtime Monitor | [MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench) |
| Player Input | [入力・操作仕様](/spec/player/input-and-controls) |
| Player State | [Player State仕様](/spec/player/states) |
| Player Action遷移 | [Player Action遷移仕様](/spec/player/player-action-transitions) |
| Dash | [Player Dash仕様](/spec/player/player-action-dash) |
| Charge | [Player Charge仕様](/spec/player/player-action-charge) |
| Parry | [Player Parry仕様](/spec/player/player-action-parry) |
| BGM／Gameplay時計・system pre-roll | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| MusicChartデータ | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| AttackEvent | [BGM AttackEvent仕様](/spec/bgm/bgm-attack-event) |
| AttackEvent成立・発火結果 | [BGM 攻撃判定仕様](/spec/bgm/bgm-attack-judgement) |
| Charge Allocation | [Charge Allocation仕様](/spec/draw-system/charge-allocation) |
| Shaondamaデータ | [Shaondama個体データ仕様](/spec/shaondama-music/orb-data) |
| Wildcard | [Wildcard仕様](/spec/shaondama-music/wildcard-orb) |
| Jaon Bullet | [Jaon Bullet仕様](/spec/enemy/jaon-bullet) |
| Palette Bullet | [Palette Bullet仕様](/spec/combat/palette-bullet) |
| Marker | [Marker仕様](/spec/combat/marker) |
| Enemy Damage／Purify | [Enemy Damage／Purify仕様](/spec/enemy/damage-and-purify) |
| Enemy基本挙動 | [Enemy基本挙動仕様](/spec/enemy/basic-behavior) |
| Battle Result／Game全体 | [Game仕様](/spec/game/) |

Battle Scenario Runnerは将来の独立した共通技術基盤候補とし、
Gameplay Runtime Trace内へ再現機能を取り込みません。

---

## 関連タスク

<PageRelations />
