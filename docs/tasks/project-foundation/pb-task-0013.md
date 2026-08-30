---
title: "MusicChart Workbench AttackEvent編集・Timing表示・Validation"
description: MusicChart Workbench上でAttackEventを編集し、Preview／Charge／Fire TimingとValidation結果を同一Timeline上で確認できるようにする
pageType: task
taskId: PB-TASK-0013
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/music-chart-workbench
  - /spec/bgm/bgm-music-chart
  - /spec/bgm/bgm-attack-event
  - /spec/bgm/bgm-attack-judgement
  - /spec/bgm/bgm-gameplay-connection
---

# PB-TASK-0013｜MusicChart Workbench AttackEvent編集・Timing表示・Validation

## タスクの目的

PB-TASK-0012で作成するMusicChart WorkbenchのTimeline上で、AttackEventを人間が設定・確認できるようにします。

このタスクでは、

> **AttackEventの内容を編集し、Preview／Charge受付／Fireの時間関係とValidation結果を、その場で確認できる状態**

を完成させます。

## 完成時にできるようになること

- Timeline上でAttackEventを追加・選択・編集できる
- Chord／Arpeggioを設定できる
- MIDI Note表示からMusic Requirement Entryを設定できる
- exact MIDI Note、Arpeggio順序・Timing、Harmony、Timing Overrideを確認・編集できる
- Fire位置とPreview／Charge受付開始／終了を同じ時間軸で確認できる
- system pre-rollやTempo変更を含めた実効Timingを確認できる
- MusicChart正本仕様のValidation結果をError／Warningとして確認できる
- Validation対象のAttackEventやTimeline位置へ移動できる
- 問題があってもWorkbenchが値を勝手に補正しない

## 関連する仕様

<PageRelations />

画面・入力補助の方針は[MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench)を正本とします。

AttackEventデータやTiming、Validation条件そのものは以下を正本としてください。

- [BGM MusicChart仕様](/spec/bgm/bgm-music-chart)
- [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)
- [BGM 攻撃判定仕様](/spec/bgm/bgm-attack-judgement)
- [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)

Workbench側でAttackEventのGameplay規則を再定義しないでください。

## 実施内容

### 1. AttackEventをTimeline上で扱えるようにする

PB-TASK-0012のTimelineへAttackEventを表示し、対象を選択して編集できるようにします。

少なくとも以下の操作を可能にします。

- AttackEvent追加
- 削除
- 選択
- Fire Music Positionの設定
- Chord／Arpeggioの設定

同一Music Positionに複数のAttackEventが存在しても、別Eventとして識別できるようにしてください。

識別子の最終形式は未決仕様を勝手に確定せず、現在のMusicChart構造に合わせて実装してください。

### 2. Music Requirement Entryを編集できるようにする

PB-TASK-0012で表示したMIDI Noteを利用し、AttackEventへ必要なNoteを設定しやすくします。

少なくとも以下を扱えるようにします。

- exact MIDI Note
- Chordの複数Entry
- Arpeggioの音楽的順序
- Arpeggio Entry Timing

Pitch Classを別の独立正本として二重入力させないでください。

### 3. Harmony／Timing Overrideを編集できるようにする

AttackEventに必要な手動設定として、正本仕様に存在するHarmonyやTiming Overrideを確認・編集できるようにします。

設定項目の意味や成立条件はWorkbench側で独自判断せず、MusicChart／AttackEvent正本仕様に従ってください。

### 4. Preview／Charge／Fire Timingを同一Timelineへ表示する

選択したAttackEventについて、少なくとも以下を同じ時間軸上へ表示します。

- Preview開始
- Charge受付開始
- Charge受付終了
- Fire Music Position
- Arpeggio Entry Timing

Timing Overrideがある場合は、その結果として実際に使用される実効Timingを確認できるようにしてください。

system pre-roll、TempoMap、曲本編位置0との関係を崩さず表示します。

### 5. Validation結果を表示する

MusicChart正本仕様で得られるValidation結果をWorkbench上へ表示します。

各問題について少なくとも、

- Error／Warning
- 問題の説明
- 対象AttackEventまたはMusicChart要素
- 問題位置
- 関係する設定値

を確認できるようにします。

Validation条件そのものをWorkbench専用ロジックとして二重実装しないでください。

### 6. 問題箇所へ移動できるようにする

Validation一覧から対象を選択し、

- 該当AttackEventを選択
- Timelineを該当位置へ移動
- 関係する設定を確認

