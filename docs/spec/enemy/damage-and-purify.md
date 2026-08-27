---
title: 敵の被弾と浄化
description: RGB Damage候補の集約・丸め・Clamp・浄化値反映・浄化成立の一回確定・Stage通知
pageType: spec
category: 敵
order: 50
status: 仮仕様
---

# 敵の被弾と浄化

## ページ概要

- 対象担当：プログラム班・企画班
- 関連ページ：[敵](/spec/enemy/)、[戦闘](/spec/combat/)、[パレットブレット](/spec/combat/palette-bullet)、[シャオンダマのデータ](/spec/shaondama-music/orb-data)、[ステージ](/spec/stage/)、[ゲーム全体](/spec/game/)

## 目的

本ページでは、Enemyが受け取るRGB Damage候補について、以下を定義します。

- Direct Contact RGB Damage候補とExplosion RGB Damage候補の受け取り
- Damage候補の有効性確認と重複除外
- 同一フレーム内のDamage集約
- RGB値の丸めとClamp
- EnemyのR・G・B浄化値への反映
- RGB浄化判定と浄化状態の一回確定
- 浄化成立後のEnemy状態
- `battleId`とEnemy／Clear対象識別情報を含むStageへの浄化成立通知
- 浄化済みEnemyに対するDamageの禁止

Palette Bulletの飛行・衝突・爆発と、各Damage候補の生成条件・算出式は、[パレットブレット](/spec/combat/palette-bullet)を正本とします。

本ページは、Palette BulletからDamage候補を受け取った後の同一frame集約順序、反映、浄化判定、および最終的に浄化が成立した後のStage通知境界を正本とします。

Enemy RGB Damageの同一frame処理は、本ページの「同一フレーム内のDamage集約」で定義する9段階の順序を確定仕様とします。別ページへ未定義のまま移管しません。

## 他ページとの責務境界

| 項目 | 正本 |
|---|---|
| Palette Bulletの衝突・爆発・爆発範囲・壁遮蔽 | [パレットブレット](/spec/combat/palette-bullet) |
| `DirectHitMultiplier`と`ExplosionMultiplier`を使用したRGB Damage候補の算出 | [パレットブレット](/spec/combat/palette-bullet) |
| Shaondamaから引き継ぐ個体情報・有効RGB情報 | [シャオンダマのデータ](/spec/shaondama-music/orb-data) |
| Damage候補の受け取り・重複除外・同一frame集約で必要となる処理 | 本ページ |
| Enemy RGB Damageの同一frame集約順序 | 本ページ |
| RGB Damageの丸め・浄化値への加算・Clamp | 本ページ |
| 浄化成立判定、浄化状態の一回確定、浄化後のEnemy状態 | 本ページ |
| Stageへの浄化成立通知 | 本ページ |
| Clear対象記録の`Purified`化、Clear条件評価、Clear候補通知 | [ステージ](/spec/stage/) |
| Markerの付着解除・残存・消滅 | [マーカー](/spec/combat/marker) |
| Clear候補とGame Over候補からの最終Battle結果確定 | [ゲーム全体](/spec/game/) |

## プレイヤーから見た挙動

- Palette BulletをEnemyへ直接命中させると、直接接触分と爆発分の両方が反映される
- Palette Bulletの爆発範囲内にいるEnemyへ、壁・地形に遮られていない場合のみ爆発分が反映される
- RGB Damageが加算されると、Enemyの体が黒から白へ近づいていく
- 3チャンネルすべてが最大値へ達したEnemyは浄化され、行動を停止する
- Stage objectiveが完了し、登録済みClear対象Enemyがすべて浄化済みまたは正式除外済みになると、StageからClear候補が発生する

## Enemyの浄化値

Enemyは、R・G・Bの3チャンネルの浄化値を持ちます。

| チャンネル | 初期値 | 上限 |
|---|---|---|
| R | 0 | Enemyに設定されたR最大浄化値 |
| G | 0 | Enemyに設定されたG最大浄化値 |
| B | 0 | Enemyに設定されたB最大浄化値 |

各チャンネルは独立して加算・Clampします。

Palette BulletのRGB Damageを、Player HP Damageのような単一Damage値へ変換しません。本ページにおけるEnemyへのDamage反映は、R・G・B浄化値への加算を指します。

