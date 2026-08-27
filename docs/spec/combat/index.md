---
title: 戦闘
description: Palette BulletのCombat lifecycle・Battle開始gate・Battle終了cleanup集約・戦闘処理受付
pageType: spec
category: 戦闘
categoryOrder: 60
order: 0
status: 仮仕様
---

# 戦闘

## ページ概要

- 対象担当：Combat担当
- 関連ページ：[ゲーム全体](/spec/game/)、[ステージ](/spec/stage/)、[Player](/spec/player/)、[BGM](/spec/bgm/)

## 目的

Combat Systemが管理するCombat lifecycleと、Battle中の戦闘処理の実行境界を定義します。

本ページは、`NonCombat`／`Combat`の定義と遷移、Battle識別情報、Battle ID配布・Combat受付開始・Battle終了の通知境界、Combat中の処理受付可否、Battle結果確定後の終了gate、必須Ownerへのcleanup通知と完了集約、Result操作解禁可能通知、Pause中のCombat state、およびRetry時に破棄するCombat所有runtimeの正本です。

Clear／Game Overの条件、同時成立時の優先順位、およびゲーム全体におけるBattle開始・終了の高レベルな順序は、[ゲーム全体](/spec/game/)を正本とします。個別の攻撃、Damage、演出などの内部仕様は、それぞれの仕様ページで定義します。

Combat Systemは、Enemy ReadyとShaondama Supply ReadyをBattle開始gateの入力として受け取ります。BGM Audioの開始、3時計の同期方法、初期Shaondamaの生成、および選択可能な非Reserved Shaondamaの最低保証判定は、それぞれの所有ページを正本とします。

## Combat stateの管理

Combat Systemは、以下の2つのCombat stateを管理します。

| Combat state | 定義 | 戦闘処理の受付 |
|---|---|---|
| `NonCombat` | Combatの進行が停止し、Battle中の戦闘処理を受け付けない状態。Battle ID配布後の準備中を含む | 受け付けない |
| `Combat` | Battle開始gateが成立し、Battle終了処理が完了するまでCombat lifecycleが有効な状態。system pre-roll中を含む | Battle結果未確定かつPause中でない場合に受け付ける |

Combat stateは、Playerの`RootState`、`MovementState`、`ActionState`、`AimState`、`ReactionState`とは独立して管理します。Player Stateが変化しても、それだけを理由にCombat stateを切り替えません。

