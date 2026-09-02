---
title: "BGM MIDIファイルの設定"
description: Palette BulletにおけるDAWからUnityへ渡すBGM制作データの技術仕様
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
---

# BGM MIDIファイルの設定

## 目的

本ページでは、

> **DAWからUnityへ渡すBGM制作データの技術仕様**

を定義します。

主に以下を扱います。

- DAW Project / FLAC / MIDIの関係
- MIDIに残す音楽情報
- Track構成・Track命名
- Gameplay利用候補Track
- FLAC / MIDIの同期条件
- Export条件
- ファイルの識別
- 修正版の扱い
- LoopするBGMの納品
- Unityへの納品条件

サウンド制作開始からゲーム内確認までの工程については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

`MusicChart`のImport / ReImportやデータ構造については、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

## MIDIの役割

MIDIは、BGMの音楽情報をUnityへ渡すために使用します。

MIDI自体をゲーム内の音源として再生することはしません。

```text
FLAC
↓
Unity Import
↓
AudioClip
↓
プレイヤーが実際に聞く戦闘BGM
```

```text
MIDI
↓
音楽情報を取得
↓
MusicChart
↓
Gameplayで使用
```

MIDIから取得した情報は、Unity Editorで`MusicChart`へ変換して使用します。

ゲーム実行中にMIDIを直接解析・再生することを前提としません。

### モード／コンダクトとの責務境界

MIDIがUnityへ渡すのは、楽曲側が決めた「何の音を、いつ使用するか」のための静的な音楽情報です。PlayerがStage挑戦中に選ぶモード／コンダクトをMIDIへ埋め込まず、MIDIをその選択状態の正本にしません。Player操作によってMIDIまたはMusicChartの元データを書き換えません。

MIDI由来の音楽情報、MusicChartへ手動設定する静的なAttackEvent Definition、Stage挑戦中の具体的なAttackEvent occurrenceへ付与するコンダクト、および発火・発射時に参照する適用済みモードを区別します。この境界は既存のMIDI変換・Export・設定を変更しません。詳細は[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)と[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)を正本とします。

---

## BGM制作データ構成

1曲の戦闘BGMについて、基本的に以下を1セットとして管理します。

```text
BGM制作データ
├─ DAW Project
├─ FLAC
├─ MIDI
└─ MIDIとは別に管理する音楽設定情報
   ├─ AttackEvent
   └─ Random Section候補
```

### DAW Project

楽曲の制作元となるデータです。

### FLAC

完成したBGMをUnityへ渡すためのマスター素材です。

### MIDI

Gameplayで使用する音楽情報をUnityへ渡すためのデータです。

### 音楽設定情報

AttackEventやRandom Sectionなど、MIDIへ記録しないゲーム用情報です。

具体的な受け渡し工程については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

---

## DAW Project

DAW Projectは、FLACとMIDIの両方を生成する元データとして管理します。

```text
DAW Project
├─ FLAC Export
└─ MIDI Export
```

FLACとMIDIは、必ず**同じDAW Projectの同じ楽曲状態**から書き出します。

一方だけが古い状態のままにならないようにします。

例えば、

```text
DAW Project v2
├─ FLAC → v2
└─ MIDI → v1
```

のように、音源と音楽情報の内容が異なる組み合わせを納品してはいけません。

DAWの種類やバージョンについては、本ページでは固定しません。

ただし、修正が必要になった場合に、同じ楽曲からFLACとMIDIを再Exportできる状態を維持します。

---

## FLAC

FLACは、完成したBGMをUnityへ渡すためのマスター素材として使用します。

```text
DAW
↓
FLAC
↓
Unity Import
↓
AudioClip
↓
戦闘BGM
```

FLACそのものを実行時の圧縮形式として固定することは本ページの目的ではありません。

UnityへImportした後のAudioClip設定については、プログラマー側で対象プラットフォームや実行条件に合わせて設定します。

### FLACに含める内容

FLACには、プレイヤーが実際に聞く完成済みBGMを出力します。

原則として、

- Gameplay用確認だけのクリック音
- DAW上のガイド音
- 制作用メトロノーム
- MIDI確認用の仮音
- Unityでは使用しない確認音

を完成BGMへ混ぜません。

---

## MIDI

MIDIには、Gameplayで使用するために必要な音楽情報を残します。

MIDIは、

> **完成BGMを再現する音源**

ではなく、

> **完成BGMからGameplayに必要な音楽情報を取得するためのデータ**

として扱います。

そのため、FLACとMIDIで音色が同じである必要はありません。

重要なのは、

- 音程
- Track
- Tempo
- 拍子
- 演奏位置

などの情報が、実際のBGMと対応していることです。

