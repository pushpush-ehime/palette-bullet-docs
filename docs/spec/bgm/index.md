---
title: "サウンド / BGM"
description: Palette Bulletにおけるサウンド・BGM全体像と各詳細仕様への入口
pageType: spec
category: "BGM"
categoryOrder: 90
order: 0
status: 仮仕様
collapsed: false
---

# サウンド / BGM

## 目的

本ページでは、Palette Bulletにおける**サウンド / BGM仕様全体の入口**として、

* サウンドがゲーム内で担う役割
* 現在仕様として扱っているサウンド領域
* BGMの基本構造
* BGMとGameplayの関係
* サウンド班が用意する成果物
* 各詳細仕様ページの責務
* 他カテゴリとの責務境界
* どの仕様を正として参照するか

を整理します。

本ページでは、個別のファイル書き出し条件、AttackEventのデータ構造、Slot割り当て、Player入力などの詳細ルールは定義しません。

詳細は、それぞれの仕様ページを正とします。

## Palette Bulletにおけるサウンドの役割

Palette Bulletでは、サウンドは単なる演出ではなく、Gameplayそのものと接続する要素です。

戦闘中は、完成済みのBGMを土台として再生しながら、Playerの行動によって生まれた音を追加します。

```text
完成済み戦闘BGM
+
Playerが鳴らした音
+
Gameplay SE
↓
プレイヤーが実際に聞く音
```

特にパレットブレットの音程音は、

> **Player自身が音楽へ参加したことを表現する音**

として扱います。

BGMはPlayerの成功・失敗によって置き換えるのではなく、そのまま進行します。

その上へ、AttackEventが成立した場合にPlayer由来の音を重ねます。

BGMとGameplay結果の具体的な音響接続については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。


## 現在扱うサウンド領域

現在のサウンド仕様では、以下の領域を扱います。

| サウンド領域      | 現在の状態    | 本カテゴリでの扱い                                       |
| ----------- | -------- | ----------------------------------------------- |
| 戦闘BGM       | **扱う** | 楽曲制作、音楽データ、Gameplayとの同期を扱う                      |
| パレットブレット音程音 | **扱う** | Playerが音楽へ参加した結果としてBGMへ重ねる音を扱う                  |
| Gameplay SE | **扱う** | 発射・着弾・シャオンダマなど、Gameplayから要求されるSound Eventに応じて扱う |
| UI Sound    | **扱う**   | 現時点では制作・分類ルールを定義しない                             |
| Ambience    | **扱う**   | 現時点では制作・分類ルールを定義しない                             |
| Voice       | **未決**   | 現時点では制作・分類ルールを定義しない                             |

`未決`となっている領域について、一般的なゲームで使用されるという理由だけで素材やカテゴリを追加しません。

必要性がGameplayや演出仕様として決定した時点で、必要に応じて仕様を追加します。

また、`未決`は`現段階では対象外`と同じ意味ではありません。

対象外とする場合は、別途仕様として明示します。

---

## BGMの基本構造

Palette Bulletでは、1曲の戦闘BGMについて基本的に、

* DAWプロジェクト
* FLAC
* MIDI

を用意します。

```text
DAW Project
│
├─ FLAC
│   ↓
│   Unity Import
│   ↓
│   AudioClip
│   ↓
│   戦闘BGMとして再生
│
└─ MIDI
    ↓
    Unityで変換
    ↓
    MusicChart
    ├─ TempoMap
    └─ NoteEvents
```

### FLAC

FLACは、完成したBGMをUnityへ渡すためのマスター素材として使用します。

UnityへImportした後、生成された`AudioClip`を戦闘BGMとして再生します。

### MIDI

MIDIは音源として再生しません。

BGMから、

* Tempo
* 拍子
* Note
* 音程
* オクターブ
* Track
* 演奏位置

などの音楽情報を取得し、`MusicChart`へ変換するために使用します。

AttackEventやRandom Sectionなどのゲーム専用情報をMIDIへ直接記録することは、現段階では行いません。

DAW / FLAC / MIDIの具体的な制作・書き出し条件については、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)を正とします。

`MusicChart`のデータ構造、Import / ReImportについては、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

---

## BGMとGameplayの関係

BGMから取得した音楽情報は、シャオンダマ・Charge・AttackEventを通してGameplayへ接続されます。

基本的な流れは以下です。

