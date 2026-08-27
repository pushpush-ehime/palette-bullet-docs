---
title: 敵の被弾と浄化
description: RGB Damage候補の集約・丸め・Clamp・浄化値反映・浄化成立処理
pageType: spec
category: 敵
order: 50
status: 仮仕様
---

# 敵の被弾と浄化

## ページ概要

- 対象担当：プログラム班・企画班
- 関連ページ：[敵](/spec/enemy/)、[戦闘](/spec/combat/)、[パレットブレット](/spec/combat/palette-bullet)、[シャオンダマのデータ](/spec/shaondama-music/orb-data)、[ゲーム全体](/spec/game/)

## 目的

本ページでは、Enemyが受け取るRGB Damage候補について、以下を定義します。

- Direct Contact RGB Damage候補とExplosion RGB Damage候補の受け取り
- Damage候補の有効性確認と重複除外
- 同一フレーム内のDamage集約
- RGB値の丸めとClamp
- EnemyのR・G・B浄化値への反映
- RGB浄化判定
- 浄化成立後のEnemy状態
- 浄化済みEnemyに対するDamageの禁止

Palette Bulletの飛行・衝突・爆発と、各Damage候補の生成条件・算出式は、[パレットブレット](/spec/combat/palette-bullet)を正本とします。

本ページは、Palette BulletからDamage候補を受け取った後の集約・反映・浄化判定を正本とします。

## 他ページとの責務境界

| 項目 | 正本 |
|---|---|
| Palette Bulletの衝突・爆発・爆発範囲・壁遮蔽 | [パレットブレット](/spec/combat/palette-bullet) |
| `DirectHitMultiplier`と`ExplosionMultiplier`を使用したRGB Damage候補の算出 | [パレットブレット](/spec/combat/palette-bullet) |
| Shaondamaから引き継ぐ個体情報・有効RGB情報 | [シャオンダマのデータ](/spec/shaondama-music/orb-data) |
| Damage候補の受け取り・重複除外・同一フレーム集約 | 本ページ |
| RGB Damageの丸め・浄化値への加算・Clamp | 本ページ |
| 浄化成立判定と浄化後のEnemy状態 | 本ページ |
| Markerの付着解除・残存・消滅 | [マーカー](/spec/combat/marker) |
| 全Enemy浄化後のBattle結果確定 | [ゲーム全体](/spec/game/) |

## プレイヤーから見た挙動

- Palette BulletをEnemyへ直接命中させると、直接接触分と爆発分の両方が反映される
- Palette Bulletの爆発範囲内にいるEnemyへ、壁・地形に遮られていない場合のみ爆発分が反映される
- RGB Damageが加算されると、Enemyの体が黒から白へ近づいていく
- 3チャンネルすべてが最大値へ達したEnemyは浄化され、行動を停止する
- ステージ内の全Enemyを浄化するとクリアになる

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
- 所属Battle

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

同一フレームに同じEnemyへ複数のDamage候補が成立した場合は、候補の到着順にEnemy状態を更新せず、対象Enemyごとに1回のDamage処理へ集約します。

同一フレームの処理順は、次のとおりです。

1. Battle結果確定前に成立したDamage候補を収集する
2. 対象Enemyが、そのフレームのDamage受付開始時点で有効かつ未浄化であることを確認する
3. Explosion RGB Damage候補を、爆発識別情報とEnemy識別情報の組み合わせで重複除外する
4. Direct ContactとExplosionを含む有効な全候補のRGB payloadをチャンネルごとに集約する
5. 集約結果へ設定済みの丸め方式を適用する
6. 現在のR・G・B浄化値へ、丸め後の各値を加算する
7. 各チャンネルを、それぞれの最大浄化値でClampする
8. 更新後の3チャンネルを使用して浄化成立を1回だけ判定する
9. 更新結果に応じて色表示とEnemy状態を反映する

```text
同一フレームのDamage候補
├─ Direct Contact
├─ Explosion A
└─ Explosion B
↓
有効性確認・重複除外
↓
R / G / Bごとに集約
↓
丸め
↓
現在値へ加算
↓
チャンネルごとにClamp
↓
浄化成立判定
```

同一フレーム内では、先に処理された1件によってEnemyが浄化済みとなり、同じフレームの残りの有効候補だけが無効になるような、候補の到着順に依存する処理を行いません。

Damage候補を生成したフレームより前から浄化済みだったEnemyには、Damageを集約・反映しません。

Battle結果確定後のDamage候補は受け付けません。結果確定前に生成されても未処理のまま残っていたDamage候補は、Battle終了処理に従って無効化します。

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

同一フレーム内に複数のDamage候補がある場合も、浄化成立判定は集約後の最終値に対して1回だけ実行します。

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

## Markerとの関係

Enemyが浄化しても、そのEnemyへ付着していたMarkerは自動的に消滅しません。

付着関係を維持できなくなったMarkerは、付着先から切り離され、その時点のWorld座標を保持したまま有効なTarget候補として残ります。

Markerを再び飛行させたり、別のEnemyへ自動的に付け替えたりしません。

Markerの付着解除・残存・Palette Bulletの爆風による消滅は、[マーカー](/spec/combat/marker)を正本とします。

## クリア判定との関係

ステージまたはBattle内の全対象Enemyが浄化された場合のクリア判定は、[ゲーム全体](/spec/game/)を正本とします。

Enemy Damage処理は浄化成立をEnemy状態へ反映し、上位のBattle処理へ通知します。本ページでは、Battle結果の確定順序やClear後の演出を再定義しません。

## 例外・禁止事項

- 浄化済みEnemyへRGB Damageを加算しない
- 同じ爆発から同じEnemyへExplosion RGB Damageを複数回適用しない
- Direct Contact RGB DamageとExplosion RGB Damageを同一候補として重複除外しない
- 爆心からの距離によってExplosion RGB Damageを減衰させない
- 壁・地形に遮られているEnemyへExplosion RGB Damageを適用しない
- Enemy同士を爆風遮蔽物として扱わない
- RGB Damageを単一HP Damageへ暗黙に変換しない
- 最大浄化値を超えた分を他チャンネル・次回被弾・別Damageへ転用しない
- 同一フレームの候補到着順によって浄化結果を変化させない
- Battle結果確定後のDamage候補を反映しない
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

「Explosion RGB Damageを採用するか」「爆発範囲内の同一Enemyへ何回適用するか」「距離減衰を使用するか」「壁・地形による遮蔽を使用するか」「同一フレームのDamageをどう処理するか」は確定済みであり、未決事項として扱いません。

## 関連タスク

<PageRelations />
