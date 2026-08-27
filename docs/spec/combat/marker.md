---
title: "マーカー"
description: Palette BulletにおけるMarkerの生成・飛行・衝突・付着・Target提供・消滅・Battle終了時無効化仕様
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
- Battle終了時のTarget公開停止・Gameplay無効化・cleanup

---

## 他ページとの責務境界

MarkerFiringの入力・ActionState・発射タイミング・Marker生成位置・狙点の受け渡しは、[Playerアクション｜マーカー](/spec/player/player-action-marker)を正本とします。

レティクルから狙点を決定する規則は、[エイム時のカメラ](/spec/camera/aim)を正本とします。

本ページは、Marker生成位置と狙点を受け取り、初期発射方向を確定した後の飛行・重力・衝突・付着・消滅を正本とします。

AttackEventがMarkerを含むTarget候補からTarget座標を決定する優先順位は、[パレットブレット](/spec/combat/palette-bullet)を正本とします。

Battle結果の確定規則、同一frameの終了候補の優先順位、Result操作解禁は、[ゲーム全体](/spec/game/)および[戦闘概要](/spec/combat/)を正本とします。本ページでは、確定済みBattle結果を受け取った後のMarker OwnerによるGameplay無効化を定義します。

発火済みAttackEventが保持するTarget座標snapshotのBattle終了時無効化は、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正本とします。本ページはMarker自身からの新しいTarget公開を停止し、他Ownerが保持するsnapshotを直接破棄しません。

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
| `Ended` | Gameplay上の消滅・無効化済み。表示専用objectが一時的に残る場合を含む | 無効 |

Markerは生成された時点で`Flying`になります。

`Flying`から付着状態へ移行した後、再び`Flying`へ戻りません。

`AttachedToEnemy`のMarkerが付着先を失った場合は、`DetachedFromEnemy`へ遷移します。

`Ended`へ移行したMarkerは、Target座標を公開せず、飛行・衝突・付着処理へ参加しません。表示専用objectを残す場合も、Gameplay状態は`Ended`のままとします。

---

## 有効なMarker

同時に有効にできるMarkerは、最大1個とします。

現在のBattleが結果未確定で、有効な生成要求として受理されたMarkerは、生成された時点から有効なTarget候補になります。

各Markerは生成時に、所属Battleの`battleId`を保持します。Markerが有効なTarget候補になるには、次をすべて満たす必要があります。

- Markerの`battleId`が現在のBattleと一致する
- 現在のBattleが結果未確定である
- Marker状態が`Flying`、`AttachedToEnemy`、`AttachedToSurface`、`DetachedFromEnemy`のいずれかである
- MarkerのGameplay無効化が完了していない

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

現在のBattleが進行中である場合、`Flying`、`AttachedToEnemy`、`AttachedToSurface`、`DetachedFromEnemy`のいずれも、有効なTarget候補です。

状態にかかわらず、有効なMarkerはAttackEventへ現在のworld座標を公開します。

Markerが飛行中か付着済みかを、有効性の条件には使用しません。

Battle結果確定後は、状態が飛行中または付着済みに見えていても、Target候補として扱いません。

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

### 無効化の開始条件

Gameが現在のBattleについて最終Battle結果を確定した時点で、Marker OwnerはBattle終了cleanupを開始します。

Battle終了候補を受け取っただけでは無効化を開始しません。同一frame内の終了候補の収集と結果確定は、[ゲーム全体](/spec/game/)を正本とします。

```text
GameがBattle結果を確定
↓
Marker Ownerへ
BattleResultFinalized(battleId, result)
↓
現在のbattleIdに属するMarkerをGameplay無効化
```

Marker Ownerは`Clear / Game Over`を再判定せず、Gameから通知された確定結果だけを使用します。どちらの結果でもMarkerのGameplay無効化内容は同じです。

---

### 状態にかかわらないGameplay無効化

Battle結果確定時に有効なMarkerが存在する場合、飛行中・付着済み・切り離し済みにかかわらず、即座にGameplay上無効化して`Ended`へ遷移します。

