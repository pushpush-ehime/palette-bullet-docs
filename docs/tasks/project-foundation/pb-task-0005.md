---
title: "Planner Tuning Core・Parameter Definition・Tuning Data基盤"
description: Plannerへ公開するGameplay Parameterの明示登録、安定ID、Definition／Value分離、Tuning Data生成・同期・Current Value保護、Runtime参照契約を実装する
pageType: task
taskId: PB-TASK-0005
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/planner-tuning-parameter
  - /spec/common-technology/project-code-catalog
---

# PB-TASK-0005｜Planner Tuning Core・Parameter Definition・Tuning Data基盤

## タスクの目的

Planner調整Parameter管理・Excel連携基盤の最初の実装として、Programmerが**Plannerへ公開してよいGameplay Parameterだけを明示的に登録**し、その一度の宣言からParameter DefinitionとUnity側Tuning Dataを生成・同期できるCore基盤を完成させます。

本タスクで確立する中心契約は次のとおりです。

```text
Programmer
↓
Planner公開Parameterを明示
↓
Parameter Definition
├─ 安定したTuning Parameter ID
├─ Type / Default / Min / Max
├─ Display Name / Description / Unit 等
└─ Source Binding / Specification Reference
↓
Generator / Synchronizer
↓
Unity Tuning Data
└─ Current Value
↓
Gameplayが確定値を参照
```

このタスクではExcel Export／Importは実装しません。

また、3-way Conflict、Definition変更の詳細解決、ID Rename／Migration等も後続タスクへ委譲します。

ただし、後続処理が安全に接続できるよう、**Parameter Definition、Tuning Parameter ID、Tuning Value、Tuning Data、生成／同期結果、Runtime参照の公開契約**は本タスクで確定してください。

## 完成時にできるようになること

- ProgrammerがPlannerへ公開するParameterをコード上で明示的にOpt-inできる
- `[SerializeField]`や数値Fieldを自動的にPlanner公開しない
- 各ParameterをSource Symbolとは別の安定したTuning Parameter IDで識別できる
- DefinitionとCurrent Valueを明確に分離できる
- Parameter DefinitionをTuning Asset等へ人間が再入力する必要がない
- DefinitionからTuning Dataを生成／同期できる
- 新規ParameterをDefault Valueから自動追加できる
- Generatorを再実行しても既存Current ValueをDefaultへ戻さない
- Definitionから消えたParameterを即時削除せず、後続Migrationへ渡せる状態として検出・保持できる
- DefaultやMetadataが変化しても既存Current Valueを暗黙上書きしない
- Parameter IDから現在のTuning Valueを取得するRuntime側契約を利用できる
- 後続のExcel Export／Import、Validation、Diff／Conflict／Migrationが同じDefinitionとTuning Dataを利用できる
- Project Code Catalogがコード上のDefinitionをEvidenceとして収集できる構造を妨げない

## 関連する仕様

<PageRelations />

主な正本は[Planner調整Parameter管理・Excel連携仕様](/spec/common-technology/planner-tuning-parameter)です。

実装時は特に以下を確認してください。

- Project Code Catalogとの責務境界
- 基本原則
- Planner調整Parameterとは
- 公開可能Parameter／公開不可Parameter
- Opt-in方式
- Parameter Definition
- Parameter Value
- Tuning Parameter ID
- Parameter Metadata
- Tuning Data
- Tuning Data自動生成／同期
- 新規Parameter追加
- Parameter削除／Orphaned
- Current Value保持
- 初期版対象範囲
- 初期版完了条件
- 未決事項
- 非目標

[Project Code Catalog仕様](/spec/common-technology/project-code-catalog)は、Planner Tuning Definitionをコード上のEvidenceとして将来収集する側の責務確認に使用します。

本タスクからProject Code Catalogの生成物を参照しないとTuning基盤が動作しない構造にはしないでください。

## 実施内容

### 1. Planner公開ParameterのOpt-in宣言方式を実装する

Plannerへ公開するParameterは、Programmerが明示したものだけをTuning基盤へ登録します。

