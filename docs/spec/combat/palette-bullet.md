---
title: "パレットブレット"
description: Palette Bulletへの状態遷移・発射開始位置・Target座標・Mode／Conduct・飛行・衝突・RGB Damage・第一／第二爆発仕様
pageType: spec
category: "戦闘"
status: 仮仕様
relatedTasks: []
---

# パレットブレット

## 目的

本ページでは、世界内のShaondamaがCharge成功によりAttackEvent occurrenceへ割り当てられて`Reserved`となり、AttackEventで定められた発射タイミングにPalette Bullet化する境界と、その後の処理について、以下を定義します。

- Palette Bullet化とShaondamaからの情報引き継ぎ
- AttackEvent occurrenceからのTarget座標・Mode snapshot・付与済みConductの引き継ぎ
- 発射開始位置
- AttackEvent発動時のTarget座標決定と共有
- Chord / Arpeggio AttackEventとの関係
- Mode／Conductを反映した値の確定と発射後の保持
- 直線飛行と飛行終了条件
- 衝突対象と除外対象
- Direct Contact／Explosionの判定
- Damage種別ごとの倍率を適用した最終RGB Damage payload生成
- Direct Contact／Explosion RGB Damage候補の出力
- 壁・地形による爆風遮蔽
- 飛行終了に伴う第一爆発と、やまびこによる第二爆発の予約・実行・取消
- Markerとの相互作用
- Battle終了時のGameplay無効化とcleanup完了条件
- 発射音を起点とする音響Repeatとの責務境界
- 調整パラメータ

## 他ページとの責務境界

| 項目 | 正本 |
|---|---|
| Modeの切替・入力・`Fire Music Position`でのsnapshot、Conductの付与・効果・初期値 | [Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct) |
| AttackEventの発動条件、発射対象Shaondama、Chord / Arpeggioの発射タイミング、Mode snapshotと付与済みConductの保持 | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Palette Bullet化、発射開始位置、Target決定規則、飛行、衝突、第一爆発、第二爆発の予約・実行・取消 | 本ページ |
| Direct Contact／第一・第二Explosionの判定、Mode／Conductと倍率を適用した最終RGB Damage payload生成、候補出力 | 本ページ |
| Colliderなどによる不要なDamage候補生成の抑制 | 本ページ |
| Shaondamaの個体情報・`effective RGB基礎値` | [シャオンダマのデータ](/spec/shaondama-music/orb-data) |
| Shaondamaの浮遊状態とReserved状態 | [シャオンダマの浮遊挙動](/spec/shaondama-music/floating-behavior) |
| 未Charge Normal Shaondamaの自然破裂とNatural Burst候補 | [シャオンダマの浮遊挙動](/spec/shaondama-music/floating-behavior) |
| Markerの有効条件・現在座標・置換・飛行・付着・消滅 | [マーカー](/spec/combat/marker) |
| レティクルRayの起点・方向・狙点 | [エイム時のカメラ](/spec/camera/aim) |
| Damage候補の基本的な有効性確認、最終重複除外、同一frame集約、丸め、RGB加算、Clamp、浄化判定、Stage通知 | [Damageと浄化](/spec/enemy/damage-and-purify) |
| 発射音・音程音と、発射音を起点とするやまびこの音響Repeat | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| Battle結果の確定、同一frameの終了候補とDamageの扱い、Result接続 | [ゲーム全体](/spec/game/)・`combat/index.md` |
| Battle結果確定後のPalette Bullet固有の無効化とcleanup | 本ページ |

AttackEvent成立判定は、本ページで定義する規則に従い、AttackEvent発動時にTarget座標を確定します。

本ページは、Palette Bulletが発火済みAttackEvent occurrenceから受け取ったMode snapshotと付与済みConductを保持し、Damage発生源固有の倍率を含む必要な効果を一度だけ適用して最終RGB Damage payloadを生成し、Enemy Damage処理へ共通RGB Damage候補として出力するところまでを扱います。

Enemy Damageは、受け取った最終RGB Damage payloadへDirect Contact／Explosion倍率を再適用しません。候補を受け取った後の最終重複除外、同一frame集約、丸め、RGB加算、Clamp、浄化判定、およびStage通知は、本ページで再定義しません。

Palette BulletのRGB DamageからEnemyのHP Damageを暗黙に生成しません。本ページもEnemy Damage側も、RGB Damageを単一HP Damageへ変換する責務を持ちません。

## Palette Bullet化

Palette Bulletは、Reserved状態のShaondamaが、AttackEventで定められた発射タイミングに弾丸化したものです。

```text
Reserved Shaondama
↓
AttackEventで定められた発射タイミング
↓
個体情報・effective RGB基礎値を引き継ぐ
＋
occurrence対応・Target座標・Mode snapshot・付与済みConductを引き継ぐ
↓
浮遊状態を終了
↓
Palette Bullet
```

Palette Bullet化の前後で、見た目を変更する必要はありません。

Palette Bulletは、弾丸化の対象となったShaondamaから、少なくとも以下を引き継ぎます。

- 個体識別情報
- `battleId`
- Normal／Wildcardの種別
- `effective RGB基礎値`
- Direct Contact／Explosionの最終RGB Damage payload生成に必要な調整値への参照

同時に、発射元となるAttackEvent occurrenceとの対応から、少なくとも以下の不変情報を受け取ります。

- AttackEvent occurrenceの識別情報
- occurrence全体で共有する固定Target座標snapshot
- occurrenceが`Fire Music Position`で取得済みのMode snapshot
- Charge成功時にoccurrenceへcommit済みのConduct。未付与の場合は明示的な未選択状態

Mode IDだけを受け取り、発射時・飛行中・衝突時・爆発時にPlayerのcurrent Modeを読み直して補完してはいけません。Mode／Conductの不変設定を受け取るか、必要な算出済み値を受け取るかは実装方式とします。