```text
Flying
AttachedToEnemy
AttachedToSurface
DetachedFromEnemy
↓ Battle結果確定
Ended
```

無効化後は、以下へ参加しません。

- Target候補判定
- Target座標の公開
- 飛行・重力更新
- Enemy / 地面 / 壁との衝突・付着判定
- 付着先Enemyへの追従更新
- 付着先喪失時の`DetachedFromEnemy`遷移
- Palette Bullet爆風によるGameplay消滅判定
- 新しいMarkerとのGameplay上の置換判定

Battle結果確定前にすでに確定したAttackEvent Target座標snapshotは、Marker側から巻き戻しません。そのsnapshotのBattle終了時取消・無効化は、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正本とします。

結果確定と同一frameのTarget決定・AttackEvent処理については、[ゲーム全体](/spec/game/)、[戦闘概要](/spec/combat/)、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)の結果確定規則に従い、本ページで独自の再判定を行いません。

---

### Target座標の公開停止

Battle結果確定時に、現在のMarkerをTarget候補一覧から除外し、Target座標の公開を停止します。

```text
Battle結果確定
↓
Marker Target公開gateを閉じる
↓
現在MarkerをTarget Providerから登録解除
↓
以後のTarget問い合わせへMarker座標を返さない
```

無効化後にMarkerのworld座標や表示objectが残っていても、新しいAttackEventのTarget決定へ使用しません。

Target問い合わせ側が無効化前に取得したMarker参照を保持していた場合も、問い合わせ実行時にMarkerの`battleId`とGameplay有効性を再確認します。`Ended`または旧BattleのMarker参照からTarget座標を取得しません。

表示用Transformを更新する場合も、その座標をGameplay用Target Providerへ再公開しません。

---

### `battleId`による旧Marker参照の拒否

Marker本体、Target Provider登録、Target座標問い合わせ、飛行・衝突・付着callbackには、所属Battleの`battleId`を対応付けます。

MarkerをGameplay処理へ使用する直前に、少なくとも次を確認します。

```text
MarkerのbattleId
==
現在のBattleのbattleId

かつ

現在のBattleが結果未確定

かつ

MarkerがGameplay上有効
```

いずれか一つでも満たさない場合、そのMarker参照・callbackを拒否し、副作用のないno-opとして終了します。

旧`battleId`のMarker参照によって、以下を行ってはなりません。

- Target座標を公開する
- Target候補として選択される
- 飛行・重力・衝突・付着処理を再開する
- 付着先Enemyへ追従する
- 新Battleの有効Markerを置換または消滅させる
- 新BattleのMarker Owner状態やcleanup状態を変更する

Battle結果確定後に遅れて届いたMarker生成要求も、結果確定済みまたは`battleId`不一致として拒否します。

---

### 表示objectとGameplay処理の分離

Battle結果確定後、Markerの表示をどのように終了するかは、演出方針に応じて次のどちらも許可します。

- 表示objectを即時消去する
- 残像・消滅VFXなどの表示専用演出として一時的に残す

表示専用として残す場合も、MarkerのGameplay状態は`Ended`です。少なくとも次を無効化します。

- Gameplay用Collider / Trigger
- Target Provider登録
- Target座標公開
- 物理衝突による付着処理
- Palette Bullet爆風とのGameplay相互作用
- Enemy追従をGameplay結果へ接続する参照

表示専用objectのTransformやAnimatorを演出目的で更新することはできますが、Damage、Hit、Target提供、Marker置換などのGameplay効果を発生させません。

表示objectや消滅VFXの終了は、Marker Ownerの必須cleanup完了条件およびResult操作解禁条件に含めません。表示を即時消去するか演出として残すかにかかわらず、MarkerのGameplay無効化完了後はResult操作解禁を妨げません。

---

### 次のBattleへの持ち越し禁止

Retryまたは次のBattleでは、新しい`battleId`を使用します。前BattleのMarker状態・Target Provider登録・参照を新Battleへ持ち越しません。

