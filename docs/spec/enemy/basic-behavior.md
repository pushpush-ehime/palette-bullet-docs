---
title: 敵の基本仕様
description: 敵の共通ステータス、通常lifecycle、Stage登録、Gameplay有効化、浄化・正式除外後の停止およびcleanup境界
pageType: spec
category: 敵
order: 10
status: 仮仕様
---

# 敵の基本仕様

## ページ概要

- 対象担当：プログラム班・企画班
- 出典：統合仕様書v3.2 §4.9をベースに、現行のチャージシステム体系（ドローモード廃止後）に合わせて更新
- 関連ページ：[ゲーム全体](/spec/game/)、[戦闘](/spec/combat/)、[ステージ](/spec/stage/)、[敵](/spec/enemy/)、[Damage・浄化](/spec/enemy/damage-and-purify)、[Jaon Bullet](/spec/enemy/jaon-bullet)

## 目的

敵の共通ステータスと基本的な行動ルール（追跡・攻撃開始）に加え、初期配置または動的Spawnの確定からStageのClear対象登録、Enemy初期化、Gameplay有効化へ進む通常lifecycleの境界を定義します。

「邪音玉を避けながらシャオンダマを選択・Chargeし、AttackEventの発射で敵を浄化する」というコアループの敵側の土台を保証しつつ、未登録Enemy、旧BattleのEnemy、Battle結果確定後のEnemyがGameplayへ参加しないことを保証します。

## プレイヤーから見た挙動

- 敵は黒い姿でプレイヤーを追いかけてくる
- プレイヤーとの距離が一定以下になると、邪音玉を発射してくる
- パレットブレットを当てていくと敵は黒から白へ変化し、浄化される。Stage objectiveが完了し、登録済みのClear対象Enemyがすべて浄化済みまたは正式除外済みになると、Stageから対象`battleId`付きClear候補がGameへ通知される。Gameがその候補を受理して最終Battle結果を`Clear`として確定すると、Stage Clearになる

## 詳細仕様

- **種類**：プロトタイプでは敵は1種類のみ
- **共通ステータス**：敵はRGB3チャンネルの浄化値を持ち、全チャンネルが最大に達すると浄化される（倒される）。見た目は浄化値の割合に応じて黒から白へ変化する。浄化処理の詳細は[Damage・浄化](/spec/enemy/damage-and-purify)で定義する
- **追跡**：敵はプレイヤーを追跡して移動する
- **攻撃**：プレイヤーとの距離が攻撃開始距離以下になると、邪音玉を発射する。発射間隔・弾の挙動は[Jaon Bullet](/spec/enemy/jaon-bullet)で定義する
- **同時出現数**：未決（ステージ仕様側で定義する。v3.2の参考値は1〜3体）

### Battle所属とStage登録

Gameplayへ参加する各Enemyは、少なくとも次を識別できる状態にします。

- 所属`battleId`
- Enemy個体の識別情報
- Stage側のClear対象であるか
- Clear対象である場合に対応するStage側Clear対象記録
- Enemy側の現在の浄化状態

StageがClear対象Enemy記録とその状態を所有します。Enemy自身はClear対象集合の登録・削除・状態遷移・Clear条件を所有せず、自身をStage側で浄化済みまたは正式除外済みとして独自に確定しません。

Enemy Damage Ownerは、Enemy側の浄化成立を一度だけ確定します。Stageはその通知を受け取り、Stageが所有するClear対象記録を`Purified`へ変更します。EnemyおよびEnemy Damage Ownerは、Stage側記録の状態またはClear条件を独自に確定しません。

背景演出用Enemyなど、戦闘対象ではない存在はStageのClear対象へ登録せず、有効な戦闘EnemyとしてTarget、Hit、Damage、攻撃、またはClear条件へ参加させません。

### 初期配置・動的SpawnからActiveまで

初期配置Enemyと動的Spawn Enemyは、概念上、次の順序でStage登録とGameplay有効化を行います。

```text
Stageが初期配置または動的Spawnを確定
↓
battleId／Enemy識別情報を割り当て
↓
StageのClear対象へ登録
↓
Enemyを初期化
↓
Gameplay上Activeにする
↓
行動・Target・Hit・Damage受付を開始
```

