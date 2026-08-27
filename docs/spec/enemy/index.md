---
title: 敵
description: EnemyのBattle所属、Clear対象登録、浄化状態、およびStageとの接続
pageType: spec
category: 敵
categoryOrder: 70
order: 0
status: 仮仕様
---

# 敵

## ページ概要

- 対象担当：Enemy／Program
- 関連ページ：[ゲーム全体](/spec/game/)、[戦闘](/spec/combat/)、[ステージ](/spec/stage/)、[Enemy基本挙動](/spec/enemy/basic-behavior)、[Damage・浄化](/spec/enemy/damage-and-purify)

## 目的

Enemy全体に共通するBattle所属、個体識別、Clear対象情報、浄化状態、およびStageとの責務境界を定義します。

本ページは、戦闘Enemyが対象BattleとStage側Clear対象記録へ正しく対応付けられ、Clear判定やBattle終了処理へ接続されるための共通契約の正本です。

Enemyの移動、索敵、個別攻撃、RGB Damage計算、浄化成立処理、および各Enemy固有の挙動は、それぞれの詳細ページを正本とします。本ページでは、今回決定していない通常挙動や数値を確定しません。

## プレイヤーから見た挙動

- StageがClear対象として登録した戦闘Enemyを浄化することで、BattleのClearへ近づきます。
- 背景演出用Enemyなど、戦闘へ参加しない存在はClear対象として数えません。
- Enemyが遠くへ移動した、画面外へ出た、非表示になった、またはAIが停止しただけでは浄化済みとして扱いません。
- Battle結果確定後にEnemyの表示や退場演出が残る場合でも、新しい攻撃やDamageなどのGameplay効果は発生しません。

## 詳細仕様

### 戦闘Enemyが識別する情報

各戦闘Enemyは、少なくとも次の情報を識別できなければなりません。実装上の型名、field名、保存場所、および識別子の採番方式は本ページでは固定しません。

| 情報 | 用途 |
|---|---|
| 所属`battleId` | どのBattleへ属するEnemyかを識別し、旧Battleの処理を現在Battleへ適用しないために使用する |
| Enemy個体識別情報 | Enemy個体、通知、およびStage側記録の対応先を識別する |
| Clear対象であるか | 対象EnemyがBattleのClear条件へ関与するかを識別する |
| 対応するStage側Clear対象記録 | Clear対象Enemyについて、Stageが所有する登録済み記録との対応を識別する |
| 現在の浄化状態 | 少なくとも未浄化と浄化済みを区別し、浄化成立の重複処理を防ぐ |

Clear対象でない戦闘Enemyまたは背景演出用Enemyは、Stage側Clear対象記録を持ちません。ただし、戦闘へ参加するEnemyはClear対象であるかにかかわらず、所属`battleId`とEnemy個体識別情報を持ちます。

### 責務の分離

| Owner | 所有する情報・処理 |
|---|---|
| Enemy | 所属`battleId`、Enemy個体識別情報、Clear対象であるか、Stage側記録との対応、および現在の浄化状態 |
| Stage | Stage objective、Clear対象Enemy記録、登録、浄化反映、正式除外、Clear条件評価、および対象`battleId`付きClear候補通知 |
| Enemy Damage | RGB Damageの適用、浄化成立、およびStageへ渡す浄化成立通知 |
| Combat | Enemyの攻撃、Hit、Damage、Spawnなどに対するBattle中の受付gateと、Battle終了時のEnemy／Stage cleanup集約 |
| Game | StageからのClear候補とGame Over候補を収集し、最終Battle結果を一度だけ確定する |

Enemy自身はClear対象Enemy集合を所有しません。Enemyがworld上に存在する個体を数えたり、他Enemyの浄化状態を集計したりして、Clear条件を評価してはいけません。

Enemy自身は最終ClearまたはBattle結果を確定しません。Enemy Damage Ownerは個体の浄化成立をStageへ通知し、StageがClear対象記録を更新します。StageがClear条件を満たした場合だけGameへClear候補を通知し、最終Battle結果はGameが確定します。

### 初期配置Enemyの登録

対象Battleの初期配置Enemyは、次の順序で準備します。

```text
新しいbattleIdを受領
↓
Stageが対象BattleのClear対象記録を初期化
↓
初期配置のClear対象EnemyをStage側記録へ登録
↓
登録済み記録とEnemy個体を対応付ける
↓
Enemy個体を初期化
↓
初期Enemy／Spawn準備完了
↓
Enemy Ready
```

