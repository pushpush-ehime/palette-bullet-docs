---
title: "BGM 攻撃イベント仕様"
description: Palette BulletにおけるAttackEventの音楽的設計・設定仕様
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks:
* /tasks/music-chart-scriptableobject/pb-task-0016
* /tasks/music-chart-scriptableobject/pb-task-0017
---

# BGM 攻撃イベント仕様

## 目的

本ページでは、

> **AttackEventが持つ音楽情報と、BGM時間軸上の予告・発火タイミング**

を定義します。

通常AttackEventでは、BGMに対して、

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

* AttackEventとして使用する音楽位置
* 必要音
* Chord / Arpeggio
* Arpeggioの順序・音楽的タイミング
* Harmony
* 予告
* Charge受付期間に関係する時間情報
* 固定AttackEvent
* Random Sectionで使用するAttackEvent候補
* Weak AttackEventの音楽時間情報
* Gameplayへ渡す音楽情報
* サウンド班からUnityへの受け渡し

を扱います。

一方、以下は本ページでは定義しません。

* 現在Charge対象となるAttackEventの決定
* Slot構造
* Slot割り当て
* Slot優先順位
* 重複Charge
* 万能シャオンダマのSlot解決
* AttackEvent発火時の完全成立 / 不完全完成
* AttackEvent発火時に使用するCharge済みシャオンダマ実体
* Palette Bullet化・発射対象のGameplay判定

Charge対象AttackEventおよびSlot割り当てについては、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

AttackEvent発火時のGameplay成立判定・使用実体・攻撃処理については、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

---

## AttackEventとは

`AttackEvent`は、音楽上のタイミングとPlayerの攻撃を接続するための音楽Gameplay用イベントです。

本ゲームでは大きく、

```text
AttackEvent
├─ 通常AttackEvent
│  ├─ 固定AttackEvent
│  └─ Random Sectionから選択されるAttackEvent
│
└─ Weak AttackEvent
```

として扱います。

通常AttackEventは、BGM上の特定の演奏位置へ事前に設定するAttackEventです。

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

という通常AttackEventを設定できます。

```text
BGM
↓
8小節目 1拍目
↓
AttackEvent
↓
Gameplayへ通知
```

通常AttackEventはMIDIには記録しません。

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

Weak AttackEventはこれとは異なり、MusicChartへ通常AttackEventとして事前配置するものではありません。

Weak AttackEventについては後述します。

---

## AttackEventの責務

本ページが正本として持つAttackEventの責務は、

> **BGM上の音楽的位置・要求音・音楽表現・発火に必要な時間情報をGameplayへ伝えること**

です。

通常AttackEventでは、

```text
AttackEvent
├─ いつ
├─ どの音を
└─ どの音楽表現で使うか
```

を定義します。

一方、

```text
どのAttackEventへChargeするか
↓
どのSlotへ入るか
↓
各Slotへ何個Chargeされているか
↓
発火時に完全成立 / 不完全完成のどちらか
↓
どのシャオンダマ実体を攻撃へ使用するか
```

は、本ページの責務ではありません。

責務は以下のように分離します。

```text
AttackEvent音楽情報・時間情報
→ bgm-attack-event.md

Charge対象AttackEvent・Slot割り当て
→ draw-system/charge-allocation.md

AttackEvent発火時のGameplay判定・使用実体
→ bgm-attack-judgement.md
```

同じGameplay規則を本ページへ複製しません。

---

## 通常AttackEventが持つ情報

MusicChartへ設定する通常AttackEventは、基本的に以下の情報を持ちます。

```text
通常AttackEvent
├─ 発生位置
├─ 必要音
├─ Type
│  ├─ Chord
│  └─ Arpeggio
├─ Arpeggio情報
│  ├─ 順序
│  └─ 音楽的タイミング
├─ 予告時間
├─ Charge受付期間に関係する時間情報
└─ Harmony
   ├─ Root
   └─ Quality
```

