---
title: "サウンド班制作フロー"
description: Palette Bulletにおけるサウンド素材の制作開始からゲーム内確認までの制作・受け渡し工程
pageType: spec
category: "BGM"
status: 仮仕様
relatedTasks: []
---

# サウンド班制作フロー

## 目的

本ページでは、Palette Bulletにおける、

> **サウンド素材1件を制作開始してから、Unity上でゲーム内確認を終えるまでの恒久的な制作工程**

を定義します。

本ページでは主に、

* 制作開始前に確認すること
* サウンド班が制作するもの
* プランナーとの確認
* プログラマーへの受け渡し
* AttackEvent情報の受け渡し
* Unity Import後の確認
* 修正時の流れ
* 再Export / 再Import
* 完成条件

を扱います。

## サウンド制作の基本フロー

Palette Bulletのサウンド制作は、素材を書き出した時点では完了としません。

基本フローは以下です。

```text
制作要件を確認（制作指示書）
↓
サウンド制作
↓
必要なデータを書き出す
↓
音楽・Gameplay情報を整理
↓
プランナー確認
↓
プログラマーへ受け渡し
↓
Unity Import / 設定
↓
ゲーム内確認
│
├─ 問題あり
│   ↓
│   修正
│   ↓
│   再Export / 再Import
│   ↓
│   再確認
│
└─ 問題なし
    ↓
    完成
```

サウンド班の作業範囲には、**ゲーム内で意図した音として成立していることの確認**までを含みます。

```text
素材を書き出した
≠
サウンド制作完了
```

UnityへのImportやGameplayへの接続そのものはプログラマーが担当しますが、サウンド班もImport後の結果を確認します。

## 制作開始前の確認

サウンド班は、制作を開始する前に、その素材について必要な要件が決まっているか確認します。

確認する内容は素材によって異なりますが、最低限、

* 何のために使用する音か
* どのGameplayや場面から要求されるか
* BGMの場合はどのようなゲーム体験を意図するか
* Gameplayと同期する必要があるか
* 音程などの音楽情報をGameplayで使用するか
* 他のサウンドとどのように組み合わせるか

を確認します。

サウンド班が独自にGameplayルールを補完して制作を進めてはいけません。

Gameplay上の要件が不足している場合は、プランナーへ確認します。

## BGM制作フロー

戦闘BGMでは、以下の流れを基本とします。

```text
BGM要件確認
↓
DAWで作曲・編曲
↓
Gameplayに使用する音楽箇所を確認
↓
AttackEvent候補を整理
↓
DAW Project / FLAC / MIDIを書き出す
↓
プランナー確認
↓
プログラマーへ受け渡し
↓
Unity Import
↓
MusicChart生成
↓
AttackEvent等を設定
↓
ゲーム内再生
↓
BGM / Gameplay / 追加音を確認
↓
必要に応じて修正
↓
完成
```

### 作曲・編曲

サウンド班は、BGMの制作要件に従ってDAW上で楽曲を制作します。

この段階では、完成した楽曲そのものだけでなく、Gameplayで利用する可能性のある、

* Note
* Track
* コード
* アルペジオ
* AttackEventとして使用したい演奏位置

も意識して制作します。

ただし、サウンド班がGameplay上のSlot数や成立判定などを決定するわけではありません。

### 書き出し

BGM制作後は、仕様に従って、

* DAWプロジェクト
* FLAC
* MIDI

を用意します。

具体的なファイル形式、MIDIへ残す情報、Track、FLAC / MIDIの同期条件などについては、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)を正とします。

---

## サウンド班

サウンド班は、主に以下を担当します。

### 制作

* BGMを制作する
* 必要なGameplay SEを制作する
* パレットブレットの音程音など、音楽Gameplayに必要な素材を制作する

### 音楽情報の整理

BGMについては、

* Gameplayに使用したいTrack
* AttackEventとして使用したい音楽位置
* 必要音
* Chord / Arpeggio
* Arpeggioの順序・音楽的タイミング
* Harmony
* Random Sectionに使用可能な音楽的候補

