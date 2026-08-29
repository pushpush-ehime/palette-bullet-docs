---
title: "Project Code Catalog Evidence・Test・仕様書Reference・Dependency収集"
description: Project Code Catalog CoreへEvidence、XML Documentation、Test、仕様書Reference、静的Dependencyを収集・関連付けし、追加調査対象を絞れる状態を作る
pageType: task
taskId: PB-TASK-0003
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/project-code-catalog
---

# PB-TASK-0003｜Project Code Catalog Evidence・Test・仕様書Reference・Dependency収集

## タスクの目的

[PB-TASK-0002｜Project Code Catalog Core・Schema・Symbol収集基盤](/tasks/project-foundation/pb-task-0002)で作成するCatalog Core ModelとStable Symbol IDを利用し、コード上から機械的に確認できる次の情報をCatalogへ追加します。

- XML Documentation
- TODO等の実装Evidence
- Test Class／Test Method
- 仕様書Reference
- 静的Dependency

このタスクでは、これらを**調査材料として収集・関連付けるところまで**を担当します。

TODO数、Test有無、仕様書Reference有無、Dependency有無等から、完成度・仕様適合・実装不足を自動判定してはいけません。

AI向けJSON／JSONL、人間向けMarkdown、Project Summary等の最終出力は後続タスクへ委譲します。

## 完成時にできるようになること

- TODO／FIXME／HACK／未実装Exception等をSource位置と関連Symbol付きで確認できる
- XML DocumentationをSymbolへ関連付けて保持できる
- NUnit Test／UnityTest等をCatalog上のTestとして確認できる
- コード内に明示された仕様書Referenceを検出・正規化できる
- 継承、Interface、RequireComponent、Field／Property／Method型等から静的Dependencyを確認できる
- Project内の参照先はStable Symbol IDで接続し、外部型参照も失わず保持できる
- 「直接検出した事実」と「推定Candidate」を区別できる
- 後続ExporterがPB-TASK-0002のSymbolと本タスクの収集結果を再解析せず利用できる

## 関連する仕様

<PageRelations />

実装時は[Project Code Catalog仕様](/spec/common-technology/project-code-catalog)の以下を正本として確認してください。

- 基本原則
- 依存関係
- Documentation・仕様書Reference
- TODO／未実装Evidence
- Test情報
- 初期版対象範囲
- 初期版完了条件
- 未決事項
- 非目標

特に次の原則を維持してください。

```text
Catalog
=
機械的に確認できたEvidenceを記録する

AI／人間
=
Evidenceと追加調査から意味を判断する
```

## 実施内容

### 1. PB-TASK-0002のCoreへ収集結果を追加する

本タスク専用の別Catalogや別Symbol ID体系を作らず、PB-TASK-0002で確定した以下を再利用します。

- Catalog Snapshot
- Stable Symbol ID
- Type／Member Symbol
- Source File／Source Location
- Catalog Schema Version方針
- Collector／Exporter向け拡張契約
- 決定的な並び順の原則

概念上は、同一Snapshot内で次を関連付けます。

```text
Catalog Snapshot
├─ Symbols                    ← PB-TASK-0002
├─ Documentation              ← 本タスク
├─ Evidence                   ← 本タスク
├─ Tests                      ← 本タスク
├─ Specification References   ← 本タスク
└─ Dependencies               ← 本タスク
```

Class名や内部Collection構造は実装担当判断とします。

ただし後続タスクが意味を再推測しなくてよいよう、少なくとも以下は区別できる契約にしてください。

- 直接検出したEvidence／推定Candidate
- Source File単位／Symbol単位
- Project内Symbolへの参照／Catalog外の外部型参照

### 2. XML Documentation・実装Evidenceを収集する

#### XML Documentation

少なくとも以下をSymbolへ関連付けて収集します。

- `<summary>`
- `<param>`
- `<returns>`
- `<remarks>`

取得可能な範囲で次を保持してください。

- 対象Symbol ID
- Documentation種別
- Parameter名（`param`の場合）
- Text
- Source File／Source Location

Documentationが存在しないことはErrorではありません。

#### 明示Evidence

初期版では少なくとも以下を対象にします。

- `TODO`
- `FIXME`
- `HACK`
- `NotImplementedException`
- `NotSupportedException`
- `Obsolete`／Deprecatedとして機械的に判別できる宣言

