---
title: "BGMとGameplayの接続"
description: Palette BulletにおけるBGMの時間軸とGameplay結果の音響接続仕様
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks: []
---

# BGMとGameplayの接続

## 目的

本ページでは、Palette Bulletにおける、

> **BGMの時間軸とGameplayの結果が、最終的にプレイヤーへ聞こえる音としてどのように接続されるか**

を定義します。

本ページでは主に以下を扱います。

- 戦闘BGMとGameplay音の関係
- AttackEvent成立後の音響処理
- パレットブレットが持つ音程の発音
- Chord / Arpeggioの発音
- BGMとの同期
- Pause / Resume
- BGM Loop
- Battle終了 / Retry

AttackEventのSlot割当、成立条件、Playerの入力方法、パレットブレットのGameplay上の挙動そのものは本ページでは定義しません。

それぞれの詳細仕様を正とします。

---

## BGMとGameplayの全体接続

Palette Bulletでは、完成済みの戦闘BGMを再生しながら、Gameplayによって発生した音をBGMへ追加します。

基本構造は以下です。

```text
DAW Project
├─ FLAC
│   ↓
│   UnityへImport
│   ↓
│   AudioClip
│   ↓
│   戦闘BGMとして再生
│
└─ MIDI
    ↓
    MusicChart
    ├─ TempoMap
    └─ NoteEvents
         ↓
         シャオンダマ
         ↓
         Charge
         ↓
         パレットブレット
```

これとは別に、`MusicChart`にはAttackEventが設定されます。

```text
MusicChart
↓
AttackEvent
↓
予告
↓
発火
↓
AttackEvent成立判定
│
├─ 不成立
│   ↓
│   パレットブレット由来の音程音は鳴らさない
│
└─ 成立
    ↓
    AttackEventのType・タイミングに従う
    ↓
    パレットブレット発射
    +
    パレットブレットの音程を発音
    +
    Gameplay SE
```

AttackEventが成立しても、元の戦闘BGMを置き換えたり停止したりはしません。

```text
完成済み戦闘BGM
+
Playerが鳴らした音
+
Gameplay SE
↓
最終的にプレイヤーが聞く音
```

この構造によって、Playerの行動によって生まれた音を、進行中のBGMへ重ねていきます。

---

## 音楽再生の基本構造

### 戦闘BGM

ゲーム内で使用する戦闘BGMのマスター素材にはFLACを使用します。

FLACをUnityへImportし、生成された`AudioClip`を戦闘BGMとして再生します。

```text
FLAC
↓
Unity Import
↓
AudioClip
↓
戦闘BGM
```

Unity内部で使用する圧縮形式やLoad TypeなどのImport設定は、対象プラットフォームやパフォーマンス要件に応じて決定します。

FLACそのものを実行時形式として固定することは本仕様の目的ではありません。

### MIDI

MIDIは音源として再生しません。

MIDIは、

- Tempo
- 拍子
- Note
- 音程
- オクターブ
- Track
- 演奏位置

などの音楽情報をUnityへ渡すために使用します。

```text
MIDI
↓
MusicChart
↓
Gameplayで使用
```

MIDIの書き出し条件については「BGM MIDIファイルの設定」を正とします。

MusicChartのデータ構造については「BGM MusicChart仕様」を正とします。

---

## 音のレイヤー

戦闘中に聞こえる音は、少なくとも以下の役割に分けて扱います。

| レイヤー | 役割 |
| --- | --- |
| 戦闘BGM | 完成済み楽曲を再生する |
| パレットブレットの音程音 | Playerが音楽へ参加した結果を鳴らす |
| Gameplay SE | 発射・着弾など、Gameplayの手触りを表現する |

パレットブレットの音程音は、通常の攻撃SEとは別の役割を持ちます。

```text
パレットブレット発射
├─ 音程を持つ音
└─ 攻撃SE
```

両方を同時に使用できます。

BGM、パレットブレットの音程音、Gameplay SEは、最終的なMixで個別に音量や音響処理を調整できる構造とします。

具体的なdB値やMixバランスは本ページでは固定しません。

---

## AttackEventとGameplayの接続

AttackEventは、BGM上の特定の演奏位置でGameplayへ攻撃タイミングを通知します。

```text
BGM進行
↓
AttackEvent予告
↓
AttackEvent発生位置
↓
AttackEvent発火
↓
成立判定
```

AttackEventの発火は、

> **「この音楽位置で攻撃を評価する」**

