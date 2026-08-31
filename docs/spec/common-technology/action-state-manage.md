---
title: "Player Action／State Graph基盤"
description: "Player専用Palette State GraphのProduction導入、Runtime接続、閲覧・診断、Validation、既存Player実装からの移行を定義する共通技術仕様"
pageType: spec
category: "共通技術"
status: 仮仕様
relatedTasks: []
---

# Player Action／State Graph基盤

## ページ概要

本ページは、PlayerのAction／State判断をProductionへ導入するための共通技術契約を定義します。

Palette State Graphは、Playerの状態と遷移判断を安全かつ決定的に管理し、人間とAIがGraph、Matrix、Scenario、Traceから同じ判断根拠を確認できるようにするためのPlayer専用基盤です。

本ページが定義するのは、主に以下です。

- Player State Graphを唯一のState authorityとする方針
- Production Semantic GraphとRuntime接続
- Event、Context、Command、Identifierの技術契約
- Input、Physics、Animator、PlayerStatus、Combat、Battleとの責務境界
- Battle、Retry、Scene lifecycle
- 閲覧・診断専用EditorWindow
- Trace、Scenario、Validation
- `feature/playerMotion`からの移行方法

PlayerがGameplay上でどのStateを持ち、どの条件でActionを開始・終了・中断するかは、本ページでは再定義しません。正式なGameplay結果は、[Player State仕様](/spec/player/states)、[Player Action遷移仕様](/spec/player/player-action-transitions)、およびPlayerカテゴリの各正本仕様を参照します。

本ページの`仮仕様`は、Production導入契約を定めた一方で、Production実装と検証が未完了であることを示します。

---

## これまでの検討保留と現在の扱い

旧版の本ページは、未確認の基盤を前提に新しいState Machineを確定し、既存Player実装との二重管理を作らないため、意図的に検討を保留していました。

再検討条件としていた以下は、現在確認済みです。

- Palette State Graph Foundationの実装状態
- `feature/playerMotion`のPlayer実装構造
- 両者の重複範囲
- Productionに不足する接続
- 再利用する移動・Animator資産
- 置き換えるState書込み経路

そのため、本ページは「検討保留」からProduction導入仕様へ移行します。

ただし、これはProduction統合済みという意味ではありません。Foundation、既存Player実装、Production目標は次のように区別します。

| 区分 | 現在の扱い |
| --- | --- |
| Palette State Graph Foundation | deterministic fake-hostを用いた技術基盤がPR #29に実装済み。Production Playerとは未接続 |
| 本ページ | Production導入契約を定義 |
| Production Player State Graph | 未実装 |
| `feature/playerMotion` | 移動試作と既存挙動Evidence。Production State authorityにはしない |
| Player Gameplay仕様 | `docs/spec/player/**`を正本とする |

旧版で避けていた「確認前の全面置換」「Player仕様の再定義」「第二のFSM追加」は、引き続き禁止します。

---

## 目的

本基盤の目的は次のとおりです。

- PlayerのStateと遷移判断を一か所へ集約する
- 同一frameのEvent、強制処理、通常Actionを決定的に評価する
- 複数RegionとContextを一つのtransactionとしてCommitする
- 遷移前にGuardを評価し、不成立時に現在Actionを破壊しない
- 遅延callbackへ`battleId`、`actionRunId`、Machine identityを適用する
- 旧Battle、旧Action、旧MachineのEventを安全に拒否する
- Gameplayコードから独自の遷移判断とState書込みを撤去する
- Graph、Matrix、Trace、Scenarioを同じSemantic定義から生成する
- Play／Build前に不完全なProduction接続をfail-closedで検出する
- Player仕様と実装結果の差をScenarioとTraceで監査可能にする

---

## 採用方針

Palette State GraphのProduction導入では、以下を固定します。

- Palette State GraphはPlayer専用基盤とする
- EnemyやUIの汎用State Graphへ拡張しない
- State GraphをPlayerの状態判断・遷移判断の唯一の管理者とする
- `feature/playerMotion`のState管理を第二の管理者として残さない
- Gameplay上の正式な挙動はPlayerおよび各Domain Ownerの仕様を正本とする
- Production Semantic Graphを実行可能な遷移定義の唯一の正本とする
- Runtime中のPlayer StateはActive Configurationだけを正本とする
- 遷移判断に必要な現在値はtransactional Contextを正本とする
- Physics、Animator、Combatなどは事実または実行結果を提供し、Stateを決めない
- Graph、Matrix、Inspector、Trace、ScenarioはState authorityにならない
- Production初期版のEditorWindowは閲覧・診断専用とする

State、Context、Animator parameter、PlayerMovement内enumなどへ、同じ事実を重複して保持してはいけません。

---

## 正本と責務境界

| 対象 | 唯一の正本 |
| --- | --- |
| ゲーム上の正式な挙動 | `docs/spec/player/**`および各Domain Owner仕様 |
| 実行可能な状態・遷移定義 | Production Semantic Graph |
| 実行中のPlayer State | State GraphのActive Configuration |
| 遷移判断に必要な現在値 | transactional ContextおよびMachine-owned Buffer |
| Physics、Animator、Combat等の事実 | 各Domain Owner |
| Battle IDと最終Battle結果 | Game／Combatの正本 |
| 観測・診断 | State Graph Trace／Gameplay Runtime Trace |
| 表示レイアウト | Semantic Graphと分離したLayout data |

責務間の優先関係は次のとおりです。

1. Playerおよび各Owner仕様がゲーム結果を定義する
2. Production Semantic Graphがその結果を実行可能なRuleとして表す
3. RuntimeがSemantic Graphを決定的に実行する
4. Trace、Inspector、Scenarioが実行結果を観測・検証する

Player仕様とSemantic Graphが異なる場合、Graph側を修正します。Traceや既存コードの結果を理由として、Player仕様を暗黙に変更してはいけません。

---

## Player State構造への接続

Player Stateの正式な構造は[Player State仕様](/spec/player/states)を正本とします。

Production Graphは、少なくとも次の構造を完全に表現します。

