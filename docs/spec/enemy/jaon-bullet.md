---
title: 邪音玉
description: 敵が発射する弾「邪音玉」の挙動と命中時の効果
pageType: spec
category: 敵
order: 40
status: 仮仕様
---

# 邪音玉

## ページ概要

- 対象担当：プログラム班・企画班
- 関連ページ：[敵](/spec/enemy/)、[Playerアクション｜パリィ](/spec/player/player-action-parry)、[Player｜被弾](/spec/player/player-reaction-damaged)、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)

## 目的

敵が発射する弾「邪音玉」の発射後の挙動と、プレイヤー・パリィとの相互作用を定義します。

発射の条件・間隔・狙い方は「邪音玉の発射」ページで定義します（作成中）。

現段階では、**Battle結果確定後のJaon Bullet共通契約**に加えて、Player側のParry判定batchから成功結果を受け取った後の弾単位の終了処理とWildcard変換要求を確定します。

弾速、通常飛行、通常命中時のDamage量、壁・地形との衝突、発射元Enemy浄化後の扱いは今回変更せず、仮仕様または未決のままとします。これらは後続のJaon Bullet設計で確定します。

## プレイヤーから見た挙動

- 敵から邪音玉が飛んでくる
- 当たるとダメージを受ける
- 移動で避けるか、パリィで無効化できる

## 詳細仕様

- **名称**：敵の弾は「邪音玉」で統一する（ゲーム内の表示名は未決）
- **軌道**：発射時に決めた方向へ直線に飛ぶ。追尾しない（仮）
- **弾速**：未決
- **寿命**：一定時間または一定距離で消滅する。数値は未決
- **命中**：プレイヤーに命中するとダメージを与え、邪音玉は消滅する。ダメージ量は未決
- **障害物**：壁・地形に当たったときの挙動（消滅するか貫通するか）は未決
- **見た目**：色・形状のデザインは未決（色はダメージに影響しない演出とする想定・仮）
- **Battle所属**：各Jaon Bulletは生成元Battleの`battleId`を保持する

## 状態別の挙動

- 飛翔中：直線移動を続ける
- プレイヤーに命中：ダメージを与えて消滅する（被弾処理は[Player｜被弾](/spec/player/player-reaction-damaged)に従う）
- Parry判定batch参加中：同一Physics StepでPlayerのParry判定へ入った他の有効な邪音玉と同じbatchへ参加できる。個別callbackの到着順だけではDamageまたはParry成功を確定しない
- パリィされた場合：Damageを発生させず、攻撃projectileとして終了する。Parry成立時のworld位置、`battleId`、変換元邪音玉ID、および対象ごとの弾き方向をsnapshotし、邪音玉1弾につきWildcard変換要求を1回だけ発行する。変換commit後に力を受けて移動するのは、邪音玉ではなく変換済みWildcardとする
- 寿命切れ：消滅する
- Battle結果確定後：飛行中か判定処理中かにかかわらず、即座にGameplay無効となる。表示を残す場合は表示専用とする

## Parry判定batchと弾単位の解決

Parry判定batchの収集、Normal / Just評価、1回のParryingで成功できるbatch数、およびbatch処理後の成功枠消費は、[Playerアクション｜パリィ](/spec/player/player-action-parry)を正本とします。

本ページでは、邪音玉がbatchへ参加する条件と、Parry側から成功結果を受け取った各邪音玉の弾単位処理を定義します。

### 同一Physics Stepのbatch参加

同一Physics StepでPlayerのParry判定へ入った有効な邪音玉は、同じParry判定batchへ参加できます。

batchへ参加できる邪音玉は、次の条件をすべて満たす必要があります。

- 現在のBattleと一致する有効な`battleId`を保持している
- Battle結果確定によるGameplay無効化が行われていない
- 攻撃projectileとして有効である
- その邪音玉についてDamage、Parry成功、Wildcard変換のいずれも確定していない
- Player側から有効なParry対象として受理されている

同じ邪音玉から同一Physics Step内に複数のCollider、Trigger、Overlap、Hit callbackが届いても、同じbatchへ重複参加させません。

各邪音玉は個別callbackの到着時点でNormal / Justを判定しません。同じbatch内の邪音玉には、Player Parry側がbatch判定時点で確定した同一のNormal / Just評価を適用します。

接触callbackの到着順によって、最初の1弾だけをParry成功にしたり、同じPhysics Stepの後続弾を通常Damageとして先に確定したりしてはいけません。

