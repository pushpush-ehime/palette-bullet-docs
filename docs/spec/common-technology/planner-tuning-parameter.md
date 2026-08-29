---
title: "Planner調整Parameter管理・Excel連携仕様"
description: Plannerへ公開するGameplay Parameterをプログラマーが明示し、Parameter Definition、Tuning Data、Excel Export／Import、Validation、Diff／Conflict処理を重複入力なしで管理する共通技術基盤
pageType: spec
category: "共通技術"
status: 仮仕様
relatedTasks: []
---

# Planner調整Parameter管理・Excel連携仕様

## 目的

本基盤は、プログラマーが「Plannerが調整してよいGameplay Parameter」を一度だけ明示し、
その定義からUnity上のTuning Data、Planner向けExcel、Validation情報等を自動的につなぐための開発支援基盤です。

目的は、単なるExcel Export／Importではありません。

以下の問題を解消し、
Plannerがコード構造を理解しなくても安全にゲームバランスを調整できる状態を作ります。

- Plannerが調整したい値を変更するたびにプログラマーへ依頼する必要がある
- Unity Inspector上のどの値をPlannerが触ってよいか分からない
- Scene／Prefabごとに同じParameterが分散し、正本が分からなくなる
- C#、ScriptableObject、Excelへ同じ定義を人間が何度も入力すると二重管理になる
- Excel Import時に型、範囲、古いParameter等の不整合が起きる
- Excel Export後にUnity側の値も変更された場合、どちらを採用すべきか判断しにくい
- コードのリファクタリングだけでPlanner側のParameter IDまで変化すると、継続的な調整が難しくなる
- 調整可能値とRuntime内部状態が混在すると、安全にPlannerへ公開できない

本基盤では、概念上以下の流れを成立させます。

```text
Programmer
↓
Planner調整可能Parameterを一度だけ明示
↓
Parameter Definition
↓
自動生成／同期
├─ Tuning Data
├─ Excel Export
└─ Validation情報
↓
PlannerがExcelでCurrent Valueを調整
↓
Import
↓
Diff／Conflict／Validation
↓
Unity Tuning Dataへ反映
↓
Gameplayが参照
```

Project Code Catalogとの接続は、
本基盤がCatalog生成物へ参照Metadataを直接書き込む方式とはしません。

Programmerがコード上へ明示したPlanner調整Parameter Definitionを、
Project Code Catalog側がコード構造・Attribute・Parameter ID等のEvidenceとして
機械収集できる関係とします。

---

## 背景

Palette Bulletでは、
Player、Enemy、Combat、BGM、UI等の多数のGameplay調整値が存在します。

これらをすべてソースコードへ固定すると、
Plannerによる調整のたびにプログラマー作業が必要になります。

一方で、
すべての`[SerializeField]`や数値FieldをPlannerへ公開すると、

- Runtime内部状態
- Component参照
- 一時Timer
- State Machine内部値
- 実装都合のCache
- Debug用値

まで編集可能になり、
安全な調整基盤にはなりません。

また、
Tuning用ScriptableObjectとExcelを人間が手作業で二重定義すると、
「どちらが正しいDefinitionか」という新しい問題を作ります。

本基盤では、
Plannerへ公開するParameterをプログラマーが明示し、
その定義から必要な派生データを自動生成・同期することで、
調整しやすさと実装安全性を両立します。

---

## 本ページの責務

本ページは、
Planner調整可能Parameterをどのように明示し、
Definition、Value、Excel、Validation、Diff／Conflictを
どのように一貫して管理するかを定義します。

主な責務は以下です。

- Planner調整Parameterの公開ルール
- Opt-in方式
- Parameter Definition
- Parameter Value
- Tuning Parameter ID
- Parameter Metadata
- Tuning Data
- Tuning Data自動生成／同期
- 新規Parameter追加
- 削除Parameter／Orphaned処理
- Current Value保護
- Excel Export
- Planner編集範囲
- Excel Import
- Validation
- Diff
- 3-way Conflict
- Parameter Definition変更時の扱い
- Project Code Catalogとの責務境界