```text
Root
├─ Gameplay
├─ Conversation
├─ Interacting
└─ Dead

Gameplay
├─ Movement Region
├─ Action Region
├─ Aim Region
└─ Reaction Region
```

Gameplay内の4 Regionは並列であり、それぞれが同時に一つのStateを持ちます。

Action Stateの種類、Action遷移Matrix、強制遷移、Action終了理由、Aim、Reaction、Conversation、Interacting、Deadの正式な条件は、Playerカテゴリの各正本へ委譲します。

一つの判断で複数Regionが変化する場合は、一つのMacro Ruleとして原子的にCommitします。複数の独立したSetter呼び出しとして順番に反映してはいけません。

Action内部Phaseは、Player Stateとして定義されているものを除き、Action Stateと重複する独立Stateにはしません。必要なPhase、Action activation、Pending、Bufferなどは、transactional ContextまたはMachine-owned Bufferとして管理します。

---

## Production構成

Production導入では、次の構成要素を用意します。

| 構成要素 | 責務 |
| --- | --- |
| Production Semantic Graph | Player State、Rule、Guard、Effect、Buffer、Decision Domainを定義する |
| Layout data | ノード位置、折りたたみ、表示グループなどを保持する |
| Production Binding Catalog | Event、Guard、Effect、Command、Contextの型付き契約を記録する |
| Production Binding Registry | AOT-safeなC# Binding解決を提供する |
| Compiler | Semantic GraphとCatalogから決定的なRuntime IRを生成する |
| `CompiledGraphArtifact` | Unity Runtimeが使用する検証済みRuntime IRを保持する |
| Player State Graph Session | Gameplay Scene内のMachine Generationとlifecycleを管理する |
| Central Ingress | Domain Eventを収集し、sealed batchを構築する |
| State Graph Runtime | Guard評価、Macro Rule選択、transaction、Buffer、Fault、Traceを実行する |
| Command Router | Commit済みCommandを型ごとのProduction Adapterへ配送する |
| Domain Adapter | Input、Physics、Movement、Animator、PlayerStatus、Combat等を接続する |
| Diagnostics Bridge | Runtime SnapshotとTraceをEditorWindowへ読み取り専用で公開する |
| Production Scenario Suite | Player正本の成立結果と拒否結果を自動検証する |

Foundationの`PlayerFakeBindings`、fake context、sample graph、fake hostをProduction構成へ参照させてはいけません。

---

## Semantic Graph／Catalog／Artifact

### Production Semantic Graph

Production Semantic Graphは、Playerの実行可能なState・遷移定義の唯一の正本です。

Graphには少なくとも次を含めます。

- RootとGameplay parallel Regions
- 全Player State
- 型付きEvent
- Action Matrixを満たす全Rule
- Interrupt Rule
- Guard
- transactional Effect
- Buffer
- Decision Domain
- 安定したReason Code
- Player仕様へのSource Reference

Ruleが存在しないことを、暗黙の拒否として扱いません。Player正本上で扱うDecision Domainは、受理、Cancel、Buffer、特殊処理、同一Action処理、拒否のいずれかへ明示的に到達させます。

Production初期版では、Semantic GraphをEditorWindow上から編集しません。

### Layout data

ノード位置、折りたたみ、表示グループ、色、Minimap用情報などの表示データは、Semantic Graphと分離します。

Layout変更は次を満たさなければなりません。

- Runtime動作を変更しない
- Semantic Hashを変更しない
- Runtime IRを変更しない
- Rule、Guard、Commandを変更しない
- Layoutが欠けてもGraphを実行できる
- 不正または古いLayoutを捨てて再生成できる

### Production Binding Catalog

Production Binding Catalogは、Production C# Bindingから生成します。

少なくとも次を型付きで記録します。

- Event payload
- Command payload
- Context field
- Correlation scope
- Guardのread set
- Effectのread／write set
- 発行可能Command
- contract version
- former Identifier
- AOT registration

Catalogを手作業の別正本にしません。Production Graphが参照するCatalog identityとhashは、Artifact生成時とRuntime初期化時に検証します。

### Runtime Artifact

CompilerはSemantic GraphとCatalogから、決定的なRuntime IRを生成します。

Artifactは次を記録・検証します。

- Graph Identifier
- Semantic source hash
- Binding Catalog hash
- compiler version
- Runtime IR version
- Runtime IR hash

Compile失敗時に、過去の成功Artifactへ暗黙にfallbackしてはいけません。古いArtifactはstaleとしてPlay／Buildを停止します。

---

## Event契約

### Eventの分類

Productionでは、少なくとも次の種類の事実または要求を型付きEventとして扱います。

| 分類 | 例 |
| --- | --- |
| Input | Action要求、Aim要求、Jump、Move入力の変化 |
| Physics | 接地・空中変化、衝突、同一Physics StepのParry接触batch |
| Animator | Animation Event、Phase完了、再生完了通知 |
| Combat | Damage、Reactionに必要な確定事実、Parry処理結果 |
| Battle | Battle準備、受付開始、確定結果、cleanup境界 |
| Root interaction | Conversation／Interacting要求と終了 |
| Action lifecycle | Action内部Phase完了、Cancel window、Action完了 |
| External result | Allocation、Marker、Projectile等のDomain処理結果 |

外部Domainは、Stateや遷移先を直接指定するのではなく、自身がOwnerである確定事実をEventとして渡します。

### Event envelope

Eventには契約に応じて次を持たせます。

| Field | 契約 |
| --- | --- |
| `eventId` | Machine内で一意なEvent identity |
| `eventTypeId` | 安定したEvent Type Identifier |
| `occurredAtTick` | Ownerから渡される整数論理tick |
| `ingressSequence` | sealed batch内の技術的な決定順 |
| `machineInstanceId` | 対象となる具体的Machine instance |
| `machineGeneration` | 対象となるPlayer Machine Generation |
| `battleId` | Battleに所属するEventで必須 |
| `actionRunId` | 特定Action activationへ属するEventで必須 |
| `payload` | Catalogで閉じた型付きpayload |
| `parentEventId` | 直接の原因Eventがある場合 |
| `rootEventId` | causal chainの起点 |
| `causalSequence` | Runtime内部Eventの決定順 |
| `originBufferedEventId` | Buffer replay元Eventがある場合 |

