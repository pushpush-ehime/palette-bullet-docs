---
title: "MusicChart Workbench MIDI再Import・Diff・影響候補確認"
description: MIDI再Import後のMIDI由来データ差分と、保持された手動設定への影響候補をWorkbench上で確認できるようにする
pageType: task
taskId: PB-TASK-0014
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/music-chart-workbench
  - /spec/bgm/bgm-music-chart
  - /spec/bgm/bgm-midi-settings
  - /spec/bgm/bgm-attack-event
  - /spec/bgm/bgm-random-section
---

# PB-TASK-0014｜MusicChart Workbench MIDI再Import・Diff・影響候補確認

## タスクの目的

MusicChart WorkbenchからMIDIを再Importしたときに、

> **MIDI由来データの何が変わり、既存の手動設定のどこを確認し直す必要があるか**

を把握できるようにします。

再Import後のMusicChartを人間が安全に確認するためのDiff・影響確認機能を担当します。

## 完成時にできるようになること

- WorkbenchからMIDI再Importを実行できる
- Tempo／拍子／Track／Noteの変更点を確認できる
- MIDI由来データは新しいImport結果へ更新される
- AttackEvent等の手動設定は再Importだけでは勝手に書き換わらない
- AttackEvent／Random Section／CandidateのStable IDとDisplay Codeを再Import後も維持できる
- 変更されたTrack／Note／Tempo周辺に関係する設定を「影響候補」として確認できる
- どのAttackEventやRandom Sectionを再確認すべきか辿れる
- 差分・影響候補からTimeline上の対象位置へ移動できる
- 再Import後に通常Validationを再実行して状態を確認できる

## 関連する仕様

<PageRelations />

画面上での差分・影響確認方法は[MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench)を正本とします。

