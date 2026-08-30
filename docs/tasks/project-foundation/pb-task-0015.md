---
title: "MusicChart Workbench Random Section静的編集・Validation"
description: MusicChart Workbench上でRandom SectionとCandidateを静的に作成・編集し、正本仕様に基づくValidationを確認できるようにする
pageType: task
taskId: PB-TASK-0015
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/music-chart-workbench
  - /spec/bgm/bgm-music-chart
  - /spec/bgm/bgm-random-section
  - /spec/bgm/bgm-attack-event
---

# PB-TASK-0015｜MusicChart Workbench Random Section静的編集・Validation

## タスクの目的

MusicChart Workbench上でRandom Sectionを静的データとして作成・編集し、

> **どの範囲で、どのAttackEvent候補から、何件を抽選対象とするか**

をTimeline上で確認・Validationできるようにします。

このタスクはRandom抽選Runtimeの再現ではなく、MusicChartへ保存する静的設定の制作支援を担当します。

## 完成時にできるようになること

- 正本仕様で確定したRandom Section／Candidate Stable ID・Display Codeを保存・表示・Validationできる
- Random Sectionを追加・削除・並べ替えできる
- Sectionの開始／終了位置をTimeline上で確認・編集できる
- Candidateを追加・削除・編集できる
- Candidateを通常AttackEventと同等の編集UIで扱える
- 選択数を設定できる
- SectionとCandidateの位置関係をTimeline上で確認できる
- 範囲外Candidateや不正な選択数等をValidationで確認できる
- 固定AttackEventとの競合・優先関係に関するWarningを確認できる
- 問題箇所へ移動して修正できる

## 関連する仕様

<PageRelations />

Workbench上の表示・編集方法は[MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench)を正本とします。

Random Sectionの静的データとGameplay上の意味は以下を正本としてください。

- [BGM Random Section仕様](/spec/bgm/bgm-random-section)
- [BGM MusicChart仕様](/spec/bgm/bgm-music-chart)
- [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)

Workbench側でRandom抽選規則を別仕様として再定義しないでください。

## 実施内容

### 1. 確定済みRandom Section／Candidate Identifier Contractを実装する

[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)、[BGM Random Section仕様](/spec/bgm/bgm-random-section)、[MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench)で確定したIdentifier Contractを使用します。

Random Sectionは次を持ちます。

- 同一MusicChart内で衝突しない内部Stable ID
- MusicChart単位で発行する`RSEC-xxx`形式のDisplay Code

Random Candidateは通常AttackEventと同じデータ構造を使用し、Candidate専用の別ID形式を作りません。固定AttackEventと同じStable IDと共通の`ATK-xxx` Display Code系列を使用します。Identifierの発行・ValidationはPB-TASK-0013の共通基盤を再利用し、Candidate専用の別採番状態を作りません。

Stable IDとDisplay Codeは作成時に一度だけ発行し、並べ替え、Section範囲／Candidate Timing変更、CandidateのSection間移動、MIDI再Importでは維持します。複製時と別MusicChartへのコピー時は新しいIdentifierを発行し、削除済みIdentifierを再利用しません。

IdentifierはMusicChartの手動設定データへ保存し、Workbench専用SidecarやMIDIへ別正本として保存しません。削除済みDisplay Codeを再利用しないための次番号等の採番状態も、MusicChartの手動設定データへ保存します。

Stable IDは固定AttackEvent、Random Candidate、Random Sectionを含む同一MusicChart全体で一意とし、Definition種別をまたぐ重複も許可しません。

WorkbenchではSection／CandidateのStable ID、Display Code、Definition順を確認できるようにし、欠落・重複をValidation Errorとして検出します。既存データへの発行は明示的なMigration／修復操作で行い、Asset読込やMIDI再Import時に暗黙再生成しません。

Identifierは追跡・表示用であり、Random抽選、Candidate順序、固定AttackEvent優先等のGameplay判定へ使用しません。

### 2. Random SectionをTimeline上で表示・編集する

PB-TASK-0012のTimelineへRandom Sectionの範囲を表示します。

少なくとも以下を編集できるようにします。

