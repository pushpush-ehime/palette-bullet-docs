---
title: "マーカー"
description: Palette BulletにおけるMarkerの生成・飛行・衝突・付着・Target提供・消滅仕様
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
- Markerの物理的な飛行
- 初期発射方向・初期速度
- 重力の影響
- 衝突対象と除外対象
- Enemy・地面・壁への付着
- 未付着状態での最大飛行距離・最大飛行時間
- MarkerがEnemyへ付着した後の扱い
- Palette Bulletの爆風による消滅
- Battle終了時の無効化との接続

---

## 他ページとの責務境界

MarkerFiringの入力・ActionState・発射タイミング・Marker生成位置・狙点の受け渡しは、[Playerアクション｜マーカー](/spec/player/player-action-marker)を正本とします。

レティクルから狙点を決定する規則は、[エイム時のカメラ](/spec/camera/aim)を正本とします。

本ページは、Marker生成位置と狙点を受け取り、初期発射方向を確定した後の飛行・重力・衝突・付着・消滅を正本とします。

AttackEventがMarkerを含むTarget候補からTarget座標を決定する優先順位は、[パレットブレット](/spec/combat/palette-bullet)を正本とします。

---

## Markerの状態

Markerは、Gameplay上、以下の状態で扱います。

```text
Marker
├─ Flying
├─ AttachedToEnemy
├─ AttachedToSurface
├─ DetachedFromEnemy
└─ Ended
```

| 状態 | 内容 | Target候補 |
|---|---|---|
| `Flying` | 重力の影響を受けて飛行中 | 有効 |
| `AttachedToEnemy` | Enemyへ付着し、Enemyの移動へ追従中 | 有効 |
| `AttachedToSurface` | 地面または壁の接触地点へ固定中 | 有効 |
| `DetachedFromEnemy` | 付着先を失い、切り離した時点のworld座標へ固定中 | 有効 |
| `Ended` | 消滅・無効化済み | 無効 |

Markerは生成された時点で`Flying`になります。

`Flying`から付着状態へ移行した後、再び`Flying`へ戻りません。

`AttachedToEnemy`のMarkerが付着先を失った場合は、`DetachedFromEnemy`へ遷移します。

`Ended`へ移行したMarkerは、Target座標を公開せず、飛行・衝突・付着処理へ参加しません。

---

## 有効なMarker

同時に有効にできるMarkerは、最大1個とします。

Markerは、生成された時点から有効なTarget候補になります。

```text
Marker生成
↓
Flying
↓
有効なTarget候補
↓
最初の有効接触
│
├─ Enemy
│   → AttachedToEnemy
│
└─ 地面・壁
    → AttachedToSurface
```

`Flying`、`AttachedToEnemy`、`AttachedToSurface`、`DetachedFromEnemy`のいずれも、有効なTarget候補です。

状態にかかわらず、有効なMarkerはAttackEventへ現在のworld座標を公開します。

Markerが飛行中か付着済みかを、有効性の条件には使用しません。

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

## 生成と初期発射方向

Markerは、Playerの武器に設定されたMarker生成位置へ生成します。

Marker生成時に、以下を使用して初期発射方向を1回だけ確定します。

```text
Marker生成位置
+
発射Event時点の狙点
↓
狙点 - Marker生成位置
↓
正規化
↓
初期発射方向
```

確定した初期発射方向へ、Markerの初期発射速度を適用します。

狙点は初期発射方向の決定にだけ使用します。

発射後に以下が変化しても、進行方向を再計算しません。

- レティクル位置
- Cameraの向き
- Playerの向き
- 狙点
- Enemyの位置

重力落下を考慮して狙点へ必ず命中させる弾道補正は行いません。

Targetへの追尾、自動的な方向転換、旋回、進行方向の補正は行いません。

---

## 飛行

`Flying`のMarkerは、初期発射速度と重力の影響を受けて飛行します。

```text
Marker生成
↓
初期発射方向・初期速度を適用
↓
Flying
↓
重力によって軌道が変化
```

Markerは物理的な飛行中も有効なTarget候補です。

飛行中は、AttackEventへ毎回取得可能な現在のworld座標を公開します。

発射後は以下を行いません。

- Targetへの追尾
- Enemyへの自動誘導
- レティクル方向への自動修正
- 自動旋回
- PlayerまたはCameraの向きへの追従

---

## 衝突対象と除外対象

`Flying`のMarkerは、以下を有効な衝突・付着対象とします。

- Enemy
- 地面
- 壁

以下は衝突・付着対象から除外します。

- Player自身
- 他のMarker
- 付着対象ではないTrigger
- Enemy・地面・壁として扱わないGameplay object

付着対象外のColliderまたはTriggerへ接触しても、Markerの飛行を終了させません。

Markerの衝突判定では、飛行経路上の最初の有効な接触対象を使用します。

高速で移動する場合も有効な衝突対象をすり抜けない構造とします。

---

## 最初の接触対象への付着

`Flying`のMarkerが有効な衝突対象へ接触した場合、移動経路上で最初に接触した対象へ付着します。

付着成立時に、以下を行います。

1. 接触地点を確定する
2. Markerの飛行速度を停止する
3. 重力による移動を停止する
4. 接触対象に応じた付着状態へ遷移する
5. 以降の飛行衝突判定を終了する

付着時に、以下は発生しません。

- 跳ね返り
- 貫通
- 滑り
- 別対象への再付着
- 飛行状態への復帰

