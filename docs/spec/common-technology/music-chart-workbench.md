---
title: "MusicChart制作・確認ツール仕様"
description: MIDI・BGM・AttackEvent・Timing・再Import差分を同一時間軸上で確認・設定・検証するUnity Editorツール
pageType: spec
category: "共通技術"
status: 仮仕様
relatedTasks: []
---

# MusicChart制作・確認ツール仕様

## 目的

本ツールは、MusicChartに関係する音楽データとGameplay用設定を、
同一の音楽時間軸上で確認・設定・検証できるようにするUnity Editorツールです。

主な目的は、次のとおりです。

- MIDI Import結果を視覚的に確認する
- BGM AudioとMIDIの対応を確認する
- AttackEventの位置・要求音・Timingを確認する
- シャオンダマ生成へ使用するTrackを確認・設定する
- Random Sectionを確認・設定する
- system pre-rollと最初のPreview／Charge開始の関係を確認する
- MIDI再Import前後の変更と影響箇所を確認する
- MusicChartの設定ミスをRuntime開始前に検出する

本ツールはMusicChartのGameplay上の意味を新しく定義するものではありません。
MusicChartデータ構造、MIDI Import、再Import、静的Validation等の正式な規則は、
BGMカテゴリの各正本仕様を参照します。

## 利用者

初期版では、プログラマーがMusicChartへの設定・保存を担当します。

一方、サウンド班とプランナーも同じ画面を使用し、
音楽情報とGameplay設定を確認できるようにします。

| 担当 | 主な利用目的 |
| --- | --- |
| サウンド班 | MIDI、Track、Note、AttackEvent候補、音楽上の位置を確認する |
| プランナー | 使用Track、AttackEvent採用、Timing、Random Section等を確認する |
| プログラマー | Import、MusicChartへの反映、Validation、Gameplay接続を行う |
| QA | BGMとGameplayのTimingや設定不整合を確認する |

AttackEventはMIDI内のNote情報だけでは表現されないGameplay用設定を含むため、
サウンド班・プランナー・プログラマーが同じAttackEventを一意に確認できる表示を用意します。

## 正本の扱い

本ツール自身を独立したデータの正本にはしません。

| 情報 | 正本 |
| --- | --- |
| Tempo、拍子、Track、Note | 元MIDI |
| 完成BGM | UnityへImportしたAudioClipと元素材 |
| TempoMap、NoteEvents | MIDIから生成したMusicChartデータ |
| 使用Track、AttackEvent、Random Section、Timing等 | MusicChartの手動設定データ |
| 各設定のGameplay上の意味 | 各仕様書ページ |
| 画面配置や表示状態 | Editor専用設定 |

本ツールは、MusicChartを表示・編集・検証するための操作画面です。

ツール専用データとMusicChart内に同じGameplay設定を二重保存しません。
Editorツールが存在しない場合でも、MusicChartおよびRuntimeデータの意味は変化しないものとします。

## 対象データ

本ツールでは、少なくとも以下を表示・確認対象とします。

- BGM AudioClip
- MIDIファイルまたはImport元情報
- TempoMap
- 拍子変更
- Track一覧
- NoteEvents
- system pre-roll
- シャオンダマ生成に使用するTrack
- AttackEvent Timing Settings
- Normal AttackEvent
- Chord／Arpeggio
- Music Requirement Entries
- Harmony
- Timing Override
- Random Sections
- Sync Settings
- MusicChart Validation結果

すべての項目を初期版で編集可能にする必要はありません。
表示専用の項目と編集可能な項目を分離し、
正本を持たない値をツール側で新たに編集対象として追加しません。

## 基本画面構成

初期版は、概念上以下の領域を持ちます。

1. MusicChart選択・Import状態
2. 再生操作
3. 音楽タイムライン
4. Track／Note表示
5. AttackEvent／Random Section表示
6. 選択項目の詳細設定
7. Validation結果
8. MIDI再Import差分

具体的な画面レイアウト、各領域の配置方法、使用するUnity Editor UI技術は未決とします。

### MusicChart選択・Import状態

現在対象としているMusicChartと、少なくとも以下のImport関連情報を確認できるようにします。

- 対象MusicChart
- BGM AudioClip
- MIDI Import元
- Import済みであるか
- 再Import後に未確認差分が存在するか
- Validation Error／Warningの有無

### 音楽タイムライン

横方向を音楽時間とし、少なくとも以下を同じ基準上に表示します。

- 小節
- 拍
- Tick
- system pre-roll
- BGM Audio開始位置
- Tempo変更
- 拍子変更
- NoteEvents
- AttackEventのPreview開始
- Charge受付開始
- Charge受付終了
- Fire Music Position
- Arpeggio Entry Timing
- Random Section
- 現在のプレビュー再生位置

