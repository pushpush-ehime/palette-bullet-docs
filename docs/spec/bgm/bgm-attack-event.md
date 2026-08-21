---
title: "BGM 攻撃イベント仕様"
description: Palette BulletにおけるAttackEventの音楽的設計・設定仕様
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
  - /tasks/music-chart-scriptableobject/pb-task-0016
  - /tasks/music-chart-scriptableobject/pb-task-0017
---

# BGM 攻撃イベント仕様

## 目的

本ページでは、

> **音楽上どこに、どのようなAttackEventを設定するか**

を定義します。

AttackEventでは、BGMに対して、

```text
この音楽位置で
↓
この音を使って
↓
この音楽表現として
↓
Gameplayへ攻撃タイミングを渡す
```

ための情報を設定します。

本ページでは主に、

- AttackEventとして使用する音楽位置
- 必要音
- Chord / Arpeggio
- Arpeggioの順序・音楽的タイミング
- Harmony
- 予告
- 固定AttackEvent
- Random Sectionで使用するAttackEvent候補
- Gameplayへ渡す情報
- サウンド班からUnityへの受け渡し

を扱います。

AttackEvent発火後の、

- Slot照合
- パレットブレットの蓄積状態
- AttackEvent成立条件
- 成功 / 不成立
- 使用するパレットブレットの決定

は本ページでは定義しません。

これらはチャージシステム側の仕様を正とします。

---

## AttackEventとは

`AttackEvent`は、BGMの特定の演奏位置に設定する音楽Gameplay用イベントです。

例えば、BGMの8小節目に、

```text
C
E
G
```

というコードが存在し、そのコードをPlayerの攻撃へ利用したい場合、

```text
8小節目 1拍目
C / E / G
Type = Chord
```

というAttackEventを設定できます。

```text
BGM
↓
8小節目 1拍目
↓
AttackEvent
↓
Gameplayへ通知
```

AttackEventはMIDIには記録しません。

サウンド班が音楽的な内容を決め、Gameplayとして使用する内容をプランナーが確認したうえで、Unityの`MusicChart`へ設定します。

```text
サウンド班
↓
音楽的AttackEvent候補を設計
↓
プランナー
↓
Gameplayとして確認
↓
プログラマー
↓
MusicChartへ設定
```

MusicChart上でのデータ構造・入力責務については、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

## AttackEventの責務

AttackEventが持つ責務は、

> **BGM上の音楽的位置・要求音・音楽表現をGameplayへ伝えること**

です。

```text
AttackEvent
├─ いつ
├─ どの音を
└─ どの音楽表現で使うか
```

を定義します。

一方、

```text
その音が何個チャージされているか
↓
成立するか
↓
どのパレットブレットを使用するか
```

はAttackEvent自身の責務ではありません。

AttackEventは、成立判定に必要となる**音楽側の要求情報**をGameplayへ渡します。

その情報を使ってどのように判定するかは、チャージシステム側を正とします。

---

## AttackEventが持つ情報

AttackEventは、基本的に以下の情報を持ちます。

```text
AttackEvent
├─ 発生位置
├─ 必要音
├─ Type
│  ├─ Chord
│  └─ Arpeggio
├─ Arpeggio情報
│  ├─ 順序
│  └─ 音楽的タイミング
├─ 予告時間
└─ Harmony
   ├─ Root
   └─ Quality
```

`Arpeggio情報`は`Type = Arpeggio`の場合に使用します。

`Harmony`は必要に応じて設定します。

---

## 作曲者が決める情報

サウンド班の作曲者は、曲の音楽的内容をもとにAttackEvent候補を設計します。

主に以下を決めます。

| 項目 | サウンド班が決める内容 |
| --- | --- |
| 発生位置 | 楽曲上のどこを攻撃タイミングとして使用するか |
| 必要音 | その場所で使用する音 |
| Type | `Chord` / `Arpeggio` |
| Arpeggio順序 | どの順番で音を使用するか |
| Arpeggioの音楽的タイミング | 各音を楽曲上どの間隔で鳴らすか |
| Harmony | Root / Qualityなどの音楽的意味 |

サウンド班は、