など、サウンド班が判断する音楽的情報を整理します。

詳細なデータ項目については各仕様ページを正とします。

### 受け渡し

プログラマーがUnityへ正しく設定できるように、

* 音素材
* BGM制作データ
* 音楽的な設定情報

を不足なく渡します。

### Unity上での確認

Import後は、

* 意図した音が再生されているか
* BGMとGameplay音の組み合わせが音楽的に成立しているか
* AttackEventの演奏位置が意図と合っているか
* Chord / Arpeggioが意図した聞こえ方になっているか
* 書き出した素材とUnity上の再生結果に問題がないか

を確認します。

サウンド班はUnity内部の実装方法そのものを決定する必要はありません。

---

## プランナー

プランナーは、サウンド制作に対して主にGameplay側の要件を担当します。

### 制作前

サウンド班へ、

* 何に使用するサウンドか
* Gameplay上で何を実現したいか
* 必要なゲーム上の条件

を提示します。

### BGM制作中

サウンド班から提示された、

* AttackEvent候補
* Random Section候補
* Gameplayに利用する音楽要素

について、Gameplayとして成立するか確認します。

### Gameplay設定

以下のようなGameplay側の値やルールは、サウンド班ではなくプランナー側の仕様を正とします。

* 使用TrackのGameplay上の採用判断
* Shaondama SettingsなどのGameplayパラメータ
* Random Sectionの選択数
* Slot割り当て
* AttackEvent成立条件
* Player操作

サウンド班は音楽的な提案を行えますが、Gameplayルールを独自に確定しません。

---

## プログラマー

プログラマーは、サウンド班から受け取った素材と設定情報をゲームへ接続します。

主に、

* サウンド素材のUnity Import
* MIDIからMusicChartを生成する仕組み
* AudioClipの設定
* MusicChartへの手動データ設定
* AttackEventの設定
* Random Sectionの設定
* BGMとGameplayの同期
* Sound EventとGameplayの接続
* ゲーム内で確認できる状態の用意

を担当します。

プログラマーは、サウンド班が指定した音楽的意図を独自判断で変更しません。

設定上または実装上そのまま使用できない情報がある場合は、サウンド班またはプランナーへ戻して確認します。

---

## AttackEventの受け渡し

AttackEventはMIDIには記録しません。

そのため、

```text
MIDIを渡す
↓
AttackEventも自動的に伝わる
```

という構造にはなりません。

サウンド班は、AttackEventとして使用したい内容を**MIDIとは別の設定情報として明示して受け渡します。**

### サウンド班が渡す情報

AttackEventごとに、最低限、現在の「BGM 攻撃イベント仕様」で必要とされている音楽情報を識別できる状態にします。

主に、

```text
AttackEvent
├─ 発生位置
├─ 必要音
├─ Type
│  ├─ Chord
│  └─ Arpeggio
├─ Arpeggioの順序
├─ Arpeggioの音楽的タイミング
├─ 予告に必要な音楽情報
└─ Harmony
```

です。

Random Sectionの候補として使用する場合は、そのことも識別できるようにします。

具体的なAttackEventのデータ構造については、[BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)を正とします。

Random Sectionについては、[BGM Random Section仕様](/spec/bgm/bgm-random-section)を正とします。

### 位置の表現

音楽上の位置は、MusicChartで使用する基準に合わせて、

```text
小節
拍
必要に応じてTick
```

で識別できるようにします。

単に、

> 「曲のこのあたり」

のような曖昧な指定だけでは受け渡し完了としません。

### 受け渡し方法

AttackEvent情報を記載する具体的な、

* ツール
* ファイル形式
* 管理画面
* 共有サービス

は現時点では本仕様で固定しません。

ただし、どの方法を使用する場合でも、

> **サウンド班・プランナー・プログラマーの3者が、同じAttackEventを一意に確認できること**

を必須とします。

### プランナー確認

サウンド班が提示したAttackEventは、Unityへ最終設定する前にGameplayとして使用可能か確認します。

