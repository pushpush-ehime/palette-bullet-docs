---
title: シャオンダマ
description: Palette Bulletのシャオンダマ
pageType: spec
category: シャオンダマ
categoryOrder: 50
order: 0
status: 未決
---

# シャオンダマ

## ページ概要

- 対象担当：未決
- 関連ページ：
  - [BGM｜シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)
  - [BGM｜MusicChart](/spec/bgm/bgm-music-chart)
  - [ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)
  - [シャオンダマ｜浮遊・挙動](/spec/shaondama-music/floating-behavior)
  - [Playerアクション｜チャージ](/spec/player/player-action-charge)
  - [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)
  - [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)
  - [パレットブレット](/spec/combat/palette-bullet)
  - [万能シャオンダマ](/spec/shaondama-music/wildcard-orb)

## 目的

本ページでは、生成後のシャオンダマがGameplay上どのような存在であり、Playerにどのように利用されるかという概要を定義します。

通常シャオンダマは、MusicChart上の`NoteEvent`をもとに生成対象として決定され、ラジクジラを介して世界内へ出現します。

世界内へ出現した後はラジクジラから独立したオブジェクトとして存在し、Playerの選択対象になります。Charge成功時にはAttackEvent occurrenceへ割り当てられて`Reserved`となり、AttackEventの発火時に`Palette Bullet`化して発射されます。

`Palette Bullet`は、世界内のシャオンダマと無関係に新しく生成される弾ではありません。割り当てられた`Reserved`のシャオンダマが、対応する発射タイミングで`Palette Bullet`化します。

シャオンダマを何個・いつ・何から生成するか、ラジクジラからどのように出現させるか、出現後の具体的な浮遊・Lifetime・消滅、Chargeの詳細などは、それぞれの正本ページで定義します。

## プレイヤーから見た挙動

Playerから見た通常シャオンダマの基本的な流れは以下です。

1. BGM／MusicChart側で生成対象となるシャオンダマが決定される
2. 通常シャオンダマがラジクジラを介して世界内へ出現する
3. 出現したシャオンダマは、ラジクジラから独立したオブジェクトとして世界内に存在する
4. Playerは世界内に存在するシャオンダマを選択対象として利用する
5. Charge成功時に、選択したシャオンダマがAttackEvent occurrenceへ割り当てられて`Reserved`になる
6. AttackEventの発火時に、対象の`Reserved`のシャオンダマが`Palette Bullet`化して発射される

Chargeの入力、`ActionState`、開始・終了条件、成立条件は[Playerアクション｜チャージ](/spec/player/player-action-charge)、割り当てと`Reserved`は[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)、発火時の`Palette Bullet`化・発射は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)を正本とします。

## シャオンダマの浮遊仕様

### 目的

シャオンダマは、シャボン玉のように空中を漂う表現をコンセプトとします。

通常シャオンダマはラジクジラから世界内へ出現した後、ラジクジラから独立したオブジェクトとして存在します。

### 通常時

出現後の具体的な、

- 浮遊挙動
- 空間上での振る舞い
- Lifetime
- 消滅

については、[シャオンダマ｜浮遊・挙動](/spec/shaondama-music/floating-behavior)を正本とします。

本ページでは、敵の周囲を基準とした配置・浮遊ルールは定義しません。

## 詳細仕様

通常シャオンダマに関する基本的な責務は以下です。

- MusicChart上の`NoteEvent`に由来する
- Gameplay中の世界内に存在するオブジェクトである
- Playerによる選択対象となる
- ラジクジラは通常シャオンダマを世界内へ出現させる役割を持つ
- 世界内へ出現した後は、ラジクジラから独立したオブジェクトとして扱う
- Playerによる利用では、Charge成功時にAttackEvent occurrenceへ割り当てられて`Reserved`になる
- AttackEventの発火時に、対象の`Reserved`のシャオンダマが`Palette Bullet`化して発射される

シャオンダマ生成に使用する`NoteEvent`や生成タイミング・生成個数などの決定は、本ページでは扱いません。