概念例：

```csharp
[PlannerTunable(
    "PLAYER.MOVE_SPEED",
    DisplayName = "通常移動速度",
    Unit = "m/s",
    Min = 0f,
    Max = 20f)]
```

これは構文固定例ではありません。

以下を満たす方式であれば、Attribute、明示Registration、Attribute＋Definition構造等の具体方式は実装担当へ委譲します。

- Planner公開であることがコード上で明示される
- Parameter IDを一意に取得できる
- Definition Metadataを取得できる
- Source Bindingを追跡できる
- 同一Definitionを別AssetやEditor画面へ人間が再入力しない
- Project Code Catalog等から機械的に発見可能な構造を妨げない
- Runtime内部状態を自動公開しない

Editor画面だけでParameterを手動登録し、コード上のDefinitionと独立した二重正本を作る方式は採用しないでください。

### 2. Parameter Definition契約を確定する

Parameter Definitionは「そのParameterが何であり、どの制約を持つか」を表します。

初期版では少なくとも以下を保持できる構造にしてください。

| 項目 | 意味 |
| --- | --- |
| Parameter ID | ゲーム調整項目としての安定Identity |
| Display Name | Plannerが見る名称 |
| Description | Parameterの意味 |
| Category | Planner向け分類 |
| Type | 値の型 |
| Default Value | 新規追加時の初期値 |
| Min | 最小値。適用可能な型のみ |
| Max | 最大値。適用可能な型のみ |
| Unit | m/s、秒、%等 |
| Step | 編集刻みのMetadata |
| Planner Editable | Planner公開対象であること |
| Source Binding | コード上の定義元との対応 |
| Specification Reference | 関連仕様への参照 |
| Status | Active／Missing Definition等を表現可能な状態 |

Current ValueはParameter Definitionへ含めず、Tuning Data側へ分離してください。

#### Definitionの正本

初期版では、仕様の推奨どおり**C#コード上の明示Definitionを正本とする**方式を基本とします。

Attributeだけで全Metadataを表現するか、Attributeと別Definition型を組み合わせるかは実装担当判断です。

採用方式と、「Definitionを人間が一度だけ記述すればよい」ことをPRで説明してください。

### 3. Tuning Parameter ID契約を確定する

Tuning Parameter IDはCode Symbol IDとは別Identityです。

例：

```text
Code Symbol
PaletteBullet.Player.PlayerMovement.moveSpeed

Tuning Parameter ID
PLAYER.MOVE_SPEED
```

本タスクでは、少なくとも次を保証してください。

- 全Definition内で一意
- 空IDを許可しない
- Source Fileの行番号をIdentityにしない
- Field名やFile Pathだけから暗黙生成して固定しない
- コードの配置変更だけで不要に変化しない
- Tuning Data、後続Excel、Diff、Conflict、Migrationの共通Keyとして利用できる
- 比較・Serialization時のCanonical表現が決まっている

具体的な命名規則は実装担当へ委譲しますが、後続タスクの公開契約になるため本PRで確定し、例を示してください。

#### Rename／Migrationとの境界

Parameter ID Rename時のMigration処理は後続タスクの責務です。

本タスクでは、

- IDは安定Identityとして扱う
- IDが変わった場合に別Parameterと誤って暗黙統合しない
- 旧IDを自動削除してCurrent Valueを失わない

という基礎を維持してください。

Deprecated IDの再利用禁止やRename Mappingの保存方式等は後続Migrationタスクで確定します。

### 4. Tuning Valueの型表現を確定する

DefinitionのTypeとTuning DataのCurrent Valueを安全に対応付ける型契約を実装します。

具体的な内部型やSerialization方式は実装担当へ委譲します。

ただし、後続Excel Importが型Validationできるよう、少なくとも次を満たしてください。

- Definitionから値の型を機械的に識別できる
- Current ValueがDefinition Typeと対応する
- Type違反を暗黙変換して正式値にしない
- 数値Rangeを適用可能な型で扱える
- boolやenum等を将来または初期対応できる拡張性がある
- Unsupported Typeを明示的に検出できる

