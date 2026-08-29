---
title: "MusicChart制作・確認ツール仕様"
description: MIDI・BGM・AttackEvent・Random Section・再Import差分・Runtime状態を同一の音楽時間軸上で確認・設定・検証するUnity Editorツール
pageType: spec
category: "共通技術"
status: 仮仕様
relatedTasks: []
---

# MusicChart制作・確認ツール仕様

## 目的

`MusicChart Workbench`は、MusicChartに関係する音楽データとGameplay用設定を、
Unity Editor上の同一の音楽時間軸で確認・設定・検証するための開発支援ツールです。

本ツールは単なる閲覧画面ではなく、以下の作業を一つの作業環境へまとめます。

- MusicChart制作
- MIDI Import結果の確認
- Gameplay用設定の入力補助
- BGM Audioと音楽時間の確認
- AttackEventの設定・確認
- Random Sectionの設定・確認
- Validation結果の確認
- MIDI再Import後の差分・影響確認
- Runtime上のMusicChart進行状況の監視

完成版では、静的なMusicChart制作だけでなくRuntime Monitorまで含めます。

ただし、完成版で必要な機能とプロトタイプで優先して実装する機能は分離します。
プロトタイプで優先度が低い機能であっても、完成版で必要な仕様から削除しません。

---

## 本ページの責務

本ページは、MusicChartのGameplay上の意味や各データの正式な挙動を独自に再定義しません。

以下は、BGMカテゴリおよび関連Gameplay仕様を正本とします。

- MusicChartのデータ構造
- MIDI Import／再Import規則
- TempoMap／NoteEvents
- system pre-roll
- AttackEventのGameplay上の意味
- Preview／Charge／Fireの時間規則
- Random Sectionの抽選規則
- シャオンダマ生成規則
- MusicChartの静的Validation条件
- BGM AudioとGameplay時計のRuntime同期
- Current Normal AttackEventの決定
- Charge Allocation
- Weak AttackEvent
- Palette Bullet化やDamage処理

本ページが所有するのは、主に以下です。

- 各データをEditor上でどのように表示するか
- 誰がどのように確認・入力するか
- 入力ミスをどう減らすか
- Validation結果をどう理解・確認させるか
- 問題箇所へどう移動させるか
- MIDI再Import差分をどう見せるか
- 保存状態・Validation状態・利用可否をどう表示するか
- Runtime状態をどう監視するか
- 完成版とプロトタイプの実装優先度
- Editorツールとして行ってはいけない自動補正

同じGameplay規則を正本仕様と本ページへ二重定義しません。
Workbenchは、正本仕様で確定された値や結果を表示・編集・検証するための作業環境として扱います。

---

## 利用者

初期の設定・保存担当はプログラマーとします。

ただし、プログラマー専用の内部ツールにはせず、
サウンド班、プランナー、QAも同じ画面で内容を確認できるようにします。

| 担当 | 主な利用目的 |
| --- | --- |
| サウンド班 | MIDI、Track、Note、AttackEvent候補、音楽位置、Chord／Arpeggio等の確認 |
| プランナー | 使用Track、AttackEvent採用、Timing、Random Section等のGameplay設定確認 |
| プログラマー | Import、MusicChartへの反映、Validation、保存、Runtime接続 |
| QA | BGMとGameplayのTiming、同期差、設定不整合の確認 |

AttackEventやRandom Candidateは、
サウンド班・プランナー・プログラマー・QAが同じ対象を一意に指し示せる必要があります。

---

## 正本の扱い

本ツール自身は、Gameplayデータの独立した正本にはしません。

| 情報 | 正本 |
| --- | --- |
| Tempo、拍子、Track、Note | 元MIDI |
| 完成BGM | 元音源およびUnityへImportしたAudioClip |
| TempoMap、NoteEvents | MIDIから生成されたMusicChartデータ |
| 使用Track、AttackEvent、Timing、Random Section等 | MusicChartの手動設定データ |
| 各データのGameplay上の意味 | 各正本仕様 |
| ウィンドウ配置、折り畳み、表示フィルター等 | Editor専用設定 |
| Runtime上のCurrentや進行状態 | 各Runtimeシステムが確定した状態 |