できるようにします。

大量のValidation結果があっても、どこを直せばよいか辿れる状態を目標とします。

### 7. 自動補正を行わない

Validation Errorを解消するために、Workbenchが以下のような値を無断変更しないようにします。

- Fire位置
- Preview開始位置
- Charge受付時間
- system pre-roll
- exact MIDI Note
- AttackEvent自体

問題は表示し、修正判断は担当者へ委ねます。

## 対象範囲

- AttackEventの追加・削除・選択・編集
- Fire Music Position
- Chord／Arpeggio
- Music Requirement Entries
- exact MIDI Note選択支援
- Arpeggio順序／Entry Timing
- Harmony
- Timing Override
- Preview／Charge受付開始／終了／Fire表示
- AttackEvent関連Validation表示
- Error／Warning一覧
- Validation対象位置へのNavigation
- 編集後のValidation再確認

## 対象外

- MIDI再Import／Diff
- 再Import影響候補確認
- Random Section編集
- Random Candidate専用作業
- Runtime Monitor
- AttackEventの自動生成
- 音楽的に適切なAttackEventの自動判断
- Validation Errorの自動修正
- Gameplay RuntimeのAttackEvent成立判定再実装

これらは後続タスクまたは正本Runtime側の責務です。

## 完了条件

- [ ] Timeline上へAttackEventを表示できる
- [ ] AttackEventを追加・削除・選択できる
- [ ] Fire Music Positionを編集できる
- [ ] Chord／Arpeggioを設定できる
- [ ] MIDI NoteからMusic Requirement Entryを設定できる
- [ ] exact MIDI Noteを正しく保持・表示できる
- [ ] Arpeggio順序／Entry Timingを編集できる
- [ ] Harmony／Timing Overrideを編集できる
- [ ] Preview／Charge開始／Charge終了／Fireを同一Timeline上で確認できる
- [ ] Timing Override反映後の実効Timingを確認できる
- [ ] MusicChart正本仕様のValidation結果を表示できる
- [ ] Error／Warningを区別できる
- [ ] Validation対象のAttackEvent／Timeline位置へ移動できる
- [ ] Validationのために値を暗黙に自動補正しない
- [ ] Workbench専用データへAttackEvent設定を二重保存していない

## 確認手順

1. PB-TASK-0012のWorkbenchでMusicChartを開きます。
2. Chord AttackEventを追加し、MIDI Noteから複数のRequirement Entryを設定します。
3. Arpeggio AttackEventを追加し、順序とEntry Timingを設定します。
4. Preview／Charge受付開始／終了／FireがTimeline上で正しい順序と位置に表示されることを確認します。
5. Timing Overrideを設定し、実効Timing表示が更新されることを確認します。
6. 意図的に不正なTimingやNote設定を作り、Validation Error／Warningが表示されることを確認します。
7. Validation項目から対象AttackEventと該当Timeline位置へ移動できることを確認します。
8. Validation実行後も、不正値がWorkbenchによって勝手に修正されていないことを確認します。

## 前提・依存タスク

### 前提

- [PB-TASK-0012｜MusicChart Workbench 基本画面・Timeline・MIDI・Tempo／拍子・Track／Note・Audio Preview](/tasks/project-foundation/pb-task-0012)

```text
PB-TASK-0012
Workbench基本画面・Timeline・MIDI・Audio Preview
        ↓
PB-TASK-0013
AttackEvent編集・Timing表示・Validation
        ↓
PB-TASK-0014
MIDI再Import・Diff・影響候補確認
        ↓
PB-TASK-0015
Random Section静的編集・Validation
        ↓
PB-TASK-0016
Runtime Monitor
```

## 実装時の注意点

- AttackEventのGameplay上の意味をWorkbenchへ再実装しないでください。
- Validation条件はMusicChart正本側と共有し、Workbench専用の別判定を増やさないでください。
- exact MIDI Noteを基準とし、Pitch Classを二重入力させないでください。
- Timing表示ではsystem pre-roll、Music Position、Audio位置を混同しないでください。
- AttackEvent IDの未決事項を、このタスクだけで勝手に正式決定しないでください。
- 入力補助は行っても、AttackEvent内容の自動決定・自動補正は行わないでください。
- 次タスクの再Import Diffでも同じAttackEventを追跡できる構造を意識してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、AttackEvent編集項目、Timing表示、Validation表示・Navigation、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
