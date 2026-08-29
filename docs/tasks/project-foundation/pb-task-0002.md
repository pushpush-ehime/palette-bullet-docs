---
title: "Project Code Catalog Core・Schema・Symbol収集基盤"
description: Project Code Catalogの内部Model、Git Snapshot、Stable Symbol ID、C# Symbol収集処理を実装し、後続のEvidence収集・出力機能が利用できる基礎契約を完成させる
pageType: task
taskId: PB-TASK-0002
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/project-code-catalog
---

# PB-TASK-0002｜Project Code Catalog Core・Schema・Symbol収集基盤

## タスクの目的

Project Code Catalogの最初の実装として、Unityプロジェクト内のC#コードを機械的に走査し、後続機能が共通して利用できる**Catalog内部Model・Snapshot Metadata・Stable Symbol ID・Symbol収集処理**を完成させます。

このタスクでは「コード上に何が存在するか」を事実として取得する基礎までを担当し、TODO／Test／仕様書Reference／依存関係の収集や、AI向けJSON／JSONL・人間向けMarkdown等の最終出力は後続タスクへ委譲します。

## 完成時にできるようになること

- Project Code Catalogの1回の収集結果を、後続処理から扱える共通Modelとして取得できる
- 収集元Repository／Branch／Commit SHA／Unity Version等をCatalog Snapshotへ紐付けられる
- Class、Struct、Interface、Enum、Field、Property、Method、Event等を一意なSymbolとして収集できる
- 同じSource Snapshotから収集したSymbolについて、安定したIDと決定的な並び順を得られる
- MonoBehaviour／ScriptableObject、主要Unity Attribute、Lifecycle Method等のUnity固有情報をSymbol Metadataとして取得できる
- Evidence／Test／仕様書Reference／Dependency／各種出力を、同じSymbol Identityへ後から追加できる

## 関連する仕様

<PageRelations />

実装時は、特に[Project Code Catalog仕様](/spec/common-technology/project-code-catalog)の以下を正本として確認してください。

- 基本原則
- 収集対象となるコード構造
- Symbol Identity
- Git／Catalog Snapshot
- Catalog生成物に求める決定性
- 初期版対象範囲
- 初期版完了条件
- 非目標

Gameplayの正しい挙動や実装完成度をCatalog側で判定しないでください。

## 実施内容

### 1. Catalog Core Modelを作る

1回のCatalog収集結果を保持する、後続タスク共通の内部Modelを実装します。

最低限、次の二つの層を分離して扱える構造にしてください。

```text
Catalog Snapshot
├─ Repository / Branch / Commit / Unity Version
├─ Catalog Schema Version
├─ Generator Version
└─ Generated At

Catalog Symbols
├─ Type
├─ Field
├─ Property
├─ Method
├─ Event / Delegate
└─ 各SymbolのSource・Unity Metadata
```

最終JSON／JSONLのファイルSchemaをこのタスクで確定する必要はありません。
ただし、後続タスクが同じModelを利用できるよう、**内部Modelの責務境界・Schema Versionの扱い・拡張方法はこのタスクで確定**してください。

### 2. C# Type・Memberを収集する

初期のCore収集では、少なくとも以下を取得できるようにします。

#### Type

- Class
- Abstract Class
- Struct
- Interface
- Enum
- Record（プロジェクト内で使用される場合）
- Namespace
- Fully Qualified Name
- Base Type
- Implemented Interface
- Assembly
- asmdef情報
- Source File
- Source Location
- MonoBehaviour／ScriptableObject判定
- Enum Value

#### Field

- 名前
- 型
- Access Modifier
- static
- readonly
- const
- `[SerializeField]`
- 取得可能なInitializer／Default Value
- 主要Attribute
- Source Location

#### Property

- 名前
- 型
- Getter／Setterの有無とAccess
- static
- Source Location

#### Method

- 名前
- Access Modifier
- Return Type
- Parameter
- static
- virtual
- override
- abstract
- async
- Generic情報
- Source Location

#### Event／Delegate

- C# Event／Delegate
- `Action`／`Func`／`UnityEvent`等、仕様上Event系として確認価値がある宣言を識別可能な構造
- Payload／型情報
- Source Location

### 3. Unity固有Metadataを収集する

少なくとも以下をSymbolへ関連付けられるようにします。

- `SerializeField`
- `RequireComponent`
- `CreateAssetMenu`
- `DisallowMultipleComponent`
- `Range`
- `Min`
- `Tooltip`
- `Header`
- `FormerlySerializedAs`
- MonoBehaviour Lifecycle Method

Lifecycle Methodは少なくとも、`Awake`、`Start`、`OnEnable`、`OnDisable`、`Update`、`FixedUpdate`、`LateUpdate`、主要Collision／Trigger Callback等を拡張可能な形で識別してください。

### 4. Stable Symbol IDを確定する