Enemyが別用途のHPを持つ場合も、Palette BulletのRGB Damage候補からHP Damageを暗黙に生成しません。別途HPへ反映する仕様を採用する場合は、Enemy側の仕様として明示的に定義します。

## Palette Bulletから受け取るDamage候補

Enemy Damage処理は、Palette Bulletから次の2種類のDamage候補を受け取ります。

| Damage種別 | 発生条件 | RGB payload |
|---|---|---|
| Direct Contact RGB Damage | Palette Bulletが有効かつ未浄化のEnemyへ直接接触した | Palette Bulletの有効RGB値 × `DirectHitMultiplier` |
| Explosion RGB Damage | Enemyが爆発範囲内におり、壁・地形によって遮蔽されていない | Palette Bulletの有効RGB値 × `ExplosionMultiplier` |

`DirectHitMultiplier`と`ExplosionMultiplier`は独立した調整値です。

Palette Bullet側で倍率を適用して生成したRGB payloadを受け取るため、Enemy Damage処理で同じ倍率を再適用しません。

Damage候補は、少なくとも以下を識別できる情報を持つものとします。

- 対象Enemy
- Damage種別
- RGB payload
- 発生元Palette Bullet
- 発生元となる爆発の識別情報（Explosion RGB Damageの場合）
- 所属`battleId`

## Direct Contact RGB Damage

Palette Bulletが有効かつ未浄化のEnemyへ直接接触した場合、そのEnemyに対するDirect Contact RGB Damage候補を受け取ります。

Player、Shaondama、Marker、他の弾、地面、壁、浄化済みEnemyなどへの接触はPalette Bulletの爆発を発生させますが、Direct Contact RGB Damageの対象にはなりません。

## Explosion RGB Damage

Palette Bulletがいずれかの飛行終了条件へ到達して爆発した場合、爆発範囲内の有効かつ未浄化のEnemyに対するExplosion RGB Damage候補を受け取ります。

Palette Bulletの飛行終了理由が次のいずれであっても、同じExplosion RGB Damage処理を使用します。

- Target座標への到達
- 衝突対象との接触
- 最大飛行距離への到達
- 最大飛行時間への到達

爆心からの距離によるDamage減衰は行いません。爆発範囲と遮蔽の条件を満たすEnemyには、爆心からの距離にかかわらず同じRGB payloadを使用します。

## 直接命中Enemyへの2種類のDamage

有効かつ未浄化のEnemyへPalette Bulletが直接命中した場合、そのEnemyには以下の両方を適用します。

1. Direct Contact RGB Damage
2. 同じ着弾で発生したExplosion RGB Damage

```text
有効かつ未浄化のEnemyへ直接命中
↓
Direct Contact RGB Damage候補
+
Explosion RGB Damage候補
↓
同一フレームのEnemy Damage処理へ集約
```

2つは異なるDamage候補として扱います。Explosion RGB Damageの重複除外を理由に、Direct Contact RGB Damageを削除しません。

## Explosion RGB Damageの重複除外

1回の爆発につき、同一Enemyへ適用できるExplosion RGB Damageは最大1回です。

複数Colliderを持つEnemyが、同じ爆発の範囲判定で複数回検出された場合は、Enemy実体単位で1件へまとめます。

```text
Explosion識別情報
+
対象Enemy識別情報
↓
同じ組み合わせを重複除外
↓
Explosion RGB Damage候補 最大1件
```

異なる爆発から同じEnemyへ届いたExplosion RGB Damage候補は、それぞれ別のDamageとして受け付けます。

同じPalette BulletのDirect Contact RGB Damage候補とExplosion RGB Damage候補も、互いを重複候補として扱いません。

## 壁・地形による爆風遮蔽

壁または地形によって爆心から遮られているEnemyには、Explosion RGB Damageを適用しません。

爆心とEnemyのDamage判定点との間に対する物理的な遮蔽判定は、[パレットブレット](/spec/combat/palette-bullet)側で実行します。

Enemy Damage処理は、爆発範囲内かつ遮蔽されていないEnemyについて生成されたExplosion RGB Damage候補だけを受け付けます。