```text
サウンド班
↓
音楽的AttackEvent候補を提示
↓
プランナー
↓
Gameplayとして確認
↓
設定対象を確定
↓
プログラマー
↓
MusicChartへ設定
```

プランナー確認では、

* そのAttackEventをGameplayで使用するか
* 必要音がGameplayとして成立するか
* 他のAttackEventやGameplayとの競合がないか

を確認します。

具体的な成立判定ルールそのものは、チャージシステム側の仕様を正とします。

---

## Unityへの受け渡し

サウンド班は、Unityへ設定する担当者が必要な内容を識別できる状態で成果物を渡します。

### BGM

最低限、

* DAWプロジェクト
* FLAC
* MIDI
* AttackEventに必要な音楽情報
* Random Section候補がある場合はその情報

を揃えます。

### Gameplay SEなど

BGM以外のSound Eventについては、

* 使用する音素材
* どのGameplay Event用の素材か
* 複数バリエーションがある場合はその関係

を識別できる状態にします。

ファイル名やフォルダ構成などの具体的な納品規則については、それぞれの仕様が確定した時点で定義します。

未決の命名規則を本ページで独自に固定しません。

---

## Unity Import後の確認

UnityへのImportとGameplay接続が完了した後は、実際のゲーム内で確認します。

確認は担当ごとに目的を分けます。

### サウンド班の確認

主に音楽・音響面を確認します。

* 正しい素材が再生されている
* 音切れや不自然な再生がない
* BGMの開始位置が正しい
* FLAC由来のBGMとMIDI由来の時間情報がずれていない
* AttackEventの位置が楽曲と合っている
* Chordが意図した位置で同時発音される
* Arpeggioが意図した順序・タイミングで発音される
* パレットブレット音程音がBGMと音楽的に成立している
* Gameplay SEが意図したSound Eventで鳴る

具体的な音量バランスやMixは調整可能項目として扱います。

### プランナーの確認

主にGameplay面を確認します。

* AttackEventがGameplayとして成立している
* 必要音や予告が意図したゲーム体験になっている
* Gameplay上の設定値に問題がない
* サウンドとPlayer操作の関係に問題がない

### プログラマーの確認

主に技術面を確認します。

* 素材が正しくImportされている
* MusicChartが正しく生成されている
* BGMとGameplayの同期が正しい
* Sound Eventが正しい条件で発火している
* Pause / Resume / Loop / Retryなどで同期が壊れない

BGMとGameplayの同期挙動については、[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)を正とします。

---

## 修正時の流れ

ゲーム内確認で問題が見つかった場合は、原因となる責務へ戻して修正します。

```text
ゲーム内確認
↓
問題を分類
│
├─ 元音源の問題
│   ↓
│   サウンド班で修正
│
├─ Gameplay要件・設定の問題
│   ↓
│   プランナー確認
│
└─ Import・同期・再生処理の問題
    ↓
    プログラマーで修正
↓
再確認
```

### サウンド班へ戻す例

* BGMそのものを変更する必要がある
* MIDIのNote / Track情報が不足している
* FLACとMIDIの開始位置が一致していない
* SE素材そのものを変更する必要がある
* パレットブレット音程音の音響的な問題がある

### プランナーへ戻す例

* AttackEventのGameplay上の配置を再検討する必要がある
* 必要音がGameplayとして成立しにくい
* Random Sectionの採用候補を変更する必要がある
* Gameplayパラメータを変更する必要がある

### プログラマーへ戻す例

* Unity上で違う素材が再生される
* AttackEventの設定値が受け渡し内容と異なる
* 同期がずれる
* Sound Eventが発火しない
* Pause / Resumeなどで音楽進行がずれる

問題の原因が分からない場合は、1つの担当へ決め打ちせず、関係する担当で確認します。

---

## 再Export / 再Import

修正時は、変更した内容に応じて必要なデータだけを更新します。

### FLACのみ変更した場合

BGMの音源だけを修正し、MIDIの音楽情報に変更がない場合は、FLAC側の更新のみを行います。