各Evidenceは少なくとも次を保持できるようにしてください。

- Evidence種別
- Source File／Source Location
- 関連Symbol ID（特定できる場合）
- Comment／Message等の確認材料
- Detected FactかCandidateか

#### Candidate系

以下は仕様上、具体的判定条件が未決です。

- Empty Method Candidate
- placeholder Candidate
- 明示的な未対応Message
- Editor Warning等からの未対応候補

保守可能な規則を作れる場合は追加して構いませんが、本タスクの完了Gateには含めません。

追加する場合は確定Evidenceと分離し、判定規則と想定する誤検出をPRへ記載してください。

### 3. Test情報を収集する

少なくとも以下を収集します。

- Test Class
- Test Method
- NUnit `[Test]`
- `[UnityTest]`
- Source File／Source Location
- Test Assembly
- 判別可能な場合のEditMode／PlayMode

Test Class／MethodもPB-TASK-0002のSymbol Identityを利用し、通常Symbol収集処理を別実装として複製しない構造を優先してください。

#### EditMode／PlayMode

分類規則の具体方式は実装担当へ委譲します。

確実に分類できない場合は推測で固定せず、`Unknown`等の未判定状態を表現してください。

#### Related Test

Testと対象Class／Methodの完全な意味解析は本タスクの必須範囲ではありません。

名前規則等から関連候補を作る場合は、

```text
明示的に確認できた関係
```

と、

```text
Related Test Candidate
```

を区別してください。

Testが存在することだけを根拠に、対象機能が検証済みとは判定しません。

### 4. 仕様書Referenceを収集する

少なくとも仕様書で例示されている次の形式を検出できるようにします。

```csharp
// 仕様: docs/spec/player/states.md
```

```csharp
// Spec: docs/spec/player/player-action-transitions.md
```

各Referenceについて、少なくとも以下を保持してください。

- Raw Reference
- 正規化後Path
- Source File／Source Location
- 関連Symbol ID（規則上明確な場合）
- Source File単位かSymbol単位か

#### 正規化規則

具体規則は本タスクで実装担当が確定し、後続Exporterから利用できる契約にします。

少なくとも次を考慮してください。

- `/`と`\`等の表記揺れ
- `docs/spec/...`を同一仕様として比較できること
- `.md`有無をどう扱うか
- VitePress URL `/spec/...`との将来の相互変換
- 重複Referenceを識別するCanonical表現

Raw値は失わないようにしてください。

仕様書Repositoryへのネットワーク接続やCloneを、Reference検出の必須依存にしてはいけません。

#### Reference Owner

どのSymbolへのReferenceか明確でない場合、近接行だけを根拠に無理にSymbolへ結び付けないでください。

- Symbolへ関連付ける条件
- Source File単位として扱う条件

を決定的な規則として定め、PRへ記載します。

Referenceが検出されないことはErrorではありません。

### 5. 静的Dependencyを収集する

初期版では少なくとも以下をDependencyとして扱います。

- 継承
- Interface実装
- `[RequireComponent]`
- Field型
- Property型
- Constructor引数
- Method引数
- Method戻り値

PB-TASK-0002ですでに取得済みの型・Member・Attribute情報から導出できるものは再解析せず利用してください。

Dependencyごとに、少なくとも以下を確認できる構造にします。

| 項目 | 内容 |
| --- | --- |
| Source | Dependency元Symbol |
| Relation Kind | 継承、Field参照等の関係種別 |
| Target | 参照先 |
| Target Symbol ID | Catalog内Symbolの場合 |
| External Type Identity | Catalog外型の場合 |
| Evidence | 根拠Member／Attribute |
| Source Location | 根拠位置 |

Relation Kindの具体名は実装担当判断ですが、後続Exporterが意味を再判定しなくてよい契約にしてください。

#### Internal／External

Project内に収集済みの参照先は、可能な範囲でStable Symbol IDへ解決します。

`UnityEngine`、`System`、Package等、Catalog対象外の型はDependencyなしとして捨てず、外部型Identityとして保持してください。

#### 決定性

同じ関係を複数経路から取得できる場合を考慮し、

- Dependencyの一意性
- 重複を残す場合の意味
- Sort規則

を定めます。

同じSource Snapshotから再収集した際に、順序だけが揺れてdiffになる状態を作らないでください。

### 6. 自動判定を追加しない

本タスクでは、例えば次の判定を行いません。

```text
TODOあり → 未完成
Tests 0 → 未実装
Spec Referenceなし → 仕様違反
Dependencyなし → 接続欠落
```

本タスクの出力は追加調査のためのEvidenceです。

完成度Score、仕様適合判定、優先度付けは対象外です。

### 7. fixtureと自動テストを用意する

実Projectに対象例が存在しなくてもCollectorを検証できるよう、専用fixtureまたは同等のTest Sourceを用意してください。

最低限、以下を含めます。

```text
Evidence
├─ TODO
├─ FIXME
├─ HACK
├─ NotImplementedException
└─ NotSupportedException