本ページは、
Project Code Catalogのコード構造収集を再定義しません。

また、
個々のGameplay Parameterが何を意味するかは、
各Gameplay仕様またはParameter Definition側の仕様参照を正とします。

---

## Project Code Catalogとの責務境界

`Project Code Catalog`と本基盤は、
技術的に接続可能ですが責務を分離します。

```text
Project Code Catalog
=
コード上に何が存在するかを
広く機械収集する

Planner調整Parameter基盤
=
その中から何をPlannerへ公開するかを
Programmerが明示し、
Valueの編集・Excel連携・Import・Validationを管理する
```

Project Code Catalogは、
例えば以下を広く収集できます。

- Field
- Property
- const
- readonly
- `[SerializeField]`
- `[Range]`
- `[Min]`
- `[Tooltip]`
- Default Value
- ScriptableObject
- Attribute
- Source Location

しかし、

```text
[SerializeField]だからPlanner調整可能
```

```text
floatだからPlanner調整可能
```

とは判断しません。

Planner公開の決定は、
本基盤側の明示的なOpt-inルールに従います。

基本の役割分担は以下です。

```text
Project Code Catalog
↓
候補を発見

Programmer
↓
Plannerへ公開してよいParameterを明示

Planner
↓
Valueだけを調整

Tuning基盤
↓
Validation・Import・Diff・Conflict処理

Gameplay
↓
確定したTuning Valueを使用
```

> **Catalogは発見する。Programmerが公開する。PlannerがValueを調整する。**

この分担を崩しません。

---

## 基本原則

### 1. Parameter Definitionは一度だけ宣言する

同一ParameterのDefinitionを、
C#、ScriptableObject、Excel等へ人間が重複入力する運用を禁止します。

Programmerが一度定義した、

- Parameter ID
- Display Name
- Type
- Default Value
- Min／Max
- Unit
- Description

等から、
必要な派生データを可能な限り自動生成・同期します。

### 2. 派生データは可能な限り自動生成する

Parameter Definitionから、

- Tuning Registry
- Tuning Data
- Excel Export
- Validation情報

等を派生させます。

Project Code Catalogはこれらの派生データの出力先にはせず、
コード上の明示的なParameter Definitionを独立してEvidenceとして収集します。

### 3. Catalogは発見、Programmerは公開、PlannerはValue調整

Project Code Catalogの機械収集結果と、
Planner公開の意思決定を混同しません。

### 4. Planner公開はOpt-in

Planner調整Parameterは、
Programmerが明示的に公開したものだけを登録します。

自動推測だけでPlanner公開しません。

### 5. Code Symbol IDとTuning Parameter IDを分離する

コード上のSymbol Identityと、
ゲームデザイン上のTuning Identityは別物として扱います。

### 6. DefinitionとValueを分離する

Parameterの意味・制約と、
現在採用中の値を別概念として管理します。

### 7. Excelを唯一の正本にしない

ExcelはPlanner向けAuthoring／Transfer Interfaceです。

Parameter DefinitionとRuntime Valueの唯一の正本にはしません。

### 8. 再生成時にCurrent Valueを失わない

Generatorを再実行しても、
Plannerが調整済みのCurrent ValueをDefault Valueへ戻しません。

### 9. Import前に全件Validationする

Excel Importは、
全件Validation後にまとめて反映します。

一行ずつ逐次Assetを更新しません。

### 10. 不正値を暗黙補正しない

Range外値を自動Clampして成功扱いにする等の補正を行いません。

問題はErrorとして明示します。

### 11. Conflictを人間へ明示する

Unity側とExcel側で別々の変更があった場合、
Last-Write-Winsで自動解決しません。

### 12. Runtime内部状態をPlannerへ公開しない

Runtime Cache、Current State、一時Timer等を
Planner調整Parameterとして扱いません。

### 13. Project Code Catalogと責務を重複させない

共通の低レベルC#解析処理を共有することはできますが、
Catalog生成物をTuning基盤のRuntime必須依存にはしません。

### 14. 便利にするためのツールで重複作業を増やさない