ことをGameplayへ通知するものです。

AttackEventの発火だけでは、パレットブレットの音程音は鳴りません。

成立判定の結果によって、その後の音響処理を決定します。

```text
AttackEvent発火
↓
成立判定
│
├─ 不成立
│   ↓
│   音程音なし
│
└─ 成立
    ↓
    パレットブレット発射処理
    ↓
    音程音を再生
```

AttackEventの発生位置・必要音・Type・Harmony・予告などの音楽的情報については「BGM 攻撃イベント仕様」を正とします。

Slotへの割り当てやAttackEventの成立条件については、チャージシステム側の仕様を正とします。

---

## Charge成功後の音響処理

シャオンダマのCharge成功と、パレットブレットの音程音を鳴らすタイミングは別です。

Chargeに成功した時点では、そのシャオンダマはパレットブレット化され、対応するAttackEventで使用できる状態になります。

```text
シャオンダマ選択
↓
Charge成功
↓
パレットブレット化
↓
AttackEventに保持
```

この時点では、

> **AttackEventで使用する音程音はまだ発音しません。**

AttackEventが成立し、実際にパレットブレットを発射するタイミングになった時点で発音します。

```text
Charge成功
↓
待機
↓
AttackEvent発火
↓
成立
↓
発射タイミング
↓
パレットブレット発射
+
音程音を発音
```

シャオンダマ選択時やCharge成功時に別のGameplay SEを鳴らす場合、そのSound Eventは各Gameplay仕様を正とします。

---

## パレットブレットが持つ音程

シャオンダマは、元になった`NoteEvent`から音程情報を受け取ります。

Charge成功によってパレットブレット化した後も、発音に必要な音程情報を引き継ぎます。

```text
MIDI Note
↓
NoteEvent
↓
シャオンダマ
↓
Charge
↓
パレットブレット
↓
発射
↓
その音程を使って発音
```

パレットブレットの音程音は、単なる攻撃SEではありません。

BGMと同時に鳴ることで、

> **Player自身が音楽へ参加したことを表現する音**

として扱います。

パレットブレットの具体的な音色、収録・生成方法、必要な素材数などはサウンド制作側で決定します。

ただし、Gameplayから要求された音程を正しく再生できることを必須条件とします。

---

## Chordの発音

`Type = Chord`のAttackEventでは、成立したパレットブレットを同じ音楽位置で発射します。

同時に、それぞれのパレットブレットが持つ音程を同時発音します。

例：

```text
AttackEvent

Type
Chord

必要音
C / E / G
```

成立した場合、

```text
AttackEvent発生位置
↓
C / E / G のパレットブレットを同時発射
↓
C + E + G を同時発音
```

となります。

Chordの「同時」とは、同じBGM上の演奏位置で発射・発音することを意味します。

パレットブレットの飛翔時間や着弾タイミングは本ページでは定義しません。

---

## Arpeggioの発音

`Type = Arpeggio`のAttackEventでは、複数のパレットブレットをAttackEventに設定された順序とタイミングに従って発射します。

発射と同時に、そのパレットブレットの音程を発音します。

例：

```text
AttackEvent

Type
Arpeggio

C
↓
E
↓
G
```

成立した場合、

```text
AttackEvent開始
↓
C 発射 + C発音
↓
楽曲上の指定間隔
↓
E 発射 + E発音
↓
楽曲上の指定間隔
↓
G 発射 + G発音
```

となります。

### Arpeggioのタイミング

Arpeggioの各音の間隔には、ゲーム全体で共通の固定秒数を使用しません。

そのAttackEventが元にしている楽曲上の演奏タイミングに合わせて、AttackEventごとに設定します。

```text
楽曲上のArpeggio

C ── E ─ G
      ↑   ↑
      楽曲本来の演奏間隔
```

↓

```text
AttackEvent

C発射
↓
同じ音楽的間隔
↓
E発射
↓
同じ音楽的間隔
↓
G発射
```

Arpeggioの各発射・発音タイミングはBGMの時間軸上の位置として扱います。

実際の再生時間への変換には`TempoMap`を使用します。

具体的にAttackEventへどのようなデータとして保持するかは「BGM 攻撃イベント仕様」および「BGM MusicChart仕様」を正とします。

---

## AttackEvent不成立時

AttackEventが不成立だった場合、パレットブレット由来の音程音は鳴らしません。

```text
AttackEvent発火
↓
不成立
↓
パレットブレット由来の音程音なし
```

