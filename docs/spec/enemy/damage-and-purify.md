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
- 関連ページ：[敵](/spec/enemy/)、[戦闘](/spec/combat/)、[パレットブレット](/spec/combat/palette-bullet)、[シャオンダマのデータ](/spec/shaondama-music/orb-data)、[浮遊・自然破裂](/spec/shaondama-music/floating-behavior)、[ステージ](/spec/stage/)、[ゲーム全体](/spec/game/)

## 目的

本ページでは、Enemyが受け取る共通RGB Damage候補について、以下を定義します。

- Palette Bullet Direct Contact RGB Damage候補の受け取り
- Palette Bullet Explosion RGB Damage候補の受け取り
- Normal Shaondama Natural Burst RGB Damage候補の受け取り
- Damage候補の共通schema
- Damage候補の有効性確認と最終的な重複除外
- 同一frame・同一EnemyのDamage集約
- RGB値の丸めとClamp
- EnemyのR・G・B浄化値への反映
- RGB浄化判定と浄化状態の一回確定
- 浄化成立後のEnemy状態
- `battleId`とEnemy／Clear対象識別情報を含むStageへの浄化成立通知
- 浄化済みEnemyに対する新しいRGB Damageの禁止

Palette Bulletの飛行・衝突・爆発と、Direct Contact／Explosion RGB Damage候補の生成条件・算出式は、[パレットブレット](/spec/combat/palette-bullet)を正本とします。

Normal Shaondamaの自然破裂、範囲内Enemyの候補抽出、Natural Burst固有規則を反映した最終RGB Damage payloadの生成、および候補出力は、[浮遊・自然破裂](/spec/shaondama-music/floating-behavior)を正本とします。

本ページは、各ProducerからRGB Damage候補を受け取った後の最終的な重複除外、同一frame集約、丸め、加算、Clamp、浄化判定、Enemy状態更新、およびStage通知境界を正本とします。

Enemy RGB Damageの同一frame処理は、本ページの「同一frame内のDamage集約」で定義する12段階の順序を確定仕様とします。別ページへ未定義のまま移管しません。

## 他ページとの責務境界

| 項目 | 正本 |
|---|---|
| Palette Bulletの飛行・衝突・爆発・爆発範囲・壁遮蔽 | [パレットブレット](/spec/combat/palette-bullet) |
| `DirectHitMultiplier`と`ExplosionMultiplier`を適用した最終RGB Damage payloadの生成 | [パレットブレット](/spec/combat/palette-bullet) |
| Normal Shaondamaの自然破裂・範囲内Enemy抽出・Natural Burst最終RGB Damage payload生成・候補出力 | [浮遊・自然破裂](/spec/shaondama-music/floating-behavior) |
| Shaondamaから引き継ぐ個体情報・source RGB値・`effective RGB基礎値` | [シャオンダマのデータ](/spec/shaondama-music/orb-data) |
| Producer側での不要なDamage候補生成の抑制 | 各Damage Producer |
| 共通RGB Damage候補の受け取り・最終的な重複除外 | 本ページ |
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
- Normal Shaondamaの自然破裂範囲内にいるEnemyには、Natural Burstの規則を満たした場合にRGB Damageが反映される
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

RGB Damageを、Player HP Damageのような単一Damage値へ変換しません。本ページにおけるEnemyへのDamage反映は、R・G・B浄化値への加算を指します。

Enemyが別用途のHPを持つ場合も、共通RGB Damage候補からHP Damageを暗黙に生成しません。別途HPへ反映する仕様を採用する場合は、Enemy側の仕様として明示的に定義します。

## 浄化値の時間変化

EnemyのR・G・B浄化値は、時間経過によって減少しません。

以下の処理は採用しません。

- RGB浄化値の自然減衰
- 一定時間被弾しなかった場合の自然回復
- 浄化値を初期値へ戻す時間経過処理
- 時間経過を理由としたチャンネル別の減算

浄化値は、有効なRGB Damage候補の確定処理または別途明示されたBattle初期化処理によってのみ変更します。「時間経過による減少を採用するか」は未決事項ではありません。

## Enemy Damageが受け取る共通RGB Damage候補

Enemy Damage処理は、次の3種類のRGB Damage候補を共通契約で受け取ります。

