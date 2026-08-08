---
title: "BGM RandomSection仕様"
pageType: spec
category: "BGM"
status: 仮仕様
---

# BGM Random Section仕様
## Random Sectionとは
曲中に用意された複数の`AttackEvent`候補から、実際に使用する攻撃をランダムに選ぶ区間。
## 目的
毎回同じ場所で同じ攻撃が発生するのを防ぎ、戦闘ごとに攻撃内容を変化させるために使用する。

```text
Random Section

START
│
├─ Candidate A：[C / E / G]
├─ Candidate B：[A / C / E]
├─ Candidate C：[G / B / D]
│
END

↓ 抽選

今回使用する攻撃
Candidate B
```

## Random Sectionが持つ情報

```text
Random Section
├─ 開始位置
├─ 終了位置
├─ AttackEvent候補
└─ 選択数
```

### 開始位置・終了位置

Random Sectionとして扱う曲中の範囲を指定するために必要。

位置は他の音楽イベントと同じく、小節・拍・Tickで記録する。

例：

```text
開始：16小節目 1拍目
終了：24小節目 1拍目
```

### AttackEvent候補

Random Section内で、ランダムに使用してよい攻撃を指定するために必要。

各候補は通常の`AttackEvent`と同じ情報を持つ。

```text
Candidate A
├─ 発生位置
├─ 必要音：C / E / G
├─ Type：Chord
└─ 予告時間：8拍前
```

### 選択数

候補の中から、1回のBGM再生で何個のAttackEventを使用するか決めるために必要。

例：

```text
候補数：5
選択数：2

↓

5個の候補から2個を選択
```

## 抽選タイミング

Random Sectionの抽選は、**BGM開始時とBGMがループするたび**に行う。

BGM開始時に、すべてのRandom Sectionについて今回使用するAttackEventを決定する。
```text
BGM開始
↓
Random Sectionを確認
↓
AttackEvent候補から抽選
↓
今回使用するAttackEventを確定
↓
BGM再生
```

BGMが曲の終端まで到達してループする場合は、**前回の抽選結果を破棄し**、すべてのRandom Sectionを再抽選する。
```text
BGM 1周目
↓
Random Sectionを抽選
↓
再生
↓
曲の終端
↓
ループ
↓
Random Sectionを再抽選
↓
BGM 2周目
```

これにより、同じBGMをループしている場合でも、周回ごとに異なるAttackEventが選ばれる可能性がある。

抽選はAttackEventの予告時間より前に完了させ、予告対象となるAttackEventが事前に確定している状態にする。

## 選ばれたAttackEvent

抽選されたAttackEventは、通常のAttackEventと同じように処理する。

```text
抽選
↓
Candidate Bを選択
↓
予告時間
↓
必要音を通知
↓
発生位置
↓
AttackEvent発火
```

Random Section専用の攻撃処理は作らない。

## 選ばれなかったAttackEvent

抽選されなかったAttackEventは、そのBGM再生中は使用しない。

```text
Candidate A ×
Candidate B ○
Candidate C ×
```

Candidate Bだけが予告・発火される。

## 同じ候補の重複選択

1つのRandom Section内では、同じAttackEventを2回選択しない。

例：

```text
候補

A
B
C

選択数：2

○ A + B
○ A + C
○ B + C

× A + A
```

同じ攻撃を複数回使用したい場合は、別のAttackEvent候補として登録する。

## 固定AttackEventとの関係

固定AttackEventは、Random Sectionの抽選結果に関係なく必ず使用する。

```text
固定AttackEvent
= 必ず発生

Random候補
= 抽選された場合のみ発生
```

Random候補と固定AttackEventが同じ位置に設定されている場合は、固定AttackEventを優先し、そのRandom候補は使用しない。

## 候補の条件

Random Sectionへ登録するAttackEventは、発生位置がRandom Sectionの開始位置から終了位置までの範囲内にある必要がある。

```text
Random START

    Candidate A ○
    Candidate B ○

Random END

Candidate C ×
```

範囲外のAttackEventは候補として使用しない。

## 例

```text
Random Section
16小節目 ～ 24小節目

候補

18小節目
C / E / G

20小節目
A / C / E

22小節目
G / B / D

選択数
1
```

BGM開始時に抽選する。

```text
今回
↓
20小節目
A / C / E
```

ゲーム中は、

```text
予告時間
↓
A C E を表示

20小節目
↓
AttackEvent発火
```

となる。

