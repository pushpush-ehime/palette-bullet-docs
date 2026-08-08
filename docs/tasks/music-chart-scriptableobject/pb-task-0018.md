---
title: "09. BGMシャオンダマ生成"
pageType: task
taskId: PB-TASK-0018
category: "BGM"
team: プログラム
relatedSpecs:
  - /spec/bgm/bgm-make-syaonndama
---

# PB-TASK-0018｜09. BGMシャオンダマ生成

## 目的

MusicChartのNoteEventを使用して、BGM中の音程に対応したシャオンダマを生成できるようにする。

## 実装

* MusicChartのNoteEventsを読み取る
* Shaondama Settingsで指定されたTrackのみ生成対象にする
* NoteEventの発生位置に合わせてシャオンダマを生成する
* MIDI Noteから音程を取得する
* C / C# / D ... の音程情報をシャオンダマへ設定する
* 同じ音程でもオクターブ情報を保持できるようにする
* Track情報をシャオンダマへ渡せるようにする
* Velocityなど、後から利用できるMIDI情報も保持する
* 同じタイミングに複数Noteがある場合は、それぞれ生成する
* BGMと生成タイミングが同期するようにする

## 動作確認

MusicChartに以下のNoteEventを用意する。

* C4
* E4
* G4

指定されたタイミングで、

* Cのシャオンダマ
* Eのシャオンダマ
* Gのシャオンダマ

が生成されることを確認する。

## 今回実装しないもの

* シャオンダマの移動処理
* シャオンダマを撃ち抜く処理
* 弾丸化
* 攻撃判定
* 色やVFXの最終表現
* AttackEventとの所持音判定

## 完了条件

* NoteEventからシャオンダマを生成できる
* 指定Trackだけを生成対象にできる
* 音程が正しく設定される
* オクターブ・Track・Velocityを保持できる
* 複数Noteを同時に生成できる
* BGMと生成タイミングが同期している