```text
MIDI
↓
MusicChart
↓
NoteEvent
↓
シャオンダマ
↓
Charge
↓
パレットブレット
```

これとは別に、`MusicChart`へAttackEventを設定します。

```text
BGM進行
↓
AttackEvent予告
↓
AttackEvent発火
↓
成立判定
│
├─ 不成立
│   ↓
│   BGMはそのまま進行
│
└─ 成立
    ↓
    パレットブレット発射
    +
    パレットブレットの音程を発音
    +
    Gameplay SE
```

AttackEvent成立時に鳴るパレットブレットの音程音は、元BGMを置き換えません。

```text
完成済みBGM
+
パレットブレット音程音
+
Gameplay SE
```

として再生します。

Chord / Arpeggioの発音、AttackEvent不成立時、Pause / Resume、BGM Loop、Battle終了、Retryなどの詳細については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## サウンド班の成果物

サウンド班は、サウンド仕様やGameplay側から要求された内容に応じて、主に以下を用意します。

| 項目               | サウンド班が行うこと                                | 詳細を正とする仕様            |
| ---------------- | ----------------------------------------- | -------------------- |
| DAWプロジェクト        | 楽曲の制作元データを管理する                            | BGM MIDIファイルの設定      |
| FLAC             | 完成したBGMのマスター素材を書き出す                       | BGM MIDIファイルの設定      |
| MIDI             | Gameplayで使用する音楽情報を残して書き出す                 | BGM MIDIファイルの設定      |
| AttackEventの音楽設計 | 攻撃に使用したい音楽位置・必要音・Chord / Arpeggioなどを設計する  | BGM 攻撃イベント仕様         |
| Random Section候補 | 音楽的にAttackEventとして使用可能な候補を提示する            | BGM Random Section仕様 |
| パレットブレット音程音      | Gameplayから要求された音程を正しく発音できる音を制作する          | BGMとGameplayの接続      |
| Gameplay SE      | Gameplay仕様から要求されるSound Eventに対応する音素材を制作する | 各Gameplay仕様          |

サウンド班は、Gameplay上のSlot割り当てやAttackEvent成立条件そのものを決定しません。

また、UI Sound・Ambience・Voiceについては、必要性や仕様が決定する前に独自判断で制作対象へ追加しません。

### Unityへの受け渡し

サウンド班が制作した素材や音楽情報をUnityへどのような工程で受け渡すかについては、今後追加する`サウンド班制作フロー`を正とします。

個別のBGMについて、

* 誰が何を決めるか
* 誰へ何を渡すか
* Unity Import後に何を確認するか
* 修正時にどのデータを再Exportするか
* 完成と判断する条件

などは、本ページでは定義しません。

---

## 各仕様ページの責務

BGMカテゴリ内の各ページは、以下の責務に分けます。

### [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)

> **BGMの時間軸とGameplay結果が、最終的な音としてどう接続するか**

を正とします。

主に、

* 完成済みBGMとPlayer音の関係
* パレットブレット音程音
* Gameplay SEとのレイヤー関係
* Chord / Arpeggioの発音
* BGM同期
* Pause / Resume
* Loop
* Battle終了 / Retry

を扱います。

### [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)

> **DAWからUnityへ渡すBGM制作データの技術仕様**

を正とします。

主に、

* DAWプロジェクト
* FLAC
* MIDI
* MIDIに残す情報
* Track
* FLAC / MIDIの同期条件
* Export条件

を扱います。

### [BGM MusicChart仕様](/spec/bgm/bgm-music-chart)

> **MusicChartのデータ構造と、Importデータ・手動設定データの境界**

を正とします。

主に、

* TempoMap
* NoteEvents
* Shaondama Settings
* Attack Events
* Random Sections
* Sync Settings
* Import / ReImport

を扱います。

### [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)

> **音楽上どこに、どのようなAttackEventを設定するか**

を正とします。

主に、

* 発生位置
* 必要音
* Chord / Arpeggio
* Arpeggioの順序・音楽的タイミング
* Harmony
* 予告
* AttackEventの発火

を扱います。

Slot割り当てやAttackEventの成立条件そのものは扱いません。

### [BGM Random Section仕様](/spec/bgm/bgm-random-section)

> **AttackEvent候補群から、その周回で使用するAttackEventを選択するルール**

を正とします。

