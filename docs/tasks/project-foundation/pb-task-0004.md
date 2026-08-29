---
title: "Project Code Catalog AI向け構造化出力・Markdown・Project Summary"
description: Project Code Catalogの収集結果からAI向け構造化データ、人間向けMarkdown、Project Summaryを決定的に生成し、調査の入口として利用できる状態を完成させる
pageType: task
taskId: PB-TASK-0004
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/project-code-catalog
---

# PB-TASK-0004｜Project Code Catalog AI向け構造化出力・Markdown・Project Summary

## タスクの目的

[PB-TASK-0002｜Project Code Catalog Core・Schema・Symbol収集基盤](/tasks/project-foundation/pb-task-0002)と
[PB-TASK-0003｜Project Code Catalog Evidence・Test・仕様書Reference・Dependency収集](/tasks/project-foundation/pb-task-0003)
で構築するCatalog Modelを入力として、Project Code Catalogの**利用可能な生成物**を完成させます。

本タスクでは、次の3つを一つの生成処理から作成できる状態にします。

1. AIや機械処理が検索・比較しやすい構造化出力
2. 人間がGit上やEditor外でも確認しやすいMarkdown
3. AIや人間が最初に読む軽量なProject Summary

重要なのは、構造化出力・Markdown・Summaryが別々の手編集正本にならないことです。

```text
C# Source / Project
        ↓
PB-TASK-0002 / 0003
Catalog Model
        ↓
Exporter / Renderer
├─ AI向け構造化出力
├─ 人間向けMarkdown
└─ Project Summary
```

MarkdownやSummaryを生成するためにSourceをもう一度独自解析したり、構造化出力とは別の判定ロジックを持たせたりしないでください。

また、本タスクでもCatalogは実装完成度や仕様適合を自動判定しません。

## 完成時にできるようになること

- 現在のCatalog SnapshotをAIが直接扱える構造化ファイルとして生成できる
- Symbol、Evidence、Test、仕様書Reference、DependencyをStable Symbol IDで検索・追跡できる
- Snapshot Metadataから、どのRepository／Branch／Commit／Unity VersionのCatalogか確認できる
- 同じSource Snapshotから再生成した際に、不要な順序揺れが発生しない
- 人間向けMarkdownからSymbol、TODO等のEvidence、Test、仕様書Reference、Dependencyを目視確認できる
- Project Summaryだけを最初に読んで、Project全体の規模と追加調査候補を軽量に把握できる
- Summaryから必要な詳細Catalogへ調査を進められる
- 生成物を削除しても、Sourceから再生成できる
- 生成物を人間が手編集して正本として維持する必要がない

## 関連する仕様

<PageRelations />

実装時は[Project Code Catalog仕様](/spec/common-technology/project-code-catalog)の以下を正本として確認してください。

- 基本原則
- Git／Catalog Snapshot情報
- 出力データ
- AI向け構造化出力
- Stable Symbol ID
- 人間向け表示
- Project Summary
- 実装進捗判断との関係
- 初期版対象範囲
- 初期版完了条件
- 未決事項
- 非目標

特に以下を維持してください。

> **構造化データを基礎とし、人間向けMarkdownやSummaryはそこから派生生成する。**

> **Catalogは証拠を出す。AI・人間が意味を判断する。**

## 実施内容

### 1. Exporterの入力をCatalog Modelへ統一する

ExporterはPB-TASK-0002／0003のCatalog Modelだけを入力として利用します。

少なくとも以下を出力対象として扱えるようにしてください。

```text
Catalog Snapshot
├─ Repository
├─ Branch
├─ Commit SHA
├─ Generated At
├─ Unity Version
├─ Catalog Schema Version
└─ Generator Version

Symbols
├─ Type / Enum Value
├─ Field
├─ Property
├─ Method
├─ Event / Delegate
└─ Unity Metadata

Additional Evidence
├─ XML Documentation
├─ TODO / FIXME / HACK
├─ NotImplemented / NotSupported 等
├─ Tests
├─ Specification References
└─ Dependencies
```

Exporter側でStable Symbol IDやDependencyを再計算しないでください。

