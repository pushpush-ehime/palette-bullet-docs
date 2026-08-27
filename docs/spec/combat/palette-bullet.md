---
title: "パレットブレット"
description: Palette Bulletへの状態遷移・発射開始位置・Target座標・飛行・衝突・RGB Damage・爆発仕様
pageType: spec
category: "戦闘"
status: 仮仕様
relatedTasks: []
---

# パレットブレット

## 目的

本ページでは、Reserved状態のShaondamaから生成されるPalette Bulletについて、以下を定義します。

- Palette Bullet化とShaondamaからの情報引き継ぎ
- 発射開始位置
- AttackEvent発動時のTarget座標決定と共有
- Chord / Arpeggio AttackEventとの関係
- 直線飛行と飛行終了条件
- 衝突対象と除外対象
- Direct Contact RGB Damage
- 爆発とExplosion RGB Damage
- 壁・地形による爆風遮蔽
- Markerとの相互作用
- Enemy Damage処理へ渡すDamage候補
- Battle終了時のGameplay無効化とcleanup完了条件
- 調整パラメータ

## 他ページとの責務境界

| 項目 | 正本 |
|---|---|
| AttackEventの発動条件、発射対象Shaondama、Chord / Arpeggioの発射タイミング | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Palette Bullet化、発射開始位置、Target決定規則、飛行、衝突、爆発、Damage候補 | 本ページ |
| Shaondamaの個体情報・有効RGB情報 | [シャオンダマのデータ](/spec/shaondama-music/orb-data) |
| Shaondamaの浮遊状態とReserved状態 | [シャオンダマの浮遊挙動](/spec/shaondama-music/floating-behavior) |
| Markerの有効条件・現在座標・置換・飛行・付着・消滅 | [マーカー](/spec/combat/marker) |
| レティクルRayの起点・方向・狙点 | [エイム時のカメラ](/spec/camera/aim) |
| Damage候補の集約、丸め、Clamp、HP反映、RGB浄化判定 | [Damageと浄化](/spec/enemy/damage-and-purify) |
| Battle結果の確定、同一frameの終了候補とDamageの扱い、Result接続 | [ゲーム全体](/spec/game/)・`combat/index.md` |
| Battle結果確定後のPalette Bullet固有の無効化とcleanup | 本ページ |

AttackEvent成立判定は、本ページで定義する規則に従い、AttackEvent発動時にTarget座標を確定します。

本ページは、Palette BulletからEnemy Damage処理へDamage候補を渡すところまでを扱います。候補を受け取った後の集約・反映処理は、本ページで再定義しません。

## Palette Bullet化

Palette Bulletは、Reserved状態のShaondamaが、AttackEventで定められた発射タイミングに弾丸化したものです。

```text
Reserved Shaondama
↓
AttackEventで定められた発射タイミング
↓
個体情報・有効RGB情報を引き継ぐ
↓
浮遊状態を終了
↓
Palette Bullet
```

Palette Bullet化の前後で、見た目を変更する必要はありません。

Palette Bulletは、弾丸化の対象となったShaondamaから、少なくとも以下を引き継ぎます。

- 個体識別情報
- `battleId`
- 有効RGB情報
- Palette BulletのDamage計算に必要な調整値への参照

弾丸化したShaondamaは、同じ時点で浮遊状態を終了します。同一個体をShaondamaとPalette Bulletの両方としてGameplay上に残しません。

同じobjectを状態遷移させるか、情報を引き継いだ別objectへ置き換えるかは実装方式とし、Gameplay仕様では固定しません。どちらの方式でも、同一個体の二重存在・二重消費・二重発射を発生させてはなりません。

## 発射開始位置

Palette Bulletの発射開始位置は、弾丸化した瞬間における対象Shaondamaの現在World座標とします。

ShaondamaがReservedになった時点、Chargeが成功した時点、またはAttackEventが発動した時点の過去座標は使用しません。

### Chord AttackEvent

Chord AttackEventでは、発射対象となる各Shaondamaを同じ発射タイミングにPalette Bullet化します。

各Palette Bulletは、それぞれのShaondamaが弾丸化した瞬間の現在World座標から同時に発射されます。全弾をPlayer位置や共通の発射Transformへ移動してから発射しません。

