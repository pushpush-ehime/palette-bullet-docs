---
title: "Planner Tuning Excel Export／Import・Validation・Base Snapshot"
description: Planner向けExcelへの出力、編集済みExcelの読込候補生成、Import前Validation、Base Snapshot保存を実装し、後続3-way判定へ安全に引き渡す
pageType: task
taskId: PB-TASK-0006
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/planner-tuning-parameter
---

# PB-TASK-0006｜Planner Tuning Excel Export／Import・Validation・Base Snapshot

## タスクの目的

[PB-TASK-0005｜Planner Tuning Core・Parameter Definition・Tuning Data基盤](/tasks/project-foundation/pb-task-0005)で管理できるようになったPlanner調整Parameterを、PlannerがExcelで確認・編集し、Unityへ戻せるようにします。

このタスクでは、**Excelへの出力、Excelからの読込、Import前Validation、未反映のImport Candidate生成、Base Snapshot保存**までを担当します。

読み込んだExcel値のTuning Dataへの確定反映は行わず、PB-TASK-0007の3-way Diff／Conflict解決へ引き渡します。

## 完成時にできるようになること

- Planner向けExcelをTuning Dataから生成できる
- Plannerがコードを知らなくてもParameter名・説明・Current Valueを見て調整できる
- Plannerが編集したExcelを、Tuning Dataへ未反映のImport Candidateとして読み込める
- ID、Type、Range等に問題があるExcelをImport Candidate確定前に止められる
- Error時にも正常時にも、このタスクではTuning Dataを更新しない
- Excel Export時点の値とDefinition状態をBase Snapshotとして保持できる
- 次タスクへBase Snapshot／Unity Current／Excel Import Candidateを渡し、3-way Diffを行える状態になる

## 関連する仕様

<PageRelations />

詳細な仕様は[Planner調整Parameter管理・Excel連携仕様](/spec/common-technology/planner-tuning-parameter)を正本とします。

特に以下を確認してください。

- Excel Export
- Planner編集フロー
- Excel Import
- Validation
- Excel Export時のBase Snapshot
- Diff／3-way Conflictとの境界

## 実施内容

### 1. Planner向けExcel Export

PB-TASK-0005のParameter DefinitionとCurrent Valueから、Planner向けExcelを生成します。

Plannerが主に確認・編集する情報は次のとおりです。

- Category
- Display Name
- Current Value
- Default
- Min／Max
- Unit
- Description
- Planner Note

Parameter IDやType等のProgrammer所有情報も照合用に保持しますが、Plannerが誤ってDefinitionを書き換える前提にはしません。

ExcelのSheet構成や見た目は実装担当判断とします。

### 2. Excel Import Candidateを生成する

PlannerがCurrent Valueを編集したExcelをUnityへ読み込み、PB-TASK-0007へ渡す未反映のImport Candidateを生成します。

読込時はParameter IDを基準にPB-TASK-0005のDefinition／Tuning Dataと照合してください。Excelの各行について、少なくともParameter ID、Excel Value、Planner Note、検証結果を後続処理から参照できるようにします。

全件を読み取り・ValidationしてからImport Candidateを成立させ、途中まで生成された候補を正式な入力として扱わないようにします。

**本タスクではImport Candidateの値をTuning Dataへ反映しません。** 正常なExcelであっても、PB-TASK-0007がBase／Unity Current／Excelを比較し、必要なConflict／Migrationを解決した後にだけ確定反映します。

### 3. Import前Validation

少なくとも以下を検出できるようにします。

- 未知のParameter ID
- 重複ID
- Type違反
- Range外の値
- 必須値の欠落
- 不正なEnum等、対応Typeに対する不正値
- Plannerが変更してはいけないDefinition情報の不整合
- Orphaned／Deprecated等、通常ImportできないParameter

不正値を自動Clamp・自動修正して成功扱いにはしません。

問題のParameterと理由を確認できるようにしてください。

### 4. Base Snapshotを保存する

Excel Export時点の状態を、次タスクの3-way Diffに利用できる形で保存します。

最低限、次を再確認できるようにします。

- Parameter ID
- Export時のCurrent Value
- DefinitionのVersionまたは内容Fingerprint
- Type
- Default
- Min／Max
- Category
- Source Binding
- Status／Deprecated状態