---

## MIDIに必要な情報

各Noteから、主に以下の情報を取得します。

```text
Note
├─ 音程
├─ オクターブ
├─ Velocity
├─ Track
├─ 演奏位置
└─ Noteの長さ
```

### 音程

シャオンダマや音楽Gameplayで使用する音程を取得します。

### オクターブ

元のNoteが持つオクターブ情報を保持します。

オクターブをGameplayでどのように利用するかは、それぞれのGameplay仕様を正とします。

### Velocity

元NoteのVelocity情報を保持します。

VelocityをGameplayや音響表現へ使用するかどうかは別仕様を正とします。

### Track

そのNoteが、どの楽器・音楽パートに属しているかを識別するために使用します。

### 演奏位置

そのNoteが曲のどこで演奏されるかを保持します。

ゲーム実行時は`TempoMap`を使用して、音楽位置から実際の再生時間へ変換します。

### Noteの長さ

元Noteの長さを保持します。

---

## Tempo・拍子

MIDIには、FLACと対応する、

- Tempo
- Tempo変更
- 拍子
- 拍子変更

を正しく残します。

これらは`TempoMap`を構築し、

```text
小節
拍
Tick
↓
実際のBGM再生位置
```

へ変換するために使用します。

途中でTempoや拍子が変化する曲では、その変更情報を削除してはいけません。

---

## Track構成

作曲時の楽器・音楽パートは、MIDI書き出し後にもTrackとして識別できる状態にします。

例：

```text
Piano
Guitar
Bass
LeadSynth
Pad
Drums
```

すべてのDAW Trackを必ずMIDIへ含める必要はありません。

一方で、Gameplayで利用する可能性のあるTrackについては、必要なNote情報をMIDIへ残します。

```text
DAW
├─ Piano
├─ Guitar
├─ Bass
├─ Pad
└─ Drums

↓

MIDI
├─ Piano
├─ Guitar
├─ Bass
└─ Gameplayで必要なその他Track
```

音作り専用のAudio Trackなど、Gameplay用のNote情報を持たないTrackを、無理にMIDIへ変換する必要はありません。

---

## Track命名

MIDIのTrack名は、サウンド班・プランナー・プログラマーが同じTrackを一意に識別できる名前にします。

### 基本ルール

Track名は、

- 空欄にしない
- 同じMIDI内で意味が重複しないようにする
- 楽器または音楽上の役割が分かる名前にする
- DAWからMIDIへ書き出した後も対応関係を確認できる名前にする
- 修正版でも同じ役割のTrackは原則として同じ名前を維持する

ことを基本とします。

例えば、

```text
Track 1
Track 2
Track 3
```

のように内容を判断できない名前は使用しません。

同じ楽器を複数Trackで使用する場合は、役割を区別できる名前にします。

例：

```text
Guitar_Rhythm
Guitar_Lead
```

具体的な英字・大文字小文字・Prefixなどのプロジェクト共通命名規則は、現時点では固定しません。

### Gameplay情報をTrack名へ埋め込まない

以下のようなGameplay上の状態を、Track名そのものへ依存させません。

```text
Shaondama生成 ON / OFF
AttackEvent
Random Section
```

例えば、

```text
PB_ATTACK
PB_RANDOM
```

などのゲーム専用Trackを作成する必要はありません。

Gameplay上でどのTrackを使用するかは、MusicChart側の設定を正とします。

---

## Gameplay利用候補Track

MIDIへ含まれているTrackが、すべてGameplayで使用されるとは限りません。

```text
MIDI
├─ Piano
├─ Guitar
├─ Bass
├─ Pad
└─ Drums
```

に対して、

```text
MusicChart

Shaondama Settings
├─ Piano    ON
├─ Guitar   ON
├─ Bass     OFF
├─ Pad      OFF
└─ Drums    OFF
```

のようにGameplayで使用するTrackを選択します。

### サウンド班

サウンド班は、

> **音楽的にGameplayへ利用可能なTrack**

を判断・提示します。

### プランナー

プランナーは、その候補をもとに、

> **Gameplayとして実際に使用するTrack**

を決定します。

### プログラマー

プログラマーは、決定された内容をMusicChartへ設定できるようにします。

MIDIへTrackが存在することと、GameplayでそのTrackを使用することは別です。

---

## AttackEventについて

AttackEventはMIDIには記録しません。

以下の情報はUnityの`MusicChart`へ手動設定する情報として扱います。

```text
AttackEvent
├─ 発生位置
├─ 必要音
├─ Type
│  ├─ Chord
│  └─ Arpeggio
├─ Arpeggio情報
├─ 予告
└─ Harmony
```