### Arpeggio AttackEvent

Arpeggio AttackEventでは、各Entryの発射時刻に、対応するShaondamaをPalette Bullet化します。

各Palette Bulletは、そのEntryの発射時刻における対応Shaondamaの現在World座標から発射されます。1発目の発射時点で、後続Entryに対応するShaondamaの発射開始位置を固定しません。

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

複数の終了条件が同じ更新内で成立した場合も、同じPalette Bulletから複数回爆発を生成しません。1発のPalette Bulletが生成できる爆発は最大1回です。

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

Palette Bulletが有効かつ未浄化のEnemyへ直接接触した場合、そのEnemyに対するDirect Contact RGB Damage候補を生成します。

Direct Contact RGB Damageは、Palette Bulletが引き継いだ有効RGB値へ`DirectHitMultiplier`を適用して算出します。

```text
Direct Contact RGB Damage
=
Palette Bulletの有効RGB値
×
DirectHitMultiplier
```

以下はPalette Bulletを爆発させますが、Direct Contact RGB Damageの対象にはなりません。

- 浄化済みEnemy
- Player
- Shaondama
- Marker
- 他のPalette Bulletおよび他の弾
- 地面・壁・その他の地形
- Enemyではない登録済み衝突対象

## 爆発・範囲Damage

Palette Bulletは、Target座標への到達、物体との接触、最大飛行距離、最大飛行時間のいずれで終了した場合も、同じ爆発処理を実行します。

爆発範囲内にいる有効かつ未浄化のEnemyに対して、Explosion RGB Damage候補を生成します。

Explosion RGB Damageは、Palette Bulletが引き継いだ有効RGB値へ`ExplosionMultiplier`を適用して算出します。

```text
Explosion RGB Damage
=
Palette Bulletの有効RGB値
×
ExplosionMultiplier
```

`DirectHitMultiplier`と`ExplosionMultiplier`は、それぞれ独立した調整値として保持します。

爆心からの距離によるDamage減衰は行いません。爆発範囲内にいて、遮蔽判定を通過した有効な対象には、爆心からの距離にかかわらず同じExplosion RGB Damageを与えます。

1回の爆発につき、同一EnemyへのExplosion RGB Damage候補は最大1件とします。複数のColliderを持つEnemyは、Collider単位ではなく1体のEnemyとして重複を除外します。

有効かつ未浄化のEnemyへ直接接触した場合は、直接接触したEnemyに対して以下の両方を生成します。

- Direct Contact RGB Damage候補
- Explosion RGB Damage候補

直接接触したEnemyであっても、Explosion RGB Damageには爆発範囲と遮蔽の条件を適用します。

## 壁・地形による爆風遮蔽

壁または地形によって爆心から遮られているEnemyには、Explosion RGB Damageを与えません。

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

## Markerとの関係

Palette BulletがMarkerへ直接接触した場合は、その接触位置で爆発します。MarkerへのDirect Contact RGB Damageは生成しません。

Markerは、Palette Bulletの爆風範囲に少しでも触れると、Damage量やRGB値にかかわらず消滅します。

この消滅規則は、飛行中・Enemyへの付着中・地面や壁への付着中・付着先Enemyから切り離された後のMarkerに適用します。

付着先Enemyが死亡・浄化・消滅しただけでは、Markerを自動消滅させません。爆風に触れていないMarkerは、その場に残ります。

そのMarkerが次のAttackEvent発動時にも有効であれば、現在World座標をTarget候補として使用できます。

AttackEventがTarget座標をsnapshotした後にMarkerが爆風で消滅しても、確定済みTarget座標は変更しません。

## Damage処理への出力

Palette Bulletは、成立した条件に応じて以下のDamage候補をEnemy Damage処理へ出力します。

| Damage候補 | 対象 | 算出基準 |
|---|---|---|
| Direct Contact RGB Damage候補 | 直接接触した有効かつ未浄化のEnemy | 有効RGB値 × `DirectHitMultiplier` |
| Explosion RGB Damage候補 | 爆発範囲内かつ壁・地形に遮蔽されていない有効かつ未浄化の各Enemy | 有効RGB値 × `ExplosionMultiplier` |