- 初期配置のClear対象Enemyは、Enemy Ready成立前にすべてStageへ登録済みでなければなりません。
- Enemy Readyは、Enemyが1体以上存在することではなく、対象Battleの初期Enemy／Spawn準備とClear対象登録が完了したことを表します。
- Clear対象へ登録されていない初期Enemyを、先に有効な戦闘Enemyとして行動させてはいけません。
- 背景演出用Enemyなど、戦闘対象でない存在はClear対象へ登録せず、Enemy ReadyのClear対象登録数にも含めません。

### 動的Spawn Enemyの登録

動的SpawnするClear対象Enemyは、Gameplay上で有効になる前にStage側Clear対象記録へ登録します。

```text
Stageが動的Spawnを確定
↓
battleIdとEnemy／Spawn識別情報を割り当てる
↓
StageがClear対象へPendingSpawnとして登録
↓
Enemy world objectを生成・初期化
↓
登録済み記録とEnemy個体を対応付ける
↓
Stage側記録をActiveへ移行
↓
EnemyのGameplay有効化
```

Gameplay有効化には、少なくとも次の開始を含みます。

- AIおよび行動
- PlayerまたはPalette BulletのTarget候補
- Hit／Damage受付
- 攻撃
- Enemy由来のSpawn連携

`PendingSpawn`として登録されたClear対象記録は、登録時点から未解決のClear対象として扱います。Enemy個体がGameplay上でActiveになる前であっても、当該記録が残っている間はClear条件を満たしません。

Enemy個体のAI、Target提供、Hit／Damage受付、攻撃などのGameplay参加は、Stage側記録を`Active`へ移行した後に開始します。

動的Spawn EnemyがClear対象でない場合も、Gameplay有効化前に所属`battleId`とEnemy個体識別情報を確定します。Clear対象でないEnemyについて、Stage側Clear対象記録を作成してはいけません。

### 浄化とClear対象の解決

Clear対象EnemyのStage側記録は、次のいずれかによって解決します。

- Enemyの浄化成立を受け、Stageが記録を`Purified`へ変更する
- Stageが明示的な理由とともに正式除外を成立させ、記録を`FormallyExcluded`へ変更する

浄化成立通知には、少なくとも所属`battleId`とEnemy個体識別情報またはClear対象記録の識別情報を含めます。同じEnemyの浄化成立は一度だけ確定し、同じ通知を重複してClear進行へ適用しません。

Enemy Damage Ownerは、浄化成立通知をStageへ渡します。EnemyからGameへClear候補や最終Clearを直接通知してはいけません。

正式除外はStageだけが成立させます。Enemyが自分自身をClear対象外へ変更したり、world objectの状態だけから正式除外を推測したりしてはいけません。

次の状態変化だけでは、Clear対象Enemyを解決済みとして扱いません。

- Playerから遠くへ移動した
- カメラ外へ出た
- 一時的に非表示になった
- AIまたはColliderが停止した
- object poolingへ返却された
- world objectが想定外に消滅した

想定外にworld objectが消滅した場合も、Stage側Clear対象記録は未解決のまま維持します。再Spawn、状態復旧、またはStageによる正式除外のいずれかが成立するまで、暗黙に`Purified`または`FormallyExcluded`へ変更しません。

### `battleId`の照合

- Enemyの初期化、Spawn完了、Hit、Damage、浄化、およびStage通知では、所属`battleId`を現在のBattleと照合します。
- 現在と異なる`battleId`のEnemyを、現在Battleの戦闘参加者、Target候補、Damage対象、またはClear対象として扱いません。
- 旧Battleの遅延初期化、Spawn完了、Hit、Damage、浄化、およびClear関連通知を現在Battleへ適用しません。
- 旧BattleのEnemyへ新しい`battleId`を付け替え、現在BattleのEnemyとしてそのまま再利用してはいけません。

### Battle結果確定後

Battle結果確定後は、対象Battleに属するEnemyから次のGameplay処理を新しく成立させません。

- 新しいAI行動および攻撃
- 新しいHit／Damageの発生または受付
- 新しいEnemy Spawn要求、Spawn完了、およびEnemy有効化
- 新しい浄化成立
- 新しいClear関連通知
- Target候補の提供

Battle結果確定後もEnemy objectや退場演出の表示を残す場合は、表示専用として扱います。表示専用EnemyからAI、攻撃、Hit、Damage、Target提供、Spawn、浄化、またはClear関連通知を発生させてはいけません。

Enemy／Enemy Spawnのcleanup完了条件と上位Ownerへの完了通知は[戦闘](/spec/combat/)および[Enemy基本挙動](/spec/enemy/basic-behavior)を正本とします。