初期対応するType集合は実装担当が決めて構いません。

ただし、採用Type一覧、Serialization形式、後からTypeを追加する方法をPRへ記載してください。

### 5. Tuning Data／Registryを実装する

Parameter Valueの正式な保存先として、Unity側にTuning Data／Registryを実装します。

単一ScriptableObject、複数Asset、その他Unityで安全にSerialization可能な構造のどれを採用するかは実装担当判断です。

最低限、次を満たしてください。

- Parameter IDでCurrent Valueを一意に取得できる
- Definitionから機械的に生成／同期できる
- Current ValueをUnity Project内へ保存できる
- Generator再実行で既存Current Valueを保持できる
- 新規ParameterだけをDefaultで初期化できる
- Missing Definition／Orphaned Candidateを即時破棄しない
- 後続Excel Importが一括更新できるデータ構造を持つ
- Gameplayが確定したCurrent Valueを参照できる
- 同一Parameter DefinitionをTuning Dataへ人間が再入力しない

#### DefinitionとValueの分離

概念上、以下を明確に分離します。

```text
Definition
PLAYER.MOVE_SPEED
Type = float
Default = 5
Min = 0
Max = 20

Tuning Data
PLAYER.MOVE_SPEED
Current = 7
```

`Default`をCurrent Valueの毎回同期元として扱わないでください。

### 6. Definition → Tuning Data生成・同期を実装する

Generator／Synchronizerを実装し、コード上のDefinition集合と保存済みTuning Dataを照合します。

最低限、次の状態を区別してください。

```text
Definitionあり / Valueなし
→ New Parameter

Definitionあり / Valueあり
→ Existing Parameter

Definitionなし / Valueあり
→ Missing Definition / Orphaned Candidate
```

詳細なDefinition変更DiffやMigration UIは後続タスクです。

ただし、本タスクでは安全な再同期のため、少なくとも次を成立させます。

#### 新規Parameter

Definitionにのみ存在するParameterは、Default ValueからCurrent Valueを初期化して追加します。

例：

```text
Definition
PLAYER.PARRY_WINDOW
Default = 0.20

Existing Tuning Data
該当IDなし
```

同期後：

```text
PLAYER.PARRY_WINDOW
Current = 0.20
```

#### 既存Parameter

既にTuning Dataに同じIDが存在する場合、Current Valueを保持します。

```text
Default = 5
Current = 7

再同期後
Current = 7
```

#### Missing Definition／Orphaned Candidate

DefinitionからIDが消えた場合、保存済みValueをGeneratorが即時削除しないでください。

少なくとも次を保持できるようにします。

- Parameter ID
- 最後のCurrent Value
- Missing Definitionであること

最後のMetadata、Migration先、保持期間等の詳細は後続Definition変更／Migrationタスクへ委譲します。

### 7. Current Value保護を実装する

Generator再実行時の最重要条件です。

以下を明示的にテストしてください。

#### Default変更

```text
Before
Default = 5
Current = 7

Definition変更
Default = 6

再同期後
Current = 7
```

新Defaultへ暗黙同期しないでください。

#### Metadata変更

Display Name、Description、Category、Unit、Step等のMetadataが変化しても、それだけを理由にCurrent Valueを書き換えないでください。

#### Min／Max変更

既存Current Valueが新Range外になった場合に、自動Clampして正式値として保存しないでください。

正式なValidation／Migration処理は後続タスクですが、Coreは値を破壊せず、後続処理が問題を検出できる状態を維持してください。

#### Type変更

Definition Typeが変化した場合、旧Current Valueを暗黙変換して正式値へ置き換えないでください。

Type変更の正式なMigrationは後続タスクへ委譲します。

### 8. Definition-levelの基本整合性検査を実装する

Excel Import Validationとは別に、Core Generator自身が安全に動作するためのDefinition検査を用意します。

少なくとも以下を検出してください。

- Parameter ID欠落
- Parameter ID重複
- Unsupported Type
- Default ValueとTypeの不整合
- Min／Max Metadataの不整合
- 同一IDに複数Source Bindingが競合する状態

