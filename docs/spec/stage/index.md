---
title: ステージ
description: Stage objective、Spawn program、Clear対象Enemy記録、正式除外およびClear条件評価の仕様
pageType: spec
category: ステージ
categoryOrder: 80
order: 0
status: 仮仕様
---

# ステージ

## ページ概要

- 対象担当：Stage／Level Design／Program
- 関連ページ：[ゲーム全体](/spec/game/)、[戦闘システム](/spec/combat/)、[敵](/spec/enemy/)、[Enemy Damage／浄化](/spec/enemy/damage-and-purify)
- 正本範囲：Stage objective、Spawn program、Clear対象Enemy記録、正式除外、Clear条件評価

本ページは、Battle中にStageがどのEnemyをClear対象として管理し、いつ新しいClear対象の追加が終了し、どの条件でClear候補を発生させるかを定義する正本です。

StageはClear条件を評価しますが、最終Battle結果は確定しません。Clear条件が成立した場合は、対象`battleId`付きのClear候補をGameへ一度だけ通知します。

## 目的

動的Spawnを含むStageでは、wave間やSpawn待機中に、world上の有効Enemyが一時的に0体になる場合があります。

現在存在するEnemy数だけでClearを判定すると、未来のwaveや増援が残っているにもかかわらず早期Clearする可能性があります。本仕様では、次の2つを分離して管理することで早期Clearを防ぎます。

- 新しいClear対象Enemyを追加する可能性が終了したかを表すStage objective
- Battle中に登録されたClear対象Enemyがすべて解決済みかを表すClear対象Enemy記録

## プレイヤーから見た挙動

- 現在見えているEnemyをすべて浄化しても、未来のwaveや増援が残っている間はClearしません。
- wave間で一時的にEnemyが0体になっても、Stage objectiveが進行中であればBattleを継続します。
- Stage objectiveが完了し、登録済みのClear対象Enemyがすべて浄化済みまたは正式除外済みになった場合だけ、Clear候補が成立します。
- Enemyが一時的に非表示になった場合や、想定外にworld objectが消滅した場合は、それだけで浄化済みまたはClear対象外になりません。
- 初期Enemyが0体のStageでも、Battle準備中にはClearしません。Battle開始gate成立後にStage objectiveが完了し、未解決のClear対象が存在しない場合だけClear候補が成立します。

## 詳細仕様

### Stageが所有する範囲

Stageは、Battleごとに次を所有します。

- Stage定義に基づくSpawn programとwave進行
- Stage objectiveの現在状態
- 初期配置Enemyおよび動的Spawn EnemyのClear対象登録
- `PendingSpawn`を含むClear対象Enemy記録
- Clear対象Enemyの浄化通知の受理
- Clear対象Enemyの正式除外
- 同一frame内のStage／Spawn／Enemy更新の収集
- Clear条件の評価
- Clear候補の通知済み状態
- Stage／Enemy Spawnに関するBattle終了cleanup
- Retry時のStage状態の再構築

Stageは、次を所有しません。

- Clear候補とGame Over候補から最終Battle結果を確定する処理
- Clear／Game Over Resultの表示と操作受付
- Enemy個体のAI、攻撃、Damage計算、浄化成立判定
- Combat全体のGameplay受付gateや全必須cleanup Ownerの集約

GameやCombatは、Stage内部のwave数、残りSpawn数、Clear対象Enemy集合を独自に再計算しません。

### Battle単位の識別

Stageの状態と処理は、すべて対象Battleの`battleId`に属します。

- 新しいBattleの開始時に、上位Ownerから新しい`battleId`を受領します。
- Stage objective、Spawn program進行、Clear対象記録、通知済み状態、cleanup進捗は`battleId`ごとに区別します。
- 登録、Spawn完了、浄化、正式除外、objective完了、Clear候補、cleanup完了の各処理で、対象`battleId`を照合します。
- 現在のBattleと一致しない通知やcallbackは、現在または次のBattleへ適用しません。
- 旧Battleの状態や記録へ新しい`battleId`を付け替えて再利用しません。

### Stage objective