次のBattle開始前に、旧BattleのMarkerについて少なくとも次が成立している必要があります。

- Gameplay状態が`Ended`である
- Target候補一覧から除外済みである
- Target座標公開が停止済みである
- Gameplay用Collider / Triggerが無効である
- Marker Ownerの現在Marker参照から除外済みである

Result演出中に表示専用objectを残す場合、その残留はResult中だけの演出として扱い、次のBattleのGameplayを有効化する前に消去するか、旧Battle専用の表示scopeごと終了します。次のBattleへMarker objectとして持ち越しません。

消去処理の完了直前など一時的に旧表示objectが存在しても、`battleId`不一致とGameplay無効状態によって新Battleへ影響させません。

---

### cleanupの処理順と冪等性

Marker Ownerは、現在の`battleId`に対するBattle結果確定通知を一度だけ受理し、次の順序でcleanupします。

```text
1. BattleResultFinalized(battleId, result)を受理
↓
2. Marker生成受付・Target公開gateを閉じる
↓
3. 現在MarkerをTarget Providerから登録解除する
↓
4. 状態にかかわらずGameplay上`Ended`へ遷移させる
↓
5. 飛行・衝突・付着・追従処理を無効化する
↓
6. Marker Ownerの現在Marker参照を終了する
↓
7. 必須cleanup完了条件を確認する
↓
8. battleId付きでMarker Ownerの必須cleanup完了を通知する
```

同じBattle結果確定通知を複数回受け取っても、Target Provider登録解除、Collider無効化、参照終了を重複実行して不正状態を発生させない冪等処理とします。

Markerが存在しない場合も、Target公開gateと旧`battleId`拒否が成立していることを確認した上でcleanup完了とします。

---

### 必須cleanup完了条件

Marker Ownerの必須cleanupは、現在の`battleId`について次のすべてを満たした時点で完了とします。

- Marker生成受付が停止している
- Marker Target公開gateが閉じている
- 有効なMarkerがTarget Providerへ登録されていない
- 飛行中・付着済みを含む旧BattleのMarkerがすべてGameplay上`Ended`である
- Target座標を新しく公開できない
- 飛行・衝突・付着・追従callbackがGameplay状態を変更できない
- 旧`battleId`のMarker参照を拒否できる
- Marker Ownerの現在Marker参照が終了している
- 表示専用objectが残っていてもGameplayへ再接続できない

すべてを満たした後、上位のcleanup集約Ownerへ、`battleId`付きでMarker Ownerの必須cleanup完了を通知します。

```text
Marker必須cleanup完了
↓
CleanupCompleted(battleId)
↓
上位cleanup集約Ownerへ通知
```

次の完了は待ちません。

- Marker表示objectの消去
- 残像・消滅VFX
- Gameplay効果を持たない表示専用Animation

Result操作の解禁はMarker Owner単独では判断しません。全必須Ownerのcleanup完了を集約した上位Ownerが、[ゲーム全体](/spec/game/)の規則に従って判断します。

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
- 各Markerは生成時に所属Battleの`battleId`を保持する
- Battle結果確定後はMarkerの状態にかかわらずTarget候補として扱わない
- Battle結果確定時にTarget Provider登録を解除し、Target座標公開を停止する
- 飛行中・付着済み・切り離し済みのMarkerをすべてGameplay上`Ended`へ遷移させる
- Battle結果確定後はMarkerの飛行・衝突・付着・追従処理を継続しない
- 旧`battleId`のMarker参照・callback・生成要求を拒否する
- 旧BattleのMarker状態・Target Provider登録・Owner参照を次のBattleへ持ち越さない
- 表示専用Markerや消滅VFXを残す場合もGameplay効果を持たせない
- 表示専用objectの終了をMarker Ownerの必須cleanup完了条件に含めない
- Marker OwnerのBattle終了cleanupは重複通知に対して冪等とする
- 必須cleanup完了後、`battleId`付きで上位cleanup集約Ownerへ通知する

<PageRelations />