Workbench専用データとMusicChart内へ、同じGameplay設定を二重保存してはいけません。

Editorツールが存在しない場合でも、
MusicChartやRuntimeデータの意味が変化しない構造とします。

---

## 対象データ

Workbenchでは、少なくとも以下を表示・確認対象とします。

- BGM AudioClip
- MIDIファイルまたはImport元情報
- TempoMap
- 拍子
- Track
- NoteEvents
- system pre-roll
- シャオンダマ生成へ使用するTrack
- AttackEvent Timing Settings
- AttackEvent
- Preview開始
- Charge受付開始
- Charge受付終了
- Fire Music Position
- Chord／Arpeggio
- Music Requirement Entries
- Harmony
- Timing Override
- Random Section
- Random Candidate
- Sync Settings
- MIDI再Import差分
- Validation結果
- Runtime上のMusicChart進行状況

すべての項目を同じ方法で編集可能にする必要はありません。
MIDI由来データ、手動設定データ、Runtime読み取り値を明確に区別します。

---

## 完成版の全体機能

完成版では、少なくとも以下の機能を持つことを目標とします。

1. MusicChartとImport元の選択・状態確認
2. MIDI Import結果の表示
3. Tempo／拍子／Track／Noteの可視化
4. BGM AudioClipのEdit Modeプレビュー
5. シャオンダマ使用Trackの確認・設定
6. AttackEventの表示・編集
7. Preview／Charge受付／Fire Timingの表示
8. Random Sectionの静的編集・Validation
9. Validation結果の一覧・位置移動
10. 保存状態・Validation状態・Battle／Build利用可否の表示
11. MIDI再Import
12. 再Import差分・影響候補の表示
13. Runtime Monitor
14. Runtime上のMusicChart時計とAudio同期差の確認
15. Current AttackEventやRuntime occurrenceの確認
16. シャオンダマ先行生成状況の確認

Audio波形表示は完成版の必須機能に含めません。

---

## 基本画面構成

具体的な画面レイアウトやUnity Editor UI技術は実装担当へ委譲します。

固定レイアウトを仕様として強制しませんが、
機能上は概念的に以下の領域を持たせます。

1. MusicChart選択・Import状態
2. 保存状態・Validation状態・利用可否
3. BGMプレビュー操作
4. 音楽タイムライン
5. Track／Note表示
6. AttackEvent／Random Section表示
7. 選択対象の詳細編集
8. Validation結果
9. MIDI再Import差分
10. Runtime Monitor

これらを同一ウィンドウ内のタブとして構成するか、
一部を別ウィンドウとして分離するかは実装担当判断とします。

ただし、Runtime Monitorを同一ウィンドウのタブにするか別ウィンドウにするかは、
利用フローに影響するため最終方式のみ未決事項として残します。

---

## MusicChart選択・Import状態

現在対象としているMusicChartと、少なくとも以下を確認できるようにします。

- 対象MusicChart
- BGM AudioClip
- MIDI Import元
- MIDI Import済みか
- 未保存変更の有無
- 再Import後に確認すべき差分が存在するか
- Validation Error件数
- Validation Warning件数
- Battle利用可否
- Build利用可否

MusicChartを切り替えたとき、
表示対象と編集対象が別Assetのまま残ることがないようにします。

---

## 音楽タイムライン

横方向を音楽時間とし、少なくとも以下を同一の音楽時間基準で確認できるようにします。

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
- BGMプレビュー再生位置
- Runtime Monitor使用時の現在位置

system pre-roll、曲本編のMusic Position、AudioClipの音源位置を混同しない表示とします。

