---
title: "BGM→シャオンダマ生成仕様"
pageType: spec
category: "BGM"
status: 仮仕様
---

# BGM→シャオンダマ生成仕様

## ページ概要

- 対象担当：プログラム班・サウンド班
- 関連ページ：[ゲーム全体](/spec/game/)、[戦闘](/spec/combat/)、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)、[玉のデータ](/spec/shaondama-music/orb-data)、[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)

## 目的

BGMの`MusicChart`に保存された`NoteEvent`をもとに、Normal Shaondama（通常シャオンダマ）について、**何を・いつ・何個生成するか**を決定するルールを定義する。

本ページを、source NoteEvent occurrenceの作成、初期生成、通常の先行生成、BGM loopごとの再生成、重複防止、およびSpawn Systemへ渡す生成要求の正本とする。

BGM側で生成対象・生成タイミング・生成個数を決定した後は、Spawn Systemへ生成要求を渡し、ラジクジラを介してゲーム世界へ出現させる。

ラジクジラから世界内へどのように出現させるかなど、具体的な生成位置・生成方向・演出は本ページでは扱わない。

個体データの意味と必須属性は[玉のデータ](/spec/shaondama-music/orb-data)、出現処理・選択可能化は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、出現後のLifetime・自然破裂は[浮遊・挙動](/spec/shaondama-music/floating-behavior)を正本とする。

Wildcard Shaondamaは固定source NoteEventを持たず、本ページのNoteEvent駆動生成対象に含めない。Wildcardの生成元・生成条件は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とする。

## 全体の流れ

```text
Battle ID受領
↓
MIDI
↓
MusicChart
↓
対象loopのNoteEvent occurrenceを作成
↓
生成対象Trackか確認
↓
生成する小節を確認
↓
生成対象・生成タイミング・生成個数を決定
↓
Spawn Systemへ生成要求
↓
ラジクジラ
↓
ゲーム世界へ出現
```

**重要：シャオンダマは、実際にその音がBGMで使用されるより前に生成する。**

ラジクジラ自身が`MusicChart`や`NoteEvent`を解析したり、生成対象・生成タイミング・生成個数を判断したりすることはない。

Battle IDが未発行、未配布、または現在のBattleと一致しない場合は、MusicChartのactivate、source NoteEvent occurrenceの作成、および生成要求の発行を開始しない。

## 生成対象

`MusicChart`の`Shaondama Settings`で指定されたTrackの`NoteEvent`を生成対象とする。

```text
Piano       ON
Guitar      ON
Bass        OFF
Strings     OFF
Drums       OFF
```

`ON`になっているTrackのNoteEventは、原則すべてシャオンダマとして生成する。

## 1NoteEvent = 1シャオンダマ

生成対象Trackに含まれる**各source NoteEvent occurrence**は、1つにつき1個のNormal Shaondamaを生成する。

同じ音程・同じタイミングであってもまとめない。

例：

```text
C4
C4
C5
E4
G4
```

↓

```text
Cシャオンダマ
Cシャオンダマ
Cシャオンダマ
Eシャオンダマ
Gシャオンダマ
```

合計5個生成する。

## NoteEvent definitionとoccurrence

`NoteEvent definition`はMusicChartに保存された譜面定義、`source NoteEvent occurrence`は対象Battleの特定loopで実際に発生する1回分を指す。

```text
Battle
+
source NoteEvent definition
+
loop occurrence
=
source NoteEvent occurrence
```

同じNoteEvent definitionであっても、1周目、2周目、3周目のoccurrenceはそれぞれ別物として扱う。

- 各occurrenceは、Battle、source NoteEvent definition、loop occurrenceを混同せず一意に識別できること。
- 内部IDのフィールド名、型、採番方式は固定しない。
- 同じpitch、Track、発音時刻であっても、異なるNoteEvent definitionまたは異なるloop occurrenceなら別occurrenceとする。
- source occurrenceは、対応するsource music timeを対象Battleの音楽時間上で一意に解決できること。
- occurrenceの識別情報は、生成要求からNormal Shaondama個体まで変更せずに引き継ぐ。

## シャオンダマの音程

NoteEventが持つ音程を、生成するシャオンダマへ設定する。

```text
C4
↓
Cのシャオンダマ

E4
↓
Eのシャオンダマ
```

C4・C5などオクターブが異なるNoteEventも、それぞれ別のシャオンダマとして生成する。

元のオクターブ情報は保持する。

## 生成単位

シャオンダマは**小節単位**でまとめて生成する。

例えば8小節目に以下のNoteEventが存在する場合、

```text
8小節目

C4
E4
G4
C5
```

8小節目で使用される4個のシャオンダマを同じタイミングで生成する。

音符ごとに個別のタイミングで生成することはしない。