Range外Current Valueをこの段階で自動Clampしないでください。

エラーがあるDefinition集合に対してTuning Dataを部分的に破壊する更新を行わない設計を優先します。

具体的なTransaction方式やError UIは実装担当へ委譲します。

### 9. Runtime参照契約を実装する

GameplayがTuning DataのCurrent Valueを参照できる最小のRuntime契約を実装してください。

概念例：

```text
Tuning Parameter ID
↓
Runtime Tuning Access
↓
Current Value
```

具体的なAPI名や取得方式は固定しません。

ただし、次を満たしてください。

- `UnityEditor`依存をRuntime Assemblyへ持ち込まない
- Project Code Catalog生成物をRuntimeで必須にしない
- ExcelファイルをRuntimeの正本にしない
- Parameter IDから型安全または型検証可能な方法でCurrent Valueを取得できる
- Value未登録、Type不一致等を識別可能である
- Debug用EditorツールがなくてもRuntime Valueの意味が変わらない

本タスクで既存Gameplayコードを大量にTuning Registry参照へ書き換える必要はありません。

専用fixtureまたは小さなSample ConsumerでRuntime参照契約を検証すれば構いません。

### 10. Project Code Catalogとの境界を守る

Planner Tuning Definitionは、Project Code Catalogが将来コード上からEvidenceとして発見できる構造を維持します。

ただし、責務は以下のままです。

```text
Project Code Catalog
=
コード上のDefinition／Attribute／Sourceを発見・収集する

Planner Tuning
=
Programmerが明示公開したDefinitionをRegistry化し、
Current Valueを保存・管理する
```

Tuning GeneratorがProject Code CatalogのJSONやMarkdownを読み込んで動作する構造にはしないでください。

低レベルAnalyzerを共有する場合は構いませんが、上位責務は分離してください。

### 11. Core用fixtureと自動テストを用意する

実Gameplayの調整Parameter登録を待たずに基盤単体を検証できるfixtureを作成してください。

少なくとも次のDefinitionを用意します。

```text
A: 新規Parameter
ID = TEST.FLOAT
Default = 5

B: 別TypeのParameter
ID = TEST.OTHER

C: Range付きParameter
ID = TEST.RANGED
Min / Maxあり
```

さらに次のケースを自動テストしてください。

- 新規DefinitionからCurrent ValueがDefaultで生成される
- Current Value変更後に再同期しても保持される
- Default変更後もCurrent Valueが保持される
- Metadata変更後もCurrent Valueが保持される
- Definition追加で既存Valueを壊さず新規だけ追加される
- Definition削除で既存Valueを即時削除しない
- ID重複を検出する
- Unsupported Typeを検出する
- Type変更時にCurrent Valueを暗黙変換しない
- Min／Max変更でCurrent Valueを暗黙Clampしない
- Runtime AccessからCurrent Valueを取得できる
- Project Code Catalog生成物がなくてもCoreが動作する

## 対象範囲

- Planner公開ParameterのOpt-in宣言方式
- Parameter Definition Model
- Tuning Parameter ID
- Definition Metadata
- Source Binding
- Specification Reference Metadata
- Tuning Valueの型契約
- Unity Tuning Data／Registry
- Definition → Tuning Data Generator／Synchronizer
- 新規ParameterのDefault初期化
- 既存Current Value保持
- Missing Definition／Orphaned Candidateの基礎検出・保持
- Definition-levelの基本整合性検査
- Gameplay向けRuntime Value参照契約
- 後続Excel／Diff／Migrationが利用する公開契約
- Core fixture／自動テスト

## 対象外

以下は本タスクでは実装しません。