`Arpeggio情報`は`Type = Arpeggio`の場合に使用します。

`Harmony`は必要に応じて設定します。

Charge受付期間の具体値・データ構造については、確定している範囲のみ本ページで扱います。

---

## 作曲者が決める情報

サウンド班の作曲者は、曲の音楽的内容をもとにAttackEvent候補を設計します。

主に以下を決めます。

| 項目                | サウンド班が決める内容            |
| ----------------- | ---------------------- |
| 発生位置              | 楽曲上のどこを攻撃タイミングとして使用するか |
| 必要音               | その場所で使用する音             |
| Type              | `Chord` / `Arpeggio`   |
| Arpeggio順序        | どの順番で音を使用するか           |
| Arpeggioの音楽的タイミング | 各音を楽曲上どの間隔で鳴らすか        |
| Harmony           | Root / Qualityなどの音楽的意味 |

サウンド班は、

```text
このコードを攻撃に使いたい

このアルペジオを攻撃に使いたい

この音楽位置を攻撃タイミングにしたい
```

という音楽的意図をAttackEvent候補として提示します。

### サウンド班が決めないもの

以下のようなGameplay上の値・判定は、サウンド班が独自に決定しません。

* AttackEventを最終的にGameplayへ採用するか
* 予告時間などGameplay体験に関する値
* Slot数・Slot構造
* Slot割り当て
* Slot優先順位
* 必要音のGameplay成立判定方法
* 完全成立 / 不完全完成の判定
* 発火時に使用するシャオンダマ実体

これらはプランナー・各Gameplay仕様を正とします。

---

## 発生位置

`発生位置`は、通常AttackEventの基準となるBGM上の演奏位置です。

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

`必要音`は、その通常AttackEventがGameplayへ要求する音を表します。

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

必要音から、

* どのSlotへChargeするか
* 同じ音を複数要求する場合にどのSlotを先に使用するか
* オクターブをSlot照合上どのように扱うか
* 重複Chargeをどう扱うか

については、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

必要音が発火時にどのように完全成立 / 不完全完成として扱われるかについては、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

---

## Chord

`Type = Chord`は、複数の音を同じ音楽位置で扱う通常AttackEventです。

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

Chordの必要音・音楽的位置は本ページで定義します。

発火時に、

* どのSlotが成立しているか
* どのシャオンダマ実体を使用するか
* 完全成立 / 不完全完成をどう扱うか
* 何発をPalette Bullet化するか

については、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

成立したPalette Bulletの発射・発音とBGM同期については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を参照します。

---

## Arpeggio

`Type = Arpeggio`は、複数の音を楽曲上の順序・タイミングに従って扱う通常AttackEventです。

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

Arpeggioの、

* 音楽上の順序
* 各音の音楽的タイミング

は本ページを正とします。

Playerがどの順番でChargeしたかによって、この音楽的順序を変更しません。

発火時にどのCharge済みシャオンダマ実体を各音の発射対象とするかは、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

実際の音響処理については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を参照します。

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

通常AttackEventは、発生位置へ到達する前にGameplayへ予告情報を渡します。

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

* 楽曲上の自然な区切り
* コード進行
* 拍
* フレーズ

などの音楽的観点から候補を提示できます。

ただし、最終的なGameplay値はプランナーが決定します。

### UI

予告情報を、

* どのUIに表示するか
* どのような見た目にするか
* どのようにアニメーションさせるか

はUI側の仕様を正とします。

Weak AttackEventは通常AttackEvent用UIには表示しません。

Weak AttackEventに専用の視覚表現を追加するかどうかは、本ページでは定義しません。

---

## Charge受付期間

通常AttackEventには、PlayerがそのAttackEventへChargeできる期間の終了地点を設けます。

概念上は、

```text
通常AttackEventがCharge対象として現れる
↓
Charge受付期間
↓
Charge受付期間終了
↓
その後
↓
AttackEventの発生位置
↓
AttackEvent発火
```