```text
このコードを攻撃に使いたい

このアルペジオを攻撃に使いたい

この音楽位置を攻撃タイミングにしたい
```

という音楽的意図をAttackEvent候補として提示します。

### サウンド班が決めないもの

以下のようなGameplay上の値・判定は、サウンド班が独自に決定しません。

- AttackEventを最終的にGameplayへ採用するか
- 予告時間などGameplay体験に関する値
- Slot数
- Slot割り当て
- 必要音の成立判定方法
- 何音揃えば攻撃が成立するか
- パレットブレットの使用優先順位

これらはプランナー・各Gameplay仕様を正とします。

---

## 発生位置

`発生位置`は、AttackEventの基準となるBGM上の演奏位置です。

位置は、

```text
小節
拍
必要に応じてTick
```

で指定します。

例：

```text
8小節目
1拍目
```

より細かい位置が必要な場合は、

```text
8小節目
1拍目
240 Tick
```

のように指定します。

### 実行時

ゲーム実行時は、MusicChartの`TempoMap`を使用して音楽位置を実際のBGM再生位置へ変換します。

```text
小節 / 拍 / Tick
↓
TempoMap
↓
BGM上の再生位置
↓
AttackEvent発火
```

BGMとGameplayの同期基準については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## 必要音

`必要音`は、そのAttackEventがGameplayへ要求する音を表します。

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

AttackEventは、この必要音情報をGameplayへ渡します。

```text
AttackEvent
↓
必要音
C / E / G
↓
Gameplay
```

必要音に対して、

- 何音揃えば成立するか
- 同じ音を複数必要とする場合どう扱うか
- オクターブを一致条件へ含めるか
- Slotとどう照合するか

などは本ページでは定義しません。

詳細はチャージシステム側の仕様を正とします。

---

## Chord

`Type = Chord`は、複数の音を同じ音楽位置で扱うAttackEventです。

例：

```text
AttackEvent

発生位置
8小節目 1拍目

必要音
C / E / G

Type
Chord
```

音楽的には、

```text
C + E + G
```

として扱います。

AttackEvent成立後に実際にどのパレットブレットが発射されるかはチャージシステム側を正とします。

成立したパレットブレットの発射・発音については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## Arpeggio

`Type = Arpeggio`は、複数の音を楽曲上の順序・タイミングに従って扱うAttackEventです。

例えば、

```text
C
↓
E
↓
G
```

というアルペジオをAttackEventへ使用する場合、

```text
AttackEvent
├─ 必要音
│  ├─ C
│  ├─ E
│  └─ G
│
├─ 順序
│  ├─ 1 : C
│  ├─ 2 : E
│  └─ 3 : G
│
└─ 音楽的タイミング
   ├─ C : AttackEvent開始位置
   ├─ E : 楽曲上の次の演奏位置
   └─ G : 楽曲上の次の演奏位置
```

として扱います。

### 順序

Arpeggioでは必要音の集合だけでなく、演奏順序を保持します。

例えば、

```text
C → E → G
```

と、

```text
G → E → C
```

は異なるArpeggioとして扱います。

### 音楽的タイミング

Arpeggioの各音の間隔には、ゲーム全体で共通の固定秒数を使用しません。

そのAttackEventが元にしている楽曲上の演奏に合わせて、**AttackEventごとに音楽的タイミングを設定します。**

```text
元楽曲

C ─── E ─ G
```

であれば、

```text
AttackEvent

C ─── E ─ G
```

の関係を維持します。

各音の位置は、BGMの時間軸に対応できる音楽的位置として扱います。

実際の秒数への変換には`TempoMap`を使用します。

### 発射・発音

AttackEvent成立後は、設定された順序・音楽的タイミングに従って、成立したパレットブレットを発射・発音します。

実際の音響処理については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

どのパレットブレットが発射対象になるかは、チャージシステム側を正とします。

---

## Harmony

AttackEventには、必要に応じて`Harmony`情報を設定します。

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

別の例：

```text
Root    : A
Quality : Minor
```

Harmonyは、そのAttackEventが音楽上どのような和声として設計されたかを示す情報です。

HarmonyをGameplay効果や成立判定へどのように利用するかは本ページでは定義しません。

本ページでは、音楽的意味を保持するためのAttackEvent情報として扱います。

