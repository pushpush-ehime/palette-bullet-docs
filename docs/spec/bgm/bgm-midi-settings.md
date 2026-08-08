---
title: "BGM MIDIファイルの設定"
pageType: spec
category: "BGM"
status: 仮仕様
---

# BGM MIDI仕様

## MIDIの役割

MIDIには、BGMからゲームで使用する以下の情報を記録する。

* 音程・・・シャオンダマの発生に使用
* 固定攻撃イベント・・・変化しない攻撃ポイント
* ランダム攻撃候補・・・毎回変化する攻撃候補
* ランダム区間・・・この中のコードやアルペジオ候補から攻撃が決まる

音楽として実際に再生するのはFLACを使用し、MIDIはゲーム用の情報取得に使用する。

## ゲーム用Track

通常の楽器Trackとは別に、ゲーム用Trackを用意する。

```text
Piano
Guitar
Bass
Synth

PB_ATTACK
PB_RANDOM
```

`PB_`から始まるTrackはゲーム用データとして扱い、BGMとしては再生しない。

以下、PBのTrackの説明をします。
このページの作者はMIDIがどんなタグを打てるのかわかっていないので、おしえてください。

## 固定攻撃

### コード
攻撃に使用したいコードの構成音（もしくはコード）を明記する。

```text
PB_ATTACK

       C
       E
       G
       │
       ▼
   Attack Event
```

例：

```text
C4
E4
G4
```

↓

```text
必要音

C
E
G
```

オクターブは攻撃条件では区別しない。

---

### アルペジオ

アルペジオの場合は、実際に演奏される順番でNoteを配置する。

```text
PB_ATTACK

C → E → G → C
```

Unityでは、

```text
Type
Arpeggio

Sequence
C → E → G → C

Required
C / E / G
```

として扱う。

演奏順は保持するが、プレイヤーが集める必要音では重複を除外する。


## ランダム区間

作曲者は、Unityが攻撃イベントをランダムに選択してよい区間を指定できる。

```text
RANDOM START
│
│  Candidate A : C E G
│
│  Candidate B : A C E
│
│  Candidate C : C → E → G
│
RANDOM END
```

Unityは、この区間に登録された候補から攻撃イベントを選択する。

### 作曲者
* 攻撃コード,アルペジオを指定する
* ランダム区間を指定する
* 区間内で使用可能な攻撃候補を指定する

### Unity

* 使用する候補をランダムに選択する
* 使用する個数を決定する
* UI予告を行う
* 攻撃判定を行う

## Marker / Cueについて

`ATTACK`、`RANDOM_START`、`RANDOM_END`などの位置情報（どのタイミングで来るか）は、MIDIのMarker / Cue、または専用Trackで記録する。

使用するDAWからMIDIへ正しく書き出せる方法を確認した後、記録方式を決定する。