所属`battleId`、個体識別情報、occurrenceとの対応、`effective RGB基礎値`、Target座標、Mode snapshot、付与済みConductのうち、処理に必要な情報が不足または不正である発射要求は拒否します。拒否時に現在のMode、現在のConduct選択、過去のTarget座標を暗黙に使用しません。

Mode snapshotは、occurrenceが`Fire Music Position`へ到達して発火を開始した瞬間に取得済みです。Chord／Arpeggio／Weak AttackEventで同じoccurrence全体に共有し、Arpeggioの先頭EntryがEmptyでも最初の実発射まで取得を遅らせません。

弾丸化したShaondamaは、同じ時点で浮遊状態を終了します。同一個体をShaondamaとPalette Bulletの両方としてGameplay上に残しません。

同じobjectを状態遷移させるか、情報を引き継いだ別objectへ置き換えるかは実装方式とし、Gameplay仕様では固定しません。どちらの方式でも、同一個体の二重存在・二重消費・二重発射を発生させてはなりません。

`effective RGB基礎値`は、AllocationやWildcard置換などを反映した、Damage発生源固有倍率を適用する前のRGB値です。Damage倍率適用後にEnemy Damageへ渡す値は`最終RGB Damage payload`と呼び、両者を混同しません。

## 発射開始位置

Palette Bulletの発射開始位置は、弾丸化した瞬間における対象Shaondamaの現在World座標とします。

ShaondamaがReservedになった時点、Chargeが成功した時点、またはAttackEventが発動した時点の過去座標は使用しません。

### Chord AttackEvent

Chord AttackEventでは、発射対象となる各Shaondamaを同じ発射タイミングにPalette Bullet化します。

各Palette Bulletは、それぞれのShaondamaが弾丸化した瞬間の現在World座標から同時に発射されます。全弾をPlayer位置や共通の発射Transformへ移動してから発射しません。

### Arpeggio AttackEvent

Arpeggio AttackEventでは、各Entryの発射時刻に、対応するShaondamaをPalette Bullet化します。

各Palette Bulletは、そのEntryの発射時刻における対応Shaondamaの現在World座標から発射されます。1発目の発射時点で、後続Entryに対応するShaondamaの発射開始位置を固定しません。

各Entryの発射開始位置を取得する時点は、occurrence全体のMode snapshotとTarget座標snapshotを取得する時点とは別です。後続Entryの発射開始位置だけを各Entryの実発射時に取得し、ModeまたはTargetを取り直しません。

## AttackEventのTarget座標決定

AttackEventは、発動時にPalette BulletのTargetとなる1つのWorld座標を確定します。

| 優先順位 | 条件 | 使用する座標 |
|---|---|---|
| 1 | 有効なMarkerが存在する | 発動時点のMarkerの現在World座標 |
| 2 | Markerが存在せず、有効なEnemyが存在する | 発動時点でPlayerに最も近いEnemyの現在World座標 |
| 3 | Markerも有効なEnemyも存在せず、レティクルRayが何かへ接触する | Rayが最初に接触したWorld座標 |
| 4 | Rayが何にも接触しない | レティクル方向の所定距離にあるWorld座標 |

上位の候補が有効な場合、下位の候補をTargetとして使用しません。

### Marker

有効なMarkerが存在する場合は、AttackEvent発動時点のMarkerの現在World座標をTarget座標とします。

Markerが飛行中か付着済みかは問いません。[マーカー](/spec/combat/marker)側で有効と判定され、現在World座標を公開しているMarkerはTarget候補になります。

Markerが存在しない場合に、消滅済みMarkerや過去のMarker座標を使用しません。

### 最も近いEnemy

有効なMarkerが存在せず、有効なEnemyが1体以上存在する場合は、AttackEvent発動時点でPlayerに最も近いEnemyの現在World座標をTarget座標とします。

Enemyの生存・浄化状態・Battle所属など、攻撃対象として有効かどうかの判定はEnemy / Combat側の状態を使用します。

複数の有効EnemyがPlayerから同距離の場合は、安定した順序を持つEnemy配列またはリストのうち、最初に取得されたEnemyを選択します。同順位を、不定順の物理検索結果だけで決定してはなりません。

### レティクルRay

有効なMarkerも有効なEnemyも存在しない場合は、AttackEvent発動時点のPlayerの視線・レティクル方向へRayを生成します。

Rayの起点・方向は、[エイム時のカメラ](/spec/camera/aim)を正本とします。

Rayが何かへ接触した場合は、最初に接触したWorld座標をTarget座標とします。

```text
AttackEvent発動
↓
レティクル方向へRay
↓
最初の接触地点
↓
Target座標
```

Rayが何にも接触しない場合は、レティクル方向の所定距離にあるWorld座標をTarget座標とします。

## Target座標のsnapshot

確定したTarget座標は、Target候補となったMarkerやEnemyへの追従参照ではなく、AttackEventが保持する固定World座標としてsnapshotします。

```text
AttackEvent Target Position Snapshot
=
AttackEvent発動時に確定したWorld座標
```

一度確定したTarget座標は、そのAttackEventの終了まで変更しません。

AttackEvent発動後は、以下が発生してもTarget座標を再取得・再計算しません。

- Markerが移動する
- Markerが爆風で消滅する
- Markerが新しいMarkerへ置換される
- Enemyが移動する
- Enemyが死亡・浄化・消滅する
- 別のEnemyがPlayerへ近づく
- PlayerまたはCameraの向きが変化する
- レティクル位置が変化する

Palette Bulletは、Target候補となったobjectを追尾せず、保存済みのTarget座標へ飛行します。

## AttackEvent内でのTarget共有

同じAttackEventに属するすべてのPalette Bulletは、1つのTarget座標snapshotを共有します。

### Chord AttackEvent

Chord AttackEventの全Palette Bulletは、AttackEvent発動時に確定した同じTarget座標を使用します。

### Arpeggio AttackEvent

1つのArpeggio AttackEventは、1回のChargeと1つのTarget座標を共有する短い攻撃フレーズとして扱います。

各Entryは、それぞれの発射時刻に対応するShaondamaをPalette Bullet化し、AttackEvent発動時に保存した同じTarget座標へ発射します。