system pre-roll、MusicChart上の音楽位置、BGM Audioの音源位置を混同しない表示とします。

### Track／Note表示

MIDIのTrackごとにレーンを分け、各NoteEventについて以下を確認できるようにします。

- exact MIDI Note
- octave
- Velocity
- Music Position
- Note Length
- シャオンダマ生成への使用／不使用

Track名が長い場合やTrack数が多い場合に備え、
表示対象Trackの絞り込み・折り畳みを可能にします。

### AttackEvent／Random Section表示

AttackEventおよびRandom Sectionを、
NoteEventsやBGM Audioと同じ音楽時間軸上で確認できるようにします。

AttackEventはタイムライン上で一意に識別できる表示を持ち、
同一Music Positionに複数のAttackEventが存在する場合でも、
定義順を含めて区別できるようにします。

## AttackEvent表示・編集

各AttackEventを選択したとき、少なくとも以下を確認できるようにします。

- 識別子
- MusicChart定義順
- Fire Music Position
- Chord／Arpeggio
- Music Requirement Entries
- 各Entryのexact MIDI Note
- Arpeggio順序・Timing
- Harmony
- Timing Overrideの有無
- 実効Preview開始位置
- 実効Charge受付開始位置
- 実効Charge受付終了位置
- Fire Music Position
- Validation結果

初期版での具体的な安定ID形式は未決です。
ただし、画面上ではサウンド班・プランナー・プログラマーが
同じAttackEventを指し示せる一意な識別方法を用意します。

## AttackEventの入力補助

本ツールはAttackEventを音楽的に自動決定しません。

代わりに、入力ミスを減らすための補助を提供します。

想定操作例は次のとおりです。

1. タイムライン上でFire位置を選択する
2. AttackEventを追加する
3. ChordまたはArpeggioを選択する
4. Note表示上のNoteを選択する
5. 選択したexact MIDI NoteをMusic Requirement Entryへ追加する
6. HarmonyやTiming Overrideを設定する
7. 実効Timingをタイムライン上で確認する
8. Validation結果を確認する

Pitch Classを独立した手入力値として二重管理しません。
必要なPitch Class情報は、正本仕様に従ってexact MIDI Noteから導出します。

AttackEventの内容やGameplay上の成立条件を、
ツール独自の判断で変更・補正しません。

## BGMプレビュー再生

Edit ModeでBGM AudioClipを再生し、
現在の再生位置をタイムライン上へ表示できるようにします。

少なくとも以下の操作を検討します。

- 再生
- 一時停止
- 停止
- タイムライン位置へのSeek
- Loop範囲のプレビュー
- 選択したAttackEvent周辺からの再生

初期版では、Gameplay全体をEditor上で再現する必要はありません。

主な確認対象は以下です。

- 音源位置
- MIDI上の音楽位置
- AttackEventの設定位置
- Preview／Charge／Fireの時間境界

波形表示を初期版へ含めるか、
Note単体を試聴する機能を持たせるかは未決です。

## Validation結果の表示

Validation規則そのものはBGM MusicChart仕様を正とし、
本ページではValidation結果をどのように確認させるかを定義します。

Validation Error／Warningは、一覧だけでなく、
問題が発生している対象と音楽位置を特定できる形で表示します。

各項目は、少なくとも以下を持ちます。

- Error／Warning
- 安定した識別コード
- 問題の説明
- 対象MusicChart要素
- 対象AttackEvent／Track／Random Section
- 該当する小節・拍・Tick
- 関連設定値
- 該当位置へ移動する操作

表示例：

```text
MC-TIME-001  Error

最初のAttackEventのPreview開始位置が
Battle音楽runtime開始点より前です。

対象：ATK-001
Fire：1小節1拍0Tick
Preview開始：runtime -0.5秒
不足lead：0.5秒

[該当位置へ移動]
```

安定した識別コードの具体的な命名規則は未決です。
ただし、同種の問題を再現時やレビュー時に特定できる形式を使用します。

### 自動補正の禁止

Validationを通すために、ツールが以下を無断で行ってはいけません。

- Preview開始位置を移動する
- Charge受付時間を短縮する
- Fire Music Positionを変更する
- system pre-rollを変更する
- exact MIDI Noteを書き換える
- 削除されたTrackを別Trackへ読み替える
- AttackEventを削除する
- Random Sectionを別の範囲へ移動する

問題がある場合は対象箇所と理由を表示し、
修正判断は担当者へ委ねます。

Validation Error時にMusicChartの保存自体を禁止するかどうかは未決です。

## MIDI再Import差分

MIDI再Import時は、BGM MusicChart仕様に従って
MIDI由来データを更新し、MusicChartの手動設定データを保持します。