PB-TASK-0002／0003で確定したIdentity・Relation・Evidence分類をそのまま利用します。

### 2. AI向け構造化出力を実装する

AI監査や機械処理の主要入力として、JSONまたはJSONL等の構造化ファイルを生成します。

仕様上、JSON／JSONLの最終採用方式とファイル分割は未決です。
本タスクで実装担当が方式を確定し、PRで理由を報告してください。

#### 構造化出力に必要な性質

少なくとも以下を満たしてください。

- Stable Symbol IDでSymbolを一意に識別できる
- Snapshot Metadataを確認できる
- Symbol Kindを機械判別できる
- Source File／Source Locationを保持する
- DocumentationをSymbolへ関連付けられる
- EvidenceとCandidateを区別できる
- Testを識別できる
- Specification ReferenceのRaw／Canonical情報を保持できる
- DependencyのRelation KindとTargetを保持できる
- Internal TargetはStable Symbol IDで追跡できる
- External Targetも失わない
- deterministicな順序で出力される
- 人間表示用の装飾文字列だけに依存しない

概念例：

```json
{
  "symbolId": "example-stable-id",
  "kind": "field",
  "owner": "PaletteBullet.Player.PlayerMovement",
  "name": "moveSpeed",
  "type": "System.Single",
  "source": {
    "file": "Assets/...",
    "line": 18
  }
}
```

これはSchema固定例ではありません。

実際のSchemaはPB-TASK-0002／0003のModelを自然に表現できる方式を採用してください。

#### JSONかJSONLか

次のような観点で方式を選定してください。

- AIが一部だけ読み取りやすいか
- Git diffで変更箇所を追いやすいか
- Project規模が大きくなった場合に扱いやすいか
- Snapshot Metadataとの対応が明確か
- 人間向けMarkdown生成にも再利用しやすいか

複数形式を生成しても構いませんが、同じ意味情報を別々の正本として実装しないでください。

### 3. 出力ファイル構成を確定する

仕様では概念例として次のような生成物が示されています。

```text
Generated/
├─ code-catalog.jsonl
├─ code-catalog.md
├─ dependencies.json
└─ project-summary.md
```

正式なフォルダ名・ファイル名・分割方式は本タスクで決めて構いません。

ただし、次を満たしてください。

- Snapshot単位の対応が分かる
- どのファイルをAIが最初に読むべきか分かる
- 詳細CatalogとSummaryの責務が分かる
- 再生成で古い不要ファイルが残り、最新Catalogと混在しない
- OS依存のPath差によって無意味なdiffを増やさない
- 生成物を手編集しなくてよい

出力ファイル数を必要以上に細分化しないでください。

### 4. Snapshot Metadataを出力する

生成物から最低限、以下を確認できるようにします。

- Repository
- Branch
- Commit SHA
- Catalog生成日時
- Unity Version
- Catalog Schema Version
- Generator Version

`Generated At`のように再生成ごとに変化する値と、Sourceから決まる内容を可能な限り分離し、生成日時だけの変化でCatalog全体へ大規模diffが発生しない構造を優先してください。

Working Tree Dirtyの表現は仕様上未決であり、本タスクの必須Gateにはしません。
対応する場合は意味と取得方法をPRへ記載してください。

### 5. 決定的でdiffしやすい出力にする

Project Code Catalogでは、同じSource Snapshotからの再生成で単なる順序揺れをコード変更と誤認しないことが重要です。

少なくとも以下についてSort規則を明示してください。

- Symbol
- Member
- Documentation
- Evidence
- Test
- Specification Reference
- Dependency
- Project Summary内の分類

同じSnapshotから再生成した場合、`Generated At`等の意図的変動値を除き、意味データの出力が一致することを自動テストで確認してください。

以下のような実装は避けてください。

```text
Dictionaryの列挙順に依存
HashSetの順序に依存
File Systemの取得順に依存
OS固有Path区切りをそのままIdentityに使用
```

### 6. 人間向けMarkdownを生成する

人間向けMarkdownは、Catalog Modelまたは同じ構造化データから派生生成します。