1発目の爆風などでMarkerが消滅した場合も、残りのEntryはMarker・Enemy・Rayを再評価せず、保存済みのTarget座標を使用します。

音楽上長く続くアルペジオは、Gameplay上の攻撃単位ごとに複数のArpeggio AttackEventへ分割します。

分割はRuntimeで自動的に行わず、MusicChart上で複数のAttackEventとして定義します。分割後の各AttackEventは、それぞれの発動時にTarget座標を個別に確定します。

## Mode／Conduct適用済みの値

Palette Bulletは、Mode／Conductがない場合の通常値を起点として、発火元occurrenceから受け取った不変情報を次の順で接続します。

```text
Palette Bulletの通常値・通常の音響設定
↓
Mode snapshotのEffectorを左から右へ適用
↓
付与済みConductを適用
↓
Direct Contact／ExplosionなどのGameplay出力と音響要求へ接続
```

Direct Contact／ExplosionのDamageについては、`effective RGB基礎値`へ通常Multiplierまたは対応するWildcard overrideのどちらか一方を適用した値を、そのDamage経路のMode適用前通常payloadとします。通常MultiplierとWildcard overrideを重ねて適用しません。

```text
Damage種別ごとのMode適用前通常payload
=
effective RGB基礎値
×
通常Multiplierまたは対応するWildcard overrideのどちらか一方
```

その経路へ作用するMode snapshotのEffectorを左から右へ一度だけ適用し、続いて付与済みConductを一度だけ適用した値を、Enemy Damageへ渡す最終RGB Damage payloadとします。Enemy Damage側でMode、Conduct、通常Multiplier、Wildcard overrideを再適用しません。

Mode／Conduct由来の値は、Palette Bullet化後も不変情報として保持します。PlayerがModeを変更した場合やConductを新しく選択した場合も、発射済みPalette Bulletの飛行、Direct Contact、第一爆発、第二爆発へ反映しません。

現在採用済みのPalette Bullet関連効果は次のとおりです。

| 設定 | Palette Bulletへの効果 |
|---|---|
| Mode 1 | Mode適用前のDirect Contact RGB payloadを0.75倍、Explosion RGB payloadを0.75倍にする |
| ひろがり | Mode適用後のExplosion Radiusを1.5倍にする。Damage、Palette Bullet数、弾道、Targetは変更しない |
| やまびこ | 第一爆発の成立時に第二爆発を1回予約する。第一爆発の半径とDamageは追加変更しない |

Mode 1のStamina回復倍率など、Palette Bullet以外への効果は本ページで再計算しません。未採用Effectorの加算・乗算・非線形合成・上限・丸め規則も本ページでは創作せず、個別EffectorとTuningの将来仕様へ委譲します。

未Charge Normal Shaondamaがsource NoteEvent時刻に行う自然破裂は、Weak AttackEventまたはPalette Bulletの発射ではありません。[シャオンダマの浮遊挙動](/spec/shaondama-music/floating-behavior)を正本とし、Palette Bullet用の攻撃系Mode効果またはConductを適用しません。

## 飛行

Palette Bulletは、自身の発射開始位置から確定済みTarget座標へ直線的に飛行します。

```text
Shaondamaの現在World座標
↓
Palette Bullet化・発射
↓
確定済みTarget座標へ直線飛行
↓
最初に成立した終了条件で爆発
```

Palette Bulletは重力の影響を受けません。

飛行中は、以下を行いません。

- Targetへの追尾
- 再Target
- Target座標の再計算
- 自動旋回
- 軌道補正
- 反射
- 貫通

飛行速度は調整パラメータとします。

## 飛行の終了条件

Palette Bulletは、以下のいずれかが最初に成立した時点で、その位置に爆発を発生させて終了します。

- 確定済みTarget座標への到達
- 衝突対象との接触
- 最大飛行距離への到達
- 最大飛行時間への到達

最大飛行距離または最大飛行時間によって終了した場合も、物体への着弾時と同じ爆発処理を実行します。

複数の終了条件が同じ更新内で成立した場合も、同じPalette Bulletから飛行終了に伴う第一爆発を複数回生成しません。1発のPalette Bulletが生成できる第一爆発は最大1回です。

通常およびひろがりのPalette Bulletは、この第一爆発だけを発生させます。やまびこが付与されたPalette Bulletは、第一爆発とは別に、後述する第二爆発を最大1回予約できます。第二爆発は飛行終了条件を再評価して発生させる爆発ではありません。

爆発処理を開始したPalette Bulletは飛行・衝突処理を終了し、再び有効なPalette Bulletとして残りません。

## 衝突対象

Palette Bulletは、少なくとも以下への接触を爆発条件として扱います。

- 有効Enemy
- 浄化済みEnemy
- Player
- Shaondama
- Marker
- 他のPalette Bullet
- その他の弾
- 地面
- 壁
- Palette Bulletの衝突対象として明示的に登録された物体

EnemyのDamage判定がTrigger Colliderで実装されている場合は、そのTrigger ColliderをPalette Bulletの衝突対象に含めます。

以下のような、接触判定だけを目的とした不可視Triggerは、Palette Bulletの衝突対象として明示的に登録しない限り衝突対象に含めません。

- 会話イベント
- カメラ領域
- AI領域
- ステージ進行判定

Palette Bulletは最初に接触した有効な衝突対象の位置で終了し、反射・貫通を行いません。

高速で飛行する場合も、有効な衝突対象をすり抜けない衝突判定方式を使用します。Rayおよび衝突判定の対象Layerは調整パラメータとして保持します。

## 直接接触Damage

Palette BulletがDirect Contact候補の生成条件を満たすEnemyへ直接接触した場合、そのEnemyに対するDirect Contact RGB Damage候補を生成します。

通常Shaondama由来のDirect Contactについては、Palette Bulletが引き継いだ`effective RGB基礎値`へ`DirectHitMultiplier`を適用し、Mode適用前通常payloadを生成します。

