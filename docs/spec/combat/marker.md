---
title: "マーカー"
description: Palette BulletにおけるMarkerの有効条件・置換・Target提供・消滅仕様
pageType: spec
category: "戦闘"
status: 仮仕様
relatedTasks: []
---

# マーカー


## 目的

本ページでは、Palette BulletのTarget候補として使用するMarkerについて、以下を定義します。

- 同時に有効にできるMarker数
- Marker生成時の置換
- Markerが有効なTarget候補になるタイミング
- MarkerがEnemyへ付着した後の扱い
- Palette Bulletの爆風による消滅
- Battle終了時の無効化との接続

MarkerFiringの入力・ActionState・発射方向・発射タイミングは、[Playerアクション｜マーカー](/spec/player/player-action-marker)を正本とします。

AttackEventがMarkerを含むTarget候補からTarget座標を決定する優先順位は、[パレットブレット](/spec/combat/palette-bullet)を正本とします。

---

## 有効なMarker

同時に有効にできるMarkerは、最大1個とします。

Markerは、生成された時点から有効なTarget候補になります。

```text
Marker生成
↓
有効なTarget候補
↓
飛行
↓
地形またはEnemyへ付着
````

Markerは、飛行中または地形・Enemyへ未付着の状態でも有効です。

有効なMarkerは、AttackEventへ自身の現在のworld座標を提供します。

Markerが付着済みかどうかを、有効性の条件には使用しません。

---

## 新しいMarkerによる置換

新しいMarkerを生成する場合は、新しいMarkerを生成する直前に、それまで有効だったMarkerを消滅させます。

```text
新しいMarkerの生成要求
↓
既存の有効Markerを確認
│
├─ 存在する
│   → 既存Markerを消滅
│
└─ 存在しない
    → 何もしない
↓
新しいMarkerを生成
↓
新しいMarkerを有効化
```

旧Markerを残したまま新しいMarkerを有効化しません。

一時的な時間を含め、2個以上のMarkerを同時に有効なTarget候補として公開しません。

---

## Enemyへ付着したMarker

MarkerはEnemyへ付着できます。

Markerが付着しているEnemyが死亡しても、Markerを自動的に消滅させません。

Enemy死亡またはEnemy objectの消滅によって付着先との関係が失われる場合も、Marker実体と現在のworld座標を保持し、有効なTarget候補として残します。

```text
MarkerがEnemyへ付着
↓
Enemy死亡
↓
Markerは残存
↓
有効なTarget候補を継続
```

Enemyの死亡を理由に、Markerを無効化したり別のTargetへ移動させたりしません。

---

## Palette Bulletの爆風による消滅

Markerは、Palette Bulletの爆風範囲に少しでも接触すると消滅します。

Markerの消滅判定には、以下を使用しません。

* Palette Bulletの威力
* RGB値
* Enemyへ与えるDamage量
* AttackEventの`Complete / Incomplete`
* Markerが飛行中か付着済みか

```text
Palette Bulletの爆風
↓
MarkerのColliderまたは判定範囲と接触
↓
Marker消滅
↓
Target候補から除外
```

Marker消滅前にAttackEventがTarget座標をsnapshotしていた場合、そのAttackEventの確定済みTarget座標には影響しません。

---

## Battle終了との関係

Battle結果が確定したMarkerは、[戦闘概要](/spec/combat/)のBattle終了lifecycleに従ってGameplay上無効化します。

無効化後は、新しいAttackEventへTarget座標を提供しません。

旧BattleのMarkerをRetry後の新しいBattleへ持ち越しません。

---

## 基本ルール

* 同時に有効なMarkerは最大1個とする
* 新しいMarkerの生成直前に旧Markerを消滅させる
* Markerは生成時点から有効なTarget候補とする
* 飛行中・未付着のMarkerも現在座標を提供する
* 付着先Enemyが死亡してもMarkerを自動消滅させない
* Palette Bulletの爆風へ接触したMarkerは威力に関係なく消滅する
* Marker消滅後も、すでに確定済みのAttackEvent Target座標は変更しない

<PageRelations />