ただし、曲の長さや開始位置など、MusicChartとの同期へ影響する変更を行った場合は、MIDIや設定情報も含めて再確認します。

### MIDIを変更した場合

MIDIの、

* Note
* Tempo
* 拍子
* Track
* 演奏位置

などを変更した場合は、MIDIを再Exportし、MusicChartへ再Importします。

MusicChartの再Importルールについては、[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正とします。

MIDI再Importでは、MIDIから生成された情報を更新し、Unity上で手動設定した、

* Attack Events
* Random Sections
* Shaondama Settings
* Sync Settings

を不用意に削除・上書きしません。

### AttackEvent情報だけ変更した場合

楽曲やMIDI自体を変更せず、

* AttackEventの発生位置
* 必要音
* Type
* Arpeggio情報
* Harmony

などの設定だけを変更する場合は、DAWからFLAC / MIDIを再Exportする必要はありません。

更新したAttackEvent情報を確認し、MusicChart側の手動設定を修正します。

### 音源と音楽情報の両方を変更した場合

FLACとMIDIの両方へ影響する変更を行った場合は、同じDAWプロジェクトから必要なデータを再Exportします。

FLACとMIDIの同期条件については、[BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)を正とします。

---

## 完成条件

サウンド素材は、ファイルを書き出しただけでは完成としません。

少なくとも以下を確認できた状態を、その素材の制作フロー上の完成条件とします。

### 共通

* 必要なサウンド素材が揃っている
* 使用目的を識別できる
* Unityへ正しくImportされている
* ゲーム内の正しいEventから再生されている
* サウンド班がゲーム内の再生結果を確認している
* 重大な音響上・Gameplay上・技術上の問題が残っていない

### BGM

加えて、

* 必要なDAWプロジェクト・FLAC・MIDIが揃っている
* FLACとMIDIの同期条件を満たしている
* MusicChartが使用できる状態になっている
* 必要なAttackEvent情報が受け渡されている
* 必要なAttackEventがUnityへ設定されている
* BGMとGameplayの同期をゲーム内で確認している
* パレットブレット音程音など、BGMへ追加される音との組み合わせを確認している

ことを確認します。

細かな音量や演出上の微調整が残っていることだけを理由に、必ずしも仕様上未完成とはしません。

ただし、ゲーム体験を判断できないほどの問題がある場合は完成としません。

---

## タスクページとの関係

本ページに書くのは、

> **毎回のサウンド制作で共通して使用する制作工程**

です。

例えば、

```text
要件確認
↓
制作
↓
受け渡し
↓
Unity Import
↓
ゲーム内確認
↓
完成
```

という流れは本ページで定義します。

一方、

```text
Battle BGM Aを制作する
SEを10個制作する
○月○日までに修正する
```

などは個別タスクとして管理します。

タスク側では、

* 今回何を制作するか
* 担当者
* 期限
* 対象となる仕様
* 現在の進捗

などを管理し、恒久的な制作ルールを重複して記載しません。

タスクで制作を開始する場合は、本ページと対象となる詳細仕様ページを参照して作業します。

---

## 他仕様との責務境界

本ページは、

> **サウンド素材の制作開始からゲーム内確認を終えるまでの制作・受け渡し工程**

だけを正とします。

以下の詳細は各ページを正とします。

| 内容                              | 正とする仕様                                               |
| ------------------------------- | ---------------------------------------------------- |
| サウンド / BGM全体像                   | [サウンド / BGM](/spec/bgm/)                             |
| DAW / FLAC / MIDIの制作・Export条件   | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)       |
| MusicChartの構造・Import / ReImport | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart)        |
| AttackEventの音楽的仕様               | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)           |
| Random Section                  | [BGM Random Section仕様](/spec/bgm/bgm-random-section) |
| BGMとGameplay結果の音響接続             | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| AttackEventのSlot割り当て・成立判定       | チャージシステム側の仕様                                         |
| PlayerのCharge入力・Action          | Player仕様                                             |
| NoteEventからのシャオンダマ生成            | シャオンダマ側の仕様                                           |

---

## 関連タスク

<PageRelations />
