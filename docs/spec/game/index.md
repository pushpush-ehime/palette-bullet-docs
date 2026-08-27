---
title: ゲーム全体
description: Palette Bulletのゲーム進行と各システムの関係
pageType: spec
category: ゲーム全体
categoryOrder: 10
order: 0
status: 仮仕様
---

# ゲーム全体

## ページ概要

- 対象担当：全担当
- 関連ページ：[ゲーム概要](/game-overview)、[仕様・設計一覧](/spec/)

## 目的

ゲーム開始からBattle終了、Retryまでの基本的な流れと、各システムの役割・接続関係を定義します。

本ページは、ゲーム・ステージ・Battleの高レベルな進行、Clear／Game Overの条件と結果確定規則、Battle開始・終了時の通知順、Pauseを利用できる範囲、およびRetry時のシステム横断リセット契約の正本です。

Player State、Charge、Allocation、MusicChart、AttackEvent、シャオンダマ、Palette Bullet、Marker、Enemy Damageなどの内部処理は、それぞれの仕様ページを正本とします。

## プレイヤーから見た挙動

| 項目 | 内容 | 状態 |
|---|---|---|
| ゲーム形式 | 色と音を使って敵を浄化する3Dアクション | 確定 |
| Playerの役割 | 戦場を移動し、シャオンダマを選択・Chargeして攻撃を構成する | 確定 |
| コア体験 | 色と音で世界をつなぐ爽快ドローアクション | 確定 |
| Battleの目的 | Stage objectiveを完了し、登録済みClear対象Enemyをすべて浄化または正式除外してClearを目指す | 確定 |
| Player死亡後 | 最終Battle結果がGame Overの場合、その場では復活せず、Game Over ResultのRetryによって現在のステージを最初から開始する | 確定 |
| Battle終了後 | 共通Result画面に確定結果のClear／Game Over variantを表示し、cleanup完了後に操作を受け付ける | 確定 |

## ゲーム全体の進行

ゲーム全体は、以下の段階で進行します。

```text
ゲーム開始
↓
拠点
↓
ステージ選択・準備
↓
Battle開始
↓
通常Battle
↓
ClearまたはGame Overを確定
↓
共通Result画面を表示開始
↓
必須OwnerのGameplay cleanup完了後にResult操作を解禁
↓
Clearは拠点／Stage選択へ戻る、Game Overは現在のStageをRetry
```

ResultはClear／Game Overで別々の勝敗判定を行う画面ではなく、Gameが通知した確定Battle結果に応じてvariantを切り替える共通画面です。各画面の構成、遷移演出、Fade、SE、およびResult内の具体的な表示内容はUI／演出側の仕様を正本とします。

## 基本戦闘フロー

ゲーム全体における基本的な戦闘フローは、以下の通りです。

1. Battle開始要求を受ける
2. 新しいBattle IDを発行する
3. Battle IDを必要な各システムへ配布する
4. `Battle／Gameplay／MusicChart`の3時計を停止したまま、Stage、Player、Enemy、およびBattle参加対象を初期化する
5. MusicChartの初期位置を基準に、初期シャオンダマの生成を評価する
6. 必要な初期シャオンダマを生成し、ラジクジラの出現演出完了後にGameplayへhand-offして選択可能にする
7. 対象RoomのEnemy Readyと、選択可能かつ非ReservedのシャオンダマによるShaondama Supply Readyを確認する
8. 必要なすべてのReady条件が成立した時点で、Combatの受付とPlayerの戦闘操作受付を開始する
9. Combat／Player受付開始と同じ基準点から、`Battle／Gameplay／MusicChart`の3時計を同時に開始する
10. system pre-rollへ入り、その期間中からAttackEvent PreviewとChargeを受け付ける
11. system pre-roll終了時に、戦闘BGMを音源位置0から再生する
12. BGM／MusicChartが、通常Battle中に生成するシャオンダマと生成タイミングを決定する
13. 生成要求を受けたラジクジラが、シャオンダマを世界内へ出現させる
14. AttackEventを予告する
15. Playerが世界内の選択可能なシャオンダマからCharge対象を選択する
16. Charge判定を行い、Normal AttackEventのCurrent／SlotまたはWeak AttackEventへAllocationする
17. Charge successとなったシャオンダマをReservedとして保持する
18. AttackEventを発火する
19. Complete／Incomplete／Zero ChargeまたはWeakの結果を解決する
20. 使用するReserved Shaondamaを確定し、Palette Bullet化する
21. Chord／Arpeggio／Weakの規則に従ってPalette Bulletを発射する
22. Palette Bulletの命中、Enemy Damage、および浄化を処理する
23. StageがStage objectiveと登録済みClear対象Enemy記録からClear条件を評価し、成立時は対象`battleId`付きClear候補をGameへ通知する
24. Gameが同一フレーム内のClear候補とGame Over候補を収集し、優先規則に従ってBattle結果を1回だけ評価する
25. Battle結果が未確定である間、12から24までを繰り返す
26. Battle結果が確定した場合は、Battle終了lifecycleへ移行する

Battle IDの配布は対象Battleの準備を開始する境界、Ready gateの成立はCombat／Player受付と3時計を開始する境界、system pre-rollの終了はBGM Audioを実際に鳴らし始める境界です。これらを同じ開始Eventとして扱いません。