- Section追加
- 削除
- 並べ替え
- 開始位置
- 終了位置
- 選択数

Sectionの範囲と音楽位置の関係が視覚的に分かるようにしてください。

### 3. Candidate一覧を編集できるようにする

各Random SectionへAttackEvent Candidateを登録できるようにします。

CandidateはRandom専用の簡略データ型を新設せず、通常AttackEventと同等のデータ構造・編集機能を利用します。

少なくとも以下を扱います。

- Fire Music Position
- Chord／Arpeggio
- Music Requirement Entries
- exact MIDI Note
- Arpeggio順序
- Arpeggio Timing
- Harmony
- Timing Override

PB-TASK-0013のAttackEvent編集UIを可能な限り再利用してください。

### 4. Random SectionとCandidateをTimeline上で確認する

Section範囲と、その中に存在するCandidateを同じTimeline上で確認できるようにします。

固定AttackEventとRandom Candidateも区別できるようにしてください。

### 5. Random Section Validationを表示する

正本仕様に基づき、少なくとも以下の問題を確認できるようにします。

- Section開始／終了位置の不正
- CandidateがSection範囲外
- 選択数が候補数に対して不正
- Candidate自身のAttackEventデータが不正
- Candidate TimingがMusicChart全体のValidationに違反
- 識別子の重複
- 固定AttackEventと同位置にあり、固定側優先によって実質使用されないCandidate

固定AttackEvent優先によってCandidateが使用されない状態は、正本仕様に従い少なくともWarningとして確認できるようにします。

### 6. Validation対象へ移動できるようにする

Validation一覧から、

- 対象Random Section
- 対象Candidate
- 該当Timeline位置

へ移動できるようにします。

### 7. 静的編集に限定する

本タスクではRandom SectionのDefinition作成・確認までを担当します。

Runtime抽選結果のLive表示や抽選シミュレーションは実装しません。

## 対象範囲

- Random Section Stable ID／`RSEC-xxx`と採番状態の保存・発行・維持
- Random Candidate共通AttackEvent Stable ID／`ATK-xxx`と採番状態の保存・発行・維持
- Stable ID／Display Code／Definition順の表示と重複・欠落Validation
- 既存データ向けの明示的Identifier Migration／修復
- Random Section追加／削除／並べ替え
- 開始／終了位置
- 選択数
- Candidate一覧
- Candidate追加／削除／編集
- 通常AttackEvent編集UIの再利用
- Timeline上のSection範囲表示
- Candidate表示
- Random Section Validation
- Candidate Validation
- 固定AttackEventとの競合Warning
- Validation対象へのNavigation

## 対象外

- Runtime抽選処理の実装
- Runtime抽選結果Live表示
- Random抽選シミュレーション
- Seed指定再現
- 多数回抽選の分布表示
- 抽選履歴
- Candidateの自動生成
- 不正Section／Candidateの自動修正
- Random専用簡略AttackEvent形式

## 完了条件

- [ ] Random Sectionが内部Stable IDと`RSEC-xxx` Display Codeを保持できる
- [ ] Random Candidateが通常AttackEventと同じStable ID契約と`ATK-xxx`系列を使用している
- [ ] 並べ替え、Section範囲／Timing変更、Section間移動、MIDI再ImportでIdentifierが維持される
- [ ] 複製と別MusicChartへのコピーでは新しいIdentifierが発行される
- [ ] 削除済みIdentifierとDisplay Codeを再利用せず、採番状態をMusicChartへ保持する
- [ ] Section／CandidateのStable ID／Display Code／Definition順をWorkbenchで確認できる
- [ ] Stable ID／Display Codeの重複・欠落をValidation Errorとして検出できる
- [ ] 固定AttackEvent、Random Candidate、Random SectionのStable ID重複をDefinition種別をまたいで検出できる
- [ ] 既存データのIdentifierを明示的なMigration／修復で発行でき、読込時に暗黙再生成しない
- [ ] IdentifierをRandom抽選・Candidate順序・固定AttackEvent優先へ使用していない
- [ ] Random Sectionを作成・削除できる
- [ ] Sectionの開始／終了位置を編集できる
- [ ] Section範囲をTimeline上で確認できる
- [ ] 選択数を設定できる
- [ ] Candidateを追加・削除できる
- [ ] Candidateを通常AttackEventと同等の項目で編集できる
- [ ] CandidateをTimeline上で確認できる
- [ ] 範囲外CandidateをValidationで検出できる
- [ ] 不正な選択数をValidationで検出できる
- [ ] Candidate自身のAttackEvent Validationを確認できる
- [ ] 固定AttackEvent優先による実質未使用CandidateをWarning等で確認できる
- [ ] Validation項目から対象Section／Candidateへ移動できる
- [ ] WorkbenchがRandom設定を暗黙に自動修正しない
- [ ] Random Candidate専用の別AttackEventデータ構造を作っていない

