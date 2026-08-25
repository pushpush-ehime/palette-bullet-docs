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
| Battleの目的 | ステージ内の対象Enemyをすべて浄化し、Clearを目指す | 確定 |
| Player死亡後 | その場では復活せず、Retryによってステージを最初から開始する | 確定 |

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
ClearまたはGame Over
↓
終了側の画面・演出
↓
次の進行またはRetry
```

各画面の構成、遷移演出、Fade、SE、およびリザルトの表示内容はUI／演出側の仕様を正本とします。

## 基本戦闘フロー

ゲーム全体における基本的な戦闘フローは、以下の通りです。

1. Stage、Player、Enemy、およびBattle参加対象を初期化する
2. Battle開始処理を開始し、新しいBattle IDを発行する
3. Battle IDを必要な各システムへ配布する
4. 同じBattle IDを使用して戦闘BGM／MusicChartを開始する
5. 音楽時計を開始し、初期NoteEvent occurrenceと初期シャオンダマ生成要求を作成する
6. 初期生成を含む必要な準備が完了した後、Combatの受付とPlayerの戦闘操作を開始する
7. BGM／MusicChartが、生成するシャオンダマと生成タイミングを決定する
8. 生成要求を受けたラジクジラが、シャオンダマを世界内へ出現させる
9. AttackEventを予告する
10. Playerが世界内の選択可能なシャオンダマからCharge対象を選択する
11. Charge判定を行い、Normal AttackEventのCurrent／SlotまたはWeak AttackEventへAllocationする
12. Charge successとなったシャオンダマをReservedとして保持する
13. AttackEventを発火する
14. Complete／Incomplete／Zero ChargeまたはWeakの結果を解決する
15. 使用するReserved Shaondamaを確定し、Palette Bullet化する
16. Chord／Arpeggio／Weakの規則に従ってPalette Bulletを発射する
17. Palette Bulletの命中、Enemy Damage、および浄化を処理する
18. 同一フレーム内のClear候補とGame Over候補を収集し、Battle結果を確定する
19. Battle結果が未確定である間、7から18までを繰り返す

Charge success時には、シャオンダマを即座にPalette Bullet化しません。Charge success時の到達点はAllocationおよびReserved化であり、Palette Bullet化はAttackEvent発火時に、使用するReserved Shaondamaが確定した後で行います。

Allocation、Reserved、AttackEvent結果、使用対象の選択、Chord／Arpeggio／Weakの各規則は、それぞれの正本となる仕様ページで定義します。

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
| Battle開始前 | Stage、Player、Enemy、Battle参加対象を初期化する | Stage、Combat、Player、Enemy、BGM、UI |
| 通常Battle | Playerが移動・回避・状況確認を行い、戦闘BGM／MusicChartが進行する | Player、カメラ、Enemy、Combat、BGM、UI |
| シャオンダマ生成 | BGM／MusicChartが生成対象を決定し、ラジクジラが世界内へ出現させる | BGM、MusicChart、ラジクジラ、シャオンダマ |
| AttackEvent予告 | AttackEventに向けてPlayerが攻撃構成を準備する | BGM、AttackEvent、UI |
| シャオンダマ選択・Charge | Playerが対象を選択し、Charge判定、Allocation、Reserved化までを行う | Player、シャオンダマ、Charge、チャージシステム |
| AttackEvent発火・発射 | 結果と使用Reservedを確定し、Palette Bullet化して発射する | Player、BGM、AttackEvent、チャージシステム、Combat、Enemy、演出 |
| Clear処理 | Battle結果をClearとして固定し、戦闘を終了してClear側の処理へ移行する | Game、Combat、Stage、BGM、UI、演出 |
| Game Over処理 | Battle結果をGame Overとして固定し、Player死亡側の処理へ移行する | Game、Player、Combat、Stage、BGM、UI、演出 |
| Retry | 旧BattleのRuntime状態を破棄し、ステージ開始状態を再構築する | Game、Stage、Player、Enemy、Combat、BGM、UI |

Playerの具体的なRootState、ActionState、および遷移条件はPlayer仕様を正本とします。

## Battle開始lifecycle

Battle開始時は、以下の高レベルな順序で処理します。

```text
Stageを準備する
↓
Player、Enemy、ラジクジラなどのBattle参加対象を初期化する
↓
Battle開始処理を開始し、新しいBattle IDを発行する
↓
Battle IDを必要な各システムへ配布する
↓
同じBattle IDで戦闘BGM／MusicChartを開始する
↓
音楽時計を開始する
↓
初期NoteEvent occurrenceと初期シャオンダマ生成要求を作成する
↓
初期生成を含む必要な準備の完了を確認する
↓
Combatの受付を開始する
↓
Playerの戦闘操作を受け付ける
```

- Battle IDは、戦闘BGM／MusicChart、音楽時計、および初期シャオンダマ生成より前に存在しなければなりません。
- Battle IDは、Stage、Player、Enemy、Combat、BGM／MusicChart、AttackEvent、ラジクジラ、およびシャオンダマ生成処理など、対象Battleへ参加するシステムへ配布します。
- 初期NoteEvent occurrence、生成要求、シャオンダマ、AttackEvent occurrence、Palette Bullet、Marker、およびDamage通知は、同じBattle IDへ帰属し、後続処理へその帰属を引き継ぎます。
- Playerの戦闘操作は、必要なBattle参加対象の初期化とCombat開始が完了するまで受け付けません。
- Battle開始前に、前のBattleに属するRuntime状態を参照してはいけません。
- 個々のシステムの内部初期化手順は各所有ページで定義しますが、Playerの操作受付開始より前に必要な初期化を完了させます。

## Clear・Game Over

| 判定 | 条件 | 判定後 |
|---|---|---|
| Clear候補 | 対象BattleのClear対象Enemy集合に属するすべてのEnemyが浄化済みになる | 結果確定規則へ渡す |
| Game Over候補 | Playerの`CurrentHP <= 0`となり、`RootState = Dead`が成立する | 結果確定規則へ渡す |

Clear対象Enemy集合には、Battle開始時の戦闘対象Enemyに加え、戦闘中に動的Spawnして戦闘対象となったEnemyも追加します。Enemyが遠くへ移動しただけでは対象から外しません。特殊イベントによる正式な除外だけをStageが明示的に行い、背景演出用など戦闘Enemyではない存在は含めません。集合の登録・更新・除外手続きは[ステージ](/spec/stage/)を正本とします。

Game Over後は、Player仕様に従って死亡モーション、死亡画面、Retryへ接続します。

汚染度は現在のGame Over条件として使用しません。将来Game Over条件へ追加する場合は、値の所有者、増減条件、上限、UI表示、およびHP条件との優先関係を別途仕様化してから、本ページへ追加します。

## Battle結果の確定規則

- Clear候補とGame Over候補の収集単位は、Unity上の同一フレームです。
- 各フレームでは、そのフレームの候補発生処理を完了してから結果評価を1回だけ行います。先に届いた候補だけで即時確定せず、同一フレーム内の両候補を評価対象に含めます。
- 1回のBattleで確定できる最終結果は、ClearまたはGame Overのいずれか1つだけです。
- 同一フレーム内にClear候補だけが成立した場合はClear、Game Over候補だけが成立した場合はGame Over、両方が成立した場合は**Clearを優先**します。
- Battle結果は一度だけ確定します。確定後の命中、浄化、Damage、演出、通知によって結果を変更しません。
- 結果確定後に既存の命中演出や終了演出を継続する場合も、Clear／Game Overの再判定は行いません。
- 各システムは、確定済み結果を受け取り、独自に別のBattle結果を確定してはいけません。

## Battle終了lifecycle

ClearまたはGame Overの候補が成立した場合は、以下の高レベルな順序で終了処理を行います。

```text
Clear／Game Over候補を収集する
↓
優先規則に従ってBattle結果を1つに確定する
↓
新しいGameplay処理の受付を停止する
↓
各システムへBattle終了と確定結果を通知する
↓
開始済みGameplay処理をcancelまたはGameplay上無効化する
↓
終了演出として残すobjectをGameplay処理から切り離す
↓
BGM同期イベントとCombatの戦闘進行を停止する
↓
Clear側または死亡・Game Over側の処理へ移行する
```

- Battle結果確定後は、新しいAttackEvent、Arpeggio、シャオンダマ生成、Charge、Allocation、攻撃発射、Damage、浄化を開始しません。
- 開始済みArpeggioの未発火Entryと、AttackEventの未発火分は停止します。snapshot、Reserved、およびAllocationのcancel／release手順はAttackEventとチャージシステムの正本で定義します。
- 飛翔中のPalette Bulletと保留中の命中処理は、見た目を終了演出として一時的に残す場合でも、結果確定後にDamageを発生させません。
- Clear時に残っているシャオンダマは、終了演出として一斉に破裂させても構いません。この破裂は通常の自然破裂とは区別し、Weak攻撃、Damage、新しいAttackEventを発生させません。
- Game Over時も、結果確定後に新しいGameplay上のDamageを発生させない原則は同じです。
- 終了通知には、確定したBattle結果と終了対象Battleを識別できる情報を含めます。
- 各システムは終了通知を複数回受けても、同じBattleに対する終了処理を重複実行してはいけません。
- 終了時点ですでに存在する演出やRuntime objectの視覚的な消滅時点は各所有ページで定義します。ただし、Gameplay上の無効化はBattle結果確定直後に行い、新しいDamageや戦闘結果を発生させてはいけません。
- BGM、MusicChart、およびBGM同期イベントの具体的な停止方法はBGM側の仕様を正本とします。

| 結果確定時の対象 | 全体条件 | 詳細の所有者 |
|---|---|---|
| 新しい戦闘操作・生成・Charge・攻撃 | 受付を停止する | Combat、各入力所有システム |
| 未発火AttackEvent・Arpeggio | 未発火分をcancelし、新しい弾とDamageを発生させない | BGM／AttackEvent |
| snapshot・Reserved・Allocation | 二重弾化・二重解放を避けてcancel／releaseする | AttackEvent、チャージシステム |
| 飛翔中Palette Bullet・保留命中 | Gameplay上無効化し、以後Damageを発生させない | Palette Bullet、Combat |
| Marker | 現在targetとして利用不能にし、表示終了方法は専用ページで定義する | Marker、Combat |
| 残存シャオンダマ | Clear演出で破裂可能だが、自然破裂のWeak攻撃を発生させない | シャオンダマ、演出 |
| 音楽時計・同期イベント | Battle終了通知に従って停止する | BGM／MusicChart |

## Pause

Pauseは、Playerが通常操作できる次の段階でのみ利用できます。

- 拠点滞在中
- 通常Battle中

以下の段階ではPauseを開始できません。

- Battle開始前の準備・初期化中
- Battle結果の確定後
- Clear処理およびClear演出中
- Playerの死亡モーションおよびGame Over処理中
- Retryによる破棄・再初期化中
- 通常操作を受け付けない画面遷移・演出中

Pause開始後にBattle結果を確定させる処理は進行させません。Pause画面の内容、再開操作、およびPause中も継続する表示・音響の詳細はUI、BGM、および各所有ページで定義します。

## Retry・リセット契約

Retryは死亡地点からのその場復活ではありません。現在のBattleを終了し、旧BattleのRuntime状態を破棄したうえで、対象ステージを開始状態から再構築します。

Scene Reloadまたはin-place resetのどちらを使用するかは実装上の選択とし、本ページでは指定しません。どちらの方式でも、以下のリセット結果を満たす必要があります。

| 対象 | Retry後の状態 | 詳細の所有者 |
|---|---|---|
| Player | HP／Staminaを全回復し、ステージ開始時のState、位置、向きへ戻す | Player、Stage |
| Enemy | ステージ開始時のEnemy集合、位置、浄化値、HP、行動状態へ戻す | Enemy、Stage |
| Combat | 新しいBattle IDを持つ未確定結果のBattleとして開始し、旧Battleの通知・判定状態を破棄する | Combat |
| BGM／MusicChart | 旧Battleの音楽時計と同期イベントを停止・破棄し、0から再開始する | BGM／MusicChart |
| Normal AttackEvent occurrence | 旧Battle分を破棄し、新しいBattle用に最初から再生成する | BGM／AttackEvent |
| Weak AttackEvent | 旧Battle分をすべて破棄する | BGM／AttackEvent、チャージシステム |
| Shaondama | 旧Battleに属するworld objectを持ち越さず、新しい生成要求から出現させる | シャオンダマ、ラジクジラ |
| Reserved／Allocation | Current、Slot、Weakを含む旧Battle分をすべて破棄し、空の状態から開始する | チャージシステム |
| Palette Bullet／Marker | 旧Battleに属するobject、target情報、および保留中の命中処理を持ち越さない | Combat |
| ラジクジラ | 新しいBattleの初期位置、表示、存在状態へ戻す | ラジクジラ、Stage |
| Stage進行・ギミック | ステージ開始時の進行度、配置、作動状態へ戻す | Stage |
| UI | HP、Slot、予告、結果表示、Pause表示など、旧Battle由来の表示状態を破棄・再構築する | UI |
| 入力・入力バッファ | 旧Battle中の押下状態、予約入力、選択対象を破棄する | Player、入力、UI |
| VFX／SE／演出 | 旧Battleに属し、新Battleへ影響する再生・予約状態を持ち越さない | 演出、各所有システム |

Retry完了後は、Battle開始lifecycleに従って初期化し、必要な準備が完了してからPlayerの戦闘操作を受け付けます。

旧Battle IDを持つ遅延通知、生成結果、命中、Damage、および浄化結果は、新しいBattleへ適用しません。

## 他システムとの接続

| システム | ゲーム全体での役割 | 詳細ページ |
|---|---|---|
| Player | 移動、回避、対象選択、Charge、HP 0によるDead、およびPlayer内部のRetry初期化を管理する | [Player](/spec/player/)、[Player死亡](/spec/player/player-death)、[Playerステータス](/spec/player/player-status) |
| BGM／MusicChart | 音楽進行、シャオンダマ生成内容・タイミング、AttackEvent時刻、Battle終了・Retry時の音楽時計を管理する | [MusicChart](/spec/bgm/bgm-music-chart)、[シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、[Gameplay接続](/spec/bgm/bgm-gameplay-connection) |
| AttackEvent | BGM上の攻撃タイミング、発火時の結果、使用Reserved、およびPalette Bullet化対象を確定する | [AttackEvent](/spec/bgm/bgm-attack-event)、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| ラジクジラ | BGM側の生成要求を受け、通常シャオンダマを世界内へ出現させる | [ラジクジラ](/spec/radiowhale/)、[Gameplayライフサイクル](/spec/radiowhale/gameplay-lifecycle) |
| シャオンダマ・音楽連動 | 世界内へ出現したシャオンダマの存在・挙動と、音・色との関係を管理する | [シャオンダマ・音楽連動](/spec/shaondama-music/) |
| Charge | Playerによる対象選択とCharge入力・成立処理を管理する | [Playerアクション｜チャージ](/spec/player/player-action-charge) |
| チャージシステム | Current／Slot／WeakへのAllocationとReserved状態を管理する | [チャージシステム](/spec/draw-system/)、[Charge Allocation](/spec/draw-system/charge-allocation) |
| Combat | Battle状態、開始・終了通知、Palette Bullet／Marker、命中、および浄化判定を管理する | [戦闘](/spec/combat/)、[Palette Bullet](/spec/combat/palette-bullet)、[Marker](/spec/combat/marker) |
| Enemy | 攻撃対象、Damage、浄化状態、およびClear候補の成立を管理する | [敵](/spec/enemy/)、[Damage・浄化](/spec/enemy/damage-and-purify) |
| Stage | 初期配置、Clear対象Enemy集合、Stage進行、およびRetry時のStage再初期化を管理する | [ステージ](/spec/stage/) |
| カメラ | 拠点・Battle中の視界と選択対象を表示する | [カメラ](/spec/camera/) |
| UI | 現在状態、Pause、死亡画面、Clear／Game OverおよびResult表示を管理する | [UI](/spec/ui/) |
| 演出 | 色、音、攻撃結果、Clear、死亡などを視覚・聴覚的に伝える | [演出](/spec/effects/) |

ラジクジラに関する詳細仕様は、役割ごとに以下のページを正本とします。

- ラジクジラそのもの：[ラジクジラ](/spec/radiowhale/)
- Playerとの追従関係：[ラジクジラ｜追従・浮遊](/spec/radiowhale/follow-and-floating)
- シャオンダマの世界内への出現：[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)
- Gameplay上の存在・表示：[ラジクジラ｜Gameplayライフサイクル](/spec/radiowhale/gameplay-lifecycle)
- Animation・VFX・Sound：[ラジクジラ｜Animation・VFX・Sound](/spec/radiowhale/animation-effects-sound)
- 世界観：[ラジクジラ｜キャラクター・世界観](/spec/radiowhale/character-worldbuilding)

## 責務境界

ゲーム結果、ゲーム全体lifecycle、Battle開始・終了の高レベルな順序、Pause可能範囲、およびRetry時に満たすべき全体リセット結果は、本ページを正本とします。

以下は本ページで再定義しません。

- Player Stateの内部構造とAction遷移
- Charge入力および`success`／`miss`の成立条件
- Current AttackEvent、Slot、Weak、Allocation、Reservedの内部構造
- MusicChartの保存構造
- AttackEventのTimingと結果判定
- シャオンダマの個別lifecycle
- Palette Bullet／Markerの飛翔、衝突、および消滅
- EnemyへのRGB Damage計算と浄化値更新
- UIレイアウト、表示内容、演出、SEの具体的内容
- RetryにおけるScene Reload／in-place resetなどの内部実装方式

詳細ページが本ページの全体lifecycleと矛盾する場合は、矛盾を放置せず、責務の正本に合わせて該当仕様を更新します。

## 例外・禁止事項

- Charge success時にシャオンダマを即座にPalette Bulletへ変換してはいけません。
- Palette Bullet化してからSlotへ登録してはいけません。
- 所有者・更新規則が定義されていない汚染度をGame Over条件に使用してはいけません。
- BGM／MusicChart開始後に、そのBattle用のBattle IDを発行してはいけません。
- Battle結果確定後に、後続の命中、Damageや浄化によって結果を変更してはいけません。
- Battle結果確定後に、新しい戦闘操作、Charge、生成要求、AttackEvent、Arpeggio、攻撃、Damage、浄化を開始してはいけません。
- Clear演出としてのシャオンダマ破裂から、Weak攻撃、Damage、またはAttackEventを発生させてはいけません。
- Retry後に、旧BattleのShaondama、Reserved、Allocation、Weak AttackEvent、Palette Bullet、Marker、Enemy状態、入力、UI状態を持ち越してはいけません。
- ラジクジラへChargeやAttackEventの成立判定を担当させてはいけません。
- 個別システムの内部仕様を本ページで重複定義してはいけません。

## パラメータ

なし

## 未決事項

Battle IDのデータ型・採番方式、Battle開始前の準備演出、Result画面の表示内容、Clear／Game Over時の演出・SE、およびPause画面の詳細は、実装または各所有ページで定義します。これらは本ページが定義するGameplay上のBattle順序・結果規則を変更しません。

Q-01〜Q-03でBattle lifecycleの主要挙動は決定済みです。ただし、AttackEvent、Palette Bullet、Marker、シャオンダマ、BGMなど各正本へのcancel／終了演出契約の同期と横断確認が完了するまでは、本ページのstatusを`仮仕様`とします。

## 関連タスク

<PageRelations />