StageはBattleごとに、少なくとも次のobjective状態を区別できるようにします。実装上のenum名は固定しません。

| 状態 | 意味 |
| --- | --- |
| `InProgress` | 同じBattleへ新しいClear対象Enemyを追加する可能性が残っている |
| `Completed` | 同じBattleへ新しいClear対象Enemyを追加する可能性が終了している |

`InProgress`には、少なくとも次の状態を含みます。

- 将来のwaveが残っている
- 時間差増援が予定されている
- Enemyを追加するイベント条件を待っている
- Spawn programがまだ終了していない
- 未処理のSpawn予定が残っている
- その他、新しいClear対象Enemyを追加する可能性が残っている

`Completed`は「現在のEnemyがすべて浄化済み」という意味ではありません。新しいClear対象Enemyを追加する可能性が終了したことだけを表します。そのため、未浄化Enemyが残っている状態でもobjectiveだけが`Completed`になる場合があります。

`Completed`は同一Battle内の終端状態です。一度成立した後に`InProgress`へ戻しません。また、`Completed`成立後に同じBattleへ新しいClear対象Enemyを登録しません。

### Clear対象Enemy記録

Stageは、現在world上に存在するEnemyだけではなく、対象Battleで登録されたClear対象を記録として管理します。

各記録は、概念上、少なくとも次の状態を区別できるようにします。実装上の型名や保存形式は固定しません。

| 状態 | 意味 | Clear条件上の扱い |
| --- | --- | --- |
| `PendingSpawn` | Spawnは確定したが、Enemyの生成・初期化・world上での有効化が完了していない | 未解決 |
| `Active` | Gameplay上で有効な未浄化Enemy | 未解決 |
| `Purified` | Enemyの浄化が成立済み | 解決済み |
| `FormallyExcluded` | Stageの正式な処理によってClear対象外になった | 解決済み |

各記録は、少なくとも次を対応付けて識別できる必要があります。

- 所属`battleId`
- Clear対象記録の識別情報
- EnemyまたはSpawnの識別情報
- 現在の概念状態
- 対応するEnemy world objectまたはSpawn処理との関係
- 正式除外した場合の除外理由

`Purified`または`FormallyExcluded`になった記録は、即座に集合から削除しません。重複通知や遅延通知を判別できるように、対象Battleの終了記録として保持します。

### Clear条件

Stageは、次の両方が成立した場合だけClear候補を発生させます。

```text
Stage objectiveがCompleted
AND
登録済みClear対象EnemyがすべてPurifiedまたはFormallyExcluded
```

概念上の判定は次のとおりです。

```text
ClearCandidate =
    StageObjectiveState == Completed
    AND
    ClearTargetRecords内に
        PendingSpawn
        または
        Active
    が存在しない
```

現在world上にいるEnemyが0体であることだけではClear条件になりません。

Clear候補のGameplay評価は、次の両方を満たす期間にだけ行います。

- 対象Battleの開始gateが成立済みである
- 対象Battleの最終結果が未確定である

Stageは、Battle準備中にClear候補を発生させません。また、Clear条件が成立しても最終Battle結果やResult variantを確定しません。

### Battle開始時の初期化

Battle開始時のStage初期化と初期配置Enemyの登録は、次の順序で行います。

```text
新しいbattleIdを受領
↓
Stage objectiveをInProgressとして初期化
↓
Spawn program進行と通知済み状態を初期化
↓
Clear対象Enemy記録を初期化
↓
初期配置EnemyをClear対象へ登録
↓
Enemy個体を初期化
↓
初期Enemy／Spawn準備完了
↓
Enemy Ready
```

初期配置のClear対象Enemyは、Enemy Ready成立前にすべて登録済みでなければなりません。登録前のEnemyを有効な戦闘Enemyとして行動させません。

Enemy Readyは「Enemyが1体以上存在する」という意味ではありません。対象Battleの初期Enemy／Spawn準備とClear対象登録が完了したことを表します。

### Spawn program

Spawn programは、Stage定義に基づき、wave、時間差増援、イベント条件付き増援などを進行させます。