| Damage発生源種別 | Producer | 候補の概要 |
|---|---|---|
| Palette Bullet Direct Contact | Palette Bullet | Palette BulletがEnemyへ直接接触したことによる候補 |
| Palette Bullet Explosion | Palette Bullet | Palette Bulletの爆発範囲・遮蔽条件を満たしたEnemyへの候補 |
| Normal Shaondama Natural Burst | Normal Shaondamaの自然破裂 | Normal Shaondamaの自然破裂範囲とNatural Burst条件を満たしたEnemyへの候補 |

各Damage候補から、最低限、次の情報を識別できるようにします。

- Damage発生源種別
- 発生源となるDamage作用またはEventの識別子
- 対象Enemy
- 最終RGB Damage payload
- 所属`battleId`

発生源となるDamage作用またはEventの識別子は、同一作用から同じEnemyへ重複して生成された候補を判別できる安定した識別情報とします。具体例は次のとおりです。

- Direct Contactを発生させた接触作用の識別情報
- Explosionを発生させた爆発Eventの識別情報
- Natural Burstを発生させた自然破裂Eventの識別情報

Damage発生源種別も重複判定の一部とします。同じPalette Bulletに由来するDirect ContactとExplosionは、発生源種別が異なるため、互いを重複候補として扱いません。

### RGB用語の区別

本ページでは、次の2つを区別します。

- `effective RGB基礎値`
  - AllocationやWildcard置換などを反映した、Damage発生源固有の倍率を適用する前のRGB値
- `最終RGB Damage payload`
  - Damage発生源固有の倍率や規則を反映し、Enemy Damageへ渡されるR・G・B値

Enemy Damageが受け取って集約するのは、各Producerが確定した`最終RGB Damage payload`です。

Enemy Damageは、受け取った最終RGB Damage payloadへDirect Contact、Explosion、Natural Burstなどの発生源固有倍率を再適用しません。また、倍率適用前の`effective RGB基礎値`を最終payloadとして扱いません。

### Damage候補の基本的な有効性

Enemy Damageは、各候補について少なくとも次を確認します。

- 対応しているDamage発生源種別である
- Damage作用またはEventの識別情報を判別できる
- 対象Enemyを判別できる
- R・G・Bの最終RGB Damage payloadを処理できる
- `battleId`を判別できる

この基本確認は、Producer固有の衝突、爆発範囲、遮蔽、自然破裂範囲などをEnemy Damage側で再計算することを意味しません。Producer固有の候補生成条件は各Producerが所有します。

基本的な有効性を満たした後、現在の`battleId`、Battle結果確定状態、および対象Enemyのframe開始時点Snapshotを確認します。

### ProducerとEnemy Damageの重複した防御

各Producerは、Colliderの重複検出などによる不要なDamage候補の乱造を抑え、発生源固有の規則に従って候補を正しく生成します。

Enemy Damageは、Producer側で抑制済みであるかにかかわらず、受け取った候補に対する最終的な重複除外を行います。

以下は別の責務であり、同一の保証として扱いません。

- Producer側：不要な候補を可能な限り生成しない
- Enemy Damage側：受信した候補を最終的に重複適用しない

Producer側の抑制があることを理由にEnemy Damage側の最終重複除外を省略しません。また、Enemy Damage側で重複除外することを理由にProducerが同じ候補を無制限に生成してはいけません。

## Palette Bulletから受け取るDamage候補

Enemy Damage処理は、Palette Bulletから次の2種類のDamage候補を受け取ります。

| Damage種別 | Producer側の発生条件 | Enemy Damageが受け取るpayload |
|---|---|---|
| Direct Contact RGB Damage | Palette BulletがDirect Contact候補の生成条件を満たすEnemyへ直接接触した | `effective RGB基礎値`へ`DirectHitMultiplier`を適用した最終RGB Damage payload |
| Explosion RGB Damage | Enemyが爆発範囲内におり、壁・地形によって遮蔽されていない | `effective RGB基礎値`へ`ExplosionMultiplier`を適用した最終RGB Damage payload |

`DirectHitMultiplier`と`ExplosionMultiplier`は独立した調整値です。

Palette Bullet側で対応する倍率を適用して最終RGB Damage payloadを生成するため、Enemy Damage処理で同じ倍率を再適用しません。