専用ScriptableObject、Excel Sheet、Catalog Metadata等へ
同一Definitionを人間が再入力する仕組みにしません。

---

## Planner調整Parameterとは

Planner調整Parameterは、

> **ゲーム体験、操作感、難易度、バランス、演出等を調整するための値であり、Plannerが変更してもコード構造を破壊しないもの**

を対象とします。

主な候補例は以下です。

- Player通常移動速度
- Dash速度
- Dash継続時間
- Dashスタミナ消費量
- Jump力
- Parry受付時間
- Just Parry受付時間
- Enemy HP
- Enemy移動速度
- Damage倍率
- 爆風倍率
- Spawn間隔
- Camera Shake強度
- HitStop長
- HitStop強度
- UI演出時間
- MusicChart系のうちPlanner調整対象として定義された値

コード上に存在する値すべてがPlanner調整Parameterになるわけではありません。

```text
コード上に存在する
≠
Plannerが変更してよい
```

---

## 公開可能Parameter／公開不可Parameter

### 公開可能候補

以下の性質を持つものは、
Planner公開候補になり得ます。

- ゲームバランスへ直接影響する
- 操作感を調整する
- 演出強度・時間を調整する
- 難易度を調整する
- SpawnやDamage等の調整値
- Parameter変更だけでコード構造を破壊しない
- RangeやTypeを明示できる
- Gameplay仕様上、調整値として扱われる

### 基本的に公開しないもの

以下は基本的にPlanner公開しません。

- `CurrentHp`
- `CurrentState`
- `verticalVelocity`
- `lastGroundedTime`
- Runtime Cache
- Component参照
- Coroutine管理値
- State Machine内部ID
- Event callback
- 一時的なTimer
- Runtime occurrence ID
- 内部フラグ
- デバッグ専用値

Planner公開可否は、
型だけで決定しません。

---

## Opt-in方式

Planner調整Parameterは、
Programmerが明示的に公開したParameterだけをTuning基盤へ登録します。

概念上は、
以下のような専用Attributeまたは等価な宣言方式を利用できます。

```csharp
[PlannerTunable(
    "PLAYER.MOVE_SPEED",
    DisplayName = "通常移動速度",
    Unit = "m/s",
    Min = 0f,
    Max = 20f)]
```

具体的なAttribute名やC#構文は未決です。

重要なのは、
一つの宣言から少なくとも以下を一意に取得できることです。

- Planner公開であること
- Parameter ID
- Parameter Definition Metadata
- Source Binding

Parameter公開を、
Editor画面だけで手動登録してコード側Definitionと分離する方式は基本方針としません。

---

## Parameter Definition

Parameter Definitionは、

> **そのParameterが何であり、どのような制約を持つか**

を定義します。

概念例：

```text
Parameter ID
PLAYER.MOVE_SPEED

Display Name
通常移動速度

Description
Playerの通常地上移動時の速度

Category
Player / Movement

Type
float

Unit
m/s

Default
5.0

Min
0

Max
20

Step
0.1

Planner Editable
Yes
```

DefinitionはCurrent Valueとは別です。

### Definitionの正本

現時点では、

> **C#コード上の明示的なDefinitionを正本とする**

方向を推奨します。

Excelから以下を変更させません。

- Parameter ID
- Type
- Min
- Max
- Unit
- Source Binding

これらはProgrammer所有情報です。

Parameter DefinitionをAttributeだけで表現するか、
Attributeと別のDefinition構造を組み合わせるかは未決です。

---

## Parameter Value

Parameter Valueは、

> **現在Gameplayで採用している値**

です。

概念例：

```text
Parameter ID
PLAYER.MOVE_SPEED

Current Value
6.5
```

DefinitionとValueの関係は以下です。

```text
Definition
=
意味・制約・Default

Value
=
現在採用中の値
```

両者を混同しません。

Default Valueは、
新規Parameterを初めてTuning Dataへ追加するときの初期値として使用します。

既存Current Valueを毎回Defaultへ同期する値ではありません。

---

## Tuning Parameter ID

Tuning Parameter IDは、
Project Code CatalogのCode Symbol IDと分離します。