Enemy同士は、他のEnemyに対する爆風遮蔽物として扱いません。Enemy自身のColliderも、そのEnemyへの爆風を遮る壁・地形として扱いません。

VFXやシェーダー上の爆風表示はDamage可否の根拠にしません。

## 浄化済みEnemyへの接触・爆発

浄化済みEnemyは、AttackEventのTarget候補および新しいDamageの対象から外れます。

ただし、浄化済みEnemyの物理objectが残っている場合は、Palette Bulletの衝突対象から除外しません。

```text
Palette Bullet
↓
浄化済みEnemyへ接触
↓
その位置でPalette Bulletが爆発
├─ 接触した浄化済みEnemy
│   → Direct Contact RGB Damageなし
│   → Explosion RGB Damageなし
└─ 周囲の有効かつ未浄化のEnemy
    → 爆発範囲・遮蔽条件を満たせばExplosion RGB Damage候補
```

浄化済みEnemyとの接触を理由に発生した爆発でも、周囲の有効かつ未浄化のEnemyは通常どおりExplosion RGB Damageの対象になれます。

## 同一フレーム内のDamage集約

同一frameに同じEnemyへ複数のDamage候補が成立した場合、候補の到着順によって個別に浄化状態を確定せず、対象Enemyについて同一frame分をまとめて扱います。

### frame受付開始時点のEnemy snapshot

同一frameのDamage処理では、対象Enemyごとに1つの集約単位を作り、そのframeのDamage受付開始時点における次の状態をsnapshotします。

- 所属`battleId`
- 現在のR・G・B浄化値
- R・G・B最大浄化値
- 浄化済みか
- Damageを受け付ける有効な戦闘Enemyか

snapshot時点ですでに浄化済み、現在の`battleId`と不一致、またはDamage受付対象外であるEnemyには、そのframeの新しいRGB Damageを反映しません。

snapshot時点で未浄化かつ有効であるEnemyについては、同一frame内の個別候補を順番に適用して途中で浄化状態を変更しません。有効な候補をすべて集約した最終値に対してだけ、浄化判定を1回行います。

Clear対象であるか、またはStage側Clear対象記録が`FormallyExcluded`であるかは、Enemy自身のRGB Damage集約と浄化成立可否を決めるsnapshot条件に含めません。

### 確定処理順

同一frameのEnemy RGB Damageは、対象Enemyごとに次の順序で処理します。

1. 現在の`battleId`と一致し、候補成立時点および収集・処理時点でBattle結果が未確定であるDamage候補を収集する
2. frame受付開始時点のEnemy状態をsnapshotし、そのframeのDamage受付可否と加算前のR・G・B浄化値を確定する
3. `Explosion識別情報 + 対象Enemy識別情報`によってExplosion RGB Damage候補を重複除外する
4. 残ったDirect Contact RGB Damage候補とExplosion RGB Damage候補のRGB payloadを、チャンネルごとにすべて集約する
5. 集約後のR・G・B Damageを、`RGBDamageRoundingMode`に従ってチャンネルごとに丸める
6. 丸め後の集約RGB Damageを、snapshotした現在のR・G・B浄化値へチャンネルごとに加算する
7. 加算後の各チャンネルを、0から対応する最大浄化値の範囲へClampする
8. Clamp後の最終R・G・B浄化値から、そのframeの浄化成立を1回だけ判定する
9. 最終R・G・B浄化値、色表示、および浄化成立後のEnemy状態を反映する

```text
1. 有効候補を収集
↓
2. frame受付開始時点のEnemy状態をsnapshot
↓
3. Explosion候補を重複除外
↓
4. RGB payloadをチャンネルごとに集約
↓
5. 集約後に丸め
↓
6. snapshot値へ加算
↓
7. Clamp
↓
8. 最終値から浄化判定
↓
9. 色表示とEnemy状態へ反映
```

新しく浄化が成立したClear対象Enemyについては、9段階の処理完了後に「Stageへの浄化成立通知」の規則に従って通知します。Stage通知は、同一frameのRGB集約値を変更する処理ではありません。

### 集約単位と到着順非依存

