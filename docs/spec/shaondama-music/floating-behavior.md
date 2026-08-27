---
title: 浮遊・挙動
description: 選択可能化後のShaondama状態・Parry由来Wildcardの弾き移動・浮遊・Lifetime・Reserved・自然破裂・終了条件に関する仕様
pageType: spec
category: シャオンダマ
order: 20
status: 仮仕様
---

# 浮遊・挙動

## ページ概要

- 対象担当：プログラム班・デザイン班
- 出典：統合仕様書v3.2 §4.2.2、および全体仕様決定D-02・D-12
- 関連ページ：[玉のデータ](/spec/shaondama-music/orb-data)、[シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)、[Playerアクション｜パリィ](/spec/player/player-action-parry)、[邪音玉](/spec/enemy/jaon-bullet)、[Charge Allocation](/spec/draw-system/charge-allocation)、[戦闘](/spec/combat/)

## 目的

本ページでは、**Gameplay上の選択可能なShaondama状態へ入った後の共通挙動**について、浮遊、選択可能状態、最低保証数への算入状態、一般Lifetime、Normal Shaondamaのsource NoteEvent時刻、`Reserved`、自然破裂、消費、Battle終了、および消滅の競合規則を定義します。

Normal Shaondamaおよび最低保証補充Wildcardは、ラジクジラの出現演出完了とGameplayへの制御移譲を経て選択可能状態へ入ります。一方、Parry由来Wildcardは、Parry成立位置での変換commitと同時に選択可能なWildcard状態へ直接入り、RadioWhale経路や出現演出完了待ちを使用しません。

本ページを、**選択可能化後のShaondama状態、Parry由来Wildcardの弾き移動、および共通終了条件**の正本とします。

本ページは特に、次の境界を所有します。

- RadioWhale経路では出現演出完了後に浮遊・選択可能状態へ入ること
- Parry由来Wildcardは変換commit時点で選択可能状態へ直接入り、変換直後から弾き移動中も選択可能であること
- Parry由来Wildcardへ加える力の適用、減衰、移動量、および通常浮遊への接続
- 選択可能かつ非`Reserved`の個体だけを最低保証数へ算入すること
- `Reserved`への遷移時点で最低保証数から除外すること
- 個体の選択可否変化と不足検出結果を最低保証判定側へ通知すること
- 未使用Normal Shaondamaがsource NoteEvent時刻へ到達した際の自然破裂と小範囲Weak攻撃
- Charge成功と自然破裂が同一フレームに成立する場合の優先順位
- 一般Lifetimeおよび各終了条件が競合した場合の一回終了処理
- Battle結果確定時のGameplay無効化、表示専用演出、およびRetry／次Battleへの持ち越し禁止