## Direct Contact RGB Damage

Palette BulletがDirect Contact候補の生成条件を満たすEnemyへ直接接触した場合、そのEnemyに対するDirect Contact RGB Damage候補を受け取ります。

Player、Shaondama、Marker、他の弾、地面、壁、浄化済みEnemyなどへの接触はPalette Bulletの爆発を発生させますが、Direct Contact RGB Damageの対象にはなりません。

対象Enemyが実際にその候補を受け付けるかは、対象frameのEnemy RGB Damage受付開始時点Snapshotと、本ページの共通有効性確認によって最終確定します。

## Explosion RGB Damage

Palette Bulletがいずれかの飛行終了条件へ到達して爆発した場合、爆発範囲内かつ遮蔽されていないEnemyに対するExplosion RGB Damage候補を受け取ります。

Palette Bulletの飛行終了理由が次のいずれであっても、同じExplosion RGB Damage処理を使用します。

- Target座標への到達
- 衝突対象との接触
- 最大飛行距離への到達
- 最大飛行時間への到達

爆心からの距離によるDamage減衰は行いません。爆発範囲と遮蔽の条件を満たすEnemyには、爆心からの距離にかかわらず同じ最終RGB Damage payloadを使用します。

対象Enemyが実際にその候補を受け付けるかは、対象frameのEnemy RGB Damage受付開始時点Snapshotと、本ページの共通有効性確認によって最終確定します。

## Normal Shaondama Natural Burst RGB Damage

Normal Shaondamaが自然破裂した場合、自然破裂側は範囲内Enemyを抽出し、Natural Burst固有の規則と調整値を反映した最終RGB Damage payloadを生成します。

Enemy Damageは、自然破裂側から正式なNormal Shaondama Natural Burst RGB Damage候補として受け取ります。「Weak Damage通知」などの曖昧な通知として扱いません。

自然破裂側は、次を担当します。

- 自然破裂の発生
- 自然破裂範囲内Enemyの候補抽出
- Natural Burst固有規則に基づく最終RGB Damage payloadの生成
- Normal Shaondama Natural Burst RGB Damage候補の出力
- Colliderの重複検出などによる不要な候補生成の抑制

Enemy Damageは、受け取ったNatural Burst候補について次を担当します。

- 最終的な重複除外
- 同一frame・同一Enemyの集約
- 丸め
- R・G・B浄化値への加算
- Clamp
- 浄化判定
- Enemy状態更新
- Stageへの浄化成立通知

Natural Burstの攻撃範囲、Damage倍率、および最終RGB Damage payloadの生成規則は、[浮遊・自然破裂](/spec/shaondama-music/floating-behavior)を正本とします。

## 直接命中Enemyへの2種類のDamage

Palette BulletがDirect Contact候補の生成条件を満たすEnemyへ直接命中した場合、そのEnemyには以下の両方の候補を生成できます。

1. Direct Contact RGB Damage候補
2. 同じ着弾で発生したExplosion RGB Damage候補

```text
Enemyへ直接命中
↓
Direct Contact RGB Damage候補
+
Explosion RGB Damage候補
↓
同一frameのEnemy Damage処理へ集約
```

2つは異なるDamage発生源種別として扱います。Explosion RGB Damageの重複除外を理由に、Direct Contact RGB Damageを削除しません。

対象Enemyがframe受付開始時点で未浄化かつDamage受付可能であり、各候補が共通有効性確認を通過した場合、両方の最終RGB Damage payloadを同一frame集約へ含めます。

## Damage候補の最終重複除外

同一Damage作用から同じEnemyへ発生した重複候補は、Enemy Damage側で最終的に1件へまとめます。

```text
Damage発生源種別
+
Damage作用またはEventの識別情報
+
対象Enemy識別情報
↓
同一組み合わせを重複除外
```

これにより、次を保証します。

- 同じExplosionから同じEnemyへのExplosion RGB Damageは最大1回
- 同じNatural Burstから同じEnemyへのNatural Burst RGB Damageは最大1回
- 同じDirect Contact作用から同じEnemyへのDirect Contact RGB Damageは最大1回
- 異なるExplosionから同じEnemyへ届いた候補は、それぞれ別のDamageとして受け付ける
- 異なるNatural Burstから同じEnemyへ届いた候補は、それぞれ別のDamageとして受け付ける
- 同じPalette BulletのDirect ContactとExplosionは、発生源種別が異なるため両方を適用できる