初期配置と動的Spawnでは、この順序を進められる受付gateが異なります。

#### 初期配置Enemy

初期配置EnemyのClear対象登録およびGameplayを伴わない初期化は、`battleId`配布後のBattle準備中（`NonCombat`）に行います。この準備はCombat受付gateの成立を待ちません。

Battle準備中に、次の順序で処理します。

1. Stageが初期配置Enemyを確定する
2. 対象`battleId`とEnemy識別情報を割り当てる
3. StageのClear対象へ登録する
4. Enemy OwnerがGameplayを伴わない初期化を行い、登録済み記録とEnemy個体を対応付ける
5. 必要な初期Enemy／Spawn準備とClear対象登録がすべて完了した時点で、Enemy Readyを成立させる

Enemy Readyは、Enemyが1体以上存在することではなく、対象Battleに必要な初期Enemy／Spawn準備とClear対象登録が完了したことを表します。初期配置Enemyが0体である場合も、必要な準備と登録が完了していればEnemy Readyを成立させられます。

初期配置EnemyのGameplay上の`Active`化は、Battle開始gate成立後、現在BattleのCombat受付が有効な場合に限ります。すなわち、対象`battleId`が現在Battleと一致し、Battle結果が未確定で、Pause中ではなく、Battle終了処理が開始されていないことを確認します。Enemy Ownerはこの条件を確認し、各EnemyのGameplay上の`Active`化を一度だけ成立させます。Battle準備中の初期化だけを理由に、AI、移動、索敵、攻撃、Target提供、Hit／Damage受付、またはSpawn連携を開始してはいけません。

#### 動的Spawn Enemy

動的Spawnの確定、Clear対象登録、生成・初期化、および`PendingSpawn → Active`は、現在BattleのCombat受付が有効な間だけ進行します。Pause中は新しい動的Spawnを進行させず、Battle結果確定後またはBattle終了処理開始後は新しいSpawn、登録、Enemy有効化を成立させません。

動的Spawnは次の順序で処理します。

1. Stageが現在BattleのCombat受付条件を確認し、動的Spawnを確定する
2. 対象`battleId`とEnemy／Spawn識別情報を割り当てる
3. StageがClear対象記録を`PendingSpawn`として作成する
4. Enemy Spawn OwnerがEnemy world objectを生成・初期化し、登録済み記録と対応付ける
5. Enemy Spawn Ownerが対象`battleId`と識別情報を含む初期化完了をStageへ通知する
6. Stageが受付条件を再照合し、Clear対象記録を`PendingSpawn`から`Active`へ一度だけ変更する
7. Enemy OwnerがStage側記録の`Active`成立とCombat受付条件を確認し、対応EnemyをGameplay上`Active`にする
8. Enemy Ownerが行動、Target提供、Hit／Damage受付、および許可されたSpawn連携を開始する

Stage側記録の`Active`成立とEnemyのGameplay上の`Active`化は、仕様上1つの有効化境界として扱います。両方が成立するまで、対応EnemyはAI、攻撃、Target提供、Hit／Damage受付、Spawn連携、またはその他のGameplay処理を開始しません。

Stageを、Stage側Clear対象記録の`PendingSpawn → Active`遷移を成立させる唯一のOwnerとします。Enemy OwnerまたはEnemy Spawn Ownerは、Stage側記録を独自に`Active`へ変更しません。重複した初期化完了通知に対してStageは同じ遷移を再実行せず、Enemy Ownerも同じEnemyのGameplay上の`Active`化を複数回成立させません。

登録前のEnemyを、有効な戦闘Enemyとして動作させてはいけません。登録が完了する前に、次を開始しません。

- AIまたは移動
- Playerへの追跡・索敵
- 攻撃またはEnemy Spawn連携
- Player、Palette Bullet、Markerなどに対するTarget提供
- HitまたはDamage受付
- Clear条件への参加

### PendingSpawn

`PendingSpawn`は、Stageが動的Spawnを確定してClear対象登録を作成した後、Enemyの初期化とGameplay有効化が完了するまでのStage側記録状態です。