AttackEvent自体の音楽情報は「BGM 攻撃イベント仕様」を参照します。

### サウンド班制作フロー

> **サウンド素材の制作開始からUnity上での確認までの恒久的な制作工程**

を正とするページです。

このページは今後新規作成します。

---

## 移行中の既存ページ

現在のBGMカテゴリには、責務整理前のページが一部残っています。

### `bgm-make-syaonndama.md`

このページで扱っている、

> `NoteEvent`からシャオンダマをどのように生成するか

という仕様は、最終的にシャオンダマカテゴリの[MIDI駆動生成](/spec/shaondama-music/midi-driven-spawning)へ統合します。

統合完了後は、`bgm-make-syaonndama.md`をBGM仕様の正として使用しません。

### `bgm-attack-judgement.md`

AttackEvent発火後の、

* Slot照合
* 成立条件
* 成功 / 失敗
* 使用するパレットブレットの決定

はBGMの責務ではありません。

これらは最終的にチャージシステム側へ統合します。

統合完了後は、`bgm-attack-judgement.md`をBGM仕様の正として使用しません。

移行中のページへ新しい責務を追加せず、統合先となる仕様を基準に整理します。

---

## 他カテゴリとの責務境界

サウンド / BGMカテゴリは、

> **音として何を作るか、音楽データをどう渡すか、音楽上いつ何を要求するか、Gameplayと音がどう接続するか**

を扱います。

Gameplay自体のルールは、それぞれのカテゴリを正とします。

| カテゴリ            | 正とする内容                                    |
| --------------- | ----------------------------------------- |
| サウンド / BGM      | 音素材、BGM制作データ、音楽イベント、BGM同期、Gameplay結果の音響接続 |
| シャオンダマ          | `NoteEvent`から何をいつ生成するか、シャオンダマ自体が持つデータ     |
| チャージシステム        | AttackEventのSlot、割り当て、成立判定、使用弾の決定         |
| Player          | Chargeを含むPlayer入力・Player Action           |
| Battle / Combat | 戦闘全体の進行や戦闘結果など、音楽以外のBattleルール             |

### サウンド班

サウンド班は、

* 楽曲を制作する
* DAW / FLAC / MIDIを用意する
* AttackEventの音楽的意図を設計・提示する
* パレットブレット音程音を制作する
* 必要なGameplay SEを制作する
* BGMと追加音を合わせた音響確認を行う

ことを担当します。

### プランナー

プランナーは、

* Gameplayとして必要なサウンド要件を決める
* AttackEventがGameplayとして成立するか確認する
* Gameplayパラメータを決定する
* サウンド班から提示された音楽的候補をGameplayへ採用するか判断する

ことを担当します。

### プログラマー

プログラマーは、

* サウンド素材をUnityへImportする
* MusicChart生成・設定環境を実装する
* BGMを再生する
* BGMとGameplayを同期する
* AttackEventから発音・発射タイミングを制御する
* 必要なSound Eventをゲーム内で再生する

ことを担当します。

本Web仕様書では、具体的なクラス構造などの内部実装方法までは定義しません。

---

## 仕様の正一覧

迷った場合は、以下のページを正として参照します。

| 確認したい内容                         | 正とするページ                                                 |
| ------------------------------- | ------------------------------------------------------- |
| サウンド / BGM全体像・どの仕様を読むか          | **本ページ**                                                |
| BGMとGameplay結果が最終的にどう聞こえるか      | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)    |
| DAW / FLAC / MIDIの制作・書き出し条件     | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)          |
| MusicChartの構造・Import / ReImport | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart)           |
| AttackEventを音楽上どこへ・どのように設定するか   | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)              |
| Random Sectionの候補・抽選ルール         | [BGM Random Section仕様](/spec/bgm/bgm-random-section)    |
| サウンド班からUnityまでの制作・受け渡し工程        | **サウンド班制作フロー（新規作成予定）**                                  |
| `NoteEvent`からシャオンダマを生成するルール     | [MIDI駆動生成](/spec/shaondama-music/midi-driven-spawning)  |
| AttackEventのSlot割り当て・成立判定       | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| PlayerのCharge入力・Action          | [Playerアクション｜チャージ](/spec/player/player-action-charge)   |

同じ仕様を複数ページで独立して定義しません。

ページ間で内容が重複した場合は、この一覧で示した責務を持つページを正として整理します。