```text
Direct Contact Mode適用前通常payload
=
Palette Bulletのeffective RGB基礎値
×
DirectHitMultiplier
```

発生元がWildcardである場合は、通常の`DirectHitMultiplier`の代わりに`WildcardDirectHitMultiplierOverride`を使用します。2つの倍率を重ねて適用しません。

このMode適用前通常payloadへ、そのDirect Contact経路へ作用するMode snapshotのEffectorを左から右へ適用し、続いて付与済みConductを適用した値をDirect Contact最終RGB Damage payloadとします。初期Mode 1ではMode適用前通常payloadを0.75倍にします。現在採用済みのひろがり／やまびこはDirect Contact Damageを変更しません。

倍率、Mode、Conductを適用済みの最終RGB Damage payloadをEnemy Damageへ渡し、Enemy Damage側では再適用しません。

Direct Contact RGB Damage候補には、その接触作用を一意に識別できる作用またはEvent識別情報を含めます。同じDirect Contact作用から同じEnemyへColliderなどによって不要な候補を複数生成しないよう、Palette Bullet側でも候補生成を抑制します。

対象Enemyが候補を最終的に受け付けるかは、[Damageと浄化](/spec/enemy/damage-and-purify)が`battleId`、Battle結果確定状態、および対象frameのEnemy Snapshotに基づいて確定します。Palette Bullet側の候補生成時判定を、Enemy Damage側の最終受付判定の代わりにしません。

以下はPalette Bulletを爆発させますが、Direct Contact RGB Damageの対象にはなりません。

- 浄化済みEnemy
- Player
- Shaondama
- Marker
- 他のPalette Bulletおよび他の弾
- 地面・壁・その他の地形
- Enemyではない登録済み衝突対象

## 第一爆発・範囲Damage

Palette Bulletは、Target座標への到達、物体との接触、最大飛行距離、最大飛行時間のいずれで終了した場合も、同じ第一爆発処理を実行します。

爆発範囲と遮蔽の条件を満たすEnemyに対して、Explosion RGB Damage候補を生成します。

通常Shaondama由来のExplosionについては、Palette Bulletが引き継いだ`effective RGB基礎値`へ`ExplosionMultiplier`を適用し、Mode適用前通常payloadを生成します。

```text
Explosion Mode適用前通常payload
=
Palette Bulletのeffective RGB基礎値
×
ExplosionMultiplier
```

`DirectHitMultiplier`と`ExplosionMultiplier`は、それぞれ独立した調整値として保持します。

発生元がWildcardであり、Explosionに対応するWildcard用倍率override（WildcardExplosionMultiplierOverride）を使用する場合は、通常の`ExplosionMultiplier`の代わりに、Enemy Damageへ候補を出力する前の倍率決定時に一度だけ適用します。

このMode適用前通常payloadへ、そのExplosion経路へ作用するMode snapshotのEffectorを左から右へ適用し、続いて付与済みConductを適用した値をExplosion最終RGB Damage payloadとします。初期Mode 1ではMode適用前通常payloadを0.75倍にします。ひろがりはMode適用後のExplosion Radiusだけを1.5倍にし、Explosion Damageへ追加倍率を適用しません。やまびこは第一爆発のDamageを変更しません。

倍率、Mode、Conductを適用済みの最終RGB Damage payloadをEnemy Damageへ渡し、Enemy Damage側ではoverride、Mode、Conductを再適用しません。

爆心からの距離によるDamage減衰は行いません。爆発範囲内にいて、遮蔽判定を通過した対象には、爆心からの距離にかかわらず同じExplosion最終RGB Damage payloadを使用します。

1回の爆発につき、同一EnemyへのExplosion RGB Damage候補は最大1件とします。複数のColliderを持つEnemyは、Collider単位ではなく1体のEnemyとしてまとめ、Palette Bullet側で不要な候補生成を抑制します。この規則は第一爆発と第二爆発へそれぞれ独立して適用します。

各爆発には、同じ爆発から同じEnemyへ発生した候補を識別できる爆発Event識別情報を付与します。第一爆発と第二爆発には異なる識別情報を与え、どちらも同じ発生元Palette Bulletへ対応付けます。Palette Bullet側で候補生成を抑制した後も、Enemy Damage側は受け取った候補について最終的な重複除外を行います。

Palette BulletがDirect Contact候補の生成条件を満たすEnemyへ直接接触した場合は、直接接触したEnemyに対して以下の両方を生成します。

- Direct Contact RGB Damage候補
- Explosion RGB Damage候補

直接接触したEnemyであっても、Explosion RGB Damageには爆発範囲と遮蔽の条件を適用します。

同じPalette Bulletに由来する候補でも、Direct ContactとExplosionは異なるDamage発生源種別です。Enemy Damage側の重複除外によって、一方を他方の重複候補として削除してはいけません。

第一爆発と第二爆発は別のDamage作用です。同じEnemyが両方の範囲・遮蔽条件を満たした場合、一方を他方の重複として削除しません。第二爆発のためだけに新しいDamage発生源種別を必須とせず、共通のPalette Bullet Explosion種別を使用する場合も、異なる爆発Event識別情報で区別します。

## 壁・地形による爆風遮蔽

壁または地形によって爆心から遮られているEnemyには、Explosion RGB Damage候補を生成しません。この規則は第一爆発と第二爆発のそれぞれの発生時点に適用します。

爆発範囲内のEnemyごとに、爆心とEnemyのDamage判定点との間を物理的な遮蔽判定で確認します。

```text
爆心
↓
EnemyのDamage判定点へ遮蔽判定
├─ 壁・地形による遮蔽なし
│   → Explosion RGB Damage候補を生成
└─ 壁・地形による遮蔽あり
    → Explosion RGB Damage候補を生成しない
```

Enemy同士は、他のEnemyに対する爆風遮蔽物として扱いません。

シェーダーやVFXによる爆風表示の切り抜きは演出用です。Gameplay上のDamage可否は、表示結果ではなく物理的な遮蔽判定によって決定します。