- 同一frameのDamage集約は、1 Enemyにつき1回だけ実行します。
- 1つのEnemyについて、同一frame内にR・G・B浄化値を複数回書き戻しません。
- 同じ爆発と同じEnemyの組み合わせによるExplosion RGB Damageを重複適用しません。
- Direct Contact RGB DamageとExplosion RGB Damageを互いの重複候補として削除しません。
- 同一frameの有効候補を、候補の到着順によって一部だけ無効にしません。
- 同一frameのDamage候補の到着順によって、集約RGB値、更新後のR・G・B浄化値、または浄化成立結果を変化させてはいけません。
- 同一frameの最終状態に対して、浄化成立を最大1回だけ確定します。

概念上の入出力は次のとおりです。

```text
同一frameのDamage候補
├─ Direct Contact
├─ Explosion A
└─ Explosion B
↓
Enemy RGB Damageの同一frame処理
↓
そのframeの最終R／G／B浄化値
↓
浄化成立または未成立
```

Damage候補を生成したframeより前から浄化済みだったEnemyには、Damageを反映しません。同一frame内のいずれかの候補だけを先に適用してEnemyを浄化済みにし、その後に到着した同一frame候補を除外してはいけません。

Battle結果確定後のDamage候補は受け付けません。結果確定前に生成されても未処理のまま残っていた遅延Damageは、Battle結果確定後のEnemy状態へ適用せず、新しい浄化を成立させません。

## 丸め

Damage候補のRGB payloadは、同一フレーム分をチャンネルごとに集約した後、浄化値へ加算する前に丸めます。

丸め方式は`RGBDamageRoundingMode`として調整可能にし、切り捨て・四捨五入・切り上げなどの具体方式をデータで選択できる構造とします。

同じ入力に対して常に同じ結果となる決定的な丸め処理を使用します。表示上の小数処理とGameplay上の丸め処理を混同しません。

## 浄化値への加算とClamp

丸め後の集約RGB Damageを、Enemyの現在のR・G・B浄化値へチャンネルごとに加算します。

```text
New R = Clamp(Current R + Aggregated R Damage, 0, Max R)
New G = Clamp(Current G + Aggregated G Damage, 0, Max G)
New B = Clamp(Current B + Aggregated B Damage, 0, Max B)
```

最大浄化値を超えた分は切り捨てます。

超過分を以下へ使用しません。

- 他のRGBチャンネルへの変換・分配
- 次の被弾への繰り越し
- HP Damageなど別種Damageへの変換
- 別のEnemyへの転送

## 色変化

Enemyの見た目の色は、R・G・Bそれぞれの現在浄化値と最大浄化値の割合に応じて、黒から白へ変化します。

同一フレームに複数のDamage候補がある場合は、候補ごとに表示を更新せず、そのフレームの集約・Clamp完了後の最終値を表示へ反映します。

## 浄化の成立

Damage集約・丸め・加算・Clampが完了した後、次の条件を評価します。

```text
R = Max R
+
G = Max G
+
B = Max B
↓
浄化成立
```

3チャンネルすべてが最大浄化値に達した場合、そのEnemyの浄化を成立させます。

同一frameに複数のDamage候補がある場合も、本ページで確定した9段階処理の最終状態に対して、浄化成立を最大1回だけ確定します。

浄化状態は、次の条件をすべて満たす場合だけ未浄化から浄化済みへ一度だけ変更します。

- Damageおよび対象Enemyの`battleId`が現在のBattleと一致する
- 対象Battleの最終結果が未確定である
- 対象Enemyがまだ浄化済みではない
- 最終R・G・B浄化値がすべて最大浄化値へ達している

すでに浄化済みのEnemyについて、同じ浄化状態を再成立させません。Battle結果確定後に到着または処理された遅延Damageが最大浄化値へ到達する内容であっても、Enemy状態を更新せず、新しい浄化を成立させません。

Enemy自身の浄化は、StageのClear対象であるかにかかわらず成立できます。Clear対象ではない戦闘Enemyも、同じRGB条件を満たした場合は浄化済みになります。

Stage側Clear対象記録の`FormallyExcluded`は、Enemy自身の浄化状態とは独立します。正式除外済みのEnemyであっても、その後もDamage受付が有効であり、上記条件を満たす場合はEnemy自身の浄化を成立させられます。ただし、Stage側の`FormallyExcluded`記録を`Purified`へ変更しません。