## 確認手順

1. WorkbenchでRandom SectionのStable ID／`RSEC-xxx`と、CandidateのStable ID／`ATK-xxx`を確認します。
2. MusicChart上にRandom Sectionを作成し、開始／終了位置を設定します。
3. 複数Candidateを登録し、それぞれChord／Arpeggio等を設定します。
4. 固定AttackEventとRandom CandidateのDisplay Codeが同じ`ATK-xxx`系列で重複せず、Sectionが別の`RSEC-xxx`系列を使用することを確認します。
5. Section／Candidateを並べ替え、Timing／範囲変更、Section間移動し、Identifierが維持されることを確認します。複製または別MusicChartへのコピーでは新しいIdentifierが発行され、削除後の新規作成でも削除済みDisplay Codeが再利用されないことを確認します。
6. Stable ID／Display Codeの重複または欠落を用意し、固定AttackEvent、Candidate、Sectionの種別をまたぐStable ID重複を含めてValidation Errorとして検出できることを確認します。
7. Timeline上でSection範囲とCandidate位置を確認します。
8. 選択数を変更し、正しい設定が保存されることを確認します。
9. CandidateをSection範囲外へ置き、Validation Error／Warningが表示されることを確認します。
10. 選択数を不正値にし、Validationで検出できることを確認します。
11. 固定AttackEventとCandidateを同位置へ置き、固定側優先に関するWarningを確認します。
12. Validation項目から該当Section／Candidateへ移動できることを確認します。
13. Validation後も値が自動修正されていないことを確認します。

## 前提・依存タスク

### 前提

- PB-TASK-0012｜MusicChart Workbench 基本画面・Timeline・MIDI・Tempo／拍子・Track／Note・Audio Preview
- PB-TASK-0013｜MusicChart Workbench AttackEvent編集・Timing表示・Validation

PB-TASK-0014の再Import Diffとは強い実装依存ではありませんが、統合後はRandom Section／Candidateも再Import影響候補として扱えるようにしてください。

```text
PB-TASK-0012
Workbench基盤
        ↓
PB-TASK-0013
AttackEvent編集・Validation
        ↓
PB-TASK-0014
MIDI再Import・Diff
        ↓
PB-TASK-0015
Random Section静的編集・Validation
        ↓
PB-TASK-0016
Runtime Monitor
```

## 実装時の注意点

- Random Candidateは通常AttackEventの編集基盤を再利用してください。
- Random SectionのGameplay抽選規則をWorkbenchへ二重実装しないでください。
- Validationは正本仕様の結果を表示する役割に留めてください。
- CandidateやSectionをValidation通過のために自動移動・削除しないでください。
- Runtime抽選シミュレーションを本タスクの完成条件へ追加しないでください。
- Stable IDを機械参照の正本とし、Display Code、配列Index、Definition順、Section範囲、Candidate位置を永続参照Keyとして流用しないでください。
- Stable ID／Display CodeをValidation通過のために暗黙再生成・再採番しないでください。
- IdentifierをRandom抽選、Candidate順序、固定AttackEvent優先へ使用しないでください。
- 後でRuntime Monitorへ接続できるよう、DefinitionとRuntime occurrenceを混同しない構造にしてください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、Random Section編集項目、Candidate編集、Timeline表示、Validation、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