例：

```text
Code Symbol ID
PaletteBullet.Player.PlayerMovement.moveSpeed
```

```text
Tuning Parameter ID
PLAYER.MOVE_SPEED
```

これは別Identityです。

例えばコードが、

```text
PlayerMovement.moveSpeed
```

から、

```text
PlayerMovementSettings.MoveSpeed
```

へリファクタリングされても、
ゲームデザイン上同一の調整項目であれば、

```text
PLAYER.MOVE_SPEED
```

を維持できます。

Tuning Parameter IDは、

> **ゲーム調整項目としての安定Identity**

として扱います。

Source Field名やSource File位置だけから自動生成して固定する方式は避けます。

Parameter IDの具体命名規則とRename／Migration方法は未決です。

---

## Parameter Metadata

初期版で必要となるMetadata候補は以下です。

### 初期版候補

- Parameter ID
- Display Name
- Description
- Category
- Type
- Default Value
- Min
- Max
- Unit
- Step
- Planner Editable
- Source Binding
- Specification Reference
- Deprecated／Orphaned状態

Current ValueはDefinition Metadataではなく、
Value側として管理します。

### 将来候補

- Owner
- Apply Policy
- Restart Required
- Runtime Reload可能か
- Recommended Range
- Tuning Notes
- QA Notes
- Tags
- Related Parameters

すべてを初期版必須にしません。

---

## Tuning Data

Parameter Valueの正式な保存先として、
Unity側に専用Tuning Data／Registryを持つ方向を推奨します。

概念例：

```text
GameTuning

Player
├─ Movement
├─ Dash
└─ Parry

Enemy
├─ Common
└─ Boss

Combat
├─ Damage
└─ HitStop
```

実際に単一ScriptableObjectとするか、
複数Assetへ分割するか、
別のデータ構造を使うかは未決です。

重要なのは、

- Parameter IDで一意にValueを取得できる
- Definitionから機械的に生成・同期できる
- Plannerが調整したCurrent Valueを安全に保持できる
- Excel Importで一括更新できる
- Gameplayが確定したCurrent Valueを参照できる

ことです。

### Excelとの正本関係

基本の責務は以下です。

```text
C# Parameter Definition
=
Parameter構造の正本

Unity Tuning Data
=
現在Valueの正式な保存先

Excel
=
Planner向け編集面
```

Excelを唯一のゲームデータ正本にはしません。

---

## Tuning Data自動生成・同期

Programmerが新しいPlanner ParameterをDefinitionへ追加した場合、
Generatorが必要な派生情報を自動生成・同期します。

概念フロー：

```text
Parameter Definition追加
↓
Generator実行
↓
Tuning RegistryへParameter追加
↓
Default ValueからCurrent Value初期化
↓
Excel Export対象へ追加
↓
Validation対象へ追加
↓
Project Code CatalogからもDefinition Evidenceを確認可能
```

例えば、

```text
PLAYER.DASH_STAMINA_COST
Default = 20
```

を新規追加した場合、

```text
Tuning Data

PLAYER.DASH_STAMINA_COST
Current = 20
```

を自動追加します。

人間が同じParameterをTuning Assetへもう一度手入力する必要はありません。

---

## 新規Parameter追加

新規Parameter追加時は、
Definitionと既存Tuning Dataを照合します。

Definitionにのみ存在し、
Tuning Dataへまだ存在しないParameterは、
新規Parameterとして追加します。

初期Current ValueはDefault Valueで初期化します。

例：

```text
Definition
PLAYER.PARRY_WINDOW
Default = 0.20

Tuning Data
該当IDなし
```

Generator後：

```text
PLAYER.PARRY_WINDOW
Current = 0.20
```

既存Parameterとは区別して処理します。

---

## Parameter削除／Orphaned

DefinitionからParameterが消えた場合、
保存済みValueを即座に完全削除しない方向を推奨します。

例：

```text
PLAYER.OLD_DASH_SPEED
```

がDefinitionから削除された場合、

```text
Status
Orphaned
```

または、

```text
Deprecated / Missing Definition
```

