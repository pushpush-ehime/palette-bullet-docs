---
title: 戦闘
description: Palette BulletのCombat lifecycleと戦闘状態
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

本ページは、`NonCombat`／`Combat`の定義と遷移、Battle識別情報、Battle開始・終了通知、Combat中の処理受付可否、Pause中のCombat state、およびRetry時に破棄するCombat所有runtimeの正本です。

Clear／Game Overの条件、同時成立時の優先順位、およびゲーム全体におけるBattle開始・終了の高レベルな順序は、[ゲーム全体](/spec/game/)を正本とします。個別の攻撃、Damage、演出などの内部仕様は、それぞれの仕様ページで定義します。

## Combat stateの管理

Combat Systemは、以下の2つのCombat stateを管理します。

| Combat state | 定義 | 戦闘処理の受付 |
|---|---|---|
| `NonCombat` | Combatの進行が停止し、Battle中の戦闘処理を受け付けない状態 | 受け付けない |
| `Combat` | Battle開始処理が完了し、Battle終了処理が完了するまでCombat lifecycleが有効な状態 | Battle結果未確定かつPause中でない場合に受け付ける |

Combat stateは、Playerの`RootState`、`MovementState`、`ActionState`、`AimState`、`ReactionState`とは独立して管理します。Player Stateが変化しても、それだけを理由にCombat stateを切り替えません。