個体が保持するBattle ID、source NoteEvent occurrence、source music time、基本色・RGB値などのデータは[玉のデータ](/spec/shaondama-music/orb-data)、生成対象・生成タイミング・最低保証数・Wildcard生成要求は[シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、RadioWhale経路の出現演出完了までの状態遷移と制御移譲は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、Parry成立と対象ごとの弾き方向は[Playerアクション｜パリィ](/spec/player/player-action-parry)、邪音玉としての終了と変換要求は[邪音玉](/spec/enemy/jaon-bullet)、変換条件と変換commitは[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)、Charge成功と`Reserved`へのcommitは[Charge Allocation](/spec/draw-system/charge-allocation)を正本とします。

## プレイヤーから見た挙動

- シャオンダマは、世界内へ出現した後、独立したobjectとして空中を漂います。
- Normal Shaondamaおよび最低保証補充Wildcardは、RadioWhaleの出現演出中は選択できず、最低保証数にも数えられません。
- RadioWhale経路の個体は、出現演出完了後に浮遊状態へ入り、Playerが選択できるようになります。
- Parry由来Wildcardは、変換commitと同時に選択可能状態へ直接入り、最低保証補充用の「出現演出中・選択不可」状態を経由しません。
- Parry由来Wildcardは変換直後にParry結果の弾き方向へ力を受け、選択可能なまま弾き移動し、その後は通常の浮遊を継続します。
- Parry由来Wildcardは、弾き移動中もCharge対象検索の対象となり、選択可能かつ非`Reserved`であれば変換commit時点から最低保証数へ算入されます。
- 選択可能な個体がCharge成功によって`Reserved`になると、選択対象および最低保証数から外れます。
- 浮遊中の具体的な移動範囲・速度・配置方法は未決です。
- シャオンダマには一般Lifetimeがあり、正式値は未決ですが**数十秒程度**を想定します。
- 未使用のNormal Shaondamaは、自身のsource NoteEvent時刻に自然破裂し、元個体のRGB値による小範囲Weak攻撃を発生させて消滅します。
- 1回の自然破裂は、攻撃範囲内の同一Enemyへ1回だけ命中します。
- Charge成功と自然破裂が同一フレームに成立する場合はCharge成功が優先され、対象個体は自然破裂しません。
- Reservedになったシャオンダマは、対応するAttackEventで使用されるまで一般Lifetimeと未使用時の自然破裂から保護されます。
- Clear時に残ったシャオンダマは、一斉に割れる終了演出として処理できますが、Weak攻撃やDamageは発生しません。
- Charge成功によって`Reserved`へ移行したShaondamaは、その瞬間の現在World座標に留まり、浮遊移動を停止します。
- `Reserved`個体は、対応するAttackEventの発射タイミングに、その位置から発射されます。（パレットブレット＝シャオンダマ）です。

## 詳細仕様

### 制御開始

Shaondamaが本ページの共通状態へ入る経路は、生成元によって次のように分かれます。

```text
Normal／最低保証補充Wildcard
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

```text
Parry由来Wildcard
Player Parryで成功・弾き方向確定
        ↓
邪音玉として終了・変換要求
        ↓
Parry成立位置でWildcardへ変換commit
        ├─ 同時に選択可能化
        └─ 非Reservedなら最低保証数へ算入
        ↓
変換済みWildcardへ弾き方向の力を1回だけ付与
        ↓
本ページ
「選択可能な弾き移動・浮遊・Lifetime・終了」
```

本ページは、RadioWhale経路では出現演出完了と制御移譲後、Parry経路ではWildcard変換commit時点からの挙動を対象とします。

RadioWhale経路の出現演出完了前後の境界は次のとおりです。

```text
生成要求
↓
論理生成
↓
出現演出中
  ├─ 選択不可
  └─ 最低保証数へ算入しない
↓
出現演出完了
↓
Gameplayへ制御移譲
↓
選択可能な浮遊状態
  └─ 非Reservedなら最低保証数へ算入
```

RadioWhale経路の出現演出中の個体にworld objectまたは論理dataが存在していても、浮遊中・選択可能・最低保証算入済みとして扱いません。この「出現演出中・選択不可」の状態はParry由来Wildcardへ適用しません。

RadioWhale経路の出現演出完了時は、対象Battleが継続中であり、個体のBattle IDが現在のBattleと一致することを確認したうえで、次を一度だけ行います。

1. 出現演出完了を確定する
2. Spawn／RadioWhale側からShaondama Gameplay側へ制御を移譲する
3. 選択可能な浮遊状態へ移行する
4. 個体の選択可能化を最低保証判定側へ通知する

RadioWhale経路の出現演出そのもの、演出時間、および完了通知の送信は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とします。本ページは、完了通知を受けた後の状態を所有します。

Parry由来Wildcardでは、対象Battleが継続中であり、変換元と同じBattle IDが現在のBattleと一致することを確認したうえで、変換commitと同じ処理単位に選択可能化、最低保証算入可否の確定、および算入状態変化の通知を行います。変換commitと選択可能化の間にRadioWhaleへの受付、背中側Spawn、出現演出時間、演出完了通知、timer、遅延callback、Gameplayへの制御移譲を挟みません。

Normal Shaondamaおよび最低保証補充Wildcardの生成対象・生成タイミング・生成個数については、BGM側の仕様を正本とします。Parry由来Wildcardの変換条件と1弾1個規則は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とします。

ラジクジラの背中から世界内へ出現するまでの処理については、ラジクジラ側の仕様を正本とします。この経路をParry由来Wildcardへ適用しません。

### 浮遊

生成後のシャオンダマは、世界内で空中を漂うobjectとして扱います。

Parry由来Wildcardは、変換直後にParry側から渡された弾き方向の力を1回だけ受け、選択可能なWildcardのまま移動します。力が減衰して弾き移動が落ち着いた後は、他のWildcardと同じ浮遊アルゴリズムへ接続します。弾き移動中に邪音玉や攻撃projectileのStateへ戻しません。

ただし、現在の詳細な浮遊アルゴリズムは未決です。

以下については、本ページの現段階では具体値・具体方式を確定しません。

* 浮遊範囲
* 配置方法
* 移動速度
* 移動方向の決定方法
* 他のシャオンダマとの位置関係
* Playerや敵との位置関係を利用した配置・移動ルール

特に、**敵の周囲を基準として浮遊させる仕様は採用しません**。

### 選択可能状態と最低保証数

最低保証数へ算入できるShaondamaは、次の条件をすべて満たす個体だけです。

- 生成元に応じた選択開始条件を満たしている
  - RadioWhale経路：出現演出が完了し、Gameplayへ制御移譲済みである
  - Parry変換経路：Wildcard変換がcommit済みである
- 現在Playerの選択対象として公開されている
- `Reserved`ではない
- 消費済み・終了処理中ではない
- 現在のBattle IDに属している
- Battle結果が未確定である

次の個体は最低保証数へ算入しません。

- RadioWhale経路の生成要求中
- RadioWhale経路の論理生成済み・出現演出開始前
- RadioWhale経路の出現演出中
- RadioWhale経路の出現演出完了処理中・制御移譲前
- Parry変換要求中・変換commit前
- 選択不可
- `Reserved`
- 消費済み・自然破裂処理中・一般Lifetime終了処理中
- Battle終了後または旧Battle ID所属

Parry由来Wildcardは、変換commitと同時に選択可能かつ非`Reserved`であれば、そのcommit時点から最低保証数へ算入します。選択可能化や算入開始を次フレーム、演出完了、RadioWhaleからの制御移譲まで遅らせません。

弾き移動中であることは、Charge対象検索または最低保証数への算入から除外する理由になりません。変換commitより前に完了したCharge対象検索へ遡って追加はせず、commit後に開始または再評価された検索から取得可能とします。

### `Reserved`への遷移

Charge成功がcommitされ、対象個体が`Reserved`へ移行した時点で、次を一体として扱います。

1. Playerの新しい選択対象から除外する
2. 最低保証数から除外する
3. 浮遊移動を停止する
4. `Reserved`へ移行した瞬間の現在World座標に留める
5. 一般Lifetimeの進行を停止する
6. Normalの場合は未使用時の自然破裂対象から除外する
7. 選択可能数の変化を最低保証判定側へ通知する

`Reserved`へのcommitと最低保証数からの除外を別フレームへ分けません。`Reserved`個体を一時的に選択可能数へ残し、不足検出を遅らせる処理は行いません。

`Reserved`中のShaondamaは、浮遊アルゴリズムによる移動を再開せず、Playerや共通の発射位置へ移動させません。対応する発射タイミングまで、`Reserved`へ移行した位置に留まります。

### 不足検出結果の通知

RadioWhale経路の出現演出完了、Parry由来Wildcardの変換commit、`Reserved`への遷移、消費、自然破裂、一般Lifetime終了、Battle終了などによって選択可能数が変化した場合、現在Battleについて選択可能かつ非`Reserved`の個体数を再評価できる通知を最低保証判定側へ送ります。

通知は少なくとも、次の意味を識別できる状態にします。

| 通知情報 | 内容 |
|---|---|
| Battle ID | 集計対象となるBattle |
| 個体識別情報 | 状態が変化したShaondama |
| 変更後状態 | 選択可能、`Reserved`、消費済み、終了等 |
| 算入可否 | 変更後に最低保証数へ数えられるか |
| 不足検出結果 | 現在数が最低保証数を下回ったか |

本ページは個体状態と算入可否を確定し、個数不足の検出結果を生成側へ通知します。ただし、次の処理は[シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)を正本とします。

- 最低保証数の具体値を所有する
- 現在不足数を確定する
- 補充要求中数を差し引く
- Wildcardを新しく何個要求するか判断する
- Battle開始Readyを成立させる

不足を検出しただけで、本ページからWildcardを直接生成しません。Wildcardの生成元・個体生成は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)、最低保証補充の出現演出は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)へ委譲します。

### 一般Lifetime

シャオンダマには、浮遊開始後の通常滞在時間を制御する一般Lifetimeを設定します。

Parry由来Wildcardは変換commit時点で選択可能なWildcard状態へ直接入るため、その時点から一般Lifetimeを開始します。弾き移動中も一般Lifetimeは通常どおり進行し、弾き移動の終了時にLifetimeを再開始またはresetしません。

- 一般Lifetimeは数十秒程度を想定しますが、正式な秒数は未決です。
- Pause中は一般Lifetimeを進行させません。
- Reserved中は一般Lifetimeの進行を停止します。
- 一般Lifetimeで終了する場合は、選択不能化・最低保証数からの除外・終了通知を行い、割れる演出後にworld objectを消滅させます。
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

未使用Normal Shaondamaが自身のsource NoteEvent時刻へ到達した場合は、同一フレームのCharge成功commitを先に解決した後、以下の順序で一度だけ自然破裂を処理します。

1. Battle IDが現在のBattleと一致し、Battle結果が未確定であることを確認する
2. 同一フレームで対象個体のCharge成功がcommitされていないことを確認する
3. 対象が未使用であり、`Reserved`・消費済み・終了処理済みではないことを確認する
4. 対象個体を選択不能にし、最低保証数から除外する
5. 自然破裂の終了処理を開始済みとして固定する
6. 自然破裂の見た目と音を発生させる
7. 対象個体を発生元とする小範囲Weak攻撃要求を1回だけ発行する
8. 攻撃範囲内の有効EnemyをEnemy単位で重複排除する
9. 各Enemyへ、発生元NormalのRGB値を使ったWeak Damageを1回だけ通知する
10. world objectを消滅させ、個体の終了状態を固定する
11. 選択可能数の変化を最低保証判定側へ通知する

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
| RGB payload | 発生元Normal Shaondamaが保持する基本色／RGB値 |
| 攻撃識別情報 | 1回の自然破裂をEnemy側で重複識別できる情報 |

### 同一Enemyへの命中は1回

1回の自然破裂では、攻撃範囲内の同一Enemyへ1回だけWeak Damageを通知します。

Enemyが複数のColliderまたはHurtboxを持ち、それらが同じ自然破裂範囲へ入った場合も、Collider単位ではなくEnemy単位で重複排除します。

```text
1回の自然破裂
↓
範囲内Collider／Hurtboxを収集
↓
所属Enemy単位で重複排除
↓
同一EnemyへRGB Damage通知1回
```

範囲内に異なるEnemyが3体いる場合は、各Enemyへ1回ずつ、合計3件の通知を行えます。同一Enemyへ3回通知する意味ではありません。

具体的な攻撃範囲は未決の調整パラメータです。Enemy単位の識別方法、同一フレームのRGB候補収集、加算、clamp、および浄化判定は[敵の被弾と浄化](/spec/enemy/damage-and-purify)を正本とします。

### 元NormalのRGB値を使用する

自然破裂Damageには、発生元Normal Shaondamaが保持する基本色／RGB値を使用します。

例えば、発生元が赤のRGB値`(255, 0, 0)`を持つ場合、その値をEnemyのRGB浄化値へ加算するpayloadとして通知します。Player HP Damageのような単一Damage値へ変換しません。

- 破裂時に周囲の色から新しいRGB値を決めません。
- 範囲内Enemyごとに別の色へ変えません。
- Wildcard専用Damage値へ置き換えません。
- 見た目のVFX色だけを根拠にpayloadを作りません。

発生元Normalの基本色／RGB値の保持方法は[玉のデータ](/spec/shaondama-music/orb-data)、Enemyへの最終的なRGB加算と浄化は[敵の被弾と浄化](/spec/enemy/damage-and-purify)を正本とします。

### 同一フレームのCharge成功を優先する

同じNormal Shaondamaについて、Charge成功とsource NoteEvent時刻到達が同一フレームに成立する場合は、Charge成功を先にcommitします。

```text
同一フレーム
├─ Charge成功候補
└─ source NoteEvent時刻到達
↓
Charge成功をcommit
↓
対象個体をReservedへ移行
↓
自然破裂を発生させない
```

Charge入力またはCharge判定が存在するだけでは自然破裂を抑止しません。対象個体についてCharge successが成立し、同一フレームのcommitで`Reserved`へ移行した場合に限って自然破裂を抑止します。

Chargeがmiss、cancel、強制終了、またはcommit不成立であり、他の自然破裂条件をすべて満たす場合は、source NoteEvent時刻による自然破裂を行います。

Charge成功判定と`Reserved`へのcommit順序は[Charge Allocation](/spec/draw-system/charge-allocation)を正本とします。本ページはcommit済み状態を受けて自然破裂の可否を確定します。

### Reserved

Charge successによってReservedへ移行したシャオンダマは、未使用シャオンダマではありません。

- `Reserved`へ移行した時点でPlayerの選択対象から外します。
- `Reserved`へ移行した時点で最低保証数から除外します。
- 最低保証判定側へ算入状態の変化を通知します。
- 一般Lifetimeの進行を停止します。
- source NoteEvent時刻へ到達しても、未使用Normalの自然破裂を発生させません。
- 対応するAttackEventで使用されるか、Battle終了処理を受けるまでworld上の対応実体を保持します。
- Reserved中の個体を再び選択対象へ含めません。
- Reserved中に一般Lifetime終了や自然破裂によって個体を消滅させません。

現行仕様では、Reservedから未使用の浮遊状態へ暗黙に戻す遷移を設けません。将来その遷移を追加する場合は、一般Lifetimeの再開時点と、経過済みsource NoteEventの扱いを別途仕様化します。

### 消費・Palette Bullet化

AttackEventで使用対象に確定したReserved Shaondamaは、対応する発射タイミングまで、`Reserved`へ移行した位置に留まります。

対応する発射タイミングでは、その時点の現在World座標を発射開始位置としてPalette Bullet化します。

- Palette Bullet化した時点で、Shaondamaとしての浮遊状態と`Reserved`状態を終了します。
- 同一個体をShaondamaとPalette Bulletの両方として残しません。
- 元のworld objectを未使用浮遊状態へ戻しません。
- 一般Lifetimeやsource時刻自然破裂を再開しません。
- 同じ個体からPalette Bullet化、自然破裂、Lifetime終了を重複実行しません。
- 同じobjectを状態遷移させるか、情報を引き継いだ別objectへ置き換えるかは実装方式とします。
- 個体情報・有効RGB情報・実効音程・Damage dataの受け渡しは、[玉のデータ](/spec/shaondama-music/orb-data)、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)、[パレットブレット](/spec/combat/palette-bullet)を正本とします。

### Pause

通常Battle中のPauseでは、シャオンダマのGameplay lifecycleを停止します。

- 浮遊移動を進行させません。
- Parry由来Wildcardの弾き移動と力の減衰を進行させません。
- 一般Lifetimeを進行させません。
- BGMの音楽時計が停止するため、source NoteEvent時刻の自然破裂判定も進行させません。
- Resume後は同じBattle IDと停止前の状態を維持して再開します。
- Resume時にParry由来Wildcardへ弾き方向の力を再付与しません。

### Parry由来Wildcardの即時選択可能化と弾き移動

Parry成功した邪音玉は、Parry成立時点のworld位置で、邪音玉1弾につきWildcard 1個へ即座に変換されます。変換条件、同一Physics Stepの成功batchに含まれる各弾の1弾1個規則、生成位置、生成元区分、重複変換防止、および変換commitは[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とします。

Parry由来Wildcardは、変換commitと同じ処理単位で次の状態へ直接入ります。

1. 選択可能なWildcardとしてPlayerのCharge対象へ公開する
2. `Reserved`でなければ、同じcommit時点から最低保証数へ算入する
3. 選択可能数と算入可否の変化を最低保証判定側へ通知する
4. 一般Lifetimeを開始する
5. Parry側から対象ごとに渡された弾き方向の力を、変換済みWildcardへ1回だけ加える

最低保証補充Wildcardに適用するRadioWhaleの通常受付、背中側Spawn、一定時間の出現演出、「出現演出中・選択不可」状態、演出完了通知、およびGameplayへの制御移譲は、Parry由来Wildcardへ適用しません。表示上の変換演出が変換commit後も続く場合も、その演出完了を選択可能化、Charge対象検索、最低保証算入、または弾き移動開始の条件にしません。

力を受ける対象は、攻撃projectileとしての邪音玉ではなく、変換commit後のWildcardです。邪音玉が弾かれて移動した後にWildcardへ変換する中間Stateは設けません。

Parry由来Wildcardは弾き方向の力を受けた後も選択可能状態を維持し、移動中からCharge対象検索で取得できます。選択可能かつ非`Reserved`である限り、弾き移動中も最低保証数へ算入し続けます。

弾き移動中のWildcardがCharge成功によって`Reserved`へ移行した場合は、本ページの共通`Reserved`規則に従い、そのcommit時点で選択対象と最低保証数から除外し、弾き移動と浮遊移動を停止して、その瞬間の現在World座標に留めます。

弾き移動からPlayer Damage、Enemy Damage、Parry判定、追加のWildcard変換を発生させません。反射された邪音玉や攻撃projectileとして扱いません。弾き移動中に地形・Player・Enemy・他のShaondamaへ接触した場合の具体的な物理応答は、本ページでは確定しません。弾き移動後の浮遊、一般Lifetime、`Reserved`、消費、Palette Bullet化、Battle終了は、通常のWildcard／Shaondamaへ適用する本ページの共通規則へ接続します。

弾き方向は[Playerアクション｜パリィ](/spec/player/player-action-parry)が対象ごとのParry結果として確定し、[邪音玉](/spec/enemy/jaon-bullet)の変換要求を通して引き渡します。本ページでは入力方向、Playerの向き、接触方向などから弾き方向を再計算しません。正確な弾き方向の算出方法が未確定である間は、Player Parry側の調整・実装検討事項とします。

弾き移動に使用する力の強さ、減衰、最大移動量、落ち着くまでの時間は、本ページの調整データとして所有します。具体値はGameplayテストで調整し、実装へ直書きしません。Normal Parry／Just Parryによって、Wildcardの生成数、種別、選択条件、および弾き移動の基本性能を変えません。

Battle結果確定後、現在Battleと異なるBattle IDの要求、または変換commit後に届いた重複・遅延callbackから、変換、選択可能化、最低保証算入、力の付与を行いません。同じ変換commitに対する力の付与は最大1回です。

### Battle結果確定時

ClearまたはGame Overの結果が確定した時点で、対象Battleの全Shaondamaを即座にGameplay上無効化します。

- 新しいCharge対象として公開しません。
- Charge判定中の選択対象、Allocation候補、Slot割り当て対象として使用しません。
- Battle結果確定後に新しいAllocation commitや`Reserved`への遷移を成立させません。
- AttackEventの使用対象やPalette Bullet化の対象にしません。
- 最低保証数へ算入せず、個体の算入状態を無効化します。
- 浮遊移動、一般Lifetime、source NoteEvent時刻の自然破裂判定を停止します。
- Parry由来Wildcardの弾き移動、力の減衰、および未適用の力付与を停止します。
- 新しいWeak攻撃、Hit、Damage、AttackEvent、Palette Bulletを発生させません。
- 遅延した選択可能化、弾き方向の力付与、`Reserved`、自然破裂、Lifetime終了、消費、Palette Bullet化のcallbackをGameplayへ適用しません。

Battle結果確定時点で未確定のCharge、Allocation候補、選択中のShaondamaを後からcommitしません。未確定Chargeの破棄とAllocation関係の解消は[Charge Allocation](/spec/draw-system/charge-allocation)、未発射AttackEventと未消費`Reserved`の取消・解放は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正本とします。

本ページは、浮遊中またはworld上に残るShaondama objectと、そのGameplay参照の無効化を所有します。AttackEvent側が所有する未消費`Reserved`を本ページから重複解放しません。

#### Clear時

Clear時に残っているShaondamaは、終了演出として一斉に割れて構いません。

この破裂は通常の自然破裂とは別の`BattleEndPresentation`として扱い、次を一切発生させません。

- 自然破裂Weak攻撃
- Hit／Damage候補
- 爆発範囲などのGameplay query
- AttackEventまたはAllocation
- `Reserved`への遷移
- Palette Bullet化
- 最低保証数の不足通知や補充要求

Clear演出として見た目とSEだけを発生させる場合も、演出開始前に対象個体のGameplay参照を無効化します。

#### Game Over時

Game Over時は、全Shaondamaについて次のGameplay参照を無効化します。

- 選択可能個体としての参照
- 最低保証数への算入参照
- Charge／Allocation候補としての参照
- AttackEvent／`Reserved`／Palette Bullet化に使用する参照
- 浮遊、Lifetime、source NoteEvent時刻監視の更新参照
- Parry由来Wildcardの弾き移動、力の減衰、および力付与callback
- 自然破裂、Hit、Damage、消費に関する予約通知とcallback

残存objectを即時消去するか、Game Over演出として表示を残すかは演出仕様として未決です。どちらの場合もGameplay出力を発生させません。

#### 表示専用の残留演出

Clear／Game Over後にShaondama object、破裂VFX、SEを表示専用として残すことはできます。

表示専用objectには、選択、Charge、Allocation、衝突、Hit、Damage、自然破裂、Palette Bullet化、Target提供などのGameplay機能を持たせません。見た目として浮遊や破裂が継続していても、Gameplay状態が継続している根拠にしません。

表示専用objectの消滅、VFX、SEの終了は必須cleanup完了条件に含めず、Result操作の解禁を妨げません。

#### cleanupの冪等性と完了条件

同じBattle IDに対する終了通知を複数回受けても、同じ個体のGameplay無効化、参照解除、終了処理を重複実行しません。現在と異なるBattle IDの終了通知によって、現在のBattleのShaondamaを無効化してはいけません。

次のすべてを満たした時点を、Shaondama Floating Ownerの必須cleanup完了とします。

- 終了したBattleの全Shaondamaを選択、Charge、Allocation、AttackEvent、Palette Bullet化の対象外にしている
- 終了したBattleの全Shaondamaを最低保証数から除外し、旧Battleの不足通知や補充要求を発生させない
- 浮遊、一般Lifetime、source NoteEvent時刻監視、自然破裂、Hit、Damageに関するGameplay更新を停止している
- Parry由来Wildcardの弾き移動、力の減衰、および未適用の力付与を停止している
- 選択可能化、弾き方向の力付与、`Reserved`、自然破裂、Lifetime終了、消費、Palette Bullet化に関する発行待ちcallbackを無効化している
- 旧Battle IDのShaondama objectと参照が現在または次のBattleへ影響できない

上記をすべて満たした時点で内部cleanup完了とし、対象battleIdを含むShaondama Floating Ownerの必須cleanup完了通知を、上位cleanup集約Ownerへ一度だけ送ります。表示専用object、VFX、SEの終了は待ちません。

### Retry／次Battle

Game Over ResultからのRetryまたは次のBattle開始時は、旧Battleに属するShaondama runtimeを破棄し、新しいBattle IDに付け替えません。

少なくとも次を新Battleへ持ち越しません。

- 選択可能な浮遊中個体
- `Reserved`個体
- 消費処理中・Palette Bullet化待ちのShaondama参照
- 自然破裂処理中objectとWeak攻撃予約
- 一般Lifetime timerとsource時刻監視状態
- Parry由来Wildcardの弾き移動状態、残存する力、および力付与予約
- 最低保証数への算入状態と不足通知予約
- 旧Battleの個体識別情報、source occurrence、Allocation参照
- 遅延した終了callback・Damage通知

新しいBattle IDを受領した後、RadioWhale経路では新Battleの生成要求と出現演出完了通知、Parry経路では新Battle中に成立した有効な変換commitから状態を構築し直します。旧Battle IDを持つ個体や通知は、選択可能化、弾き方向の力付与、最低保証算入、Charge、Allocation、`Reserved`、自然破裂、Palette Bullet化、Damageへ接続しません。

Retry地点とPlayer／Enemy／BGM等の再初期化値はGame・Stage／Room側へ委譲します。本ページは、旧BattleのShaondama状態をGameplay上無効化し、新Battleへ持ち越さないことを保証します。

## 状態別の挙動

| 状態・終了契機 | 選択可否 | 最低保証数 | 一般Lifetime | source時刻処理 | world object | Weak攻撃 |
|---|---|---|---|---|---|---|
| RadioWhale経路の生成要求中・論理生成済み | 不可 | 算入しない | 未開始 | 対象外 | 未表示または準備中 | 発生しない |
| RadioWhale経路の出現演出中 | 不可 | 算入しない | 未開始 | 対象外 | 出現途中 | 発生しない |
| RadioWhale経路の出現演出完了・制御移譲前 | 不可 | 算入しない | 未開始 | 対象外 | 出現済み | 発生しない |
| Parry変換commit・弾き移動中 | 可 | 非`Reserved`なら算入する | 進行 | 固定sourceなし | 変換済みWildcardとして弾き方向へ移動 | 発生しない |
| 選択可能な浮遊中 | 可 | 算入する | 進行 | 未使用Normalは到達時に自然破裂候補 | 維持 | 自然破裂時のみ発生 |
| Charge判定中・未`Reserved` | 判定対象 | 算入する | 進行 | 同frame success commitならCharge優先。未成立なら自然破裂 | commitまたは自然破裂まで維持 | Charge不成立時の自然破裂のみ |
| `Reserved` | 不可 | 算入しない | 停止 | 未使用時の自然破裂対象外 | 対応する発射タイミングまでReserved移行時のWorld座標に留まる | 発生しない |
| 消費済み・Palette Bullet化 | 不可 | 算入しない | 終了 | 対象外 | Shaondama objectとしては終了 | 発生しない |
| 一般Lifetime到達・Wildcard | 不可 | 算入しない | 終了 | 固定sourceなし | 割れて消滅 | 発生しない |
| 一般Lifetime到達・未使用Normal | 可 | 算入する | source時刻まで終了を保留 | source時刻で自然破裂 | source時刻まで維持 | source時刻に発生 |
| source時刻自然破裂 | 不可 | 算入しない | 終了 | 一回だけ解決 | 演出後に消滅 | 小範囲Weak攻撃を1回要求 |
| Battle結果確定／表示演出 | 不可 | 算入しない | 停止 | 停止 | 即時消去または表示専用演出後に消滅 | 発生しない |

どの終了条件が同時に成立しても、個体の最終終了処理は1回だけ実行します。

優先順位は以下です。

1. Battle結果確定済み状態によるGameplay無効化
2. 同一フレームのCharge成功commitと`Reserved`への遷移
3. 既に`Reserved`／消費済みである状態
4. 未使用Normalのsource NoteEvent時刻による自然破裂
5. 一般Lifetime

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

本ページからは、選択可能化、`Reserved`、消費、自然破裂、Lifetime終了、Battle終了による算入可否の変化と、不足検出結果を生成側へ通知します。生成側は現在数、最低保証数、補充要求中数を使って、新しいWildcard補充要求の要否と個数を決定します。

生成要求は、[玉のデータ](/spec/shaondama-music/orb-data)で定義したBattle ID、source NoteEvent occurrence、loop occurrence、source music timeを欠落なく個体へ渡す必要があります。

### ラジクジラ

ラジクジラは、生成要求を受け取ったShaondamaを世界内へ出現させ、出現演出を完了し、Gameplayへ制御移譲して選択可能化するところまでを担当します。

詳細は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とします。

本ページでは、**出現完了後にラジクジラからシャオンダマ側へ制御が移譲された後**を扱います。

ラジクジラ自身のPlayer追従・浮遊については、本ページでは扱いません。

Normal Shaondamaを使用するBattleではRadioWhaleを必須とします。RadioWhaleを経由せずにNormalを選択可能化し、本ページの浮遊状態や最低保証算入へ直接追加する経路は設けません。

最低保証補充WildcardもRadioWhaleの通常Spawn経路を使用します。一方、Parry由来WildcardはParry成立位置で即時変換・即時選択可能化されるため、RadioWhaleの通常受付、背中側Spawn、出現演出、演出完了通知、およびGameplayへの制御移譲へ合流しません。Parry由来Wildcardの弾き移動もRadioWhaleは管理しません。

### Charge

選択可能なシャオンダマをPlayerが選択した後のCharge入力は[Playerアクション｜チャージ](/spec/player/player-action-charge)、AllocationとReservedは[Charge Allocation](/spec/draw-system/charge-allocation)を正本とします。

本ページではChargeの開始条件・処理・終了条件などを再定義しません。

同一フレームにCharge成功とsource NoteEvent時刻到達が競合する場合、Charge／Allocation側はsuccess commitと`Reserved`への遷移を自然破裂判定より先に確定し、本ページへ結果を渡します。

また、旧仕様に存在した**選択されたシャオンダマ自体が敵へ飛んでいく挙動は採用しません**。

### AttackEvent

AttackEventの成立・発火・処理についてはBGM側のAttackEvent仕様を正本とし、本ページでは定義しません。

未使用Normalの自然破裂Weak攻撃は、Weak AttackEventまたはPalette Bulletへ変換せず、本ページが定義する即時範囲攻撃要求としてDamage処理へ接続します。

### Wildcard

- 最低保証不足から生成するWildcardの個数・生成元区分は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とします。
- 最低保証補充のWildcardは、出現演出完了・選択可能化後に本ページの浮遊状態へ入ります。
- Parry由来Wildcardは、Parry成立位置での変換commitと同時に選択可能なWildcard状態へ直接入り、RadioWhaleの出現演出を使用しません。
- Parry由来Wildcardは、変換直後に対象ごとの弾き方向の力を1回だけ受け、選択可能なまま移動します。
- 弾き移動中もCharge対象検索の対象となり、選択可能かつ非`Reserved`であれば変換commit時点から最低保証数へ算入します。
- 変換後の浮遊、一般Lifetime、`Reserved`、消費、Palette Bullet化、Battle終了は、他のWildcardと同じ本ページの共通規則へ接続します。

### Combat／Enemy Damage

- Battle結果確定後のGameplay無効化は[ゲーム全体](/spec/game/)と[戦闘](/spec/combat/)を正本とします。
- 本ページは、自然破裂Weak攻撃を発生させる条件、元NormalのRGB値をpayloadへ使用すること、1回の破裂につき同一Enemyへ1回だけ通知すること、および発生元個体の終了までを所有します。
- Enemyの識別・候補集約、同一フレームのRGB加算、clamp、浄化、および最終的なDamage適用は[敵の被弾と浄化](/spec/enemy/damage-and-purify)を正本とします。

## 責務境界

| 事項 | 所有者・正本 |
|---|---|
| RadioWhale経路の出現演出中の状態・完了通知 | RadioWhale Spawn |
| RadioWhale経路の出現演出完了後の浮遊・選択可能状態 | 本ページ |
| Parry由来Wildcardの変換commit・即時選択可能化 | 変換条件とcommitは万能シャオンダマ、commit後の状態は本ページ |
| Parry対象ごとの弾き方向確定 | Player Parry |
| Parry由来Wildcardの弾き移動・通常浮遊への接続 | 本ページ |
| 弾き移動の力・減衰・移動量・落ち着くまでの時間の調整データ | 本ページ |
| 最低保証数へ算入できる個体状態 | 本ページ |
| 最低保証数・不足数・補充要求中数・Wildcard要求判断 | BGM側のShaondama生成 |
| Wildcardの生成元・生成個数 | 万能シャオンダマ |
| Charge success判定・`Reserved`へのcommit | Player Charge／Charge Allocation |
| 一般Lifetime・Normal自然破裂・終了競合 | 本ページ |
| 自然破裂の元RGB使用・同一Enemy一回 | 本ページ |
| Normalの基本色・RGB data | 玉のデータ |
| EnemyへのRGB加算・clamp・浄化 | Enemy Damage |
| Battle結果確定・Result接続・Retry／次Battle境界 | Game／Combat／Stage・Room |
| Battle結果確定後のShaondama固有のGameplay無効化とcleanup | 本ページ |

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
* Parryの弾き方向を算出する具体方式
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
| Parry由来Wildcardへ加える力の強さ | 未決 | 本ページの調整データとしてGameplayテストで調整予定 |
| Parry由来Wildcardの力の減衰 | 未決 | 本ページの調整データとしてGameplayテストで調整予定 |
| Parry由来Wildcardの最大移動量 | 未決 | 本ページの調整データとしてGameplayテストで調整予定 |
| Parry由来Wildcardが落ち着くまでの時間 | 未決 | 本ページの調整データとしてGameplayテストで調整予定 |
| 自然破裂Weak攻撃範囲 | 未決 | Gameplayテストで調整予定 |

## 未決事項

- 一般Lifetimeの正式な秒数
- 一般Lifetime終了時・自然破裂時の具体的なVFX／SE
- Game Over時に残存objectを即時消去するか、終了演出として表示を残すか
- 生成後の詳細な浮遊アルゴリズム
- 浮遊範囲・配置方法・浮遊速度
- Parry由来Wildcardへ加える力の強さ、減衰、最大移動量、落ち着くまでの時間の具体値
- Parry由来Wildcardの弾き移動中に、地形・Player・Enemy・他のShaondamaへ接触した場合の物理応答
- Normal Shaondama自然破裂のWeak攻撃範囲

これらはGameplayテスト、バランス調整、または関係ページ間の決定が必要なため、意図的に未決とします。

一方、次の事項は決定済みです。

- RadioWhale経路の出現演出中は選択不可・最低保証数への算入外とする
- RadioWhale経路では出現演出完了後に浮遊状態へ入り、選択可能化する
- Parry由来Wildcardは変換commit時点で選択可能なWildcard状態へ直接入り、RadioWhale経路や「出現演出中・選択不可」状態を使用しない
- Parry由来Wildcardは変換直後に弾き方向の力を1回だけ受け、選択可能なまま移動する
- 力を受けて移動するのは変換済みWildcardであり、邪音玉が弾かれて移動する中間Stateは設けない
- Normal Parry／Just Parryによって、Wildcardの生成数、種別、選択条件、および弾き移動の基本性能を変えない
- Parry由来Wildcardは弾き移動中もCharge対象検索の対象となり、選択可能かつ非`Reserved`なら変換commit時点から最低保証数へ算入する
- Parry由来Wildcardは弾き移動後も通常のWildcardと同じ浮遊・一般Lifetime・`Reserved`・消費・Battle終了規則へ接続する
- 最低保証数へ数えるのは選択可能かつ非`Reserved`の個体だけとする
- `Reserved`へ移行した時点で最低保証数から除外する
- 不足検出結果を生成側へ通知し、Wildcard生成判断は担当ページへ委譲する
- Normalの自然破裂は範囲内の同一Enemyへ1回だけ命中する
- 自然破裂Damageには発生元NormalのRGB値を使用する
- 同一フレームではCharge成功commitを自然破裂より優先する
- Battle結果確定時は旧BattleのShaondamaをGameplay上無効化し、Retryまたは次のBattleへ状態・参照を持ち越さない

## 関連タスク

<PageRelations />
