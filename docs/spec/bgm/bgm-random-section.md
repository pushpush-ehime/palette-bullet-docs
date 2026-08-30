---
title: "BGM Random Section仕様"
description: Palette BulletにおけるAttackEvent候補群から今回使用するEventを選択するルール
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
---

# BGM Random Section仕様

## 目的

本ページでは、

> **AttackEvent候補群から、そのBGM周回で実際に使用するAttackEventを選択するルール**

を定義します。

Random Sectionでは、曲中に用意された複数のAttackEvent候補から一部を抽選し、今回のBGM再生で使用するAttackEventを決定します。

本ページでは主に、

- Random Sectionの範囲
- AttackEvent候補
- 候補として提案するための音楽的条件
- Gameplay上の採用との関係
- 選択数
- 抽選タイミング
- BGM Loop時の再抽選
- 固定AttackEventとの競合
- サウンド班・プランナー・プログラマーの責務

を扱います。

AttackEvent自体が持つ、

- 発生位置
- 必要音
- Chord / Arpeggio
- Arpeggioの順序・音楽的タイミング
- Harmony
- 予告

などの詳細は、本ページでは再定義しません。

[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

---

## Random Sectionとは

`Random Section`は、曲中の一定範囲に複数のAttackEvent候補を用意し、その中から今回使用するAttackEventをランダムに選択する仕組みです。

```text
Random Section

START
│
├─ Candidate A
├─ Candidate B
├─ Candidate C
│
END

↓ 抽選

今回使用するAttackEvent
Candidate B
```

目的は、同じBGMを使用していても、毎回まったく同じAttackEventだけが使用される状態を避けることです。

Random Sectionによって変わるのは**今回使用するAttackEvent**です。

完成済みBGMそのものをRandom Sectionによって差し替えたり、音楽構成を変更したりはしません。

---

## Random Sectionが持つ情報

Random Sectionは、基本的に以下の情報を持ちます。

```text
Random Section
├─ Stable ID
├─ Display Code
├─ 開始位置
├─ 終了位置
├─ AttackEvent候補
└─ 選択数
```

AttackEvent候補そのもののデータ構造については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

MusicChart上での保持形式・入力責務については、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

## Definition Identifier

Random Section自身は、MusicChartへ保存する内部Stable IDと`RSEC-xxx`形式のDisplay Codeを持ちます。

各Random Candidateは通常AttackEventと同じデータ構造を使用するため、Candidate専用の別IDではなく、AttackEvent共通のStable IDと`ATK-xxx`形式のDisplay Codeを使用します。

Identifierは並べ替え、Section範囲変更、CandidateのSection間移動、MIDI再Importでは維持します。Section／Candidateを複製した場合は新しいIdentifierを発行し、削除済みIdentifierは再利用しません。

Identifierは制作・Validation・ログ・Runtime occurrence追跡用であり、次のGameplay規則には使用しません。

- Random抽選対象や選択確率
- Candidateの処理順
- 固定AttackEvent優先
- BGM Loop時の再抽選結果

保存・採番・Validationの詳細は[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

## 開始・終了位置

Random Sectionには、候補をまとめて扱う曲中の範囲として、

- 開始位置
- 終了位置

を設定します。

位置は他の音楽イベントと同様に、

```text
小節
拍
必要に応じてTick
```

で指定します。

例：

```text
開始
16小節目 1拍目

終了
24小節目 1拍目
```

Random Sectionへ登録するAttackEvent候補は、その発生位置がRandom Sectionの範囲内に存在する必要があります。

```text
Random START

    Candidate A ○
    Candidate B ○

Random END

Candidate C ×
```

範囲外にあるAttackEventは、そのRandom Sectionの候補として扱いません。

---

## AttackEvent候補

Random Sectionには、抽選対象となる複数のAttackEvent候補を登録します。

```text
Random Section
├─ Candidate A
├─ Candidate B
└─ Candidate C
```

各Candidateは、通常のAttackEventと同じ仕様に従います。

Random Section専用のAttackEvent形式は作りません。

```text
AttackEvent
↓
固定AttackEventとして使用

または

↓
Random SectionのCandidateとして使用
```

AttackEventとして必要な音楽情報については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

---

## 候補の音楽的条件

サウンド班は、楽曲を確認し、

> **音楽的にAttackEventとして使用可能な場所**

をRandom Section候補として提案します。

候補とするAttackEventは、少なくとも以下を満たす必要があります。

- その発生位置でAttackEventとして音楽的に成立する
- 必要音を楽曲上の内容から設計できる
- Chord / Arpeggioなどの音楽表現を定義できる
- Arpeggioの場合は順序・音楽的タイミングを定義できる
- 必要に応じてHarmonyを定義できる
- Random Sectionの開始位置から終了位置までの範囲内に存在する

具体的なAttackEventの設計条件は、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

### Random Sectionとしての提案

サウンド班は、

```text
この区間には
AttackEventとして利用可能な場所が複数ある
↓
その中から毎周すべてを使用する必要はない
↓
Random Section候補として提案
```

という形で、区間と候補を提示できます。

ただし、

> **音楽的に候補として利用できること**

と、

> **Gameplayとして実際にRandom Sectionへ採用すること**

は別です。

最終的なGameplay採用はプランナーが判断します。

---

## Gameplay成立条件との関係

Random Sectionは、

> **どのAttackEventを今回使用するか**

を決める仕組みです。

AttackEventの成功・不成立を判断する仕組みではありません。

```text
Random Section
↓
今回使用するAttackEventを選択
↓
AttackEvent予告
↓
AttackEvent発火
↓
Gameplay側へ通知
↓
Slot照合・成立判定
```

Random Section側の責務は、使用するAttackEventを選択するところまでです。

### 候補に選ばれた場合

Candidateが抽選された場合は、

> **今回のBGM周回で、そのAttackEventを予告・発火対象として使用する**

ことを意味します。

```text
Candidate B
↓
抽選される
↓
今回使用するAttackEventになる
```

これは、

```text
攻撃成功
```

を意味しません。

### 発火後

AttackEvent発火後の、

- PlayerがどのSlotを埋めているか
- 必要音をどこまで用意できているか
- AttackEventが成立するか
- どのパレットブレットを使用するか
- 成功 / 不成立

はチャージシステム側の仕様を正とします。

Random Sectionはこれらを判定しません。

---

## 選択数

`選択数`は、Random Sectionに登録された候補から、1回のBGM周回で何個のAttackEventを使用するかを示します。

例：

```text
候補数
5

選択数
2

↓

5個の候補から
今回使用する2個を選択
```

選択数はGameplay上の値であるため、**プランナーが決定します。**

サウンド班は音楽的観点から、

- 候補数
- 区間の長さ
- AttackEvent同士の音楽的な間隔

などについて提案できますが、最終的な選択数を独自に確定しません。

---

## 同じ候補の重複選択

1つのRandom Section内では、同じAttackEvent候補を同一抽選で複数回選択しません。

例：

```text
候補
A
B
C

選択数
2
```

有効：

```text
A + B
A + C
B + C
```

無効：

```text
A + A
B + B
```

同じ内容のAttackEventを別の候補として複数登録する必要がある場合は、それぞれを別のAttackEventとして扱います。

---

## 抽選タイミング

Random Sectionの抽選は、

1. BGM開始時
2. BGMがLoopするたび

に行います。

### BGM開始時

BGM開始時に、その周回で使用するAttackEventを決定します。

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

その周回中は、確定した抽選結果を使用します。

---

## 予告との関係

Random Sectionの抽選は、その候補に設定されたAttackEventの予告が必要になる前までに完了している必要があります。

```text
抽選
↓
今回使用するAttackEvent確定
↓
予告
↓
発生位置
↓
AttackEvent発火
```

予告開始後に、

```text
表示していたAttackEventが
別のCandidateへ変更される
```

ことはありません。

AttackEventの予告仕様については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

---

## 選ばれたAttackEvent

抽選されたAttackEventは、その周回では通常のAttackEventとして扱います。

```text
Random Section
↓
Candidate Bを選択
↓
通常のAttackEventとして使用
↓
予告
↓
発生位置
↓
発火
```

Random Section専用の予告・発火処理は作りません。

固定AttackEventとRandom Sectionから選択されたAttackEventは、どちらも最終的には同じAttackEvent仕様に従います。

---

## 選ばれなかったAttackEvent

抽選されなかったCandidateは、そのBGM周回では使用しません。

```text
Candidate A ×
Candidate B ○
Candidate C ×
```

この場合、その周回ではCandidate BだけがRandom SectionからのAttackEventとして使用されます。

選ばれなかったCandidateは、

- 予告しない
- 発火しない

ものとして扱います。

---

## BGM Loop時

BGMが終端まで到達してLoopする場合は、前の周回のRandom Section抽選結果を持ち越しません。

```text
BGM 1周目
↓
Random Section抽選
↓
再生
↓
曲の終端
↓
Loop
↓
前回の抽選結果を破棄
↓
Random Sectionを再抽選
↓
BGM 2周目
```

すべてのRandom Sectionについて、新しい周回用の抽選を行います。

そのため、同じBGMをLoopしていても、周回ごとに異なるAttackEventが使用される可能性があります。

```text
1周目
Candidate A

↓

Loop

↓

2周目
Candidate C
```

BGMとMusicChartのLoop時の時間軸については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## 固定AttackEventとの競合

固定AttackEventは、Random Sectionの抽選結果に関係なく使用します。

```text
固定AttackEvent
= Random抽選に関係なく使用

Random Candidate
= 抽選された場合のみ使用
```

Random SectionのCandidateと固定AttackEventが同じ発生位置に設定されている場合は、**固定AttackEventを優先します。**

```text
同じ位置

固定AttackEvent      ○
Random Candidate     ×
```

この場合、そのRandom Candidateは使用しません。

固定AttackEventそのものの仕様については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

---

## サウンド班・プランナーの責務

Random Sectionでは、

> **音楽的に候補として成立するか**

と、

> **Gameplayとして実際に採用するか**

を分けて考えます。

### サウンド班

サウンド班は、音楽的観点から、

- Random Sectionとして提案可能な区間
- その区間内のAttackEvent候補
- 各CandidateがAttackEventとして音楽的に成立するか

を判断・提示します。

```text
サウンド班
↓
音楽的に使用可能な区間・候補を提示
```

サウンド班は、

- 選択数
- AttackEvent成立条件
- Slot条件
- PlayerのCharge状態

などのGameplayルールを独自に決定しません。

### プランナー

プランナーは、サウンド班から提示された候補について、

- Random SectionとしてGameplayへ採用するか
- どのAttackEvent候補を実際に登録するか
- 選択数
- 他のGameplay Eventとの整合性

を確認・決定します。

```text
サウンド班
↓
音楽的候補を提示
↓
プランナー
↓
Gameplayとして採用する内容を決定
```

候補が音楽的に成立していても、Gameplay上の理由によって採用しないことがあります。

---

## プログラマーの責務

プログラマーは、サウンド班・プランナーによって確定した内容をMusicChartへ設定します。

主に、

- Stable ID／Display Code
- 開始位置
- 終了位置
- AttackEvent候補
- 選択数

をMusicChartへ設定・保存できる状態にします。

Identifierの欠落・重複をValidationで検出し、暗黙再採番で成功扱いにしません。

また、

- BGM開始時の抽選
- Loop時の再抽選
- 抽選結果に従った予告・発火対象の決定

をゲーム上で実行できる状態にします。

プログラマーは、

- Candidateの音楽的内容
- CandidateをGameplayへ採用するか
- 選択数

を独自判断で変更しません。

MusicChart上の入力責務については、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

## 例

以下のRandom Sectionを設定したとします。

```text
Random Section

16小節目 ～ 24小節目

Candidate A
18小節目

Candidate B
20小節目

Candidate C
22小節目

選択数
1
```

各Candidateの必要音・Type・Harmonyなどは、それぞれのAttackEventに設定します。

BGM開始時に抽選します。

```text
抽選
↓
Candidate B
```

今回の周回では、

```text
Candidate A ×
Candidate B ○
Candidate C ×
```

となります。

その後、

```text
Candidate B
↓
予告
↓
20小節目
↓
AttackEvent発火
↓
Gameplay側へ通知
```

まで進みます。

発火後に攻撃が成立するかどうかは、Random Sectionでは判定しません。

---

## 責務境界

本ページは、

> **AttackEvent候補群から、そのBGM周回で今回使用するEventを選択するルール**

だけを正とします。

| 内容 | 正とする仕様 |
| --- | --- |
| Random Sectionの開始・終了位置 | **本ページ** |
| AttackEvent候補の登録条件 | **本ページ** |
| 選択数 | **本ページ** |
| 抽選タイミング | **本ページ** |
| Loop時の再抽選 | **本ページ** |
| 同一候補の重複選択 | **本ページ** |
| 固定AttackEventとの競合 | **本ページ** |
| AttackEvent自体の音楽的データ | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| MusicChart上のデータ構造・入力責務 | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| AttackEvent候補の制作・受け渡し工程 | [サウンド班制作フロー](/spec/bgm/sound-production-workflow) |
| AttackEvent発火後のSlot照合・成立判定 | チャージシステム側の仕様 |
| BGM Loop時の音楽時間軸 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |

---

## 基本ルール

- Random Sectionは複数のAttackEvent候補から今回使用するEventを選択する
- Random Sectionは専用Stable IDと`RSEC-xxx` Display Codeを持つ
- Random Candidateは通常AttackEventと同じStable IDと`ATK-xxx` Display Codeを使用する
- Identifierは抽選・処理順・固定AttackEvent優先を決定しない
- AttackEvent自体のデータ構造は「BGM 攻撃イベント仕様」を正とする
- Candidateの発生位置はRandom Sectionの範囲内に置く
- 候補の音楽的妥当性はサウンド班が判断・提示する
- Gameplayとしての採用・選択数はプランナーが決定する
- MusicChartへの入力はプログラマーが行う
- BGM開始時にその周回の抽選を行う
- BGMがLoopするたびに前回の抽選結果を破棄して再抽選する
- 抽選はAttackEventの予告開始前までに完了させる
- 同じCandidateを1回の抽選で重複選択しない
- 選ばれたCandidateは通常のAttackEventと同じ予告・発火処理を使用する
- 選ばれなかったCandidateはその周回では予告・発火しない
- 固定AttackEventと同じ発生位置では固定AttackEventを優先する
- Random SectionはAttackEvent発火後の成立・不成立を判定しない

---

## 関連タスク

<PageRelations />