Pause専用の第3のCombat stateは設けません。Pause中の扱いは、[Pause](#pause)で定義します。

## Battle識別情報

Combat Systemは、開始するBattleごとに、過去および後続のBattleと区別できるBattle識別情報を割り当てます。

- Battle識別情報は、対象Battleの初期化、初期Shaondama生成、および`Battle／Gameplay／MusicChart`の3時計を開始する前に割り当てます。
- 割り当てた`battleId`は、BGM／MusicChart、Spawn、Enemy、Player、Stage、ラジクジラ、および対象Battleへ参加する各システムへ事前に配布します。
- Battle IDを配布した時点では、Combat stateを`NonCombat`に維持し、Combat受付とPlayerの戦闘操作受付を開始しません。
- Battle開始gateが成立した時点で、Combat stateを`NonCombat`から`Combat`へ遷移させ、Combat受付とPlayerの戦闘操作受付を開始します。
- Battle ID配布に使用する通知、Battle終了通知、cleanup要求、およびcleanup完了通知には、対象Battleの識別情報を含めます。
- Battleに属する戦闘処理、通知、およびRuntime objectは、どのBattleに属するかを判別できる状態にします。
- 現在のBattleと一致しない識別情報を持つ処理要求や遅延結果を、現在のBattleへ適用してはいけません。
- Retry後に開始するBattleには、Retry前のBattleと区別できる識別情報を割り当てます。
- 識別情報のデータ型、採番方式、保存形式は実装側で決定します。

Battle ID配布に使用するpayloadは、最低限`battleId`を含みます。受信側は、受け取った`battleId`が自身の準備対象と一致する場合だけ、対象Battleの準備処理を進めます。

仕様上は、次の3つの境界を区別します。

| 境界 | 意味 |
|---|---|
| Battle ID配布 | 対象Battleの準備開始。Combat stateは`NonCombat`、Combat受付とPlayer戦闘入力は無効、3時計は停止 |
| Battle開始gate成立 | `NonCombat → Combat`、Combat受付とPlayer戦闘入力の有効化、および3時計の同時開始 |
| system pre-roll終了 | BGM Audioを音源位置0から再生開始 |

これらの境界を内部的に何種類のeventまたは通知へ分けるかは実装判断とします。ただし、Battle ID配布をCombat受付開始またはBGM Audio再生開始と同じ意味で扱ってはいけません。

| 主な受信先 | Battle IDを使用する目的 |
|---|---|
| BGM／MusicChart・AttackEvent | 音楽時計、NoteEvent occurrence、生成要求、AttackEventを対象Battleへ帰属させる |
| Spawn・ラジクジラ・シャオンダマ | 生成要求と生成された個体を対象Battleへ帰属させる |
| Enemy・Player・Stage | Battle参加状態、Damage／死亡、Clear対象集合と結果候補を対象Battleへ帰属させる |
| Combat・Palette Bullet・Marker | Combat受付、発射物、target情報、命中処理を対象Battleへ帰属させる |

## Battle開始lifecycle

Battle開始時は、[ゲーム全体](/spec/game/)で定義された準備順に従い、以下の順序でCombatを開始します。

1. Battle開始要求を受ける
2. 新しいBattle識別情報を割り当てる
3. `battleId`を必要な各システムへ配布する
4. Combat stateを`NonCombat`に維持し、`Battle／Gameplay／MusicChart`の3時計を停止したまま、対象Battleを初期化する
5. MusicChartの初期位置を基準に、時計を進めずに初期Shaondama生成を評価する
6. 必要なNormal Shaondamaと、最低保証不足分のWildcard Shaondamaの生成要求を発行する
7. RadioWhaleの出現演出完了後、生成されたShaondamaをGameplayへhand-offし、Playerの選択対象として公開する
8. 対象RoomのEnemy Readyを確認する
9. 選択可能かつ非ReservedのShaondamaが最低保証数へ到達したことを、Shaondama Supply Readyとして確認する
10. 必要なすべてのReady条件が成立した時点を、Battle開始gate成立とする
11. 同じ開始基準点で、Combat stateを`NonCombat`から`Combat`へ遷移させ、Combat受付とPlayerの戦闘操作受付を有効化し、3時計を同時に開始する
12. system pre-rollへ入る
13. system pre-roll中からAttackEvent PreviewとChargeを受け付ける。この間、BGM Audioは音源位置0で停止したままにする
14. system pre-roll終了時に、BGM Audioを音源位置0から再生する
15. 以降、BGM AudioとMusicChart eventを同じ音楽時間関係で進行する

Battle開始gateには、少なくとも以下のすべてを必要とします。

- 対象BattleのBattle IDが発行・配布済みである
- 対象Battleの初期化が完了している
- 対象RoomのEnemy Readyが成立している
- 必要な初期Shaondamaの出現演出が完了している
- 初期ShaondamaがGameplayへhand-offされ、Playerの選択対象として公開されている
- 選択可能かつ非ReservedのShaondama数が最低保証数へ到達し、Shaondama Supply Readyが成立している
- 前Battleの確定結果、通知済み状態、および保留中のCombat runtimeが現在Battleへ残っていない

論理生成済み、生成要求中、出現演出中、またはGameplayへのhand-off前のShaondamaは、Shaondama Supply Readyの最低保証数へ算入しません。Shaondama Supply Readyの通知後から3時計の開始前までに最低保証数を下回った場合は、準備完了状態を解除し、Battle開始gateを成立させずに再びReadyを待ちます。

| phase | Combat state／受付 | Player戦闘入力 | 3時計 | BGM Audio | Preview／Charge |
|---|---|---|---|---|---|
| Battle準備中 | `NonCombat`／無効 | 無効 | 停止 | 停止・音源位置0で待機 | 無効 |
| Battle開始gate成立時 | `NonCombat → Combat`／有効化 | 有効化 | 同じ基準点から同時開始 | 停止・音源位置0で待機 | 開始可能 |
| system pre-roll中 | `Combat`／有効 | 有効 | 進行 | 停止・音源位置0で待機 | 有効 |
| system pre-roll終了後 | `Combat`／有効 | 有効 | 進行 | 音源位置0から再生し、以後進行 | 有効 |
| Pause中 | `Combat`を維持／受付停止 | 受付停止 | 同時停止 | 未再生なら音源位置0、再生済みなら現在位置で停止 | 進行しない |

system pre-rollは、音源、完成曲、またはMIDIへ挿入した無音ではなく、Battleの音楽runtimeが管理するシステム上の時間区間です。3時計の同期開始、system pre-roll、およびBGM Audio開始の詳細は、[BGM｜Gameplayとの接続](/spec/bgm/bgm-gameplay-connection)を正本とします。

- Combat Systemは、BGM Audioを自律的に開始しません。
- Combat Systemは、選択可能Shaondama数を集計したり、最低保証数を再計算したりしません。Shaondama Supply Readyの判定は、[BGM｜シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)を正本とします。
- Battle IDの配布前、またはBattle IDが一致しない状態で、対象Battleの初期化や初期生成を開始しません。
- 準備未完了、またはすでに`Combat`である場合は、新しいBattleを開始しません。
- 同じBattleに対するBattle ID配布またはCombat受付開始を複数回成立させません。

Enemy Readyは「Enemyが1体以上存在する」という意味ではありません。対象Battleの初期Enemy／Spawn準備と、初期配置のClear対象Enemy登録がStage側で完了したことを表します。初期Enemyが0体の場合でも、これらの準備が完了していればEnemy Readyは成立できますが、それだけを理由にClear候補を発生させません。

## Combat中の処理受付

Combat Systemは、以下のすべてを満たす場合にのみ、新しい戦闘進行または遅延結果を受け付けます。

- Combat stateが`Combat`である
- 現在のBattle識別情報と処理対象のBattle識別情報が一致する
- Battle結果が未確定である
- Pause中ではない
- Battle終了処理を開始していない

Battle開始gate成立後のsystem pre-roll中も、上記条件を満たす現在Battleの新規処理と遅延結果を受け付けます。BGM Audioがまだ再生されていないことを理由に、Combat受付またはPlayerの戦闘操作受付を閉じてはいけません。

受付対象は、次の2種類に分けます。

- **新規処理:** 新しい戦闘操作、Charge、シャオンダマ生成要求、Enemy Spawn、AttackEvent／Arpeggio開始、Allocation、Target決定、Palette Bullet／Marker／Enemy Projectileの生成、Hit／Damage／Parry判定を含む攻撃開始
- **遅延結果:** すでに開始済みの処理から遅れて届く生成完了、衝突、Hit、Damage、浄化、Parry、Target、結果候補、予約済みcallback

| 受付種別 | 結果未確定・非Pause・終了前 | Pause中 | 結果確定後／終了処理中 | Battle ID不一致 |
|---|---|---|---|---|
| 新規処理 | 受け付ける | 受け付けない。所有システムも発生を停止する | 受け付けない | 受け付けない |
| 遅延結果 | `battleId`を照合して受け付ける | 適用しない。保持が必要な場合は所有者が保留し、Resume後に全受付条件を再照合する | Gameplayへ適用せず、新しいHit・Damage・浄化・Parry判定・Target確定・結果候補を発生させない | 破棄し、現在のBattleへ適用しない |
| 終了演出通知 | Gameplay処理とは分離して扱う | 各演出のPause規則に従う | 表示・音響だけ継続可能。Damage等へ変換しない | 現在のBattleのGameplayへ適用しない |

- Enemy Spawnは、Combat Systemが明示的に受付可否を管理するGameplay処理です。Spawn要求の発行、StageによるSpawn確定、`PendingSpawn`登録、Enemyの生成・初期化、登録済み記録との対応付け、およびEnemyのGameplay有効化は、現在の`battleId`と一致し、Battle結果が未確定で、Pause中ではなく、Battle終了処理開始前である場合だけ進行できます。
- Pause中は、新しいEnemy Spawnの要求、確定、登録、生成・初期化、およびGameplay有効化を進行させません。Pause中に到着したSpawn完了通知を保留する場合は、Resume後に`battleId`、Battle結果、Combat受付、およびBattle終了処理開始状態を再照合してから適用します。
- Battle結果確定後は、新しいEnemy Spawn、Clear対象登録、`PendingSpawn`から`Active`への移行、およびEnemyのGameplay有効化を成立させません。
- Spawn完了通知、初期化完了通知、または予約済みcallbackが遅延して届いた場合、現在と異なる`battleId`であるか、対象Battleの結果が確定済みであれば拒否します。旧BattleのEnemyを現在または次のBattleへ登録・有効化しません。
- Clear候補はStageが確定します。Combat SystemはStageから受け取った対象`battleId`付きClear候補を変更せず、ゲーム全体の結果候補収集へ渡します。Stage内部のobjective、wave進行、pending Spawn数、Clear対象Enemy記録、またはworld上のEnemy数からClear条件を再判定しません。
- Game Over候補はPlayer側から、ゲーム全体の結果確定処理へ渡します。
- Clear／Game Overの条件、Unity上の同一フレームを単位とする候補収集、同一フレームでのClear優先、および最終結果の一回確定は、[ゲーム全体](/spec/game/)を参照します。
- Combat Systemは、独自のClear／Game Over条件や優先順位を追加せず、確定結果を再判定しません。
- Battle結果確定後は、飛行中または処理途中のobjectが残っていても、新しいHit、Damage、Parry判定、Target決定、Projectile／Marker生成、Enemy Spawnを成立させません。
- Charge、Allocation、Reserved、AttackEvent、Palette Bullet、Marker、Damage、および浄化の内部成立条件は、各所有ページを正本とします。
- Chargeは明示的なCombat受付対象です。Charge開始条件は、現在BattleのCombat受付とPlayer戦闘操作受付が有効であること、およびCharge固有条件によって判定し、BGM Audioの再生状態には依存させません。このため、system pre-roll中もChargeを開始できます。
- system pre-roll中のAttackEvent Previewは有効です。Previewの生成時刻と表示への受け渡しはBGM／MusicChart側を正本とし、Combat SystemはBGM Audioが無音であることを理由に無効化しません。
- Combat Systemは、処理受付の一環としてBGM Audioを開始したり、Shaondamaの最低保証を再計算したりしません。

## Pause

Pause可能なゲーム段階は、[ゲーム全体](/spec/game/)を正本とします。Pauseは、通常操作が可能な拠点滞在中および通常Battle中に限って開始できます。

通常Battle中にPauseした場合は、以下のように扱います。

- Combat stateは`Combat`のまま維持します。
- Battle識別情報を維持します。
- Battle ID配布、Combat受付開始、およびBattle終了の通知を発行しません。
- 戦闘進行とBattle結果の確定処理を進めません。
- Stage／Enemy Spawnは、新しいwave、Spawn要求、Spawn確定、Clear対象登録、Enemy生成・初期化、およびGameplay有効化を進行させません。
- Resume時は再初期化を行わず、同じBattle識別情報とCombat stateでBattleを継続します。

拠点滞在中のPauseでは、Combat stateを`NonCombat`のまま維持し、Battle ID配布、Combat受付開始、またはBattle終了の通知を発行しません。

BGM、AttackEvent、および未完了ArpeggioのPause／Resume時の停止・再開は、[BGM｜Gameplayとの接続](/spec/bgm/bgm-gameplay-connection)を正本とします。Pause画面と入力の詳細はUI側の仕様で定義します。

## Battle終了lifecycle

[ゲーム全体](/spec/game/)の規則によりBattle結果が1つに確定した場合、Combat Systemは以下の順序でBattleを終了します。

1. Gameから、確定したBattle結果と対象`battleId`を含むBattle終了通知を受け取る
2. 通知の`battleId`が現在Battleと一致し、同じBattleの終了通知をまだ受理していないことを確認する
3. 対象Battleの確定結果を一度だけ受理し、Battle終了処理開始済みとして記録する
4. 新規Gameplay処理の受付と、Hit／Damage／浄化／Parry／Target／Enemy Spawn完了を含む遅延結果のGameplay適用を即座に閉じ、新しいSpawn、Clear対象登録、およびEnemy有効化を成立させない
5. Game／UIによるResult表示開始を妨げない。ただし、この時点ではResult操作解禁可能を通知しない
6. 対象`battleId`と確定結果を含むcleanup要求を、`Stage／Enemy Spawn`を1つの論理Ownerとして含む対象Battleの各必須Ownerへ一度だけ通知する
7. 各Ownerが未発火処理をcancelし、既存objectをGameplay上無効化し、必要な参照・予約・callbackを解消する
8. 現在Battleと一致する各必須Ownerのcleanup完了通知を、`battleId`と通知元Ownerの組み合わせごとに一度だけ集約する
9. Stage／Enemy Spawn Ownerを含む各必須Ownerすべてのcleanup完了後、Combat stateを`Combat`から`NonCombat`へ遷移させ、GameへCombat cleanup完了を一度だけ通知する
10. Game／UIは、この完了通知をResult操作解禁条件へ接続する。実際の`Continue`／`Retry`入力とroute遷移はCombat Systemでは処理しない

| 段階 | Combat System | Result画面 |
|---|---|---|
| Battle結果確定直後 | Gameplay受付を即時停止する | 確定結果による表示を開始可能。操作はlock |
| 必須cleanup中 | Ownerへ通知し、完了を集約する | 表示を継続可能。操作はlock |
| 必須cleanup完了 | `NonCombat`へ遷移し、Gameへ完了を通知する | 操作解禁可能 |
| Result入力後 | 旧BattleのGameplayを再開しない | Clearは`Continue`、Game Overは`Retry`へ進む |

- Battle終了処理は、同じBattleに対して1回だけ実行します。
- Gameから同じBattle終了通知を複数回受け取っても、2回目以降は受理せず、cleanup要求や完了通知を重複発行しません。
- Battle終了処理中に別の結果候補を受け取っても、確定済み結果を変更せず、終了処理を再実行しません。
- 結果確定後に到着した遅延命中、Damage、浄化、および演出上の結果はGameplayへ適用せず、確定済みのBattle結果を変更できません。
- Playerの`RootState = Dead`が成立済みであっても、Gameから受け取った最終結果がClearであれば、Combat SystemはGame Over向け処理へ分岐しません。HP、`RootState`、確定済みDamageをCombat Systemが巻き戻すこともしません。
- BGM、MusicChart、およびBGM同期イベントの具体的な停止方法は、[BGM｜Gameplayとの接続](/spec/bgm/bgm-gameplay-connection)を正本とします。

### 必須cleanupの集約

Combat Systemは、対象Battleについて少なくとも以下のOwnerを必須cleanupの集約対象とします。各Owner固有のcancel、release、無効化、および破棄方法は各正本ページで定義し、本ページでは完了条件の境界だけを定義します。

| 必須Owner | Ownerがcleanup完了通知を発行できる最低条件 | 正本・詳細ページ |
|---|---|---|
| Combat内部受付・遅延処理 | 新規受付が閉じ、保留中のHit／Damage／Target／結果通知が現在Battleへ適用不能になっている | 本ページ |
| Player | Gameplay入力、Action／Aim／Reaction、および保留入力が停止し、結果確定後に入力やGameplay処理を起点とする新しいAction Stateへ遷移しない | [Player State](/spec/player/states)、[入力・操作](/spec/player/input-and-controls) |
| BGM／MusicChart | `Battle／Gameplay／MusicChart`の3時計が停止し、発行待ちMusicChart Eventと予約済みcallbackが無効化されている | [BGM｜Gameplayとの接続](/spec/bgm/bgm-gameplay-connection) |
| AttackEvent | 未発火AttackEventと未発射Arpeggio Entryがcancelされ、Target snapshotと旧Battle callbackが無効化され、消費済み／未消費Reservedを区別して未消費分だけを一度限りの解放経路へ渡している | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Charge Allocation | 未確定Chargeが破棄され、Allocation／Slot／Reserved関係が解消され、未消費Reservedの解放が二重実行されない状態になっている | [Charge Allocation](/spec/draw-system/charge-allocation) |
| Palette Bullet | 飛行中objectの直接接触Damage、範囲Damage、爆発判定、および衝突処理がGameplay上無効化されている | [Palette Bullet](/spec/combat/palette-bullet) |
| Marker | 飛行中／付着済みにかかわらずTarget公開を停止し、現在BattleのTarget候補として利用不能になっている | [Marker](/spec/combat/marker) |
| Jaon Bullet／Enemy Projectile | 飛行中objectのDamage、衝突、およびParry対象としての機能がGameplay上無効化されている | [Jaon Bullet](/spec/enemy/jaon-bullet) |
| 浮遊中Shaondama | Charge、Allocation、Palette Bullet化、およびDamage発生元として利用不能になり、次のBattleへ参照を持ち越さない状態になっている | [浮遊中の挙動](/spec/shaondama-music/floating-behavior) |
| Stage／Enemy Spawn | Spawn programと新しいwave開始が停止し、未実行のSpawn要求・予約・生成／初期化callback・遅延Spawn完了通知がcancel済みまたはGameplayへ適用不能になっている。`PendingSpawn`からのEnemy有効化、新規Clear対象登録、Clear条件評価、およびClear候補通知が停止し、旧`battleId`の通知やcallbackを現在または次のBattleへ適用できない | [ステージ](/spec/stage/) |
| Enemy | 対象BattleのAI、攻撃、Hit／Damage受付、Target提供、およびSpawn連携がGameplay上停止し、旧BattleのEnemyを現在または次のBattleへ参加させられない | [敵](/spec/enemy/)、[Enemy基本挙動](/spec/enemy/basic-behavior) |

- cleanup要求とcleanup完了通知には、最低限`battleId`と通知元Ownerを識別できる情報を含めます。
- 現在Battleと異なる`battleId`のcleanup完了通知は破棄し、現在Battleの完了数へ算入しません。
- 同じOwnerから同じBattleのcleanup完了通知が複数回届いても、完了は1回だけとして扱います。
- cleanup完了状態は、`battleId`と通知元Ownerの組み合わせで管理します。同じOwnerの重複完了通知を、別Ownerの完了として数えてはいけません。Stageの完了通知でEnemy Spawnを完了扱いにしたり、Enemy Spawnの完了通知でStageを完了扱いにしたりしません。
- cleanup対象が存在しないOwnerも、何も処理せずに完了したことを対象Battleについて一度だけ通知します。
- 各Ownerのcleanup処理は冪等とし、同じcleanup要求を複数回受けても同じ予約・参照・objectを二重に解放または破棄しません。
- Reserved Shaondamaの実際の解放OwnerとAttackEvent側との受け渡しは、[Charge Allocation](/spec/draw-system/charge-allocation)を正本とします。Combat SystemはReservedを直接解放しません。
- Combat Systemは、必須Ownerの一部だけが完了した段階でCombat cleanup完了を通知しません。
- StageとEnemy Spawnのいずれか一方でもcleanup未完了である間は、Combat cleanup完了およびResult操作解禁可能を通知しません。
- VFX、SE、画面内に残る非Gameplay演出、およびDamageや衝突判定を持たない表示専用objectの終了は、必須cleanup完了条件へ含めません。
- 表示専用Enemy object、Enemy退場演出、およびSpawn演出の表示終了は、Stage／Enemy Spawnの必須cleanup完了条件へ含めません。
- 表示専用objectを残したままcleanup完了とする場合、そのobjectからDamage、Hit、Parry、Target提供、Chargeへの再利用、または状態変更を発生させてはいけません。
- StageとEnemy Spawnは、内部実装上は別のSubsystemとして処理してもよい。ただし、Combatの必須cleanup集約上は`Stage／Enemy Spawn`を1つの論理Ownerとして扱う。
- Stage／Enemy Spawn内部のcleanupがすべて完了した後に、対象`battleId`と通知元Ownerを識別できる情報を含むcleanup完了通知を、Combatへ一度だけ送る。
- Combat Systemは、StageとEnemy Spawnの内部完了通知を別Owner分として直接加算しない。
- 同じBattleの`Stage／Enemy Spawn` cleanup完了通知が複数回届いても、完了は1回だけとして扱う。

## Battle終了時の既存object

Battle結果の確定時点ですでに存在するPalette Bullet、Marker、Jaon Bullet、シャオンダマ、および保留中の命中処理は、結果確定直後にGameplay上無効化します。即時消去するか、終了演出として一時的に表示を残すかは各所有ページで定義します。

ただし、以下の全体条件を満たす必要があります。

- 飛翔中Palette Bullet、Jaon Bullet、および保留中の命中処理は、結果確定後にDamage、Hit、衝突、Parry判定を発生させない
- Markerは結果確定後に有効targetを公開しない
- 開始済みArpeggioの未発火EntryとAttackEventの未発火分から、新しいPalette Bulletを発射しない
- Clear演出として残存シャオンダマを破裂させる場合、その破裂からWeak攻撃、Damage、AttackEventを発生させない
- 結果確定後に、新しい浄化、Clear候補、Game Over候補、またはBattle結果を確定させない
- Battle終了後の既存objectを、次のBattleの戦闘処理へ参加させない
- Retry開始後までに、旧Battleに属するPalette Bullet、Marker、および保留中の命中処理をすべて破棄する

Palette Bullet／Markerの飛翔、衝突、Target消失、および消滅規則は、本ページでは定義しません。

| 終了対象 | Combatが保証する全体条件 | cancel／release・表示終了の所有者 |
|---|---|---|
| 未発火Arpeggio Entry・AttackEvent snapshot | 未発火分から新しい弾やDamageを出さない | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)、BGM |
| Reserved・Allocation | Battle終了時に旧Battle分を解放し、二重弾化・二重解放を起こさない | [Charge Allocation](/spec/draw-system/charge-allocation)、AttackEvent |
| 飛翔中Palette Bullet | Gameplay上無効化し、結果確定後はDamageを出さない | [Palette Bullet](/spec/combat/palette-bullet) |
| Marker・target情報 | 現在targetとして利用不能にし、次Battleへ持ち越さない | [Marker](/spec/combat/marker) |
| 飛翔中Jaon Bullet | Gameplay上無効化し、結果確定後はDamage・衝突・Parry判定を出さない | [Jaon Bullet](/spec/enemy/jaon-bullet) |
| 保留中の命中・Damage通知 | `battleId`と結果状態を再照合し、結果確定後は破棄する | Combat、Palette Bullet、Enemy Damage |
| 残存シャオンダマ | 終了演出と自然破裂を区別し、終了演出からGameplay出力を出さない | シャオンダマ、演出 |