Raw Inputへ不要な`actionRunId`を強制しません。Battle中のInputは現在の`battleId`を持ちますが、特定Action開始前のPressはAction activationへ所属しないためです。

一方、Action開始後に遅れて到着する以下のEventには、対応する`actionRunId`を必須とします。

- Animation Event
- Action Phase完了
- judgement完了
- cancel window通知
- Action固有のDomain callback
- Action完了通知

Event Typeごとに必要なCorrelation ScopeをCatalogで閉じます。必要なCorrelationがない、または現在値と一致しないEventは、GuardやGameplay mutationより前に拒否します。

### 外部Eventと内部Event

外部EventはCentral IngressだけからMachineへ渡します。

Runtime transactionから生成される内部Eventは、Runtimeだけがidentityを発行します。外部コードが内部Eventを偽装または再注入してはいけません。

Command実行中やcallback中に外部Domainから発生したEventは、現在の判定へ再入させず、次のsealed batchへ送ります。

RuntimeがBuffer replayやPhase連鎖のために明示的に生成した内部Eventは、同じcausal chain内のFIFOとして処理できます。ただし、現在のRuleへ再帰的に割り込ませず、microstep上限とTrace対象にします。

---

## Context契約

transactional Contextには、遷移判断と同一Commitに必要な現在値だけを置きます。

Production Contextの対象例は次のとおりです。

- HP
- Stamina
- Action内部Phase
- 現在の`actionRunId`
- Pending Action
- Pending Aim
- 入力保持状態
- 現在のBattle correlation
- 一度限り処理済み状態
- Gameplay判断に必要な調整済みscalar値

Dash Cancel BufferなどFoundationのBuffer機構で表現する値は、Machine-owned Bufferを正本とします。同じBuffer内容をContextにも重複保存してはいけません。

次はContextへ保存しません。

- Active Configurationがすでに持つState
- Player State enumの複製
- Transform
- GameObjectやComponent参照
- Animatorの再生State
- CharacterController内部状態
- 外部Ownerが正本とするAllocation
- Projectile、Enemy、Shaondama等の外部Entity状態
- 表示専用UI値

外部Ownerの事実が遷移判断に必要な場合は、型付きEvent payloadとしてSnapshot化して渡すか、Ownerの契約に従って検証済みのContext値へ反映します。Graphが任意のUnity objectを直接参照してGuardを評価してはいけません。

Contextのread／writeはCatalogで宣言し、Effectは宣言されたwrite setだけをtransaction overlayへ書き込みます。

---

## Command契約

CommandはStateとContextのCommit後にだけ発行します。

Production Commandの例は次のとおりです。

- 移動開始・停止
- Dash movement開始・終了
- Jump impulse
- Animator parameter／Trigger反映
- Marker生成要求
- Charge Allocation要求
- Parry結果通知
- VFX／SE要求
- Status変更通知
- Player cleanup完了通知

Commandは次を満たします。

- Catalogで閉じた型付きpayloadを持つ
- 発行Bindingの`commandEmits`へ宣言されている
- Commit順と一致する順序で配送される
- 必要な`machineGeneration`、`battleId`、`actionRunId`を持つ
- Command Routerが型ごとのProduction Adapterへ配送する
- Command側でStateやGuardを再判定しない
- 実行結果が新しい判断を必要とする場合は、型付きEventとして次のbatchへ戻す

Commandを発行できるGraphでは、Production Command Routerを省略できません。Productionで`NullCommandDispatcher`を使用してはいけません。

Command配送が失敗した場合、すでにCommit済みのStateとContextはrollbackしません。MachineをFaultedとし、成功済みCommand prefixと失敗Command identityをTraceへ残し、Host側の安全停止経路を実行します。

---

## Identifier契約

Graph、Region、State、Event、Rule、Guard、Binding、Command、Bufferには、安定したnamespaced Identifierを使用します。

例：

```text
graph.palette_bullet.player
region.player.root
region.player.gameplay.action
state.player.root.gameplay
state.player.action.dashing
event.player.input.dash_requested
rule.player.action.click_charging.dash_buffer
guard.player.dash.can_start
binding.player.effect.consume_stamina
command.player.movement.start_dash
buffer.player.action.dash_cancel
```

Identifierは表示名と分離します。表示名の変更だけでIdentifierを変更してはいけません。

Runtime identityは用途別に分離します。

| Identity | 用途 |
| --- | --- |
| `machineInstanceId` | 具体的なStateMachine objectを識別する |
| `machineGeneration` | Gameplay Scene／Retry単位のPlayer runtime incarnationを識別する |
| `battleId` | Game／Combatが発行したBattleを識別する |
| `actionRunId` | 一回のAction activationを識別する |
| `eventId` | 一回のEventを識別する |

`battleId`、`actionRunId`、`machineGeneration`を同じ値や同じlifecycleとして扱ってはいけません。

---

## 更新順序と同一frame処理

基本処理順は次のとおりです。

```text
Input／Physics／Animator／Combat／Battle
↓
型付きEvent
↓
Central Ingress
↓
sealed batch
↓
優先lane・tick・Ingress Sequence順に評価
↓
Guard評価
↓
最大1つのMacro Ruleを選択
↓
State／Context／Bufferを原子的にCommit
↓
型付きCommandを順序どおり配送
↓
Movement／Animator／Combat等が実行
```

次の規則を適用します。

- batchの評価開始前に外部Event集合をsealする
- seal後に到着した外部Eventは次のbatchへ送る
- 同じ`ingressSequence`が複数ある場合は、衝突Eventすべてをmutation前に拒否する
- lane内は論理tick、`ingressSequence`の順で決定する
- `ingressSequence`を隠れたAction優先順位として使用しない
- 通常Action間に未定義の固定優先順位を追加しない
- 一つのEventは最大一つのMacro Ruleを選択する
- Macro Ruleは複数RegionとContextを同時変更できる
- Guard評価中にExitや外部副作用を実行しない
- Guard不成立時に現在Actionを終了しない
- Commit前のFaultではoverlay、Buffer変更、Command outboxを破棄する
- Commit後のCommand faultではCommit済みStateをrollbackしない
- 外部callbackからの再入Dispatchを禁止する
- Runtime内部EventはFIFOかつmicrostep上限内で処理する

