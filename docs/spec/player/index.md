---
title: Player概要
description: Palette BulletにおけるPlayerの役割と仕様範囲
pageType: spec
category: Player
categoryOrder: 20
order: 0
status: 仮仕様
collapsed: false
---

# Player概要

## 目的

このページでは、Playerの概要を記載します。

詳しい仕様は各ページに分けて記載しています。タスクの担当者は、担当する機能の詳細ページを確認してください。

## Playerの役割

- Playerの目的は、ストーリーの決定後に記載します。（未確定）

Playerは、世界内のシャオンダマを選択してChargeし、Charge成功時にAttackEvent occurrenceへ割り当てて`Reserved`にできます。対応するAttackEventの発火時に、その`Reserved`のシャオンダマがPalette Bullet化して敵へ発射されます。

## Player体験の基本方針

### 雑魚戦

敵の攻撃を避けながら自分の攻撃を作り、敵を倒す臨場感を体験します。

### ボス戦

戦闘曲に合わせて、攻撃と防御を切り替えます。

* 攻撃フェーズ：作成した攻撃をボスへ叩き込む
* 防御フェーズ：リズムに合わせて敵の連続攻撃をパリィする

## 基本的なゲームプレイの流れ

### ゲームサイクル

1. 拠点で準備する
2. ステージを選択する
3. 雑魚敵と戦う
4. ボスと戦う
5. リザルトを確認する

### バトルサイクル

1. 戦闘BGMが流れます。
2. BGM / MusicChart側で決定された通常シャオンダマを、ラジクジラが生成し、世界内へ出現させます。
3. AttackEventが発生し、チャージできる状態になります。
4. Playerはシャオンダマを選択してChargeし、Charge成功時にAttackEvent occurrenceのスロットへ割り当てて`Reserved`にします。
5. AttackEventの発火時に、使用対象となる`Reserved`のシャオンダマがPalette Bullet化して発射されます。
6. AttackEvent発火時に、有効なマーカーがあればマーカーの現在座標を使用し、なければPlayerに最も近い有効なEnemyを狙います。どちらも存在しない場合はレティクル方向のRay接触地点を使用し、Rayが何にも接触しない場合は同方向の十分遠い地点を使用します。
7. 攻撃を繰り返し、敵を倒します。

通常シャオンダマについて、「何を・いつ・何個生成するか」はBGM / MusicChart側が管理します。ラジクジラは、その結果を受けてシャオンダマを世界内へ出現させます。出現後のシャオンダマの挙動はシャオンダマ側が管理します。Playerは世界内のシャオンダマを選択してChargeし、成功時にAttackEvent occurrenceへ割り当てて`Reserved`にします。Palette Bullet化は、AttackEventの発火時に行います。

詳細は以下を参照してください。

- ラジクジラそのもの：[ラジクジラ概要](../radiowhale/index.md)
- ラジクジラからのシャオンダマ出現：[ラジクジラ｜シャオンダマ生成](../radiowhale/shaondama-spawning.md)
- シャオンダマの生成対象・タイミング・個数：[BGM→シャオンダマ生成仕様](../bgm/bgm-make-syaonndama.md)
- MusicChart / NoteEvent：[MusicChart](../bgm/bgm-music-chart.md)
- AttackEvent：[AttackEvent](../bgm/bgm-attack-event.md)
- PlayerによるCharge：[Playerアクション｜チャージ](./player-action-charge.md)
- AttackEvent occurrenceへの割り当てと`Reserved`：[チャージ先・スロット割り当て仕様](../draw-system/charge-allocation.md)
- AttackEvent発火時のPalette Bullet化・発射：[AttackEvent成立判定](../bgm/bgm-attack-judgement.md)
- 生成後のシャオンダマ：[シャオンダマ概要](../shaondama-music/index.md)
- ラジクジラのGameplay上の存在・表示：[ラジクジラ｜Gameplayライフサイクル](../radiowhale/gameplay-lifecycle.md)
- Markerの有効条件・置換・消滅：[マーカー](../combat/marker.md)
- Palette BulletのTarget座標決定：[パレットブレット](../combat/palette-bullet.md)

## Playerが行える主要行動

Playerが行える操作は、拠点と戦闘ステージで異なります。

### 拠点

- 移動
- ジャンプ
- キャラクターとの会話
- ステージの選択
- 戦闘前の準備

### 戦闘ステージ

- 移動
- ジャンプ
- ダッシュ・回避
- シャオンダマの選択とCharge
- Charge成功時のAttackEvent occurrenceへの割り当てと`Reserved`への移行
- AttackEvent発火時のPalette Bullet化・発射
- マーカー発射
- パリィ
- スキル（未確定）