必要に応じて同じ画面上で複数の時間表現を併記しても構いませんが、
どの値がMusicChart時計で、どの値がAudioClip位置かを明確に識別できる必要があります。

---

## Track／Note表示

MIDI Trackごとにレーンを分け、
各NoteEventについて少なくとも以下を確認できるようにします。

- exact MIDI Note
- octave
- Velocity
- Music Position
- Note Length
- シャオンダマ生成への使用／不使用

Track数が多い場合に備え、次のような確認支援を可能にします。

- Trackの折り畳み
- 表示対象Trackの絞り込み
- シャオンダマ使用Trackだけの表示
- 選択したAttackEventに関係するNoteの強調

WorkbenchはDAWや高度なMIDI編集ソフトの代替にはしません。

### Audio波形

AudioClipの波形表示は不要です。

完成版・プロトタイプともに必須機能として扱わず、
本ツールの対象外とします。

### MIDI Note単体試聴

MIDI Noteをクリックして単体の音を鳴らす機能は、
現時点では実装優先度が非常に低い補助機能です。

- プロトタイプ必須機能にはしない
- 完成版の必須完了条件にも含めない
- 将来、実際の制作作業で必要性が確認された場合の追加候補とする

---

## BGMプレビュー再生

Edit ModeでBGM AudioClipを再生し、
現在の再生位置をタイムライン上へ表示できるようにします。

少なくとも以下を対象とします。

- 再生
- 一時停止
- 停止
- タイムライン位置へのSeek
- 選択したAttackEvent周辺からの再生
- 必要に応じた範囲Loop再生

確認対象は主に以下です。

- 実際の音源位置
- MIDI上の音楽位置
- AttackEventの設定位置
- Preview開始
- Charge受付開始
- Charge受付終了
- Fire Music Position

Gameplay全体をEdit Modeで完全再現する必要はありません。

BGMプレビューは、MusicChart設定と音源の対応を確認するための機能であり、
Runtime Battleそのもののシミュレーション機能として扱いません。

---

## AttackEvent表示・編集

AttackEventを選択したとき、
少なくとも以下を確認できるようにします。

- 一意な識別子
- MusicChart定義順
- Fire Music Position
- Chord／Arpeggio
- Music Requirement Entries
- 各Entryのexact MIDI Note
- Arpeggioの順序
- Arpeggio Entry Timing
- Harmony
- Timing Override
- 実効Preview開始位置
- 実効Charge受付開始位置
- 実効Charge受付終了位置
- Fire位置
- Validation結果
- 固定AttackEventかRandom Candidateか

同一Music Positionに複数のAttackEventが存在する場合でも、
定義順および識別子によって区別できるようにします。

Random Candidateも通常AttackEventと同じAttackEventデータ構造・編集機能を使用し、
Random専用の簡略化AttackEvent形式は作りません。

---

## AttackEvent入力補助

ツールがAttackEventを音楽的・Gameplay的に自動決定してはいけません。

人間が内容を決定し、
Workbenchは入力ミスを減らすための補助を行います。

想定する基本操作は以下です。

1. タイムライン上でFire位置を選択する
2. AttackEventを追加する
3. ChordまたはArpeggioを選択する
4. MIDI Note表示上からNoteを選択する
5. exact MIDI NoteをMusic Requirement Entryへ反映する
6. HarmonyやTiming Overrideを入力する
7. Preview／Charge受付／Fireの位置を確認する
8. Validation結果を確認する

Pitch Classを別の独立した正本値として二重入力させません。

必要なPitch Classは、
正本仕様に従ってexact MIDI Noteから導出します。

---

## AttackEvent ID

AttackEvent IDの最終方式は未確定です。

ただし、複数の担当者による確認、Validation、ログ、Runtime Monitor、
再Import後の追跡を考えると、
並べ替えやTiming変更で簡単に変化しない識別方法が必要です。

### 考えられる方式