batchを収集している間は、同じ接触から発生したDamage候補の最終確定を保留します。batchがParry成功した場合はParry結果を優先し、batch内の各邪音玉からのDamageを成立させません。

batchがParry成功しなかった場合は、通常のHit・Damage処理へ進みます。通常Hit・Damageの詳細は今回変更しません。

### Parry成功結果を受け取ったときの処理

Parry側からbatchの成功結果を受け取った各邪音玉は、次の順に弾単位の処理を行います。

```text
Parry成功結果を受信
↓
battleId・Gameplay有効性・未解決を確認
↓
Parry成立時のworld位置・battleId・変換元邪音玉ID・対象ごとの弾き方向をsnapshot
↓
その邪音玉の最終結果をParry成功として一度だけ確定
↓
Damageと通常被弾要求を無効化
↓
攻撃projectileとして終了
↓
world位置・battleId・変換元邪音玉ID・弾き方向を含むWildcard変換要求を1回だけ発行
↓
Wildcard側が変換をcommitし、同時に選択可能化
↓
変換済みWildcardへ弾き方向の力を1回だけ付与
```

Parry成功した邪音玉は、PlayerへDamageを発生させません。すでに作成されている未確定のDamage候補や被弾リアクション要求がある場合も破棄します。

攻撃projectileとして終了した時点で、Gameplay上の飛行、衝突、Hit、Damage、Parry受付を停止します。反射弾や別の攻撃projectileとして残しません。

Wildcard変換commit後も、変換元の邪音玉として移動、衝突、Hit、Damage、Parry受付、再変換を行いません。邪音玉が弾かれて移動した後にWildcardへ変換する中間Stateは設けず、実際に力を受ける対象は即時変換後のWildcardとします。

本体、軌跡、消滅VFX、SEなどを一時的に残す場合は表示専用とし、その位置や接触をGameplay処理へ再利用しません。objectを即時破棄するかpoolへ返すかなどの実装方式は本ページでは固定しません。

Player Parry側の成功枠は、同じbatch内の全邪音玉を処理した後にPlayer Parry側が消費します。各邪音玉が個別に成功枠を消費したり、弾数分のParrying成功を要求したりしてはいけません。

各邪音玉からHitStopを個別に発生させません。同じbatchに対するNormal / Just評価と1回のHitStopはPlayer Parry側を正本とします。

### Wildcard変換要求

Parry成功した邪音玉は、**1弾につき1個**のWildcard変換要求を発行します。

変換位置には、各邪音玉についてsnapshotしたParry成立時のworld位置を使用します。同じbatch内の複数弾をbatch中心などの1座標へまとめず、各弾固有の位置を渡します。

Wildcard変換要求には、少なくとも次の対応関係を維持できる情報を渡します。

- 変換元邪音玉ID
- 変換元と同じ`battleId`
- Parry成立時のworld位置
- Player Parry側が対象ごとに確定した弾き方向

同じbatchに複数の邪音玉が含まれる場合も、各弾固有のworld位置、変換元邪音玉ID、弾き方向を個別に渡します。batch全体を1つの変換要求へまとめたり、1つの弾き方向で上書きしたりしてはいけません。

弾き方向は[Playerアクション｜パリィ](/spec/player/player-action-parry)が対象ごとのParry結果として確定した値を使用します。Jaon Bullet側で固定の「Playerから離れる方向」へ置き換えたり、入力方向、Playerの向き、接触方向などから独自に再計算したりしません。正確な算出方法が未確定である間は、Player Parry側の調整・実装検討事項とします。