Markdownを生成後に人間が追記し、その追記をCatalogの正本として扱う運用にはしません。

#### Markdownで確認できる内容

最低限、以下を確認できるようにしてください。

- Snapshot情報
- 型／Symbol一覧
- Source File
- 主要Member
- Unity固有情報
- Documentation
- TODO等のEvidence
- Test
- 仕様書Reference
- Dependency

全情報を一つの巨大Markdownへ無理に詰め込む必要はありません。

ファイル分割する場合は、調査対象へ辿りやすく、Stable Symbol IDまたは明確な見出しから対応する構造化データを追跡できるようにしてください。

#### Markdownの目的

Markdownは主に次の用途です。

- プログラマーの目視確認
- QAのEvidence確認
- Git diff確認
- AIへ渡す前の軽量確認
- TODO／Test／Reference一覧の閲覧
- Dependencyの大まかな接続確認

高度なEditor UIは本タスクの必須条件ではありません。

### 7. Project Summaryを生成する

AIや人間がCatalogを読み始める入口として、詳細Symbol一覧とは別に軽量な`Project Summary`を生成します。

少なくとも次の集計を、Catalog Modelから機械的に算出できるようにしてください。

- Assembly数
- MonoBehaviour数
- ScriptableObject数
- Interface数
- Enum数
- Method数
- Serialized Field数
- Test数
- TODO数
- NotImplemented等の主要Evidence数

実際に存在しない種類は0として表現できれば構いません。

#### 機械的な分類

領域別概要を作る場合、初期版では高度な意味分類を行わず、次のような機械的分類を優先してください。

- namespace
- folder
- Assembly／asmdef

例えば`Player`という文字列があるから自動的にGameplay上のPlayer機能として正しく分類された、といった意味判断は行いません。

分類粒度と優先規則は本タスクで決め、PRへ記載してください。

#### Summaryに含めてはいけない判定

以下のような値を自動生成しないでください。

```text
Player 完成度 80%
Combat 実装済み
Tests 0 なので未完成
TODO 0 なので完成
```

Summaryは事実の集計と調査入口に限定します。

### 8. Summaryから詳細へ辿れるようにする

Project Summaryは単なる数字一覧ではなく、次の調査へ進める入口として利用できる構造にします。

例：

```text
Project Summary
↓
TODO 18
↓
Evidence一覧
↓
関連Symbol
↓
Source File
```

```text
Tests 54
↓
Test一覧
↓
関連Symbol Candidate
```

```text
Namespace: PaletteBullet.Player
↓
Symbol一覧
↓
Dependency
↓
Source
```

具体的なリンク表現やIndex方式は実装担当へ委譲します。

ただし、人間向けMarkdownと構造化データのどちらでも、Summary上の集計根拠を詳細Catalogへ追跡できることを重視してください。

### 9. 生成・再生成の実行経路を用意する

レビュー担当が現在のUnityプロジェクトに対してCatalog一式を再生成できる実行経路を用意してください。

具体方式は実装担当へ委譲します。

候補：

- Unity Editor MenuItem
- Editor Window
- Command Line／Batch Mode
- CIから呼び出せるEntry Point

初期版で複数Triggerをすべて実装する必要はありません。

ただし、特定個人のローカル操作だけに依存せず、将来Editor／CIの両方から利用できる設計を妨げないでください。

正式に採用した初期Triggerと理由をPRへ記載してください。

### 10. 生成物の正本関係を明確にする

次の関係を崩さないでください。

```text
Source Code
+
Project Metadata
=
正本

Catalog Model
=
機械収集結果

JSON / JSONL / Markdown / Summary
=
再生成可能な派生生成物
```

生成されたMarkdownやJSONを直接編集してSourceへ逆反映する機能は本タスクでは作りません。

生成物をGit管理するかどうかは仕様上未決です。

本タスクでは、採用した保存場所と運用案をPRへ記載してください。
Git管理を自動で強制する必要はありません。

### 11. Exporter／Summaryの自動テストを用意する

PB-TASK-0002／0003のfixtureまたは専用Catalog Model fixtureを利用し、少なくとも以下を確認してください。