## Stageへの浄化成立通知

Enemy Damage Ownerは、浄化状態を一度だけ確定した後、対応するStage側Clear対象記録を持つEnemyについて、Stageへ浄化成立通知を一度だけ送ります。

Clear対象ではないEnemyは、RGB条件を満たした場合にEnemy自身の浄化状態を通常どおり成立させますが、対応するStage側Clear対象記録が存在しないため、StageのClear対象記録を更新しません。

浄化成立通知には、少なくとも次を含めます。

- 対象`battleId`
- Enemy識別情報または対応するClear対象記録の識別情報
- 浄化成立
- 必要な場合は浄化成立frame

同じEnemyについて、浄化成立通知を複数回送りません。再送機構を使用する場合でも、Stage側で同じ論理通知を一度だけ適用できる識別情報を維持します。

Enemy Damage Ownerは、次を行いません。

- Stage objectiveを評価する
- wave、pending Spawn、Clear対象Enemy集合を再計算する
- Clear条件を評価する
- Clear候補を直接Gameへ送る
- 最終Battle結果を確定する

Stageは、通知の`battleId`が現在のBattleと一致し、対象が登録済みであり、まだ`Purified`または`FormallyExcluded`になっていない場合だけ、対応するClear対象記録を`Purified`へ一度だけ変更します。

対象のStage側記録がすでに`FormallyExcluded`である場合、Stageは通知を受けてもその記録を`Purified`へ変更しません。この場合も、Enemy自身に成立した浄化状態は取り消しません。登録済みClear対象記録が存在しない場合も、Stage側では何も更新せず、Enemy自身の浄化状態を巻き戻しません。

同一frameに同じ記録の正式除外と浄化成立通知が成立した場合も、Stage側記録は`FormallyExcluded`を維持し、通知の到着順によって`Purified`へ上書きしません。Enemy自身の浄化状態は、Stage側記録とは独立して成立できます。

同一frameに複数の浄化通知、動的Spawn登録、正式除外、Stage objective完了が成立した場合、Stageが同一frameの更新を収集してClear対象記録とobjectiveへ反映した後、Clear条件を一度だけ評価します。Enemy Damage Ownerは、これらのStage更新の収集順やClear評価順を決定しません。

現在と異なる`battleId`のDamageおよび浄化成立通知は、現在または次のBattleへ適用しません。Battle結果確定後は、遅延Damageから浄化状態や浄化成立通知を新たに発生させません。

## 浄化成立後

浄化が成立したEnemyは、以下を行います。

- 移動を停止する
- 攻撃を停止する
- AI行動を停止する
- 新しいRGB Damageを受け付けない
- AttackEventのTarget候補から外れる
- Markerの新しい付着対象から外れる

浄化済みEnemyの物理objectをその場に残す場合も、Palette Bulletの衝突対象としては有効です。

浄化後のEnemyをその場に残すか消滅させるか、および浄化演出の具体内容は未決とします。

浄化済みEnemyのworld objectをいつ非表示または破棄するかと、Stage側Clear対象記録をいつ破棄するかは分離します。world objectが消滅しても、それを理由にStage側の`Purified`記録を削除または未登録状態へ戻しません。

Stageは、重複通知と遅延通知を判別できるように、world objectの有無にかかわらず`Purified`記録を終了したBattleの記録として保持します。旧Battleの記録を新Battleへ引き継がず、Retry時は新しい`battleId`のClear対象記録を再構築します。

## Markerとの関係

Enemyが浄化しても、そのEnemyへ付着していたMarkerは自動的に消滅しません。

付着関係を維持できなくなったMarkerは、付着先から切り離され、その時点のWorld座標を保持したまま有効なTarget候補として残ります。

Markerを再び飛行させたり、別のEnemyへ自動的に付け替えたりしません。

Markerの付着解除・残存・Palette Bulletの爆風による消滅は、[マーカー](/spec/combat/marker)を正本とします。

## クリア判定との関係

Enemy Damage Ownerは、対応するStage側Clear対象記録を持つEnemyの浄化成立後に、Stageへ浄化成立通知を送るところまでを担当します。Clear対象ではないEnemyの浄化時はStage側記録を更新しません。いずれの場合もClear条件を評価せず、Clear候補をGameへ直接送りません。