- 配列番号
- MusicChart定義順
- `ATK-001`等の人間向け連番
- 小節・拍を含む位置ベースID
- 内容Hash
- GUID等の編集に依存しないStable ID

### 現在の推奨案

内部用Stable IDと、人間向けDisplay Codeを併用する案を推奨します。

```text
AttackEvent
├─ Stable ID
│  └─ GUID等の変更されない内部ID
├─ Display Code
│  └─ ATK-001
└─ Display Name
   └─ 任意の説明名
```

Stable IDは、以下の条件を満たす案とします。

- AttackEvent作成時に一度だけ生成する
- 並べ替えで変更しない
- Fire位置を変更しても変更しない
- Note、Harmony、Timingを変更しても変更しない
- 複製時は新しいIDを発行する
- 削除したIDを別のEventへ再利用しない
- 通常の画面操作では直接編集させない

Display Codeは、主に以下の用途に使用します。

- サウンド班との会話
- プランナー確認
- QA報告
- Validation表示
- Runtime Monitor
- ログ
- 仕様書やタスク上の参照

Display Codeも並べ替え時に自動で振り直さない案を推奨します。

このStable ID＋Display Code方式を正式採用するか、
Display Codeをどのように採番するかは未決事項です。

Random SectionおよびRandom Candidateについても、
同様のStable ID／Display Code方式を用いるかは未決事項とします。

---

## Random Section編集

Random Sectionの完成版は、
BGM Random Section仕様およびBGM MusicChart仕様に従って
静的データを作成・編集・検証できることを目標とします。

Random Sectionはプロトタイプでも可能な限り初期段階から対応します。

ただし、静的なRandom Section作成・編集・Validationは、
プロトタイプでの実装対象として優先して検討する一方、
**プロトタイプ完了Gateには含めません。**

初期実装で対応できない場合でも、
MusicChart制作・Validation・再Import等のプロトタイプ必須機能が成立していれば、
Workbench全体のプロトタイプ未完了とは扱いません。

### Random Section本体

少なくとも以下を対象とします。

- 作成
- 削除
- 並べ替え
- 開始位置
- 終了位置
- Candidate一覧
- 選択数
- 識別子
- タイムライン上の範囲表示

### Candidate

Candidateは通常AttackEventと同じデータ構造・編集機能を使用します。

少なくとも以下を対象とします。

- Fire Music Position
- Chord／Arpeggio
- Music Requirement Entries
- exact MIDI Note
- Arpeggio順序
- Arpeggio Timing
- Harmony
- Timing Override
- Validation
- Candidateの識別子

Random Section専用の簡略化AttackEvent形式は作りません。

### Random SectionのValidation表示

Validation条件そのものは正本仕様を参照します。

Workbenchでは、少なくとも以下の問題を確認できるようにします。

- 開始位置と終了位置の順序
- CandidateがSection範囲内にあるか
- 選択数が候補数に対して有効か
- CandidateのAttackEventデータが有効か
- CandidateのTimingがMusicChart全体のValidationを満たすか
- 識別子の重複
- 固定AttackEventと同じ位置にあり、固定側が優先されるCandidate

正本仕様上、固定AttackEventと同じ位置にあるCandidateで
固定側が優先されるため、そのCandidateが実質的に使用されない状態になる場合は、
少なくともWarningとして確認できるようにする案を採用します。

### プロトタイプで低優先にできるRandom関連機能

以下は仕様から削除せず、
プロトタイプでは低優先とします。

- Editor上の抽選シミュレーション
- Seedを指定した抽選再現
- 多数回抽選した分布表示
- Loopごとの抽選結果プレビュー
- 抽選履歴
- Runtime上で選択されたCandidateのLive表示

静的なRandom Section作成・編集・Validationは、
できるだけプロトタイプから対応します。

ただし、前述のとおりプロトタイプ完了Gateには含めず、
完成版では必須機能として扱います。

---

## Validation結果の表示