終端、Dead、Reaction、Root強制、通常Actionの具体的な優先関係は、[Player State仕様](/spec/player/states)と[Player Action遷移仕様](/spec/player/player-action-transitions)へ接続します。

同一frameのClear／Dead、Battle結果候補の収集、最終結果確定は、[ゲーム全体](/spec/game/)と[Combat](/spec/combat/)を正本とします。State Graph側で別のBattle結果優先規則を作りません。

---

## Input接続

Unity Input SystemをProduction Inputの正規入口とします。

Input Adapterは次を行います。

- Input Action callbackを型付きEventへ変換する
- 物理キーをPlayerコードから直接読まない
- callbackからStateを変更しない
- Action開始条件をInput Adapter側で再判定しない
- 現在のMachine identityと必要な`battleId`をEventへ付与する
- Press、Release、HoldをPlayer正本のInput契約に従って区別する
- 受付gateが閉じている入力を保存・再生しない
- gate再開時に押しっぱなし入力を新規Pressとして合成しない

連続Move値もStateの代用にはしません。Move値がState判断へ影響する場合は型付きの入力Snapshot／Eventとして渡し、単なるMotor計算である場合もState書込み経路を持たせません。

Raw Move値を毎frame無条件に詳細Traceへ保存しません。状態判断に使用した変化、Press／Release、受理・拒否結果を中心に記録します。

正式な入力割当と受付条件は[入力・操作仕様](/spec/player/input-and-controls)を参照します。

---

## Physics／Movement接続

Physicsは接地、空中、衝突、Parry接触などの事実を提供します。Physics callbackからStateを直接変更してはいけません。

Physics Adapterは次を行います。

- 接地／空中の確定事実を型付きEventとして通知する
- CharacterController内部状態をContextへ複製しない
- 同一Physics StepのParry対象をbatchとして確定してから通知する
- 個々の接触callbackからParry StateやHitStopを直接開始しない
- EventへPhysics Step identityなど必要なDomain情報を付与する

Movement MotorはGraph SnapshotまたはCommit後Commandに従います。

Motorは次を担当できます。

- カメラ相対移動方向
- CharacterController移動
- 重力
- 回転
- 速度計算
- Dash等の確定済みmovement処理

Motorは次を担当しません。

- Movement／Action／Aim／Reaction Stateの選択
- Action開始条件
- Action Cancel判定
- Root変更
- Reaction／Dead判定

移動とJumpの正式なGameplay結果は、[基本移動](/spec/player/basic-movement)と[移動・ジャンプ](/spec/player/player-movement-jump)を参照します。

---

## Animator接続

Animatorは表示とAnimation再生のOwnerであり、Player State authorityではありません。

Animator Adapterは次を行います。

- Graph commit後のCommandからparameter／Triggerを更新する
- 現在のActive ConfigurationをAnimator Stateで逆算しない
- Animator StateをPlayer Stateの代用にしない
- Animation Eventを型付きEventとしてIngressへ戻す
- Action固有callbackへ`battleId`と`actionRunId`を付与する
- 古いActionのAnimation Eventを現在Actionへ適用しない
- Animator callbackから直接Stateを変更しない

`feature/playerMotion`のAnimator Controller、Animation素材、`Speed` parameterは、表示資産として再利用できます。State判断の正本にはしません。

---

## PlayerStatus接続

HP、Staminaなど、遷移成立を決める現在値はtransactional Contextを正本とします。

以下は一つのtransactionで確定します。

- 消費前のStatus確認
- Guard成立
- 必要なStatus消費
- Action／Reaction／Dead等のState変更
- Commit済みStatus通知Commandの生成

例えば、Stamina消費が必要なActionでは、「Stateを開始した後で外部Statusから消費に失敗する」構造にしてはいけません。

PlayerStatus AdapterやUIは、Commit済み結果の通知を受け取ります。

次を禁止します。

- UI表示値からHP／Staminaを逆算する
- Animator parameterをStatus authorityにする
- Graph外のPlayerStatusとContextへ同じ可変値を二重保持する
- Status消費Commandの成功を前提にStateを先にCommitする

正式なStatus規則は[Playerステータス](/spec/player/player-status)を参照します。

---

## Combat／Battle接続

Game／Combatは次を所有します。

- `battleId`の発行
- Battle準備状態
- Combat受付
- Battle終了候補の収集
- 同一frame競合の解決
- 最終Battle結果
- Resultへの接続

State Graphは次を行います。

- 現在の`battleId`をCorrelation authorityとして使用する
- Combatから受け取った確定事実をEventとして評価する
- Player State／Contextへ必要な変更を原子的にCommitする
- 最終結果確定後に新しいGameplay Actionを開始しない
- Player側cleanup完了を`battleId`付きCommandで通知する

State GraphはBattle結果を再判定しません。

Deadが成立したことだけを理由に、State GraphがGame Overを確定してはいけません。同一frameのClear＋Deadを含む最終結果は[ゲーム全体](/spec/game/)へ委譲します。

Battle Clock、Gameplay Clock、MusicChart Clock、Pause、HitStopとの時間関係は、[ゲーム全体](/spec/game/)、[Combat](/spec/combat/)、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)、およびPlayerの各正本を参照します。

---

## Battle開始・終了・Retry・Scene lifecycle

### MachineとBattleの分離

Productionでは、Machine lifetimeとBattle lifetimeを同一概念として固定しません。

```text
Gameplay Scene内のPlayer State Graph Session
├─ machineInstanceId
├─ machineGeneration
├─ Battle A / battleId A
├─ Battle間のPlayer lifecycle
└─ Battle B / battleId B
```

初期Productionでは、一つのMachine Generationに一つのStateMachine instanceを対応させます。Machineを再構築する場合は、同じGenerationとして偽装せず、新しいGenerationを発行します。