まだSpawnが確定していない将来waveの全Enemyを、Battle開始時に個別のClear対象として予約登録しません。未確定の未来Spawnが残っていることは、Stage objectiveを`InProgress`に維持することでClear条件へ反映します。

Stageが個別のSpawnを確定した時点で、対象EnemyのClear対象記録を作成します。Spawnの確定前は個別記録を作成せず、確定後はEnemyをGameplay上で有効化する前に登録を完了します。

### 動的Spawn Enemyの登録

動的SpawnするClear対象Enemyは、次の順序で登録し、有効化します。

```text
StageがSpawnを確定
↓
battleIdとEnemy／Spawn識別情報を割り当てる
↓
Clear対象へPendingSpawnとして登録
↓
Enemy world objectを生成・初期化
↓
登録済み記録とEnemy個体を対応付ける
↓
Activeへ移行
↓
行動・Target・Hit・Damage受付を開始
```

登録は、対象Enemyが次の処理を開始する前に完了させます。

- world上で有効なEnemyとして行動する
- PlayerやPalette BulletのTarget候補になる
- HitやDamageを受け付ける
- 攻撃を開始する
- Clear条件へ影響する

Clear対象でない背景演出用Enemyや表示専用objectは、Clear対象Enemy記録へ登録しません。

### PendingSpawn

`PendingSpawn`は、確定済みのSpawnが未完了であることを表し、Clear条件上は未解決として扱います。

- `PendingSpawn`中のEnemyを、有効な戦闘Enemyとして扱いません。
- `PendingSpawn`中のEnemyをTarget候補にせず、AI、攻撃、Hit、Damage受付を開始しません。
- Spawnの生成・初期化・記録との対応付けが完了した後にだけ`Active`へ移行します。
- callbackが遅延していることやworld objectが未生成であることを理由に、記録を暗黙に削除しません。
- StageがSpawn cancelを正式に確定した場合は、該当する記録を除外理由付きの`FormallyExcluded`として解決します。
- callbackが届かないことや想定外の失敗だけでは、Spawn cancelまたは正式除外が成立したものとして扱いません。

### 初期0体・wave間0体

初期Enemyが0体でも、それだけでClear候補を発生させません。

- 未来のSpawn、wave、イベント進行が残っている場合は、Stage objectiveを`InProgress`に維持します。
- wave間に有効Enemyが0体になった場合も、Stage objectiveが`InProgress`である限りClear候補を発生させません。
- 意図的にEnemyが1体も存在しないStageでは、対象Battleの開始gate成立後、Stage objectiveが`Completed`となり、未解決のClear対象記録が存在しない場合に限りClear条件を満たします。

### 浄化通知の受理

EnemyのRGB Damage処理によって浄化が成立した場合、Enemy Damage OwnerからStageへ、少なくとも次を識別できる浄化通知を受け取ります。

- `battleId`
- Enemy識別情報またはClear対象記録の識別情報
- 浄化成立
- 必要な場合は浄化成立frame

Stageは、次の条件をすべて満たす通知だけを適用します。

- 通知の`battleId`が現在のBattleと一致する
- 対象がClear対象記録へ登録済みである
- 対象がまだ`Purified`または`FormallyExcluded`になっていない
- 対象Battleの最終結果が未確定である

条件を満たした場合、対応する記録を一度だけ`Purified`へ変更します。

EnemyまたはEnemy Damage Ownerは、Clear条件を評価せず、Clear候補をGameへ直接通知しません。Enemy world objectを消す時期と、Stageが`Purified`記録を保持する期間は分離します。

### 正式除外

Clear対象Enemyを浄化以外の理由で対象外にする場合は、Stageが正式除外を確定します。

正式除外では、少なくとも次を識別できるようにします。

- `battleId`
- Clear対象記録の識別情報
- 除外理由
- 除外成立済み状態

現在の`battleId`に属する登録済みの未解決記録だけを、一度だけ`FormallyExcluded`へ変更します。

次の事象だけでは、自動的に正式除外しません。

- Playerから遠くへ移動した
- カメラ外へ出た
- 一時的に非表示になった
- AIやColliderが無効になった
- object poolingへ返却された
- Enemy world objectが想定外に消滅した

