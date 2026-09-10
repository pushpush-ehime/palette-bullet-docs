---
title: "機能間の接続契約・共通ルール"
description: "機能間の要求・通知・参照、所有者、時間、開始終了、実装との差分と協議事項を整理する"
pageType: spec
category: 共通技術
order: 5
status: 仮仕様
relatedTasks: []
---

# 機能間の接続契約・共通ルール

## このページの役割 {#scope}

各機能を別々に実装する前に、機能間で共有する約束を整理します。人数・従来の六班構成・担当個人は前提にしません。ここでいうOwnerは「値や処理の正本を持つ機能」であり、人員の割り当てではありません。

本ページは**接続一覧と共通技術ルールの正本**（初回調査・協議版）です。既存のGameplay規則と今回の決定は根拠を付けて記載し、未合意の技術案は「提案」と明示します。未合意のAPI名・型・更新順を、完成した共通実装として使用しないでください。個別の計算式やAction条件は各機能ページを正本とし、同じ内容を別定義しません。

### 調査基準

| 対象 | 固定した版・確認範囲 |
|---|---|
| ゲーム本体main | `55d050ad9760b27bb61415a0f7d2324ee9a50bec`。2026-09-10の着手時に確認 |
| Web仕様main | `5dc4b7f0843c03a6838a0cc8dda8db560056284f`。本ページ追加と今回決定の反映前 |
| 環境 | Unity `6000.3.16f1`。Playerは標準Unity Visual Scripting |
| 実装の参照 | [開発基盤ガイド][dev]、PlayerのHost／Session／Input／保存グラフ・Prefab・開発Scene、MusicChart保存型、Tuning Core |
| 調査の限界 | ソース・保存アセットの読取確認。Unityの再実行や基盤全体の再監査は行っていない。基盤の過去の合格結果を本体接続の合格に読み替えない |

**表示区分**：「一致」は記載した範囲で仕様と実装が対応、「仕様のみ」は規則があるが本体接続は未実装、「差分」は食い違いまたは接続時の変更が必要、「未決」は共有の約束が足りない、「内部」は各機能内で選べる方式です。一つの接続でも、データの意味は確定、型は未決という場合があります。

## 全体接続図 {#map}

![機能間の要求・通知・参照。仕様上の主要経路を示し、実装済みかどうかは接続一覧で区別する。](/images/feature-connections.svg)

[接続図を大きく表示する](/images/feature-connections.svg)

図は論理的な責務を表します。別々のGameObject・assembly・担当者を同じ数だけ作る指示ではありません。Combatは共通受付と終了集約を扱い、Chargeの成立やEnemyの浄化を再判定する中央計算機にはしません。

## 機能間の接続一覧 {#contracts}

以下のC番号は文書上の照合用です。Runtime Registryや新しいフレームワークの導入を意味しません。「要求」は処理の依頼、「通知」は成立した事実、「参照」は状態を変更しない読取りです。既存コードで確認できる名前は後述のAPI表に分けます。