- `PendingSpawn`中のEnemyを、有効な戦闘Enemyとして扱いません。
- `PendingSpawn`中は、AI、移動、索敵、攻撃、Target提供、Hit／Damage受付、または新しいGameplay出力を開始しません。
- `PendingSpawn`の記録はClear条件上の未解決対象であり、world上の有効Enemyが0体でも暗黙に削除しません。
- Pause開始時に進行中のSpawnは`PendingSpawn`のまま保持し、Pause中に生成・初期化完了をGameplay有効化まで進めません。Resume後に受付条件を再照合します。
- Enemy初期化が完了しても、現在の`battleId`、Combat受付、Pause、Battle結果、およびBattle終了処理開始状態をStageが再照合するまでは`Active`へ移行しません。
- StageがSpawn cancelを確定した場合の記録解決は、Stageによる正式除外として処理します。Enemy自身またはEnemy Spawn Ownerは`PendingSpawn`記録を削除しません。

### 浄化成立後

RGB Damage処理の結果としてEnemyの浄化条件を満たした場合、Enemy Damage OwnerがEnemy側の浄化状態を一度だけ確定します。このEnemy側状態とStage側Clear対象記録は別の責務であり、Enemy Damage OwnerはStage側記録を直接変更しません。

Enemy Damage Ownerは、対象`battleId`とEnemyまたはClear対象記録の識別情報を含む浄化成立通知をStageへ一度だけ送ります。Stageは、現在Battleに属する登録済みの未解決記録だけを`Purified`へ変更します。

EnemyまたはEnemy Damage Ownerは、Stage側Clear対象記録の状態、Clear条件、Clear候補、または最終Battle結果を独自に評価・確定しません。

Enemy側の浄化成立後は、Stageによる通知受理を待たず、対応Enemyについて次をGameplay上停止します。

- AI、移動、追跡、および索敵
- 攻撃と攻撃中処理
- Target提供
- Hit／Damage受付
- Enemy Spawn連携
- その他の新しいGameplay出力

浄化済みEnemyについて、さらに次を守ります。

- 同じEnemyについて浄化成立通知を複数回送らない
- Stage側の`Purified`記録を未登録状態または未浄化状態へ戻さない
- 浄化済みEnemyを同じBattle中に再びGameplay上`Active`にしない
- Enemy world objectの表示終了または破棄と、Stage側の`Purified`記録の保持を分離する
- world objectが消滅しても、Stage側の`Purified`記録を同じBattle中の重複・遅延通知判別に使用できる状態で維持する

### Clear対象からの除外

Enemyが次の状態になっただけでは、StageのClear対象から除外しません。

- Playerから遠くへ移動した
- カメラ外へ出た
- 一時的に非表示になった
- AIまたはColliderが無効になった
- object poolingへ返却された
- Enemy world objectが想定外に消滅した

正式除外は、現在の`battleId`に属する登録済み記録に対するStageの明示処理だけで成立します。Enemy自身、Enemy Damage Owner、AI、Enemy Spawn Owner、表示object、またはobject pooling処理が、正式除外を独自に成立させてはいけません。

Stageが対応するClear対象記録を`FormallyExcluded`へ変更した時点で、対応EnemyをGameplay上無効化します。AI、移動、追跡、索敵、攻撃、Target提供、Spawn連携、および新しいGameplay出力を停止し、正式除外成立後に新しく発生したHit／Damage候補は受け付けません。

ただし、正式除外成立前に同一frameのDamage集約対象として有効に受け付けていたHit／Damage候補は、そのframeのsnapshotに従って処理を完了できます。その結果、同一frame内でEnemy側の浄化が成立することはありますが、Stage側のClear対象記録は`FormallyExcluded`を維持し、`Purified`へ変更しません。

正式除外されたEnemyは、同じBattle中に再びGameplay上`Active`へ移行させません。Enemy world objectを残す場合は表示専用とし、GameplayまたはClear条件へ影響させません。

Enemy world objectが想定外に消滅した場合、対応するClear対象記録は未解決のまま維持します。想定外消滅を浄化または正式除外として扱わず、次のいずれかによって明示的に解決します。

- 同じClear対象記録へ対応付けたEnemyの再Spawnまたは状態復旧
- 正常な浄化成立
- Stageによる正式除外

### battleId照合と遅延処理

Enemyの初期化、Spawn完了、Gameplay有効化、および各通知では、対象`battleId`を照合します。

次のいずれかに該当する遅延初期化、Spawn完了通知、予約済みcallbackは拒否し、現在または次のBattleへ適用しません。