### 想定外消滅

Clear対象Enemyのworld objectが想定外に消滅した場合、対応するClear対象記録は未解決のまま維持します。

次のいずれかによって記録を明示的に解決する必要があります。

- 同じ記録へ対応付けたEnemyの再Spawnまたは状態復旧
- 正常な浄化成立
- Stageによる正式除外

想定外消滅を暗黙の浄化または正式除外として扱い、Clearへ進めてはいけません。

### objective完了条件

Stageは、少なくとも次を確認した後にobjectiveを`Completed`へ変更します。

- 新しいwaveを開始する予定がない
- 新しいClear対象Enemyを追加するイベントが残っていない
- 未処理のSpawn予定がすべて確定またはcancel済みである
- Stage進行上のEnemy objectiveが終了している
- 同じBattleへ新しいClear対象Enemyを追加する可能性が残っていない

objective完了処理には`battleId`を含め、同じBattleについて一度だけ成立させます。

`Completed`成立後に届いた同じBattle向けのSpawn確定、登録、遅延callbackは、旧処理または不正な処理として拒否します。`Completed`を`InProgress`へ戻して受け入れません。

### 同一frame更新の収集

Stageは各frameで、少なくとも次の更新を収集してからClear条件を一度だけ評価します。

- 新しい動的Spawnの確定と`PendingSpawn`登録
- `PendingSpawn`から`Active`への移行
- Enemy浄化
- 正式除外
- Spawn cancel
- Stage objective完了

概念上の処理順は次のとおりです。

```text
同一frame内のStage／Spawn／Enemy更新を収集
↓
Clear対象Enemy記録へすべて反映
↓
Stage objective状態を反映
↓
Clear条件を1回だけ評価
↓
成立した場合だけClear候補を1回通知
```

最後の未浄化Enemyの浄化と、新しい動的Spawnの登録が同一frameに成立した場合は、新しいEnemyを登録した状態でClear条件を評価します。新しい対象が未解決であればClear候補を発生させません。

objective完了と最後のEnemy浄化が同一frameに成立し、`PendingSpawn`または`Active`の記録が残っていなければ、Clear候補を発生させます。

同一frameに同じClear対象記録の正式除外と浄化成立通知が成立した場合、Stage側記録はFormallyExcludedを維持する。Enemy自身の浄化成立は取り消さないが、Stage側記録をPurifiedへ上書きしない。

### Clear候補通知

Clear条件が成立した場合、Stageは対象`battleId`付きのClear候補をGameへ一度だけ通知します。

- 同じBattleについてClear候補を複数回通知しません。
- Clear候補通知後にStage内部の状態を再評価して、別のClear候補を発生させません。
- GameはClear候補とGame Over候補を収集し、最終Battle結果を確定します。
- Stageは同一frameのClearとGame Overの優先順位を判定しません。
- Battle結果確定後に成立または到着した更新から、新しいClear候補を発生させません。

### 通知と処理の冪等性

Stageは、同じ論理処理が複数回届いても状態を重複成立させないようにします。

少なくとも次を冪等に扱います。

- Clear対象の登録
- `PendingSpawn`から`Active`への移行
- Spawn cancel
- 浄化通知
- 正式除外
- objective完了
- Clear候補通知
- Stage／Enemy Spawn cleanup完了通知

同じ識別情報による重複登録から、別のClear対象記録を作成しません。すでに終端状態となった記録への重複通知や、現在状態と矛盾する遅延通知は再適用しません。

## 状態別の挙動

| Stage／Battle状態 | Spawn program | Clear対象記録 | Clear評価・通知 |
| --- | --- | --- | --- |
| Battle準備中 | 初期化と初期配置登録を行う | 初期配置対象を登録する | 評価しない |
| Battle開始後・objective `InProgress` | waveやSpawn条件を進行する | Spawn確定時に対象を追加する | 未解決対象が0件でもClear候補を出さない |
| objective `Completed`・未解決対象あり | 新しいClear対象を追加しない | 既存対象の浄化または正式除外を待つ | Clear候補を出さない |
| objective `Completed`・未解決対象なし | 新しいClear対象を追加しない | 解決済み記録を保持する | Clear候補を一度だけ通知する |
| Clear候補通知済み・結果未確定 | 新しいClear対象を追加しない | 遅延・重複通知を再適用しない | 別のClear候補を出さない |
| Battle結果確定後 | 停止する | Gameplay状態を更新しない | 評価・通知しない |
| Retry初期化中 | 旧進行を破棄し、新Battle用に再構築する | 旧記録を新Battleへ流用しない | 新Battleの開始gate成立まで評価しない |