Foundation SPECに残る「1 Battle＝1 Machine Session」は、Production契約としては採用しません。Foundation Runtimeの「停止済みMachineをResetして再利用しない」という制約は維持しつつ、通常のBattle終了とScene-level Machine Stopを分離します。

### lifecycle契約

| lifecycle | Production処理 |
| --- | --- |
| Gameplay Sceneへ入る | 新しい`machineInstanceId`と`machineGeneration`でSessionを生成し、Ingress gateを閉じた状態でGraphを初期化する |
| Battle準備 | Game／Combatから新しい`battleId`を受け取り、trusted lifecycle EventでBattle correlationと必要なbattle-scope dataを初期化する。Gameplay入力はまだ受け付けない |
| Ready gate成立 | Game／Combatの通知後、対象`battleId`のGameplay ingressを有効化する |
| Battle進行中 | 現在のMachine Generationと`battleId`に一致するEventだけを受け付ける |
| Battle結果確定 | 通常Gameplay ingressを閉じ、確定結果をtrusted lifecycle経路で通知し、Action、Aim、Reaction、Pending、Buffer等を一度だけcleanupする |
| cleanup完了 | `PlayerCleanupCompleted(battleId)`相当の型付きCommandを一度だけ通知する |
| 同じScene内の次Battle | 前Battle cleanup完了後、新しい`battleId`を明示的に導入する。同じMachine Generationの継続を許可する |
| Room Retry | 旧Ingressを閉じ、旧Machineを`Stop()`／Disposeし、新しいMachine GenerationとMachine instanceを生成する。旧MachineをResetしない |
| Scene変更 | Ingressを閉じ、`Stop()`／DisposeしてSessionを破棄する |
| Machine Fault | Ingressを閉じ、Hostの安全停止を実行する。Faulted MachineをResetして復帰させない |

Battle準備Eventのように、新しい`battleId`を導入するEventは、通常のBattle-scoped Gameplay Eventと分離します。Machine Session Ownerだけが発行でき、現在のMachine identity、gate、lifecycle状態を検証します。

Battle結果確定時は、通常Gameplay ingressを先に閉じます。ただし、Gameが確定した終了通知とcleanup Eventは専用のtrusted lifecycle経路から処理できなければなりません。

Battle結果確定だけでScene-level Machineを必ず`Stop()`してはいけません。Conversation、Interacting、Battle間準備、次Battleが同じGameplay Scene内で継続する可能性があるためです。

`Stop()`は冪等とし、複数回呼ばれてもcleanup、revision、Command、通知を重複させません。

---

## Player State Graph EditorWindow

Production初期版では、Unity Animatorに近い独立したdockable EditorWindowを提供します。

推奨メニューは次です。

```text
Window > Palette Bullet > Player State Graph
```

PR #29に実装済みの`Window > Palette State Graph > Foundation Inspector`はFoundation確認用です。Production Windowの完成を意味しません。

Production Windowは次を満たします。

- Unity内へdock可能
- 独立Window化可能
- 自由なサイズ変更
- パン
- ズーム
- 選択StateへのFocus
- Graph全体表示
- Minimap
- Search
- Filter
- Auto Layout
- Layout Reset
- Unity Layoutとしての配置保存
- Production Graph／Catalog／Artifact／Live Sessionの状態表示

単なるInspector内の小さな追加欄にはしません。

Window上で次を行ってはいけません。

- State、Rule、Guard、Commandの編集
- Play中のState強制変更
- Context、HP、Staminaの手動変更
- TraceからのCommand直接発行
- Live Machineへの任意Event注入
- Semantic Graphを変更するQuick Fix

ノード位置変更、Auto Layout、Layout Resetは、Semantic定義と分離した表示操作として許可します。

---

## Graph／Matrix表示

### Graph表示

Root表示では次を示します。

- Gameplay
- Conversation
- Interacting
- Dead

Gameplayを開いた場合は、次の4 parallel Regionsを表示します。

- Movement
- Action
- Aim
- Reaction

各Region内には、Player正本に存在する正式なStateを表示します。

Action内部PhaseはGraph全体へ常時展開せず、選択Stateの詳細またはdrill-down表示で確認できるようにします。

### Macro Rule表示

複数Regionを同時変更するMacro Ruleを、一本の通常遷移線だけで表現してはいけません。

Macro Rule選択時には、少なくとも次を同時に強調します。

- 変更対象の全Region
- 遷移前後の全State
- Context変更
- Buffer操作
- 発行Command
- 関連Guard
- Source Reference

Region変更を伴わない`stay`、明示的拒否、Buffer格納も、遷移線の有無だけで意味を失わない表示にします。

### Action Matrix

Action Matrixは、現在Actionを縦、要求Actionを横に配置します。

セルはProduction Semantic Graphから生成し、[Player Action遷移仕様](/spec/player/player-action-transitions)に対応する次の区分を表示します。

- 即時遷移
- `C→`
- `B→`
- 特殊処理
- 拒否
- 同一Action再入力

Matrixは閲覧専用です。セルを直接編集してはいけません。

### Interrupt Matrix

Action Matrixとは別にInterrupt Matrixを提供し、Dead、Reaction、Root変更などの強制Ruleを確認できるようにします。

Interruptの正式な優先関係はPlayer正本へ接続し、Window側で独立した優先順位を持ちません。

---

## State／Rule選択時の詳細

### State詳細

Stateを選択した場合、右側の詳細Paneへ少なくとも次を表示します。

- 表示名
- Identifier
- 所属Region
- 初期Stateか
- 現在Activeか
- Incoming Event／Rule
- Outgoing Event／Rule
- 開始条件
- 終了条件
- Enter処理
- Exit処理
- 読み取るContext
- 書き込むContext
- 発行可能Command
- Bufferとの関係
- Validation結果
- 関係するBinding
- Source Reference

人間向けの要約と、AI・プログラマー向けIdentifierを併記します。

開始・終了条件の要約はSemantic GraphとSource Referenceから導出し、Window固有の別仕様として手入力しません。

### Rule詳細

遷移線、Macro Rule、Matrixセルを選択した場合は次を表示します。