- 通知またはEnemyの`battleId`が現在のBattleと一致しない
- 対応するStage側Clear対象記録が存在しない
- 対応する記録がすでに`Purified`または`FormallyExcluded`である
- 対象Battleの結果が確定済みである
- 対象BattleのBattle終了処理が開始済みである

旧`battleId`のEnemyへ新しい`battleId`を付け替えて現在Battleへ参加させません。重複した初期化完了またはSpawn完了通知から、Enemyの再登録、Stage側記録の二重状態遷移、Gameplay上の二重有効化、または別個体としての追加を成立させません。

### Battle結果確定後

Battle結果確定後は、対象BattleのEnemyについて次をGameplay上停止します。

- AI、移動、索敵
- 新しい攻撃と攻撃中処理
- Enemyからの新しいSpawn連携
- Target提供
- Hit／Damage受付
- 浄化成立とStageへのClear関連通知
- `PendingSpawn`から`Active`への移行

結果確定前に開始済みの攻撃、Hit、Damage、初期化、Spawn完了、およびcallbackが遅延しても、結果確定後のGameplayへ適用しません。

Enemy world objectまたは退場演出を画面上に残す場合は表示専用とし、AI、攻撃、Hit、Damage、Target提供、Spawn、Clear条件への影響を発生させません。

#### Enemy cleanup通知契約

Enemy Ownerは、Combat Systemから対象`battleId`を含むcleanup要求を受け取ります。要求の`battleId`を現在または終了処理中の対象Battleと照合し、同じ`battleId`に対する重複cleanup要求を冪等に処理します。重複要求によって停止処理を再成立させたり、cleanup完了通知を複数回送ったりしません。

Enemy Ownerは、対象`battleId`について次をすべて満たした時点でcleanup完了とします。

- 対象Battleに属する全EnemyのAI、攻撃、Hit／Damage受付、Target提供、およびSpawn連携がGameplay上停止している
- 対象Battleの`PendingSpawn`を含むEnemyをGameplay上`Active`へ移行できない
- 遅延初期化、Spawn完了、攻撃、Hit、Damage、およびcallbackが現在または次のBattleへ適用不能になっている
- 旧BattleのEnemy、識別情報、状態、および参照を現在または次のBattleへ参加させられない

cleanup条件をすべて満たした後、Enemy Ownerは少なくとも次を含むcleanup完了通知をCombat Systemへ一度だけ送ります。

- 対象`battleId`
- 通知元Owner：`Enemy`
- cleanup完了であること

対象Battleに初期配置Enemy、動的Spawn Enemy、または`PendingSpawn`が1件も存在しない場合も、Enemy Ownerは何も停止対象がないことを確認し、同じpayloadのcleanup完了通知をCombat Systemへ一度だけ送ります。

旧`battleId`のcleanup要求またはcleanup完了通知を現在Battleの完了として数えません。表示専用Enemy object、退場VFX、SEの終了は必須cleanup完了条件に含めません。

### Retry

Retryでは旧BattleのEnemyを新BattleのEnemyとして再利用せず、新Battle用に再構築します。

- 旧BattleのSpawn要求、予約済みcallback、`battleId`、Enemy／Spawn識別情報、Stage側Clear対象記録との対応、Stage登録状態、`PendingSpawn`を含むlifecycle状態、浄化状態、AI状態、攻撃状態、Target参照、Hit／Damage受付状態、およびSpawn連携を新Battleへ持ち越しません。
- 旧Battleのcleanup要求受理状態、cleanup進捗、およびcleanup完了通知済み状態を新Battleへ持ち越しません。
- 新しい`battleId`とEnemy識別情報を割り当て、初期配置EnemyはBattle準備中（`NonCombat`）にStageのClear対象へ新規登録してからGameplayを伴わない初期化を行います。
- 初期配置EnemyはBattle開始gate成立後、動的Spawn Enemyは現在BattleのCombat受付条件を満たす処理中にだけGameplay上`Active`にします。
- object poolingなどの内部方式を使用する場合でも、旧Battleの論理Enemy、識別情報、状態、および参照を再利用せず、新BattleのEnemyとして完全に再構築します。

## 状態別の挙動