### Battle結果確定後のSpawn停止

Battle結果確定後、Stage／Enemy Spawn側は対象Battleについて次を行います。

- 新しいwaveを開始しない
- 新しいEnemy Spawnを確定しない
- 新しいClear対象Enemyを登録しない
- `PendingSpawn`中のEnemyをGameplay上で有効化しない
- Clear条件を再評価しない
- Stageから別のClear候補を発生させない
- 遅延したSpawn完了、Enemy初期化、浄化、正式除外、objective完了の通知をGameplayへ適用しない
- 旧`battleId`の通知を現在または次のBattleへ適用しない

表示を残すEnemy objectやSpawn演出は表示専用として扱います。表示専用objectから、AI、攻撃、Hit、Damage、Target提供、Spawn、Clear評価を発生させません。

### 必須cleanup完了条件

Stage／Enemy Spawn Ownerの必須cleanupは、対象Battleについて少なくとも次を満たした時点で完了します。

- Spawn programと新しいwave開始が停止している
- 未実行のSpawn要求、予約、遅延callbackがcancel済みまたはGameplayへ適用不能になっている
- `PendingSpawn`からのEnemy有効化と新規Clear対象登録が停止している
- StageのClear条件評価とClear候補通知が停止している
- 旧`battleId`の通知やcallbackを現在または次のBattleへ適用しないgateが成立している
- Stage／Enemy Spawn側から新しいGameplay処理を再開できない状態になっている

必須cleanupが完了した場合、Stage／Enemy Spawn Ownerは、対象`battleId`付きのcleanup完了通知を上位cleanup集約Ownerへ一度だけ送ります。

次は必須cleanup完了条件に含めません。

- VFXの終了
- SEの終了
- Enemyの退場演出の終了
- 表示専用Enemy objectの消滅
- 表示専用Spawn演出の終了

これらを待たない場合でも、表示専用objectからGameplay処理を発生させてはいけません。

### Retry時の再構築

Retryでは、旧Battleに属する次の状態と参照を破棄します。

- Stage objective状態
- wave進行
- Spawn program進行位置
- Clear対象Enemy記録
- `PendingSpawn`
- Spawn要求、予約、遅延callback
- 浄化記録と正式除外記録
- Clear候補通知済み状態
- Stage／Enemy Spawn cleanup進捗
- 旧`battleId`のEnemy／Spawn参照

旧Battleの記録やEnemyへ新しい`battleId`を付け替えて再利用しません。

新しい`battleId`を受領した後、Stage定義から初期状態を再構築し、Stage objectiveの初期化、Clear対象記録の初期化、初期配置Enemyの登録からやり直します。

## 他システムとの接続

| System／Owner | 正本の責務 | Stageとの接続 |
| --- | --- | --- |
| Stage | Spawn program、objective、Clear対象記録、正式除外、Clear条件評価 | Clear条件成立時に`battleId`付きClear候補をGameへ一度だけ通知する |
| Game | Clear候補とGame Over候補の収集、最終Battle結果の確定 | Stage内部を再計算せず、Stageから確定済みのClear候補を受け取る |
| Combat | Battle中のGameplay受付gate、結果確定後の受付停止、必須cleanup Ownerの集約 | 対象`battleId`の受付状態をStage／Enemy Spawnへ適用し、cleanup完了通知を集約する |
| Enemy | 個体の`battleId`、Enemy識別情報、Clear対象記録との対応、個体状態 | 初期配置または動的Spawn時にStageの登録済み記録と対応付ける |
| Enemy Damage | RGB Damage適用とEnemyの浄化成立 | `battleId`と対象識別情報を含む浄化成立通知をStageへ一度だけ送る |
| UI | Gameが確定したBattle結果の表示 | StageのEnemy集合やobjectiveから勝敗を再判定しない |