- 起点Event
- 遷移元
- 遷移先
- 同時に変更されるRegion
- 即時／Cancel／Buffer／拒否／stayの区分
- Guard一覧
- 優先lane
- Rule Priority
- Context変更
- Buffer操作
- 発行Command
- 相関Identifier要件
- Source Reference
- Play中の各Guard成立／不成立
- 最終的な受理／拒否理由

---

## Play中のActive表示

Play中は、Live Machineの読み取り専用SnapshotとTraceを表示します。

必須表示は次のとおりです。

- 現在有効な全Stateを発光表示する
- Active Stateへ太い枠または`ACTIVE`表示を付ける
- 色だけに依存しない
- 直前に成立したRuleを一時的に強調する
- 複数Regionが同時変更された場合は全Regionを同時に強調する
- Contextだけを変更したRuleはRule表示側を強調する
- 拒否Eventでは成立していない遷移線を光らせない
- 拒否理由をTraceまたはステータス欄へ表示する
- 自動追従を一時停止できる
- 自動追従の停止はゲーム自体をPauseしない

Live表示はMachineを操作する機能ではありません。

---

## Trace

State Graph Traceは、State Graphが「なぜ受理したか」「なぜ拒否したか」を説明する判断証拠です。

TraceはState、Context、Gameplay dataの正本ではありません。

### 記録内容

少なくとも次を記録・表示します。

- 論理tick
- `eventId`／`eventTypeId`
- parent／root／origin Event identity
- `machineInstanceId`
- `machineGeneration`
- `battleId`
- `actionRunId`
- `revisionBefore`／`revisionAfter`
- 遷移前Active Configuration
- 候補Rule
- Guard結果
- 選択Rule
- lane／Rule Priority
- 受理、拒否、Buffer、stale、Fault
- 安定したReason Code
- 遷移後Active Configuration
- Context変更
- Buffer操作
- lifecycle順序
- 発行済みCommand
- Fault phaseと失敗entity

Context変更はRuntime revisionと同じtransaction境界で表示します。別の可変State authorityとなるContext revision counterを作りません。

### 保持方針

Production Editor Play Modeの初期方針は次です。

- 初期容量は直近約2,000件
- 容量を設定可能にする
- 古い記録から上書きするring buffer
- Play終了時は原則破棄する
- 必要な場合だけJSONを手動Exportする
- Projectへ大量のTraceを自動保存しない
- Raw Move値などを毎frame無条件に大量記録しない
- Release Buildでは履歴保持とExportを含めない
- Development Buildでは明示的に有効化した場合だけ軽量Traceを保持する
- Development Buildへ診断画面Overlayを常設しない

PR #29のFoundation Trace modelと`trace-v1` JSONは利用できますが、このring buffer、Production保持設定、Window表示はProduction未実装です。

### Gameplay Runtime Traceとの境界

| Trace | 責務 |
| --- | --- |
| State Graph Trace | State遷移判断、候補Rule、Guard、Context transaction、Command、拒否理由の詳細証拠 |
| Gameplay Runtime Trace | InputからDamage等までを含むGameplay全体の観測とEvidence |

Gameplay Runtime TraceはState遷移を再判定しません。

両Traceは、少なくとも次のidentityで関連付けます。

- `eventId`
- `rootEventId`
- `battleId`
- `actionRunId`
- `machineGeneration`

Gameplay Runtime TraceはState Graph Traceの参照または転送結果を保持し、独自の遷移結果を生成しません。

---

## Scenario Runner

Scenario Runnerは、初期Active Configuration、Context、Buffer、Event列を与え、期待結果を検証するoffline test機能です。

通常のLive Machineへ任意Eventを注入するデバッグ機能にはしません。

Production Windowには次を表示します。

- `Run All Player State Tests`
- Scenario一覧
- 成功／失敗
- 期待State
- 実際のState
- 期待Context
- 実際のContext
- 失敗したEvent／Rule
- Reason Code
- Trace
- JSON結果Export

Production Scenarioには少なくとも次を含めます。

### Action／Movement

- 各Actionの正常開始・終了
- Action遷移Matrixの全セル
- Cancel
- Pending Action
- Pending Aim
- Dash Cancel Buffer
- 同一Action再入力
- JumpとAction継続
- Grounded／Airborne変更

### Interrupt／Root

- Reaction割り込み
- Dead
- Conversation
- Interacting
- 同一frameの強制Event競合
- Reaction中Inputの拒否と非replay

### Parry／時間

- 同一Physics StepのParry batch
- HitStop中入力保持
- Action固有callbackのstale rejection
- Pause／Gameplay Clockに関係するBuffer境界

### Battle lifecycle

- Battle準備gate
- Battle開始
- Battle結果確定
- Player cleanup
- 同じScene内の次Battle
- Retry
- Scene変更
- Stopの冪等性

### Safety

- 旧`battleId`
- 旧`actionRunId`
- 旧`machineGeneration`
- 重複`eventId`
- 重複`ingressSequence`
- Command fault
- Guard／Effect fault
- stale Artifact
- Production Command Router不在

各Scenarioは完全な期待Active Configurationを確認し、変更対象外Regionの予期しない変化も失敗として検出します。

Foundationの10件のPlayer-shaped ScenarioはFoundation Runtimeの証拠であり、Production Player全体の適合証拠にはしません。

---

## Validation／Play・Build Gate

Validationは、Graph、Catalog、Binding、Artifact、Production接続の設定ミスをPlay／Build前に検出します。

### Error

正しく実行できない、またはState Graphを唯一の管理者として保証できない問題はErrorです。

例：

- Schema不一致
- Identifier重複
- dangling reference
- 遷移先State不在
- Decision Domainの欠落
- guarded pathのfallback欠落
- 同rankで複数Ruleが勝ち得る
- 未登録Event／Guard／Effect／Command
- Context型不一致
- 宣言外Context read／write
- 宣言外Command発行
- 必要なCommand Router不在
- Graph、Catalog、Artifactのhash不一致
- stale Artifact
- ProductionからFake Bindingを参照
- Production BindingのAOT登録不足
- 必須Domain Adapter不在
- Runtime Stateを別コードから変更可能
- `PlayerStateMachine`のSetterがProduction経路に残る
- Production assemblyから直接State書込みAPIを参照する
- Player仕様で必須のScenario coverage不足

