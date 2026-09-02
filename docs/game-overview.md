---
title: ゲーム概要
description: Palette Bulletの設計書を読むための前提
---

# ゲーム概要

## ゲームのコンセプト

色と音で世界をつなぐ爽快ドローアクション。

## コア体験

Palette Bulletでは、音楽によって予告される攻撃タイミングに合わせて、
世界内に浮かぶ色付きのシャオンダマを選択し、Chargeして攻撃を組み立てます。

基本となる体験は次の繰り返しです。

```text
音楽からAttackEventが予告される
↓
ラジクジラからシャオンダマが出現する
↓
Playerが戦場を移動し、使用するシャオンダマを選ぶ
↓
シャオンダマをChargeし、AttackEvent occurrenceへ割り当ててReservedにする
↓
AttackEventの発火時に、ReservedのシャオンダマをPalette Bullet化して発射する
↓
色を持つ攻撃で敵を浄化する
```

Playerは、移動・照準・ダッシュ・パリィなどを使って敵の攻撃を避けながら、
次のAttackEventに必要なシャオンダマを選択します。

邪音玉のパリィに成功すると万能シャオンダマへ変換でき、
不足している色や音を補う選択肢として利用できます。

単に敵を攻撃するだけではなく、
「次の音楽イベントを予測し、限られた時間の中で色と音を選び、攻撃を完成させること」
が本作の中心となる体験です。

## 基本的なゲーム進行

完成版では、次の流れでゲームが進行します。

```text
ゲーム開始
↓
拠点
↓
ステージ選択・準備
↓
Battle開始
↓
音楽に合わせて敵と戦う
↓
ClearまたはGame Over
↓
Result画面
├─ Clear：拠点またはステージ選択へ戻る
└─ Game Over：現在のステージを最初からRetryする
```

Battle開始前には、Enemy、Player、MusicChart、シャオンダマなどを初期化します。

必要なEnemyとシャオンダマの準備が完了するとBattleが開始され、
音楽の予告、シャオンダマの選択、Charge、Palette Bulletによる攻撃を繰り返します。

詳細なBattle進行は[ゲーム全体](/spec/game/)を正本とします。

## Playerが行う主要な操作

Playerは主に次の操作を行います。

- 戦場内の移動
- カメラ操作
- ジャンプ
- ダッシュ
- 照準
- 攻撃対象を示すマーカー操作
- シャオンダマの選択とCharge
- Palette Bulletによる攻撃
- 邪音玉のパリィ
- `1`～`4`によるモード1～4の直接選択
- マウスホイール回転によるコンダクトの選択・変更

MusicChartは、楽曲側が「何の音を、いつ使用するか」を決めます。
モードチェンジは、`1`～`4`で選択し、戦闘中に曲全体の聞こえ方と戦い方の方向を切り替える機能です。
コンダクトは、マウスホイール回転で選択・変更し、一つのAttackEventへ演奏・発射指示を付ける機能です。

モードチェンジとコンダクトの詳細は、[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)を正本とします。

完成版では、会話やオブジェクトへのインタラクションが追加される場合がありますが、
プロトタイプではBattleに必要な操作だけを対象とします。

プロトタイプの入力デバイスはキーボード・マウスとします。
ただし、Gameplay処理は物理キーを直接参照せず、入力Actionを介して実行します。
将来ゲームパッドへ対応する場合も、Gameplay側の挙動を作り直さず、入力割当・感度・UI操作を追加できる構造とします。

操作条件やPlayerの状態遷移は[Player概要](/spec/player/)を正本とします。

## 色と音の基本ルール

通常シャオンダマは、BGMのMusicChartに含まれるNoteEventをもとに生成されます。

各システムの役割は次のように分かれます。

```text
BGM・MusicChart
何を・いつ・何個生成するかを決める
↓
ラジクジラ
通常シャオンダマを世界内へ出現させる
↓
シャオンダマ
世界内を浮遊し、Playerの選択対象になる
↓
Player・Charge
使用するシャオンダマを選択して攻撃へ割り当てる
↓
AttackEvent
使用するシャオンダマと攻撃方法を確定する
↓
Palette Bullet
敵へ命中し、RGB Damageによって浄化を進める
```

- [チャージシステム](/spec/draw-system/)
- [シャオンダマ](/spec/shaondama-music/)
- [BGM](/spec/bgm/)
- [戦闘](/spec/combat/)

## クリア・ゲームオーバー

### Clear

次の両方が成立すると、StageからClear候補が通知されます。

- Stage objectiveが完了している
- 登録されたClear対象Enemyが、すべて浄化または正式除外されている

画面上のEnemyが一時的に0体になっただけではClearになりません。
後続waveやSpawn予定が残っている場合はBattleを継続します。

### Game Over

PlayerのHPが0以下になり、PlayerがDead状態になるとGame Over候補が成立します。

最終結果がGame Overの場合、その場では復活せず、
Result画面からRetryして現在のBattleを最初から開始します。

### 同時に成立した場合

同じフレームでClearとPlayer死亡が成立した場合は、Clearを優先します。

ただし、Playerに発生したDamageやDead状態そのものは巻き戻さず、
Game Over表示とRetryへの接続だけを行いません。

## 各システムの関係

| システム | 主な役割 |
|---|---|
| Game | Battleの開始・終了と最終結果を管理する |
| Stage | Enemy、wave、objective、Clear条件を管理する |
| Player | 移動・Action・Charge・攻撃・被弾・死亡を管理する |
| BGM／MusicChart | 音楽時間とAttackEvent、シャオンダマ生成内容を管理する |
| ラジクジラ | 通常シャオンダマを世界内へ出現させる |
| シャオンダマ | 世界内に存在し、Playerの選択対象になる |
| Charge／Allocation | 選択されたシャオンダマを攻撃へ割り当てる |
| Combat | 攻撃・Hit・Damageの受付を管理する |
| Enemy | Playerを攻撃し、RGB Damageによって浄化される |
| UI | 確定したゲーム状態を表示し、結果を独自に判定しない |

各システムは、自分が所有していない状態や結果を独自に再判定しません。

## プロトタイプで実装する範囲

プロトタイプでは拠点やステージ選択を実装せず、
1つのBattleを開始から終了までプレイできる最小構成で、Palette Bullet固有のコア体験を確認します。

### 実装する範囲

- Battleを直接開始し、ClearまたはGame Overまでプレイできる
- Playerの基本移動・カメラ操作・ジャンプ・ダッシュ・照準
- キーボード・マウスによるBattle操作
- マーカーによる攻撃対象の指定
- 通常シャオンダマの生成・浮遊・選択
- シャオンダマのChargeと攻撃への割り当て
- AttackEventに合わせたPalette Bulletの発射
- Palette BulletによるEnemyのRGB Damageと浄化
- 邪音玉の発射とPlayerのパリィ
- パリィによる万能シャオンダマへの変換
- Clear・Game Over・Result・Retry
- Gameplayに必要な最小限のUI
- 1つ以上の検証用BGM・MusicChart
- 1種類以上の検証用Enemy

### プロトタイプでは対象外とする範囲

- 拠点
- ステージ選択
- 複数ステージによる本編進行
- ストーリー・会話・拠点コンテンツ
- 複数種類のEnemyやBoss
- ゲームパッド対応
- 入力割当の変更機能
- 最終品質のAnimation・VFX・SE
- 詳細な設定画面
- セーブ・ロード
- 製品版向けのバランス調整
- 製品版向けの最終UI・アクセシビリティ対応

具体的な数値、演出時間、色、表示方法などは仮値を使用し、
コア体験を検証した後に調整します。
