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

### 1. Random SectionをTimeline上で表示・編集する

PB-TASK-0012のTimelineへRandom Sectionの範囲を表示します。

少なくとも以下を編集できるようにします。

- Section追加
- 削除
- 並べ替え
- 開始位置
- 終了位置
- 選択数

Sectionの範囲と音楽位置の関係が視覚的に分かるようにしてください。

### 2. Candidate一覧を編集できるようにする

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

### 3. Random SectionとCandidateをTimeline上で確認する

Section範囲と、その中に存在するCandidateを同じTimeline上で確認できるようにします。

固定AttackEventとRandom Candidateも区別できるようにしてください。

### 4. Random Section Validationを表示する

正本仕様に基づき、少なくとも以下の問題を確認できるようにします。

- Section開始／終了位置の不正
- CandidateがSection範囲外
- 選択数が候補数に対して不正
- Candidate自身のAttackEventデータが不正
- Candidate TimingがMusicChart全体のValidationに違反
- 識別子の重複
- 固定AttackEventと同位置にあり、固定側優先によって実質使用されないCandidate

固定AttackEvent優先によってCandidateが使用されない状態は、正本仕様に従い少なくともWarningとして確認できるようにします。

### 5. Validation対象へ移動できるようにする

Validation一覧から、

- 対象Random Section
- 対象Candidate
- 該当Timeline位置

へ移動できるようにします。

### 6. 静的編集に限定する

本タスクではRandom SectionのDefinition作成・確認までを担当します。

Runtime抽選結果のLive表示や抽選シミュレーションは実装しません。

## 対象範囲

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

1. MusicChart上にRandom Sectionを作成し、開始／終了位置を設定します。
2. 複数Candidateを登録し、それぞれChord／Arpeggio等を設定します。
3. Timeline上でSection範囲とCandidate位置を確認します。
4. 選択数を変更し、正しい設定が保存されることを確認します。
5. CandidateをSection範囲外へ置き、Validation Error／Warningが表示されることを確認します。
6. 選択数を不正値にし、Validationで検出できることを確認します。
7. 固定AttackEventとCandidateを同位置へ置き、固定側優先に関するWarningを確認します。
8. Validation項目から該当Section／Candidateへ移動できることを確認します。
9. Validation後も値が自動修正されていないことを確認します。

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
```

## 実装時の注意点

- Random Candidateは通常AttackEventの編集基盤を再利用してください。
- Random SectionのGameplay抽選規則をWorkbenchへ二重実装しないでください。
- Validationは正本仕様の結果を表示する役割に留めてください。
- CandidateやSectionをValidation通過のために自動移動・削除しないでください。
- Runtime抽選シミュレーションを本タスクの完成条件へ追加しないでください。
- 後でRuntime Monitorへ接続できるよう、DefinitionとRuntime occurrenceを混同しない構造にしてください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、Random Section編集項目、Candidate編集、Timeline表示、Validation、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