Errorが存在する場合、Play／Buildをfail-closedで停止します。

### Warning

実行可能だが、設計漏れや保守上の懸念がある問題はWarningです。

例：

- 到達不能State
- 未使用Event
- 未使用Binding
- 実行Evidence上、一度も成立していないRule
- 表示名不足
- Layout不足
- Source Reference不足
- Trace表示用説明不足
- orphaned Layout data

Warningは表示しますが、それ自体ではPlay／Buildを停止しません。Production releaseで必須となる項目は、release profileでErrorへ昇格させます。

### 実行タイミング

Validationは次のタイミングで実行します。

- 手動Validate
- Semantic Graph Import
- Binding Catalog生成／Import
- Production Artifact生成
- Play開始前
- Build開始前
- Production Scenario実行時
- IL2CPP Player Build検証時

診断項目をダブルクリックした場合、該当Graph entity、Catalog record、Bindingコード、Artifactのいずれかへ移動できるようにします。

Foundationの既存Play／Build Gateは、Graph／Catalog／Artifactのidentityとfreshnessを検証します。Productionではさらに、Production Graph、Production Binding、Command Router、必須Adapter、Fake Binding排除、第二State authority排除を検証対象へ追加します。

Scenario／Traceによる全release evidenceは、AssetだけではHost fixtureとの対応を保証できないため、Play／Build Asset Gateとは別のCI／release gateでも実行します。

---

## Runtime／Editor／Buildの区分

| 環境 | 機能 |
| --- | --- |
| Unity停止中 | Graph、Matrix、Validation、Scenario、Artifact状態の確認 |
| Unity Play中 | Active State、直前Rule、Context、Buffer、Traceの読み取り専用表示 |
| Development Build | 明示的に有効化した場合だけ軽量Traceを保持。診断Overlayは原則含めない |
| Release Build | State Graph RuntimeとProduction Adapterのみ。EditorWindow、診断UI、Trace履歴保存を含めない |

EditorWindowをPlayer GameObjectや製品画面へ組み込んではいけません。

---

## `feature/playerMotion`からの移行

### 現在の競合

`feature/playerMotion`には、次のState authorityがあります。

- `PlayerStateMachine`
- `SetMovement`
- `TrySetAction`
- `EndAction`
- `SetAim`
- `SetReaction`
- `SetRoot`
- `PlayerMovement`からの`SetMovement`
- Action開始条件を呼出側へ委譲する構造

これらをState Graphと並行してProductionで動作させると、同じPlayer Stateに二つの管理者が存在します。

Production移行では、既存SetterをState Graphへの薄い転送APIとして残す方法も採用しません。Domain側は型付きEventを発行し、State GraphだけがActive Configurationを変更します。

### 再利用候補

| 資産／処理 | 再利用方針 |
| --- | --- |
| カメラ相対移動方向 | Movement Motorへ移す |
| CharacterController移動 | Movement Motorとして再利用する |
| 重力 | Motor処理として再利用する |
| 回転 | Motor処理として再利用する |
| 速度計算 | Graph Snapshot／Commandに従う計算として再利用する |
| Animator Controller | 表示Ownerとして再利用する |
| Animation素材 | 再利用する |
| TestScene | 移行確認用Sceneとして再利用する |
| 現在の挙動 | 移行比較Evidenceとして記録する |
| `PlayerStates`の名称 | Semantic ID設計の参考にできるが、Runtime authorityにはしない |

### 置換対象

- `PlayerStateMachine`のmutable State authority
- 全State Setter
- `PlayerMovement`からの直接State変更
- 各Actionコード内の独自遷移判断
- Physics callbackによる直接State変更
- Animator／Animation Eventによる直接State変更
- Player State enumを別の正本として保持する構造

既存コードからState参照が必要な場合は、State Graphの読み取り専用Snapshotまたは型付きProjectionを使用します。

### 比較方法

旧実装と新実装を、実際のGameplayで二重State authorityとして並行稼働させません。

比較は次に限定します。

- 記録済み入力のoffline再生
- Production Scenario
- TestScene
- 移動量、速度、向き、接地結果の比較
- Trace／テストレポート
- 既存挙動動画

専用の常設比較Windowは作りません。

### 段階的移行

Production移行は次の順序を基本とします。

1. Foundation自体の最終検証とMerge準備
2. Production Identifier／Event／Context／Command契約
3. Production Catalog／Registry／Command Router
4. Player全体Semantic Graph
5. EditorWindowのProduction表示
6. Input／Battle／Clock接続
7. PlayerStatus接続
8. Physics／Movement接続
9. Animator接続
10. Dash／Aim／Marker／Charge／Parry／Reaction接続
11. Conversation／Interacting／Dead接続
12. Combat／Battle終了cleanup接続
13. Production Scenarioと移行比較
14. `PlayerStateMachine`の書込み経路撤去
15. IL2CPP／AOT／Performance／Allocation確認
16. Production完了判定

各接続の実装中も、同一Playerを旧StateMachineとState Graphで二重駆動する段階を設けません。

---

## テストと移行Evidence

Foundationのテスト成功は、Foundation Runtimeの技術的成立を示します。Production Playerの適合は、別のProduction Graph、Binding、Adapter、Scenario、Player Buildで検証します。

必要なEvidenceは次のとおりです。

| Evidence | 確認対象 |
| --- | --- |
| Schema／Codec tests | Production Graph、Catalog、Scenario、Traceのclosed contract |
| Compiler determinism | 同じGraph／Catalogから同じRuntime IRが生成されること |
| Semantic validation | 全State、Rule、Decision Domain、Bindingの妥当性 |
| Production Scenario | Player正本の受理・拒否・Buffer・Interrupt・lifecycle |
| Simulator／Unity Trace parity | 同じScenarioの判断結果が一致すること |
| EditMode tests | Import、Compile、Artifact、Gate、Window view-model |
| PlayMode tests | Input／Physics／Animator／Combat Adapterを含む実動作 |
| TestScene比較 | 既存移動の速度、向き、接地、Animation結果 |
| stale identity tests | 旧Battle、旧Action、旧Machineが無害に拒否されること |
| lifecycle tests | Battle開始、終了、次Battle、Retry、Scene変更、Stop |
| fault tests | Guard、Effect、Command faultと安全停止 |
| IL2CPP／AOT build | Production Binding RegistryとPlayer Build |
| allocation／performance測定 | 承認されたProduction予算を満たすこと |
| Manual Window QA | dock、pan、zoom、selection、active発光、直前Rule発光、Trace表示 |

