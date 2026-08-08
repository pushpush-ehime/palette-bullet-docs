---
title: "08. BGM_Rondom選択"
pageType: task
taskId: PB-TASK-0017
category: "BGM"
team: プログラム
---

# PB-TASK-0017｜08. BGM_Rondom選択

## 目的

MusicChartに設定されたRandom Sectionから、攻撃に使用するAttackEventをランダムに選択できるようにする。

## 実装

* MusicChartのRandom Sectionsを読み取る
* Random Sectionの開始位置・終了位置を取得する
* 区間内に登録されたAttackEvent候補を取得する
* 設定された数だけAttackEventをランダムに選択する
* 選択したAttackEventを通常のAttackEventと同じ予告・発火処理へ渡す
* 同じ候補を重複選択するかどうか設定できるようにする
* 予告時間を確保できないAttackEventは抽選対象から除外する
* 固定AttackEventと競合する場合は、固定AttackEventを優先する

## 動作確認

例えばRandom Sectionに、

* C / E / G
* A / C / E
* G / B / D

の3候補を登録し、1つを抽選する。

戦闘開始時またはRandom Sectionへ入る前に1つ選択され、選ばれたAttackEventだけが予告・発火されることを確認する。

## 今回実装しないもの

* AttackEventの実際の攻撃処理
* プレイヤーの所持音判定
* 攻撃予告UIの本実装
* シャオンダマ生成
* コードによるバフ処理

## 完了条件

* Random Sectionを取得できる
* 登録されたAttackEvent候補からランダム抽選できる
* 指定数のAttackEventを選択できる
* 選択したAttackEventを予告・発火処理へ渡せる
* 固定AttackEventと競合しない
* 同じ条件でも実行ごとに異なる候補を選択できる