となります。

つまり、通常AttackEventは発生位置へ到達する直前まで無制限にChargeを受け付ける前提にはしません。

Charge受付期間に関係する**音楽時間情報**は、本ページおよびMusicChart側のデータとして扱います。

一方、

```text
Charge受付期間終了
↓
次にどのAttackEventをCharge対象とするか
```

というGameplay上のCharge対象切り替えについては、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

### 現在未決の内容

以下は現時点では固定しません。

* Charge受付期間の具体的な長さ
* 何秒前とするか
* 何拍前とするか
* 小節単位とするか
* AttackEventごとに個別設定するか
* Charge受付開始地点・終了地点の最終的な正式名称

既存の「予告」「発生位置」「発火」という用語を別の意味へ勝手に再定義しません。

---

## 固定AttackEvent

Random Sectionによる抽選を行わず、そのBGMの該当位置で使用する通常AttackEventを`固定AttackEvent`として扱います。

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
**「固定AttackEventが使用される」ことと、「Gameplay上の攻撃が完全成立する」ことは別です。**

固定AttackEventで保証するのは、AttackEventの音楽情報・予告・発火までです。

発火時のGameplay成立判定は、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。
:::
---

## Weak AttackEvent

### 概要

`Weak AttackEvent`は、現在Charge対象となる通常AttackEventが存在しない期間に使用する、**単音弱攻撃用の動的AttackEvent**です。

Weak AttackEventを生成する条件、および対象シャオンダマをWeak AttackEventへ割り当てる処理については、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

本ページでは、Weak AttackEventが持つ**音楽上の意味と発火タイミング**を定義します。

### 基本的な音楽構造

Weak AttackEventは、

* 要求Slotを必ず1つだけ持つ
* Chordを構成しない
* Arpeggioを構成しない
* 複数音の完全成立を前提としない
* Harmony等による通常AttackEventの完全成立バフの対象としない

単音弱攻撃として扱います。

通常AttackEventのように、

```text
C / E / G
Type = Chord
```

や、

```text
C → E → G
Type = Arpeggio
```

といった複数音の音楽表現を構成しません。

### 生成元NoteEvent

Weak AttackEventは、Chargeされたシャオンダマの**生成元NoteEvent**との対応を保持します。

シャオンダマは、BGMでそのNoteEventが演奏されるより前に世界上へ生成されているため、

```text
NoteEvent
↓
シャオンダマ生成
↓
曲がNoteEvent位置へ到達する前に世界上へ存在
↓
PlayerがWeak Charge
↓
Weak AttackEvent
```

という関係になります。

### 発火タイミング

Weak AttackEventの発火タイミングは、

> **Chargeされたシャオンダマ自身の生成元NoteEventの発音タイミング**

とします。

例えば、

```text
NoteEvent C4
発音タイミング = T
↓
C4シャオンダマ生成
↓
PlayerがWeak Charge
↓
Weak AttackEvent生成
↓
発火タイミング = T
```

となります。

曲が`T`へ到達した時点で、そのWeak AttackEventの発火タイミングとなります。

別の、

* 次に鳴る同名音
* 最も近い同名音
* 後続の同名NoteEvent

を検索して発火タイミングへ使用しません。

Weak AttackEventは、**そのシャオンダマ自身の生成元NoteEvent**へ一意に紐づきます。