system pre-rollは音源、完成曲、またはMIDIへ挿入した無音ではありません。Battleの音楽runtimeが管理するシステム上の時間区間です。BGM Audioがまだ鳴っていないsystem pre-roll中も、対象Battleの受付gateが有効であればAttackEvent PreviewとChargeを開始できます。

Charge success時には、シャオンダマを即座にPalette Bullet化しません。Charge success時の到達点はAllocationおよびReserved化であり、Palette Bullet化はAttackEvent発火時に、使用するReserved Shaondamaが確定した後で行います。

Allocation、Reserved、AttackEvent結果、使用対象の選択、Chord／Arpeggio／Weakの各規則は、それぞれの正本となる仕様ページで定義します。

3時計、BGM Audio、およびsystem pre-rollの詳細は[BGM｜Gameplay接続](/spec/bgm/bgm-gameplay-connection)、初期シャオンダマ生成と最低保証の詳細は[BGM｜シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)を正本とします。

## シャオンダマ生成の責務

シャオンダマ生成は、以下の責務で分離します。

```text
BGM／MusicChart
「何を・いつ・何個生成するか」
        ↓
ラジクジラ
「世界内へどう出現させるか」
        ↓
シャオンダマ
「出現後にどう存在・挙動するか」
```

- BGM／MusicChartは、生成対象、生成数、および生成タイミングを決定します。
- ラジクジラは、生成要求を受けてシャオンダマを世界内へ出現させます。
- 世界内へ出現した後のシャオンダマのlifecycleと挙動は、シャオンダマ側が管理します。
- ラジクジラは、ChargeやAttackEventの成立判定へ直接関与しません。

## 状態別の挙動

以下はゲーム全体の進行を高レベルに整理したものであり、PlayerのState構造そのものを定義するものではありません。

| 状態・段階 | 内容 | 状態中に動作する主なシステム |
|---|---|---|
| 拠点 | Playerが通常操作を行い、ステージ開始前の準備を行う | Player、カメラ、拠点、UI、BGM |
| Battle準備中 | Battle IDを配布し、3時計とBGM Audioを停止したまま、初期化、初期シャオンダマ生成、RadioWhaleからのhand-off、Enemy Ready、およびShaondama Supply Readyを待つ。Combat受付とPlayer戦闘入力は無効 | Stage、Combat、Player、Enemy、BGM、MusicChart、ラジクジラ、シャオンダマ、UI |
| Ready gate成立時 | Combat受付とPlayer戦闘入力を有効化し、同じ基準点から3時計を同時に開始する。必要な初期シャオンダマは選択可能になっている | Game、Combat、Player、BGM、MusicChart、UI |
| system pre-roll | 3時計は進行するがBGM Audioは音源位置0で停止する。Playerは戦闘操作を行え、AttackEvent PreviewとChargeを開始できる | Player、カメラ、Enemy、Combat、BGM、MusicChart、AttackEvent、Charge、UI |
| 通常Battle | system pre-roll終了後、BGM Audioを音源位置0から再生し、MusicChart eventと同じ音楽時間関係でBattleを進行する | Player、カメラ、Enemy、Combat、BGM、MusicChart、UI |
| Pause中 | Combat受付とPlayer戦闘入力を停止し、3時計を同時に停止する。BGM Audioは、未再生の場合は音源位置0、再生開始後の場合は現在位置で停止し、ShaondamaなどのGameplay状態を保持する | Game、Player、Combat、BGM、MusicChart、UI |
| シャオンダマ生成 | BGM／MusicChartが生成対象を決定し、ラジクジラが世界内へ出現させる | BGM、MusicChart、ラジクジラ、シャオンダマ |
| AttackEvent予告 | AttackEventに向けてPlayerが攻撃構成を準備する | BGM、AttackEvent、UI |
| シャオンダマ選択・Charge | Playerが対象を選択し、Charge判定、Allocation、Reserved化までを行う | Player、シャオンダマ、Charge、チャージシステム |
| AttackEvent発火・発射 | 結果と使用Reservedを確定し、Palette Bullet化して発射する | Player、BGM、AttackEvent、チャージシステム、Combat、Enemy、演出 |
| Clear処理 | Battle結果をClearとして固定し、Game Over向け表示を抑止してClear Resultの表示を開始する。同一frameで`RootState = Dead`が成立済みでも巻き戻さない | Game、Player、Combat、Stage、BGM、UI、演出 |
| Game Over処理 | Battle結果をGame Overとして固定し、死亡側の演出とGame Over Resultの表示へ接続する | Game、Player、Combat、Stage、BGM、UI、演出 |
| Result cleanup中 | 共通Result画面を確定結果のvariantで表示するが、Result操作をlockしたまま必須OwnerのGameplay cleanupを行う | Game、Player、Combat、BGM、AttackEvent、チャージシステム、UI |
| Result操作可能 | 必須Ownerすべてのcleanup完了後、ClearではContinue、Game OverではRetryだけを受け付ける | Game、UI、入力 |
| Retry | 旧BattleのRuntime状態を再利用せず、新しいBattle IDでステージ開始状態を再構築する | Game、Stage、Player、Enemy、Combat、BGM、UI |

Playerの具体的なRootState、ActionState、および遷移条件はPlayer仕様を正本とします。