---

## 予告

AttackEventは、発生位置へ到達する前にGameplayへ予告情報を渡します。

```text
AttackEvent
↓
予告
↓
発生位置
↓
発火
```

予告時には、Gameplay側がAttackEventを事前に認識できるようにします。

主に以下の情報を取得できる状態にします。

```text
AttackEvent
├─ 必要音
├─ Type
├─ Harmony
└─ AttackEvent発生までの情報
```

Arpeggioの場合は、必要に応じて順序などAttackEventの識別に必要な情報も利用できます。

### 予告時間

予告時間はGameplay体験に関係する値であるため、プランナーが決定します。

サウンド班は、

- 楽曲上の自然な区切り
- コード進行
- 拍
- フレーズ

などの音楽的観点から候補を提示できます。

ただし、最終的なGameplay値はプランナーが決定します。

### UI

予告情報を、

- どのUIに表示するか
- どのような見た目にするか
- どのようにアニメーションさせるか

はUI側の仕様を正とします。

---

## 固定AttackEvent

Random Sectionによる抽選を行わず、そのBGMの該当位置で使用するAttackEventを`固定AttackEvent`として扱います。

例：

```text
8小節目 1拍目

C / E / G
Chord
```

↓

```text
固定AttackEvent
↓
予告
↓
8小節目 1拍目
↓
発火
```

固定AttackEventは、そのBGM再生で該当位置へ到達した場合、Random Sectionの抽選結果に関係なくAttackEventとして使用します。

::: info
**「固定AttackEventが使用される」ことと、「Gameplay上の攻撃が必ず成立する」ことは別です。**

固定AttackEventで保証するのは、AttackEventの予告・発火までです。

発火後の成立判定はチャージシステム側を正とします。
:::

---

## AttackEvent候補の受け渡し

サウンド班が設計したAttackEventはMIDIへ記録しません。

そのため、MIDIとは別の設定情報として受け渡します。

```text
サウンド班
↓
AttackEvent候補を整理
↓
プランナー
↓
Gameplayとして確認
↓
プログラマー
↓
MusicChartへ入力
```

### サウンド班が渡す情報

AttackEvent候補ごとに、少なくとも以下を識別できる状態にします。

```text
AttackEvent候補
├─ 発生位置
├─ 必要音
├─ Type
├─ Arpeggioの場合
│  ├─ 順序
│  └─ 音楽的タイミング
└─ Harmony
```

予告時間などGameplay側で決定する情報は、サウンド班が独自に確定する必要はありません。

### プランナー

プランナーは、

- AttackEventをGameplayとして採用するか
- Gameplay上の条件と競合しないか
- 予告時間などのGameplay値

を確認・決定します。

### プログラマー

プログラマーは、確定したAttackEvent情報をUnityのMusicChartへ入力します。

プログラマーが音楽的内容を独自判断で変更しません。

### 受け渡し方法

具体的な、

- ツール
- ファイル形式
- 管理画面
- 共有方法

は本ページでは固定しません。

AttackEvent情報の受け渡し工程全体については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

---

## 発火

BGMがAttackEventの発生位置まで到達したら、そのAttackEventを発火します。

```text
BGM再生
↓
AttackEvent予告
↓
発生位置
↓
AttackEvent発火
```

AttackEventの発火は、

> **「この音楽位置に対応するAttackEventの評価タイミングになった」**

ことをGameplayへ通知するものです。

発火そのものは、

- 攻撃成功
- 攻撃不成立
- パレットブレット発射

を意味しません。

```text
AttackEvent発火
≠
攻撃成立
```

AttackEvent側は、発火時点で必要な情報をGameplayへ渡します。

その後の処理はGameplay側へ移ります。

---

## Gameplayへの出力

AttackEventは、予告・発火に必要なAttackEvent情報をGameplay側から参照できる状態にします。

概念上は、

```text
AttackEvent
↓
Gameplay
├─ 発生位置
├─ 必要音
├─ Type
├─ Arpeggio情報
├─ Harmony
└─ 予告に必要な情報
```

という関係になります。

### 発火後

発火後は、

```text
AttackEvent
↓
Gameplayへ通知
↓
BGM側のAttackEvent責務終了
```