として検出します。

保持候補は以下です。

- Parameter ID
- 最後のCurrent Value
- 最後のMetadata
- 最終確認日時
- 移行先Parameter ID

Editor／Import確認画面では、
人間が以下を判断できる構造を推奨します。

```text
このParameter Definitionは現在コードに存在しません。

[削除]
[移行]
[保留]
```

Orphaned Parameterの保持期間や最終削除条件は未決です。

---

## Current Value保持

Generator再実行時に、
既存Current ValueをDefault Valueへ戻してはいけません。

例：

```text
Definition

PLAYER.MOVE_SPEED
Default = 5
```

Planner調整後：

```text
Current Value = 7
```

Generator再実行後も、

```text
Current Value = 7
```

を維持します。

Definition変更時には少なくとも以下を検出します。

- 新規Parameter
- 削除Parameter
- Metadata変更
- Type変更
- Default変更
- Min／Max変更
- Category変更
- Source Binding変更

既存Current Valueは、
明示的なMigrationまたは人間判断なしに上書きしません。

### Default Value変更

Default Valueが変化しても、
既存Current Valueを新しいDefaultへ自動変更しません。

新Defaultは、
新規初期化やReset操作等で使用するDefinition情報として扱います。

既存Current Valueへの反映ルールは未決です。

### Min／Max変更

Min／Max変更によって、
既存Current Valueが新しいRange外になった場合、
自動Clampしません。

Validation ErrorまたはMigration Requiredとして検出する方向を推奨します。

正式な処理は未決です。

---

## Project Code Catalogとの接続

Catalogとの接続は薄く保ちます。

Project Code Catalogはコード上から、
例えば以下をEvidenceとして収集できます。

```text
PlannerTunable Attribute
Parameter ID
Field Type
Default
Range
Tooltip
Source Location
```

Planner Parameter基盤は、
明示されたParameter Definitionを実際のTuning Registryへ登録し、
Value・Excel・Validationを管理します。

ただし、

> **Project Code Catalogの生成物が存在しないとTuning基盤が動作しない**

という強い依存にはしません。

推奨する概念構造は以下です。

```text
共通C# Analyzer
        │
   ┌────┴────┐
   ▼         ▼
Code Catalog Tuning Generator
AI向け       Planner Parameter管理
```

低レベル解析処理を共有しても構いませんが、
CatalogとTuningの上位責務は分離します。

---

## Excel Export

Planner向けExcelは、
プログラマー内部情報を大量に見せない構成とします。

基本列の例は以下です。

| ID | Category | Display Name | Current Value | Default | Min | Max | Unit | Description | Planner Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Plannerが基本的に編集する列は、

- Current Value
- Planner Note

程度に限定します。

以下はロックまたは読み取り専用情報とします。

- Parameter ID
- Type
- Default
- Min
- Max
- Unit
- Source
- Definition Version

Excelでは、
必要に応じて以下を利用できます。

- 数値Validation
- Enum Dropdown
- bool Dropdown
- Filter
- Sheet分類
- Error表示

具体的なExcel UIやSheet見た目は実装担当へ委譲します。

ExcelへParameter Definitionを人間が再入力する運用にはしません。

---

## Planner編集フロー

Plannerは、
コード知識を前提としない操作で調整できるようにします。

基本フロー：

```text
Excelを開く
↓
Category・Display Name・DescriptionからParameterを確認
↓
Current Valueを変更
↓
必要に応じてPlanner Noteを書く
↓
保存
↓
UnityへImport
```

Plannerに以下の理解を必須としません。

- Class名
- namespace
- `[SerializeField]`
- C#ファイルパス
- asmdef
- Source Bindingの実装詳細

必要な場合は詳細情報として確認できても構いませんが、
基本画面ではゲームデザイン上の意味を優先します。

---

## Excel Import

Excel Importでは、

> **全件Validationしてから一括反映する**

方式を採用する方向を推奨します。

概念フロー：

```text
Excel読込
↓
Parameter ID照合
↓
Type Validation
↓
Range Validation
↓
Metadata Validation
↓
Cross Parameter Validation（後続対応時）
↓
Diff
↓
Conflict確認
↓
全件問題なし
↓
Tuning Dataへ一括適用
```