## Battle開始lifecycle

Battle開始時は、以下の高レベルな順序で処理します。

```text
Battle開始要求を受ける
↓
新しいBattle IDを発行する
↓
Battle IDを必要な各システムへ配布する
↓
3時計を停止したまま、対象Battleを初期化する
↓
MusicChartの初期位置を基準に初期シャオンダマ生成を評価する
↓
必要な初期シャオンダマを生成する
↓
RadioWhaleの出現演出完了後、Gameplayへhand-offして選択可能にする
↓
対象RoomのEnemy Readyを確認する
↓
選択可能かつ非ReservedのShaondama Supply Readyを確認する
↓
すべてのReady条件が成立する
↓
Combat受付とPlayer戦闘入力を有効化する
↓
同じ基準点から3時計を同時に開始する
↓
system pre-rollへ入る
↓
AttackEvent PreviewとChargeを受け付ける
↓
system pre-roll終了時にBGM Audioを音源位置0から再生する
```

- Battle IDは、対象Battleの初期化、初期シャオンダマ生成、3時計、およびBGM Audioの開始より前に存在しなければなりません。
- Battle IDは、Stage、Player、Enemy、Combat、BGM／MusicChart、AttackEvent、ラジクジラ、およびシャオンダマ生成処理など、対象Battleへ参加するシステムへ配布します。
- 初期NoteEvent occurrence、生成要求、シャオンダマ、AttackEvent occurrence、Palette Bullet、Marker、およびDamage通知は、同じBattle IDへ帰属し、後続処理へその帰属を引き継ぎます。
- Battle IDの配布は準備開始を意味しますが、Combat受付、Player戦闘入力、または3時計の開始を意味しません。
- Battle準備中は、`Battle／Gameplay／MusicChart`の3時計を停止したまま、初期化と初期シャオンダマ生成を進めます。
- Ready gateには、少なくとも対象Battleの初期化完了、対象RoomのEnemy Ready、初期シャオンダマの出現演出完了とGameplayへのhand-off、および選択可能かつ非ReservedのShaondama Supply Readyを含めます。
- 論理生成済み、生成要求中、出現演出中、またはGameplayへhand-offされる前のシャオンダマは、Shaondama Supply Readyの最低保証数へ算入しません。
- 必要なすべてのReady条件が成立した時点で、Combat受付とPlayer戦闘入力を有効化し、同じ基準点から3時計を同時に開始します。
- Ready通知後から3時計の開始前までにShaondama Supply Readyを満たさなくなった場合は、そのReady状態を解除し、再び必要条件の成立を待ちます。
- system pre-roll中は3時計を進行させますが、BGM Audioは音源位置0で停止したままにします。
- system pre-roll中もCombat受付とPlayer戦闘入力は有効であり、AttackEvent PreviewとChargeを開始できます。Charge開始条件はBGM Audioの再生状態ではなく、対象Battleの受付gateとPlayer Actionの条件によって決定します。
- system pre-roll終了時に、BGM Audioを音源位置0から再生します。以降のBGM AudioとMusicChart eventは、BGM側で定義する同じ音楽時間関係に従って進行します。
- Battle開始前に、前のBattleに属するRuntime状態を参照してはいけません。
- 個々のシステムの内部初期化手順、Shaondama生成方法、Ready通知、時計同期、およびAudio開始方法は各所有ページで定義します。本ページでは、それらが満たすBattle開始全体の順序だけを定義します。

Battle開始における3つの境界は、以下のとおりです。

| 境界 | Gameplay上の意味 |
|---|---|
| Battle IDの発行・配布 | 対象Battleの準備を開始する |
| Ready gate成立 | Combat受付、Player戦闘入力、および3時計を開始する |
| system pre-roll終了 | BGM Audioを実際に鳴らし始める |

## Clear・Game Over

| 判定 | 条件 | 判定後 |
|---|---|---|
| Clear候補 | Stage objectiveが`Completed`であり、登録済みClear対象Enemyがすべて`Purified`または`FormallyExcluded`である | 結果確定規則へ渡す |
| Game Over候補 | Playerの`CurrentHP <= 0`となり、`RootState = Dead`が成立する | 結果確定規則へ渡す |

Clear候補は、次の両方が成立した場合だけ発生します。

```text
Stage objectiveがCompleted
AND
登録済みClear対象EnemyがすべてPurifiedまたはFormallyExcluded
```

Stage objectiveの状態、Clear対象Enemy記録、およびClear条件の評価はStageが所有します。Stageは条件成立時に、対象`battleId`付きClear候補をGameへ一度だけ通知します。GameはStageが確定したClear候補を受け取り、Stage内部のClear対象Enemy集合、wave進行、残りSpawn数、またはobjective状態を独自に参照・再計算してClearを判定しません。

現在world上に存在するEnemyが0体であることだけでは、Clear候補にしません。将来のwaveが残っている場合、またはpending wave／pending Spawn中で新しいClear対象Enemyが追加される可能性が残っている場合は、Stage objectiveを`InProgress`に維持し、Clear候補を発生させません。

初期Enemyが0体の場合も、Battle準備中にはClear候補を扱いません。対象BattleのBattle開始gate（Ready gate）が成立してBattleが開始され、Battle結果が未確定であり、かつStage objectiveが`Completed`となった後に、未解決の登録済みClear対象Enemyが存在しない場合だけClear候補を扱います。

