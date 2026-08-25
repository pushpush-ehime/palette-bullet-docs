---
title: "BGM→シャオンダマ生成仕様"
pageType: spec
category: "BGM"
status: 仮仕様
---

# BGM→シャオンダマ生成仕様

## ページ概要

- 対象担当：プログラム班・サウンド班
- 関連ページ：[ゲーム全体](/spec/game/)、[戦闘](/spec/combat/)、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)、[玉のデータ](/spec/shaondama-music/orb-data)、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)、[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)

## 目的

BGMの`MusicChart`に保存された`NoteEvent`をもとに、Normal Shaondama（通常シャオンダマ）について、**何を・いつ・何個生成するか**を決定するルールを定義する。

加えて本ページを、現在選択可能なShaondamaの最低保証判定、不足数の算出、Wildcard Shaondama（万能シャオンダマ）の補充要求、要求中個体の重複防止、およびBattle開始gateへ渡すShaondama準備完了通知の正本とする。

Normalについては、source NoteEvent occurrenceの作成、通常の先行生成、BGM loopごとの再生成、重複防止、およびSpawn Systemへ渡す生成要求を扱う。曲頭から一定数のNormal NoteEventを集める旧初期生成方式は使用しない。

BGM側で生成対象・生成タイミング・生成個数を決定した後は、Spawn Systemへ生成要求を渡し、ラジクジラを介してゲーム世界へ出現させる。

ラジクジラから世界内へどのように出現させるかなど、具体的な生成位置・生成方向・演出は本ページでは扱わない。

個体データの意味と必須属性は[玉のデータ](/spec/shaondama-music/orb-data)、Normalの出現処理・選択可能化は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、出現後のLifetime・自然破裂は[浮遊・挙動](/spec/shaondama-music/floating-behavior)を正本とする。

Wildcard Shaondamaは固定source NoteEventを持たず、本ページのNoteEvent駆動生成対象に含めない。本ページは最低保証の不足数分について補充要求を発行するところまでを担当し、Wildcard個体の生成・出現・Parry由来変換は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とする。

## 全体の流れ

```text
Battle ID受領
↓
MIDI
↓
MusicChart
↓
├─ Normal生成
│  ├─ 対象loopのNoteEvent occurrenceを作成
│  ├─ 生成対象Track・小節・生成時刻を確認
│  ├─ Spawn Systemへ生成要求
│  └─ ラジクジラからゲーム世界へ出現
│
└─ 最低保証
   ├─ 現在選択可能かつ非Reservedの個体数を確認
   ├─ 不足数と要求中の補充数を確認
   ├─ 必要な不足分だけWildcard補充を要求
   └─ 出現完了後に再集計
```

**重要：シャオンダマは、実際にその音がBGMで使用されるより前に生成する。**

ラジクジラ自身が`MusicChart`や`NoteEvent`を解析したり、Normalの生成対象・生成タイミング・生成個数を判断したりすることはない。Wildcardの補充要求をNormal用のSpawn経路へ流用しない。

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

## Battle開始前の準備

Battle開始前は、音楽時計を先に進めず、対象Battleの初期位置に対してNormalの先行生成判定と最低保証判定を行う。

```text
新しいBattle IDを受領
↓
対象Battle用のMusicChartとoccurrence管理を初期化
↓
1周目のsource NoteEvent occurrenceを必要範囲まで作成
↓
Battle音楽runtimeの初期位置に対して
MinimumLeadTimeによるNormal先行生成を評価
↓
必要なNormal生成要求を発行
↓
現在選択可能・非Reservedの個体数を集計
↓
不足数分のWildcard補充を要求
↓
出現完了・選択可能化を待つ
↓
最低保証数へ到達
↓
Battle開始gateへShaondama準備完了を通知
```

