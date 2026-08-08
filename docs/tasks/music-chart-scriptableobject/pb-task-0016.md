---
title: "07. BGM_AttackEvent予告・発火"
pageType: task
taskId: PB-TASK-0016
category: "BGM"
team: プログラム
---

# PB-TASK-0016｜07. BGM_AttackEvent予告・発火

## 目的

MusicChartのAttackEventを読み取り、指定されたタイミングで予告とイベント発火を行えるようにする。

## 実装
* MusicClockの現在位置から、次に発生するAttackEventを取得する
* AttackEventの予告時間になったら予告イベントを発生させる
* 予告時に以下の情報を取得できるようにする

  * 必要音
  * Chord / Arpeggio
  * Harmony（Root / Quality）
  * 発生までの残り時間
* AttackEventの発生位置になったら発火イベントを発生させる
* 同じAttackEventを複数回発火しないようにする
* 複数のAttackEventを順番に処理できるようにする
* ChordとArpeggioの両方を扱えるようにする

## 動作確認

例えばMusicChartに以下を設定する。

AttackEvent

* 発生位置：8小節目1拍目
* 予告：8拍前
* Type：Chord
* 必要音：C / E / G
* Harmony：C Major

実行時に、

予告タイミング：
`Next Attack : C E G`

発生タイミング：
`Attack Event : C E G`

をConsoleへ出力し、BGMとタイミングが一致することを確認する。

## 今回実装しないもの

* 実際の攻撃処理
* プレイヤーの所持音判定
* 攻撃予告UIの本実装
* バフ・コード効果
* Random SectionからのAttackEvent選択
* シャオンダマ生成

## 完了条件

* 次のAttackEventを取得できる
* 指定された予告タイミングで予告イベントが1回発生する
* 指定された演奏位置でAttackEventが1回発火する
* 必要音・Type・Harmonyを取得できる
* 複数のAttackEventを正しい順番で処理できる
* BGMとAttackEventの発火タイミングが同期している