## 通常時の先行生成

各小節で使用されるシャオンダマは、その小節が始まるより前に生成する。

プレイヤーがシャオンダマを探して使用する時間を確保するため、実際に音が使用されるまでの**最低準備時間**を設定する。

```text
MinimumLeadTime = 4秒
```

`4秒` は現行の仮値であり、正式な調整値は未決とする。

例えば、8小節目の開始まで最低4秒必要な場合、TempoMapを使用して4秒以上の余裕を確保できる小節の開始時に、8小節目のシャオンダマをまとめて生成する。

```text
現在の小節
↓
8小節目開始まで4秒以上あるか確認
↓
条件を満たすタイミングで
8小節目のシャオンダマを生成
```

曲のBPMが異なっていても、プレイヤーが確保できる準備時間が大きく変わらないようにする。

### 例

`MinimumLeadTime = 4秒`の場合、

```text
遅いBGM
↓
2小節前で4秒以上確保できる
↓
2小節前に生成
```

```text
速いBGM
↓
2小節前では4秒未満
↓
3小節前に生成
```

このように、生成する小節数は曲のテンポに応じて変化する。

## 曲開始時の初期生成

Battle開始時は、戦闘開始直後からプレイヤーが行動できるように、一定数以上のシャオンダマをまとめて初期生成する。

初期生成は以下の順序に従う。

1. 新しいBattle IDを受領する
2. 対象Battle用のMusicChartとoccurrence管理を初期化する
3. 同じBattle IDでBGM／MusicChartを開始する
4. 音楽時計を開始する
5. 1周目の初期生成対象NoteEvent occurrenceを確定する
6. Battle IDを含む初期生成要求をSpawn Systemへ発行する
7. 初期生成を含む必要な準備完了後、Combat受付開始へ接続する

BGM／MusicChart開始、音楽時計開始、初期生成の前に、対象BattleのBattle IDが存在しなければならない。

初期生成するシャオンダマの目標数を設定する。

```text
InitialTargetCount = 30
```

`30` は現行の仮値であり、正式採用の可否と調整値は未決とする。

1小節目から順番に生成対象のNoteEvent数を確認し、`InitialTargetCount`以上になるまで小節を追加する。

例：

```text
1小節目
12個

↓
30個未満

2小節目まで
21個

↓
30個未満

3小節目まで
34個

↓
30個以上
```

この場合、Battle開始時の初期生成として、1～3小節目で使用される34個のシャオンダマをまとめて生成する。

小節の途中で生成対象を分割せず、目標数を超えた場合もその小節に含まれるNoteEventはすべて生成する。

これにより、曲の冒頭で音数が少ない場合でも、戦闘開始直後にシャオンダマが不足しにくくする。

## 初期生成後の流れ

初期生成されたNoteEventは、通常の先行生成では再生成しない。

例えば、

```text
InitialTargetCount = 30
```

によって1～3小節目までのシャオンダマが初期生成された場合、

```text
BGM開始
↓
1～3小節目
初期生成済み
```

となる。

その後は`MinimumLeadTime`を基準として、まだ生成されていない小節のシャオンダマを順番に生成する。

```text
4小節目
↓
MinimumLeadTime以上前のタイミングで生成

5小節目
↓
MinimumLeadTime以上前のタイミングで生成
```

同じsource NoteEvent occurrenceからシャオンダマを重複生成しない。

## BGM loop時の再生成

BGMがloopした場合は、各周回のNoteEvent用シャオンダマを再生成する。

```text
1周目のNoteEvent definition A
↓
loop occurrence 1のsource occurrence A-1
↓
1周目用Shaondama生成

2周目の同じNoteEvent definition A
↓
loop occurrence 2のsource occurrence A-2
↓
2周目用Shaondama生成
```

- 各loop occurrenceについて、その周回用のsource NoteEvent occurrenceを必要な先読み時点までに作成する。
- 各周回でも、生成対象Track、1 occurrence = 1 Shaondama、小節単位生成、`MinimumLeadTime`の規則を使用する。
- 次周回冒頭のNoteEventで`MinimumLeadTime`を確保する必要がある場合は、現在周回の終端前から次周回のoccurrenceを先読みして生成できる。
- 前周回中に次周回分を先行生成済みの場合、loop切り替え時に同じoccurrenceを再生成しない。
- `InitialTargetCount`によるまとまった初期生成はBattle開始時に使用し、各loop開始時には繰り返さない。
- Battleが変わった場合は、同じMusicChart・同じloop番号であっても別occurrenceとして扱う。

先読み時間の具体値は`MinimumLeadTime`等の既存設定と調整値に従う。

### 重複防止

同一Battle内で、同じsource NoteEvent occurrenceの生成要求を複数回有効化してはいけない。