## Retry

Retryは、旧BattleのCombat stateやRuntime状態を再利用する処理ではありません。[ゲーム全体](/spec/game/)のRetry・リセット契約に従い、旧Battleを破棄して新しいBattleとして開始します。

Combat Systemは、Retry時に以下を行います。

1. Combat stateを`NonCombat`にする
2. 旧Battleの確定結果を破棄する
3. 旧BattleのBattle ID配布済み・Combat受付開始済み・Battle終了通知済み状態を破棄する
4. 旧BattleのBattle識別情報を現在のBattleとして扱わない状態にする
5. 保留中のCombat処理、遅延命中、および結果通知を破棄する
6. 旧BattleのEnemy Spawn要求、予約、生成・初期化callback、および遅延Spawn完了通知を破棄または現在・次Battleへ適用不能にする
7. Combat側が保持する旧BattleのStage／Enemy Spawn受付状態、Clear対象登録との連携状態、およびEnemy有効化待ち状態を破棄する
8. 旧Battleのcleanup要求済み・Owner完了済み・Combat cleanup完了通知済み状態を破棄する。Stage／Enemy Spawn Ownerのcleanup完了済み状態を新Battleへ持ち越さない
9. 旧Battleに属するPalette Bullet、Marker、Jaon Bullet、Enemy、および表示専用objectを次のBattleへ持ち越さない
10. StageおよびEnemy Spawnを含む各システムの再構築完了後、通常のBattle開始lifecycleを`NonCombat`からやり直す