MIDI再Import時に何を更新し、何を保持するかは[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正本としてください。

関連して以下も参照します。

- [BGM MIDIファイルの設定](/spec/bgm/bgm-midi-settings)
- [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)
- [BGM Random Section仕様](/spec/bgm/bgm-random-section)

## 実施内容

### 1. MIDI再ImportをWorkbenchから実行できるようにする

現在開いているMusicChartのImport元MIDIを再Importできるようにします。

再Import後は、MIDI由来データを新しい内容へ更新します。

対象は少なくとも以下です。

- TempoMap
- 拍子
- Track
- NoteEvents
- exact MIDI Note
- Note位置
- Velocity
- Note Length

### 2. 手動設定を保持する

再Importだけを理由に、以下のような手動設定を自動変更しないでください。

- Shaondama使用Track設定
- system pre-roll
- AttackEvent Timing Settings
- AttackEvent
- AttackEvent／Random CandidateのStable IDとDisplay Code
- Random SectionのStable IDとDisplay Code
- Music Requirement Entries
- Harmony
- Timing Override
- Random Section
- Candidate
- Sync Settings

再Import後は、

```text
MIDI由来データ
→ 新しいImport結果

手動設定データ
→ 既存値を保持
```

という状態を明確にします。

Stable IDとDisplay CodeはMusicChartの手動設定データとして保持し、MIDI再Importを理由に再発行・再採番しません。

### 3. MIDI差分を確認できるようにする

再Import前後で少なくとも以下の差分を確認できるようにします。

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

表示形式の細部は実装担当判断で構いません。

重要なのは、何が変更されたかを人間が特定できることです。

### 4. 影響候補を抽出・表示する

MIDI差分を基に、既存の手動設定のうち再確認した方がよい対象を表示します。

少なくとも以下を候補に含めます。

- 削除／変更されたTrackを参照するShaondama Settings
- 変更位置付近のAttackEvent
- 変更されたNoteに関係するMusic Requirement Entry
- Arpeggio Timing
- Random Section
- Random Candidate
- Tempo変更によって実効Timingへ影響が出るAttackEvent
- system pre-rollと最初のAttackEventの関係

「影響候補」は自動修正対象ではありません。

影響候補のAttackEvent、Random Section、Random Candidateは、正本のStable IDで追跡します。Display Codeは人間向け表示に使用し、Timeline位置、配列Index、Definition順だけを永続的な照合Keyにしません。

### 5. 差分・影響候補から対象位置へ移動できるようにする

差分一覧または影響候補から、

- 対象Track
- 対象Note
- 対象AttackEvent
- 対象Random Section
- 該当Timeline位置

へ移動できるようにします。

### 6. 再Import後のValidationへ接続する

再Import完了後、保持された手動設定と新しいMIDI由来データの組み合わせに対して通常Validationを実行できるようにします。

PB-TASK-0013で実装したValidation表示を再利用してください。

## 対象範囲

- MIDI再Import操作
- MIDI由来データの更新
- 手動設定データの保持
- Stable ID／Display Codeと採番状態の維持
- Stable IDを使用した影響候補追跡
- Tempo／拍子／Track／Note Diff
- 影響候補抽出
- 影響候補一覧
- 対象位置へのNavigation
- 再Import後Validation
- 再Import後の未確認状態が分かる表示

## 対象外

- 手動設定の自動Migration
- 削除Trackから別Trackへの自動付け替え
- AttackEventの自動移動
- Music Requirement Entryの自動置換
- Tempo変更に合わせたTimingの自動補正
- Random Sectionの自動修正
- MIDI編集
- Git差分Viewerの代替

## 完了条件

- [ ] WorkbenchからMIDIを再Importできる
- [ ] MIDI由来データが新しいImport結果へ更新される
- [ ] 既存の手動設定が再Importだけでは変更されない
- [ ] AttackEvent／Random CandidateのStable IDと`ATK-xxx` Display Codeが維持される
- [ ] Random SectionのStable IDと`RSEC-xxx` Display Codeが維持される
- [ ] `ATK-xxx`／`RSEC-xxx`の採番状態が維持される
- [ ] 影響候補をStable IDで追跡し、Display Codeで人間が識別できる
- [ ] Tempo／拍子の差分を確認できる
- [ ] Track追加／削除／変更を確認できる
- [ ] Note追加／削除／位置／Pitch等の変更を確認できる
- [ ] 変更に関連するAttackEvent等を影響候補として確認できる
- [ ] 削除・変更Trackを参照する設定を影響候補として確認できる
- [ ] 差分・影響候補からTimeline上の対象へ移動できる
- [ ] 再Import後にValidationを再実行できる
- [ ] 影響候補を理由に手動設定を暗黙に自動修正しない

## 確認手順

1. AttackEventやShaondama使用Trackを設定したMusicChartを用意します。
2. 元MIDIのTempo、Track、Noteを一部変更したMIDIを再Importします。
3. MIDI由来データだけが更新され、手動設定、Identifier、Display Code採番状態が保持されることを確認します。
4. 再Import前後でAttackEvent／CandidateのStable IDと`ATK-xxx`、Random SectionのStable IDと`RSEC-xxx`が一致することを確認します。
5. Tempo／Track／Noteの各差分が一覧で確認できることを確認します。
6. 変更されたNoteに関係するAttackEvent等がStable IDで影響候補として追跡され、Display Code付きで表示されることを確認します。
7. 差分項目から該当Timeline位置へ移動できることを確認します。
8. Validationを実行し、新しいMIDIとの不整合を確認できることを確認します。
9. Workbenchが設定値やIdentifierを自動補正・再採番していないことを確認します。

## 前提・依存タスク

### 前提

- PB-TASK-0012｜MusicChart Workbench 基本画面・Timeline・MIDI・Tempo／拍子・Track／Note・Audio Preview
- PB-TASK-0013｜MusicChart Workbench AttackEvent編集・Timing表示・Validation

```text
PB-TASK-0012
Workbench基盤
        ↓
PB-TASK-0013
AttackEvent編集・Validation
        ↓
PB-TASK-0014
MIDI再Import・Diff・影響候補確認
```

## 実装時の注意点

- MIDI由来データと手動設定データの境界を崩さないでください。
- Stable ID／Display CodeをMIDI由来データとして扱わず、再Importで再発行・再採番しないでください。
- 影響候補の追跡にはStable IDを使用し、Display Code、位置、配列Indexだけで照合しないでください。
- 再Importを「新MIDIに合わせて既存設定を自動で直す機能」にしないでください。
- Diffは確認支援であり、Gameplay仕様の正誤判定ではありません。
- NoteやTrackの類似性だけで勝手に参照先を置換しないでください。
- PB-TASK-0013のTimeline・AttackEvent選択・Validation UIを再利用してください。
- 後続のRandom Sectionについても影響候補として扱える構造にしてください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、再Import対象、Diff種類、影響候補、手動設定保持、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