BGM時間軸とNoteEventの同期については、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)および[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を参照します。

### 通常AttackEventが後から表示された場合

Weak AttackEvent生成後、発火前に通常AttackEventが新しくCharge対象として表示されても、

**既存Weak AttackEventの音楽的対応関係は変更しません。**

```text
Weak AttackEvent生成
↓
元NoteEventの発音タイミング待機
↓
通常AttackEventが新しく表示
↓
Weak AttackEventは維持
↓
元NoteEventの発音タイミングで発火
```

Weak AttackEventを、後から表示された通常AttackEventの音楽位置へ付け替えません。

既存Weak AttackEventから通常AttackEventへのSlot再割り当てを行わないことについては、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

### 通常AttackEventとの管理上の違い

Weak AttackEventは、

* 通常AttackEventの最大蓄積数には含めない
* 通常AttackEvent用UIには表示しない
* 1つのシャオンダマのWeak Chargeにつき1つ生成する
* 発火後は破棄する

仕様です。

これらのうち、生成・割り当てについては[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

発火後にどのシャオンダマ実体をPalette Bullet化し、どのように攻撃へ使用してWeak AttackEventを終了するかについては、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

---

## AttackEvent候補の受け渡し

サウンド班が設計する通常AttackEventはMIDIへ記録しません。

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

通常AttackEvent候補ごとに、少なくとも以下を識別できる状態にします。

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

Weak AttackEventはPlayerのChargeによって実行時生成されるため、サウンド班が個別のWeak AttackEvent候補を作成して受け渡す必要はありません。

Weak AttackEventの音楽時間には、そのシャオンダマの生成元NoteEventを使用します。

### プランナー

プランナーは、

* AttackEventをGameplayとして採用するか
* 予告時間などのGameplay値
* Gameplay側の各正本と競合しないか

を確認・決定します。

### プログラマー

プログラマーは、確定した通常AttackEvent情報をUnityのMusicChartへ入力します。

また、Gameplay側から参照できるよう、

* 通常AttackEventの音楽情報
* 予告・発火時間
* Charge受付期間に関係する時間情報
* Weak AttackEventが参照する元NoteEventの時間情報

を一意に扱える状態にします。

プログラマーが音楽的内容やGameplayルールを独自判断で変更しません。

### 受け渡し方法

具体的な、

* ツール
* ファイル形式
* 管理画面
* 共有方法

は本ページでは固定しません。

AttackEvent情報の受け渡し工程全体については、[サウンド班制作フロー](/spec/bgm/sound-production-workflow)を正とします。

---

## 発火

### 通常AttackEvent

BGMが通常AttackEventの発生位置まで到達したら、そのAttackEventを発火します。

```text
BGM再生
↓
AttackEvent予告
↓
発生位置
↓
AttackEvent発火
```

通常AttackEventの発火は、

> **「この音楽位置に対応するAttackEventのGameplay評価タイミングになった」**

ことをGameplayへ通知するものです。

発火そのものは、

* 完全成立
* 不完全完成
* 攻撃失敗
* Palette Bullet発射

のいずれかを意味するものではありません。

```text
AttackEvent発火
≠
Gameplay上の完全成立
```

発火後のGameplay判定は、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

### Weak AttackEvent

Weak AttackEventは、そのWeak AttackEventへ対応付けられたシャオンダマの**生成元NoteEventの発音タイミング**へBGMが到達した時点で発火します。

```text
生成元NoteEvent
↓
発音タイミング
↓
Weak AttackEvent発火
```

発火後の、

* 対応シャオンダマ実体の使用
* Palette Bullet化
* 単音弱攻撃
* Weak AttackEventの終了

については、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

---

## Gameplayへの出力

AttackEventは、Gameplay側が必要な音楽情報・時間情報を参照できる状態にします。

### 通常AttackEvent

概念上は、

```text
通常AttackEvent
↓
Gameplay
├─ 発生位置
├─ 必要音
├─ Type
├─ Arpeggio情報
├─ Harmony
├─ 予告に必要な情報
└─ Charge受付期間に関係する時間情報
```

という関係になります。

この情報を受け取った後の、

```text
どのAttackEventをCharge対象とするか
↓
どのSlotへ割り当てるか
```

については、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

発火後の、

```text
各SlotのCharge状態を参照
↓
完全成立 / 不完全完成を判定
↓
使用するCharge済みシャオンダマ実体を決定
↓
攻撃処理
```

については、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

### Weak AttackEvent

Weak AttackEventでは、少なくとも、

```text
Weak AttackEvent
↓
Gameplay
├─ 対象となる単一要求音
├─ 生成元NoteEventとの対応
└─ 生成元NoteEventの発音タイミング
```

を扱える状態にします。

Weak AttackEventの生成・割り当て条件は、[チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)を正とします。

Weak AttackEvent発火時の使用実体・Palette Bullet化・攻撃処理は、[BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)を正とします。

### 発射・発音

AttackEvent発火後のGameplay判定によって攻撃対象が確定した後の、

```text
Palette Bullet発射
+
音程音
+
Gameplay SE
```

とBGM同期については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を参照します。

---

## Random Sectionとの関係

すべての通常AttackEventを固定で使用する必要はありません。

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

各Candidateは、本ページで定義する通常AttackEventと同じ音楽情報を持ちます。

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
通常AttackEventとして扱う
↓
予告
↓
発火
```

Random Section専用のAttackEvent形式は作りません。

Weak AttackEventはPlayerのChargeにより実行時生成されるため、Random SectionのCandidateとして扱いません。

以下については、[BGM Random Section仕様](/spec/bgm/bgm-random-section)を正とします。

* Random Sectionの開始位置・終了位置
* Candidate条件
* 選択数
* 抽選タイミング
* 再抽選
* 固定AttackEventとの競合

---

## 責務境界

本ページは、

> **AttackEventの音楽情報・時間情報**

を正とします。

| 内容                                     | 正とする仕様                                                  |
| -------------------------------------- | ------------------------------------------------------- |
| 通常AttackEventの発生位置・必要音・Type・Harmony    | **本ページ**                                                |
| Arpeggioの順序・音楽的タイミング                   | **本ページ**                                                |
| 通常AttackEventの予告・発火に必要な時間情報            | **本ページ**                                                |
| Charge受付期間に関係するAttackEvent時間情報         | **本ページ**                                                |
| Weak AttackEventの生成元NoteEventとの音楽的対応   | **本ページ**                                                |
| Weak AttackEventの発火タイミング               | **本ページ**                                                |
| AttackEvent候補の音楽的設計                    | **本ページ**                                                |
| AttackEvent情報の制作・受け渡し工程                | [サウンド班制作フロー](/spec/bgm/sound-production-workflow)       |
| MusicChart上のデータ構造・入力者                  | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart)           |
| DAW / FLAC / MIDI                      | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)          |
| Random候補・抽選ルール                         | [BGM Random Section仕様](/spec/bgm/bgm-random-section)    |
| 現在Charge対象となるAttackEventの決定            | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Slot構造・Slot割り当て・優先順位                   | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| 重複Charge・万能シャオンダマのSlot解決               | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| Weak AttackEventの生成・Charge先解決          | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) |
| AttackEvent発火時の完全成立 / 不完全完成            | [BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)   |
| AttackEvent発火時に使用するCharge済み実体          | [BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)   |
| Weak AttackEvent発火後の使用実体・終了処理          | [BGM AttackEvent判定仕様](/spec/bgm/bgm-attack-judgement)   |
| Palette Bullet発射・音程音・Gameplay SEとBGM同期 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)    |
| 予告UIの見た目・表示方法                          | UI側の仕様                                                  |

### Player Chargeとの境界

ClickCharging / DragChargingの、

* 入力
* ActionState
* 対象選択
* Charge判定タイミング
* キャンセル
* 中断
* Weak AttackEvent利用時のCharge Action制限

については、`player/player-action-charge.md`を正とします。

本ページではPlayer Actionの詳細を定義しません。

### サウンド班

サウンド班は、

* 通常AttackEventとして使用したい音楽位置
* 必要音
* Chord / Arpeggio
* Arpeggioの順序
* Arpeggioの音楽的タイミング
* Harmony

を音楽的観点から設計・提示します。

Weak AttackEventそのものを個別に作曲・配置する必要はありません。

### プランナー

プランナーは、

* 通常AttackEventをGameplayとして採用するか
* 予告時間などのGameplay値
* Charge受付期間などのGameplay値
* Gameplay側との整合性

を決定・確認します。

### プログラマー

プログラマーは、

* 確定した通常AttackEventをMusicChartへ入力する
* AttackEventを指定されたBGM位置で予告・発火できる状態にする
* Gameplayへ必要な音楽情報・時間情報を渡せる状態にする
* Weak AttackEventが生成元NoteEventの発音タイミングを参照できる状態にする

ことを担当します。

プログラマーはAttackEventの音楽的内容・Slot規則・Gameplay成立判定を独自に変更しません。

---

## 基本ルール

* 本ページはAttackEventの音楽情報・時間情報の正本とする
* 通常AttackEventはBGM上のコード・アルペジオなどの音楽表現に合わせて設定する
* 通常AttackEventはMIDIには記録しない
* サウンド班が通常AttackEventの音楽的内容を設計・提示する
* プランナーがGameplayとしての採用・Gameplay値を決定する
* プログラマーが確定した通常AttackEventをMusicChartへ入力する
* 通常AttackEventの発生位置は小節・拍・必要に応じてTickで指定する
* 通常AttackEventには必要音を設定する
* 通常AttackEventのTypeは`Chord`または`Arpeggio`とする
* Arpeggioは順序とAttackEventごとの音楽的タイミングを持つ
* 必要に応じてHarmonyを保持する
* 通常AttackEvent発生前にGameplayへ予告できる状態にする
* 通常AttackEventにはCharge受付期間の終了地点を設ける
* BGMが通常AttackEventの発生位置へ到達したらAttackEventを発火する
* Charge対象AttackEvent・Slot割り当ては`charge-allocation.md`を正とする
* AttackEvent発火時の完全成立 / 不完全完成・使用実体は`bgm-attack-judgement.md`を正とする
* 発火時にSlotを再割り当てしない
* Random Sectionで選ばれたAttackEventも通常AttackEventと同じ予告・発火処理を使用する
* Weak AttackEventは通常AttackEventがCharge対象として存在しない期間の単音弱攻撃に使用する
* Weak AttackEventは1つの要求Slotのみを使用し、Chord / Arpeggioを構成しない
* Weak AttackEventは通常AttackEventの完全成立バフの対象としない
* Weak AttackEventの発火タイミングは、対象シャオンダマの生成元NoteEventの発音タイミングとする
* Weak AttackEventの発火タイミングとして別の同名NoteEventを検索しない
* Weak AttackEvent待機中に通常AttackEventが表示されても、生成元NoteEventとの対応を変更しない
* Weak AttackEventは通常AttackEventの最大蓄積枠には含めない
* Weak AttackEventは通常AttackEvent用UIには表示しない
* Weak AttackEventの生成・Slot割り当て詳細は`charge-allocation.md`を正とする
* Weak AttackEvent発火後の使用実体・攻撃・終了処理は`bgm-attack-judgement.md`を正とする

---

## 未決事項

### Charge受付期間

以下は未決です。

* Charge受付期間の具体値
* 設定単位
* Charge受付開始地点・終了地点の正式名称

### Weak AttackEvent

Weak AttackEventについて、本ページで必要な音楽時間上の基本仕様は確定しています。

一方、以下は本ページでは決定しません。

* Weak AttackEvent利用時にClickChargingのみとするか
* DragChargingをどのように制限するか
* 万能シャオンダマをWeak AttackEventへ使用できるか
* Weak AttackEvent専用UI・VFX・SEを設けるか

Player Actionに関する内容は`player/player-action-charge.md`、万能シャオンダマのCharge先解決は`draw-system/charge-allocation.md`を正とします。

---

## 関連タスク

<PageRelations />