Retry後に開始するBattleは、新しいBattle識別情報を持ちます。Scene Reloadまたはin-place resetのどちらを使用するかは本ページでは規定しません。

新しいBattle識別情報は、Retry後の対象Battleの初期化、初期Shaondama生成、および3時計を開始する前に割り当てて配布します。旧Battle IDを持つ処理は、新しいBattleの開始後も受け付けません。

Stageは旧Battleのobjective、wave進行、Spawn program進行位置、Clear対象Enemy記録、`PendingSpawn`、登録状態、および通知済み状態を破棄し、Stage定義から再構築します。Enemy Spawnは旧BattleのSpawn要求、予約、callback、Enemy／Spawn参照を破棄します。Combat Systemはこれらの完了を新Battleの準備条件へ接続しますが、各Ownerの内部状態を直接再構築しません。

Player、Enemy、BGM／MusicChart、AttackEvent、Stage、UIなどの内部リセットは、それぞれの所有ページを正本とします。

## 責務境界

| 対象 | 本ページが定義すること | 正本・詳細ページ |
|---|---|---|
| Game | Battle ID配布、Battle開始gate成立、pre-roll終了の境界を区別し、確定結果の一回通知、Combat cleanup完了、およびResult操作解禁条件をGame全体lifecycleへ接続する | [ゲーム全体](/spec/game/) |
| Stage／Enemy Ready | 初期Enemy／Spawn準備とClear対象登録が完了したEnemy ReadyをBattle開始gateの入力として受け取り、Stageが確定したClear候補を結果候補収集へ渡す。Stage objective、wave、Clear対象Enemy記録をCombat側で再判定せず、Stage cleanupとRetry再構築へ接続する | [ステージ](/spec/stage/) |
| Enemy Spawn | 現在BattleのCombat受付が有効な場合だけSpawn要求、確定、登録、生成・初期化、Enemy有効化、および遅延Spawn完了を受け付ける。Battle終了cleanupとRetry時の旧Spawn処理破棄を集約する | [ステージ](/spec/stage/)、[Enemy基本挙動](/spec/enemy/basic-behavior) |
| Player死亡 | Game Over候補と確定結果をCombat終了へ接続する | [Player死亡](/spec/player/player-death) |
| BGM／MusicChart | Battle ID受領、3時計の同時開始、system pre-roll、BGM Audio開始、およびBattle終了・Pause・Retry通知との接続境界を示す | [BGM｜Gameplayとの接続](/spec/bgm/bgm-gameplay-connection) |
| 初期Shaondama／Supply Ready | 時計停止中の初期生成と、選択可能かつ非Reservedの最低保証到達通知をBattle開始gateへ接続する | [BGM｜シャオンダマ生成](/spec/bgm/bgm-make-syaonndama) |
| RadioWhale hand-off | 出現演出完了後のGameplayへの制御移譲と選択可能化をSupply Readyへ接続する | [ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning) |
| Charge／Allocation | 現在Battleの受付gateが有効な場合だけ新規処理を受け付け、BGM Audioの再生状態を条件にしない境界を示す | [Playerアクション｜Charge](/spec/player/player-action-charge)、[Charge Allocation](/spec/draw-system/charge-allocation) |
| AttackEvent | Combat中の実行境界と、結果確定後の新規開始停止を示す | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Enemy Damage／浄化 | 現在Battleの浄化成立通知をStageへ渡す受付境界を示す。Enemy DamageからClear候補を直接確定・通知しない | [Damage・浄化](/spec/enemy/damage-and-purify)、[ステージ](/spec/stage/) |
| Palette Bullet | Battle終了・Retry通知を受ける境界を示す | [Palette Bullet](/spec/combat/palette-bullet) |
| Marker | Battle終了・Retry通知を受ける境界を示す | [Marker](/spec/combat/marker) |
| Jaon Bullet | Battle終了後にDamage・衝突・Parry判定を停止する共通境界を示す | [Jaon Bullet](/spec/enemy/jaon-bullet) |
| 浮遊中Shaondama | Battle終了後にCharge・Allocation・Bullet化対象から外す共通境界を示す | [浮遊中の挙動](/spec/shaondama-music/floating-behavior) |
| UI／演出 | Combat state、Pause、確定結果、Result操作lock、およびCombat cleanup完了の通知境界を示す | [UI](/spec/ui/)、[演出](/spec/effects/) |