- Excelファイル生成
- Excel Sheet／列／表示設計
- Excel Import
- Planner Note
- Excel Import時のID／Type／Range Validation
- Base Snapshot
- Import前Diff表示
- 3-way Conflict判定
- Conflict解決UI
- Last-Write-Wins以外の具体的Conflict解決操作
- Parameter ID Rename Migration
- Type変更Migration
- Range変更Migration
- Definition Versionの最終方式
- Orphaned Parameterの最終削除UI／保持期間
- Cross Parameter Validation
- Runtime Hot Reload
- 高度なTuning Dashboard
- 既存Gameplayコードの自動書き換え
- `[SerializeField]`からPlanner Parameterへの自動昇格
- Project Code Catalogの再実装
- Asset／Data Catalog
- Stage／Difficulty別Override
- Preset／Profile

Definition変更を安全に検出できる基礎情報は保持しますが、変更内容のDiff表示・判断・Migrationは後続タスクへ委譲します。

## 完了条件

- [ ] categoryが`開発基盤`になっている
- [ ] ProgrammerがPlanner公開Parameterを明示的にOpt-inできる
- [ ] `[SerializeField]`や数値型だけを理由に自動公開していない
- [ ] Parameter Definitionを一度のコード宣言から取得できる
- [ ] Parameter DefinitionとCurrent Valueが別Model／責務として分離されている
- [ ] Parameter ID、Display Name、Description、Category、Type、Default、Min、Max、Unit、Step、Source Binding、Specification Referenceを保持できる
- [ ] Tuning Parameter IDがCode Symbol IDと分離されている
- [ ] Tuning Parameter IDが一意で、Source Line／File位置だけに依存していない
- [ ] Initial supported Type集合とValue Serialization契約が確定している
- [ ] Tuning Data／RegistryへParameter IDごとのCurrent Valueを保存できる
- [ ] DefinitionからTuning Dataを機械的に生成／同期できる
- [ ] 新規ParameterをDefault Valueで自動追加できる
- [ ] Generator再実行時に既存Current Valueを保持できる
- [ ] Default Value変更だけで既存Current Valueを上書きしない
- [ ] Display Name等のMetadata変更だけでCurrent Valueを上書きしない
- [ ] Min／Max変更時に既存Current Valueを暗黙Clampしない
- [ ] Type変更時にCurrent Valueを暗黙変換しない
- [ ] Definitionから消えたParameterの保存済みValueを即時削除しない
- [ ] Missing Definition／Orphaned Candidateを後続Migrationへ渡せる状態で識別できる
- [ ] Parameter ID欠落／重複、Unsupported Type等のDefinition-level Errorを検出できる
- [ ] Definition Error時に既存Tuning Dataを不透明に部分破壊しない
- [ ] RuntimeからParameter IDを通じてCurrent Valueを参照できる
- [ ] Runtime側に不要な`UnityEditor`依存がない
- [ ] ExcelやProject Code Catalog生成物をRuntimeの必須依存にしていない
- [ ] 同一DefinitionをTuning Assetへ人間が再入力する必要がない
- [ ] 後続Excel／Conflict／Migrationが同じParameter ID、Definition、Tuning Data契約を利用できる
- [ ] Core fixtureによる自動テストで新規追加、再同期、Current Value保持、削除Definition、ID重複等を確認できる
- [ ] 宣言方式、ID規則、Tuning Data保存方式、Type契約、Runtime参照APIをPRへ記載している

## 確認手順

1. `Palette-Bullet`の最新`main`を取得し、本タスク用ブランチを作成します。
2. Unity EditorでCompile Errorがないことを確認します。
3. Core fixture／自動テストを実行し、全件成功することを確認します。
4. 新規Definition `TEST.FLOAT`等を登録し、Generator実行後にTuning DataへDefault Valueで追加されることを確認します。
5. `TEST.FLOAT`のCurrent ValueをDefaultと異なる値へ変更して保存します。
6. Generatorを再実行し、Current Valueが保持されることを確認します。
7. DefinitionのDefault Valueを変更して再同期し、既存Current Valueが新Defaultへ戻らないことを確認します。
8. Display Name／Category等のMetadataを変更して再同期し、Current Valueが保持されることを確認します。
9. 新規Definitionを追加して再同期し、既存Current Valueを保持したまま新規ParameterだけがDefaultで追加されることを確認します。
10. Definitionを1件削除して再同期し、保存済みCurrent Valueが即時削除されずMissing Definition／Orphaned Candidateとして識別できることを確認します。
11. 同じParameter IDを2つのDefinitionへ設定し、重複Errorとして検出され、既存Tuning Dataが破壊されないことを確認します。
12. Range外となるようMin／Maxを変更し、Current Valueが自動Clampされないことを確認します。
13. Type変更fixtureを用いて、旧Current Valueが暗黙変換されないことを確認します。
14. Runtime AccessのSample ConsumerからParameter IDでCurrent Valueを取得できることを確認します。
15. Project Code Catalog生成物やExcelファイルが存在しない状態でも、Definition収集・Tuning Data同期・Runtime参照が成立することを確認します。
16. Play Mode／Build対象のRuntimeコードへ不要な`UnityEditor`参照が入っていないことを確認します。

