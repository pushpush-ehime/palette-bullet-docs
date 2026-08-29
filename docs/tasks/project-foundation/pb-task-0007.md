---
title: "Planner Tuning Diff・3-way Conflict・Definition変更・Migration"
description: Base・Unity・Excelの差分とConflictを判定し、Definition変更やOrphaned Parameterを安全に確認・移行できる状態を完成させる
pageType: task
taskId: PB-TASK-0007
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/planner-tuning-parameter
---

# PB-TASK-0007｜Planner Tuning Diff・3-way Conflict・Definition変更・Migration

## タスクの目的

Planner Tuningの最終タスクとして、Excel Export後に**Unity側とExcel側の両方で変更が発生した場合でも、安全に差分を確認して反映できる仕組み**を完成させます。

また、Parameter Definitionの変更や削除によって、そのままImportできなくなったParameterを検出し、人間がMigration／保留／削除等を判断できる状態にします。

## 完成時にできるようになること

- Base、Unity Current、Excelの3つを比較して変更状況を確認できる
- Excelだけ変更、Unityだけ変更、同じ変更、Conflictを区別できる
- Conflict時に自動上書きせず、人間が採用する値を選べる
- DefinitionがExport後に変更されたParameterを通常の値変更と区別できる
- Type、Range、ID変更等を暗黙変換せずMigration対象として扱える
- Definitionから消えたParameterをOrphaned／Missingとして確認できる
- 必要なConflict／Migrationを解決した後、安全にTuning Dataへ反映できる

## 関連する仕様

<PageRelations />

詳細は[Planner調整Parameter管理・Excel連携仕様](/spec/common-technology/planner-tuning-parameter)を正本とします。

特に以下を確認してください。

- Diff
- 3-way Conflict
- Parameter Definition変更
- Parameter削除／Orphaned
- Current Value保持
- Validation
- 非目標

## 実施内容

### 1. 3-way Diffを実装する

PB-TASK-0006で保存したBase Snapshotと、Import時点のUnity Current、Excel Valueを比較します。

少なくとも以下を識別できるようにしてください。

- No Change
- Excel Changed
- Unity Changed
- Same Change
- Conflict
- Definition Changed
- Orphaned／Missing

基本となる比較は次のとおりです。

| Base | Unity | Excel | 結果 |
| --- | --- | --- | --- |
| 5 | 5 | 6 | Excel Changed |
| 5 | 7 | 5 | Unity Changed |
| 5 | 6 | 6 | Same Change |
| 5 | 7 | 6 | Conflict |

### 2. Conflictを人間が解決できるようにする

Unity側とExcel側が別々の値へ変更されている場合、自動でどちらかを上書きしません。

少なくとも人間が、

- Unity側を採用
- Excel側を採用
- 今回は保留

を判断できるようにします。

Conflictが未解決のまま、不透明にImportを完了させないでください。

具体的なUIは実装担当判断で構いません。

### 3. Definition変更を検出する

Excel Export後にParameter Definitionが変化した場合、Current Valueの通常Diffとは分けて確認できるようにします。

主な対象は以下です。

- Type変更
- Min／Max変更
- Parameter ID変更
- Parameter削除
- Deprecated化
- Category変更
- Source Binding変更
- Default変更

変更内容によって再Export、Migration、人間確認等が必要か判断できる状態にしてください。

### 4. 危険な変更を暗黙処理しない

特に以下は、自動変換して成功扱いにしないでください。

- Type変更
- Parameter ID変更
- Range外となるMin／Max変更
- 削除済み／Orphaned Parameter

Range外値を自動Clampしたり、Typeを暗黙変換したり、旧IDを推測だけで新IDへ接続したりしません。

### 5. Migration／Orphaned処理を用意する

Definition変更によってそのまま継続できないParameterについて、人間が状態を整理できるようにします。

少なくとも以下の判断ができる状態を目標とします。