Excelを一行読むたびにTuning Dataを更新しません。

Import途中にErrorが発生して、

```text
前半だけ新しい値
後半は古い値
```

という部分更新状態を作らないようにします。

一括適用の具体的なTransaction方式は実装担当へ委譲します。

---

## Validation

Import前には、
少なくとも以下をValidation対象とします。

- 未知のParameter ID
- 重複ID
- Type違反
- Min／Max違反
- Enum不正
- Required Value欠落
- Deprecated Parameter
- Orphaned Parameter
- Excel側でMetadataが改変された
- Parameter DefinitionがExport時から変化した
- Source Bindingが変化した
- Parameterが削除された
- Cross Parameter Validation（後続対応時）

表示例：

```text
PLAYER.MOVE_SPEED

Input
25

Allowed Range
0 - 20

Result
Import Error
```

Range外値を自動Clampして成功扱いにはしません。

問題箇所と理由を表示し、
人間が値を修正します。

---

## Cross Parameter Validation

単一ParameterのRangeだけでなく、
複数Parameter間の関係も将来的に検証可能な構造とします。

例：

```text
Minimum < Maximum
```

```text
Normal Parry Window >= Just Parry Window
```

```text
InitialCount <= MaximumCount
```

Cross Parameter Validationは、初期版の必須完了条件には含めず、
後続機能として追加します。

ただし、
将来追加するためにParameter IDベースでRuleを定義できる設計を妨げないようにします。

具体的なRule定義方法は未決です。

---

## Excel Export時のBase Snapshot

ExcelへExportするとき、
Import時の3-way Diffに必要なBase Snapshotを記録する方向を推奨します。

各Parameterについて、
少なくとも以下を保持する候補があります。

- Parameter ID
- Export時Current Value
- Definition Version
- Import検証に必要なDefinition Metadata

Planner向けには、
非表示列、別Sheet、補助ファイル等で保持して構いません。

Base Snapshotをどこへ保存するかは未決です。

---

## Diff

Excel Import前に、
Excel側の値とUnity側のCurrent Valueとの差分を表示します。

Plannerが変更したParameter、
Unity側だけで変更されたParameter、
両方で変更されたParameterを区別します。

少なくとも以下の状態を識別できるようにします。

- No Change
- Excel Changed
- Unity Changed
- Same Change
- Conflict
- Definition Changed
- Orphaned／Missing

Diffを確認せずに不透明な一括上書きを行わない方向とします。

---

## 3-way Conflict

Import時は、

```text
Base
=
Excel Export時のValue

Unity Current
=
Import時点の現在Value

Excel
=
Plannerが変更したValue
```

の3つを比較します。

例：

```text
Base    5
Unity   7
Excel   6
```

この場合、
Unity側とExcel側が別々に変更されているためConflictです。

基本判定例：

| Base | Unity | Excel | 判定 |
| --- | --- | --- | --- |
| 5 | 5 | 6 | Excelだけ変更 → Import可能 |
| 5 | 7 | 5 | Unityだけ変更 → Unity維持 |
| 5 | 6 | 6 | 両者同じ変更 → 問題なし |
| 5 | 7 | 6 | 両者が別変更 → Conflict |

Conflict時は自動Last-Write-Winsにしません。

人間が、

```text
Unityを採用
Excelを採用
保留
```

等を選択できるようにします。

Conflict解決UIの具体形は未決です。

---

## Parameter Definition変更

Excel Export後にDefinitionが変更された場合、
単なるCurrent Value差分とは分離して扱います。

対象例：

- Type変更
- Range変更
- ID変更
- Parameter削除
- Deprecated化
- Category変更
- Source Binding変更
- Default変更

### Type変更

Type変更は自動変換してImport成功扱いにせず、
Migrationまたは再Exportを要求する方向を推奨します。

### ID変更

Parameter IDは安定Identityであるため、
単純Renameとして扱える場合でも明示的Migrationを行う設計が望まれます。

### Range変更