## 状態別の挙動

本ページでは、シャオンダマの詳細な状態遷移や内部Stateは定義しません。

高レベルな責務の境界は以下とします。

- 世界内へ出現するまで
  - BGM／MusicChart側が生成対象を決定する
  - ラジクジラ側が通常シャオンダマを世界内へ出現させる
- 世界内へ出現した後
  - シャオンダマ側が生成後の挙動を担当する
- Playerによる利用時
  - Playerがシャオンダマを選択してChargeする
  - Charge成功時にAttackEvent occurrenceへ割り当て、`Reserved`にする
  - AttackEventの発火時に、対象の`Reserved`のシャオンダマを`Palette Bullet`化して発射する

## 他システムとの接続

### BGM／MusicChart

BGM／MusicChart側は、シャオンダマについて「何を・いつ・何個生成するか」を決定します。

生成ロジックの詳細は[BGM｜シャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、`MusicChart`および`NoteEvent`のデータ構造は[BGM｜MusicChart](/spec/bgm/bgm-music-chart)を正本とします。

### ラジクジラ

通常シャオンダマは、BGM／MusicChart側で決定された生成要求をもとに、ラジクジラを介して世界内へ出現します。

ラジクジラの背中からどのように世界内へ出現させるかについては、[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とします。

ラジクジラの追従・浮遊については、[ラジクジラ｜追従・浮遊](/spec/radiowhale/follow-and-floating)で定義します。

### Charge

世界内に存在するシャオンダマをPlayerが選択した後のCharge処理は、[Playerアクション｜チャージ](/spec/player/player-action-charge)を正本とします。

Charge成功時のAttackEvent occurrenceへの割り当てと`Reserved`は、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正本とします。

本ページではChargeの入力、State、成立条件、Allocationの内部ロジックは定義しません。

### AttackEvent

`AttackEvent`の詳細仕様は[BGM｜AttackEvent](/spec/bgm/bgm-attack-event)を正本とします。

AttackEvent発火時の使用対象確定と`Palette Bullet`化・発射は[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)、発射後の飛行・命中処理は[パレットブレット](/spec/combat/palette-bullet)を正本とします。

本ページでは`AttackEvent`の成立条件や内部処理、`Palette Bullet`の飛行・命中処理は定義しません。

### 万能シャオンダマ

万能シャオンダマには通常シャオンダマとは異なる固有仕様があります。

万能シャオンダマの生成方法を含む固有仕様は、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とします。

通常シャオンダマがラジクジラから出現する仕様を、万能シャオンダマへ一般化しません。

## 例外・禁止事項

- 敵の周囲を基準として通常シャオンダマを配置・浮遊させる仕様は、本ページでは使用しない
- `Draw Mode`を前提としたシャオンダマの選択・利用フローは使用しない
- 選択したシャオンダマ自体が敵へ直接移動して攻撃する仕様は使用しない
- 通常シャオンダマがラジクジラから出現する仕様を、万能シャオンダマへ一般化しない
- BGM／MusicChartの生成アルゴリズムを本ページへ複製しない
- ラジクジラの追従・Spawn処理を本ページへ複製しない
- Chargeや`AttackEvent`の詳細仕様を本ページへ複製しない
- 出現後の具体的な浮遊・Lifetime・消滅仕様を本ページへ複製しない

## パラメータ

本ページでは、シャオンダマ概要として固有の調整パラメータを定義しません。

生成数・生成タイミングなどはBGM側、出現後の浮遊・Lifetime・消滅に関するパラメータは[シャオンダマ｜浮遊・挙動](/spec/shaondama-music/floating-behavior)、Chargeに関するパラメータは[Playerアクション｜チャージ](/spec/player/player-action-charge)で管理します。

## 未決事項

本ページでは新規の未決事項を定義しません。

各詳細仕様に属する未決事項は、それぞれの正本ページで管理します。

## 関連タスク

<PageRelations />