| ID | 元 → 接続先／種別・目的 | 渡す／参照する最小情報 | 状況と根拠 |
|---|---|---|---|
| C01 | Game → Stage・Player・音楽・供給等／準備要求 | Battle ID、各機能に必要な設定・参照・生成位置 | **仕様のみ＋差分**。GameがIDを発行してから準備する。[Game「Battle開始lifecycle」][game]。現行Player Hostは独自ID生成・即初期化。[I01](#implementation) |
| C02 | Stage・供給・各準備Owner → Gameの開始集約／Ready・解除・失敗通知 | Battle ID、準備項目、状態、失敗理由。Enemy数や供給数は各Ownerで判断 | **仕様のみ**。Enemy Readyは初期登録・生成準備の完了、Supply Readyは選択可能・非Reserved数を含む。[Stage][stage]・[供給「Battle開始gate」][supply] |
| C03 | Game → Combat・Player・音楽／受付開始、Pause／Resume | Battle ID、開始／停止境界。音楽位置とpre-rollの対応 | **仕様のみ＋差分**。Ready成立で受付と3時計を開始、pre-roll終了でAudio開始。[音楽接続「Battle開始順」「Pause」][music] |
| C04 | MusicChart実行・供給 → RadioWhale／生成要求 | Battle ID、要求ID、Normalのsource Note occurrence、種類・個数・確定した生成情報。補充Wildcardは補充要求を識別 | **仕様のみ**。何を・いつ・何個は供給側、世界への出現はRadioWhale。[供給][supply]・[出現「生成要求」][spawn] |
| C05 | RadioWhale → Shaondama／制御移譲。Shaondama・出現処理 → 供給／状態通知 | Battle ID、要求ID・個体ID、出現完了／選択可能化／Reserved／消費／失敗／取消 | **仕様のみ**。出現完了前は選択不可。供給側が利用可能数と補充要求中数を区別して集計。[出現「制御移譲」][spawn]・[浮遊][orb-life] |
| C06 | Input・Camera・Shaondama → Player Charge／入力・選択参照 | 入力時刻・Press／Release、選択個体、選択時の有効性、必要な狙点、Press時Conduct snapshot | **雛形のみ**。現行Click／Dragの`Example.*`は本番選択ではない。[Charge][charge]・[I02](#implementation) |
| C07 | Charge → Allocation・AttackEvent状態・Shaondama／割当要求・commit | Battle ID、対象個体、判定時のCurrent occurrenceとSlot、選択内容。結果として成功／miss・割当先occurrence・Reserved関係 | **仕様のみ**。Click／Dragの条件は[Charge][charge]、割当とReservedは[Allocation][allocation]。実行順・共有型は未接続 |
| C08 | 音楽実行 → Mode・AttackEvent・供給／小節・受付期間・発火通知 | Battle ID、Chart定義参照、loopとoccurrence、音楽時刻、定義順、Entry情報 | **静的型は一致、実行は未実装**。[Chart][chart]・[AttackEvent][attack-def]。同小節頭のMode適用を発火snapshotより先にする。[Mode][mode] |
| C09 | Player Marker Action・Camera → Marker／生成要求。Marker → AttackEvent／Target参照 | 発射Event時の武器world位置と狙点、Battle ID。Markerの有効性・現在world位置 | **雛形のみ**。Marker開始時の古い狙点を使わない。飛行・付着・置換はMarker Owner。[Camera][camera]・[Marker][marker]・[I02](#implementation) |
| C10 | AttackEvent判定 → Palette Bullet・Audio／発射要求・発射事実 | Battle ID、occurrence／Entry／Reserved識別、発火時Target snapshot、弾丸化時の個体world位置、実効RGB・exact MIDI Note・Mode／Conduct snapshot | **仕様のみ**。Charge成功時は発射しない。Arpeggio全弾のTargetは共有し、開始位置は各発射時に取得。[攻撃判定「発射情報」][attack-result]・[Bullet][bullet]・[音楽接続][music] |
| C11 | Palette Bullet・Normal自然破裂 → Enemy Damage／RGB候補要求 | Battle ID、作用種別、作用ID、対象Enemy、最終RGB payload。第一・第二爆発は別作用ID | **仕様のみ**。Producerが倍率等を適用し、Enemy側が重複除外・frame集約・丸め・Clamp・浄化。[Enemy Damage][enemy-damage] |
| C12 | Enemy → Stage／浄化通知。Stage → Combat → Game／Clear候補転送 | Battle ID、Enemy ID・確定状態、Clear候補。Stageのobjective・登録記録はStage内 | **仕様のみ**。worldのEnemy数だけでClearにしない。Combatは候補を変えずGameへ渡す。[Stage][stage]・[Combat][combat]・[Game][game] |
| C13 | Enemy攻撃 → Jaon Bullet → Player Parry／被弾／判定候補 | Battle ID、攻撃作用・弾・対象ID、Physics Step、Damage量、攻撃側が指定したSmall／Big、接触情報 | **仕様のみ＋差分**。同StepのParry batchを先に解決。未判定衝突を`Combat.SmallHit`へ直結しない。[邪音玉][jaon]・[Parry][parry]・[Player被弾][damage] |
| C14 | Parry → Jaon Bullet → Wildcard／成功通知・変換要求 | Battle ID、batch／元弾ID、Normal／Just結果、各弾の成立world位置と弾き方向 | **仕様のみ**。元弾のDamageと変換は排他。変換commitで即選択可能、RadioWhale経由にしない。[Parry][parry]・[Wildcard][wildcard] |
| C15 | Player Mode／Conduct → BGM・AttackEvent／適用通知・snapshot参照 | current／pending Mode、小節境界、Press時Conduct、付与先occurrence、適用済み効果 | **仕様のみ**。現在選択とoccurrenceへ付与済みの値を別所有にする。Audio波形からDamageを逆算しない。[Mode][mode]・[音楽接続][music] |
| C16 | Player状態 → Camera・Animator・HUD／状態参照・表示通知 | 対象Player、Aim／Dash等の成立状態、HP・スタミナ等の読取値。表示用の派生値 | **一部一致**。Body／Animator時計は提供済み。本番Camera／HUD接続は別。[Player基盤][player]・[Camera][camera]・[UI][ui] |
| C17 | Game → 全Gameplay Owner／結果確定・終了。Owner → 終了集約／完了・失敗 | Battle ID、確定結果、停止対象、Ownerごとの終了結果と理由 | **仕様のみ＋Player側は提供済み**。確定後の新規Gameplayを閉じ、未消費Reserved等を一度だけ終了。[Game][game]・[Combat][combat]・[I01](#implementation) |
| C18 | Game → Result UI／表示・解禁。UI → Game／Continue・Retry要求 | Battle ID、確定variant、lock状態、要求識別。Retryでは新Battle ID | **仕様のみ＋Player側は提供済み**。UIは勝敗を再判定しない。終了集約からUIまでの一意な通知経路は要整理。[UI][ui]・[Game][game] |
| C19 | Chart・機能設定・Tuning → 各Runtime／設定参照。各Owner → UI・診断／読取 | 固定設定とその版、Tuning Definition／Current Value、Runtime snapshot | **一部一致**。ChartとTuning Coreは提供済み。Player値は既存グラフ／Movement.asset。Catalogは派生資料。[I03・I04](#implementation) |

### 実行条件・結果・失敗・終了と接続確認 {#checks}

次の共通条件を省略記号として使います。

- **準備中**：正しいBattle IDを受領済み、開始前。準備用生成・初期化だけを許可し、戦闘入力や攻撃は開始しない。
- **実行中**：現在Battleと一致、必要な受付が有効、結果未確定、非Pause、終了前。Parry Slowは局所減速であり、Pauseと同一扱いにしない。
- **終了後**：新しいGameplay結果を成立させない。Ownerが一時資源・購読・予約を解消し、旧Battleの通知を現在Battleへ適用しない。

| ID | 実行条件 → 結果 | 拒否・失敗時／終了時の扱い | 仮接続での短い確認例・期待結果 |
|---|---|---|---|
| C01 | 準備要求を一度受理して各Ownerを初期化 | 必須参照不足は準備失敗。途中生成も解放対象。失敗をReadyにしない | Playerだけ準備成功、音楽失敗 → Battleは始まらず、失敗Ownerを特定できる |
| C02 | 全必須Ready成立 → C03へ。開始前の解除は待機へ戻す | 旧ID・重複Readyで条件を水増ししない。準備失敗を検出した場合はD03で中断。単なるReady待ちと区別 | 最後のReady直前にSupply Ready解除 → 開始しない。失敗していなければ復帰後に一度だけ開始 |
| C03 | 全準備後に受付・3時計開始、pre-roll後Audio開始 | Pause中は位置保持。終了後のResumeを拒否。現行Playerへの開始gate追加はI01 | pre-roll途中でPause → Audioを開始せず残時間保持、Resume後に残りから進む |
| C04 | 準備中の初期供給、または実行中の通常供給 | 同source occurrence・同補充要求の重複を防ぐ。失敗／取消で要求中数を更新。終了後は生成しない | 同じ補充要求を2回配送 → 必要個数が倍増しない。生成中はReady数へ加えない |
| C05 | 個体の出現完了 → 制御移譲・選択可能化 | 完了前は利用不可。未移譲個体は出現Owner、移譲後はShaondama Ownerが片付ける | 出現途中でBattle終了後に完了通知 → 選択可能な個体を残さない |
| C06 | 有効な入力・対象からClick／Drag判定へ | 拒否で元Actionや費用を変更しない。判定前中断をmissや成功にしない | 選択後、判定前に被弾 → 一時選択を破棄し、Allocationを成立させない |
| C07 | 判定時の条件を満たせば割当をcommitしReserved化 | 不成立は部分割当を残さない。終了時、未commit分はCharge側、commit済み分はAttackEvent側の終了に従う | Dragの一部だけ適合 → 全体不成立でSlot不変。同成功処理の再送で二重予約しない |
| C08 | 音楽時間が該当境界へ到達 → 対象occurrenceを一度処理 | 表示コードやframe数で音楽順を置換しない。終了後callback・過去loopを拒否 | 同定義の次loopは別occurrence。同loopの再通知は再発火しない |
| C09 | Marker発射Event時に位置・狙点を取得して生成 | 無効参照を古いsnapshotで補わない。終了でTarget公開を停止 | 開始後に視点を変える → 発射Event時の狙点へ飛ぶ。旧Markerの遅延通知で復活しない |
| C10 | 発火・各Entry時刻に使用Reservedを一度だけ消費 | 発火後にTargetを追従更新しない。生成失敗と予約消費の確定境界はQ05。終了で未発射Entry取消 | Arpeggio途中にMarker移動 → 後続弾も元Target。Battle終了後は残Entryを発射しない |
| C11 | 実行中の有効候補を同frame・同Enemyで集約 | 二重倍率適用をしない。同作用・同Enemyの重複候補を除外。終了後の候補は無効 | 同ExplosionでEnemyのColliderを2個検出 → 1作用分。DirectとExplosionは別候補として合算 |
| C12 | Enemy状態確定後にStageが登録記録とobjectiveを評価 | Enemy個体やCombatがClearを独自判定しない。未完Spawnが残る間はClearにしない | worldにEnemyが0でも次wave待ち → Clearなし。重複浄化通知でもClear候補は一度 |
| C13 | 同Physics StepのParry解決後、有効な別攻撃をPlayer被弾へ | 新決定D01に従う。二重Hitを除外し、HP 0ならReactionよりDead。終了・旧IDは拒否 | Small 10＋Big 20 → 合計30、HPが残ればBigHitを1回。通知順を反転しても同じ |
| C14 | 成功batchの各弾を一度だけ変換 | 同Battle・元弾IDで二重変換しない。Parry成功済み弾のDamage候補を破棄。終了後の変換なし | 同じ弾から複数callback → Wildcardは1個。変換直後から選択可能 |
| C15 | 有効小節頭でMode適用、Charge成功時に対象occurrenceへConduct付与 | miss／cancelで現在選択を消費しない。終了・RetryでRuntime状態破棄 | WheelとPressが同時 → 更新後の選択をsnapshot。発火後にMode変更しても既発火攻撃の効果不変 |
| C16 | 確定状態・値を読む。表示からGameplayを書き換えない | 参照喪失時の表示復帰は各表示Owner。旧BattleのUI購読を解除 | Gameplayの表示購読を外してもHPや攻撃結果は変わらない |
| C17 | 結果を一度確定 → gate閉鎖 → 各Owner停止・終了集約 | 必須cleanup失敗ならD03で中断し解禁しない。再通知で二重解放しない。表示用残像はGameplay無効 | 1 Ownerのcleanup失敗 → 理由と再起動案内を表示。遅れて完了通知が届いてもResult操作を解禁しない |
| C18 | 解禁後の対応操作を一度だけGameへ要求 | lock中入力を後から実行しない。旧ID拒否。Retryは旧状態のID付替えではない | Retry連打 → 新Battleは1回だけ生成。旧Battleの完了通知を流しても状態不変 |
| C19 | 有効な保存設定を読み、必要な時点でRuntime snapshotへ | 欠損や型不一致を0やDefaultで黙って補わない。Battle中の設定差替え方針はQ04 | Tuning ID欠損 → 取得失敗を判別。表示コード変更で攻撃順やDamageが変わらない |

これは接続の受入例です。仮Ownerで合格しても、実Scene・実MusicChart・実Charge・実Enemyを接続した合格とは区別します。各機能の本番接続後に同じ例を繰り返します。

## 値と状態の正本 {#owners}

| 情報 | 唯一の変更Owner／参照側 | 根拠・注意 |
|---|---|---|
| Battle ID・最終結果・route | Game／全参加機能・UI | [Game][game]。Combatは受付、StageはClear候補、Playerは死亡事実を所有 |
| Stage objective・Clear対象登録 | Stage／Gameへ候補通知 | [Stage][stage]。登録済み個体、Pending Spawn、world個体を混同しない |
| Player状態・HP・スタミナ | 標準VSグラフと既存PlayerSession／Combat・UI | [Player基盤][player]。Combatに別のHPコピーを持たせない |
| 音楽Definition | MusicChart。MIDI由来項目はImport、手動項目はAsset編集／音楽Runtime | [Chart][chart]。Static Assetへ現在Slotや再生周回を保存しない |
| 再生位置・loop・音楽occurrence | 音楽Runtime／供給・Allocation・Mode・AttackEvent | 意味は[音楽接続][music]と[Chart][chart]に規定。共通Runtime型は未実装 |
| 出現要求中・未移譲個体 | RadioWhale出現処理／供給 | [出現][spawn]。完了後の個体lifecycleはShaondamaへ移譲 |
| 個体の選択可能性・浮遊・寿命 | Shaondama／選択・供給・Allocation | [個体データ][orb-data]・[浮遊][orb-life]。供給が同じ状態を別flagで独自更新しない |
| 不足計算・補充要求中数・Supply Ready | 供給／開始集約 | [供給][supply]。RadioWhaleは不足を再計算しない |
| 一時選択・判定前のCharge | Charge／Allocation | [Charge][charge]。対象の世界lifecycleを所有しない |
| Slot割当・Reserved関係の成立 | Allocation／AttackEvent | [Allocation][allocation]。commit済み予約のConsumed／Released確定はAttackEvent判定Owner |
| 発火結果・Target／Mode snapshot・未発射Entry | AttackEvent判定／Bullet・Audio | [攻撃判定][attack-result]。予約解放は一度だけ行い、Allocationはその結果へ同期 |
| Bulletの飛行・各爆発・最終RGB候補 | Palette Bullet／Enemy Damage | [Bullet][bullet]。Audio Repeatと第二爆発は別の起点・別の予約 |
| Enemy RGB浄化値・浄化確定 | Enemy Damage／Stage・表示 | [Enemy Damage][enemy-damage]。候補Producerの倍率を再適用しない |
| 現在Mode・選択Conduct・cooldown | PlayerのMode／Conduct機能／BGM・Charge | [Mode][mode]。付与済みConductと発火済みsnapshotは各occurrence側 |
| Marker有効性・現在座標 | Marker／Target選択 | [Marker][marker]。AttackEventが取得済みの座標を後から書き換えない |
| Tuningの意味・型・制約／採用値 | C# Definition／GameTuningData | [Tuning Core][tuning]。既存Player値はグラフ・Movement.asset、公開されていない値を自動移行しない |
| 表示・診断 | 各Ownerの読取結果から派生 | UI・Catalog・TraceをGameplayの正本にしない。Catalogは静的C#解析、VSの動作証拠はPlayer観測 |

## 今回決めたこと {#decisions}

### D01：Playerの同時被弾

2026-09-10の協議で、**同じPhysics Stepの受付開始時に有効だった別々の攻撃は両方反映し、Reactionを一度にまとめる**方針を採用しました。詳細の正本は[Player被弾「同じPhysics Stepの複数被弾」][damage]です。

例：HP 100、無敵なし、SmallHit 10とBigHit 20ならHP 70でBigHitを1回。合計でHPが0になる場合はDeadを優先します。同じ攻撃の二重callbackは二重Damageにしません。新たに成立したBigHitの無敵で、同じStepの受付開始時に有効だった他候補を後から除外しません。

既存Playerの開発用SmallHit通知から、完全な被弾候補の集約・BigHitまでが実装済みであるとは扱いません。

### D02：完全停止を避け、無効化可能なPlayer局所減速にする

**ゲーム上の判断**：2026-09-10の協議で、完全停止より短い減速を意図し、演出自体を後から除外できる方針になりました。具体的な初期方式は、実装が簡単な推奨案の採用を了承しています。

**採用した技術上の初期方式**：Playerの移動・Animator・Action内時間だけを減速する任意のParry Slowとします。Normal／Just共通で、倍率1または時間0なら無効です。音楽・3時計・AttackEvent・Mode／Conduct・Enemy・Projectile・Shaondamaは通常進行します。減速専用の入力bufferは追加せず、通常の入力条件を使います。

減速の寿命は減速前Gameplay秒で測り、重なりは単一効果の残り時間更新、Pauseで残量保持、Battle終了・Deadで解除、Retryは倍率1からとします。具体的な倍率・時間は未調整です。これらの技術選択とユーザーの意図を、同じ発言として扱いません。

Gameplayの詳細と操作例の正本は[Parryの任意減速](/spec/player/player-action-parry#parry-slow)、音楽側は[音楽接続](/spec/bgm/bgm-gameplay-connection#parry-hitstop)です。旧HitStopの完全停止・専用保持・減速だけによるMode入力拒否は関連ページから置き換えました。既存Playerの`HitStop` boolが停止する事実は維持し、減速の実装完了とは扱いません。

### D03：必須の準備・後片付けに失敗したら理由を表示して中断する {#failure-policy}

今回のプロトタイプでは、**必須機能の準備またはGameplay cleanupに失敗した場合、理由を表示して受入確認を中断し、アプリ再起動で再試行する**方針を採用しました。エラー画面からのBattle再準備・Retryや自動復旧は今回の必須範囲に含めません。この節を失敗時の機能間契約の正本とし、[プロトタイプ完成条件](/spec/game/prototype)、[Game][game]、[Combat][combat]、[UI][ui]から参照します。

| 項目 | 接続ルール |
|---|---|
| 対象 | 必須の参照・設定がない、初期化を完了できない、必須の予約・購読・objectの後片付けに失敗した場合。単なるReady待ち、通常の入力拒否、スタミナ不足、任意演出の無効化とは区別する |
| 検出・報告 | 失敗したOwnerが、対象Battle ID、機能名、準備／cleanupの段階、理由を報告する。準備失敗は開始集約へ、cleanup失敗はCombatの終了集約を通じてGameへ渡す。例外の詳細は既存のログへ残す |
| 中断の所有 | Gameが対象Battleの失敗を保持し、開始・再開・新しいGameplay処理とResult操作を許可しない。失敗をReadyやcleanup成功として数えない |
| 画面への通知 | Gameが確定した中断情報をUIへ通知する。UIは失敗した機能・段階・短い理由と「確認を中断しました。アプリを終了し、再起動して再試行してください」という趣旨の案内を表示する。全cleanup完了を待たずに表示できること |
| 残りの片付け | 新しい生成・発火・入力受付を閉じたうえで、各Ownerは可能なcancel・無効化・解放を行う。一つのOwnerの失敗で、他Ownerへの終了要求を飛ばさない。成功したと偽って操作を解禁しない |
| 結果・再試行 | システム上の失敗をゲーム上のGame Overへ変換しない。確定済みの勝敗があれば保持するが、Continue／Retryは解禁しない。アプリを終了し、起動し直して新しいBattleとして準備する |
| 重複・遅延 | 同じ失敗の再通知で画面・終了要求・ログを繰り返さない。中断後にReadyやcleanup完了が届いても中断を解除しない。旧Battleの通知は現在Battleへ適用しない |
| 受入記録 | 使用ビルド／Commit、再現操作、失敗した機能・段階・理由、関連ログを記録する。異常時の案内が正しく出ても、通常プレイの受入ケースを合格にしない |

通常のGame Overで全必須cleanupが成功した場合は、既存のResult画面からのRetryを使用します。今回のアプリ再起動方針は、上記のシステム上の失敗に対するものです。アプリを強制終了する仕組みや再起動の自動化は要求しません。

| 確認操作 | 期待結果 |
|---|---|
| 必須の音楽参照を欠けさせて準備する | Battleを開始せず、音楽の準備失敗・理由・再起動案内を表示する |
| 必須Ownerのcleanupを意図的に失敗させる | 他Ownerの片付けを進め、Result操作をlockし、失敗を表示する |
| 失敗後に重複失敗、Ready、遅れたcleanup完了、Retry入力を送る | 状態を復旧せず、新しいBattleを生成しない。重複ログを連続出力しない |
| 原因を修正したビルドを起動し直す | 新しいBattle IDで準備し、前回の失敗・予約・callbackを引き継がない |
| 正常なGame OverからRetryする | 全必須cleanup成功後、アプリ再起動を要求せず従来のRetryが成立する |

具体的な失敗通知の型はQ04、準備が応答しない場合の検出方法・待機制限はQ06に残します。ここで確定したのは、失敗を検出した後の中断・表示・再試行方針です。

## 共通技術ルールの提案 {#proposals}

ここからは、既存契約をつなぐための**技術提案**です。採用済みのD01～D03や既存仕様の事実と区別します。通常のC#メソッド・イベント・既存Playerの入口で実現できる構成を優先します。

### P01：要求・通知・参照と結果

- 機能境界の変更要求は、型付きの引数と結果を持つC#メソッドを基本にする。成立後の通知と読取用snapshotを分ける。
- 結果は少なくとも「受理／成功」「通常の拒否」「接続・実行の失敗」を区別し、理由を返す。非同期の「受付済み」をReadyや生成完了の意味にしない。
- 通知は一意な元の出来事を識別できる形にする。受信側で再び同じ要求を生成して無限に通知し合わない。
- Player内部は既存のpublic C#呼出しと保存VSグラフを使う。全機能へVSの文字列Custom Eventを直接配送する共通Busは前提にしない。新しい接続ではC#境界で引数を検証してから既存グラフへ渡す。
- 具体的な公開名・namespace・引数・戻り値は接続単位で固定し、文書と実装を対応付ける。全ての処理へ同じ巨大payloadを渡さない。

### P02：共通データの意味と寿命

| データ | 現在確認できる意味・型 | 接続のための推奨 |
|---|---|---|
| Battle ID | 全参加機能が同じBattleを識別。Playerは`string` | Gameが一度発行し各Ownerへ注入。Playerのactor／generation／runは別の寿命として維持 |
| 定義とoccurrence | AttackEventは`stableId`と表示用`displayCode`。発生回はBattle・Chart・定義・loopを区別 | 表示コードで機械同一性や順序を決めない。Noteの定義キーと共有occurrence型はQ04で整理 |
| 音楽位置 | `long`の絶対Tick、`TempoMap`で秒へ変換。`MusicPosition`内部Bar／Beatは0始まり、表示は1始まり | PPQNはChartから取得。TickをUnityの更新回数と呼ばない。可変Tempoを固定BPMで秒換算しない |
| 時間 | MusicChartのoffset等は`double`秒、Player Operationのduration／dtは`float`秒 | 入力の実時間、音楽時間、Player動作時間を識別。単に`time`という値を別時計へ渡さない |
| 更新識別 | ParryとD01はPhysics Step、Enemy RGB集約とGame結果評価はUnity frame | 物理Step IDとframe IDを別に持つ。1 frameに物理Stepが複数あっても混同しない |
| 位置・方向 | 発射・変換情報はworld座標。`Vector3`が既存Playerの型 | 位置と方向を別項目にし、方向の正規化・ゼロ方向時の拒否／代替は個別契約へ明示。距離はUnity world単位、速度はworld単位／秒を推奨 |
| NoteとPitch Class | exact MIDI Noteは`int 0..127`、Pitch Classは導出 | C4とC5の発音情報を同一視しない。同音Slotの個数を失わない |
| RGB | Producerの実効基礎値とEnemyへ渡す最終payloadは別。集約前の端数を保持 | 表示色の`Color`や0..255の見た目と混同しない。共有数値型と非有限値の拒否を固定する |
| 設定とRuntime状態 | Chart／Tuning／機能設定は保存データ、Slot・残時間・予約はRuntime状態 | Battle開始時の採用設定を固定し、実行中のAsset編集による混在を防ぐ。ライブ変更は別の明示契約にする |

省略可能な項目は「この経路では不要」と定義されたものだけにします。例えばParry由来WildcardへNormalのsource Noteを偽造して埋めません。必須参照の欠損をゼロ座標や現在のBattle IDで補いません。

### P03：開始・時計・処理順

Gameから渡すBattle IDで「準備」と「実行開始」を分け、既存のPlayerSessionを本体開始gateへ接続します。音楽時間の所有をPlayerへ移さず、Playerの局所動作時計を音楽用Gameplay Clockと同名のまま共用しません。

既存仕様が要求する次の前後関係を、共通の更新手順へ落とします。これは必要な順序関係の一覧であり、**全体の実行順が実装・確定済みという意味ではありません**。

| 必須の前後関係 | 根拠 |
|---|---|
| 準備 → Ready集約 → Combat／Player受付・3時計開始 → pre-roll終了・Audio開始 | [Game][game]・[音楽接続][music] |
| 同時刻のWheel更新 → Charge PressのConduct snapshot | [Mode][mode] |
| 同小節頭のMode適用 → AttackEventのMode snapshot | [Mode][mode]・[音楽接続][music] |
| 有効なCharge commit → 同frameで競合するNormal自然破裂の判定 | [浮遊「同一フレームのCharge成功を優先する」][orb-life]。受付締切を過ぎたChargeを成功にする規則ではない |
| 同Physics StepのParry batch収集・解決 → 非Parry攻撃のPlayer被弾集約 | [Parry][parry]・[邪音玉][jaon]・D01 |
| frame内のEnemy RGB候補収集・確定 → Stage浄化反映・Clear候補 → Game結果評価 | [Enemy Damage][enemy-damage]・[Stage][stage]・[Game][game] |
| Game結果確定 → 新規Gameplay受付閉鎖 → 各Owner終了 → 必須完了集約 → Result操作解禁 | [Game][game]・[Combat][combat]・[UI][ui] |

各Componentの`Update`がたまたま呼ばれた順に依存させず、収集と確定の境界を共通に呼ぶ小さな調整役を提案します。既存のPlayer内部要求順やEnemy側の12段階の集約順を置き換える汎用Schedulerは要求しません。物理以外から届くPlayer DamageをどのStepへ帰属させるかなどはQ03に残します。

### P04：終了・失敗・二重実行

- 開始者が、途中生成・購読・予約を失敗前から所有する。制御移譲は一度だけ行い、成功した移譲を境に解放責任を切り替える。
- Gameplayへの書込み前に、現在ID・受付・対象有効性・出来事の重複を検証する。非同期の待機後にも同じ条件を再照合する。
- Player Tokenは開始時のものを保持する。Battle IDだけ一致しても古いAction runなら適用しない。
- 通常の拒否は副作用を残さず返す。必須参照不足・初期化失敗はOwnerが失敗として報告し、上位はReadyへ数えない。
- CombatがGameplayの終了完了を集約し、Gameが最終のResult操作解禁を通知する一方向の経路を推奨する。Playerの`ResultReady`は全Battleの解禁とは区別する。
- 必須cleanupに失敗した場合は失敗Ownerと原因を保持して解禁しない。単なるタイムアウトで成功扱いにしない。中断・表示・アプリ再起動による再試行は[D03](#failure-policy)の決定に従う。
- 最小診断は接続C番号、元／先、Battle ID、必要な作用／occurrence／run、frame／Step／音楽位置、結果・理由、例外。現在のPlayer journalを再利用し、全Trace実装を着手の前提にしない。

### P05：契約変更

接続名・型・単位・意味・順序を変える場合は、まず該当C番号、変更前後、影響する送信側・受信側・保存データを示します。Gameplayの判断は個別正本へ、共通の運び方は本ページへ反映し、片側だけ変更しません。

通常のコードレビューで送受信側の変更と仮接続の確認をそろえ、必要な実接続を確認してからmainへ反映する案です。人数に依存した承認段数や全機能共通の登録台帳は作りません。変数名やクラス分割など、接続の意味を変えない内部変更は各機能内で判断できます。

## 現在の実装と差分 {#implementation}

| ID | 確認した実装事実 | 本体へ接続するために必要なこと |
|---|---|---|
| I01 | [PlayerBattleHost][host]は`BeginBattle()`で生成、内部で新GUIDを発行して`Initialize`へ渡す。`FinalizeBattle(PlayerToken)`／`RetryBattle(PlayerToken)`とcleanup gateを提供。開発Sceneは自動開始、Prefabの`automaticTick`はON | Game発行IDの注入、準備中の受付停止、共通開始後の進行へ接続する。Host内の局所Readyを全体Readyにしない |
| I02 | [PlayerSession][session]は保存VS、入力・HP・スタミナ・Operation・Token・終了を所有。`Tick`と`EnqueueInput`はHitStopで停止／拒否。保存`Shared/Action.asset`、Charge開始グラフ、StatusIngress、Parry開始グラフを確認したが、Charge／Parryは`Example.*`雛形 | 全体の時計と局所時計を分離して接続。D02の局所減速、D01、実Charge・Marker発射・BigHit等は追加実装。旧HitStop専用入力保持は今回要求しない |
| I03 | [MusicChart][chart-code]にAudioClip、pre-roll、TempoMap、Track／Note、AttackEvent・Random Sectionの静的データがある。[AttackEvent型][attack-code]にはStable ID、Entryのexact Note・絶対Tickがある | 本体の音楽時計、Audio同期、実行occurrence、発火・供給は未実装。Editor Audio PreviewをRuntime時計として使わない |
| I04 | [Tuning Core][tuning]は明示Definitionと保存値を分離。[GameTuning.Get／TryGet][tuning-code]は型付き参照を提供。Asset欠損では例外となる | 欠損・型違いを準備失敗へ接続する。現在のPlayer値の自動移行、Excel、全機能接続は提供範囲ではない |
| I05 | [PlayerTargetInfo][target-code]の値コピーは未接続helper。Marker発射時のCamera／武器取得は提供されていない | Marker用の発射位置と、Palette Bullet用の各Shaondama位置を分ける。開始時コピーで本番発射を代用しない |

### 既存APIと新規契約を混同しない

| 既存の名前・型 | 現在の意味 | 接続上の注意 |
|---|---|---|
| `PlayerSession.Initialize(string battle, int generation, PlayerJournal journal = null, bool bindInput = true)` | 新actorを初期化し標準グラフを開始 | 同actorへの再bindは禁止。本体のPrepare／Start分離は別途必要 |
| `Enqueue(string eventName, PlayerToken token, object payload = null)` → `void` | Playerの要求キューへ追加 | 戻ったことはAction成功を意味しない。新しい共通payloadは境界で型を固定する |
| `EnqueueInput(string eventName, PlayerToken token, double inputTime)` → `void` | 入力時刻付き要求。Pause／HitStop時は拒否 | D02では専用保持を追加しない。減速の入力にこのHitStop拒否を適用しない。全機能の通知入口に流用しない |
| `FinalizeBattle(PlayerToken)`／`RetryBattle(PlayerToken)` → `bool` | 現在Playerの停止・再生成、古いBattle callbackの拒否 | 本体結果や全Owner終了を決めるAPIではない |
| `GameTuning.Get<T>(definition)`／`TryGet<T>(definition, out value)` | Current Value取得。後者は取得結果enumを返す | Asset自体の欠損等は例外。失敗時のout値を成功値として使わない |

## 食い違い・不足と優先論点 {#questions}

| ID・優先度 | 現行の根拠と不足 | 影響／推奨案／判断すること |
|---|---|---|
| Q01・高 | Gameは共通Battle IDと準備gateを規定、I01は開発用生成・即開始 | 全機能のID・Ready・Retryに影響。**技術提案**：GameのIDを注入しPrepareとStartを分ける。ゲームの開始条件自体を再決定する必要はない |
| Q02・高 | D02はPlayer局所減速・3時計継続。I02の`HitStop`は`GameplayTime`を停止し入力を拒否するため、そのままでは異なる動作になる | 音楽・Mode・Parry・移動に影響。**採用方向**：全体の音楽／Gameplay進行とPlayer局所動作を分ける。**残る技術境界**：Actionの局所deltaと、Status／Reactionなど既存Tick利用者への供給を分ける公開API。実装は後続 |
| Q03・高 | ParryはPhysics Step、Enemy RGBとGame結果はframe。Player複数被弾の意味はD01で決定したが、全体の収集・確定を呼ぶ箇所は未実装 | 敵味方Damage・Charge・自然破裂・Clearへ影響。**技術提案**：Stepとframeを区別し、既存の前後関係を共通更新へ接続。物理外Damageの帰属、締切前後の配送規則を次に具体化 |
| Q04・高 | 意味上のID・payloadは各正本にあるが、共有C#型はない。NoteEvent保存型にはRuntime occurrence IDがない | 全担当の独立実装に影響。**技術提案**：Battle ID、occurrence参照、個体・作用ID、結果型を境界だけで固定。設定はBattle開始時に固定し、表示用コードと分離。保存型の無用な全面変更は避ける |
| Q05・高 | Reservedの解放Ownerは[攻撃判定「二重解放の防止とOwner境界」][attack-result]に確定済み。ただし生成失敗時に消費を確定する具体的な呼出し境界がない | Allocation・Shaondama・Bullet間で二重消費／消失の危険。**技術提案**：生成準備成功と一度限りの消費確定を一組にする。失敗復旧時に勝手な再発射をしない |
| Q06・中（運用方針決定済み） | 失敗検出後はD03の表示・中断・アプリ再起動で再試行。準備中は3時計が止まるが出現演出完了を待つ | Game・RadioWhale・UIへ影響。**残る技術課題**：準備用の進行を停止中のGameplay時計へ依存させないこと、応答しないOwnerの検出・待機制限。期限切れをReady／cleanup成功扱いにしない |
| Q07・中 | [Chart「InitialTargetCount / MinimumLeadTime」][chart]と保存[生成設定][spawn-settings]は旧名を保持。一方[供給「選択可能Shaondamaの最低保証数」][supply]は旧Normal目標数として使うことを禁止 | 設定・供給・Readyに影響。**文書／保存値の意味の未同期**：最低保証の明示設定を用意するか既存値をどう移すか決める。旧値を無確認で転用しない。Sync Settingsの保存・Runtime参照も未実装 |
| Q08・後続 | [GameのRoom節][game]はMode pending／cooldownを未決とする一方、[ModeのRoom節][mode]は破棄／保持・停止を確定済み | 文書間の食い違い。Mode側を正本として参照を同期する。今回のプロトタイプへRoom移動を新たに必須追加しない |
| Q09・後続 | [Player基盤の既知差分][player]にDashのShift単独継続と旧説明、Traceの旧Context transaction等が残る | 旧独自Runtimeを再導入しない。現行Playerの実行・journalへ対応付ける。旧`Player Runtime`という単語だけで全Gameplay規則を廃止しない |

### 各機能内で決められること

内部クラス分割、コレクションやキャッシュ、AIの内部構造、グラフの配置、演出の実装手段は、外部の意味・順序・寿命を変えなければ各機能内で選べます。RadioWhale出現完了をtimerかAnimation Eventで検出する方法も内部設計ですが、準備中に進行できること・完了前は選択不可という接続条件は共通です。

Parry弾き方向の算出方法や邪音玉のSmall／Big指定など、未決のGameplay意味を内部実装の裁量として確定してはいけません。一方、未決の調整数値があることだけを理由に、全ての接続契約を未決扱いにしません。

## 後続に必要な実装作業と点検 {#remaining}

以下は接続調査時点の実装差分です。後続で承認された6枠の段階1実装を[プロトタイプタスク](/tasks/prototype/)へ分割しました。ゲームコードはまだ変更していません。各Q項目はタスクを作成しただけで解決済みにはせず、必要な公開型・処理境界の実装と確認を追います。

- GameのBattle ID／Prepare／Ready／Startと、既存Player Hostへの接続。
- 音楽Runtime・Audio同期・occurrence・供給実行、D02の任意減速とPlayer局所時計との接続。
- Step／frameごとの確定境界、Parry batch、D01のPlayer Damage、Enemy RGBからStage・Gameへの通知。
- 本番Charge／Allocation／Reserved、発火snapshot・Bullet生成、MarkerとCameraの接続。
- 出現・制御移譲・不足補充、Wildcard変換、各要求・作用の二重実行防止。
- 既存Tuning／Chartの必要な設定参照、定義とRuntimeの分離、Q07の設定の整理。
- 必須cleanup集約、Result操作解禁、旧Battle通知拒否、D03の中断情報と失敗表示。エラー画面からの復旧は今回要求しない。
- 送受信側共通の型・公開名・結果と最小診断、各C番号の仮接続／実接続確認。

| 点検項目 | 初回調査時の結論 |
|---|---|
| 独立して実装を始められるか | 個別の確定ロジックは仮入力で進められる。**接続境界を独立実装する前にQ01～Q05の公開契約を具体化する必要がある** |
| 所有の重複・不在 | 正本は上表で特定。Reserved解放は既に一意。全体clock・Game ID接続・終了解禁経路の実装は不足 |
| 仮の接続先で確認できるか | C別の例をFake Owner／固定Chart／候補データで確認可能。実物接続の合格とは別記録 |
| ページ間の矛盾が残るか | Q07～Q09などを明示。D01・D02はPlayerと関連する正本へ反映。D03は本ページを正本にGame／Combat／UI／完成条件へリンク。他の未合意案で既存仕様を上書きしない |
| 分担前の重要事項が残るか | あり。Q01～Q05の技術境界、共通型・処理確定の呼出し境界。人数や担当者を決めても解消しない |

### タスクの洗い出し・分配へ進む判断 {#task-readiness}

**タスク候補の洗い出しは開始できます。** 接続一覧で目的・受け渡し・正本・不足を追えるため、完成条件と既存タスクを照合し、更新・分割・不足分の候補を整理できます。C番号は接続の識別であり、19接続をそのまま19タスクにする指示ではありません。

実装タスクを担当へ渡す前に、そのタスクが使う接続について次をそろえることを推奨します。全機能の内部設計や将来機能の未決事項まで、先に確定させる必要はありません。

- 実現する操作、今回の範囲外、操作と期待結果で書いた完了条件。
- 入出力の名前・型・単位・有効期間、値の変更Owner、必要な処理順。
- 依存先、仮の接続先で確認できる範囲、実物との接続確認を行う区切り。
- 影響する未決事項の解決、またはその部分への着手を待つ明示的な条件。未決の値や呼出し方を各担当が別々に確定しない。
- 主担当・確認担当と共有Scene／Prefab等の窓口。個人の対応付けは非公開の管理先で決める。

Q01～Q05の共通境界は、それを使う実装タスクの分配前に具体化する優先事項です。通常の技術判断は仕様作成側が既存実装に沿った案をまとめ、ゲーム上の意味が変わる点だけを協議します。プログラマーの成果物はコード・グラフ・アセットと動作確認であり、仕様の表作成を実装前提の担当作業にはしません。

既存の[Battle／Result／Retryタスク](/tasks/prototype/pb-task-0018)、[Windows配布タスク](/tasks/game/pb-task-0017)、[受入計画タスク](/tasks/game/pb-task-0024)は更新・分割の照合先です。基盤の実装済み部分を再発行せず、担当間の接続、全体動作、Windows配布受入も候補へ含めます。後続のタスク化結果と既存タスクの分割先は[プロトタイプカテゴリ](/tasks/prototype/#existing-tasks)を参照します。枠1以外の個人、コード確認・マージ担当は未定です。

[dev]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/DEVELOPMENT.md
[host]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerBattleHost.cs#L24
[session]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerSession.cs#L66
[chart-code]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/MusicChart.cs
[attack-code]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/AttackEvent.cs
[spawn-settings]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/Scripts/MusicChart/ShaondamaSettings.cs#L21
[target-code]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerTargetInfo.cs
[tuning]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Packages/com.pushpush.planner-tuning/Documentation~/SPEC.md
[tuning-code]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Packages/com.pushpush.planner-tuning/Runtime/GameTuning.cs#L11
[game]: /spec/game/
[stage]: /spec/stage/
[combat]: /spec/combat/
[music]: /spec/bgm/bgm-gameplay-connection
[chart]: /spec/bgm/bgm-music-chart
[supply]: /spec/bgm/bgm-make-syaonndama
[spawn]: /spec/radiowhale/shaondama-spawning
[orb-life]: /spec/shaondama-music/floating-behavior
[orb-data]: /spec/shaondama-music/orb-data
[charge]: /spec/player/player-action-charge
[allocation]: /spec/draw-system/charge-allocation
[attack-def]: /spec/bgm/bgm-attack-event
[attack-result]: /spec/bgm/bgm-attack-judgement
[mode]: /spec/player/player-action-mode-change-and-conduct
[camera]: /spec/camera/aim
[marker]: /spec/combat/marker
[bullet]: /spec/combat/palette-bullet
[enemy-damage]: /spec/enemy/damage-and-purify
[jaon]: /spec/enemy/jaon-bullet
[parry]: /spec/player/player-action-parry
[damage]: /spec/player/player-reaction-damaged
[wildcard]: /spec/shaondama-music/wildcard-orb
[player]: /spec/common-technology/action-state-manage
[ui]: /spec/ui/