Clear対象Enemy記録には、Battle開始時の戦闘対象Enemyに加え、戦闘中に動的Spawnすることが確定した戦闘対象Enemyも登録します。Enemyが遠くへ移動しただけでは対象から外しません。特殊イベントによる正式な除外だけをStageが明示的に`FormallyExcluded`として成立させ、背景演出用など戦闘Enemyではない存在は含めません。記録の登録・更新・浄化反映・正式除外・objective完了・Clear条件評価の手続きは[ステージ](/spec/stage/)を正本とします。

Playerの`CurrentHP <= 0`と`RootState = Dead`は、Game Over候補を発生させるGameplay上の事実です。死亡演出、Game Over Result、およびRetry受付は、この事実だけから直ちに開始せず、Gameが最終Battle結果を確定した後に分岐します。

同一フレーム内にClear候補とGame Over候補が成立した場合、最終Battle結果はClearです。この場合も、そのフレームまでに成立したPlayerのHP 0、`RootState = Dead`、Damage、および状態変更は巻き戻しません。一方、Clear Resultへ接続するため、Playerの死亡演出、Game Over variant、Game Over専用の入力待機、およびRetry受付は開始しません。内部の`Dead`状態と、死亡演出／Game Over表示を分離して扱います。

最終Battle結果がGame Overの場合に限り、Player仕様に従って死亡側の演出を開始し、共通Result画面のGame Over variantとRetryへ接続します。

汚染度は現在のGame Over条件として使用しません。将来Game Over条件へ追加する場合は、値の所有者、増減条件、上限、UI表示、およびHP条件との優先関係を別途仕様化してから、本ページへ追加します。

## Battle結果の確定規則

- Gameは、Stageから通知されたClear候補と、PlayerのHP 0および`RootState = Dead`によって成立したGame Over候補を収集します。
- Clear候補には対象`battleId`を含めます。Gameは現在のBattle IDと一致し、かつBattle結果が未確定であるClear候補だけを収集します。
- GameはClear候補の受理時に、Stage内部のClear対象Enemy記録、wave進行、残りSpawn数、またはobjective状態を再計算しません。
- Clear候補とGame Over候補の収集単位は、Unity上の同一フレームです。
- 各フレームでは、そのフレームの候補発生処理を完了してから結果評価を1回だけ行います。先に届いた候補だけで即時確定せず、同一フレーム内の両候補を評価対象に含めます。
- 1回のBattleで確定できる最終結果は、ClearまたはGame Overのいずれか1つだけです。
- 同一フレーム内にClear候補だけが成立した場合はClear、Game Over候補だけが成立した場合はGame Over、両方が成立した場合は**Clearを優先**します。
- ClearとGame Overの両候補が成立してClearを確定した場合も、すでに成立したHP 0、`RootState = Dead`、Damage、および状態変更は巻き戻しません。
- Clearを確定した場合は、`RootState = Dead`が成立済みであっても死亡演出、Game Over variant、Game Over専用の入力待機、およびRetry受付を開始しません。
- Battle結果は一度だけ確定します。確定後の命中、浄化、Damage、演出、通知によって結果を変更しません。
- Battle結果確定後に届いたClear候補は、現在のBattle IDと一致していても拒否し、結果評価を再実行しません。現在と異なる`battleId`のClear候補も適用しません。
- 結果確定後に既存の命中演出や終了演出を継続する場合も、Clear／Game Overの再判定は行いません。
- Result、UI、および各システムは、Gameから確定済み結果を受け取り、独自に勝敗を再判定したり別のBattle結果を確定したりしてはいけません。
- 確定結果には終了対象のBattle IDを付与します。現在のBattle IDと一致しない結果通知は適用しません。

## Battle終了lifecycle

ClearまたはGame Overの候補が成立した場合は、以下の高レベルな順序で終了処理を行います。

```text
1. 同一フレーム内のClear／Game Over候補を収集する
↓
2. Clear優先でBattle結果を1回だけ確定する
↓
3. Gameplay入力と新しいGameplay処理の受付を停止する
↓
4. 共通Result画面を確定結果のvariantで表示開始する
↓
5. 各必須OwnerがGameplay cleanupを行う
↓
6. 同じBattle IDに対する必須Ownerすべてのcleanup完了を集約する
↓
7. Result操作を解禁する
↓
8. ContinueまたはRetryの入力に従ってroute遷移する
```

Battle結果確定直後にGameplay側の受付gateを閉じます。Result画面はcleanup完了を待たずに表示開始できますが、表示開始時点ではボタンなどのResult操作をlockします。確定結果と終了通知には終了対象のBattle IDを含め、各Ownerは現在のBattle IDと一致する通知だけを受理します。

### 結果確定後の共通受付gate

Battle結果確定後は、次の処理を新しく成立させません。

- PlayerのGameplay入力、および新しいActionへの遷移
- 新しいAttackEvent、Arpeggio Entryの発火、およびAttackEvent Preview
- 新しいCharge、Allocation、Reserved化、およびPalette Bullet化
- 新しいHit、Damage、浄化、およびParry判定
- 新しいTarget決定、およびMarkerによるTarget座標の提供
- 新しいPalette Bullet、Marker、Jaon BulletなどのProjectile生成
- 新しいシャオンダマ生成、および新しいEnemy Spawn
- 停止後のMusicChart Eventや予約済みGameplay callbackによる状態変更
- 旧Battleの遅延通知、生成結果、命中、Damage、cleanup完了通知による現在Battleの状態変更