複数Colliderを持つEnemyが同じExplosionまたはNatural Burstの範囲判定で複数回検出された場合も、Enemy実体単位で最大1件へまとめます。

重複候補のうち、どの配列要素または到着候補を残したかによって最終結果が変化してはいけません。同じ重複キーに異なる内容の最終RGB Damage payloadが含まれる状態は、Producer側の不正な候補生成として検出可能にします。

## 壁・地形による爆風遮蔽

壁または地形によって爆心から遮られているEnemyには、Explosion RGB Damage候補を生成しません。

爆心とEnemyのDamage判定点との間に対する物理的な遮蔽判定は、[パレットブレット](/spec/combat/palette-bullet)側で実行します。

Enemy Damage処理は、爆発範囲内かつ遮蔽されていないEnemyについて生成されたExplosion RGB Damage候補だけを受け取ります。Enemy Damage側で爆発範囲や遮蔽を再判定しません。

Enemy同士は、他のEnemyに対する爆風遮蔽物として扱いません。Enemy自身のColliderも、そのEnemyへの爆風を遮る壁・地形として扱いません。

VFXやシェーダー上の爆風表示はDamage可否の根拠にしません。

## 浄化済みEnemyへの接触・爆発

対象frameのEnemy RGB Damage受付開始時点ですでに浄化済みのEnemyは、AttackEventのTarget候補および新しいRGB Damageの受付対象から外れます。

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
└─ 周囲の受付可能なEnemy
    → 爆発範囲・遮蔽条件を満たせばExplosion RGB Damage候補