## やまびこの第二爆発

付与済みConductがやまびこであるPalette Bulletは、Gameplay上有効な第一爆発が成立した時点で、そのPalette Bulletに対応する第二爆発を最大1回予約します。Enemyへの実Damage、浄化、Stage通知、または元AttackEvent occurrenceの通常処理完了を待機開始条件にしません。

第一爆発の命中対象が0体であっても、現在のBattleが継続中であれば第二爆発を予約します。第一爆発の成立後にBattle結果が確定した場合は、未発生予約を取り消します。

### 予約時に保持する不変情報

第二爆発の予約は、少なくとも次の情報を保持します。

- 第一爆発の固定World座標
- Mode適用後の通常Explosion Radius
- Mode適用後の通常Explosion RGB payload
- 所属`battleId`
- 発生元Palette BulletおよびAttackEvent occurrenceとの対応
- 第一爆発とは異なる第二爆発用の爆発Event識別情報
- 残り待機時間と、未予約／予約中／実行済み／取消済みを区別できる状態

予約後に第一爆発の表示objectまたはPalette Bullet objectを破棄・pool返却しても、保持済みの値から第二爆発を実行できるようにします。破棄済みまたは別用途へ再利用されたobjectのTransform、Collider、現在値を参照しません。

### 待機時間と実行条件

第二爆発は、第一爆発の成立から初期値0.5秒後に実行します。待機時間は次の規則に従います。

| 状況 | 第二爆発予約の扱い |
|---|---|
| 通常Gameplay | 待機時間を進め、期限に達したら処理する |
| HitStop | 待機時間を進め、期限に達したらHitStop中でも処理する |
| Pause | 残り時間と予約データを保持し、時計・範囲判定・Damage候補・Marker消滅を停止する |
| Resume | 保持した残り時間から再開し、実行時に受付条件を再確認する |
| Battle結果確定・終了 | 未発生予約を取り消し、新しい第二爆発・候補・Marker消滅を成立させない |
| Retry・次Battle | 旧予約を持ち越さず、旧`battleId`の遅延callbackを拒否する |

通常Room移動によって旧Battleが終了した場合も、そのBattleの予約を取り消します。PlayerのMode／Conduct cooldown残量をRoom間で保持する規則を、第二爆発予約へ適用しません。

期限へ到達した時点で、予約の`battleId`が現在のBattleと一致し、CombatがGameplay出力を受け付け、Battle結果が未確定であることを再確認します。いずれかを満たさない場合は副作用なしで取消済みとし、後から再実行しません。

### 範囲・遮蔽・Damageの再判定

第二爆発は、予約時に保持した第一爆発の固定World座標を爆心として使用します。第二爆発の発生時点におけるEnemy位置を使って範囲判定を行い、爆心と各EnemyのDamage判定点の間にある壁・地形の遮蔽を再判定します。

第一爆発の命中Enemy一覧、範囲query結果、遮蔽結果を再利用しません。Enemyへ追従する座標も使用しません。そのため、第一爆発後に範囲へ入ったEnemyは第二爆発の候補になり、範囲外へ出たEnemyまたは新たに遮蔽されたEnemyは候補になりません。

第二爆発には次の値を使用します。

```text
第二爆発のExplosion Radius
=
予約時に保持したMode適用後の通常Explosion Radius

第二爆発の最終RGB Damage payload
=
予約時に保持したMode適用後の通常Explosion RGB payload
×
0.5
```

第二爆発ではDirect Contact RGB Damageを発生させません。Mode Effector chain、`ExplosionMultiplier`、`WildcardExplosionMultiplierOverride`を再実行せず、保持済みの通常Explosion RGB payloadから一度だけ50%のpayloadを生成します。50%はEnemy反映後または丸め後の値へ適用しません。

例えば、通常MultiplierまたはWildcard overrideを反映したMode適用前のExplosion RGB payloadの1チャンネルが100で、Mode 1を使用している場合、Mode適用後の通常payloadは75、第二爆発のpayloadは37.5です。Palette Bullet側では37.5を丸めず、Enemy Damage側の同一frame集約後の丸めへ渡します。

第二爆発から、追加の第二爆発、Palette Bulletの再発射、Shaondamaの生成・再消費を発生させません。重複したcallbackや同一更新内の複数条件から予約・実行・Damage候補を増やさず、予約と実行をそれぞれ最大1回とします。

## 音響Repeatとの責務境界

やまびこのGameplay上の第二爆発と音響Repeatは、起点とOwnerが異なる独立した予約です。

| 処理 | 起点 | 初期待機時間 | 初期出力 | Owner |
|---|---|---|---|---|
| Gameplay上の第二爆発 | 第一爆発の成立 | 0.5秒 | 通常Explosion Damageの50% | Palette Bullet側 |
| 音響Repeat | 各Palette Bulletの元の発射音 | 0.5秒 | 元の発射音の音量50% | Audio側 |

発射から第一爆発までの飛行時間があるため、両者は異なる時刻に発生できます。第二爆発から音響Repeatを発生させず、音響Repeatから第二爆発を発生させません。一方が取消または不発であることだけを理由に、もう一方を追加発生させません。