Validation条件そのものは、
BGM MusicChart仕様を正とします。

Workbenchでは、
Validation結果を理解・修正しやすい形で表示します。

各Validation項目は、少なくとも以下を持ちます。

- Error／Warning
- 安定した識別コード
- 問題の説明
- 対象MusicChart要素
- AttackEvent／Track／Random Section等の対象
- 小節・拍・Tick
- 関係する設定値
- 該当位置へ移動する操作
- 必要であれば関連仕様への参照

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

Validation識別コードの具体的な命名規則は未決です。

ただし、同種の問題をログ、レビュー、QA報告で
一意に特定できる形式を使用します。

---

## 自動補正の禁止

Workbenchは、Validationを通すためにデータを無断で修正してはいけません。

少なくとも以下を禁止します。

- Preview開始位置を自動移動する
- Charge受付時間を自動短縮する
- Fire Music Positionを自動変更する
- system pre-rollを自動変更する
- exact MIDI Noteを書き換える
- 削除されたTrackを別Trackへ読み替える
- AttackEventを自動削除する
- Random Sectionを別範囲へ移動する
- Candidateを自動的に固定AttackEventへ変換する
- MIDIやAudioClipへ無音を追加して辻褄を合わせる

問題がある場合は、少なくとも以下を表示します。

- 問題箇所
- 理由
- 影響範囲
- 関連設定

修正判断は担当者へ委ねます。

---

## 保存状態・Validation状態・利用可否

Workbenchでは、
Validation Errorの存在だけでなく、
保存状態と利用可否を別々に確認できるようにします。

少なくとも以下を表示します。

- 未保存変更の有無
- Assetが保存済みか
- Validation Error件数
- Validation Warning件数
- Battleで利用可能か
- Build対象として利用可能か

表示例：

```text
保存状態
Saved

Validation
Error 2 / Warning 1

Battle利用
Blocked

Build利用
Blocked
```

### 現在の推奨案

以下は確定仕様ではなく、現在の推奨案です。

- Validation Errorがあっても、作業途中のMusicChartは保存可能
- 保存可能であることと、Battleで利用可能であることは分離する
- Errorが残っているMusicChartはBattleで利用不可
- Errorが残っているMusicChartがBuild対象から参照されている場合はBuildを禁止
- Warningのみの場合は、Warningごとの定義に従う
- Workbench上に常時Error Bannerを表示する

Validation ErrorがあるMusicChartの保存可否、
Battle／Build Gateの具体範囲、
未使用MusicChartのErrorでもBuildを止めるかどうかは未決事項です。

---

## MIDI再Import差分

MIDI再Importでは、
MIDI由来データと手動設定データを明確に分離します。

### MIDI由来データ

以下は再Import後の新しい内容へ更新し、
画面にも更新後の内容を表示します。

- TempoMap
- 拍子
- Track
- NoteEvents
- exact MIDI Note
- Note位置
- Velocity
- Note Length

### 手動設定データ

以下は再Import前から存在する値を保持し、
そのまま表示します。

- 使用Track設定
- system pre-roll
- AttackEvent Timing Settings
- AttackEvent
- Music Requirement Entries
- Harmony
- Timing Override
- Random Section
- Candidate
- Sync Settings

再Import後の画面では、次の状態を同時に確認します。

```text
MIDI由来データ
→ 更新後

手動設定データ
→ 再Import前から保持している値
```

再Import差分をImport適用前に完全プレビューする方式を必須とはしません。

基本方針は、

> MIDI由来データは更新後を表示し、保持された手動設定と差分・影響候補を並べて確認する

とします。

### 差分対象

少なくとも以下を差分対象とします。

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

少なくとも以下を確認対象として表示します。

- 削除・変更されたTrackを参照するShaondama Settings
- 変更位置付近のAttackEvent
- 変更されたNoteに関係するMusic Requirement Entry
- Arpeggio Timing
- Random Section
- Candidate
- system pre-rollと最初のAttackEvent
- Tempo変更によってTimingが変化したAttackEvent