後続のEvidence、Test、仕様書Reference、Dependency、出力が同じSymbolを参照できるよう、Symbol ID契約をこのタスクで確定します。

具体的な文字列形式は実装担当へ委譲しますが、少なくとも以下を満たしてください。

- 同一Catalog内で重複しない
- Method Overloadを区別できる
- FieldとProperty等、Symbol Kindの違いで衝突しない
- Nested Typeを区別できる
- Generic Symbolを区別できる
- Partial Typeを別Typeとして重複登録しない
- Source Line番号をIdentityそのものにしない
- Source位置が変わっても、意味上同一のSymbolとして扱える範囲ではIDを維持できる

Namespace変更・Type Rename・Signature変更等をどこまで同一Identityとして追跡するかは仕様上未決です。
このタスクでは採用した規則をPRへ記載し、後続処理が同じ規則を利用できる状態にしてください。

### 5. Git／Project Snapshotを取得する

Catalog生成元を判断できるよう、少なくとも以下を収集します。

- Repository
- Branch
- Commit SHA
- Generated At
- Unity Version
- Catalog Schema Version
- Generator Version

本ページ作成時点のUnity実装`main`には、`Assets/PaletteBullet/Editor/Git/GitCommandRunner.cs`が存在します。
Git情報取得のためだけに別のProcess実行基盤を重複実装せず、着手時の最新版を確認したうえで、既存共通処理を再利用できる場合は利用してください。

Working TreeがDirtyな場合の正式表現はこのタスクの必須範囲ではありません。対応する場合は意味をPRで明示してください。

### 6. 決定的な収集結果を作る

同一Source Snapshotを繰り返し収集した場合、Sourceから導出される以下の情報が安定するようにします。

- Symbol ID
- Symbol内容
- Symbol順序
- Type／Memberの並び順
- Attribute等の並び順

`Generated At`のように実行ごとに変化することが意図されたMetadataは例外です。
自動テストでは、固定Clockを注入するか、意図的に変化するMetadataを除外した正規化結果を比較する等、再現可能な方法で決定性を確認してください。

### 7. 後続タスク用の拡張点を用意する

次の後続機能が、Symbolを再解析して独自Identityを作らずに拡張できる契約を用意します。

- Evidence／TODO／FIXME収集
- Test情報収集
- XML Documentation／仕様書Reference収集
- Dependency収集
- AI向け構造化出力
- 人間向けMarkdown
- Project Summary

具体的なClass名・Interface名は固定しません。
ただし、後続タスクがCore Modelを再利用できることをPR上で確認できる状態にしてください。

### 8. 自動テストとReview用実行経路を用意する

少なくともEditor Testまたは同等の自動テストで、専用fixtureを解析できるようにしてください。

fixtureには可能な範囲で以下を含めます。

- Class／Struct／Interface／Enum
- Inheritance／Interface実装
- MonoBehaviour／ScriptableObject
- Field／Property
- Method Overload
- Generic MethodまたはGeneric Type
- Event／Delegate
- Unity Attribute
- Lifecycle Method
- Nested Type
- Partial Type
- asmdefが存在しないケース

また、レビュー担当が現在のUnityプロジェクトに対してCore Collectorを実行し、収集件数や代表Symbolを確認できる最小の実行経路を用意してください。
MenuItem、専用Editor Window、Test用入口等の具体方式は実装担当へ委譲します。

## 対象範囲

- Project Code Catalogの内部Core Model
- Catalog Schema Version／Generator Versionを保持する基礎
- Git／Unity Snapshot Metadata
- C# Type／Member Symbol収集
- Unity固有Symbol Metadata
- Stable Symbol ID
- 決定的な並び順
- 後続Collector／Exporterが利用する拡張契約
- Core収集処理の自動テスト
- Review可能な最小実行経路

## 対象外

以下はこのタスクでは実装しません。

- TODO／FIXME／HACK／NotImplemented等のEvidence収集
- Test Class／Test MethodのCatalog化
- XML Documentation収集
- 仕様書Referenceの抽出・正規化
- Dependency Graphの生成
- 完全なMethod Call Graph
- Scene／Prefab配線解析
- ScriptableObject `.asset` 実値の全収集
- Magic Number候補検出
- AI向けJSON／JSONL最終出力
- 人間向けMarkdown生成
- Project Summary生成
- 自動完成度Score
- Planner調整可能Parameterかどうかの判定
- Gameplay Runtimeへの常駐処理

これらは後続タスクまたは後続機能へ委譲します。

## 完了条件