既存挙動との比較結果は、恒久的な第二実装ではなく、移行完了までのEvidenceとして扱います。

---

## Production完了条件

次をすべて満たすまで、Production導入完了としません。

- [ ] Player全StateがProduction Graphへ存在する
- [ ] Player Action遷移Matrixが正本仕様と一致する
- [ ] 強制遷移と通常Actionの優先関係が一致する
- [ ] 各Actionの開始・終了・Cancel・BufferがScenarioで検証される
- [ ] HP／Stamina消費とState開始が原子的である
- [ ] Input、Physics、Animator、CombatがStateを直接変更しない
- [ ] 旧Battle／旧Action／旧Machine callbackが拒否される
- [ ] Battle開始・終了・次Battle・Retry・Scene変更が検証される
- [ ] Clear＋Dead同一frame契約が守られる
- [ ] Graph、Matrix、Inspector、Live表示、TraceがProduction dataで動作する
- [ ] Active Stateと直前Ruleの発光表示が動作する
- [ ] 拒否Eventで未成立遷移線が発光しない
- [ ] Validation ErrorがPlay／Buildを停止する
- [ ] Warningが非blockingで表示される
- [ ] 全Production Scenarioが合格する
- [ ] Fake BindingがProductionから参照されない
- [ ] Production Command RouterがすべてのCommandを処理する
- [ ] `PlayerStateMachine`が第二の管理者として残っていない
- [ ] IL2CPP／AOT Player Buildが成功する
- [ ] allocation／performance基準を満たす
- [ ] Manual Inspector QAが完了する

---

## 禁止事項

次を禁止します。

- Player以外へ本基盤を汎用化する
- State Graph以外のmutable Player State authorityを残す
- `PlayerStateMachine` SetterとGraphを並行稼働させる
- Physics、Animator、Input callbackからStateを直接変更する
- Command側でStateやGuardを再判定する
- ContextとActive Configurationへ同じStateを重複保存する
- Animator parameterをPlayer State authorityとして読む
- Fake Host／Fake Binding／Sample GraphをProductionへ流用する
- Productionで`NullCommandDispatcher`を使用する
- stale Artifactへfallbackする
- 毎Battle終了を無条件にMachine Stopと同一視する
- `battleId`と`machineGeneration`を同一identityとして扱う
- gate閉鎖中の入力を保存し、再開後にreplayする
- Live MachineへWindowから任意Eventを注入する
- Live State／Context／StatusをWindowから変更する
- Gameplay Runtime TraceでState遷移を再判定する

---

## 非目標

初期Productionの非目標は次のとおりです。

- Enemy／UI向け汎用State Graph
- EditorWindow上でのGraph編集
- 遷移線編集
- Guard編集
- Matrixセル編集
- Live State強制変更
- Live Context書換え
- TraceからのCommand発行
- 製品画面への診断Overlay
- Animator Controllerの置き換え
- Physics Engineの置き換え
- Gameplay Runtime Traceによる遷移再判定
- 共通技術ページ内でのPlayer Gameplay仕様再定義
- `feature/playerMotion`のStateMachineとの恒久的併存
- 常設の旧実装／新実装比較Window

---

## 将来拡張

以下は将来候補であり、初期Productionの完了条件へ含めません。

- 制限付きVisual Authoring
- Matrixからの遷移編集
- Graph変更のUndo／Redo
- 仕様書ページへの直接Navigation
- Scenario作成GUI
- 2つのTraceの比較表示
- Development Buildからの診断Bundle回収
- Graph Layout共有機能の高度化

将来Visual Authoringを導入する場合も、Graph、Matrix、Inspectorが同じSemantic Graphを編集し、独立した遷移定義を持たないことを必須とします。

---

## 他ページとの責務分離

| 内容 | 正本 |
| --- | --- |
| 共通技術カテゴリ全体 | [共通技術](/spec/common-technology/) |
| Player State構造・優先関係 | [Player State仕様](/spec/player/states) |
| Action遷移Matrix | [Player Action遷移仕様](/spec/player/player-action-transitions) |
| Input | [入力・操作仕様](/spec/player/input-and-controls) |
| HP／Stamina | [Playerステータス](/spec/player/player-status) |
| 基本移動 | [基本移動](/spec/player/basic-movement) |
| Jump | [移動・ジャンプ](/spec/player/player-movement-jump) |
| Aim | [Playerアクション｜照準](/spec/player/player-action-aim) |
| Dash | [Playerアクション｜ダッシュ](/spec/player/player-action-dash) |
| Marker | [Playerアクション｜マーカー](/spec/player/player-action-marker) |
| Charge | [Playerアクション｜チャージ](/spec/player/player-action-charge) |
| Parry | [Playerアクション｜パリィ](/spec/player/player-action-parry) |
| Damage Reaction | [Playerリアクション｜ダメージ](/spec/player/player-reaction-damaged) |
| Dead | [Player死亡](/spec/player/player-death) |
| Conversation | [Player会話](/spec/player/player-interaction-conversation) |
| Interacting | [Playerインタラクション](/spec/player/player-interaction-interacting) |
| Battle開始・結果・Retry | [ゲーム全体](/spec/game/) |
| Combat lifecycle | [Combat](/spec/combat/) |
| BGM、時計、Pause、HitStop接続 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| Gameplay全体の観測 | [Gameplay Runtime Trace](/spec/common-technology/gameplay-runtime-trace) |

本ページは各Gameplay正本を実装へ接続する技術基盤を定義し、各ページのGameplay結果を上書きしません。

---

## 関連タスク

<PageRelations />