同一フレームの候補収集までに成立済みのHP 0、`RootState = Dead`、Damage、および状態変更は巻き戻しません。一方、Battle結果確定後に到着した処理は、見た目上同じフレームであっても新しいGameplay結果として成立させません。同一フレームDamageの処理順の詳細は、Player Damageの正本で確定後に本規則との横断確認を行います。

### Gameplay cleanupの共通契約

各必須Ownerは、Battle結果確定後に担当Gameplay要素をcancel、無効化、解放、または破棄し、担当範囲にGameplay上の効果が残らない状態でcleanup完了を通知します。基本となる必須cleanup区分は以下です。

| 必須cleanup区分 | cleanup完了条件 | 詳細の所有者 |
|---|---|---|
| Player受付・State | Gameplay入力、Action、Aim、Reaction、および保留入力を停止し、結果確定後のGameplay State遷移を拒否している | Player、入力 |
| 音楽時計・同期通知 | `Battle／Gameplay／MusicChart`の3時計を停止し、新しいMusicChart Eventと予約済みGameplay callbackを無効化している | BGM／MusicChart |
| AttackEvent | 未発火AttackEventとArpeggioの未発射Entryを取り消し、Arpeggioの使用Slot snapshotなど、AttackEventが保持するすべてのRuntime snapshotを無効化している。| BGM／AttackEvent |
| Charge・Allocation・Reserved | 未確定Chargeを破棄し、Allocation／Slot／Reserved関係を解消し、未消費Reservedを一度だけ解放している | Charge、チャージシステム、AttackEvent |
| Combat集約 | 新しいHit、Damage、Parry、Target決定、Projectile生成を拒否し、必須Combat Ownerのcleanupを集約済みである | Combat |
| Palette Bullet・Jaon Bullet | 飛行中objectと保留命中をGameplay上無効化し、Damage、衝突、爆発、Parry判定を発生させない | Combat、各Projectile Owner |
| Marker | 飛行中／付着済みにかかわらずTarget公開を停止し、Gameplay上無効化している | Marker、Combat |
| シャオンダマ | Charge、Allocation、Palette Bullet化、自然破裂Damageの対象から外し、旧Battleの参照を無効化している | シャオンダマ、チャージシステム |
| Enemy Spawn・Stage進行 | 新しいEnemy Spawnと旧Battle由来のStage進行通知を停止している | Enemy、Stage |

各Ownerは同じBattle終了通知を複数回受けても安全な冪等処理とし、同じ予約、参照、Slot、またはobjectを二重に解放・破棄してはいけません。未消費Reserved Shaondamaの実際の解放OwnerはAttackEventとAllocationの所有ページ間で一意に定め、もう一方は同じ対象を再解放しません。すでに消費済みのReserved Shaondamaも解放対象へ戻しません。

cleanup完了通知にもBattle IDを含めます。Gameは現在のBattle IDと一致し、かつ未受理の必須Ownerから届いた完了だけを集約します。Combatなどが配下Ownerを集約する場合、そのOwnerは配下の必須cleanupがすべて完了してから自身の完了を通知します。重複通知および旧Battle IDの完了通知は、Result操作解禁数へ加算しません。

### 演出とGameplay処理の分離

Battle終了後にVFX、SE、Projectile、Marker、またはシャオンダマの表示を残す場合でも、Gameplay上の効果は結果確定直後に無効化します。表示専用として残るobjectは、Damage、Hit、Parry、Target提供、Chargeへの再利用、またはResult操作の妨害を行いません。

BGM Audioや終了SEをResult演出として継続する場合でも、3時計とMusicChartからGameplayへ向かうEventは停止済みとします。演出として継続するAudioはBattle結果の再判定やGameplay callbackを発生させません。

Clear時に残っているシャオンダマは、終了演出として一斉に破裂させても構いません。この破裂は通常の自然破裂とは区別し、Weak攻撃、Damage、新しいAttackEventを発生させません。Game Over時に表示を残す場合も同じ無効化規則に従います。

任意のVFX、SE、画面内に残る非Gameplay演出、およびDamageや衝突判定を持たない表示専用objectの終了は、必須cleanup完了条件に含めません。これらが継続中でも、必須Ownerすべてのcleanupが完了すればResult操作を解禁できます。

Battle終了後に表示専用として残す演出およびRuntime objectの視覚的な消滅時点・消去方法は、各objectの所有ページで定義する。Markerの表示終了方法はMarker仕様を正本とする。

## Result接続

Resultは共通画面とし、Gameが通知した確定Battle結果に応じて`Clear`または`Game Over`のvariantを1つだけ表示します。Result／UI側はEnemy状態やPlayer HPを参照して勝敗を再判定しません。同一フレームにClearとPlayer Deadが成立した場合は、Clear variantだけを表示します。

| 確定Battle結果 | Result操作 | route |
|---|---|---|
| Clear | `Continue` | 拠点／Stage選択へ戻る |
| Game Over | `Retry` | 現在のStageを最初から再開する |

