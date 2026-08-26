---
title: "パレットブレット"
description: Palette BulletにおけるAttackEvent単位のTarget座標決定・共有・再Target禁止仕様
pageType: spec
category: "戦闘"
status: 仮仕様
relatedTasks: []
---

# パレットブレット

## 目的

本ページでは、AttackEventから発射されるPalette Bulletについて、以下を定義します。

- AttackEvent発火時のTarget候補の優先順位
- Target座標の計算方法
- AttackEvent内でのTarget座標共有
- 発火後の再Target禁止
- Chord / Arpeggioとの関係

AttackEvent発火時にTarget座標のsnapshotを実行する処理は、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正本とします。

Markerの有効条件・置換・消滅は、[マーカー](/spec/combat/marker)を正本とします。

---

# AttackEventのTarget座標決定

AttackEventは、発火時にPalette BulletのTarget座標を1回だけ決定します。

Target座標は、次の優先順位で決定します。

| 優先順位 | 条件 | 使用する座標 |
|---|---|---|
| 1 | 有効なMarkerが存在する | Markerの現在のworld座標 |
| 2 | Markerが存在せず、有効なEnemyが存在する | Playerに最も近いEnemyの現在座標 |
| 3 | Markerも有効なEnemyも存在せず、レティクルRayが何かへ接触する | Rayが最初に接触した地点 |
| 4 | Rayが何にも接触しない | レティクル方向の十分遠い地点 |

上位の候補が有効な場合、下位の候補は評価結果として使用しません。

---

## Marker

有効なMarkerが存在する場合は、AttackEvent発火時点のMarkerの現在座標をTarget座標とします。

Markerが、

- 飛行中
- 地形へ未付着
- Enemyへ未付着
- Enemyへ付着済み
- 付着先Enemyの死亡後も残存中

のいずれであっても、Marker側で有効と判定されている限りTarget候補として使用します。

---

## 最も近いEnemy

有効なMarkerが存在せず、有効なEnemyが1体以上存在する場合は、AttackEvent発火時点でPlayerに最も近いEnemyの現在座標を使用します。

Enemyの生存・浄化・Battle所属など、Enemyが攻撃対象として有効かどうかの判定はEnemy／Combat側の状態を使用します。

Markerが存在しないことを理由に、過去のMarker座標を使用しません。

---

## レティクルRay

有効なMarkerも有効なEnemyも存在しない場合は、AttackEvent発火時点のCameraから画面上のレティクルを通るRayを生成します。

Rayが何かへ接触した場合は、最初に接触した地点をTarget座標とします。

```text
Camera
↓
レティクルを通るRay
↓
最初の接触地点
↓
Target座標
```

Rayが何にも接触しない場合は、Rayの方向にある十分遠い地点をTarget座標とします。

この距離は、TargetFallbackDistance等の調整可能なパラメータとして保持します。

## Target座標のsnapshot

確定したTarget座標は、TargetとなったMarkerやEnemyへの追従参照ではなく、AttackEventが保持する固定world座標としてsnapshotします。

概念上、以下の値として扱います。

```text
AttackEvent Target Position Snapshot
=
発火時に確定したworld座標
```

AttackEvent発火後は、以下が発生してもTarget座標を再取得しません。

- Markerが移動する
- Markerが爆風で消滅する
- Markerが新しいMarkerへ置換される
- Enemyが移動する
- Enemyが死亡・消滅する
- 別のEnemyがPlayerへ近づく
- PlayerまたはCameraの向きが変化する
- レティクル位置が変化する

Target候補となったobjectを追尾するのではなく、発火時点で確定した座標を攻撃先として使用します。

## AttackEvent内での共有

1つのAttackEventが発射するすべてのPalette Bulletは、同じTarget座標snapshotを共有します。

### Chord

Chord AttackEventの全Palette Bulletは、同じTarget座標を使用します。

### Arpeggio

Arpeggio AttackEventの各音楽的Timingで発射されるPalette Bulletも、AttackEvent発火時に確定した同じTarget座標を使用します。

後続のArpeggio Entryを発射する時点で、Marker・Enemy・Rayを再評価しません。

長いアルペジオを複数のArpeggio AttackEventへ分割した場合は、各AttackEventが自身の発火時にTarget座標を個別に確定します。

## 基本ルール
- Target座標はAttackEvent発火時に1回だけ確定する
- Marker → 最も近いEnemy → レティクルRay接触地点 → 十分遠い地点の順で決定する
- 確定結果はobject参照ではなく固定world座標として扱う
- 同じAttackEventの全Palette BulletでTarget座標を共有する
- Arpeggioの各TimingでTargetを再取得しない
- 発火後にMarkerやEnemyが移動・消滅してもTarget座標を変更しない

## 調整・未決事項
- TargetFallbackDistanceの具体値
- レティクルRayが判定対象とするLayer
- PlayerとEnemyの距離測定に使用する基準Transform
- 複数Enemyが完全に同距離だった場合のtie-break

<PageRelations />