- Snapshot Metadataが出力される
- 代表SymbolがStable Symbol ID付きで出力される
- Documentation／Evidence／Test／Reference／Dependencyが欠落しない
- Internal／External Dependencyが区別される
- Markdownと構造化データが同じCatalog Modelを元にしている
- Summary件数が入力Modelの件数と一致する
- 0件カテゴリを正しく扱える
- 同一入力から意味データが決定的に出力される
- 出力先に古い生成物がある場合の扱いが決定されている
- Output生成によりGameplay Sourceが変更されない

## 対象範囲

- AI向けJSON／JSONL等の構造化出力
- 出力Schema・ファイル分割方式の確定
- Snapshot Metadata出力
- deterministicなSort／Serialization
- 人間向けMarkdown生成
- Project Summary生成
- namespace／folder／Assembly等による機械的集計
- Summaryから詳細Catalogへ辿るためのIndex／参照
- Catalog一式の再生成経路
- Exporter／Renderer／Summaryの自動テスト
- 生成物の保存場所・再生成運用の確定

## 対象外

- C# Symbol収集そのものの再実装
- TODO／Test／仕様書Reference／Dependency Collectorの再実装
- 完全なMethod Call Graph
- Runtime Trace
- Scene／Prefab／Asset実値Catalog
- Magic Number Candidate
- Snapshot間の高度な差分レポート
- Symbol Rename自動追跡
- AIによる完成度Score
- AIによる仕様適合判定
- AIそのものをUnity Editorへ組み込むこと
- CatalogからGameplayコードを自動修正すること
- Catalogから仕様書を自動変更すること
- 生成Markdown／JSONを手編集正本にすること
- 高度なCatalog専用Editor Viewer

## 完了条件

- [ ] categoryが`開発基盤`になっている
- [ ] PB-TASK-0002／0003のCatalog Modelを入力として利用し、SourceをExporter側で独自再解析していない
- [ ] Snapshot Metadataを含むAI向け構造化出力を生成できる
- [ ] Stable Symbol IDでSymbolを一意に追跡できる
- [ ] Documentation、Evidence／Candidate、Test、仕様書Reference、Dependencyを構造化出力へ保持できる
- [ ] Internal／External Dependencyの意味が出力後も失われない
- [ ] JSON／JSONL等の主要形式とファイル分割方式が確定している
- [ ] 構造化出力のSchemaとVersion関係がPB-TASK-0002のSchema Version方針と整合している
- [ ] 人間向けMarkdownを同じCatalog Modelから生成できる
- [ ] MarkdownからSnapshot、Symbol、Evidence、Test、Reference、Dependencyを確認できる
- [ ] Project Summaryを生成できる
- [ ] SummaryでAssembly、MonoBehaviour、ScriptableObject、Interface、Enum、Method、Serialized Field、Test、TODO、主要未実装Evidenceを集計できる
- [ ] Summaryの集計根拠を詳細Catalogへ追跡できる
- [ ] 高度な意味分類を行わず、必要な分類はnamespace／folder／Assembly等の機械規則で行っている
- [ ] 同一入力から再生成した場合、意図的変動値を除く意味データと順序が一致する
- [ ] OSやFile Systemの列挙順による不要な出力揺れがない
- [ ] 生成物を削除してもSourceから再生成できる
- [ ] 生成物を手編集正本として扱っていない
- [ ] Catalogが完成度Scoreや仕様適合結果を自動生成していない
- [ ] 現在のUnityプロジェクト全体からCatalog一式を生成できるReview用実行経路がある
- [ ] Exporter／Markdown／Summaryの自動テストがある
- [ ] 出力形式、保存場所、Sort規則、Summary分類規則、初期生成TriggerをPRへ記載している

## 確認手順