Pause専用の第3のCombat stateは設けません。Pause中の扱いは、[Pause](#pause)で定義します。

## Battle識別情報

Combat Systemは、開始するBattleごとに、過去および後続のBattleと区別できるBattle識別情報を割り当てます。

- Battle識別情報は、対象Battleの戦闘BGM／MusicChart、音楽時計、および初期シャオンダマ生成を開始する前に割り当てます。
- 割り当てた`battleId`は、BGM／MusicChart、Spawn、Enemy、Player、Stage、ラジクジラ、および対象Battleへ参加する各システムへ事前に配布します。
- Battle開始通知とBattle終了通知には、対象Battleの識別情報を含めます。
- Battleに属する戦闘処理、通知、およびRuntime objectは、どのBattleに属するかを判別できる状態にします。
- 現在のBattleと一致しない識別情報を持つ処理要求や遅延結果を、現在のBattleへ適用してはいけません。
- Retry後に開始するBattleには、Retry前のBattleと区別できる識別情報を割り当てます。
- 識別情報のデータ型、採番方式、保存形式は実装側で決定します。

Battle開始通知のpayloadは、最低限`battleId`を含みます。この通知によってBattle IDを必要な各システムへ配布し、受信側は通知の`battleId`が自身の準備対象と一致する場合だけ、対象Battleの開始処理を進めます。CombatのGameplay受付開始は、通知直後ではなく、BGM／MusicChartと初期生成を含む必要な準備が完了して`Combat`へ遷移した時点です。

| 主な受信先 | Battle IDを使用する目的 |
|---|---|
| BGM／MusicChart・AttackEvent | 音楽時計、NoteEvent occurrence、生成要求、AttackEventを対象Battleへ帰属させる |
| Spawn・ラジクジラ・シャオンダマ | 生成要求と生成された個体を対象Battleへ帰属させる |
| Enemy・Player・Stage | Battle参加状態、Damage／死亡、Clear対象集合と結果候補を対象Battleへ帰属させる |
| Combat・Palette Bullet・Marker | Combat受付、発射物、target情報、命中処理を対象Battleへ帰属させる |

## Battle開始lifecycle

Battle開始時は、[ゲーム全体](/spec/game/)で定義された準備順に従い、以下の順序でCombatを開始します。

1. Stage、Player、Enemy、ラジクジラ、およびBattle参加対象の準備完了を確認する
2. 前のBattleに属するCombat runtimeが残っていないことを確認する
3. Battle開始要求を受け、新しいBattle識別情報を割り当てる
4. `battleId`を含むBattle開始通知を1回だけ発行し、必要な各システムへBattle IDを配布する
5. 同じ`battleId`で戦闘BGM／MusicChartを開始する
6. 音楽時計を開始し、初期NoteEvent occurrenceと初期シャオンダマ生成を開始する
7. 初期生成を含む必要な準備の完了を確認する
8. Combat stateを`NonCombat`から`Combat`へ遷移させる
9. Combat開始完了後にPlayerの戦闘操作受付を許可する

```text
Stage・Battle参加対象の準備完了
↓
新しいBattle識別情報を割り当てる
↓
`battleId`を含むBattle開始通知を発行し、必要な各システムへ配布する
↓
同じ`battleId`で戦闘BGM／MusicChartを開始する
↓
音楽時計・初期シャオンダマ生成を開始する
↓
必要な準備の完了を確認する
↓
NonCombat → Combat
↓
Playerの戦闘操作受付を許可する
```

- Combat Systemは、Combat開始後に戦闘BGMへの切り替えを自律的に開始しません。
- Battle IDの配布前、またはBattle IDが一致しない状態で、BGM／MusicChartや初期生成を開始しません。
- BGM／MusicChartの音楽時計とAttackEventの進行はBGM側の仕様を正本とします。
- 準備未完了、またはすでに`Combat`である場合は、新しいBattleを開始しません。
- 同じBattleに対するBattle開始通知を複数回発行しません。
- Battle開始通知の発行前に、前のBattleに属する確定結果、通知済み状態、および保留中のCombat処理が残っていてはいけません。

## Combat中の処理受付

Combat Systemは、以下のすべてを満たす場合にのみ、新しい戦闘進行または遅延結果を受け付けます。

- Combat stateが`Combat`である
- 現在のBattle識別情報と処理対象のBattle識別情報が一致する
- Battle結果が未確定である
- Pause中ではない
- Battle終了処理を開始していない

受付対象は、次の2種類に分けます。

- **新規処理:** 新しい戦闘操作、Charge、シャオンダマ生成要求、AttackEvent／Arpeggio開始、Allocation、Palette Bullet／Markerを含む攻撃開始
- **遅延結果:** すでに開始済みの処理から遅れて届く生成完了、衝突、命中、Damage、浄化、結果候補

| 受付種別 | 結果未確定・非Pause・終了前 | Pause中 | 結果確定後／終了処理中 | Battle ID不一致 |
|---|---|---|---|---|
| 新規処理 | 受け付ける | 受け付けない。所有システムも発生を停止する | 受け付けない | 受け付けない |
| 遅延結果 | `battleId`を照合して受け付ける | 適用しない。保持が必要な場合は所有者が保留し、Resume後に全受付条件を再照合する | Gameplayへ適用せず、新しいDamage・浄化・結果候補を発生させない | 破棄し、現在のBattleへ適用しない |
| 終了演出通知 | Gameplay処理とは分離して扱う | 各演出のPause規則に従う | 表示・音響だけ継続可能。Damage等へ変換しない | 現在のBattleのGameplayへ適用しない |

- Clear候補はEnemy／Stage側から、Game Over候補はPlayer側から、ゲーム全体の結果確定処理へ渡します。
- Clear／Game Overの条件、Unity上の同一フレームを単位とする候補収集、同一フレームでのClear優先、および最終結果の一回確定は、[ゲーム全体](/spec/game/)を参照します。
- Combat Systemは、独自のClear／Game Over条件や優先順位を追加せず、確定結果を再判定しません。
- Charge、Allocation、Reserved、AttackEvent、Palette Bullet、Marker、Damage、および浄化の内部成立条件は、各所有ページを正本とします。

## Pause

Pause可能なゲーム段階は、[ゲーム全体](/spec/game/)を正本とします。Pauseは、通常操作が可能な拠点滞在中および通常Battle中に限って開始できます。

通常Battle中にPauseした場合は、以下のように扱います。

- Combat stateは`Combat`のまま維持します。
- Battle識別情報を維持します。
- Battle開始通知およびBattle終了通知を発行しません。
- 戦闘進行とBattle結果の確定処理を進めません。
- Resume時は再初期化を行わず、同じBattle識別情報とCombat stateでBattleを継続します。

拠点滞在中のPauseでは、Combat stateを`NonCombat`のまま維持し、Battle開始通知やBattle終了通知を発行しません。

BGM、AttackEvent、および未完了ArpeggioのPause／Resume時の停止・再開は、[BGM｜Gameplayとの接続](/spec/bgm/bgm-gameplay-connection)を正本とします。Pause画面と入力の詳細はUI側の仕様で定義します。

## Battle終了lifecycle

[ゲーム全体](/spec/game/)の規則によりBattle結果が1つに確定した場合、Combat Systemは以下の順序でBattleを終了します。

1. 確定したBattle結果と対象Battle識別情報を受け取る
2. 新規処理の受付と、Damage／浄化を含む遅延結果のGameplay適用を閉じる
3. Battle識別情報と確定結果を含むBattle終了通知を1回だけ発行する
4. 各所有システムが未発火処理をcancelし、既存objectをGameplay上無効化する
5. 終了演出として残すobjectをGameplay処理から切り離す
6. Combatの戦闘進行を停止する
7. Combat stateを`Combat`から`NonCombat`へ遷移させる
8. Clear側または死亡・Game Over側の処理へ移行する

```text
Battle結果を1つに確定する
↓
新しい戦闘処理とDamage適用を閉じる
↓
Battle終了通知
↓
未発火処理をcancelし、既存objectをGameplay上無効化する
↓
終了演出をGameplay処理から切り離す
↓
Combatの戦闘進行を停止する
↓
Combat → NonCombat
↓
Clear側またはGame Over側の処理へ移行する
```

- Battle終了処理は、同じBattleに対して1回だけ実行します。
- 同じBattleに対するBattle終了通知を複数回発行しません。
- Battle終了処理中に別の結果候補を受け取っても、確定済み結果を変更せず、終了処理を再実行しません。
- 結果確定後に到着した遅延命中、Damage、浄化、および演出上の結果はGameplayへ適用せず、確定済みのBattle結果を変更できません。
- BGM、MusicChart、およびBGM同期イベントの具体的な停止方法は、[BGM｜Gameplayとの接続](/spec/bgm/bgm-gameplay-connection)を正本とします。

## Battle終了時の既存object

Battle結果の確定時点ですでに存在するPalette Bullet、Marker、シャオンダマ、および保留中の命中処理は、結果確定直後にGameplay上無効化します。即時消去するか、終了演出として一時的に表示を残すかは各所有ページで定義します。

ただし、以下の全体条件を満たす必要があります。

- 飛翔中Palette Bulletと保留中の命中処理は、結果確定後にDamageを発生させない
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
| 保留中の命中・Damage通知 | `battleId`と結果状態を再照合し、結果確定後は破棄する | Combat、Palette Bullet、Enemy Damage |
| 残存シャオンダマ | 終了演出と自然破裂を区別し、終了演出からGameplay出力を出さない | シャオンダマ、演出 |

## Retry

Retryは、旧BattleのCombat stateやRuntime状態を再利用する処理ではありません。[ゲーム全体](/spec/game/)のRetry・リセット契約に従い、旧Battleを破棄して新しいBattleとして開始します。

Combat Systemは、Retry時に以下を行います。

1. Combat stateを`NonCombat`にする
2. 旧Battleの確定結果を破棄する
3. 旧BattleのBattle開始通知済み・Battle終了通知済み状態を破棄する
4. 旧BattleのBattle識別情報を現在のBattleとして扱わない状態にする
5. 保留中のCombat処理、遅延命中、および結果通知を破棄する
6. 旧Battleに属するPalette BulletとMarkerを次のBattleへ持ち越さない
7. Stageなどの再構築完了後、通常のBattle開始lifecycleを`NonCombat`からやり直す

Retry後に開始するBattleは、新しいBattle識別情報を持ちます。Scene Reloadまたはin-place resetのどちらを使用するかは本ページでは規定しません。

新しいBattle識別情報は、Retry後のBGM／MusicChartと音楽時計を開始する前に割り当てて配布します。旧Battle IDを持つ処理は、新しいBattleの開始後も受け付けません。

Player、Enemy、BGM／MusicChart、AttackEvent、Stage、UIなどの内部リセットは、それぞれの所有ページを正本とします。

## 責務境界

| 対象 | 本ページが定義すること | 正本・詳細ページ |
|---|---|---|
| Game | Combat stateと開始・終了通知をGame全体lifecycleへ接続する | [ゲーム全体](/spec/game/) |
| Stage | Stageの準備完了後にCombatを開始し、Battle終了後のStage進行・Retry再構築へ接続する | [ステージ](/spec/stage/) |
| Player死亡 | Game Over候補と確定結果をCombat終了へ接続する | [Player死亡](/spec/player/player-death) |
| BGM／MusicChart | BGM開始前のBattle ID受領と、Battle終了・Pause・Retry通知の接続境界を示す | [BGM｜Gameplayとの接続](/spec/bgm/bgm-gameplay-connection) |
| Charge／Allocation | Combat中と結果未確定時だけ新規処理を受け付ける境界を示す | [Charge Allocation](/spec/draw-system/charge-allocation) |
| AttackEvent | Combat中の実行境界と、結果確定後の新規開始停止を示す | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Enemy Damage／浄化 | Clear候補をゲーム全体の結果確定へ渡す境界を示す | [Damage・浄化](/spec/enemy/damage-and-purify) |
| Palette Bullet | Battle終了・Retry通知を受ける境界を示す | [Palette Bullet](/spec/combat/palette-bullet) |
| Marker | Battle終了・Retry通知を受ける境界を示す | [Marker](/spec/combat/marker) |
| UI／演出 | Combat state、Pause、および確定結果の通知境界を示す | [UI](/spec/ui/)、[演出](/spec/effects/) |

本ページでは、以下を再定義しません。

- Clear／Game Overの条件、候補収集、同時成立時の優先順位
- StageのEnemy集合、初期配置、進行、ギミック
- PlayerのHP、Dead、死亡モーション
- BGM／MusicChartの音楽時計と同期処理
- Charge、Allocation、Reservedの内部処理
- AttackEventの成立判定
- Palette Bullet／Markerの飛翔、衝突、Target消失、消滅
- EnemyへのRGB Damage計算と浄化値更新
- UI、VFX、SE、および終了演出
- RetryにおけるScene Reload／in-place resetの選択

## 例外・禁止事項

- Combat Systemが独自のClear／Game Over条件または優先順位を定義してはいけません。
- Battle IDの発行・配布より前に、戦闘BGM／MusicChart、音楽時計、初期生成を開始してはいけません。
- Combat開始後に、Combat Systemが戦闘BGM／MusicChartの開始を要求してはいけません。
- Battle参加対象の準備完了前に`Combat`へ遷移してはいけません。
- 同じBattleに対してBattle開始通知、Battle終了通知、またはBattle終了処理を複数回実行してはいけません。
- Battle結果確定後に、新しい戦闘操作、Charge、生成要求、AttackEvent、Arpeggio、Allocation、攻撃、Damage、または浄化を開始してはいけません。
- Pauseを`NonCombat`への遷移、Battle終了、または新しいBattle開始として扱ってはいけません。
- 現在のBattleと一致しないBattle識別情報を持つ遅延処理を、現在のBattleへ適用してはいけません。
- Retry後に、旧Battleの識別情報、確定結果、通知済み状態、遅延命中、Palette Bullet、Markerを持ち越してはいけません。
- Palette Bullet／Markerの未確定な内部lifecycleを本ページで推測して補完してはいけません。

## パラメータ

なし

## 未決事項

Battle IDのデータ型・採番方式と、終了演出として残す各objectの具体的な表示終了方法は、実装または各所有ページで定義します。これらはCombatの受付条件や結果確定後のGameplay無効化を変更しません。

Q-01〜Q-03でCombat lifecycleの主要挙動は決定済みです。ただし、AttackEvent、Palette Bullet、Marker、シャオンダマ、BGMなど各正本へのcancel／release契約の同期と横断確認が完了するまでは、本ページのstatusを`仮仕様`とします。

## 関連タスク

<PageRelations />