- [ ] 1回のCatalog収集結果を保持する共通Core Modelが実装されている
- [ ] SnapshotにRepository、Branch、Commit SHA、Generated At、Unity Version、Catalog Schema Version、Generator Versionを保持できる
- [ ] Class／Struct／Interface／Enum等の主要TypeとEnum Valueを収集できる
- [ ] Namespace、Fully Qualified Name、Base Type、Interface、Assembly、asmdef、Source File、Source Locationを取得できる
- [ ] Field、Property、Method、Event／Delegateについて本タスクで指定した主要Metadataを収集できる
- [ ] MonoBehaviour／ScriptableObjectと主要Unity Attributeを識別できる
- [ ] MonoBehaviour Lifecycle Methodを識別できる
- [ ] Method Overload、Nested Type、Generic Symbol、Partial Typeを考慮したStable Symbol ID契約が実装されている
- [ ] asmdefが存在しないプロジェクト／Sourceでも収集処理が失敗しない
- [ ] 同一Source Snapshotを複数回収集したとき、意図的に変化するMetadataを除くSymbol ID・内容・順序が決定的である
- [ ] Evidence／Test／仕様書Reference／Dependency／Exporterが同じCore ModelとSymbol IDを再利用できる拡張点がある
- [ ] 専用fixtureによる自動テストで主要Symbol種別とStable ID／決定性を検証できる
- [ ] 現在のUnityプロジェクト全体に対してCore Collectorを実行し、代表Symbolを取得できる
- [ ] Catalog機能がGameplay Runtimeの必須依存になっていない
- [ ] Catalogがコードの完成度、仕様適合、Planner公開可否を独自判定していない
- [ ] 採用した解析方式、Symbol ID規則、解析対象範囲／除外規則、Schema Version方針をPRへ記載している

## 確認手順

1. `Palette-Bullet`の最新`main`を取得し、本タスクの実装ブランチを最新状態へ合わせます。
2. Unity Editorでプロジェクトを開き、Compile Errorがないことを確認します。
3. Unity Test Runner等から本タスクで追加したCore Collectorの自動テストを実行し、全件成功することを確認します。
4. fixtureを対象に、Type、Field、Property、Method Overload、Event、Attribute、Lifecycle、Nested／Generic／Partial Symbolが期待どおり取得されることを確認します。
5. 同一fixtureを2回収集し、`Generated At`等の意図的な変動値を除いた正規化結果でSymbol ID・内容・順序が一致することを確認します。
6. 現在のUnityプロジェクトに対してReview用実行経路からCollectorを実行します。
7. 代表例として、着手時点で存在するEditorコードから少なくとも1つのTypeとそのMemberが、Source Location付きでCatalog Modelへ収集されることを確認します。
8. Catalog SnapshotのCommit SHAが、同じWorking Treeで`git rev-parse HEAD`から確認できるSHAと一致することを確認します。
9. asmdefが存在しないSourceについて、Assembly／asmdef Metadataが仕様上意味の分かる形で表現され、例外で収集全体が停止しないことを確認します。
10. Play Modeを開始しなくてもCatalog Coreを生成・テストでき、Gameplay Runtime側へCatalog生成処理の必須参照が追加されていないことを確認します。

## 前提・依存タスク

前提となる実装タスクはありません。

このタスクは、以下の後続タスクの前提になります。

```text
Project Code Catalog Core・Schema・Symbol収集基盤
├─ Evidence・Test・仕様書Reference・Dependency収集
└─ 構造化出力・Markdown・Project Summary
```

Planner調整Parameter基盤とは責務を分離します。将来、低レベルのC#解析処理を共有することはできますが、Project Code Catalog生成物をPlanner Tuning基盤のRuntime必須依存にしないでください。

## 実装時の注意点

- 仕様で固定されていないClass名、File名、Namespace、解析ライブラリ、Editor UI方式は実装担当判断とします。
- 解析方式はRoslyn等に限定しません。ただしSource LocationやSymbol構造を安定して取得でき、Editor専用基盤として保守可能な方式を選んでください。
- 新しいPackage／外部依存を追加する場合は、追加理由、Editor／Runtimeへの影響、Version固定方針をPRへ記載してください。
- Stable Symbol IDの具体形式は実装担当判断ですが、このタスク以降の公開契約になるため、PR内で例を示して規則を明記してください。
- 現在のプロジェクトにasmdefが存在しない場合でも、将来asmdefが追加されたときにAssembly情報を拡張できる設計を妨げないでください。
- Git情報取得では、着手時の`main`に既存共通実装がある場合は重複実装を避けてください。
- Catalog生成物やCore ModelをGameplayの正本として扱わないでください。
- 「空Methodだから未実装」等の推論はこのタスクで行いません。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文へ、少なくとも以下を記載します。
   - 採用したC#解析方式と理由
   - Stable Symbol IDの規則と具体例
   - Catalog Core Model／Schema Versionの方針
   - 解析対象Sourceの範囲と除外規則
   - Git Snapshotの取得方法
   - 新規Package／外部依存の有無
   - 自動テスト結果
   - 現在のUnityプロジェクトを収集した確認結果
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