本ツールは、再Import前後の変更を確認できる差分表示を提供します。

### 差分対象

少なくとも以下の変更を確認対象とします。

- Tempo変更
- 拍子変更
- Track追加
- Track削除
- Track名変更
- Note追加
- Note削除
- Note位置変更
- exact MIDI Note変更
- Velocity変更
- Note Length変更

### 影響候補

差分から、確認が必要な手動設定を表示します。

- 削除・変更されたTrackを使用しているShaondama Settings
- 変更位置付近のAttackEvent
- 変更されたNoteと関係するMusic Requirement Entry
- Arpeggio Timing
- Random Section
- system pre-rollと最初のAttackEvent

差分表示は影響候補を提示するためのものであり、
手動設定を自動変更しません。

再Import差分を実際の更新適用前に表示するか、
適用後に表示するかは未決です。

## 初期版の対象範囲

初期版では、次を必須とします。

- MusicChartとImport元の選択
- MIDI Import結果の表示
- Tempo／拍子／Track／Noteの表示
- BGMプレビュー再生
- シャオンダマ使用Trackの確認・設定
- AttackEventの表示・基本編集
- Preview／Charge／Close／Fireの表示
- Random Sectionの表示・基本編集
- MusicChart Validation結果の表示
- エラー箇所への移動
- MIDI再Import前後の差分確認
- 手動設定を保持した再Import

Random Sectionについて初期版でどこまで編集可能にするかは未決です。
少なくとも表示と、正本仕様上必要な基本設定を確認できることを目標とします。

## 初期版の対象外

初期版では、以下を対象外とします。

- DAWの代替
- 作曲・編曲
- MIDIそのものの高度な編集
- AttackEventの音楽的な自動決定
- Gameplayとして採用するAttackEventの自動判断
- 不正データの自動修正
- Runtime Battleの完全なEditor内再現
- Player ChargeやDamage処理のシミュレーション
- 実行中Battleの詳細監視
- Excelとの双方向同期

## 後続機能

初期版の運用後、必要性を確認して以下を追加検討します。

- Play Mode中のMusicChart Runtime Monitor
- BGM AudioとMusicChart時計の同期差表示
- Current AttackEvent表示
- Preview／Charge／Fire状態のLive表示
- Loop occurrence表示
- シャオンダマ先行生成状況
- AttackEvent情報のExcel／CSV Import
- Validation Reportの出力

Runtime Monitorは初期版とは分離し、
静的データ表示・編集・Validationの運用結果と、
Runtime側から取得可能な情報が明確になった段階で仕様化します。

## 初期版の完了条件

初期版は、少なくとも以下を満たした時点で完成とします。

1. MIDIのTempo、拍子、Track、Noteを正しく表示できる
2. AudioClipを再生し、タイムライン上の位置と対応付けられる
3. MusicChartの手動設定を確認・編集できる
4. AttackEventのPreview開始、Charge受付開始、Charge受付終了、Fireの4つの時間境界を同一時間軸上で確認できる
5. MusicChart正本仕様と同じValidation結果を表示できる
6. Validation Errorの対象位置へ移動できる
7. MIDI再Import時に手動設定を保持できる
8. MIDI再Import前後の差分と影響候補を確認できる
9. 不正データを暗黙に自動修正しない
10. サウンド班・プランナー・プログラマーが同じAttackEventを識別できる

## 未決事項

以下は本ページ作成時点では確定しません。

- タイムラインの具体的なUI構成
- 波形表示を初期版に含めるか
- Note単体の試聴機能
- AttackEventの安定ID形式
- 再Import差分を適用前に表示するか、適用後に表示するか
- Validation Error時に保存を禁止するか
- Unity UI Toolkit、IMGUI、その他のどれで実装するか
- 初期版でRandom Sectionをどこまで編集可能にするか

これらは実装着手前または初期プロトタイプを確認した段階で決定します。

## 関連仕様

| 内容 | 正とする仕様 |
| --- | --- |
| MusicChartデータ構造・Import・静的Validation | BGM MusicChart仕様 |
| MIDI制作・Export条件 | BGM MIDIファイルの設定 |
| サウンド班からUnityまでの受け渡し | サウンド班制作フロー |
| AttackEventのGameplay上の意味 | BGM 攻撃イベント仕様 |
| AttackEventの成立・発火結果 | BGM 攻撃判定仕様 |
| BGM時計・system pre-roll・Audio再生 | BGMとGameplayの接続 |
| シャオンダマ生成Track・生成要求 | BGM シャオンダマ生成仕様 |
| Random Sectionの抽選規則 | BGM Random Section仕様 |

関連仕様の具体的なファイルパスは、
既存リポジトリ上の正式なページ構成に合わせてリンクを設定します。