手動設定は自動変更しません。

### 確認状態

影響候補に対して、
以下のような作業確認状態を持たせる案を推奨します。

- 未確認
- 確認済み・変更なし
- 修正済み
- 影響なし

これは現在の推奨案であり、
確認状態を正式採用するか、
その保存場所をどこにするかは未決です。

---

## Runtime Monitor

Runtime Monitorは、
MusicChart Workbench完成版に必要な機能として扱います。

単なる将来候補にはしません。

ただし、プロトタイプでの実装優先度は低く、
静的なMusicChart制作・Validation・再Import環境を先に整備して構いません。

### Gameplay Runtime Traceとの責務境界

MusicChart WorkbenchのRuntime Monitorと
[Gameplay Runtime Trace](/spec/common-technology/gameplay-runtime-trace)は、
どちらもRuntime情報を扱いますが責務を分離します。

```text
MusicChart Workbench Runtime Monitor
=
MusicChart制作・確認の文脈で、
現在のMusicChart時計、Audio位置、Current AttackEvent、
Preview／Charge受付状態、Loop occurrence、
シャオンダマ先行生成状況等をLive表示する

Gameplay Runtime Trace
=
Input、Player State、Gameplay Event、Entity、Damage等を含む
複数System横断のRuntime事実を時系列Evidenceとして記録・保存・Exportする
```

Runtime Monitorは、Gameplay Runtime TraceのTimeline記録、
Correlation追跡、Session保存、JSON／JSONL Export等を再実装しません。

また、Gameplay Runtime Traceが存在しない場合でも、
Runtime Monitorが各Runtime本体の確定状態を直接読み取って
MusicChart確認に必要なLive表示を行える構造を妨げません。

### Runtime Monitorで表示する必須項目

少なくとも以下を表示します。

- 現在の小節
- 現在の拍
- 必要に応じて現在Tick
- 実際のAudio再生位置
- MusicChart時計
- Audio再生位置とMusicChart時計の同期差
- Current AttackEvent
- Preview中か
- Charge受付中か
- Fireまで何秒か
- 現在のLoop occurrence
- シャオンダマ先行生成状況

### 読み取り専用

Runtime Monitorは原則として読み取り専用とします。

表示画面から以下を直接変更しない方針とします。

- Battle進行
- MusicChart時計
- Audio再生位置
- Current AttackEvent
- Preview状態
- Charge受付状態
- Fire状態
- Loop occurrence
- シャオンダマ生成状態

デバッグ用Seekや再生制御を別機能として設ける場合も、
Runtime Monitorの通常監視と明確に分離します。

### Runtimeが確定した状態を表示する

Current AttackEvent、Preview中、Charge受付中等を、
Workbench側で独自に再判定しないことを基本方針とします。

可能な限り、
各Runtime本体が正式に確定した値を読み取って表示します。

例：

- Current AttackEventはCharge Allocation等のRuntime結果
- Preview状態はAttackEvent Runtimeの正式状態
- Charge受付状態はCharge受付Runtimeの正式状態
- Loop occurrenceはBGM Runtimeの正式周回情報
- シャオンダマ供給状況はSpawn／Supply Runtimeの正式情報

これにより、
Workbench表示上ではCurrentだが実際のGameplayではCurrentではない、
といった二重判定を防ぎます。

Runtime Monitorと各Runtimeシステムを接続するAPIの具体形は未決です。

### 同期差

同期差はsystem pre-rollを考慮します。

概念上は以下の関係とします。

```text
MusicChart時計
↓
system pre-rollとの対応を適用
↓
現在期待されるAudio再生位置

実際のAudio再生位置
-
期待されるAudio再生位置
=
同期差
```

符号表示は、以下の案を推奨します。

```text
正の値
= Audioが期待位置より先行

負の値
= Audioが期待位置より遅延
```

