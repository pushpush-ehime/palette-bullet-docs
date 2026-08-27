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
- 関連ページ：[敵](/spec/enemy/)、[Playerアクション｜パリィ](/spec/player/player-action-parry)、[Player｜被弾](/spec/player/player-reaction-damaged)

## 目的

敵が発射する弾「邪音玉」の発射後の挙動と、プレイヤー・パリィとの相互作用を定義します。

発射の条件・間隔・狙い方は「邪音玉の発射」ページで定義します（作成中）。

現段階では、**Battle結果確定後のJaon Bullet共通契約**を先に確定します。通常飛行、Hit、Damage、Parry成功時の処理、およびWildcardへの接続の詳細は仮仕様または未決のままとし、後続の「Parry／Jaon Bullet／Wildcard」で確定します。

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
- パリィされた場合：攻撃として無効化される。無効化された邪音玉がその後どうなるか（消滅するか、別の物に変化するか）は未決
- 寿命切れ：消滅する
- Battle結果確定後：飛行中か判定処理中かにかかわらず、即座にGameplay無効となる。表示を残す場合は表示専用とする

## Battle結果確定時の共通契約

Battle結果の確定規則、同一frameの終了候補、Gameplay停止、およびResult接続は、`game/index.md`と`combat/index.md`を正本とします。本ページでは、Battle結果確定通知を受けた後にJaon Bullet Ownerが行う共通の無効化とcleanupだけを定義します。

### 即時Gameplay無効化

現在の`battleId`に対するBattle結果が確定した時点で、飛行中、衝突判定中、Hit処理中、Parry判定中のすべてのJaon Bulletを即座にGameplay無効へ移行します。

Gameplay無効化後のJaon Bulletは、次の対象または発生元として機能しません。

- PlayerへのDamage
- Playerや地形などとのGameplay上の衝突
- Hitおよび被弾リアクション要求
- Parry受付、通常Parry判定、Just Parry判定
- Parry成功後の変換・生成・反射などの後続処理
- その他のGameplay状態変更

Battle結果確定と同じ更新処理内でも、結果確定後に届いた衝突、Hit、Damage、Parry callbackは破棄します。結果確定前にCombat側へ受理済みのDamageや終了候補がある場合は、Game／Combatの同一frame確定規則へ委譲し、本ページから巻き戻しや再送を行いません。

Battle結果確定後に、終了したBattleの`battleId`を持つ新しいJaon Bullet生成要求が届いた場合も拒否します。

### `battleId`による旧Battleの拒否

Jaon Bulletの生成、衝突、Hit、Damage、Parry、および遅延callbackには、生成元Battleの`battleId`を引き継ぎます。

Jaon Bulletが保持する`battleId`が現在のBattleと一致しない場合、そのJaon Bulletと、そこから届いた次の処理を破棄します。

- 衝突、Hit、Trigger、Overlap通知
- Damage候補と被弾リアクション要求
- Parry受付とParry判定結果
- 変換、生成、反射などの後続要求
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

この共通契約は、後続で通常飛行、Hit、Parry、Wildcard接続の詳細を確定した後も維持します。後続仕様は、Battle結果確定後にGameplay効果を再開させる例外を追加してはいけません。

## 他システムとの接続

- **パリィ**：邪音玉はパリィの対象であり、パリィ成功時は攻撃として無効化される（[Playerアクション｜パリィ](/spec/player/player-action-parry)）
- **プレイヤーへのダメージ**：命中時の被弾リアクション（SmallHit／BigHit）はPlayer側でダメージ量から自動判定せず攻撃側が指定する仕様のため、邪音玉がどちらを与えるかを本仕様で定める必要がある（未決。[Player｜被弾](/spec/player/player-reaction-damaged)）
- **シャオンダマ**：浮遊中・Reserved中のシャオンダマと邪音玉が接触した場合の挙動は未決（[シャオンダマ・音楽連動](/spec/shaondama-music/)）
- **Battle終了**：結果確定後のJaon Bullet固有のGameplay無効化とcleanupは本ページ、Battle結果確定とResult接続は`game/index.md`と`combat/index.md`を正本とする

## 例外・禁止事項

- パラメータ類はハードコードせず、Inspectorで調整可能にする（`[SerializeField]` または ScriptableObject）
- Battle結果確定後のJaon BulletからDamage、衝突、Hit、Parry、変換・生成を成立させない
- 旧`battleId`のJaon Bulletまたは遅延callbackを現在・次のBattleへ接続しない
- 表示専用objectへGameplay上有効なCollider、Damage判定、Parry判定を残さない

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
- パリィで無効化された邪音玉のその後（消滅するか、別の物に変化するか）
- 障害物（壁・地形）に当たったときの挙動
- 浮遊中・Reserved中のシャオンダマと接触した場合の挙動
- 発射した敵が浄化された瞬間に、発射済みの邪音玉を残すか消すか
- 色・形状のデザイン

## 関連タスク

<PageRelations />