Audio側もBattle終了時に未発生Repeatを破棄しますが、Palette Bullet側の第二爆発予約と同一の予約objectまたは同一の待機開始点として扱いません。具体的な発射音、音程音、Repeat再生は[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正本とします。

## Markerとの関係

Palette BulletがMarkerへ直接接触した場合は、その接触位置で爆発します。MarkerへのDirect Contact RGB Damageは生成しません。

Markerは、Palette Bulletの第一爆発または第二爆発の爆風範囲に少しでも触れると、Damage量やRGB値にかかわらず消滅します。

第二爆発では、発生時点のMarker位置を使って爆風範囲との接触を判定します。第一爆発時のMarker一覧を再利用しないため、第一爆発後に範囲へ入った有効なMarkerも消滅対象になります。

この消滅規則は、飛行中・Enemyへの付着中・地面や壁への付着中・付着先Enemyから切り離された後のMarkerに適用します。

付着先Enemyが死亡・浄化・消滅しただけでは、Markerを自動消滅させません。爆風に触れていないMarkerは、その場に残ります。

そのMarkerが次のAttackEvent発動時にも有効であれば、現在World座標をTarget候補として使用できます。

AttackEventがTarget座標をsnapshotした後にMarkerが爆風で消滅しても、確定済みTarget座標は変更しません。

## 最終RGB Damage payloadと候補出力

Palette Bulletは、成立した条件に応じて以下のDamage候補をEnemy Damage処理へ出力します。

| Damage発生源種別／作用 | 対象 | 最終RGB Damage payload |
|---|---|---|
| Palette Bullet Direct Contact | Direct Contact候補の生成条件を満たす直接接触Enemy | 通常Shaondama由来：`effective RGB基礎値 × DirectHitMultiplier`を起点にMode snapshot、Conductの順で適用／Wildcard由来：`effective RGB基礎値 × WildcardDirectHitMultiplierOverride`を起点に同じ順で適用 |
| Palette Bullet Explosion（第一爆発） | 第一爆発時に、爆発範囲内かつ壁・地形に遮蔽されていない各Enemy | 通常Shaondama由来：`effective RGB基礎値 × ExplosionMultiplier`を起点にMode snapshot、Conductの順で適用／Wildcard由来：`effective RGB基礎値 × WildcardExplosionMultiplierOverride`を起点に同じ順で適用 |
| Palette Bullet Explosion（やまびこの第二爆発） | 第二爆発時に再評価した範囲内かつ壁・地形に遮蔽されていない各Enemy | 予約時に保持したMode適用後の通常Explosion RGB payload × 0.5。Mode chain、種別Multiplier、Wildcard overrideを再実行しない |

第一爆発と第二爆発へ同じPalette Bullet ExplosionのDamage発生源種別を使用しても構いません。表中の括弧は作用を区別する説明であり、新しいDamage発生源種別を必須化するものではありません。ただし、それぞれへ異なる爆発Event識別情報を与えます。

各候補から、最低限、次の情報を識別できるようにします。

- Damage発生源種別
  - Palette Bullet Direct Contact
  - Palette Bullet Explosion
- 発生元となるDirect Contact作用またはExplosion Eventの識別子
- Explosionの場合は、第一爆発または第二爆発の別作用であることと、共通する発生元Palette Bullet
- 対象Enemy
- 通常Multiplierまたはoverride、Mode、Conductを必要に応じて適用済みの最終RGB Damage payload
- `battleId`

Damage候補を出力した時点では、EnemyのR・G・B浄化値、表示、浄化状態、Stage側記録を更新しません。候補が生成された時点・順番と、Enemy Damageが同一frame分を確定処理する順番を区別します。

Enemy Damage側の最終重複除外では、`Damage発生源種別 + Damage作用またはEvent識別情報 + 対象Enemy識別情報`を区別できる必要があります。Palette Bulletは、この判別に必要な情報を欠落させずに候補へ含めます。

同一frame内の最終重複除外、候補集約、RGB値の丸め、加算、Clamp、浄化判定、Enemy状態更新、およびStageへの浄化通知は、[Damageと浄化](/spec/enemy/damage-and-purify)を正本とします。

Enemy Damage側は、Palette Bulletから受け取った最終RGB Damage payloadへ`DirectHitMultiplier`、`ExplosionMultiplier`、`WildcardDirectHitMultiplierOverride`、`WildcardExplosionMultiplierOverride`、Mode、またはConductを再適用しません。

Palette Bullet側の候補生成抑制と、Enemy Damage側の最終重複除外は別の責務です。Palette Bullet側でColliderなどによる不要な候補の乱造を抑えても、Enemy Damage側の最終重複除外を省略しません。

Palette Bullet側は、Damage候補を最終的なEnemy状態へ直接変換せず、RGB DamageからHP Damageを生成しません。

## Battle結果確定時のGameplay無効化

Battle結果の確定規則、同一frame内の終了候補とDamageの扱い、およびResult接続は、`game/index.md`と`combat/index.md`を正本とします。本ページでは、確定したBattle結果の通知を受けた後にPalette Bullet Ownerが行う無効化とcleanupを定義します。

### 結果確定と同一frameのDamage

Battle結果確定と同じframeにPalette Bulletの接触、爆発、Damage候補が発生した場合、Palette Bullet側で独自に結果を再判定しません。

| Battle結果確定時点の状態 | 扱い |
|---|---|
| 結果確定前にEnemy Damage処理へ出力済みのDamage候補 | Enemy Damageの`battleId`・Battle結果・Snapshot確認と同一frame集約へ委譲する。Palette Bullet側から巻き戻しや再送を行わない |
| 結果確定時点でPalette Bullet側に残っている未送信・未受理のDamage候補 | 破棄し、結果確定後に送信しない |
| 結果確定時点で未発生の第二爆発予約 | 取り消し、第二爆発、範囲・遮蔽query、Damage候補、Marker消滅を発生させない |
| 結果確定後に届いた衝突、Overlap、爆発、Damage callback | 無効として破棄し、新しいGameplay結果を成立させない |

結果確定前に出力された候補であっても、Enemy Damageの確定処理時点ですでにBattle結果が確定済みである場合は、RGB値へ反映されず、新しい浄化を成立させません。候補の最終受付・RGB反映・浄化はEnemy Damage、Clear条件評価はStage、最終Battle結果確定はGame／Battle進行を正本とします。

Palette Bullet Ownerは、出力済み候補を取消して結果を変えたり、同じDamage候補を再送したりしません。

### 即時無効化

現在の`battleId`に対するBattle結果確定通知を受けた時点で、飛行中、衝突処理中、爆発処理中のPalette Bullet、および未発生の第二爆発予約を即座にGameplay無効へ移行します。

Gameplay無効化後は、既存のPalette Bulletから次を新しく成立させません。

- Target座標への到達、最大飛行距離、最大飛行時間によるGameplay上の飛行終了
- 衝突、Hit、Trigger、Overlap
- Direct Contact RGB Damage候補
- Gameplay上の爆発判定と爆発範囲query
- 第二爆発の予約・実行
- Explosion RGB Damage候補
- 爆風によるMarker消滅
- Enemyの浄化やその他のGameplay状態変更

結果確定と同じ更新処理内であっても、結果確定後に評価された衝突や爆発から新しいDamage候補を生成しません。

すでに爆発演出を開始している場合も、結果確定時点で残っているDamage判定、範囲query、MarkerへのGameplay効果を停止します。見た目として爆発していることを、Gameplay上の有効な爆発が継続している根拠にしません。第一爆発のVFX／SEを表示専用として残す場合も、未発生の第二爆発を表示専用処理として継続しません。

Battle結果確定後に新しいPalette Bullet化・発射要求が届いた場合も拒否します。発射待ちのArpeggio Entryと未消費Reserved Shaondamaの取消・解放は、`bgm/bgm-attack-judgement.md`を正本とします。

### `battleId`による旧Battleの拒否

Palette Bulletは、Palette Bullet化前から継続するbattleIdの`battleId`を保持します。少なくとも次の通知、判定、候補には同じ`battleId`を引き継ぎます。

- 衝突、Hit、Trigger、Overlap通知
- 飛行終了と爆発開始通知
- 爆発範囲queryの結果
- Direct Contact／Explosion RGB Damage候補
- 第二爆発の予約、待機、実行、取消通知
- 遅延callbackと非同期処理の完了通知

保持している`battleId`が現在のBattleと一致しないPalette Bullet、およびそのPalette Bulletから届いた通知やDamage候補は破棄します。

Retryや次のStageで新しいBattleを開始する場合は、新しい`battleId`を使用します。旧BattleのPalette Bullet object、衝突結果、爆発query、Damage候補、callbackを、新しいBattleのEnemy、Marker、Damage処理へ接続しません。

### 表示専用の残留演出

Gameplay無効化後に、Palette Bulletの軌跡、object、すでに開始済みの爆発VFX、SEを表示専用として残すことはできます。

残留演出には、Gameplay上有効なCollider、Trigger、Hit判定、Damage判定、爆発範囲query、第二爆発予約、Marker消滅効果を持たせません。表示用objectが移動を続ける場合も、その位置をTarget、衝突、Damageの根拠にしません。

表示専用objectの消滅、VFX、SEの終了はPalette Bullet Ownerの必須cleanup完了条件に含めず、Result操作の解禁を妨げません。

### cleanupの冪等性

同じ`battleId`に対するBattle結果確定通知が複数回届いた場合も、Gameplay無効化とcleanupは一度だけ行います。

すでに無効化済みのPalette Bulletを再度終了処理へ入れたり、取消・実行済みの第二爆発予約を再処理したり、破棄済みDamage候補を再処理したり、cleanup完了通知を複数回送信したりしません。現在と異なる`battleId`の終了通知によって、現在のBattleのPalette Bulletを無効化してはいけません。

### cleanup完了条件

次のすべてを満たした時点を、Palette Bullet Ownerの必須cleanup完了とします。

- 終了したBattleに対する新しいPalette Bullet化・発射要求を拒否している
- 終了したBattleに属する飛行中・衝突処理中・爆発処理中の全Palette BulletをGameplay無効化している
- 終了したBattleのCollider、Trigger、Hit、Damage、爆発範囲query、Marker消滅処理を停止している
- 終了したBattleの未発生第二爆発予約を取り消し、発行待ちの予約通知と遅延callbackを無効化している
- Palette Bullet側に残っていた未送信・未受理のDamage候補を破棄している
- 発行待ちの衝突、爆発、Damage callbackを無効化している
- 結果確定前にEnemy Damageへ出力済みのDamage候補を再送・再取消せず、Enemy Damage側へ処理を委譲している
- 旧`battleId`のPalette Bulletと遅延通知が現在または次のBattleへ影響できない

上記をすべて満たした時点で内部cleanup完了とし、Palette Bullet Ownerの必須cleanup完了を一度だけ通知します。表示専用の残留object、VFX、SEの終了は待ちません。

## 調整パラメータ

以下の具体値は仕様欠落ではなく、調整可能なパラメータとして管理します。

| パラメータ | 内容 |
|---|---|
| `PaletteBulletSpeed` | Palette Bulletの飛行速度 |
| `ExplosionRadius` | 爆発範囲の基準半径 |
| `PaletteBulletMaxFlightDistance` | 1発が飛行できる最大距離 |
| `PaletteBulletMaxFlightDuration` | 1発が飛行できる最大時間 |
| `DirectHitMultiplier` | Direct Contact RGB Damageへ適用する倍率 |
| `ExplosionMultiplier` | Explosion RGB Damageへ適用する倍率 |
| `WildcardDirectHitMultiplierOverride` | Wildcard由来Palette BulletのDirect Contactで、`DirectHitMultiplier`の代わりに使用する専用倍率 |
| `WildcardExplosionMultiplierOverride` | Wildcard由来Palette BulletのExplosionで、`ExplosionMultiplier`の代わりに使用する専用倍率 |
| `Mode1DirectContactDamageMultiplier` | Mode 1がDirect Contact RGB payloadへ適用する初期倍率。初期値0.75 |
| `Mode1ExplosionDamageMultiplier` | Mode 1がExplosion RGB payloadへ適用する初期倍率。初期値0.75 |
| `HirogariExplosionRadiusMultiplier` | ひろがりがMode適用後のExplosion Radiusへ適用する倍率。初期値1.5 |
| `EchoSecondExplosionDelay` | 第一爆発から第二爆発までの待機時間。初期値0.5秒 |
| `EchoSecondExplosionDamageMultiplier` | 第二爆発がMode適用後の通常Explosion RGB payloadへ適用する倍率。初期値0.5 |
| `TargetRayMaxDistance` | Target決定用Rayの最大距離と、未接触時にTargetを置く所定距離 |
| `TargetRayLayerMask` | Target決定用Rayの判定対象Layer |
| `PaletteBulletCollisionMask` | Palette Bulletの衝突対象Layer |
| `EnemyExplosionDamagePoint` | Enemyごとの爆風遮蔽判定に使用するDamage判定点 |
| `ExplosionQueryShape` | 爆発範囲の判定形状 |

各値はハードコードせず、調整可能なデータとして保持します。

Mode／Conductの初期効果と全体の正本は[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)です。本ページはPalette Bulletへ接続する値を示し、具体的なC# class名、field名、object pooling方式を固定しません。

調整用の不変設定と、各Palette Bulletまたは第二爆発予約がRuntimeで保持するMode snapshot、算出済み値、残り待機時間、予約状態を区別します。第二爆発の待機時計は、HitStop中も進み、Pause中は停止するという本ページの挙動を満たすものとします。

音響Repeatの待機時間と音量倍率はAudio側の調整値であり、`EchoSecondExplosionDelay`または`EchoSecondExplosionDamageMultiplier`を音響予約のRuntime状態として共用しません。

`RGBDamageRoundingMode`は、同一frameの候補集約後にEnemy Damage側が使用する調整値です。Palette Bullet側では最終RGB Damage payloadを候補単位で丸めず、[Damageと浄化](/spec/enemy/damage-and-purify)へ委譲します。

## 基本ルール

- Palette Bulletは、Reserved Shaondamaが発射タイミングに弾丸化したものとする
- Palette Bullet化時に、Shaondamaの個体情報と`effective RGB基礎値`を引き継ぐ
- Palette Bullet化時に、AttackEvent occurrenceとの対応、固定Target座標、`Fire Music Position`で確定済みのMode snapshot、付与済みConductを引き継ぐ
- 必須情報が不足・不正な発射要求は拒否し、Playerのcurrent Modeや現在Conduct選択で補完しない
- Palette Bullet化した個体をShaondamaとPalette Bulletの両方として残さない
- 発射開始位置は、弾丸化した瞬間の対象Shaondamaの現在World座標とする
- Target座標は、AttackEvent発動時に1回だけ確定する
- Targetは、Marker → 最も近い有効Enemy → レティクルRay接触地点 → レティクル方向の所定距離点の順で決定する
- 同距離のEnemyは、安定した順序を持つEnemy配列またはリストの先頭を選択する
- 確定したTargetはobject参照ではなく固定World座標として扱う
- 同じAttackEventの全Palette BulletでTarget座標を共有する
- Arpeggioの各EntryでModeとTargetを再取得せず、発射開始位置だけを各Entryの実発射時に取得する
- 通常値 → Mode snapshotのEffectorを左から右 → 付与済みConductの順で適用し、発射後にcurrent Modeを読み直さない
- Mode 1はDirect ContactとExplosionのMode適用前RGB payloadをそれぞれ0.75倍にする
- ひろがりはMode適用後のExplosion Radiusだけを1.5倍にし、Damage、弾数、弾道、Targetを変更しない
- Palette Bulletは確定済みTarget座標へ直線飛行し、重力・追尾・反射・貫通を使用しない
- 最初に成立した終了条件の位置で、1発につき飛行終了に伴う第一爆発を最大1回だけ発生させる
- 最大飛行距離または最大飛行時間による終了でも、同じ第一爆発処理を使用する
- やまびこは第一爆発から0.5秒後に、同じ固定World座標で通常半径・通常Explosion RGB payloadの50%による第二爆発を最大1回発生させる
- 第二爆発の待機時間はHitStop中も進め、Pause中は残量を保持して停止する
- 第二爆発時にEnemyの範囲・壁／地形の遮蔽とMarker接触を再判定し、第一爆発の結果を再利用しない
- Palette Bullet側でDirect Contact／第一・第二Explosionの判定と、Multiplier／override・Mode／Conduct適用済み最終RGB Damage payload生成を行い、共通RGB Damage候補としてEnemy Damageへ出力する
- Direct Contact候補の生成条件を満たすEnemyへの直接接触では、Direct ContactとExplosionの両方のRGB Damage候補を生成する
- Explosion RGB Damageは距離減衰なし、同じ爆発から同一Enemyにつき1回、壁・地形による遮蔽ありとする
- 第一爆発と第二爆発は異なるDamage作用として識別し、一方を他方の重複として削除しない
- Palette Bullet側で不要な候補生成を抑制し、Enemy Damage側で受信候補の最終重複除外を行う
- Enemy Damage側では、Palette Bulletが適用済みの`DirectHitMultiplier`、`ExplosionMultiplier`、`WildcardDirectHitMultiplierOverride`、`WildcardExplosionMultiplierOverride`、Mode、Conductを再適用しない
- Palette BulletのRGB DamageからEnemyのHP Damageを暗黙に生成しない
- 未Charge Normal Shaondamaの自然破裂へPalette Bullet用の攻撃系Mode効果またはConductを適用しない
- MarkerはPalette Bulletの第一爆発または第二爆発に触れると、Damage量とRGB値にかかわらず消滅する
- やまびこの音響Repeatは元の発射音、第二爆発は第一爆発を起点とし、別々に予約・取消する
- Damageの最終集約・反映・浄化判定はEnemy Damage仕様へ委譲する
- Battle結果確定後は、飛行中・衝突処理中・爆発処理中のPalette Bulletと未発生の第二爆発予約を即座にGameplay無効化する
- 結果確定後は、直接接触Damage、爆発予約・判定、範囲Damage、Marker消滅を新しく成立させない
- 結果確定と同一frameの出力済みDamage候補はEnemy Damageの受付・集約規則へ委譲し、未送信候補と確定後のcallbackは破棄する
- 旧`battleId`のPalette Bullet、Damage候補、遅延callbackを現在または次のBattleへ接続しない
- 表示専用の残留object、VFX、SEの終了をcleanup完了やResult操作解禁の条件にしない

<PageRelations />