- Stage登録前：有効な戦闘Enemyとして扱わず、Enemy初期化、行動、Target提供、Hit／Damage受付を開始しない
- Battle準備中（`NonCombat`）の初期配置Enemy：`battleId`配布後にClear対象登録とGameplayを伴わない初期化を行えるが、Battle開始gate成立までGameplay上`Active`にしない
- `PendingSpawn`：StageのClear対象としては未解決だが、Gameplay上の有効Enemyとして扱わない。Stageによる初期化完了の受付と`PendingSpawn → Active`条件の成立を待つ
- 戦闘状態（`Combat`）中・`Active`：現在の`battleId`とCombat受付条件が一致する間だけ、追跡・攻撃・Target提供・Hit／Damage受付を行う（戦闘状態の管理は[戦闘](/spec/combat/)を参照）
- 通常の非戦闘状態（`NonCombat`）中：拠点など通常の非戦闘空間におけるEnemyの存在・演出は未決。有効な戦闘Enemyとしては動作させない
- 浄化済み：Enemy側の浄化を一度だけ確定し、行動、Target提供、Hit／Damage受付、Spawn連携、および新しいGameplay出力を停止する。Stage側の対応記録はStageが`Purified`として維持する（浄化の条件・色変化の詳細は[Damage・浄化](/spec/enemy/damage-and-purify)で定義）
- `FormallyExcluded`：StageだけがClear対象記録へ成立させる。対応EnemyをGameplay上無効化し、同じBattle中に再び`Active`にしない
- Battle結果確定後：AI、攻撃、Spawn連携、Target提供、Hit／Damage受付を停止する。表示を残す場合は表示専用とする

## 他システムとの接続

