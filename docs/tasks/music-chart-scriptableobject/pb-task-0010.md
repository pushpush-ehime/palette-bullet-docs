---
title: "01. MusicChart ScriptableObject作成"
pageType: task
taskId: PB-TASK-0010
category: "BGM"
team: プログラム
---

# 01. MusicChart ScriptableObject作成

## 目的

BGMごとの音楽情報・攻撃イベント情報を保存する`MusicChart`を作成する。

ゲーム実行中はMIDIを直接解析せず、生成された`MusicChart.asset`を使用する。

## 実装内容

`MusicChart`をScriptableObjectとして作成する。

MusicChartには以下の情報を保存できるようにする。

```
MusicChart
├─ BGM
│  └─ AudioClip
│
├─ Music Data
│  ├─ TempoMap
│  └─ NoteEvents
│     ├─ 音程
│     ├─ Track
│     └─ 演奏位置
│
├─ Shaondama Settings
│  └─ 使用するTrack
│
├─ Attack Events
│  ├─ 発生位置
│  ├─ 必要音
│  ├─ Type（Chord / Arpeggio）
│  ├─ アルペジオ順序
│  ├─ 予告時間
│  └─ Harmony
│     ├─ Root（例：C）
│     └─ Quality（例：Major）
│
├─ Random Sections
│  ├─ 開始位置
│  ├─ 終了位置
│  └─ AttackEvent候補
│
└─ Sync Settings
   └─ 同期補正値
```

## 今回実装する範囲

- `MusicChart` ScriptableObjectを作成する
- Projectウィンドウから`MusicChart.asset`を新規作成できるようにする
- MusicChartが必要なデータを保持できるクラス構造を作る
- Inspectorから各項目を確認・編集できるようにする

## 今回実装しないもの

- MIDI読み込み
- DryWetMIDI導入
- MIDIからNoteEventの自動生成
- BGM再生
- DSP同期
- AttackEventの実行
- ランダム攻撃処理
- 専用MusicChart Editor

これらは別タスクで実装する。

## 完了条件

- Unity上で`MusicChart.asset`を作成できる
- BGMのAudioClipを設定できる
- NoteEventを登録できる
- シャオンダマ対象Trackを登録できる
- AttackEventを登録できる
- Chord / Arpeggioを設定できる
- Root / Qualityを設定できる
- Random Sectionを登録できる
- 同期補正値を設定できる
- 保存後にUnityを再起動しても設定内容が保持される