StageとEnemy Spawnは機能上それぞれの処理を持つが、Battle終了時のCombat必須cleanup集約では、両者を`Stage／Enemy Spawn`という1つの論理Ownerとして扱う。機能上の責務分離によって、Combatが待つ必須Owner数を増やさない。

本ページでは、以下を再定義しません。

- Clear／Game Overの条件、候補収集、同時成立時の優先順位
- Stage objective、Spawn program、Clear対象Enemy記録、初期配置、動的Spawn登録、Clear条件、進行、ギミック
- PlayerのHP、Dead、死亡モーション
- 3時計の同期方法、system pre-rollの進行、およびBGM Audioの開始・同期処理
- 初期Shaondamaの生成方法、選択可能数の集計、および最低保証判定
- RadioWhaleの出現演出、Gameplayへのhand-off、および選択可能化の内部処理
- Charge、Allocation、Reservedの内部処理
- AttackEventの成立判定
- Palette Bullet／Markerの飛翔、衝突、Target消失、消滅
- EnemyへのRGB Damage計算と浄化値更新
- UI、VFX、SE、および終了演出
- RetryにおけるScene Reload／in-place resetの選択

## 例外・禁止事項

- Combat Systemが独自のClear／Game Over条件または優先順位を定義してはいけません。
- Battle IDの発行・配布より前に、対象Battleの初期化、初期Shaondama生成、または3時計を開始してはいけません。
- 初期Shaondama生成とShaondama Supply Readyの確認より前に、3時計を開始してはいけません。
- Enemy ReadyとShaondama Supply Readyを含むすべてのReady条件が成立する前に、`Combat`へ遷移したり、Combat受付またはPlayerの戦闘操作受付を開始したりしてはいけません。
- Battle ID配布を、Combat受付開始またはBGM Audio再生開始と同じ境界として扱ってはいけません。
- Combat Systemが、BGM Audioを開始したり、選択可能Shaondama数または最低保証数を再計算したりしてはいけません。
- BGM Audioが再生されていないことだけを理由に、system pre-roll中のAttackEvent PreviewまたはChargeを無効にしてはいけません。
- Charge開始条件へ、BGM Audioが再生中であることを追加してはいけません。
- Pause中に、新しいEnemy Spawn、Clear対象登録、Enemy生成・初期化、またはGameplay有効化を進行させてはいけません。
- 同じBattleに対してBattle ID配布、Combat受付開始、Battle終了通知の受理、またはBattle終了処理を複数回成立させてはいけません。
- Battle結果確定後に、新しい戦闘操作、Charge、生成要求、Enemy Spawn、AttackEvent、Arpeggio、Allocation、Target決定、Projectile／Marker生成、攻撃、Hit、Damage、Parry判定、または浄化を開始してはいけません。
- Battle結果確定後に、旧Spawn要求や遅延Spawn完了通知からClear対象登録、`PendingSpawn → Active`、またはEnemy有効化を成立させてはいけません。
- Combat Systemが、Stage内部のobjective、wave進行、pending Spawn数、Clear対象Enemy記録、またはworld上のEnemy数からClear候補を再判定してはいけません。
- GameからのBattle終了通知を同じBattleについて複数回受理したり、各Ownerへcleanup要求を重複発行したりしてはいけません。
- 現在Battleと異なる`battleId`のDamage、Hit、Target、結果通知、またはcleanup完了通知を現在Battleへ適用してはいけません。
- 同じOwnerから届いた重複cleanup完了通知を複数Owner分として数えてはいけません。
- 必須Ownerすべてのcleanupが完了する前に、Combat cleanup完了またはResult操作解禁可能を通知してはいけません。
- VFX、SE、または表示専用objectの終了待ちを、必須Gameplay cleanupへ追加してはいけません。
- 終了演出として残したobjectに、Damage、Hit、Parry、Target提供、Chargeへの再利用、またはResult操作の妨害を許可してはいけません。
- Pauseを`NonCombat`への遷移、Battle終了、または新しいBattle開始として扱ってはいけません。
- 現在のBattleと一致しないBattle識別情報を持つ遅延処理を、現在のBattleへ適用してはいけません。
- Retry後に、旧Battleの識別情報、確定結果、通知済み状態、Spawn要求、予約、callback、登録状態、cleanup進捗、遅延命中、Palette Bullet、Marker、Jaon Bullet、Enemyを持ち越してはいけません。
- Palette Bullet／Markerの未確定な内部lifecycleを本ページで推測して補完してはいけません。

## パラメータ

本ページ固有の調整パラメータはありません。

system pre-roll時間、Preview lead、Charge Offset、Shaondama最低保証数、初期生成の`MinimumLeadTime`、およびResult誤操作防止用の最小待ち時間は各所有ページのTuning項目とし、本ページでは具体値を固定しません。

## 未決事項

Battle IDのデータ型・採番方式、Battle開始境界を内部的に何種類のeventへ分けるか、および終了演出として残す各objectの具体的な表示終了方法は、実装または各所有ページで定義します。これらはBattle開始順、Combatの受付条件、結果確定後のGameplay無効化、または必須cleanup完了によるResult操作解禁条件を変更しません。

Battle終了gate、Combat cleanup集約、およびResult操作解禁への接続を含む上位契約は決定済みです。ただし、Parry／Jaon Bullet／Wildcard、Playerの同一frame Damage、および各Owner固有の通常lifecycleを各正本へ反映し、cancel／release／`battleId`拒否契約の横断確認が完了するまでは、本ページのstatusを`仮仕様`とします。

## 関連タスク

<PageRelations />