- Result表示開始時点では操作をlockし、必須OwnerすべてのGameplay cleanupが完了した後に解禁します。
- Result操作の受付gateはPlayerのGameplay StateおよびGameplay入力gateと分離し、Result操作解禁のためにGameplay受付を再開しません。
- 誤操作防止用の最小待ち時間を設ける場合はTuning値として管理し、必須cleanup完了と最小待ち時間の両方が成立した後に解禁します。
- 操作lock中に入力されたContinue／Retry相当の入力は破棄し、解禁後に遅延実行しません。
- 1つの確定結果に対して受理できるroute操作は1回だけです。受理直後にResult操作を再度lockし、連打や重複通知による複数route遷移を防止します。
- Clear ResultのContinueでは、終了したBattleのBattle IDとRuntime状態を無効化して拠点／Stage選択へ戻ります。遷移先Sceneで旧Battle IDを再利用せず、Battle識別が必要な場合および以後新しいBattleを開始する場合は、新しいBattle IDを発行します。
- Game Over ResultのRetryでは、終了したBattleの状態を再利用せず、旧Battleを破棄して新しいBattle IDで現在のStageを初期化します。
- Resultのレイアウト、表示文言、および具体的な演出はUI／演出側を正本とします。ただし、確定結果、variant、操作解禁条件、およびrouteは本ページを正本とします。

## Pause

Pauseは、Playerが通常操作できる次の段階でのみ利用できます。

- 拠点滞在中
- 通常Battle中

以下の段階ではPauseを開始できません。

- Battle開始前の準備・初期化中
- Battle結果の確定後
- Battle終了cleanup、Result表示、およびResult操作中
- Clear演出またはGame Over側の死亡演出中
- Retryによる破棄・再初期化中
- Result操作受理後のroute遷移中
- 通常操作を受け付けない画面遷移・演出中

Pause開始後にBattle結果を確定させる処理は進行させません。Pause画面の内容、再開操作、およびPause中も継続する表示・音響の詳細はUI、BGM、および各所有ページで定義します。

## Retry・リセット契約

RetryはGame Over Resultからのみ受け付け、死亡地点からのその場復活には使用しません。現在のBattleを終了し、旧BattleのRuntime状態を破棄したうえで、新しいBattle IDを発行して現在のステージを開始状態から再構築します。Clear ResultではRetryを受け付けず、Continueによって拠点／Stage選択へ戻ります。

Scene Reloadまたはin-place resetのどちらを使用するかは実装上の選択とし、本ページでは指定しません。どちらの方式でも、以下のリセット結果を満たす必要があります。

| 対象 | Retry後の状態 | 詳細の所有者 |
|---|---|---|
| Player | HP／Staminaを全回復し、ステージ開始時のState、位置、向きへ戻す | Player、Stage |
| Enemy | ステージ開始時のEnemy集合、位置、浄化値、HP、行動状態へ戻す | Enemy、Stage |
| Combat | 新しいBattle IDを持つ未確定結果のBattleとして開始し、旧Battleの通知・判定状態を破棄する | Combat |
| BGM／MusicChart | 旧Battleの3時計、音楽同期イベント、およびAudio状態を停止・破棄し、新BattleのBattle開始lifecycleに従って時計停止状態から再構築する | BGM／MusicChart |
| Normal AttackEvent occurrence | 旧Battle分を破棄し、新しいBattle用に最初から再生成する | BGM／AttackEvent |
| Weak AttackEvent | 旧Battle分をすべて破棄する | BGM／AttackEvent、チャージシステム |
| Shaondama | 旧Battleに属するworld objectを持ち越さず、新しい生成要求から出現させる | シャオンダマ、ラジクジラ |
| Reserved／Allocation | Current、Slot、Weakを含む旧Battle分をすべて破棄し、空の状態から開始する | チャージシステム |
| Palette Bullet／Marker／Jaon Bullet | 旧Battleに属するobject、target情報、および保留中の命中処理を持ち越さない | Combat |
| ラジクジラ | 新しいBattleの初期位置、表示、存在状態へ戻す | ラジクジラ、Stage |
| Stage進行・ギミック | 旧BattleのStage objective、wave／Spawn program進行、Clear対象Enemy記録、登録・浄化・正式除外状態を破棄し、Stage定義から開始時の進行度、配置、作動状態を再構築する | Stage |
| UI | HP、Slot、予告、共通Result、操作lock、Pause表示など、旧Battle由来の表示状態を破棄・再構築する | UI |
| 入力・入力バッファ | 旧Battle中の押下状態、予約入力、選択対象を破棄する | Player、入力、UI |
| VFX／SE／演出 | 旧Battleに属し、新Battleへ影響する再生・予約状態を持ち越さない | 演出、各所有システム |

Retry完了後は、新しいBattleとしてBattle開始lifecycleに従って初期化し、必要な準備が完了してからPlayerの戦闘操作を受け付けます。終了したBattleのcleanup済みobjectやStateを初期値として再利用しません。

旧BattleのStage objectiveまたはClear対象Enemy記録へ新しいBattle IDを付け替えて再利用してはいけません。新しいBattle IDを受領したStageは、Stage定義からobjective、wave／Spawn program進行、およびClear対象Enemy記録を再構築します。

旧Battle IDを持つ遅延通知、生成結果、命中、Damage、および浄化結果は、新しいBattleへ適用しません。