重複防止にはsource NoteEvent occurrenceの識別情報を使用する。意味上は、少なくとも以下を区別できること。

```text
Battle ID
+
source NoteEvent definition
+
loop occurrence
```

初期生成、通常先行生成、次loopの先読み、およびloop切り替え後処理が同じoccurrenceを発見しても、有効な生成要求と論理個体は1つだけにする。

生成要求が再送され得る実装では、Spawn System側もBattle IDとsource occurrenceを照合し、同じ要求から2個目の論理個体を作成しない冪等性を持たせる。具体的な受付処理は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とする。

## Shaondama Settings

シャオンダマ生成には最低限、以下の設定を使用する。

```text
Shaondama Settings
├─ 使用するTrack
├─ InitialTargetCount
└─ MinimumLeadTime
```

### InitialTargetCount

BGM開始時に確保するシャオンダマの目標数。

曲の冒頭で音数が少ない場合でも、プレイヤーが行動するために必要なシャオンダマを確保するために使用する。

現時点ではこの方式をBattle開始時の初期生成に使用するが、`InitialTargetCount`方式そのものを最終仕様として採用するかは未決とする。

### MinimumLeadTime

各小節で使用されるシャオンダマを、実際にその小節が始まる最低何秒前までに生成するかを指定する。

BPMが異なる曲でも、プレイヤーがシャオンダマを探すための準備時間を一定に近づけるために使用する。

### パラメータの管理

`InitialTargetCount`と`MinimumLeadTime`は、ゲーム全体で共通の基本値を使用する。

特殊なBGMで異なるゲーム体験を意図する場合のみ、曲ごとに値を上書きできるようにする。

## 生成要求として下流へ渡す情報

BGM側で生成対象となったsource NoteEvent occurrenceについて、[玉のデータ](/spec/shaondama-music/orb-data)で定義されたNormal Shaondamaを、RadioWhale側でMusicChartを再解析せず作成できる情報を生成要求として下流へ渡す。

最低限、各生成要求は以下の意味を保持する。実際のフィールド名と型は固定しない。

| データ | 内容 |
|---|---|
| 生成要求識別情報 | 再送・重複を識別できる要求ID |
| Shaondama種別 | `Normal` |
| Battle ID | 対象Battleの識別情報 |
| source NoteEvent definition参照 | MusicChart上の元NoteEvent定義 |
| source NoteEvent occurrence識別情報 | 対象Battle・対象loopの一意な発生回 |
| loop occurrence | BGMの何周目に属するか |
| source music time | 対象occurrenceの発音時刻 |
| exact MIDI Note | octave込みの元MIDI Note |
| pitch class | octaveを区別しないSlot照合用音名 |
| octave | 元NoteEventのoctave |
| Track参照 | 元NoteEventが属するTrack |
| Velocity | 元NoteEventのVelocity |
| 基本色定義参照 | キーからの度数に対応する7色の参照 |
| Normal RGB Damage定義参照 | 基本色に対応する調整可能なDamage profile |

生成要求受付後に作成する個体識別情報はSpawn／個体作成側で割り当てる。生成要求識別情報、Battle ID、およびsource occurrenceとの対応を保持し、同じ要求から複数個体を作らない。

音程はGameplay処理に使用し、exact MIDI Note、octave、Track、Velocityは将来のGameplayや演出でも利用できるよう欠落させない。

BGM側はこれらの情報と生成対象・生成個数を決定するが、世界内の具体的な生成位置や出現演出は決定しない。

必須情報が欠けている場合、またはBattle IDが現在のBattleと一致しない場合は生成要求を有効化しない。RadioWhale側がMusicChartを再解析して欠損値を推測してはいけない。

## 生成位置

BGMシステムは、生成するシャオンダマの種類・対象・個数を決定する。

**BGMシステムは、ゲーム世界上の具体的な生成位置を決定しない。**

BGM側で生成が決定した後は、Spawn Systemへ生成要求を渡す。

Spawn Systemからラジクジラへ生成要求を渡し、ラジクジラを介してゲーム世界へシャオンダマを出現させる。

```text
BGM System
↓
「C / E / Gを生成」

Spawn System
↓
生成要求

ラジクジラ
↓
ゲーム世界へ出現
```

ラジクジラの背中の具体的なSpawn位置、出現方向、生成時の姿勢、Animation・VFX・SEなど、**どこから・どのように世界内へ出現させるか**の詳細はRadioWhale側の責務とする。

これらの詳細は`radiowhale/shaondama-spawning.md`で定義する。

## ラジクジラとの接続

BGM側とラジクジラ側の責務を以下のように分離する。

```text
BGM / MusicChart
「何を・いつ・何個生成するか」
↓
Spawn System
「生成要求」
↓
RadioWhale
「受け取った要求を世界内でどう出現させるか」
↓
Shaondama
「出現後の存在・浮遊・寿命等」
```