この初期評価は、BGM／MusicChart時計を進める処理ではない。Battle音楽runtimeの開始点、システム側pre-roll、および曲本編の対応関係は[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正本とする。

`MinimumLeadTime`上、生成triggerがBattle音楽runtime開始点以前になる小節は、この開始前評価でNormal生成要求を発行する。曲頭からNormal NoteEvent数を数えて任意の先の小節まで広げることはしない。

Normal生成要求は通常時と同じsource occurrence単位の重複防止を使用する。開始前評価とBattle開始後の先行生成判定が同じoccurrenceを発見しても、同じNormalを再生成しない。

## 選択可能Shaondamaの最低保証

最低保証の対象は、**対象Battleに属し、現在Playerの選択対象として公開されており、`Reserved`ではないShaondama**の個数とする。NormalとWildcardの両方を、同じ算入条件で集計する。

最低保証は「これまでに何個生成したか」ではなく、判定時点でPlayerが利用できる個数に対して適用する。

| 状態 | 最低保証数へ算入 | 理由 |
|---|---|---|
| 出現完了済み・選択可能・非`Reserved`のNormal | する | 現在Playerが選択できる |
| 出現完了済み・選択可能・非`Reserved`のWildcard | する | 現在Playerが選択できる |
| 生成要求中 | しない | world上の選択対象ではない |
| 論理個体作成済み・出現演出中 | しない | 出現完了前で選択できない |
| `Reserved` | しない | すでにAllocation先へ確保されている |
| 消費済み・自然破裂中・終了処理中 | しない | 新しい選択対象として利用できない |
| 旧Battle IDまたは別Battle IDの個体 | しない | 対象Battleへ帰属しない |

Normalは、ラジクジラからの出現演出完了と制御移譲をもって選択可能になる。論理個体の作成だけでは最低保証数へ加えない。具体的な出現完了通知と選択可能化は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とする。

不足補充として生成されたWildcardも、出現演出完了後に選択可能になった時点で最低保証数へ加える。Wildcardの出現経路と演出は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とする。

最低保証数の具体値は調整パラメータとし、現時点では固定しない。

## 不足数とWildcard補充要求

最低保証数を下回った場合は、不足分についてWildcard補充を要求する。NormalのNoteEvent駆動生成範囲を、不足補充のために拡張しない。

意味上の不足数は次の通りとする。実際の変数名や計算の保持方法は固定しない。

```text
現在不足数
= max(0, 最低保証数 - 現在選択可能かつ非Reservedの個体数)
```

生成要求中・出現演出中のWildcardは最低保証達成数には算入しない。ただし、同じ不足に対して補充要求を重複発行しないよう、すでに有効な**補充要求中数**を別に追跡する。

```text
新しく要求するWildcard数
= max(0, 現在不足数 - 有効な補充要求中数)
```

補充要求中数には、最低保証不足を生成元として発行済みで、まだ選択可能化・失敗・cancel・Battle終了のいずれにも確定していないWildcard分を含める。Parryから変換されるWildcardは最低保証不足による補充要求ではないため、この補充要求中数へ混同しない。

各補充要求は、少なくとも以下を識別できること。フィールド名と型は固定しない。

| データ | 内容 |
|---|---|
| 補充要求識別情報 | 再送・重複を識別できる要求ID |
| Battle ID | 補充先となる現在のBattle |
| Shaondama種別 | `Wildcard` |
| 生成元区分 | 最低保証不足による補充 |
| 要求個数 | 重複防止計算後に新しく必要な不足数 |

補充要求の受付、個体作成、出現完了、失敗、cancelの結果を受け取るたびに、対象Battleの補充要求中数と現在選択可能数を更新し、必要なら再判定する。

補充演出を待つ間に最低保証数を下回ることは許容する。Battle開始後に一時不足が発生しても、音楽時計やBattle進行を停止・巻き戻さず、不足分の補充要求だけを行う。

最低保証数は上限ではない。Normalの出現完了やParry由来Wildcardへの変換などによって最低保証数を上回っても、それだけを理由に既存個体を消滅させない。

## 継続監視

最低保証判定はBattle開始時だけでなく、Battle結果が未確定である間は継続する。

少なくとも以下の変化後に再評価できること。

- Shaondamaの出現完了・選択可能化
- Charge successによる`Reserved`化
- Palette Bullet化・消費
- Normalの自然破裂
- Wildcardの一般Lifetime終了
- 生成要求・出現演出の失敗またはcancel
- Parry由来Wildcardの選択可能化

これらをevent通知、dirty flag、定期評価のどれで検知するかは実装設計で決めてよい。ただし、同一Battle内の状態変化を見落として、Battle中は最低保証を再確認しない実装にはしない。

## Battle開始gate

Battle開始前は、現在選択可能かつ非`Reserved`のShaondama数が最低保証数へ到達した時点で、対象Battle IDを伴うShaondama準備完了をBattle開始gateへ通知する。

準備完了通知後、Battle／MusicChart時計が実際に開始される前に算入数が最低保証数を下回った場合は、Shaondama準備完了状態を解除して再び補充完了を待つ。

対象RoomのEnemy準備完了など、Shaondama以外の開始条件は各所有ページを正本とする。すべての開始条件が揃う前に、本ページからBattle／Gameplay／MusicChart時計を開始しない。開始条件が揃った後の時計同時開始とシステム側pre-rollは[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正本とする。

Normal Shaondamaを使用するBattleでは、Normalを世界内へ出現させる経路としてRadioWhaleを必須とする。RadioWhaleが存在しない状態で、Normalだけを別経路から出現させて準備完了を成立させない。

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
- 最低保証判定はloop開始時だけの初期処理ではなくBattle中の継続監視として動作し、loop切り替えを理由にNormalを追加で一括生成しない。
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

Battle開始前評価、通常先行生成、次loopの先読み、およびloop切り替え後処理が同じoccurrenceを発見しても、有効な生成要求と論理個体は1つだけにする。

生成要求が再送され得る実装では、Spawn System側もBattle IDとsource occurrenceを照合し、同じ要求から2個目の論理個体を作成しない冪等性を持たせる。具体的な受付処理は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とする。

## Shaondama Settings

シャオンダマ生成には最低限、以下の設定を使用する。

```text
Shaondama Settings
├─ 使用するTrack
├─ 選択可能Shaondamaの最低保証数
└─ MinimumLeadTime
```

### 選択可能Shaondamaの最低保証数

対象Battleで、現在選択可能かつ非`Reserved`のShaondamaを最低何個確保するかを指定する。

Battle開始前の準備gateとBattle中の継続補充の両方で使用する。値の意味はNormalの初期生成数ではなく、NormalとWildcardを合わせた現在利用可能数の下限である。

本ページでは概念名として「選択可能Shaondamaの最低保証数」と記載する。MusicChart上の実際のフィールド名は実装都合に合わせて変更できるため、本ページでは固定しない。

旧`InitialTargetCount`のように、曲頭からNormal NoteEventを目標数以上になるまで集める用途には使用しない。既存MusicChart dataの移行方法は実装設計で定めるが、旧フィールド名だけを根拠に旧初期生成処理を残してはいけない。

### MinimumLeadTime

各小節で使用されるシャオンダマを、実際にその小節が始まる最低何秒前までに生成するかを指定する。

BPMが異なる曲でも、プレイヤーがシャオンダマを探すための準備時間を一定に近づけるために使用する。

### パラメータの管理

選択可能Shaondamaの最低保証数と`MinimumLeadTime`は、ゲーム全体で共通の基本値を使用する。

特殊なBGMで異なるゲーム体験を意図する場合のみ、曲ごとに値を上書きできるようにする。

## Normal生成要求として下流へ渡す情報

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

BGMシステムは、Normalについて生成する対象・時刻・個数を決定する。また、最低保証判定によって不足しているWildcardの補充要求数を決定する。

**BGMシステムは、ゲーム世界上の具体的な生成位置を決定しない。**

BGM側でNormal生成が決定した後は、Spawn Systemへ生成要求を渡す。

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

Wildcard補充要求はこのNormal用経路へ渡さず、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)で定義する生成経路へ渡す。本ページはWildcardの具体的な生成位置、出現方向、演出を決定しない。

## ラジクジラとの接続

Normal生成におけるBGM側とラジクジラ側の責務を以下のように分離する。

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

BGM側は`MusicChart`と`NoteEvent`をもとに、Normalの生成対象・生成タイミング・生成個数を決定し、生成要求をSpawn Systemへ渡す。

ラジクジラは、その生成要求を受け取ってシャオンダマをゲーム世界へ出現させる役割を持つ。

ラジクジラは以下を担当しない。

* `MusicChart`の解析
* 生成対象Trackの決定
* 生成対象NoteEventの選択
* 生成タイミングの決定
* 生成個数の決定
* 選択可能Shaondamaの最低保証判定
* Wildcardの不足数・補充要求数の計算
* `MinimumLeadTime`による先行生成タイミングの計算

ラジクジラからの具体的な出現方法は`radiowhale/shaondama-spawning.md`を正本とし、本ページへ詳細を重複して持たせない。

また、生成後のシャオンダマの浮遊・Lifetime・消滅などはシャオンダマ側の責務とする。

## Pause・Battle終了・Room Retry

### Pause

Pause中はBGM／MusicChartの音楽時計と先行生成判定を進行させず、Normal生成要求とWildcard補充要求を新しく発行しない。Resume後は同じBattle IDとloop occurrence管理を維持して停止位置から再開し、現在選択可能数と補充要求中数を再評価する。

### Battle終了

ClearまたはGame Overの結果が確定した時点で、対象Battleについて以下を行う。

- 新しいsource NoteEvent occurrenceのactivateを停止する。
- Battle開始前評価・通常先行生成・次loop先読み・最低保証監視を停止する。
- 未送信のNormal生成要求とWildcard補充要求をcancelする。
- 非同期処理から遅れて完成した旧Battleの生成要求を破棄する。
- 結果確定後は、新しいShaondamaを発生させる生成要求を出さない。
- 既存個体の自然破裂とDamage停止は、浮遊挙動と戦闘仕様を正本とする。

すでにworld内へ存在するShaondamaのGameplay無効化、Clear終了演出、および消滅は[浮遊・挙動](/spec/shaondama-music/floating-behavior)を正本とする。生成演出中の要求cancelは[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とする。

### Room Retry

Room Retry時は旧Battleのoccurrence管理、生成済み記録、最低保証の集計状態、補充要求中数、および未送信・処理中の生成要求をすべて破棄する。新しいBattle IDを受領した後、現在Roomの先頭用として1周目のoccurrence管理、Battle開始前評価、最低保証監視を最初から構築する。

旧Battle IDの生成済み記録を新Battleの重複防止へ流用せず、旧Battle IDを持つ遅延要求を新Battleへ適用しない。

## 基本ルールまとめ

* 生成対象TrackのNoteEventは原則すべてシャオンダマにする。
* 1 source NoteEvent occurrenceにつき1個のNormal Shaondamaを生成する。
* 同じ音程でもNoteEventをまとめない。
* シャオンダマは小節単位でまとめて生成する。
* Normalは、各小節の開始まで`MinimumLeadTime`以上の準備時間を確保して生成する。
* Battle開始前は音楽時計を進めず、初期位置に対して`MinimumLeadTime`の先行生成判定を行う。
* 曲頭からNormal NoteEventを目標数まで集める旧初期生成方式は使用しない。
* BPMによって何小節前に生成するかは変化する。
* 同じBattle・同じsource NoteEvent occurrenceから重複生成しない。
* BGM loopごとに新しいsource NoteEvent occurrenceを作成し、各周回用Shaondamaを再生成する。
* 最低保証数へ算入するのは、対象Battleで現在選択可能かつ非`Reserved`のNormal／Wildcardだけとする。
* 生成要求中、出現演出中、`Reserved`、終了処理中、別Battleの個体は最低保証数へ算入しない。
* Battle開始前は最低保証数へ到達するまでShaondama準備完了にしない。
* Battle中も最低保証を監視し、不足分についてWildcard補充を要求する。
* 補充要求中数を別管理し、同じ不足に対するWildcard要求を重複させない。
* 補充待ちによるBattle中の一時不足は許容し、音楽時計を停止しない。
* Normal Shaondamaを使用するBattleではRadioWhaleを必須とする。
* Battle IDの発行・配布前にoccurrence作成、先行生成、最低保証監視を開始しない。
* BGM / MusicChart側が、Normalについて何を・いつ・何個生成するかを決定する。
* BGM側が最低保証不足と、新しく要求するWildcard補充数を決定する。
* BGM側はゲーム世界上の具体的な生成位置を決定しない。
* Normal生成内容はSpawn Systemを介してラジクジラへ渡し、Wildcard補充はWildcard側の生成経路へ渡す。
* ラジクジラは、受け取ったNormal生成要求をゲーム世界内で出現させる。
* ラジクジラは`MusicChart`解析、Normal生成判定、最低保証判定、Wildcard補充数決定を担当しない。
* 出現後のシャオンダマの挙動はシャオンダマ側で管理する。
* 最低保証数と`MinimumLeadTime`はゲーム共通値を基本とし、必要な場合のみ曲ごとに上書きする。
* Battle結果確定後に新しいoccurrence・生成要求・Shaondamaを発生させない。

## 未決事項

* 選択可能Shaondamaの最低保証数
* `MinimumLeadTime`の正式な調整値
* Wildcard補充時の出現演出秒数
* 同時に大量のシャオンダマが生成される場合の生成要求上限・分割方法

BGM loopごとの再生成、source occurrence単位の重複防止、継続的な最低保証、不足分のWildcard補充、Battle開始gate、およびBattle終了時の新規要求停止は決定済みとする。