Random Sectionについても、MIDIへ直接記録しません。

```text
Random Section
├─ 開始位置
├─ 終了位置
├─ AttackEvent候補
└─ 選択数
```

AttackEventの音楽的な内容については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

AttackEvent情報をサウンド班からプランナー・プログラマーへ渡す工程については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

---

## FLAC / MIDI同期条件

FLACとMIDIは、同じBGMの時間軸を表している必要があります。

最低限、以下を一致させます。

- 曲の開始基準
- Tempo
- Tempo変更
- 拍子
- 拍子変更
- 各Noteの音楽上の演奏位置

### 開始位置

FLACとMIDIは、同じDAW Projectから同じ開始基準でExportします。

```text
FLAC
0 ─────────────────────→

MIDI
0 ─────────────────────→
```

片方だけ冒頭の無音を削除するなど、開始位置をずらす編集をしてはいけません。

### 音楽位置

MIDI内のNoteが示す小節・拍・Tickと、FLAC内で実際にその音楽が演奏される位置が対応している必要があります。

```text
MIDI
8小節目 1拍目
C / E / G

↓

FLAC
8小節目 1拍目に対応する再生位置
```

FLACとMIDIの同期に問題がある状態を、Unity側の`Sync Settings`だけで恒常的に補正することを前提にしません。

元データの開始位置やTempoなどに問題がある場合は、サウンド班側の元データを修正します。

---

## LoopするBGM

現在の戦闘BGMは、BGMがLoopした場合に、

```text
BGM
終端
↓
先頭

MusicChart
終端
↓
先頭
```

として同じ周回位置へ戻ることを前提とします。

そのため、LoopするBGMについても、基本的に、

```text
1つのFLAC
+
1つのMIDI
```

を1セットとして用意します。

### Loop時の条件

FLACとMIDIは、同じ周回構造を表している必要があります。

サウンド班は、

- FLACを終端から先頭へ戻したときに意図した音楽として成立する
- MIDI側の音楽時間軸も同じ周回範囲として扱える
- Tempo / 拍子 / Noteの位置が周回後も対応する

ことを確認します。

Intro部分とLoop部分を別ファイルへ分割する方式などは、現時点の基本仕様として採用していません。

将来その構造が必要になった場合は、BGM再生ライフサイクル側の仕様と合わせて別途定義します。

BGM Loop時のGameplay挙動については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## Export設定

### FLAC

FLACは完成BGMのマスター素材としてExportします。

Export時は、

- DAW Project上の完成したMixから出力する
- MIDIと同じ楽曲状態から出力する
- MIDIと同じ開始基準を使用する
- 制作用のメトロノームや確認音を含めない

ことを必須とします。

### MIDI

MIDI Exportでは、

- Tempo
- Tempo変更
- 拍子
- 拍子変更
- 必要なTrack
- Note
- 音程
- オクターブ
- Velocity
- 演奏位置
- Noteの長さ

を保持します。

Export処理によって、Gameplayで必要なNote情報を意図せず削除・変更しないようにします。

### サンプルレート等

FLACの、

- サンプルレート
- bit depth
- チャンネル構成

のプロジェクト共通値は、現時点では未決です。

これらは**曲ごとにサウンド班が独自の値を選ぶものにはせず、プロジェクト共通のExport設定として決定後に統一します。**

具体値が確定するまでは、既存素材と同じプロジェクト設定を維持し、異なる値へ変更する必要がある場合はプログラマーと確認します。

Unity Import後の圧縮形式やLoad Typeについては、Unity側のImport設定を正とします。

---

## ファイル命名

DAW Project・FLAC・MIDIは、同じBGMに属するデータであることを一意に識別できるようにします。

基本的な対応関係は、

```text
<BgmId>
├─ DAW Project
├─ <BgmId>.flac
└─ <BgmId>.mid
```

とします。

`<BgmId>`は、そのBGMをプロジェクト内で一意に識別するIDです。

### 基本ルール

- FLACとMIDIで同じ`BgmId`を使用する
- 同じ名前で別のBGMを表さない
- 同じBGMのFLACとMIDIで無関係な名前を使用しない
- ファイル名だけを見て対応するFLAC / MIDIを識別できる状態にする

具体的な、

- BGM IDの採番方法
- Prefix
- 大文字 / 小文字
- 区切り文字

などの共通命名規則は、現時点では未決です。

確定後は全BGMで統一し、曲ごとの独自命名を行いません。

---

## 修正版の扱い

修正版を作成しても、

> **同じBGMであることを示すBgmId**

は維持します。

例えば、音源やMIDIを修正したことだけを理由に、別のBGMとして扱いません。

```text
BGM A
↓
修正
↓
BGM A
```