既存ValueやExcel Valueが新Range外になった場合、
自動ClampせずValidation Errorとして確認します。

### Category変更

Category変更はValueそのものを変更しません。

Excel Sheet構造にCategoryを利用する場合は、
Export時とImport時で配置が変化してもParameter IDで照合できる必要があります。

---

## プロトタイプ対象範囲

初期版では、
安全な「Definition → Tuning Data → Excel → Import」の往復を成立させることを優先します。

| 機能 | 初期版 |
| --- | --- |
| Planner Parameter明示登録 | 必須 |
| Parameter ID | 必須 |
| Definition Metadata | 必須 |
| Tuning Data自動生成 | 必須 |
| 新規Parameter自動追加 | 必須 |
| Current Value保持 | 必須 |
| Excel Export | 必須 |
| PlannerによるCurrent Value編集 | 必須 |
| Excel Import | 必須 |
| Type Validation | 必須 |
| Range Validation | 必須 |
| ID Validation | 必須 |
| Diff表示 | 必須 |
| 3-way Conflict検出 | 必須 |
| Conflict時の人間判断 | 必須 |
| Orphaned Parameter検出 | 必須 |
| Cross Parameter Validation | 後続 |
| Runtime Hot Reload | 後続 |
| 高度なTuning Dashboard | 後続 |
| 自動Gameplayコード書き換え | 初期版対象外 |

---

## 後続機能

初期版運用後、
必要性を確認して以下を追加検討します。

- Cross Parameter Validationの拡張
- Runtime Hot Reload
- Play Mode中のTuning Dashboard
- Parameter検索・Favorite
- Owner／QA Note等のMetadata拡張
- Recommended Range
- Parameter変更履歴
- Preset／Profile
- Stage／Difficulty別Override
- Tuning Data比較
- Planner NoteのUnity側表示
- Project Code CatalogからのTuning Candidate提示
- 既存`[SerializeField]`からの移行支援
- Asset／Data Catalogとの連携
- CIによるDefinition／Tuning Data整合性検査

後続機能を追加する場合も、
Parameter Definitionの一重管理とCurrent Value保護を維持します。

---

## 自動コード書き換え

Project Code Catalog等から、
Planner調整Parameter候補となる既存Fieldを発見する支援は将来的に可能です。

例えば、

```csharp
[SerializeField]
private float moveSpeed;
```

に対して、

```text
[Planner調整Parameterへ昇格]
```

という候補提示を行うことは検討できます。

ただし初期版では、

> **Gameplayコードを自動でTuning Registry参照へ書き換える**

処理を必須にしません。

自動候補提示と、
実際のGameplayコード変更を分離します。

Gameplayコードの変更はProgrammerがレビュー可能な形で行います。

---

## 非目標

本基盤の非目標は以下です。

- Project Code Catalogと同じコード一覧を生成すること
- `[SerializeField]`をすべてPlanner公開すること
- `float`等を自動的にPlanner Parameter認定すること
- Excelを唯一のゲームデータ正本にすること
- PlannerがParameter IDやTypeを自由変更すること
- Excel Import中にTuning Dataを逐次部分更新すること
- Range外Valueを自動Clampして正式値にすること
- ConflictをLast-Write-Winsで自動解決すること
- ScriptableObjectへ同じParameter Definitionを人間が重複入力すること
- Excelへ同じParameter Definitionを人間が重複入力すること
- Generator再実行時にCurrent ValueをDefaultへ戻すこと
- Runtime内部状態をPlanner調整Parameterとして公開すること
- 初期版でGameplayコードを自動リファクタリングすること
- Project Code Catalogの生成物をRuntime必須依存にすること

---

## 初期版完了条件

初期版は、少なくとも以下を満たした時点で完成とします。