戦闘BGM自体はそのまま進行します。

```text
BGM
━━━━━━━━━━━━━━━━━━→

AttackEvent
       ↓
     不成立

BGM
━━━━━━━━━━━━━━━━━━→
```

不成立だからといって、

- BGMを停止する
- BGM内の音を消す
- BGM内の音を別の音へ置き換える

といった処理は行いません。

失敗をPlayerへ伝えるためのSEやUI演出を使用する場合、その具体的な内容はGameplay側のSound EventやUI仕様を正とします。

本ページでは、AttackEvent不成立時に代替となる音楽音を自動再生する仕様は持ちません。

---

## 元BGMとの音響的関係

パレットブレットの音程音は、完成済みBGMを置き換えるものではありません。

基本構造は常に、

```text
完成済みBGM
+
パレットブレットの音程音
```

です。

例えば元BGM内ですでにC Majorのコードが鳴っている場所で、

```text
C
E
G
```

のAttackEventが成立した場合も、元BGMの音を削除せず、その上へPlayerの音を追加します。

```text
元BGM
C Major
━━━━━━━━━━━━━━→

Player
        C + E + G
        ↑
        AttackEvent

最終出力
元BGM + PlayerのC/E/G
```

これにより、

> **完成された楽曲を維持しながら、Playerの成功によって音楽が追加される**

構造とします。

---

## BGMとの同期基準

BGMとGameplayの音楽同期では、

> **実際に再生されているBGMのオーディオ時間軸**

を基準とします。

Gameplay側のアニメーション、描画フレーム、通常のゲーム進行時間を独立した音楽基準にはしません。

MusicChart上の、

```text
小節
拍
Tick
```

を`TempoMap`によって実際のBGM再生位置へ変換します。

```text
MusicChart

16小節目
3拍目
120 Tick
↓
TempoMap
↓
BGM上の再生位置
↓
AttackEvent
↓
パレットブレット発射
+
発音
```

Chord・Arpeggioを含むBGM同期Gameplay音も、同じBGM時間軸を基準にします。

### 同期補正

BGMとGameplay音の間に再生環境などによるズレが存在する場合は、`MusicChart`の`Sync Settings`による補正を使用します。

具体的な補正値や実装方法については「BGM MusicChart仕様」を正とします。

---

## BGM再生ライフサイクル

戦闘BGMとBGM同期Gameplay処理は、同じ音楽時間軸を共有します。

基本的なライフサイクルは以下です。

```text
Battle開始
↓
BGM開始
↓
MusicChart時間軸開始
↓
AttackEvent進行
↓
Gameplay
↓
BGM Loop
または
Battle終了
```

### BGM開始

BGM開始時には、BGMの再生位置とMusicChartの時間軸を同じ開始位置に合わせます。

```text
BGM
0

MusicChart
0
```

以降のNoteEvent・AttackEvent・Gameplay音は、この共通時間軸を基準に処理します。

### BGM Loop

BGMがLoopする場合は、

```text
BGM再生位置
+
MusicChart時間軸
```

を同じ周回位置へ戻します。

```text
BGM終端
↓
Loop
↓
BGM先頭

MusicChart終端
↓
Loop
↓
MusicChart先頭
```

次の周回で使用するAttackEventや音楽イベントも、新しい周回の時間軸を基準として処理します。

Random Sectionの再抽選など、各イベントの周回時ルールについてはそれぞれの仕様ページを正とします。

---

## Pause / Resume

### Pause

Pause中は、戦闘BGMとBGMに同期しているGameplay音を同じタイミングで停止します。

```text
Pause
↓
BGM停止
+
BGM同期Gameplay音停止
+
音楽イベント進行停止
```

Pause中にAttackEventやArpeggioの次の音だけが進行することはありません。

### Resume

Resume時は、PauseしたBGM位置から再開します。

BGM同期Gameplay音や未発音の音楽イベントも、同じ時間関係を維持して再開します。

```text
Pause位置
↓
Resume
↓
同じBGM位置から再開
↓
同期関係を維持
```

ResumeによってBGMだけが先に進んだり、Arpeggioの発音順序がずれたりしないようにします。

---

## Battle終了 / Retry

### Battle終了

Battleが終了した場合は、戦闘BGMの再生を終了します。

同時に、その戦闘BGMの時間軸に紐づいている未発音の音楽イベントも終了します。