1. `Palette-Bullet`の最新`main`を取得し、PB-TASK-0002／0003の実装が利用可能な状態から本タスクのブランチを作成します。
2. Unity EditorでCompile Errorがないことを確認します。
3. Exporter／Markdown／Summaryの自動テストを実行し、全件成功することを確認します。
4. fixtureからCatalog一式を生成し、Snapshot Metadataと代表Symbolが構造化出力に存在することを確認します。
5. Evidence、Test、仕様書Reference、Internal Dependency、External Dependencyの各代表例が欠落せず出力されることを確認します。
6. 人間向けMarkdownを開き、同じ代表SymbolとEvidence等を確認できることを確認します。
7. Project Summaryの各件数をfixtureの入力Modelと照合し、一致することを確認します。
8. Summaryから代表的な詳細Symbol／Evidenceへ辿れることを確認します。
9. 同一fixtureから2回生成し、`Generated At`等の意図的変動値を除いた構造化出力・Markdown・Summaryが一致することを確認します。
10. 出力順を変える要因となる入力Collection順を意図的に変更しても、正式Sort後の生成結果が一致することを確認します。
11. 現在のUnityプロジェクト全体に対して正式な生成経路を実行し、Catalog一式を生成できることを確認します。
12. 生成後にGameplay Sourceや仕様書が自動変更されていないことを確認します。
13. 生成物を削除して再生成し、再び同じCatalog内容を復元できることを確認します。

## 前提・依存タスク

### 前提

- [PB-TASK-0002｜Project Code Catalog Core・Schema・Symbol収集基盤](/tasks/project-foundation/pb-task-0002)
- [PB-TASK-0003｜Project Code Catalog Evidence・Test・仕様書Reference・Dependency収集](/tasks/project-foundation/pb-task-0003)

本タスクは、0002／0003で確定したCatalog Model、Stable Symbol ID、Evidence分類、Specification Reference、Dependency Relationを出力する責務です。

実装時にこれらの意味をExporter側で別定義しないでください。

### Project Code Catalog内での位置

```text
PB-TASK-0002
Core・Schema・Symbol収集
        │
        ▼
PB-TASK-0003
Evidence・Test・仕様書Reference・Dependency収集
        │
        ▼
PB-TASK-0004
構造化出力・Markdown・Project Summary
        │
        ▼
Project Code Catalog 初期版の主要経路完成
```

本タスク完了後、Project Code Catalog仕様の初期版完了条件のうち、0002／0003／0004へ分割した主要項目が一通り接続された状態になります。

## 実装時の注意点

- Class名、File名、Namespace、JSON／JSONL、出力ファイル名、Markdown分割単位、実行UIは実装担当判断とします。
- ただし主要構造化形式・Schema・Sort規則はAI利用の公開契約になるため、PRで明記してください。
- 構造化出力を人間表示用文字列だけで構成しないでください。
- Markdown専用の意味判定ロジックを作らず、Catalog Modelから派生させてください。
- Summary件数をSource再走査で独自集計せず、同じCatalog Modelから計算してください。
- `Generated At`等の変動Metadataによるdiffを必要最小限にしてください。
- JSON Property順を仕様上意味のあるIdentityとして扱う必要はありませんが、Git diffや自動テスト上の出力安定性は確保してください。
- Pathは可能な限りProject基準の正規化形式を使用し、開発者個人の絶対Pathを生成物へ不要に含めないでください。
- Summaryは軽量入口です。全Symbol詳細をSummaryへ重複コピーしないでください。
- 生成物をGit管理する場合でも、生成物がSource Codeより上位の正本になる設計にしないでください。
- CI対応を将来追加できるようにしつつ、初期タスクで不要な自動生成Triggerを大量実装しないでください。
- Catalogの存在をGameplay Runtimeの必須依存にしないでください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文へ、少なくとも以下を記載します。
   - 採用した主要構造化形式（JSON／JSONL等）と理由
   - 出力ファイル構成・保存場所
   - Snapshot Metadataの配置
   - SchemaとCatalog Schema Versionの関係
   - Sort／Serializationの決定性規則
   - Markdownの分割・Navigation方針
   - Project Summaryの集計項目
   - namespace／folder／Assembly等の分類規則
   - Summaryから詳細へ辿る方法
   - 初期生成Trigger／実行経路
   - 生成物をGit管理するかどうかの採用案
   - `Generated At`等の変動値の扱い
   - 自動テスト結果
   - 現在のUnityプロジェクト全体での生成確認結果
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