## 状態別の挙動

以下は実装上のenum名を固定するものではなく、EnemyとStage側記録の関係を示す概念上の段階です。

| 段階 | Enemy側 | Stage側Clear対象記録 | Gameplay上の扱い |
|---|---|---|---|
| 初期準備中 | `battleId`と個体識別情報を設定し、Stage側記録との対応を準備する | 初期配置のClear対象を登録する | Enemy Ready前。未登録のClear対象Enemyを有効化しない |
| `PendingSpawn` | 動的Spawn用Enemyを生成・初期化する | `PendingSpawn`として登録済み | 有効な戦闘Enemyとして扱わない |
| Active／未浄化 | 現在Battleへ属し、未浄化状態である | `Active`かつ未解決 | 受付gateが有効な間だけ行動・Target・Hit・Damageを受け付ける |
| 浄化済み | 浄化成立済みであり、同じ浄化を再成立させない | `Purified` | Clear対象として解決済み。記録は終了Battle中保持する |
| 正式除外 | 浄化状態とは独立し、Stageの指示結果を受け取る | `FormallyExcluded` | Clear対象として解決済み。以後のGameplay上の扱いはStage定義に従う |
| Battle結果確定後 | 対象BattleのGameplay効果を停止する | 終了Battleの記録として保持する | 表示を残す場合も表示専用とする |

Enemyの浄化状態とStage側Clear対象記録の状態は同一の所有物ではありません。Enemy Damage OwnerがEnemyの浄化成立をStageへ通知し、Stageが対応する記録を`Purified`へ変更します。

## 他システムとの接続

| システム | Enemyとの接続 |
|---|---|
| Game | 最終Battle結果と終了対象`battleId`を通知する。Enemy個体からClearを直接受け取らない |
| Stage | Enemyの所属、Clear対象記録、初期登録、動的Spawn登録、正式除外、およびClear条件評価を管理する |
| Combat | Battle中の攻撃、Hit、Damage、Target、Spawn受付gateと、Battle終了時のEnemy関連cleanupを管理する |
| Enemy Damage | RGB Damageを処理し、浄化成立時に対象Enemyと`battleId`を識別できる通知をStageへ渡す |
| Player／Palette Bullet | Combatの受付gateが有効なActive EnemyだけをTarget／Hit／Damage対象として扱う |
| UI／演出 | Enemy状態を表示するが、Clear対象集合や最終Battle結果を再判定しない |

## 例外・禁止事項

- 背景演出用Enemyなど、戦闘対象でない存在をClear対象へ登録してはいけません。
- 初期配置のClear対象EnemyをStageへ登録する前にEnemy Readyを成立させてはいけません。
- 動的SpawnするClear対象EnemyをStageへ登録する前にGameplay上で有効化してはいけません。
- Enemy自身へClear対象Enemy集合を所有させたり、他Enemyの状態を集計させたりしてはいけません。
- Enemy自身がClear候補、最終Clear、またはBattle結果を確定してはいけません。
- 移動、非表示、AI停止、Collider停止、pool返却、またはobject消滅だけを根拠にClear対象から外してはいけません。
- Enemy自身の判断で`FormallyExcluded`を成立させてはいけません。
- 現在と異なる`battleId`のEnemyまたは遅延通知を現在Battleへ適用してはいけません。
- 旧BattleのEnemyへ新しい`battleId`を付け替えて、そのまま現在Battleへ参加させてはいけません。
- Battle結果確定後に、新しい攻撃、Hit、Damage、Spawn、Enemy有効化、浄化、Target提供、またはClear関連通知を成立させてはいけません。
- 表示専用として残したEnemyからGameplay効果を発生させてはいけません。

## パラメータ

本ページではEnemy数、移動速度、索敵距離、攻撃間隔、Damage値、浄化値、Spawn間隔などの数値を固定しません。これらは各Enemy、Stage、Combat、およびTuning側の仕様で定義します。

## 未決事項

以下は未決または各詳細ページで定義します。

- Enemyの種類と個別能力
- 移動、索敵、攻撃の具体的挙動
- Enemy個体識別情報およびClear対象記録参照の実装形式
- Enemyの生成、破棄、object poolingの内部実装方式
- 浄化後および正式除外後の退場・表示演出
- Battle終了後に表示専用Enemyを残す場合の視覚的な終了時点

これらの決定によって、本ページの`battleId`照合、登録順、Clear対象の所有権、正式除外、およびBattle結果確定後のGameplay無効化規則を変更しません。

## 関連タスク

<PageRelations />
