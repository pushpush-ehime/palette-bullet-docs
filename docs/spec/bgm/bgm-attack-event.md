---
title: "BGM 攻撃イベント仕様"
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
  - /tasks/music-chart-scriptableobject/pb-task-0016
  - /tasks/music-chart-scriptableobject/pb-task-0017
---

# BGM 攻撃イベント仕様

## 目的

BGMのコード・アルペジオに合わせて攻撃イベントを発生させるためのルールを定義する。

AttackEventでは、

```text
この場所で
↓
この音を使って
↓
攻撃してほしい
```

という情報をBGMに対して設定する。

## AttackEventとは

AttackEventは、BGMの特定の演奏位置で発生する攻撃イベントである。

例えば、BGMの8小節目で、

```text
C
E
G
```

が演奏される場合、

```text
8小節目
C / E / G

↓
AttackEventとして設定
```

することで、その音楽に合わせて攻撃イベントを発生させることができる。

AttackEventはMIDIには記録せず、Unityの`MusicChart`へ設定する。

## 作曲者とプログラマーの役割

AttackEventは、作曲者とプログラマーが相談して設定する。

### 作曲者

作曲者は、曲を作る中で、

```text
このコードで攻撃してほしい

このアルペジオを攻撃に使いたい

この区間のどこかで攻撃してほしい
```

といった音楽的な意図を決める。

### プログラマー

プログラマーは、作曲者の意図をもとにUnityの`MusicChart`へAttackEventを設定する。

```text
作曲者
↓
攻撃に使用したい場所・音を指定
↓
プログラマー
↓
MusicChartへAttackEventを設定
↓
ゲームで使用
```

## 固定AttackEvent

特定のコード・アルペジオを必ず攻撃に使用したい場合は、固定AttackEventとして設定する。

### 例

```text
8小節目

C → E → G
```

↓

```text
固定AttackEvent

発生位置：8小節目
必要音：C / E / G
```

固定AttackEventは、BGMがその位置まで進んだ場合、必ずAttackEventとして使用する。

## AttackEventが持つ情報

AttackEventには、最低限以下の情報を設定する。

```text
AttackEvent
├─ 発生位置
├─ 必要音
├─ Type
│  ├─ Chord
│  └─ Arpeggio
├─ アルペジオ順序
├─ 予告時間
└─ Harmony
   ├─ Root
   └─ Quality
```

## 発生位置

AttackEventがBGMのどこで発生するかを指定する。

位置は、

```text
小節
拍
Tick
```

で記録する。

例：

```text
8小節目 1拍目
```

必要に応じてTickまで指定する。

ゲーム実行時は、MusicChartのTempoMapを使用して実際の再生時間へ変換する。

## 必要音

AttackEventを成立させるために必要となる音を設定する。

例：

```text
C Major

必要音
C
E
G
```

または、

```text
Power Chord

必要音
C
G
```

必要音は、AttackEventの予告時にゲーム側へ渡し、プレイヤーへ必要な音を知らせるために使用する。

## Type

AttackEventには、音の使われ方を設定する。

```text
Chord
Arpeggio
```

### Chord

複数の音が同時に演奏される攻撃。

```text
C + E + G
```

### Arpeggio

複数の音が順番に演奏される攻撃。

```text
C
↓
E
↓
G
```

Arpeggioの場合は、必要な音だけでなく演奏順序も保持する。

## Harmony

AttackEventには、必要に応じてHarmony情報を設定する。

```text
Harmony
├─ Root
└─ Quality
```

例：

```text
Root    : C
Quality : Major
```

Harmony情報は、コードの種類を判定したり、将来コードごとの効果を設定したりするために使用する。

## 予告

AttackEventが発生する前に、プレイヤーへ必要な音を予告する。

例：

```text
AttackEvent

発生位置
8小節目 1拍目

必要音
C / E / G

予告
8拍前
```

↓

```text
予告タイミング
↓
C / E / G が必要であることを通知

↓

8小節目 1拍目
↓
AttackEvent発火
```

予告時には最低限、

```text
必要音
Chord / Arpeggio
Harmony
AttackEvent発生までの残り時間
```

をゲーム側で取得できるようにする。

実際のUIデザイン・表示方法はUI側の仕様で決定する。

## AttackEventの発火

BGMがAttackEventの発生位置まで到達したら、AttackEventを発火する。

```text
BGM再生
↓
AttackEventの予告
↓
発生位置まで進む
↓
AttackEvent発火
```

AttackEventの発火は、

**「攻撃判定を行う時間になった」**

ことをゲーム側へ通知する処理である。

AttackEventが発火しただけでは、必ず攻撃が成功するわけではない。

## AttackEvent成立判定との関係

AttackEventが発火した後、プレイヤーが必要な音を用意できているかを確認する。

```text
AttackEvent発火
↓
必要音を確認
↓
Playerの待機構成を確認
↓
AttackEvent成立判定
↓
成立
または
不成立
```

例えば、

```text
AttackEvent

必要音
C / E / G
```

に対して、Playerが必要な構成を持っている場合は攻撃を成立させる。

必要音の一致条件・同音重複・オクターブ・Chord / Arpeggioなどの詳細な成立条件は、[AttackEvent成立判定仕様](/spec/bgm/bgm-attack-judgement)で定義する。

## Random Sectionとの関係

特定のAttackEventを必ず使用するのではなく、

```text
この区間の候補から
どれかを攻撃に使いたい
```

場合は`Random Section`を使用する。

例：

```text
Random Section

START
│
├─ Candidate A：C / E / G
├─ Candidate B：A / C / E
├─ Candidate C：G / B / D
│
END

↓
抽選

Candidate Bを使用
```

Random Sectionで選択されたAttackEventも、固定AttackEventと同じ処理へ渡す。

```text
Random Section
↓
AttackEventを選択
↓
予告
↓
発火
↓
AttackEvent成立判定
```

Random Section専用の攻撃処理は作らない。

抽選方法や候補の条件については、BGM Random Section仕様で定義する。

## 基本ルール

- AttackEventはBGMのコード・アルペジオに合わせて設定する。
- 作曲者が攻撃に使用したい音楽的な場所・音を決める。
- プログラマーがその内容をUnityの`MusicChart`へ設定する。
- AttackEventはMIDIには記録しない。
- 固定AttackEventは指定された場所で必ず使用する。
- AttackEventには発生位置・必要音・Type・予告時間などを設定する。
- AttackEvent発生前に必要音をプレイヤーへ予告する。
- BGMが発生位置へ到達したらAttackEventを発火する。
- AttackEventの発火と実際の攻撃成立判定は別処理として扱う。
- Random Sectionで選ばれたAttackEventも固定AttackEventと同じ予告・発火処理を使用する。