## 他システムとの接続

| システム | ゲーム全体での役割 | 詳細ページ |
|---|---|---|
| Player | 移動、回避、対象選択、Charge、HP 0による`Dead`成立、Battle終了時のGameplay State・入力停止、およびPlayer内部のRetry初期化を管理する。死亡演出はGameの確定結果に従う | [Player](/spec/player/)、[Player死亡](/spec/player/player-death)、[Player State](/spec/player/states)、[入力・操作](/spec/player/input-and-controls)、[Playerステータス](/spec/player/player-status) |
| BGM／MusicChart | 音楽進行、シャオンダマ生成内容・タイミング、AttackEvent時刻、Battle終了時の3時計・Gameplay同期通知の停止、およびRetry時の再初期化を管理する | [MusicChart](/spec/bgm/bgm-music-chart)、[シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、[Gameplay接続](/spec/bgm/bgm-gameplay-connection) |
| AttackEvent | BGM上の攻撃タイミング、発火時の結果、使用Reserved、Palette Bullet化対象、およびBattle終了時の未発火処理・snapshot取消を管理する | [AttackEvent](/spec/bgm/bgm-attack-event)、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| ラジクジラ | BGM側の生成要求を受け、通常シャオンダマを世界内へ出現させる | [ラジクジラ](/spec/radiowhale/)、[Gameplayライフサイクル](/spec/radiowhale/gameplay-lifecycle) |
| シャオンダマ・音楽連動 | 世界内へ出現したシャオンダマの存在・挙動と、音・色との関係を管理する | [シャオンダマ・音楽連動](/spec/shaondama-music/) |
| Charge | Playerによる対象選択とCharge入力・成立処理を管理する | [Playerアクション｜チャージ](/spec/player/player-action-charge) |
| チャージシステム | Current／Slot／WeakへのAllocationとReserved状態を管理する | [チャージシステム](/spec/draw-system/)、[Charge Allocation](/spec/draw-system/charge-allocation) |
| Combat | Battle状態、開始・終了通知、Palette Bullet／Marker、命中、浄化判定、Battle終了gate、および必須Combat Ownerのcleanup完了集約を管理する | [戦闘](/spec/combat/)、[Palette Bullet](/spec/combat/palette-bullet)、[Marker](/spec/combat/marker) |
| Enemy | 攻撃対象、所属Battle、Damage、浄化状態、およびStageへの浄化成立通知を管理する。Clear条件や最終Battle結果は確定しない | [敵](/spec/enemy/)、[Damage・浄化](/spec/enemy/damage-and-purify) |
| Stage | Stage objective、wave／Spawn program進行、Clear対象Enemy記録、登録・浄化反映・正式除外、Clear条件評価、対象`battleId`付きClear候補通知、およびRetry時のStage再初期化を管理する。最終Battle結果は確定しない | [ステージ](/spec/stage/) |
| カメラ | 拠点・Battle中の視界と選択対象を表示する | [カメラ](/spec/camera/) |
| UI | 現在状態、Pause、共通ResultのClear／Game Over variant、Result操作lock、および確定route操作の通知を管理する。勝敗は再判定しない | [UI](/spec/ui/) |
| 演出 | 色、音、攻撃結果、Clear、死亡などを視覚・聴覚的に伝える | [演出](/spec/effects/) |

ラジクジラに関する詳細仕様は、役割ごとに以下のページを正本とします。

- ラジクジラそのもの：[ラジクジラ](/spec/radiowhale/)
- Playerとの追従関係：[ラジクジラ｜追従・浮遊](/spec/radiowhale/follow-and-floating)
- シャオンダマの世界内への出現：[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)
- Gameplay上の存在・表示：[ラジクジラ｜Gameplayライフサイクル](/spec/radiowhale/gameplay-lifecycle)
- Animation・VFX・Sound：[ラジクジラ｜Animation・VFX・Sound](/spec/radiowhale/animation-effects-sound)
- 世界観：[ラジクジラ｜キャラクター・世界観](/spec/radiowhale/character-worldbuilding)

## 責務境界

Stageから受け取ったClear候補とGame Over候補の収集、Battle結果の確定、同一フレームに複数の終了候補が成立した場合の優先規則、Clear＋Dead時の非巻き戻しと演出分岐、共通Resultへの接続、Result操作解禁条件、ゲーム全体lifecycle、Battle開始・終了の高レベルな順序、Pause可能範囲、およびRetry時に満たすべき全体リセット結果は、本ページを正本とします。

以下は本ページで再定義しません。

- Player Stateの内部構造とAction遷移
- Charge入力および`success`／`miss`の成立条件
- Current AttackEvent、Slot、Weak、Allocation、Reservedの内部構造
- MusicChartの保存構造
- AttackEventのTimingと結果判定
- シャオンダマの個別lifecycle
- Palette Bullet／Markerの飛翔、衝突、および消滅
- EnemyへのRGB Damage計算と浄化値更新
- Stage objective、wave／Spawn program、Clear対象Enemy記録、およびStage内部のClear条件評価
- UIレイアウト、Result内の表示内容、演出、SEの具体的内容
- RetryにおけるScene Reload／in-place resetなどの内部実装方式

詳細ページが本ページの全体lifecycleと矛盾する場合は、矛盾を放置せず、責務の正本に合わせて該当仕様を更新します。

## 例外・禁止事項

- Charge success時にシャオンダマを即座にPalette Bulletへ変換してはいけません。
- Palette Bullet化してからSlotへ登録してはいけません。
- 所有者・更新規則が定義されていない汚染度をGame Over条件に使用してはいけません。
- BGM／MusicChart開始後に、そのBattle用のBattle IDを発行してはいけません。
- Ready gate成立前に、3時計、Combat受付、またはPlayer戦闘入力を開始してはいけません。
- 論理生成済み、生成要求中、出現演出中、またはGameplayへのhand-off前のシャオンダマをShaondama Supply Readyの最低保証数へ算入してはいけません。
- Ready gate成立時にBGM Audioを開始してはいけません。BGM Audioはsystem pre-roll終了時に音源位置0から開始します。
- Charge開始可否をBGM Audioの再生状態だけで決定してはいけません。
- PlayerのHP 0または`RootState = Dead`だけを根拠に、最終Battle結果の確定前からGame Over表示やRetry受付を開始してはいけません。
- 同一フレームにClearとPlayer Deadが成立してClearを確定した場合、HP 0、`RootState = Dead`、Damage、または成立済みの状態変更を巻き戻してはいけません。
- Clearを確定した場合に、`RootState = Dead`を根拠として死亡演出、Game Over variant、またはRetry受付を開始してはいけません。
- 現在world上に存在するEnemyが0体であることだけを根拠にClear候補を成立させてはいけません。
- pending waveまたはpending Spawn中に、Stage objectiveが`InProgress`のままClear候補を成立させてはいけません。
- GameまたはCombatが、Stage内部のClear対象Enemy記録、wave進行、残りSpawn数、またはobjective状態からClear条件を再計算してはいけません。
- Battle結果確定後または現在と異なる`battleId`で届いたClear候補を、結果評価へ適用してはいけません。
- Battle結果確定後に、後続の命中、Damageや浄化によって結果を変更してはいけません。
- Result／UIまたは各Ownerが、Player HPやEnemy状態からBattle結果を再判定してはいけません。
- Battle結果確定後に、新しい戦闘操作、Charge、生成要求、Enemy Spawn、AttackEvent、Arpeggio、Projectile、Target決定、Hit、Damage、Parry、または浄化を開始してはいけません。
- Battle結果確定後も表示を残すGameplay objectに、Damage、Hit、Parry、Target提供、Chargeへの再利用、またはResult操作の妨害を許可してはいけません。
- 必須Ownerすべてのcleanup完了前にResult操作を解禁してはいけません。
- 任意のVFX、SE、または表示専用objectの終了だけを理由に、必須cleanup完了後もResult操作をlockし続けてはいけません。ただし、Tuningで定義した誤操作防止用の最小待ち時間は適用できます。
- Result操作lock中の入力を保存し、解禁後にContinue／Retryとして遅延実行してはいけません。
- 1つのResult操作から複数のroute遷移を開始してはいけません。
- 同じBattle終了通知に対してcleanupを複数回実行したり、同じReserved、Slot、参照、またはobjectを二重に解放・破棄したりしてはいけません。
- 現在と異なるBattle IDのGameplay通知、Damage、生成結果、callback、またはcleanup完了通知を適用してはいけません。
- Clear演出としてのシャオンダマ破裂から、Weak攻撃、Damage、またはAttackEventを発生させてはいけません。
- Retry後に、旧BattleのShaondama、Reserved、Allocation、Weak AttackEvent、Palette Bullet、Marker、Enemy状態、Stage objective、Clear対象Enemy記録、入力、UI状態を持ち越してはいけません。
- ラジクジラへChargeやAttackEventの成立判定を担当させてはいけません。
- 個別システムの内部仕様を本ページで重複定義してはいけません。

## パラメータ

- Result操作の誤操作防止用最小待ち時間を設ける場合、その値はTuningで管理します。本ページでは固定値を定めません。

## 未決事項

Battle IDのデータ型・採番方式、Battle開始前の準備演出、Result画面の具体的なレイアウト・表示文言、Clear／Game Over時の演出・SE、誤操作防止用最小待ち時間の採用可否と値、およびPause画面の詳細は、実装、Tuning、または各所有ページで定義します。これらは本ページが定義するGameplay上のBattle順序・結果規則を変更しません。

従来Q-01〜Q-03として管理していたBattle結果、同一フレーム優先規則、および終了後の接続は、本ページの「Battle結果の確定規則」「Battle終了lifecycle」「Result接続」の内容で決定済みです。

上位方針とResult接続は決定済みですが、AttackEvent、Charge Allocation、BGM同期、Palette Bullet、Marker、Jaon Bullet、シャオンダマ、Player State／Damageなど各Ownerページへのcleanup契約の同期、および「Parry／Jaon Bullet／Wildcard」「Playerの同一フレームDamage」「各Owner固有の通常lifecycle」確定後の逆監査が残っています。次を横断確認できるまでは、本ページのstatusを`仮仕様`とします。

- 結果確定後にGameplay処理が残らないこと
- 各Ownerのcleanupが一度だけ実行されること
- 旧Battle IDの通知を拒否できること
- 必須cleanup完了がResult操作解禁へ接続されること

## 関連タスク

<PageRelations />