とします。

その後の、

```text
Slot確認
↓
成立判定
↓
使用するパレットブレット決定
↓
成立 / 不成立
```

はチャージシステム側を正とします。

成立後の、

```text
パレットブレット発射
+
音程音
+
Gameplay SE
```

については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## Random Sectionとの関係

すべてのAttackEventを固定で使用する必要はありません。

曲中の複数のAttackEvent候補から、その周回で使用するものを選択する場合は`Random Section`を使用します。

```text
Random Section

START
│
├─ Candidate A
├─ Candidate B
├─ Candidate C
│
END
```

各Candidateは、本ページで定義する通常のAttackEventと同じ音楽情報を持ちます。

```text
Candidate
├─ 発生位置
├─ 必要音
├─ Type
├─ Arpeggio情報
└─ Harmony
```

Random Sectionによって選ばれたAttackEventは、固定AttackEventと同じ予告・発火処理を使用します。

```text
Random Section
↓
AttackEventを選択
↓
通常のAttackEventとして扱う
↓
予告
↓
発火
```

Random Section専用のAttackEvent形式は作りません。

以下については、[BGM Random Section仕様](/spec/bgm/bgm-random-section)を正とします。

- Random Sectionの開始位置・終了位置
- Candidate条件
- 選択数
- 抽選タイミング
- 再抽選
- 固定AttackEventとの競合

---

## 責務境界

本ページは、

> **音楽上どこに、どのようなAttackEventを設定するか**

だけを正とします。

| 内容 | 正とする仕様 |
| --- | --- |
| AttackEventの発生位置・必要音・Type・Harmony | **本ページ** |
| Arpeggioの順序・音楽的タイミング | **本ページ** |
| AttackEvent候補の音楽的設計 | **本ページ** |
| AttackEvent情報の制作・受け渡し工程 | [サウンド班制作フロー](/spec/bgm/sound-production-workflow) |
| MusicChart上のデータ構造・入力者 | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| DAW / FLAC / MIDI | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings) |
| Random候補・抽選ルール | [BGM Random Section仕様](/spec/bgm/bgm-random-section) |
| Slot・割り当て | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| AttackEvent成立条件 | チャージシステム側の仕様 |
| 成立後の発射・音程音・Gameplay SE | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| 予告UIの見た目・表示方法 | UI側の仕様 |

### サウンド班

サウンド班は、

- AttackEventとして使用したい音楽位置
- 必要音
- Chord / Arpeggio
- Arpeggioの順序
- Arpeggioの音楽的タイミング
- Harmony

を音楽的観点から設計・提示します。

### プランナー

プランナーは、

- AttackEventをGameplayとして採用するか
- 予告時間などのGameplay値
- Gameplay側との整合性

を決定・確認します。

### プログラマー

プログラマーは、

- 確定したAttackEventをMusicChartへ入力する
- AttackEventを指定されたBGM位置で予告・発火できる状態にする
- Gameplayへ必要な情報を渡せる状態にする

ことを担当します。

プログラマーはAttackEventの音楽的内容やGameplayルールを独自に変更しません。

---

## 基本ルール

- AttackEventはBGM上のコード・アルペジオなどの音楽表現に合わせて設定する
- AttackEventはMIDIには記録しない
- サウンド班がAttackEventの音楽的内容を設計・提示する
- プランナーがGameplayとしての採用・Gameplay値を決定する
- プログラマーが確定した内容をMusicChartへ入力する
- 発生位置は小節・拍・必要に応じてTickで指定する
- AttackEventには必要音を設定する
- Typeは`Chord`または`Arpeggio`とする
- Arpeggioは順序とAttackEventごとの音楽的タイミングを持つ
- 必要に応じてHarmonyを保持する
- AttackEvent発生前にGameplayへ予告できる状態にする
- BGMが発生位置へ到達したらAttackEventを発火する
- AttackEvent発火とGameplay上の成立判定は別の責務とする
- 発火後のSlot照合・成立・不成立はチャージシステムを正とする
- Random Sectionで選ばれたAttackEventも通常のAttackEventと同じ予告・発火処理を使用する

## 関連タスク

<PageRelations />