```text
Battle終了
↓
戦闘BGM終了
+
未発音AttackEvent終了
+
未発音Arpeggio音終了
```

Battle終了後に、終了した戦闘BGMに紐づくパレットブレットの音程音が新しく発音されることはありません。

Battle終了時のBGM Fade Outや、すでに発音済みの音の余韻をどこまで残すかは演出調整項目とします。

### Retry

Retryした場合は、戦闘BGMを曲頭から再開始します。

BGMに紐づく音楽進行状態も最初から開始します。

```text
Retry
↓
BGM
0から再開始

MusicChart
0から再開始

AttackEvent進行
最初から再開始
```

Retry前の周回で予定されていた未発音の音楽イベントは持ち越しません。

PlayerやChargeが持つGameplay上の状態をどこまで初期化するかは、それぞれのGameplay仕様を正とします。

---

## サウンド班・プランナー・プログラマーの責務

本仕様における基本的な責務は以下です。

| 担当 | 主な責務 |
| --- | --- |
| サウンド班 | 戦闘BGM制作、AttackEventの音楽的意図、パレットブレットの音程音制作、Gameplay SE制作、実際にBGMへ重ねた際の音響確認 |
| プランナー | AttackEventをGameplayとして採用可能か確認、Gameplayルールとの整合確認、必要なゲーム要件の決定 |
| プログラマー | BGM再生、MusicChartとの同期、AttackEventからの発音・発射タイミング制御、各音レイヤーを調整可能な再生環境の実装 |

サウンド班は、GameplayのSlot割当や成立判定ルールそのものを決定しません。

プログラマーは、楽曲上どこをAttackEventとして使用するか、どの音楽表現が適切かを独自に変更しません。

---

## 他仕様との責務境界

本ページは、

> **BGMの時間軸とGameplay結果が、最終的な音としてどう接続されるか**

だけを正とします。

### BGM MIDIファイルの設定

以下は「BGM MIDIファイルの設定」を正とします。

- DAW Project
- FLAC
- MIDI
- Track
- MIDI Export
- FLAC / MIDIの同期条件

### BGM MusicChart仕様

以下は「BGM MusicChart仕様」を正とします。

- TempoMap
- NoteEvents
- Attack Events
- Random Sections
- Shaondama Settings
- Sync Settings
- Import / ReImport

### BGM 攻撃イベント仕様

以下は「BGM 攻撃イベント仕様」を正とします。

- AttackEventの発生位置
- 必要音
- Type
- Chord / Arpeggio
- Harmony
- 予告
- Arpeggioの順序・音楽的タイミング

### チャージシステム

以下はチャージシステム側の仕様を正とします。

- Charge可能なAttackEvent
- Slot
- 自動割り当て
- 必要音との一致
- AttackEvent成立条件
- 使用するパレットブレットの決定

### Player

以下はPlayer仕様を正とします。

- Charge入力
- ClickCharging
- DragCharging
- Player Action
- パレットブレットを使用するためのPlayer操作

### シャオンダマ

以下はシャオンダマ側の仕様を正とします。

- NoteEventからのシャオンダマ生成
- シャオンダマが持つデータ
- 音程
- オクターブ
- 生成位置
- 浮遊・挙動

---

## 未決事項

現時点では、以下を調整・検討項目とします。

### パレットブレットの具体的な音色

パレットブレットがどのような楽器・音色で発音されるかは、サウンド制作時に決定します。

Gameplayから要求された音程を明確に再生でき、BGMへ重ねても音楽的に成立することを条件とします。

### 音程素材の制作方式

以下のどの方式を使用するかは現時点では固定しません。

- 音程ごとに個別素材を制作する
- 基準音からPitchを変更する
- 複数の基準音を使用する
- その他の音源方式を使用する

最終的な音質と実装コストを確認して決定します。

### オクターブの扱い

シャオンダマは元のNoteEventのオクターブ情報を保持します。

ただし、パレットブレット発音時に、

- 元シャオンダマのオクターブをそのまま使用するか
- AttackEvent側の音楽表現に合わせてオクターブを調整するか

は未決です。

### Track / Velocityと音色の関係

元NoteEventの`Track`や`Velocity`を、パレットブレットの音色・強さ・表現へ反映するかは未決です。

### Mixの具体値

BGM、パレットブレットの音程音、Gameplay SEの具体的な音量比・音響処理は、実際の楽曲とGameplayを使用して調整します。

固定のdB値は現段階では定義しません。

---

## 関連タスク

<PageRelations />