Stageは、対象BattleのStage objectiveが`Completed`であり、登録済みClear対象Enemyがすべて`Purified`または`FormallyExcluded`である場合にだけ、対象`battleId`付きClear候補を一度だけ通知します。

Gameは、Stageから受け取ったClear候補とPlayer側のGame Over候補を収集し、最終Battle結果を一度だけ確定します。Enemy Damage Ownerは、Battle結果の確定順序、同一frame Clear＋Game Overの優先順位、Result、およびClear後の演出を再定義しません。

## 例外・禁止事項

- 浄化済みEnemyへRGB Damageを加算しない
- 同じ爆発から同じEnemyへExplosion RGB Damageを複数回適用しない
- Direct Contact RGB DamageとExplosion RGB Damageを同一候補として重複除外しない
- 爆心からの距離によってExplosion RGB Damageを減衰させない
- 壁・地形に遮られているEnemyへExplosion RGB Damageを適用しない
- Enemy同士を爆風遮蔽物として扱わない
- RGB Damageを単一HP Damageへ暗黙に変換しない
- 最大浄化値を超えた分を他チャンネル・次回被弾・別Damageへ転用しない
- 同一frameのDamage候補の到着順によって、集約RGB値、更新後の浄化値、または浄化成立結果を変化させない
- 同一frameのDamage集約を1 Enemyにつき複数回実行しない
- Clear対象として未登録であることを理由に、Enemy自身の浄化成立を拒否しない
- Stage側Clear対象記録が`FormallyExcluded`であることを理由に、Enemy自身の浄化成立を拒否しない
- `FormallyExcluded`済みのStage側Clear対象記録を、後続の浄化通知によって`Purified`へ変更しない
- 現在と異なる`battleId`のDamageまたは浄化成立通知を現在Battleへ適用しない
- 同じEnemyの浄化状態または浄化成立通知を複数回成立させない
- Battle結果確定後のDamage候補を反映したり、遅延Damageから新しい浄化を成立させたりしない
- Enemy Damage OwnerがClear条件を評価したり、Clear候補を直接Gameへ送ったりしない
- 浄化済みEnemyのworld object消滅を理由にStage側の`Purified`記録を削除しない
- Gameplay用パラメータをコードへハードコードしない

## パラメータ

| パラメータ | 内容 | 状態 |
|---|---|---|
| `MaxPurifyR` | Rチャンネルの最大浄化値 | 調整値 |
| `MaxPurifyG` | Gチャンネルの最大浄化値 | 調整値 |
| `MaxPurifyB` | Bチャンネルの最大浄化値 | 調整値 |
| `DirectHitMultiplier` | Direct Contact RGB Damageへ適用する倍率 | Palette Bullet側の調整値を参照 |
| `ExplosionMultiplier` | Explosion RGB Damageへ適用する倍率 | Palette Bullet側の調整値を参照 |
| `RGBDamageRoundingMode` | 同一フレーム集約後のRGB Damageに使用する丸め方式 | 調整値 |

各値はハードコードせず、Inspectorまたはデータアセットから調整できる構造とします。

固定の「7色RGB Damage表」は本ページで保持しません。Palette Bulletは、発生元Shaondamaから引き継いだ有効RGB値と、Damage種別ごとのMultiplierを使用します。

## 未決事項

- 各EnemyまたはEnemy種別に設定するR・G・B最大浄化値の具体値
- 浄化後のEnemyをその場に残すか消滅させるか
- 浄化演出の具体内容
- 浄化値が時間経過などで減少する仕組みを採用するか

「Explosion RGB Damageを採用するか」「爆発範囲内の同一Enemyへ何回適用するか」「距離減衰を使用するか」「壁・地形による遮蔽を使用するか」は確定済みであり、未決事項として扱いません。

Enemy RGB Damageの同一frame集約順序、Enemy状態のsnapshot時点、重複除外、RGB集約、丸め、加算、Clamp、浄化判定、および表示反映の順序は、本ページの「同一フレーム内のDamage集約」で確定済みであり、未決事項として扱いません。

## 関連タスク

<PageRelations />