1. ProgrammerがPlanner調整可能Parameterを明示できる
2. 各Parameterを安定したTuning Parameter IDで識別できる
3. Parameter DefinitionとParameter Valueを分離できる
4. 同じParameter Definitionを複数箇所へ人間が重複入力しなくてよい
5. Parameter DefinitionからTuning Dataを生成／同期できる
6. 新規ParameterをDefault Valueで自動追加できる
7. Generator再実行時に既存Current Valueを保持できる
8. Planner向けExcelを自動生成できる
9. PlannerがCurrent Valueを編集できる
10. ExcelからUnityへImportできる
11. ID、Type、Range等をValidationできる
12. Import Error時にTuning Dataを部分更新しない
13. Base／Unity／Excelによる3-way Diffができる
14. Conflictを検出できる
15. Conflictを自動Last-Write-Winsで解決しない
16. 削除ParameterをOrphaned Candidateとして検出できる
17. Project Code CatalogとPlanner Parameter基盤の責務が分離されている
18. Code Symbol IDとTuning Parameter IDが分離されている
19. PlannerがRuntime内部状態を編集できない
20. ExcelをゲームRuntimeの唯一の正本として扱わない
21. Range外値を暗黙Clampしない
22. Definition再生成でPlanner調整済みCurrent Valueを破壊しない
23. Plannerが基本的にゲームデザイン上の名前・説明・Current Valueだけで調整作業を行える
24. Tuning Dataへ同じDefinitionを人間が再入力する必要がない
25. ExcelへDefinitionを人間が再入力する必要がない

---

## 未決事項

以下は現時点では確定しません。

### Parameter宣言

- `PlannerTunable` Attribute等の具体構文
- Parameter DefinitionをAttributeだけで表現するか
- Attributeと別Definition構造を併用するか
- Parameter RegistryのC#構造
- Source Bindingの具体表現

### Parameter ID

- Parameter ID命名規則
- Parameter IDのRename方法
- Parameter IDのMigration情報をどこに保持するか
- Deprecated IDの再利用を禁止するか
- Definition Versionとの関係

### Tuning Data

- Tuning Dataを単一Assetにするか複数Assetにするか
- ScriptableObjectを使うか、別構造にするか
- Category構造
- Tuning Data AssetをGit管理するか
- Current ValueのSerialization方式

### Definition変更

- Default Value変更時の既存Current Valueの扱い
- Min／Max変更時に既存Current ValueがRange外になった場合の正式処理
- Type変更時のMigration
- Orphaned Parameterの保持期間
- Orphaned Parameterの最終削除条件

### Excel

- Excelファイル構成
- Sheet分割方法
- Excelでのロック方法
- Planner NoteをUnity側へ保持するか
- ExcelファイルをGit管理するか
- Export時Base Snapshotをどこへ保存するか
- Definition Version方式

### Import／Conflict

- Import UI
- Diff UI
- Conflict解決UI
- Conflict解決結果をどこへ記録するか
- Definition変更後に自動再Exportを要求する条件
- Import用Transactionの具体方式

### Validation

- Cross Parameter Validationの定義方法
- Validation Ruleの保存場所
- WarningとErrorの区分

### 後続連携

- Runtime Hot Reloadを将来対応するか
- Project Code Catalogと共有するAnalyzerの具体境界
- 既存`[SerializeField]`をTuning Parameterへ移行する支援方法
- Asset／Data Catalogとの将来の責務境界

---

## 関連仕様

| 内容 | 関連ページ |
| --- | --- |
| 共通技術カテゴリ全体 | [共通技術](/spec/common-technology/) |
| コード構造・Evidenceの機械収集 | [Project Code Catalog仕様](/spec/common-technology/project-code-catalog) |
| MusicChart制作・確認用Editorツール | [MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench) |

Project Code Catalogとの責務は以下のとおりです。

```text
Project Code Catalog
=
コード上に存在する構造・Attribute・Parameter Definition等を
Evidenceとして機械収集

Planner Tuning Parameter基盤
=
Programmerが明示公開したParameterの
Definition・Value・Excel往復・Validationを管理
```

本基盤がProject Code Catalog生成物へDefinitionを二重登録するのではなく、
同じコード上の明示Definitionを、それぞれの責務に従って扱います。

将来的にAsset／Data Catalogが作成された場合は、
Tuning Data Asset実値との責務境界を再整理します。

---

## 関連タスク

<PageRelations />