```

浄化済みEnemyとの接触を理由に発生した爆発でも、周囲の受付可能なEnemyは通常どおりExplosion RGB Damage候補の対象になれます。

## 同一frame内のDamage集約

同一frameに同じEnemyへ複数の有効なRGB Damage候補が発生した場合、候補を一件ずつ逐次反映しません。対象Enemyについて同一frame分をすべて収集し、1つの集約単位として一括処理します。

候補の到着順、配列順、列挙順によって、集約値、最終RGB値、浄化成立結果、またはStage通知結果が変化してはいけません。

### frame受付開始時点のEnemy Snapshot

同一frameのDamage処理では、対象Enemyごとに1つの集約単位を作り、その対象frameにおけるEnemy RGB Damage受付開始時点でEnemy状態をSnapshotします。

本ページでいう「frame開始時点」は、このEnemy RGB Damage受付開始時点を指します。

Snapshotは、そのframeのDamage候補収集および最終反映より前に取得します。候補の到着や列挙を開始した後に、その候補内容に応じてSnapshotを取り直してはいけません。

Snapshotには、少なくとも次を含めます。

- 所属`battleId`
- 現在のR・G・B浄化値
- R・G・B最大浄化値
- 浄化済みか
- Damageを受け付ける有効な戦闘Enemyか
- Stage側Clear対象記録が`FormallyExcluded`であることによりDamage受付停止中か

Snapshot時点ですでに浄化済み、現在の`battleId`と不一致、Damage受付対象外、または`FormallyExcluded`によって受付停止中であるEnemyには、そのframeの新しいRGB Damageを反映しません。

Snapshot時点で未浄化かつDamage受付可能であるEnemyについては、そのframe内に発生した有効なDamage候補をすべて集約対象にします。

途中までの候補だけを仮に加算した場合に浄化条件へ到達していても、その時点では浄化を確定しません。残りの有効候補もすべて収集・集約し、最終RGB値に対してだけ浄化判定を1回行います。

Clear対象であるかは、Enemy自身のRGB Damage集約と浄化成立可否を決めるSnapshot条件に含めません。一方、frame受付開始時点ですでにStage側Clear対象記録が`FormallyExcluded`であるEnemyは、新しいHit／Damage候補の受付対象外とします。

Snapshot取得後に同一frame内で正式除外が成立した場合、正式除外成立前に有効成立し、かつそのframeのDamage処理対象として収集済みだった候補だけは、取得済みSnapshotに従って処理を完了できます。正式除外成立後に新しく生成または収集されたHit／Damage候補は、取得済みSnapshotが受付可能であっても反映しません。

### 候補生成時点とEnemy確定処理順の区別

Palette Bulletの接触・爆発やNormal Shaondamaの自然破裂は、対象frame内のそれぞれの発生時点でDamage候補を生成します。

候補が生成された時点では、EnemyのRGB値への加算、Clamp、浄化確定、およびStage通知を実行しません。生成された候補は、そのframeのEnemy Damage集約へ渡します。

したがって、次の2つを区別します。

- 候補がProducerによって生成された時点・順番
- Enemy Damageが同一frame分を収集し、確定処理する順番

Enemy Damageの確定処理は、Producerから候補が到着した順番ではなく、以下の12段階の順序に従います。

### 確定処理順

同一frameのEnemy RGB Damageは、対象Enemyごとに次の順序で処理します。

1. 対象frameのEnemy状態をSnapshotする
2. Damage候補の基本的な有効性を確認する
3. `battleId`、Battle結果確定状態、および対象EnemyのSnapshot状態を確認する
4. 同一frame・同一Enemyの有効候補をすべて収集する
5. 同一Damage作用から同じEnemyへ発生した重複候補を除外する
6. 残った候補の最終RGB Damage payloadを、RGBチャンネルごとに合算する
7. 合算後の各チャンネルを、`RGBDamageRoundingMode`に従って丸める
8. 丸め後の集約RGB Damageを、Snapshotした現在のR・G・B浄化値へ加算する
9. 加算後の各チャンネルを、0から対応する最大浄化値の範囲へClampする
10. Clamp後の最終R・G・B浄化値を使い、そのframeの浄化成立を1回だけ判定する
11. 最終R・G・B浄化値、色表示、およびEnemy状態を更新する
12. そのframeで新たに浄化が成立した場合だけ、Stageへ浄化成立通知を1回送る

```text
1. frame受付開始時点のEnemy状態をSnapshot
↓
2. 候補の基本的な有効性を確認
↓
3. battleId・Battle結果・Snapshot状態を確認
↓
4. 同一frame・同一Enemyの有効候補をすべて収集
↓
5. 同一Damage作用の重複候補を除外
↓
6. 最終RGB Damage payloadをチャンネルごとに合算
↓
7. チャンネルごとに丸め
↓
8. Snapshotした現在値へ加算
↓
9. Clamp
↓
10. 最終RGB値から浄化を1回判定
↓
11. RGB値・表示・Enemy状態を更新
↓
12. 新規浄化時だけStageへ1回通知
```

Snapshot取得を候補収集より後へ移動してはいけません。また、候補ごとに手順6から11を繰り返してはいけません。

手順3の時点で対象Battleの最終結果が確定済みである場合、そのEnemyに対する候補を収集・反映せず、新しい浄化を成立させません。

### 集約単位と到着順非依存

- 同一frameのDamage集約は、1 Enemyにつき1回だけ実行します。
- 1つのEnemyについて、同一frame内にR・G・B浄化値を複数回書き戻しません。
- 同一Damage作用と同じEnemyの組み合わせによる候補を重複適用しません。
- Direct Contact、Explosion、Natural Burstを、発生源種別が異なるという理由を無視して互いの重複候補として削除しません。
- 同一frameの有効候補を、候補の到着順によって一部だけ無効にしません。
- 候補の到着順、配列順、列挙順を、RGB合算や丸めの結果を変える根拠にしません。
- 同一frameのDamage候補の順序によって、集約RGB値、更新後のR・G・B浄化値、浄化成立結果、またはStage通知の有無を変化させてはいけません。
- 同一frameの最終状態に対して、浄化成立を最大1回だけ確定します。
- 新たに浄化が成立した場合も、Stage通知は最大1回だけ発生させます。

概念上の入出力は次のとおりです。

```text
同一frame・同一EnemyのDamage候補
├─ Direct Contact
├─ Explosion A
├─ Explosion B
└─ Natural Burst
↓
最終重複除外
↓
Enemy RGB Damageの同一frame集約
↓
そのframeの最終R／G／B浄化値
↓
浄化成立または未成立
↓
新規浄化時のみStageへ1回通知
```

対象frameの受付開始時点より前から浄化済みだったEnemyには、Damageを反映しません。同一frame内のいずれかの候補だけを先に適用してEnemyを浄化済みにし、その後に列挙された同一frame候補を除外してはいけません。

Battle結果確定後のDamage候補は受け付けません。結果確定前に生成されても未処理のまま残っていた遅延Damageは、Battle結果確定後のEnemy状態へ適用せず、新しい浄化やStage通知を成立させません。

## 丸め

Damage候補の最終RGB Damage payloadは、同一frame分をチャンネルごとにすべて合算した後、Snapshotした浄化値へ加算する前に丸めます。

候補ごとに個別に丸めてから合算してはいけません。

丸め方式は`RGBDamageRoundingMode`として調整可能にし、切り捨て・四捨五入・切り上げなどの具体方式をデータで選択できる構造とします。

同じ候補集合に対して常に同じ結果となる決定的な丸め処理を使用します。候補の到着順、配列順、列挙順によって丸め結果が変化してはいけません。

表示上の小数処理とGameplay上の丸め処理を混同しません。

## 浄化値への加算とClamp

丸め後の集約RGB Damageを、SnapshotしたEnemyの現在のR・G・B浄化値へチャンネルごとに加算します。

```text
New R = Clamp(Snapshot R + Aggregated R Damage, 0, Max R)
New G = Clamp(Snapshot G + Aggregated G Damage, 0, Max G)
New B = Clamp(Snapshot B + Aggregated B Damage, 0, Max B)
```

最大浄化値を超えた分は切り捨てます。

超過分を以下へ使用しません。

- 他のRGBチャンネルへの変換・分配
- 次の被弾への繰り越し
- HP Damageなど別種Damageへの変換
- 別のEnemyへの転送

## 色変化

Enemyの見た目の色は、R・G・Bそれぞれの現在浄化値と最大浄化値の割合に応じて、黒から白へ変化します。

同一frameに複数のDamage候補がある場合は、候補ごとに表示を更新せず、そのframeの集約・Clamp完了後の最終値を表示へ反映します。

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

同一frameに複数のDamage候補がある場合も、本ページで確定した12段階処理の最終状態に対して、浄化成立を最大1回だけ確定します。

浄化状態は、次の条件をすべて満たす場合だけ未浄化から浄化済みへ一度だけ変更します。

- Damage候補および対象Enemyの`battleId`が現在のBattleと一致する
- 対象Battleの最終結果が未確定である
- 対象frameの受付開始時点Snapshotで対象Enemyが浄化済みではない
- 対象frameの受付開始時点Snapshotで対象EnemyがDamage受付可能である
- Clamp後の最終R・G・B浄化値がすべて最大浄化値へ達している

すでに浄化済みのEnemyについて、同じ浄化状態を再成立させません。Battle結果確定後に到着または処理された遅延Damageが最大浄化値へ到達する内容であっても、Enemy状態を更新せず、新しい浄化を成立させません。

Enemy自身の浄化は、StageのClear対象であるかにかかわらず成立できます。Clear対象ではない戦闘Enemyも、同じRGB条件を満たした場合は浄化済みになります。

Stage側Clear対象記録の`FormallyExcluded`は、Enemy自身の浄化状態とは独立します。正式除外成立後は、新しいHit／Damage候補を受け付けません。ただし、正式除外成立前のframe受付開始時点Snapshotで受付可能であり、そのframeのDamage処理対象として収集された候補は、取得済みSnapshotに従って処理を完了できます。

その処理によってEnemy自身の浄化が成立した場合も、Stage側Clear対象記録は`FormallyExcluded`を維持し、`Purified`へ変更しません。

## Stageへの浄化成立通知

Enemy Damage Ownerは、対象frameの最終RGB値によってEnemyの浄化状態が新たに成立し、かつ対応する登録済みClear対象記録が存在する場合だけ、Stageへ浄化成立通知を1回送ります。

浄化が未成立だった場合、または対象Enemyが以前から浄化済みだった場合は、浄化成立通知を送りません。

浄化成立通知には、少なくとも次を含めます。

- 対象`battleId`
- Enemy識別情報
- 対応するClear対象記録の識別情報
- 浄化成立
- 必要な場合は浄化成立frame

同じEnemyについて、浄化状態の一回成立に対応する論理通知を複数回送りません。再送機構を使用する場合でも、Stage側で同じ論理通知を一度だけ適用できる識別情報を維持します。

Enemy Damage Ownerは、次を行いません。

- Stage objectiveを評価する
- wave、pending Spawn、Clear対象Enemy集合を再計算する
- Clear条件を評価する
- Clear候補を直接Gameへ送る
- 最終Battle結果を確定する

Stageは、通知の`battleId`が現在のBattleと一致し、対象が登録済みClear対象であり、まだ`Purified`または`FormallyExcluded`になっていない場合だけ、対応するClear対象記録を`Purified`へ一度だけ変更します。

Clear対象ではないEnemyも、RGB条件を満たした場合はEnemy自身の浄化状態を通常どおり成立させますが、対応する登録済みClear対象記録が存在しないため、Stageへの浄化成立通知は送りません。

対象のStage側記録がすでに`FormallyExcluded`である場合、Stageは通知を受けてもその記録を`Purified`へ変更しません。この場合も、Enemy自身に成立した浄化状態は取り消しません。

同一frameに同じ記録の正式除外と浄化成立通知が成立した場合も、Stage側記録は`FormallyExcluded`を維持し、通知の到着順によって`Purified`へ上書きしません。Enemy自身の浄化状態は、Stage側記録とは独立して成立できます。

同一frameに複数の浄化通知、動的Spawn登録、正式除外、Stage objective完了が成立した場合、Stageが同一frameの更新を収集してClear対象記録とobjectiveへ反映した後、Clear条件を一度だけ評価します。Enemy Damage Ownerは、これらのStage更新の収集順やClear評価順を決定しません。

現在と異なる`battleId`のDamage候補および浄化成立通知は、現在または次のBattleへ適用しません。Battle結果確定後は、遅延Damageから浄化状態や浄化成立通知を新たに発生させません。

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

Enemy Damage Ownerは、Enemyの浄化成立後にStageへ浄化成立通知を送るところまでを担当します。Clear条件を評価せず、Clear候補をGameへ直接送りません。

Stageは、浄化成立通知を登録済みClear対象記録へ反映します。Clear対象ではないEnemyの通知ではClear対象記録を更新しません。

Stageは、対象BattleのStage objectiveが`Completed`であり、登録済みClear対象Enemyがすべて`Purified`または`FormallyExcluded`である場合にだけ、対象`battleId`付きClear候補を一度だけ通知します。

Gameは、Stageから受け取ったClear候補とPlayer側のGame Over候補を収集し、最終Battle結果を一度だけ確定します。Enemy Damage Ownerは、Battle結果の確定順序、同一frame Clear＋Game Overの優先順位、Result、およびClear後の演出を再定義しません。

Battle結果確定後は、新しいDamage候補の受付、RGB Damage反映、Enemyの浄化成立、およびStageへの新しい浄化成立通知を行いません。

## 例外・禁止事項

- 対象frameの受付開始時点ですでに浄化済みのEnemyへRGB Damageを加算しない
- SnapshotをそのframeのDamage候補収集後に取得しない
- 候補ごとにRGB Damageを逐次反映しない
- 途中の候補だけで浄化を確定し、残りの同一frame候補を除外しない
- 同一Damage作用から同じEnemyへ同種のRGB Damageを複数回適用しない
- 同じ爆発から同じEnemyへExplosion RGB Damageを複数回適用しない
- 同じNatural Burstから同じEnemyへNatural Burst RGB Damageを複数回適用しない
- Direct Contact、Explosion、Natural Burstの発生源種別を無視して重複除外しない
- 同じPalette BulletのDirect Contact RGB DamageとExplosion RGB Damageを同一候補として重複除外しない
- 爆心からの距離によってExplosion RGB Damageを減衰させない
- 壁・地形に遮られているEnemyへExplosion RGB Damage候補を生成しない
- Enemy同士を爆風遮蔽物として扱わない
- `effective RGB基礎値`を倍率適用済みの最終RGB Damage payloadとして扱わない
- Enemy Damage側で発生源固有倍率を再適用しない
- RGB Damageを単一HP Damageへ暗黙に変換しない
- Damage候補ごとに個別に丸めてから合算しない
- 最大浄化値を超えた分を他チャンネル・次回被弾・別Damageへ転用しない
- RGB浄化値を時間経過によって自然回復・減衰させない
- 候補の到着順、配列順、列挙順によって、集約RGB値、更新後の浄化値、浄化成立結果、またはStage通知結果を変化させない
- 同一frameのDamage集約を1 Enemyにつき複数回実行しない
- Clear対象として未登録であることを理由に、Enemy自身の浄化成立を拒否しない
- Stage側Clear対象記録が`FormallyExcluded`であることを理由に、受付可能なSnapshotに基づくEnemy自身の浄化成立を拒否しない
- `FormallyExcluded`済みのStage側Clear対象記録を、後続の浄化通知によって`Purified`へ変更しない
- 現在と異なる`battleId`のDamage候補または浄化成立通知を現在Battleへ適用しない
- 同じEnemyの浄化状態または浄化成立通知を複数回成立させない
- Battle結果確定後のDamage候補を反映したり、遅延Damageから新しい浄化を成立させたりしない
- Producer側の候補生成抑制とEnemy Damage側の最終重複除外を同じ責務として扱わない
- Enemy Damage OwnerがClear条件を評価したり、Clear候補を直接Gameへ送ったりしない
- 浄化済みEnemyのworld object消滅を理由にStage側の`Purified`記録を削除しない
- Gameplay用パラメータをコードへハードコードしない

## パラメータ

| パラメータ | 内容 | 状態 |
|---|---|---|
| `MaxPurifyR` | Rチャンネルの最大浄化値 | 調整値 |
| `MaxPurifyG` | Gチャンネルの最大浄化値 | 調整値 |
| `MaxPurifyB` | Bチャンネルの最大浄化値 | 調整値 |
| 各Normal Shaondamaのsource RGB値 | Normal Shaondamaの`effective RGB基礎値`の元となるRGB定義 | [シャオンダマのデータ](/spec/shaondama-music/orb-data)側の調整値を参照 |
| `DirectHitMultiplier` | Direct Contact最終RGB Damage payloadの生成時に適用する倍率 | [パレットブレット](/spec/combat/palette-bullet)側の調整値を参照 |
| `ExplosionMultiplier` | Explosion最終RGB Damage payloadの生成時に適用する倍率 | [パレットブレット](/spec/combat/palette-bullet)側の調整値を参照 |
| Wildcard用倍率override | Palette Bulletの発生元がWildcardである場合に使用する倍率override | [パレットブレット](/spec/combat/palette-bullet)側の調整値を参照 |
| Natural Burst攻撃範囲 | Normal Shaondama自然破裂のEnemy抽出範囲 | [浮遊・自然破裂](/spec/shaondama-music/floating-behavior)側の調整値を参照 |
| Natural Burst Damage倍率 | Natural Burst最終RGB Damage payloadの生成時に適用する倍率 | [浮遊・自然破裂](/spec/shaondama-music/floating-behavior)側の調整値を参照 |
| `RGBDamageRoundingMode` | 同一frame集約後のRGB Damageに使用する丸め方式 | 調整値 |

各値はハードコードせず、Inspectorまたはデータアセットから調整できる構造とします。

固定の「7色RGB Damage表」は本ページで保持しません。各Damage Producerは、発生元Shaondamaから引き継いだ`effective RGB基礎値`へ発生源固有の倍率または規則を適用し、最終RGB Damage payloadを生成します。

## 未決事項

- 各EnemyまたはEnemy種別に設定するR・G・B最大浄化値の具体値
- 浄化後のEnemyをその場に残すか消滅させるか
- 浄化演出の具体内容

「浄化値を時間経過によって減少させるか」は非採用として確定済みであり、未決事項として扱いません。

「Explosion RGB Damageを採用するか」「爆発範囲内の同一Enemyへ何回適用するか」「距離減衰を使用するか」「壁・地形による遮蔽を使用するか」は確定済みであり、未決事項として扱いません。

Enemy RGB Damageの同一frame集約順序、Enemy状態のSnapshot時点、共通候補schema、最終重複除外、RGB合算、丸め、加算、Clamp、浄化判定、Enemy状態更新、およびStage通知の順序は、本ページの「同一frame内のDamage集約」で確定済みであり、未決事項として扱いません。

## 関連タスク

<PageRelations />