Documentation
├─ summary
├─ param
├─ returns
└─ remarks

Tests
├─ NUnit Test
└─ UnityTest

Specification Reference
├─ // 仕様: docs/spec/...
└─ // Spec: docs/spec/...

Dependencies
├─ inheritance
├─ interface
├─ RequireComponent
├─ field
├─ property
├─ constructor parameter
├─ method parameter
└─ method return
```

さらに次を確認してください。

- 通常ClassをTestとして誤認しない
- Referenceとして扱わない通常コメントを誤登録しない
- 外部型参照でCollector全体が失敗しない
- 同一SourceからEvidence／Reference／Dependencyの順序が揺れない
- 文字列Literal中の`TODO`等をどう扱うかが採用方式上明確である

実Projectで0件だったことだけをCollector成功の根拠にしてはいけません。

## 対象範囲

- PB-TASK-0002 Core Modelへの拡張
- XML Documentation収集
- TODO／FIXME／HACK等のEvidence
- NotImplementedException／NotSupportedException等のEvidence
- Obsolete／Deprecated情報
- Test Class／Test Method収集
- NUnit `[Test]`／`[UnityTest]`
- EditMode／PlayMode／未判定の分類
- 仕様書Reference検出・正規化・Owner関連付け
- 静的Dependency
- Internal／External Dependency
- 本タスク追加情報の決定的なSort
- fixtureによる自動テスト

## 対象外

- AI向けJSON／JSONL最終ファイル出力
- 人間向けMarkdown生成
- Project Summary生成
- Catalog Snapshot間の差分レポート
- 仕様書ReferenceのWeb側逆引きIndex
- 完全なMethod Call Graph
- Method Body内の全Call解析
- Event Subscribe／Invokeの完全追跡
- Runtime上の実参照関係
- Scene／Prefab Component配線解析
- ScriptableObject `.asset` 実値収集
- Magic Number Candidate
- Test Coverageの意味解析
- 自動完成度Score／仕様適合判定
- Gameplayコードや仕様書の自動修正

Empty Method／placeholder等の曖昧なCandidate検出は追加可能ですが、完了Gateには含めません。

## 完了条件

- [ ] PB-TASK-0002のCore ModelとStable Symbol IDを再利用している
- [ ] `<summary>`、`<param>`、`<returns>`、`<remarks>`を対応Symbolへ収集できる
- [ ] TODO／FIXME／HACKをSource Location付きEvidenceとして収集できる
- [ ] NotImplementedException／NotSupportedExceptionをEvidenceとして収集できる
- [ ] Obsolete／Deprecatedを機械的に確認できる
- [ ] Evidenceを関連Symbolへ接続でき、Detected FactとCandidateを区別できる
- [ ] Test Class／Test Methodを収集できる
- [ ] NUnit `[Test]`／`[UnityTest]`を識別できる
- [ ] TestのSource Location／Assemblyを確認できる
- [ ] EditMode／PlayModeを判別不能な場合に誤推測しない
- [ ] 仕様書で例示された日本語`仕様:`／`Spec:`形式を検出できる
- [ ] ReferenceのRaw値と正規化Pathを確認できる
- [ ] ReferenceをSymbolまたはSource Fileへ決定的な規則で関連付けられる
- [ ] 継承、Interface、RequireComponent、Field、Property、Constructor引数、Method引数、Method戻り値からDependencyを収集できる
- [ ] Catalog内Targetを可能な範囲でStable Symbol IDへ解決できる
- [ ] Catalog外TargetをExternal Typeとして保持できる
- [ ] DependencyのRelation Kind、根拠、Source Locationを確認できる
- [ ] 同一Source Snapshotから本タスク追加情報を決定的に再収集できる
- [ ] fixtureでDocumentation／Evidence／Test／Reference／Dependencyを自動検証できる
- [ ] 0件取得だけをCollector成功の根拠としていない
- [ ] TODO数、Test有無、Reference有無、Dependency有無から完成度を自動算出していない
- [ ] 完全Call Graph、Runtime参照、Scene／Prefab接続を本タスクへ混在させていない
- [ ] Evidence分類、Test分類、Reference規則、Dependency Relation KindをPRへ記載している

## 確認手順

1. `Palette-Bullet`の最新`main`を取得し、PB-TASK-0002が取り込まれた状態から実装ブランチを作成します。
2. Unity EditorでCompile Errorがないことを確認します。
3. 本タスクのCollector自動テストを実行し、全件成功することを確認します。
4. fixtureからTODO／FIXME／HACK、NotImplementedException、NotSupportedExceptionがSource位置付きで取得されることを確認します。
5. XML Documentationの4種が対応Symbolへ関連付くことを確認します。
6. NUnit Test／UnityTestがTestとして識別され、通常Methodと区別できることを確認します。
7. `// 仕様: docs/spec/player/states.md`と`// Spec: docs/spec/player/player-action-transitions.md`を検出・正規化できることを確認します。
8. 継承、Interface、RequireComponent、Field／Property型、Constructor／Method引数、Method戻り値のDependencyを確認します。
9. 内部型はStable Symbol IDへ解決され、外部型参照も失われないことを確認します。
10. 同じfixtureを2回収集し、Evidence／Test／Reference／Dependencyの内容と順序が一致することを確認します。
11. 現在のUnityプロジェクト全体へCollectorを実行し、対象0件のカテゴリがあっても全体が正常完了することを確認します。
12. Catalog収集がGameplay Runtimeの必須処理になっていないことを確認します。