同一フレーム内のDamage集約順序、RGB値の丸め、Clamp、HPへの反映、RGB浄化判定は、[Damageと浄化](/spec/enemy/damage-and-purify)を正本とします。

Palette Bullet側は、Damage候補を最終的なEnemy状態へ直接変換しません。

## Battle結果確定時のGameplay無効化

Battle結果の確定規則、同一frame内の終了候補とDamageの扱い、およびResult接続は、`game/index.md`と`combat/index.md`を正本とします。本ページでは、確定したBattle結果の通知を受けた後にPalette Bullet Ownerが行う無効化とcleanupを定義します。

### 結果確定と同一frameのDamage

Battle結果確定と同じframeにPalette Bulletの接触、爆発、Damage候補が発生した場合、Palette Bullet側で独自に結果を再判定しません。

| Battle結果確定時点の状態 | 扱い |
|---|---|
| 結果確定前にCombat／Enemy Damage処理へ受理済みのDamage候補 | Game／Combatの同一frame結果確定規則へ委譲する。Palette Bullet側から巻き戻しや再送を行わない |
| 結果確定時点でPalette Bullet側に残っている未送信・未受理のDamage候補 | 破棄し、結果確定後に送信しない |
| 結果確定後に届いた衝突、Overlap、爆発、Damage callback | 無効として破棄し、新しいGameplay結果を成立させない |

結果確定前に受理されたDamage候補が最終Battle結果へどう反映されるかは、Game／Combat側の候補収集と確定順に従います。Palette Bullet Ownerは、受理済みDamageを取消して結果を変えたり、同じDamage候補を再送したりしません。

### 即時無効化

現在の`battleId`に対するBattle結果確定通知を受けた時点で、飛行中、衝突処理中、爆発処理中のPalette Bulletを即座にGameplay無効へ移行します。

Gameplay無効化後は、既存のPalette Bulletから次を新しく成立させません。

- Target座標への到達、最大飛行距離、最大飛行時間によるGameplay上の飛行終了
- 衝突、Hit、Trigger、Overlap
- Direct Contact RGB Damage候補
- Gameplay上の爆発判定と爆発範囲query
- Explosion RGB Damage候補
- 爆風によるMarker消滅
- Enemyの浄化やその他のGameplay状態変更

結果確定と同じ更新処理内であっても、結果確定後に評価された衝突や爆発から新しいDamage候補を生成しません。

すでに爆発演出を開始している場合も、結果確定時点で残っているDamage判定、範囲query、MarkerへのGameplay効果を停止します。見た目として爆発していることを、Gameplay上の有効な爆発が継続している根拠にしません。

Battle結果確定後に新しいPalette Bullet生成要求が届いた場合も拒否します。発射待ちのArpeggio Entryと未消費Reserved Shaondamaの取消・解放は、`bgm/bgm-attack-judgement.md`を正本とします。

### `battleId`による旧Battleの拒否

Palette Bulletは、生成元Battleの`battleId`を保持します。少なくとも次の通知、判定、候補には同じ`battleId`を引き継ぎます。

- 衝突、Hit、Trigger、Overlap通知
- 飛行終了と爆発開始通知
- 爆発範囲queryの結果
- Direct Contact／Explosion RGB Damage候補
- 遅延callbackと非同期処理の完了通知

保持している`battleId`が現在のBattleと一致しないPalette Bullet、およびそのPalette Bulletから届いた通知やDamage候補は破棄します。

Retryや次のStageで新しいBattleを開始する場合は、新しい`battleId`を使用します。旧BattleのPalette Bullet object、衝突結果、爆発query、Damage候補、callbackを、新しいBattleのEnemy、Marker、Damage処理へ接続しません。

### 表示専用の残留演出

Gameplay無効化後に、Palette Bulletの軌跡、object、爆発VFX、SEを表示専用として残すことはできます。

残留演出には、Gameplay上有効なCollider、Trigger、Hit判定、Damage判定、爆発範囲query、Marker消滅効果を持たせません。表示用objectが移動を続ける場合も、その位置をTarget、衝突、Damageの根拠にしません。