---

## Enemyへ付着したMarker

Enemyへ接触したMarkerは、接触地点を基準として付着し、`AttachedToEnemy`へ遷移します。

付着位置は、接触したColliderのTransformを基準とするlocal座標として保持します。

`AttachedToEnemy`のMarkerは、そのTransformの移動・回転に追従します。接触したColliderがBone配下にある場合は、Boneの動きもColliderのTransformを介して反映されます。

Enemyが死亡・浄化または消滅し、付着関係を維持できなくなった場合は、Markerを付着先から切り離して`DetachedFromEnemy`へ遷移します。

切り離したMarkerは、その時点のworld座標を保持したまま有効なTarget候補として残します。

```text
MarkerがEnemyへ付着
↓
AttachedToEnemy
↓
Enemy死亡・浄化・消滅
↓
DetachedFromEnemy
↓
切り離した時点のworld座標で有効なTarget候補を継続
```

Enemy死亡後にMarkerを再び飛行させたり、別のEnemyへ自動的に付け替えたりしません。

---

## 地面・壁へ付着したMarker

地面または壁へ接触したMarkerは、最初の接触地点へ固定し、`AttachedToSurface`へ遷移します。

`AttachedToSurface`のMarkerは、以下の影響を受けません。

- 重力
- 初期発射速度
- Playerの移動
- Cameraの向き
- レティクル位置

付着後に地面や壁の表面を滑ったり、跳ね返ったり、再び飛行したりしません。

---

## 未付着Markerの飛行終了

`Flying`のMarkerが何にも付着しないまま、以下のいずれかへ到達した場合は、そのMarkerを消滅させて`Ended`へ遷移します。

- 最大飛行距離
- 最大飛行時間

先に到達した条件を使用します。

最大飛行距離は、Marker生成後に`Flying`として実際に移動した経路の累積距離で評価します。生成地点から現在地点までの直線距離は使用しません。

最大飛行距離と最大飛行時間は、Markerが`Flying`である間だけ評価します。

`AttachedToEnemy`、`AttachedToSurface`または`DetachedFromEnemy`へ遷移した後は、最大飛行距離・最大飛行時間を理由に消滅させません。

具体的な距離と時間は調整パラメータとします。

---

## Palette Bulletの爆風による消滅

Markerは、Palette Bulletの爆風範囲に少しでも接触すると消滅します。

Markerの消滅判定には、以下を使用しません。

- Palette Bulletの威力
- RGB値
- Enemyへ与えるDamage量
- AttackEventの`Complete / Incomplete`
- Markerが飛行中か付着済みか

```text
Palette Bulletの爆風
↓
MarkerのColliderまたは判定範囲と接触
↓
Marker消滅
↓
Ended
↓
Target候補から除外
```

爆風による消滅が成立したMarkerは、現在の状態にかかわらず`Ended`へ遷移します。

Marker消滅前にAttackEventがTarget座標をsnapshotしていた場合、そのAttackEventの確定済みTarget座標には影響しません。

---

## Battle終了との関係

Battle結果が確定した時点で、Markerは[戦闘概要](/spec/combat/)のBattle終了lifecycleに従ってGameplay上無効化し、`Ended`へ遷移します。

無効化後は、新しいAttackEventへTarget座標を提供しません。

旧BattleのMarkerをRetry後の新しいBattleへ持ち越しません。

---

## パラメータ

| パラメータ | 内容 | 値 |
|---|---|---|
| `MarkerInitialSpeed` | Marker生成時の初期発射速度 | 未定 |
| `MarkerGravityScale` | Markerへ適用する重力補正 | 未定 |
| `MarkerMaxFlightDistance` | 未付着状態で許可する累積最大飛行距離 | 未定 |
| `MarkerMaxFlightDuration` | 未付着状態で許可する最大飛行時間 | 未定 |
| `MarkerCollisionMask` | Enemy・地面・壁を判定する衝突対象 | 未定 |
| `MarkerCollisionRadius` | Markerの物理衝突判定サイズ | 未定 |

各値はハードコードせず、調整可能なパラメータとして保持します。

---

## 基本ルール

- 同時に有効なMarkerは最大1個とする
- 新しいMarkerの生成直前に旧Markerを消滅させる
- MarkerはPlayerが発射する物理オブジェクトとする
- Markerは生成時点から有効なTarget候補とする
- Marker生成位置と狙点から初期発射方向を1回だけ確定する
- 発射後は重力の影響を受ける
- Target追尾・自動旋回・方向修正を行わない
- 飛行中・未付着のMarkerも現在座標を提供する
- Enemy・地面・壁を有効な付着対象とする
- Player自身と付着対象外Triggerを衝突対象から除外する
- 最初に接触した有効対象へ付着する
- 付着時に跳ね返り・貫通を発生させない
- Enemyへ付着したMarkerは接触したColliderのTransformへ追従する
- 地面・壁へ付着したMarkerは接触地点へ固定する
- 付着先Enemyが失われたMarkerは切り離した時点のworld座標へ固定する
- 未付着状態で累積最大飛行距離または最大飛行時間へ到達したMarkerは消滅する
- 最大飛行距離・最大飛行時間は付着後に適用しない
- Palette Bulletの爆風へ接触したMarkerは威力に関係なく消滅する
- Marker消滅後も、すでに確定済みのAttackEvent Target座標は変更しない

<PageRelations />