## 前提・依存タスク

### 前提

- [PB-TASK-0002｜Project Code Catalog Core・Schema・Symbol収集基盤](/tasks/project-foundation/pb-task-0002)

本タスクはPB-TASK-0002で確定するCore Model、Stable Symbol ID、Source Location、拡張契約を前提とします。

タスクページ自体は先に発行して構いませんが、実装時に別のSymbol Identityや別Catalog Modelを作らないでください。

### 後続

```text
PB-TASK-0002
Core・Schema・Symbol収集
        │
        ▼
PB-TASK-0003
Evidence・Test・仕様書Reference・Dependency収集
        │
        ▼
後続タスク
AI向け構造化出力・Markdown・Project Summary
```

後続ExporterはPB-TASK-0002と本タスクの結果を再解析せず利用できることを前提とします。

## 実装時の注意点

- Class名、File名、Namespace、Collector分割、内部Record名は実装担当判断とします。
- PB-TASK-0002の解析方式を確認し、同じSourceを不要に別Parserで二重解析しないでください。
- Evidence Kind、Test分類、Reference Canonical形式、Dependency Relation Kindは後続公開契約になるため、このタスクで方式を確定してPRへ記載してください。
- 仕様書Reference先の存在確認にネットワーク接続を必須化しないでください。
- Test名の一致だけで「このTestがこの機能を保証する」と確定しないでください。
- Dependencyは静的な参照Evidenceであり、Runtimeで実際に使用された証拠ではありません。
- 完全Call GraphやEvent Subscribe／Invoke追跡へ範囲を広げないでください。
- Candidate系Evidenceを追加する場合は、確定Evidenceと明確に分離してください。
- Core Model変更が必要な場合は、PB-TASK-0002で確定したSchema Version方針に従ってください。
- 新規Package／外部依存を追加する場合は理由とEditor／Runtimeへの影響をPRへ記載してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文へ、少なくとも以下を記載します。
   - PB-TASK-0002から再利用したCore契約
   - Evidence種別とDetected／Candidateの区別
   - XML Documentationの収集範囲
   - Test識別とEditMode／PlayMode分類規則
   - Related Test Candidateを実装した場合の規則
   - 仕様書Referenceとして認識する記法
   - Reference Pathの正規化・Owner規則
   - Dependency Relation Kind一覧
   - Internal／External Targetの解決方法
   - 決定的Sort／重複処理規則
   - 新規Package／外部依存の有無
   - 自動テスト結果
   - 現在のUnityプロジェクトでの収集確認結果
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