system pre-roll中は、
Audioが未再生で音源位置0にあることを状態として表示します。

同期差の厳密な型、許容値、Warning閾値は実装・Tuning事項とします。
ただし、Warning閾値の最終値は未決事項として管理します。

### Fireまでの残り時間

Fireまでの残り時間は、
Audio位置だけではなく、
正式なMusicChart時計とTempoMapを基準に算出できる必要があります。

Tempo変更をまたぐ場合でも正しく表示します。

Fire済み、対象外、Current未確定等の場合は、
誤解を招く数値を表示せず、状態を明示します。

### Loop occurrence

少なくとも以下を区別できるようにします。

- 現在のLoop番号
- AttackEvent Definition
- 今回のRuntime occurrence

概念例：

```text
Definition
ATK-014

Loop
3

Occurrence
ATK-014 / Loop 3
```

内部的なOccurrence IDの具体形式は実装へ委譲します。

### シャオンダマ先行生成状況

単なる生成数ではなく、
先行生成が間に合っているか判断できる情報を表示します。

少なくとも以下を検討対象とします。

- 必要なMinimumLeadTime
- 現在確保できているLeadTime
- どの音楽位置まで生成済みか
- 次の未生成NoteEvent
- 未処理NoteEvent数
- Ready／不足
- 不足している場合の不足時間

表示例：

```text
Shaondama Supply

必要LeadTime
4.000秒

現在LeadTime
5.230秒

生成済み位置
18小節2拍

次の未生成Note
18小節3拍 C4

状態
Ready
```

不足例：

```text
状態
Shortage

不足
0.720秒
```

---

## プロトタイプ優先度

完成版で必要かどうかと、
プロトタイプで先に実装するかどうかを分離して管理します。

| 機能 | 完成版 | プロトタイプ優先度 |
| --- | --- | --- |
| MIDI Import結果表示 | 必須 | 高 |
| Tempo／拍子／Track／Note表示 | 必須 | 高 |
| BGMプレビュー | 必須 | 高 |
| シャオンダマ使用Track設定 | 必須 | 高 |
| AttackEvent基本編集 | 必須 | 高 |
| Preview／Charge／Fire表示 | 必須 | 高 |
| Validation表示 | 必須 | 高 |
| エラー位置への移動 | 必須 | 高 |
| MIDI再Import | 必須 | 高 |
| 差分・影響候補表示 | 必須 | 高 |
| Random Section静的編集 | 必須 | 高～中高。初期版対応を目標とするが、プロトタイプ完了Gate外 |
| Random抽選シミュレーション | 任意または補助 | 低 |
| Runtime Monitor | 完成版必須 | 低 |
| MIDI Note単体試聴 | 現時点で任意 | 非常に低 |
| Audio波形 | 対象外 | 対象外 |

「優先度が低い」と「完成版に不要」は区別します。

---

## プロトタイプ対象外・非目標

以下は、プロトタイプの対象外または非目標とします。

- DAWの代替
- 作曲・編曲
- 高度なMIDI編集
- AttackEventの音楽的な自動決定
- Gameplayとして採用すべきAttackEventの自動判断
- 不正データの自動修正
- Battle全体のEdit Mode完全再現
- Player ChargeやDamage処理の完全シミュレーション
- Audio波形表示
- Excelとの双方向同期
- Runtime状態を監視画面から直接変更すること
- Random抽選シミュレーションを必須実装とすること
- MIDI Note単体試聴を必須実装とすること

Runtime Monitor自体は完成版仕様に含みますが、
プロトタイプでの優先度は低いものとします。

---

## プロトタイプ完了条件

プロトタイプは、少なくとも以下を満たすことを目標とします。