- 新しいParameterへ移行する
- 現在値を保持して保留する
- 不要になったParameterを削除する
- 再Exportが必要であることを確認する

Migrationの内部データ形式やUIは実装担当判断とします。

重要なのは、Definition変更だけで既存Current Valueを失わないことです。

### 6. 解決後に安全に反映する

Diff、Validation、Conflict、Migration確認が完了したParameterだけを、最終的にTuning Dataへ反映できるようにします。

未解決ConflictやMigration Requiredが残っている場合は、誤って一括確定しないようにしてください。

## 対象範囲

- Base／Unity／Excelの3-way Diff
- Conflict検出
- Conflictの人間による解決
- Definition Changedの検出
- Type／Range／ID変更等のMigration Required判定
- Orphaned／Missing Parameterの確認
- Migration／保留／削除等の人間判断
- 解決後の安全なTuning Data反映

## 対象外

- Cross Parameter Validation
- Runtime Hot Reload
- 高度なTuning Dashboard
- Parameter変更履歴
- Preset／Profile
- Stage／Difficulty別Override
- Gameplayコードの自動書き換え

これらはPlanner Tuning初期版の完成には含めません。

## 完了条件

- [ ] Base／Unity／Excelの3-way比較ができる
- [ ] No Change／Excel Changed／Unity Changed／Same Change／Conflictを区別できる
- [ ] Conflictを自動Last-Write-Winsで解決しない
- [ ] Conflict時に人間がUnity／Excel／保留を選べる
- [ ] Definition Changedを通常のValue変更と区別できる
- [ ] Type変更、ID変更、Range不整合を暗黙変換しない
- [ ] Orphaned／Missing Parameterを確認できる
- [ ] Definition変更時も既存Current Valueを不用意に失わない
- [ ] Migrationが必要なParameterを人間が判断できる
- [ ] 未解決Conflict／Migration Requiredを残したまま誤って確定しない
- [ ] 解決後の値をTuning Dataへ安全に反映できる

## 確認手順

1. Base＝5、Unity＝5、Excel＝6で`Excel Changed`になることを確認します。
2. Base＝5、Unity＝7、Excel＝5で`Unity Changed`になることを確認します。
3. Base＝5、Unity＝6、Excel＝6で`Same Change`になることを確認します。
4. Base＝5、Unity＝7、Excel＝6で`Conflict`になり、自動反映されないことを確認します。
5. ConflictでUnity／Excelのどちらかを選び、選択した値だけが反映されることを確認します。
6. Type、Range、ID等を変更したDefinitionを用意し、通常ImportではなくDefinition Changed／Migration対象として確認できることを確認します。
7. DefinitionからParameterを削除し、保存済み値が即消去されずOrphaned／Missingとして確認できることを確認します。

## 前提・依存タスク

- [PB-TASK-0005｜Planner Tuning Core・Parameter Definition・Tuning Data基盤](/tasks/project-foundation/pb-task-0005)
- [PB-TASK-0006｜Planner Tuning Excel Export／Import・Validation・Base Snapshot](/tasks/project-foundation/pb-task-0006)

```text
PB-TASK-0005
Definition・Tuning Data
        ↓
PB-TASK-0006
Excel往復・Validation・Base Snapshot
        ↓
PB-TASK-0007
Diff・Conflict・Definition変更・Migration
        ↓
Planner Tuning 初期版完成
```

## 実装時の注意点

- ConflictをLast-Write-Winsで自動解決しないでください。
- Range外値を自動Clampしないでください。
- TypeやParameter IDを推測で自動Migrationしないでください。
- Definition変更によってCurrent Valueを不用意に破棄しないでください。
- UIやMigration情報の保存方式は実装担当判断で構いません。
- 詳細な仕様判断が必要になった場合は、タスクページではなくPlanner Tuning仕様を正本として確認してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、Diff判定、Conflict解決方法、Definition変更／Migrationの扱い、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