- **Stage登録**：Stageが初期配置または動的Spawnを確定し、`battleId`／Enemy識別情報を割り当て、Clear対象へ登録する。Stage側Clear対象記録、その`PendingSpawn → Active`遷移、正式除外、およびClear条件評価は[ステージ](/spec/stage/)を正本とする
- **初期配置準備**：初期配置EnemyのClear対象登録とGameplayを伴わない初期化は、`battleId`配布後のBattle準備中（`NonCombat`）に行い、Combat受付gateの成立を待たない。必要な初期Enemy／Spawn準備とClear対象登録の完了をEnemy Readyへ接続する
- **Combat受付**：初期配置EnemyのGameplay上の`Active`化、AI、攻撃、Target提供、Hit／Damage受付、およびSpawn連携はBattle開始gate成立後だけ許可する。動的Spawnの確定、登録、生成・初期化、および`PendingSpawn → Active`は、現在BattleのCombat受付が有効な間だけ進行する。Pause中またはBattle結果確定後は進行しない（[戦闘](/spec/combat/)）
- **攻撃対象**：Gameplay上`Active`なEnemyだけがパレットブレットの攻撃対象であり、マーカーの付着対象になる（[Playerアクション｜マーカー](/spec/player/player-action-marker)）。発射後の飛翔・ターゲット決定・命中処理の詳細は各所有ページを正本とする
- **パリィ**：敵の攻撃（邪音玉）はプレイヤーのパリィで無効化される。無効化された邪音玉がその後どうなるかは未決（[Playerアクション｜パリィ](/spec/player/player-action-parry)）
- **プレイヤーへのダメージ**：邪音玉がプレイヤーに命中するとダメージを与える（被弾処理は[Player｜被弾](/spec/player/player-reaction-damaged)、HP・ダメージ量は[Playerステータス](/spec/player/player-status)）
- **シャオンダマ生成**：シャオンダマの散布先・浮遊範囲と敵位置の関係は未決（[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、[浮遊挙動](/spec/shaondama-music/floating-behavior)側の配置方法の決定に従う）
- **浄化通知**：Enemy Damage OwnerがEnemy側の浄化成立を一度だけ確定し、`battleId`と対象識別情報を含む通知をStageへ送る。StageがStage側記録を`Purified`へ変更する。EnemyおよびEnemy Damage OwnerはStage側記録またはClear条件を確定しない（[Damage・浄化](/spec/enemy/damage-and-purify)）
- **Clear候補**：Stage objectiveが`Completed`であり、登録済みClear対象Enemyがすべて`Purified`または`FormallyExcluded`の場合に、Stageが対象`battleId`付きClear候補をGameへ一度だけ通知する。Gameが候補を受理した後に最終Battle結果を確定し、EnemyまたはStageは最終Battle結果を確定しない（[ステージ](/spec/stage/)、[ゲーム全体](/spec/game/)）
- **cleanup**：Enemy OwnerはCombat Systemから対象`battleId`付きcleanup要求を受け、必須停止条件の成立後に`battleId`と通知元Owner=`Enemy`を含むcleanup完了通知をCombat Systemへ一度だけ返す。要求および通知は`battleId`単位で冪等に処理する（[戦闘](/spec/combat/)）

## 例外・禁止事項

- パラメータ類はハードコードせず、Inspectorで調整可能にする（`[SerializeField]` または ScriptableObject）
- 初期配置EnemyのClear対象登録およびGameplayを伴わない初期化を、Combat受付gateまたはEnemy Readyの成立待ちにしてはいけない
- 初期配置EnemyをBattle開始gate成立前にGameplay上`Active`にしてはいけない
- StageのClear対象登録前、または`PendingSpawn`中のEnemyをGameplay上`Active`にしてはいけない
- Stage以外がStage側Clear対象記録の`PendingSpawn → Active`遷移を成立させてはいけない
- 重複した初期化完了またはSpawn完了通知から、Stage側記録の二重状態遷移またはEnemyの二重有効化を成立させてはいけない
- 未登録Enemyまたは現在と異なる`battleId`のEnemyを、行動、Target、Hit、Damage、攻撃、Spawn、Clear条件へ参加させてはいけない
- Pause中に新しい動的Spawnを進行させてはいけない
- Enemyが遠くへ移動した、非表示になった、AIが停止した、またはworld objectが消滅したことだけを理由にClear対象から除外してはいけない
- Enemy自身、Enemy Damage Owner、またはEnemy Spawn Ownerが、Stage側の`Purified`記録または正式除外を独自に成立させてはいけない
- 浄化済みまたは`FormallyExcluded`のEnemyを、同じBattle中に再びGameplay上`Active`にしてはいけない
- 浄化済みのStage記録を未登録状態または未浄化状態へ戻してはいけない
- 旧`battleId`の遅延初期化、Spawn完了、攻撃、Hit、Damage、callbackを現在または次のBattleへ適用してはいけない
- Battle結果確定後にAI、攻撃、Spawn連携、Target提供、Hit／Damage受付、浄化、Clear関連通知を成立させてはいけない
- 重複cleanup要求を複数回の停止要求として扱ったり、cleanup完了通知を複数回送ったりしてはいけない
- 対象BattleのEnemyが0体であることを理由に、Combat Systemへのcleanup完了通知を省略してはいけない
- Retry時に旧BattleのSpawn要求、Enemy識別情報、状態、参照、Stage登録、callback、またはcleanup進捗を新Battleへ持ち越してはいけない

## パラメータ

| パラメータ | 値 | 状態 |
|---|---|---|
| 攻撃開始距離 | 未決 | 🔴 |
| 邪音玉の発射間隔 | 未決 | 🔴 |
| 移動速度 | 未決 | 🔴 |
| 敵の最大浄化値（RGB） | 未決 | 🔴 |
| 同時出現数 | 未決（v3.2の参考値は1〜3体） | 🔴 |

## 未決事項

- 攻撃開始距離・発射間隔・移動速度の数値
- 敵の最大浄化値の再設計（7色RGBダメージ表とセットで決める。[シャオンダマのデータ](/spec/shaondama-music/orb-data)のプランナー成果物と連動）
- 追跡AIの詳細（障害物回避の要否、プレイヤーを見失う条件の有無）
- 各Stageで使用するEnemyの出現方法・同時出現数（初期配置、途中Spawn、wave構成の具体的内容はステージ仕様と合わせて決める）
- 非戦闘状態での敵の存在・挙動（戦闘開始条件との関係）
- 邪音玉以外の攻撃（体当たり等）を持たせるか（パリィ仕様の未決事項と連動）

今回の修正では、追跡AI、索敵、攻撃開始距離、攻撃間隔、移動速度、StageごとのEnemy数・Spawn内容などの通常挙動や数値を新たに確定しません。

## 関連タスク

<PageRelations />