1. MIDIのTempo、拍子、Track、Noteを表示できる
2. AudioClipを再生し、タイムライン位置と対応付けられる
3. シャオンダマ使用Trackを確認・設定できる
4. AttackEventの基本データを確認・編集できる
5. Preview、Charge受付開始、Charge受付終了、Fireを同一時間軸で確認できる
6. MusicChart正本仕様に基づくValidation結果を表示できる
7. Validation対象位置へ移動できる
8. MIDI再ImportでMIDI由来データを更新できる
9. 手動設定データを保持できる
10. 再Import差分と影響候補を確認できる
11. 不正データを暗黙に自動修正しない
12. サウンド班・プランナー・プログラマーが同じAttackEventを識別できる

Random Sectionの静的データを正本仕様に沿って確認・編集・検証できることは、
プロトタイプでの追加目標としますが、プロトタイプ完了条件には含めません。

Runtime Monitorはプロトタイプ完了条件には含めません。

---

## 完成版完了条件

完成版は、プロトタイプ完了条件に加えて、
少なくとも以下を満たします。

1. Runtime Monitorが利用できる
2. 現在の小節・拍・Audio位置・MusicChart時計を確認できる
3. system pre-rollを考慮した同期差を確認できる
4. Current AttackEventを確認できる
5. Preview中／Charge受付中を確認できる
6. Fireまでの残り時間を確認できる
7. Loop occurrenceを確認できる
8. シャオンダマ先行生成状況を確認できる
9. Runtime MonitorがGameplay状態を独自に再定義しない
10. Random Sectionの正本仕様に必要な静的編集とValidationが一通り揃っている

MIDI Note単体試聴は、
現時点では完成版完了条件に含めません。

---

## 未決事項

以下は本ページ作成時点で未決です。

- AttackEvent IDに内部Stable ID＋Display Code方式を正式採用するか
- Display Codeの採番方法
- Random Section／Candidate IDの具体方式
- Validation ErrorがあるMusicChartの保存を許可するか
- Error時のBattle／Build Gateの具体範囲
- 未使用MusicChartのErrorでもBuildを止めるか
- 再Import影響候補の確認状態を正式採用するか
- 再Import影響候補の確認状態をどこへ保存するか
- Runtime Monitorと各Runtimeシステムの接続API
- 同期差のWarning閾値
- MIDI Note単体試聴を完成版へ含めるか
- Runtime Monitorを同一ウィンドウのタブにするか、別ウィンドウにするか

以下は未決事項には含めません。

- 具体的な画面配置：実装担当へ委譲
- Unity UI Toolkit／IMGUI等の選択：実装担当へ委譲
- Audio波形表示：不要・対象外
- 再Import後にどちらを表示するか：MIDI由来データは更新後、手動設定は保持値
- Runtime Monitorを仕様に含めるか：完成版に含める
- Random Sectionを完成版でどこまで対応するか：正本仕様どおりの静的編集・Validationを必須とする
- Random Sectionをプロトタイプ完了Gateに含めるか：含めない。プロトタイプでは追加目標とする

---

## 関連仕様

| 内容 | 正とする仕様 |
| --- | --- |
| MusicChartデータ構造・Import・静的Validation | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| MIDI制作・Export条件 | [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings) |
| サウンド班からUnityまでの受け渡し | [サウンド班制作フロー](/spec/bgm/sound-production-workflow) |
| AttackEventのGameplay上の意味 | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) |
| AttackEventの成立・発火結果 | [BGM 攻撃判定仕様](/spec/bgm/bgm-attack-judgement) |
| BGM時計・system pre-roll・Audio再生 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| シャオンダマ生成Track・生成要求 | [BGM シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama) |
| Random Sectionの抽選規則 | [BGM Random Section仕様](/spec/bgm/bgm-random-section) |
| Charge Allocation・Current AttackEvent | [Charge Allocation仕様](/spec/draw-system/charge-allocation) |
| 複数System横断のRuntime時系列Evidence | [Gameplay Runtime Trace仕様](/spec/common-technology/gameplay-runtime-trace) |

---

## 関連タスク

<PageRelations />