### 修正内容に応じたExport

修正時に何を再Exportするかは、変更内容によって決定します。

#### FLACだけ変更した場合

MIDIの音楽情報に変更がなければ、FLACのみ再Exportできます。

#### MIDIの音楽情報を変更した場合

Note / Tempo / Track / 演奏位置などを変更した場合は、MIDIを再Exportします。

#### FLACとMIDIの両方へ影響する場合

同じDAW Projectの最新状態から両方を再Exportします。

再Export / 再Importの制作工程については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

MusicChart側で何が更新・保持されるかについては、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

### バージョン表記

修正版ファイルへどのようにRevision番号を付けるか、またはUnity納品ファイル名を固定して履歴を別管理するかについては、現時点では共通規則を固定しません。

ただし、

```text
final
final2
final_final
最新
本当の最新
```

のように、どれが現在使用すべきデータか判断できない状態を作ってはいけません。

常に、Unityへ渡す現在版を一意に識別できる状態にします。

---

## Unityへの納品

サウンド班は、1曲分のBGM制作データを同じBGMとして識別できる状態でプログラマーへ渡します。

最低限、以下を揃えます。

```text
BGM納品セット
├─ DAW Project
├─ FLAC
├─ MIDI
├─ AttackEvent情報
└─ Random Section候補
   ※存在する場合
```

AttackEventとRandom SectionはMIDIへ埋め込まず、別の設定情報として渡します。

受け渡し工程やプランナー確認については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

### UnityへのImport

サウンド班はUnity内部のImport処理やMusicChart設定を直接担当することを前提としません。

```text
サウンド班
↓
BGM制作データを受け渡す
↓
プログラマー
↓
Unity Import
↓
MusicChart生成・設定
```

Import後は、サウンド班もゲーム内で音楽・同期結果を確認します。

### 納品位置

具体的な、

- 共有フォルダ
- Unity Project内の配置先
- DAW Projectの保管場所
- 納品用ディレクトリ

は現時点では共通仕様として未決です。

ただし、納品位置に関係なく、

> **同じBGMに属するDAW Project / FLAC / MIDI / 設定情報を一意に追跡できること**

を必須とします。

具体的な保存先が確定した場合は、このページを正として追記します。

---

## 禁止事項

以下を禁止します。

- MIDIそのものを完成BGMの音源として使用する
- FLACとMIDIを異なるDAW Projectの状態から書き出す
- FLACだけ冒頭を削除するなど、FLAC / MIDIの開始基準をずらす
- Tempoや拍子変更をMIDIから意図せず削除する
- Gameplayに必要なNote情報をMIDI Export時に削除する
- Track名をすべて`Track 1`など識別不能な名前にする
- Track名へAttackEventやRandom Sectionそのものを埋め込むことを前提にする
- AttackEventをMIDIへ記録することを必須とする
- MIDIにTrackが存在するだけでGameplay使用Trackと判断する
- 修正版でFLACだけ更新し、対応するMIDIとの同期が壊れた状態を納品する
- Unity側の同期補正だけで、元データの恒常的な同期不良を解決することを前提にする
- どれが現在版か判断できない複数の修正版を同時に納品する
- BGMごとにサンプルレートなどのExport設定を独自判断で変更する

---

## 未決事項

現時点では、以下のプロジェクト共通値・管理規則は未決です。

| 項目 | 現在の扱い |
| --- | --- |
| FLACのサンプルレート | 未決。確定後は全BGMで共通化する |
| FLACのbit depth | 未決。確定後は全BGMで共通化する |
| FLACのチャンネル構成 | 未決。確定後は全BGMで共通化する |
| `BgmId`の具体的命名規則 | 未決 |
| Revision番号の具体的な表記方法 | 未決 |
| DAW Project / 納品データの具体的保存先 | 未決 |

これらは曲単位で独自に決定せず、プロジェクト共通仕様として確定した時点で本ページへ反映します。

---

## 他仕様との責務境界

本ページは、

> **DAWからUnityへ渡すBGM制作データの技術仕様**

だけを正とします。

| 内容 | 正とする仕様 |
| --- | --- |
| サウンド制作開始からゲーム内確認までの工程 | [サウンド班制作フロー](/spec/bgm/sound-production-workflow) |
| MusicChartの構造・Import / ReImport | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| AttackEventの音楽的仕様 | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| Random Section | [BGM Random Section仕様](/spec/bgm/bgm-random-section) |
| BGMとGameplay結果の音響接続・Loop挙動 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| Gameplayで使用するTrackの最終決定 | プランナー側のGameplay仕様 |
| モード／コンダクトのGameplay上の意味とRuntime境界 | [Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct) |