## 例外・禁止事項

- 現在world上にいるEnemyが0体であることだけをClear条件にしてはいけません。
- Stage objectiveが`InProgress`の間に、未解決対象が0件であることを理由としてClear候補を発生させてはいけません。
- 登録前の動的Spawn EnemyをGameplay上で有効化してはいけません。
- `PendingSpawn`をClear条件上の解決済み対象として扱ってはいけません。
- Stage objectiveが`Completed`になった後、同じBattleへ新しいClear対象Enemyを登録してはいけません。
- Enemyの距離、非表示、AI停止、Collider無効化、pool返却、想定外消滅を理由に暗黙の浄化または正式除外を成立させてはいけません。
- 解決済み記録を即座に削除し、重複通知や遅延通知を新規処理として受け入れてはいけません。
- EnemyまたはEnemy Damage OwnerからGameへClear候補を直接通知してはいけません。
- StageがClear候補とGame Over候補を比較し、最終Battle結果を確定してはいけません。
- GameやCombatがStage内部のwave、Spawn予定、Enemy集合を独自に再計算してClearを判定してはいけません。
- 同一frame内の更新を個別に評価し、1frame中に複数回Clear条件を判定してはいけません。
- Battle結果確定後にSpawn、登録、Clear評価、Clear候補通知を成立させてはいけません。
- 現在と異なる`battleId`の通知、記録、Enemy、Spawn処理を現在または次のBattleへ適用してはいけません。
- 旧Battleの記録へ新しい`battleId`を付け替えて再利用してはいけません。

## パラメータ

次はStageまたはLevel Design側で調整可能な項目です。本ページでは具体値を固定しません。

| 項目 | 扱い |
| --- | --- |
| wave数 | StageごとのTuning |
| 各waveのEnemy数・構成 | StageごとのTuning |
| Spawn間隔 | StageごとのTuning |
| Spawn位置 | StageごとのTuning |
| 増援条件 | Stageごとの設計・Tuning |
| Spawn演出 | Presentation側を含むTuning |
| Stage固有ギミック | Stageごとの設計 |

これらの値や内容を変更しても、`battleId`照合、動的Spawnの事前登録、objective完了gate、同一frameの一回評価、通知の冪等性を省略してはいけません。

## 未決事項

今回、次のStage内容は確定しません。

- Stage数とRoom数
- wave数
- Enemy数と構成
- Spawn間隔
- Spawn位置
- Spawn演出
- 増援条件の具体的内容
- Stage固有ギミック
- Clear演出
- Scene構成
- object poolingなどの内部実装方式

これらは未決またはTuningとして残しますが、本ページで定義したClear gateとOwner責務は変更しません。

## 仕様確認シナリオ

1. 初期Enemyをすべて浄化しても、未来waveが残っていればClear候補を発生させない。
2. wave間でEnemyが0体になっても、objectiveが`InProgress`ならClear候補を発生させない。
3. 最後のEnemy浄化と動的Spawn登録が同一frameなら、新規Enemyを含めて評価し、未解決ならClear候補を発生させない。
4. objective完了と最後のEnemy浄化が同一frameで、未解決対象がなければClear候補を一度だけ通知する。
5. 初期Enemyが0体でも、objective完了前またはBattle開始gate成立前にはClear候補を発生させない。
6. Enemyが遠くへ移動、非表示、または想定外消滅しても、自動的に正式除外しない。
7. Stageの正式除外によって最後の未解決対象がなくなり、objective完了済みならClear候補を一度だけ通知する。
8. Battle結果確定後の遅延Spawn、浄化、正式除外、objective完了をGameplayへ適用しない。
9. Retry後に旧BattleのSpawn、Enemy、Clear対象記録、通知済み状態を持ち越さない。
10. 同じ登録、状態移行、浄化、正式除外、objective完了、Clear候補、cleanup完了を重複成立させない。

## 関連タスク

<PageRelations />