表示専用objectの消滅、VFX、SEの終了はPalette Bullet Ownerの必須cleanup完了条件に含めず、Result操作の解禁を妨げません。

### cleanupの冪等性

同じ`battleId`に対するBattle結果確定通知が複数回届いた場合も、Gameplay無効化とcleanupは一度だけ行います。

すでに無効化済みのPalette Bulletを再度終了処理へ入れたり、破棄済みDamage候補を再処理したり、cleanup完了通知を複数回送信したりしません。現在と異なる`battleId`の終了通知によって、現在のBattleのPalette Bulletを無効化してはいけません。

### cleanup完了条件

次のすべてを満たした時点を、Palette Bullet Ownerの必須cleanup完了とします。

- 終了したBattleに対する新しいPalette Bullet生成要求を拒否している
- 終了したBattleに属する飛行中・衝突処理中・爆発処理中の全Palette BulletをGameplay無効化している
- 終了したBattleのCollider、Trigger、Hit、Damage、爆発範囲query、Marker消滅処理を停止している
- Palette Bullet側に残っていた未送信・未受理のDamage候補を破棄している
- 発行待ちの衝突、爆発、Damage callbackを無効化している
- 結果確定前にCombatへ受理済みのDamage候補を再送・再取消せず、Combat側へ処理を委譲している
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
| `TargetRayMaxDistance` | Target決定用Rayの最大距離と、未接触時にTargetを置く所定距離 |
| `TargetRayLayerMask` | Target決定用Rayの判定対象Layer |
| `PaletteBulletCollisionMask` | Palette Bulletの衝突対象Layer |
| `EnemyExplosionDamagePoint` | Enemyごとの爆風遮蔽判定に使用するDamage判定点 |
| `ExplosionQueryShape` | 爆発範囲の判定形状 |
| `RGBDamageRoundingMode` | RGB Damageの丸め方式 |

各値はハードコードせず、調整可能なデータとして保持します。

## 基本ルール

- Palette Bulletは、Reserved Shaondamaが発射タイミングに弾丸化したものとする
- Palette Bullet化時に、Shaondamaの個体情報と有効RGB情報を引き継ぐ
- Palette Bullet化した個体をShaondamaとPalette Bulletの両方として残さない
- 発射開始位置は、弾丸化した瞬間の対象Shaondamaの現在World座標とする
- Target座標は、AttackEvent発動時に1回だけ確定する
- Targetは、Marker → 最も近い有効Enemy → レティクルRay接触地点 → レティクル方向の所定距離点の順で決定する
- 同距離のEnemyは、安定した順序を持つEnemy配列またはリストの先頭を選択する
- 確定したTargetはobject参照ではなく固定World座標として扱う
- 同じAttackEventの全Palette BulletでTarget座標を共有する
- Arpeggioの各EntryでTargetを再取得しない
- Palette Bulletは確定済みTarget座標へ直線飛行し、重力・追尾・反射・貫通を使用しない
- 最初に成立した終了条件の位置で、1発につき最大1回だけ爆発する
- 最大飛行距離または最大飛行時間による終了でも、同じ爆発処理を使用する
- 有効かつ未浄化のEnemyへの直接接触では、Direct ContactとExplosionの両方のRGB Damage候補を生成する
- Explosion RGB Damageは距離減衰なし、同一Enemyにつき1回、壁・地形による遮蔽ありとする
- MarkerはPalette Bulletの爆風に触れると、Damage量とRGB値にかかわらず消滅する
- Damageの最終集約・反映・浄化判定はEnemy Damage仕様へ委譲する
- Battle結果確定後は、飛行中・衝突処理中・爆発処理中のPalette Bulletを即座にGameplay無効化する
- 結果確定後は、直接接触Damage、爆発判定、範囲Damage、Marker消滅を新しく成立させない
- 結果確定と同一frameの受理済みDamage候補はGame／Combatの確定規則へ委譲し、未送信候補と確定後のcallbackは破棄する
- 旧`battleId`のPalette Bullet、Damage候補、遅延callbackを現在または次のBattleへ接続しない
- 表示専用の残留object、VFX、SEの終了をcleanup完了やResult操作解禁の条件にしない

<PageRelations />