## 前提・依存タスク

### 前提

必須の実装前提タスクはありません。

Project Code Catalogとは将来的に低レベル解析を共有できる関係ですが、Planner Tuning CoreはProject Code Catalogの完成を待たず独立して実装可能にしてください。

### 後続

本タスクは以下のPlanner Tuningタスクの前提になります。

```text
PB-TASK-0005
Core・Parameter Definition・Tuning Data
        │
        ├──────────────┐
        ▼              ▼
後続タスク          後続タスク
Excel Export        Diff・3-way Conflict
Import              Definition変更
Validation          Migration
Base Snapshot
```

より具体的には、次の順で接続します。

1. Core・Parameter Definition・Tuning Data
2. Excel Export／Import・Validation・Base Snapshot
3. Diff・3-way Conflict・Definition変更・Migration

Excelタスクは、本タスクで確定したParameter ID、Definition Metadata、Current Value、Tuning Dataを正として利用してください。

Migrationタスクも同じID／Definition／Value契約を利用し、別Registryを作らないでください。

## 実装時の注意点

- Attribute名、Class名、File名、Namespace、ScriptableObject構成、Editor UI方式は実装担当判断とします。
- Parameter Definitionの宣言方式は後続タスクとProject Code Catalogから利用される公開契約になるため、PRで具体例を示してください。
- Parameter IDの命名規則は実装担当が決定して構いませんが、Source Field名の自動生成だけに依存しない安定Identityにしてください。
- ID Rename／Migrationの詳細処理は後続タスクへ残し、本タスクで複雑なMigration Frameworkを作り込まないでください。
- Tuning Dataを単一Asset／複数Assetのどちらにするかは実装担当判断ですが、Parameter IDで一意に取得できることを優先してください。
- Tuning Dataを複数Assetへ分ける場合も、同一Parameter IDが複数正本へ分裂しないようにしてください。
- Runtime Access APIは型安全性と将来のExcel Import更新を考慮してください。
- GeneratorのためにGameplay RuntimeへEditor解析処理を持ち込まないでください。
- Range外Valueを自動Clampして成功扱いにしないでください。
- Type変更を暗黙変換しないでください。
- Generator再実行でCurrent ValueをDefaultへ戻さないことを最優先で守ってください。
- Project Code Catalogは「発見」、Planner Tuningは「公開・Value管理」という責務を維持してください。
- 新しいPackage／外部依存を追加する場合は必要性、Editor／Runtime影響、Version固定方針をPRへ記載してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文へ、少なくとも以下を記載します。
   - Planner公開Parameterの宣言方式とコード例
   - Parameter Definitionの構造
   - Tuning Parameter IDの命名／Canonical規則
   - Code Symbol IDとの分離方法
   - Initial supported Type一覧
   - Tuning ValueのSerialization方式
   - Source Bindingの表現
   - Tuning Dataを単一／複数Asset等のどの方式で保存したか
   - Generator／Synchronizerの処理フロー
   - 新規／既存／Missing Definitionの判定規則
   - Current Value保護ルール
   - Definition-level Error時の更新方針
   - Runtime Access APIの利用例
   - Project Code Catalogとの責務境界
   - 新規Package／外部依存の有無
   - 自動テスト結果
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