`変換元邪音玉IDと`battleId`の組み合わせによる重複変換・重複生成の防止は、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とします。同一の邪音玉から成立させる変換要求は最大1回とし、同一の組み合わせから成立させる変換commitも最大1回とします。

Normal ParryとJust Parryのどちらでも、Wildcardの生成数、種別、変換位置の決定方法、選択条件、弾き移動の基本性能、およびその他のGameplay性能を同じにします。Just Parryを理由として追加のWildcard変換要求を発行したり、強いWildcardや強い弾き移動へ変更したりしてはいけません。

邪音玉はWildcard変換要求を発行した後も、同じcallbackや遅延callbackから変換要求を再発行しません。

Parry由来Wildcardは、Parry成立時点のworld位置で即座に変換commitされ、commitと同時にPlayerのCharge対象として選択可能になります。その後、変換要求で渡した弾き方向の力を変換済みWildcardへ1回だけ加えます。選択可能化、弾き移動、最低保証数への算入、および変換後のlifecycleの詳細は、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とします。

変換後のWildcardは、弾き移動中も選択可能です。その移動を反射された邪音玉や攻撃projectileとして扱わず、Player Damage、Enemy Damage、Parry判定、追加のWildcard変換を発生させません。

変換要求の処理時点でBattle結果が確定済みである場合、または要求の`battleId`が現在のBattleと一致しない場合は、変換commit、選択可能化、力の付与を行いません。変換commit後に遅れて届いたcallbackから、同じWildcardへの力の再付与や再変換を行ってはいけません。

### Damageとの排他性と重複防止

同じ邪音玉について、通常DamageとParry成功を同時に成立させてはいけません。Parry成功時は、その成功結果と対応するWildcard変換要求をそれぞれ1回だけ成立させます。

Damage、Parry成功、Wildcard変換要求のいずれも、同じ邪音玉から複数回成立させてはいけません。

同一Physics StepでParry候補とDamage候補が競合する場合は、callbackの到着順ではなくPlayer Parry側のbatch結果を先に解決します。

- batchがParry成功：Damageを成立させず、Parry成功とWildcard変換要求1回を成立させる
- batchがParry不成立：Parry成功とWildcard変換を成立させず、通常のHit・Damage処理へ進める

Parry成功が確定した後に届いたDamage、Hit、Parry、変換の重複callbackは破棄します。通常Damageなど別の最終結果がすでに正当に確定している邪音玉へ、遅れて届いたParry成功結果を適用してはいけません。

この排他解決は邪音玉1弾ごとに冪等に行い、複数Colliderや複数callbackによって結果を増やしません。

## Battle結果確定時の共通契約

Battle結果の確定規則、同一frameの終了候補、Gameplay停止、およびResult接続は、`game/index.md`と`combat/index.md`を正本とします。本ページでは、Battle結果確定通知を受けた後にJaon Bullet Ownerが行う共通の無効化とcleanupだけを定義します。

### 即時Gameplay無効化

現在の`battleId`に対するBattle結果が確定した時点で、飛行中、衝突判定中、Hit処理中、Parry判定中のすべてのJaon Bulletを即座にGameplay無効へ移行します。

Gameplay無効化後のJaon Bulletは、次の対象または発生元として機能しません。

- PlayerへのDamage
- Playerや地形などとのGameplay上の衝突
- Hitおよび被弾リアクション要求
- Parry受付、Normal Parry判定、Just Parry判定
- Parry成功後のWildcard変換要求、選択可能化、弾き方向の力付与などの後続処理
- その他のGameplay状態変更

Battle結果確定と同じ更新処理内でも、結果確定後に届いた衝突、Hit、Damage、Parry callbackは破棄します。結果確定前にCombat側へ受理済みのDamageや終了候補がある場合は、Game／Combatの同一frame確定規則へ委譲し、本ページから巻き戻しや再送を行いません。

Battle結果確定後に、終了したBattleの`battleId`を持つ新しいJaon Bullet生成要求が届いた場合も拒否します。

### `battleId`による旧Battleの拒否

Jaon Bulletの生成、衝突、Hit、Damage、Parry、および遅延callbackには、生成元Battleの`battleId`を引き継ぎます。

Jaon Bulletが保持する`battleId`が現在のBattleと一致しない場合、そのJaon Bulletと、そこから届いた次の処理を破棄します。

- 衝突、Hit、Trigger、Overlap通知
- Damage候補と被弾リアクション要求
- Parry受付とParry判定結果
- Wildcard変換、選択可能化、弾き方向の力付与などの後続要求
- 寿命・距離判定などから届く遅延callback

Retryや次のStageで新しいBattleを開始する場合は、新しい`battleId`を使用します。旧BattleのJaon Bullet object、判定結果、参照、callbackを、新しいBattleのPlayer、Parry、Damage、Wildcard処理へ接続しません。

### 表示専用の残留object

Battle結果確定後に、Jaon Bullet本体、軌跡、消滅VFX、SEを表示専用として残すことはできます。

表示専用objectには、Gameplay上有効なCollider、Trigger、Hit判定、Damage判定、Parry判定、変換・生成処理を持たせません。見た目として飛行を続ける場合も、その位置や接触をGameplay処理へ使用しません。

表示専用object、VFX、SEの終了は必須cleanup完了条件に含めず、Result操作の解禁を妨げません。

### cleanupの冪等性

同じ`battleId`に対するBattle結果確定通知を複数回受けても、Gameplay無効化とcleanupは一度だけ行います。

すでに無効化済みのJaon Bulletへ終了処理を重複適用したり、破棄済みcallbackを再処理したり、cleanup完了通知を複数回送信したりしません。現在と異なる`battleId`の終了通知によって、現在のBattleのJaon Bulletを無効化してはいけません。

### cleanup完了条件

次のすべてを満たした時点を、Jaon Bullet Ownerの必須cleanup完了とします。

- 終了したBattleに対する新しいJaon Bullet生成要求を拒否している
- 終了したBattleに属するすべてのJaon BulletをGameplay無効化している
- Damage、衝突、Hit、Parryの判定と受付を停止している
- 発行待ちの衝突、Hit、Damage、Parry、変換・生成callbackを無効化している
- 旧`battleId`のJaon Bulletと参照が現在または次のBattleへ影響できない

上記をすべて満たした時点で内部cleanup完了とし、Jaon Bullet Ownerの必須cleanup完了を一度だけ通知します。表示専用object、VFX、SEの終了は待ちません。

この共通契約は、今回確定したParry結果とWildcard変換要求、および後続で確定する通常飛行、Hit、Damage、壁・地形との衝突などにも適用します。後続仕様は、Battle結果確定後にGameplay効果を再開させる例外を追加してはいけません。

## 他システムとの接続

- **パリィ**：同一Physics Stepのbatch収集、Normal / Just評価、成功枠消費、1batchにつき1回のHitStopはPlayer Parry側を正本とする。本ページはbatch参加条件と成功結果を受け取った後の弾単位処理を管理する（[Playerアクション｜パリィ](/spec/player/player-action-parry)）
- **Wildcard**：Parry成功した邪音玉1弾につき、Parry成立時のworld位置、`battleId`、変換元邪音玉ID、対象ごとの弾き方向を渡して変換要求を1回発行する。Wildcard側は変換commitと同時に選択可能化し、変換済みWildcardへ弾き方向の力を1回だけ加える。重複変換の防止、選択可能化、弾き移動、変換後のlifecycleはWildcard側を正本とする（[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)）
- **プレイヤーへのダメージ**：命中時の被弾リアクション（SmallHit／BigHit）はPlayer側でダメージ量から自動判定せず攻撃側が指定する仕様のため、邪音玉がどちらを与えるかを本仕様で定める必要がある（未決。[Player｜被弾](/spec/player/player-reaction-damaged)）
- **シャオンダマ**：浮遊中・Reserved中のシャオンダマと邪音玉が接触した場合の挙動は未決（[シャオンダマ・音楽連動](/spec/shaondama-music/)）
- **Battle終了**：結果確定後のJaon Bullet固有のGameplay無効化とcleanupは本ページ、Battle結果確定とResult接続は`game/index.md`と`combat/index.md`を正本とする

## 例外・禁止事項

- パラメータ類はハードコードせず、Inspectorで調整可能にする（`[SerializeField]` または ScriptableObject）
- Battle結果確定後のJaon BulletからDamage、衝突、Hit、Parry、変換・生成を成立させない
- 旧`battleId`のJaon Bulletまたは遅延callbackを現在・次のBattleへ接続しない
- 表示専用objectへGameplay上有効なCollider、Damage判定、Parry判定を残さない
- 同一Physics Step内のcallback到着順によって、同じbatchに参加できる後続の邪音玉をParry失敗にしない
- Parry成功した邪音玉からDamageを成立させたり、攻撃projectileとして飛行・衝突を継続させたりしない
- 邪音玉を弾き移動させてからWildcardへ変換したり、変換commit後の移動を反射弾や攻撃projectileとして扱ったりしない
- 同じ邪音玉からParry成功、Damage、Wildcard変換要求を重複成立させない
- Battle結果確定後、旧`battleId`のcallback、または変換commit後の重複callbackから、Wildcardの変換・選択可能化・力の付与を行わない
- Just Parryを理由としてWildcardの生成数、種別、Gameplay性能を変更しない

## パラメータ

| パラメータ | 値 | 状態 |
|---|---|---|
| 弾速 | 未決 | 🔴 |
| 寿命（時間または距離） | 未決 | 🔴 |
| ダメージ量 | 未決 | 🔴 |
| 被弾リアクション区分（SmallHit／BigHit） | 未決 | 🔴 |

## 未決事項

- 弾速・寿命・ダメージ量の数値
- 被弾リアクション区分（SmallHit／BigHitのどちらを与えるか）
- 障害物（壁・地形）に当たったときの挙動
- 浮遊中・Reserved中のシャオンダマと接触した場合の挙動
- 発射した敵が浄化された瞬間に、発射済みの邪音玉を残すか消すか
- 色・形状のデザイン

## 関連タスク

<PageRelations />