BGM側は`MusicChart`と`NoteEvent`をもとに、生成対象・生成タイミング・生成個数を決定し、生成要求をSpawn Systemへ渡す。

ラジクジラは、その生成要求を受け取ってシャオンダマをゲーム世界へ出現させる役割を持つ。

ラジクジラは以下を担当しない。

* `MusicChart`の解析
* 生成対象Trackの決定
* 生成対象NoteEventの選択
* 生成タイミングの決定
* 生成個数の決定
* `InitialTargetCount`による初期生成範囲の計算
* `MinimumLeadTime`による先行生成タイミングの計算

ラジクジラからの具体的な出現方法は`radiowhale/shaondama-spawning.md`を正本とし、本ページへ詳細を重複して持たせない。

また、生成後のシャオンダマの浮遊・Lifetime・消滅などはシャオンダマ側の責務とする。

## Pause・Battle終了・Retry

### Pause

Pause中はBGM／MusicChartの音楽時計と先行生成判定を進行させず、新しい生成要求を発行しない。Resume後は同じBattle IDとloop occurrence管理を維持し、停止位置から再開する。

### Battle終了

ClearまたはGame Overの結果が確定した時点で、対象Battleについて以下を行う。

- 新しいsource NoteEvent occurrenceのactivateを停止する。
- 初期生成・通常先行生成・次loop先読みを停止する。
- 未送信の生成要求をcancelする。
- 非同期処理から遅れて完成した旧Battleの生成要求を破棄する。
- 結果確定後は、新しいShaondamaを発生させる生成要求を出さない。
- 既存個体の自然破裂とDamage停止は、浮遊挙動と戦闘仕様を正本とする。

すでにworld内へ存在するShaondamaのGameplay無効化、Clear終了演出、および消滅は[浮遊・挙動](/spec/shaondama-music/floating-behavior)を正本とする。生成演出中の要求cancelは[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とする。

### Retry

Retry時は旧Battleのoccurrence管理、生成済み記録、未送信・処理中の生成要求をすべて破棄する。新しいBattle IDを受領した後、1周目のoccurrence管理と初期生成を最初から構築する。

旧Battle IDの生成済み記録を新Battleの重複防止へ流用せず、旧Battle IDを持つ遅延要求を新Battleへ適用しない。

## 基本ルールまとめ

* 生成対象TrackのNoteEventは原則すべてシャオンダマにする。
* 1 source NoteEvent occurrenceにつき1個のNormal Shaondamaを生成する。
* 同じ音程でもNoteEventをまとめない。
* シャオンダマは小節単位でまとめて生成する。
* Battle開始時の初期生成では、`InitialTargetCount`以上になるまで先の小節を確認し、対象NoteEventをまとめて生成する。
* 通常時は、各小節の開始まで`MinimumLeadTime`以上の準備時間を確保して生成する。
* BPMによって何小節前に生成するかは変化する。
* 同じBattle・同じsource NoteEvent occurrenceから重複生成しない。
* BGM loopごとに新しいsource NoteEvent occurrenceを作成し、各周回用Shaondamaを再生成する。
* Battle IDの発行・配布前にMusicChart、音楽時計、初期生成を開始しない。
* BGM / MusicChart側が、何を生成するかを決定する。
* BGM / MusicChart側が、いつ生成するかを決定する。
* BGM / MusicChart側が、何個生成するかを決定する。
* BGM側はゲーム世界上の具体的な生成位置を決定しない。
* BGM側で決定した生成内容は、Spawn Systemを介してラジクジラへ生成要求として渡す。
* ラジクジラは、受け取った生成要求をゲーム世界内で出現させる。
* ラジクジラは`MusicChart`解析や生成対象・タイミング・個数の決定を担当しない。
* 出現後のシャオンダマの挙動はシャオンダマ側で管理する。
* `InitialTargetCount`と`MinimumLeadTime`はゲーム共通値を基本とし、必要な場合のみ曲ごとに上書きする。
* Battle結果確定後に新しいoccurrence・生成要求・Shaondamaを発生させない。

## 未決事項

* `InitialTargetCount`方式を最終仕様として採用するか

  * 現時点では初期生成方式として使用する。
  * 最終採用可否は未決とする。
  * RadioWhale側の仕様・実装は、`InitialTargetCount`方式そのものへ依存させない。
* `InitialTargetCount`と`MinimumLeadTime`の正式な調整値
* 同時に大量のシャオンダマが生成される場合の生成要求上限・分割方法

BGM loopごとの再生成、source occurrence単位の重複防止、Battle ID確定後の初期生成、およびBattle終了時の新規要求停止は決定済みとする。