DefinitionのVersionを正式に持つ場合はその値を使用し、持たない場合は上記の比較対象から再現可能なFingerprintを生成します。

Base SnapshotをExcel内、別Sheet、補助ファイル等のどこへ保持するかは実装担当判断とします。

### 5. 後続Conflict処理へ接続する

このタスクではExcelとの安全な往復、Validation、未反映Import Candidateの生成までを完成させます。

PB-TASK-0007へ次の3入力を明示的に渡します。

```text
Base Snapshot
Unity Current Snapshot
Excel Import Candidate
```

PB-TASK-0007がこれらを比較し、Unity側とExcel側の両方が変更されている場合のDiff／Conflict処理と、解決後の確定反映を担当できる構造にしてください。

## 対象範囲

- Planner向けExcel Export
- Plannerが編集するCurrent Value／Planner Note
- Excel読込と未反映Import Candidate生成
- ID／Type／Range等のImport Validation
- Error時の不完全Candidate採用防止
- Export時Base Snapshot
- 後続3-way Diffへ渡すための情報保持

## 対象外

- 3-way Diffの判定
- Conflict検出・解決UI
- Unity／Excelのどちらを採用するかの判断
- Tuning Dataへの値の確定反映
- Parameter ID変更のMigration
- Type変更・Range変更等のDefinition Migration
- Orphaned Parameterの最終削除処理
- Cross Parameter Validation
- Runtime Hot Reload
- 高度なTuning Dashboard

これらは次の`Diff・3-way Conflict・Definition変更・Migration`タスクへ委譲します。

## 完了条件

- [ ] PB-TASK-0005のParameter Definition／Tuning DataからExcelを生成できる
- [ ] PlannerがCurrent Valueを編集できる
- [ ] 編集済みExcelから未反映のImport Candidateを生成できる
- [ ] Parameter IDで正しいParameterへ照合できる
- [ ] ID、Type、Range等の不正をImport Candidate成立前に検出できる
- [ ] 不正値を暗黙Clampしない
- [ ] Validation Error時に不完全なImport Candidateを採用しない
- [ ] 正常な読込でも本タスクではTuning Dataを変更しない
- [ ] Export時のCurrent ValueとDefinition状態をBase Snapshotへ保存できる
- [ ] Base Snapshot／Unity Current／Excel Import Candidateを次タスクから利用できる

## 確認手順

1. PB-TASK-0005で作成した複数のTuning ParameterをExcelへExportします。
2. ExcelでCurrent Valueを変更し、Unityへ読み込んでImport Candidateが生成されることを確認します。
3. 読込後もTuning DataのCurrent Valueが変更されていないことを確認します。
4. ID不正、Type不正、Range外値等を含むExcelを読み込み、Errorとして止まることを確認します。
5. Errorがある場合、不完全なImport Candidateが採用されず、既存Tuning Dataも更新されていないことを確認します。
6. Export後にUnity CurrentとExcel Valueを別々の値へ変更し、本タスクの読込時点ではどちらも上書きされないことを確認します。
7. Export時のCurrent ValueとDefinition状態がBase Snapshotとして保存されていることを確認します。

## 前提・依存タスク

### 前提

- [PB-TASK-0005｜Planner Tuning Core・Parameter Definition・Tuning Data基盤](/tasks/project-foundation/pb-task-0005)

### 後続

- Planner Tuning `Diff・3-way Conflict・Definition変更・Migration`

```text
PB-TASK-0005
Definition・Tuning Data
        ↓
PB-TASK-0006
Excel Export／Import・Validation・Base Snapshot
        ↓
次タスク
Diff・3-way Conflict・Definition変更・Migration
```

## 実装時の注意点

- ExcelをParameter DefinitionやRuntime Valueの唯一の正本にしないでください。
- Plannerが同じDefinitionをExcelへ手入力する仕組みにしないでください。
- Excelは全件Validation後にImport Candidateとして確定し、Tuning Dataへの反映はPB-TASK-0007だけで行ってください。
- Range外値等を自動補正して成功扱いにしないでください。
- Excelの見た目、Sheet分割、Base Snapshotの保存方法等は実装担当判断で構いません。
- 詳細なDefinition変更・Conflict処理は次タスクへ残してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、Excel構成、Import方法、Validation内容、Base Snapshotの保存方法、確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
