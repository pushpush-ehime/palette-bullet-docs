---
title: 浮遊・挙動
description: シャオンダマが世界内へ出現した後の浮遊・Lifetime・消滅に関する仕様
pageType: spec
category: シャオンダマ
order: 20
status: 仮仕様
---

# 浮遊・挙動

## ページ概要

- 対象担当：プログラム班・デザイン班
- 出典：統合仕様書v3.2 §4.2.2
- 関連ページ：[玉のデータ](/spec/shaondama-music/orb-data)、[シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、[Charge Allocation](/spec/draw-system/charge-allocation)、[戦闘](/spec/combat/)

## 目的

本ページでは、**ラジクジラから世界内へ出現した後のシャオンダマ**について、浮遊、一般Lifetime、Normal Shaondamaのsource NoteEvent時刻、Reserved、自然破裂、消費、Battle終了、および消滅の競合規則を定義します。

ラジクジラはシャオンダマを世界内へ出現させるところまでを担当し、出現後はシャオンダマ側へ制御と責務が移ります。

本ページは、未使用Normal Shaondamaがsource NoteEvent時刻へ到達した際の自然破裂と小範囲Weak攻撃、一般Lifetimeとの優先順位、および各終了条件が同時に成立した場合の一回終了処理の正本です。

個体が保持するBattle ID、source NoteEvent occurrence、source music timeなどのデータは[玉のデータ](/spec/shaondama-music/orb-data)、生成対象・生成タイミング・生成個数は[シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、出現完了・選択可能化は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、Charge・Allocation・Reservedへの遷移は[Charge Allocation](/spec/draw-system/charge-allocation)を正本とします。

## プレイヤーから見た挙動

- シャオンダマは、世界内へ出現した後、独立したobjectとして空中を漂います。
- 浮遊中の具体的な移動範囲・速度・配置方法は未決です。
- シャオンダマには一般Lifetimeがあり、正式値は未決ですが**数十秒程度**を想定します。
- 未使用のNormal Shaondamaは、自身のsource NoteEvent時刻に自然破裂し、周囲へ小範囲Weak攻撃を発生させて消滅します。
- Reservedになったシャオンダマは、対応するAttackEventで使用されるまで一般Lifetimeと未使用時の自然破裂から保護されます。
- Clear時に残ったシャオンダマは、一斉に割れる終了演出として処理できますが、Weak攻撃やDamageは発生しません。

## 詳細仕様

### 制御開始

シャオンダマの生成に関する責務は、以下のように分離します。

```text
BGM / MusicChart
「何を・いつ・何個生成するか」
        ↓
生成要求
        ↓
ラジクジラ
「世界内へ出現させる」
        ↓
出現完了・選択可能化
        ↓
本ページ
「浮遊・Lifetime・自然破裂・終了」
```

ラジクジラからの出現演出が完了し、浮遊状態へ移行してシャオンダマ側へ制御が移譲された後の挙動を本ページの対象とします。

生成対象・生成タイミング・生成個数については、BGM側の仕様を正本とします。

ラジクジラの背中から世界内へ出現するまでの処理については、ラジクジラ側の仕様を正本とします。

### 浮遊

生成後のシャオンダマは、世界内で空中を漂うobjectとして扱います。

ただし、現在の詳細な浮遊アルゴリズムは未決です。

以下については、本ページの現段階では具体値・具体方式を確定しません。

* 浮遊範囲
* 配置方法
* 移動速度
* 移動方向の決定方法
* 他のシャオンダマとの位置関係
* Playerや敵との位置関係を利用した配置・移動ルール

特に、**敵の周囲を基準として浮遊させる仕様は採用しません**。

### 一般Lifetime

シャオンダマには、浮遊開始後の通常滞在時間を制御する一般Lifetimeを設定します。

- 一般Lifetimeは数十秒程度を想定しますが、正式な秒数は未決です。
- Pause中は一般Lifetimeを進行させません。
- Reserved中は一般Lifetimeの進行を停止します。
- 一般Lifetimeで終了する場合は、割れる演出を行ってworld objectを消滅させます。
- 一般Lifetimeによる破裂は、未使用Normalのsource NoteEvent時刻による自然破裂とは区別します。

Wildcard Shaondamaは固定source NoteEvent occurrenceを持たないため、未使用時は一般Lifetimeが通常の時間切れ条件です。一般Lifetime終了時のWildcardは割れて消滅しますが、Normalのsource時刻自然破裂として扱わず、小範囲Weak攻撃を発生させません。

### Normalのsource NoteEvent時刻を優先する

未使用Normal Shaondamaでは、一般Lifetimeよりも自身のsource NoteEvent occurrenceが持つsource music timeを優先します。

```text
一般Lifetime終了予定
<
source NoteEvent時刻
↓
一般Lifetimeだけを理由に先に消滅させない
↓
source NoteEvent時刻まで存在を維持
```

未使用Normalの一般Lifetimeがsource NoteEvent時刻より先に到達しても、その時点では最終終了処理を行いません。選択可能な浮遊状態を維持し、source NoteEvent時刻に自然破裂を解決します。

source NoteEvent時刻が一般Lifetimeより先、または同時に到達した場合も、source NoteEvent時刻の自然破裂を使用します。これにより、未使用Normalを対応する音楽時刻より前に不自然に消滅させません。

### 未使用Normalの自然破裂

未使用Normal Shaondamaが自身のsource NoteEvent時刻へ到達した場合は、以下の順序で一度だけ自然破裂を処理します。

1. Battle IDが現在のBattleと一致し、Battle結果が未確定であることを確認する
2. 対象が未使用であり、Reserved・消費済み・終了処理済みではないことを確認する
3. 対象個体を選択不能にし、自然破裂の終了処理を開始済みとして固定する
4. 自然破裂の見た目と音を発生させる
5. 対象個体を発生元とする小範囲Weak攻撃要求を1回だけ発行する
6. 攻撃範囲内の有効Enemy候補に対してWeak Damage処理へ接続する
7. world objectを消滅させ、個体の終了状態を固定する

```text
未使用Normal Shaondama
↓
source NoteEvent時刻到達
↓
自然破裂
↓
周囲への小範囲Weak攻撃
↓
個体消滅
```

この自然破裂はWeak AttackEventを新しく生成してPalette Bulletを発射する処理ではなく、Normal Shaondama自身を発生元とする即時の小範囲Weak攻撃です。

Weak攻撃要求は、少なくとも次を識別できる状態にします。

| データ | 内容 |
|---|---|
| Battle ID | 発生元Shaondamaと同じBattle |
| 発生元個体識別情報 | 自然破裂したNormal Shaondama |
| source NoteEvent occurrence | 自然破裂の基準となった発生回 |
| 発生位置 | 自然破裂時のworld位置 |
| 攻撃種別 | Normal Shaondamaの自然破裂Weak攻撃 |
| 色・Damage参照 | 発生元Normalの基本色参照と、自然破裂Weak専用Damage definition（値は未決） |

具体的な攻撃範囲、Damage量、同一Enemyへの重複Hit規則、および最終Damage計算式は未決です。これらの値を本ページで推測しません。

### Reserved

Charge successによってReservedへ移行したシャオンダマは、未使用シャオンダマではありません。

- 一般Lifetimeの進行を停止します。
- source NoteEvent時刻へ到達しても、未使用Normalの自然破裂を発生させません。
- 対応するAttackEventで使用されるか、Battle終了処理を受けるまでworld上の対応実体を保持します。
- Reserved中の個体を再び選択対象へ含めません。
- Reserved中に一般Lifetime終了や自然破裂によって個体を消滅させません。

現行仕様では、Reservedから未使用の浮遊状態へ暗黙に戻す遷移を設けません。将来その遷移を追加する場合は、一般Lifetimeの再開時点と、経過済みsource NoteEventの扱いを別途仕様化します。

### 消費・Palette Bullet化

AttackEventで使用対象に確定したReserved Shaondamaは、対応する発射タイミングでPalette Bullet化されます。

- 元のworld objectを未使用浮遊状態へ戻しません。
- 一般Lifetimeやsource時刻自然破裂を再開しません。
- 同じ個体からPalette Bullet化、自然破裂、Lifetime終了を重複実行しません。
- 実効音程・色・Damage dataの受け渡しは[玉のデータ](/spec/shaondama-music/orb-data)と[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正本とします。

### Pause

通常Battle中のPauseでは、シャオンダマのGameplay lifecycleを停止します。

- 浮遊移動を進行させません。
- 一般Lifetimeを進行させません。
- BGMの音楽時計が停止するため、source NoteEvent時刻の自然破裂判定も進行させません。
- Resume後は同じBattle IDと停止前の状態を維持して再開します。

### Battle終了

ClearまたはGame Overの結果が確定した時点で、対象Battleの全シャオンダマをGameplay上無効化します。

- 新しいCharge対象として公開しません。
- 一般Lifetimeとsource NoteEvent時刻の自然破裂判定を停止します。
- 新しいWeak攻撃、Damage、AttackEvent、Palette Bulletを発生させません。
- 終了通知を複数回受けても、同じ個体の終了処理を重複実行しません。

Clear時に残っているシャオンダマは、終了演出として一斉に割れて構いません。この破裂は通常の自然破裂とは別のBattleEndPresentationとして扱い、Weak攻撃要求・Damage・AttackEventを発生させません。

Game Over時もGameplay上の無効化は同じです。残存objectを即時消去するか、Game Over演出として表示を残すかは演出仕様として未決ですが、いずれの場合もGameplay出力を発生させません。

Retry開始後までに旧Battleのシャオンダマobjectをすべて破棄し、新しいBattleへ持ち越しません。

## 状態別の挙動

| 状態・終了契機 | 選択可否 | 一般Lifetime | source時刻処理 | world object | Weak攻撃 |
|---|---|---|---|---|---|
| 選択可能な浮遊中 | 可 | 進行 | 未使用Normalは到達時に自然破裂 | 維持 | 自然破裂時のみ発生 |
| Charge判定中・未Reserved | 判定対象 | 進行 | 到達時に自然破裂し、Charge側は対象消失として扱う | 自然破裂まで維持 | 自然破裂時のみ発生 |
| Reserved | 不可 | 停止 | 未使用時の自然破裂対象外 | AttackEvent解決まで維持 | 発生しない |
| 消費済み・Palette Bullet化 | 不可 | 終了 | 対象外 | シャオンダマobjectとしては終了 | 発生しない |
| 一般Lifetime到達・Wildcard | 不可 | 終了 | 固定sourceなし | 割れて消滅 | 発生しない |
| 一般Lifetime到達・未使用Normal | 可 | source時刻まで終了を保留 | source時刻で自然破裂 | source時刻まで維持 | source時刻に発生 |
| source時刻自然破裂 | 不可 | 終了 | 一回だけ解決 | 演出後に消滅 | 小範囲Weak攻撃を1回要求 |
| Battle終了cancel／演出 | 不可 | 停止 | 停止 | 即時消去または終了演出後に消滅 | 発生しない |

どの終了条件が同時に成立しても、個体の最終終了処理は1回だけ実行します。

優先順位は以下です。

1. Battle結果確定済み状態によるGameplay無効化
2. Reserved／消費済み状態
3. 未使用Normalのsource NoteEvent時刻
4. 一般Lifetime

同一フレーム内でも、Battle結果確定前に有効な自然破裂Weak攻撃として受理されたDamageは、そのフレームの結果候補収集へ参加できます。Battle結果確定後に開始された自然破裂、または確定後に到着した遅延DamageはGameplayへ適用しません。

## 他システムとの接続

### BGM / MusicChart

シャオンダマについて、

* 何を生成するか
* いつ生成するか
* 何個生成するか

といった生成ロジックは、[シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)を正本とします。

MusicChart / NoteEventの構造については、BGMカテゴリ側を正本とします。

本ページではこれらの生成ロジックを再定義しません。

生成要求は、[玉のデータ](/spec/shaondama-music/orb-data)で定義したBattle ID、source NoteEvent occurrence、loop occurrence、source music timeを欠落なく個体へ渡す必要があります。

### ラジクジラ

ラジクジラは、生成要求を受け取ったシャオンダマを世界内へ出現させるところまでを担当します。

詳細は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とします。

本ページでは、**出現完了後にラジクジラからシャオンダマ側へ制御が移譲された後**を扱います。

ラジクジラ自身のPlayer追従・浮遊については、本ページでは扱いません。

### Charge

選択可能なシャオンダマをPlayerが選択した後のCharge入力は[Playerアクション｜チャージ](/spec/player/player-action-charge)、AllocationとReservedは[Charge Allocation](/spec/draw-system/charge-allocation)を正本とします。

本ページではChargeの開始条件・処理・終了条件などを再定義しません。

また、旧仕様に存在した**選択されたシャオンダマ自体が敵へ飛んでいく挙動は採用しません**。

### AttackEvent

AttackEventの成立・発火・処理についてはBGM側のAttackEvent仕様を正本とし、本ページでは定義しません。

未使用Normalの自然破裂Weak攻撃は、Weak AttackEventまたはPalette Bulletへ変換せず、本ページが定義する即時範囲攻撃要求としてDamage処理へ接続します。

### Combat／Enemy Damage

- Battle結果確定後のGameplay無効化は[ゲーム全体](/spec/game/)と[戦闘](/spec/combat/)を正本とします。
- 自然破裂Weak攻撃からEnemyへ渡す最終Damage payload、同一Enemyへの重複Hit規則、加算、clamp、および浄化は[敵の被弾と浄化](/spec/enemy/damage-and-purify)を正本とします。
- 本ページは、自然破裂Weak攻撃を発生させる条件と、発生元個体の終了までを所有します。

## 責務外

本ページでは、以下の内容を詳細定義しません。

* MusicChartの構造
* NoteEventの選択ロジック
* 生成対象Track
* 生成タイミング
* 生成個数
* `InitialTargetCount`
* `MinimumLeadTime`
* ラジクジラ側の生成位置
* ラジクジラ側の生成演出
* ラジクジラ自身のPlayer追従・浮遊
* Charge
* AttackEvent
* Player State
* 万能シャオンダマの生成仕様
* Enemy側のDamage計算・浄化
* Clear／Game Overの結果確定

また、現在の仕様には**Draw Modeを前提とした浮遊状態を設けません**。

そのため、

* Draw Mode中だけ浮遊を変化させる
* Draw Mode中にscaled timeによって浮遊をスローにする

といった旧仕様は、本ページでは扱いません。

## パラメータ

| パラメータ | 値 | 状態 |
|---|---|---|
| 一般Lifetime | 数十秒程度を想定 | 正式値は調整予定 |
| 浮遊範囲 | 未決 | Gameplayテストで調整予定 |
| 配置方法 | 未決 | Gameplayテストで調整予定 |
| 浮遊速度 | 未決 | Gameplayテストで調整予定 |
| 自然破裂Weak攻撃範囲 | 未決 | Gameplayテストで調整予定 |
| 自然破裂Weak Damage | 未決 | Gameplayテストで調整予定 |

## 未決事項

- 一般Lifetimeの正式な秒数
- 一般Lifetime終了時・自然破裂時の具体的なVFX／SE
- Game Over時に残存objectを即時消去するか、終了演出として表示を残すか
- 生成後の詳細な浮遊アルゴリズム
- 浮遊範囲・配置方法・浮遊速度
- Normal Shaondama自然破裂のWeak攻撃範囲
- Normal Shaondama自然破裂のDamage量
- 自然破裂Weak攻撃での同一Enemyへの重複Hit規則
- 自然破裂Weak攻撃の最終Damage payload・計算式

これらはGameplayテスト、バランス調整、または後続正本との接続が必要なため、意図的に未決とします。source NoteEvent時刻の優先、未使用Normalの自然破裂Weak攻撃、Reserved中の一般Lifetime停止、およびBattle終了後にDamageを発生させない挙動は決定済みです。

## 関連タスク

<PageRelations />
