---
title: "Project Code Catalog仕様"
description: Unityプロジェクトのコード構造・依存関係・実装Evidence・Test・仕様書参照を機械収集し、AIが短時間でプロジェクト全体を把握するためのコード構造カタログ
pageType: spec
category: "共通技術"
status: 仮仕様
relatedTasks: []
---

# Project Code Catalog仕様

## 目的

`Project Code Catalog`は、Unityプロジェクト内のコードを機械的に解析し、
AIが現在のプロジェクト全体のコード構造、実装済み範囲、依存関係、検証状況、
未実装候補、仕様書との接続を短時間で把握できるようにするための開発支援基盤です。

本機能の中心目的は、単なる人間向けコードドキュメントの生成ではありません。

AIが毎回プロジェクト全体のソースコードを一から読み直さなくても、

- どの型が存在するか
- どのField／Property／Methodが存在するか
- どのシステム同士に静的な依存関係があるか
- どのEvent／Delegateが存在するか
- どのコードがUnity Runtimeで動く可能性があるか
- どこにTODOや未対応処理のEvidenceが存在するか
- どのTestが存在するか
- どの仕様書への参照がコード上に存在するか
- どの値が将来のTuning Parameter候補を検討する材料になり得るか
- どのCommit時点の情報か

を、一定の構造で検索・比較・監査できる状態を作ります。

基本原則は次のとおりです。

> **Catalogは証拠を出す。AI・人間が意味を判断する。**

---

## 背景

Palette Bulletでは、Gameplay仕様、共通技術基盤、Unity実装が並行して更新されます。

そのためAIが実装監査や次のタスク設計を行う際、
毎回大量のソースコードを読み直すだけでは、以下の問題が発生します。

- プロジェクト全体の把握に時間がかかる
- 調査対象外のコードまで毎回読み直す必要がある
- 同名機能のClass、Test、仕様書、依存関係を追跡しにくい
- 前回監査時点から何が変化したか比較しにくい
- 「ファイルが存在すること」と「機能が完成していること」を混同しやすい
- TODO、Test不足、仕様書参照不足等の追加調査候補を見落としやすい
- AIへ渡すContextがコード全文に偏り、必要な構造情報を効率良く取得できない

`Project Code Catalog`は、
ソースコードから機械的に確認できる事実を一度正規化し、
AIが最初に参照できる軽量な入口を用意します。

Catalogを参照したAIは、
そこで得られたEvidenceから追加調査対象を絞り込み、
必要なソースコード、Test、仕様書だけを詳しく確認します。

---

## 本ページの責務

本ページは、`Project Code Catalog`が何を収集し、
どのような形式で出力し、
AI・人間がどのように利用するかを定義します。

本ページが所有する主な責務は以下です。

- Catalogの目的
- 機械収集するコード構造
- 収集するEvidenceの種類
- Unity固有情報の扱い
- 仕様書Referenceの収集方針
- Test情報の収集方針
- Git／Catalog Snapshot情報
- AI向け構造化出力
- 人間向け表示
- Project Summary
- 初期版対象範囲
- 後続機能
- 非目標
- Catalog生成物に求める決定性
- Planner調整Parameter機能との責務境界

本ページは、個々のGameplay機能が完成しているかを判定する正本ではありません。

また、コードから得られた情報を根拠に、
仕様書のGameplay上の意味を再定義しません。

---

## 基本原則

### 1. 機械的事実とAI判断を分離する

Catalogは、機械的に確認可能な事実・Evidenceを収集します。

例えば、

```text
PlayerDash

Source Exists
Yes

Methods
3

PlayerStateMachine Reference
Yes

Input Reference
Yes

Specification Reference
Yes

Tests
0

TODO
2

NotImplementedException
0
```

のような情報は出力できます。

一方、

```text
PlayerDash 完成度80%
```

や、

```text
PlayerDash.csが存在する
↓
Dashは完成している
```

といった判断は行いません。

AIまたは人間がCatalogと必要な追加調査結果を参照し、
意味を判断します。

### 2. できるだけ広く収集するが、意味を勝手に決めない

Field、Property、Method、Test、TODO等は広く収集します。

ただし、

- `float`だからPlanner調整Parameterである
- Testがないから未完成である
- 空Methodだから必ず未実装である
- 仕様書Referenceがないから未実装である

とは判定しません。

### 3. 生成物を手編集の正本にしない

Catalog生成物はソースコード等から再生成可能な派生データとして扱います。

生成後のJSON／JSONL／Markdownを人間が直接編集し、
その内容を正本として維持する運用にはしません。

### 4. 同じSourceから決定的に再生成できる

同一のRepository、Branch、Commit、Generator Version、
Catalog Schema Versionから生成した場合、
可能な限り同じ順序・同じ識別規則・同じ出力になることを要求します。

AIがdiffを取った際に、
単なる出力順の揺れをコード変更と誤認しないことを重視します。

### 5. 生成時Commitを記録する

Catalogには必ずSnapshot情報を持たせます。

AIが古いCatalogを最新コードと誤認しないようにします。

### 6. AIが差分比較しやすい形式にする

構造化データは、

- 安定したSchema
- 安定したSort
- 一意なSymbol識別
- 小さな単位でのdiff
- 不要な表示用情報と意味データの分離

を重視します。

### 7. ゲームRuntimeへ不要な依存を持ち込まない

Catalog生成・表示の都合で、
Gameplay Runtimeに不要な依存や処理を追加しません。

### 8. Editor／CI等から再生成可能な構造にする

最終的な生成Triggerは未決ですが、
特定の一人のローカル環境でしか生成できない構造にはしません。

### 9. 仕様書との接続を追跡可能にする

コード内で検出された仕様書ReferenceをCatalogへ保持し、
AIがコードとWeb仕様書を相互に追跡できる材料にします。

### 10. Planner調整Parameter基盤との接続に必要な情報を保持する

Planner調整Parameterを本Catalog自身で決定しません。

ただし、[Planner調整Parameter管理・Excel連携仕様](/spec/common-technology/planner-tuning-parameter)側が公開候補の確認材料として利用できるよう、Field／Property／Attribute／Default Value等を保持します。

---

## AIによる利用目的

### 実装進捗監査

ユーザーが、

```text
PlayerのDashは現在どこまで実装されていますか？
```

と質問した場合、
AIは最初からPlayer関連コード全体を無条件に読むのではなく、
Catalogを入口として利用できます。

概念例：

```text
Project Code Catalog
↓
PlayerDash関連Symbolを検索
↓
Sourceあり
State依存あり
Input依存あり
Testなし
TODOあり
仕様書Referenceあり
↓
追加調査すべきソースと仕様書を絞る
↓
AIがEvidenceをもとに評価
```

Catalog自体は、
Dashの完成・未完成を断定しません。

### 仕様書との差分監査

例えば仕様書上にParryが存在する場合、

```text
Catalog
Parry関連Classあり
Testあり
Wildcard変換に関連しそうな静的Referenceなし
```

というEvidenceから、
AIはWildcard変換部分を追加調査対象として絞り込めます。

静的Referenceが検出されなかったことだけを根拠に、
機能欠落とは断定しません。

### 未実装候補探索

AIは以下のEvidenceを組み合わせて、
追加確認が必要な領域を探せます。

- TODO
- FIXME
- NotImplementedException
- placeholder candidate
- Test未検出
- 仕様書Referenceのみ存在
- Obsolete
- 明示的Warning
- 空Method candidate

これらはすべて調査候補であり、
自動完成度判定ではありません。

### 接続構造の把握

Field型、Method引数、継承、Interface、
RequireComponent等の静的な関係を参照することで、
AIがコード全体の大まかな接続構造を把握できます。

---

## 収集対象

初期版では、
C#コードおよびUnityプロジェクトから機械的に取得可能な構造を広く収集します。

主要対象は以下です。

- 型
- Enum Value
- Field
- Property
- Method
- Event／Delegate
- Unity Attribute
- Unity Lifecycle Method
- 型同士の静的な関係
- ScriptableObject型
- XML Documentation
- 仕様書Reference
- TODO等の作業途中Evidence
- Test Class／Test Method
- const／static readonly等
- Git／Catalog Snapshot情報

完全なMethod Call Graphや、
すべての数値リテラルの解析は初期版対象外とします。

---

## 型情報

初期版では、少なくとも以下の型を収集対象とします。

- class
- abstract class
- struct
- interface
- enum
- 使用している場合はrecord
- MonoBehaviour派生型
- ScriptableObject派生型

各型について、取得可能な範囲で少なくとも以下を保持します。

| 項目 | 内容 |
| --- | --- |
| Fully Qualified Name | namespaceを含む完全修飾名 |
| Name | 型名 |
| Namespace | 所属namespace |
| Kind | class、struct、interface、enum等 |
| Abstract | abstractか |
| Base Type | 継承元 |
| Interfaces | 実装interface |
| Unity Type | MonoBehaviour／ScriptableObject等 |
| Assembly | 所属Assembly |
| asmdef | 対応asmdef |
| Source File | ソースファイル |
| Source Location | 行等の位置情報 |

型が存在すること自体は、
そのGameplay機能が完成している証拠とは扱いません。

---

## Enum

Enumは型情報に加えて、
各Enum ValueもCatalog化します。

少なくとも以下を保持します。

- Enum型
- Value名
- 明示値がある場合はその値
- Source File
- Source Location
- XML Documentationがある場合はその内容

Enum ValueはState、Result、Mode等の構造理解に利用できますが、
その値が実際にRuntimeで使用されているかは別Evidenceとして扱います。

---

## Field

Fieldはコード構造の把握に加えて、
将来のTuning Parameter Candidate抽出にも重要なため、
初期版から詳細を収集します。

少なくとも以下を対象とします。

- Field名
- 型
- 所属型
- Access Modifier
- public
- private
- protected
- internal
- static
- readonly
- const
- `[SerializeField]`の有無
- 初期値
- 取得可能な場合はDefault Value
- Source File
- Source Location

Unity Attributeも合わせて保持します。

例：

- `[SerializeField]`
- `[Range]`
- `[Min]`
- `[Tooltip]`
- `[Header]`
- `[FormerlySerializedAs]`

概念例：

```text
Class
PlayerMovement

Field
moveSpeed

Type
float

Serialized
Yes

Default
5

Range
0 - 20

Tooltip
Player movement speed
```

Catalogは、
このFieldがPlanner調整可能かどうかを自動決定しません。

---

## Property

Propertyは、少なくとも以下を収集します。

- Property名
- 型
- 所属型
- getterの公開範囲
- setterの公開範囲
- staticか
- Source File
- Source Location

Propertyには、

- `CurrentHp`
- `CurrentState`
- `CurrentTarget`

等のRuntime状態が含まれる場合があります。

そのため、

> Catalogへ収集すること

と、

> Planner調整Parameterとして公開すること

は完全に分離します。

---

## Method

初期版では、少なくとも以下を収集します。

- Method名
- 所属型
- Access Modifier
- 戻り値
- 引数
- 引数名
- 引数型
- static
- virtual
- override
- abstract
- async
- generic
- Source File
- Source Location

概念例：

```text
Method
ApplyDamage

Owner
EnemyDamageReceiver

Return
void

Parameters
RgbDamage damage
```

初期版ではMethod内部を完全に意味解析し、
自然言語で要約することを必須にはしません。

また、Method Bodyから完全なCall Graphを生成することも初期版必須にはしません。

---

## Event／Delegate

システム間接続をAIが理解するため、
Event／Delegateは初期版から収集します。

対象候補は以下です。

- C# `event`
- `delegate`
- `Action`
- `Func`
- `UnityEvent`
- 独自Event型

少なくとも以下を保持します。

- 名前
- Event／Delegateの種類
- 型
- payload
- 所属型
- Access Modifier
- staticか
- Source File
- Source Location

Eventの存在は接続候補を示すEvidenceになりますが、
実際にどこからSubscribe／Invokeされるかの完全解析は初期版必須にはしません。

---

## Unity固有情報

### Unity Attribute

AIのコード構造理解やTuning Parameter Candidate判断に有用なAttributeを収集します。

初期対象には少なくとも以下を含めます。

- `[SerializeField]`
- `[RequireComponent]`
- `[CreateAssetMenu]`
- `[DisallowMultipleComponent]`
- `[Range]`
- `[Min]`
- `[Tooltip]`
- `[Header]`
- `[FormerlySerializedAs]`

その他のAttributeも、
構造理解に有用で機械的に取得可能なものは収集対象にできます。

### Unity Lifecycle Method

Unity Lifecycle Methodは通常Methodと同じSymbolとして収集しつつ、
Lifecycle種別を別Metadataとして識別可能にします。

例：

- Awake
- Start
- OnEnable
- OnDisable
- Update
- FixedUpdate
- LateUpdate
- OnDestroy
- OnValidate
- Trigger callback
- Collision callback

これによりAIが、

- 毎frame処理候補
- Physics Step処理候補
- Editor Validation処理候補
- 有効化／無効化時処理候補

を機械的Evidenceとして把握しやすくします。

Lifecycle Methodが存在するだけで、
必ず重要なRuntime処理を持つとは断定しません。

---

## 依存関係

AIがプロジェクト全体の接続を理解できるように、
初期版では静的に取得しやすい型同士の関係を収集します。

対象候補は以下です。

- 継承
- interface実装
- `[RequireComponent]`
- Field型による参照
- Property型による参照
- Constructor引数
- Method引数
- Method戻り値

概念例：

```text
PlayerMovement
├─ requires CharacterController
├─ references PlayerStateMachine
├─ references Animator
└─ references InputActionAsset
```

これらは「静的な関係が検出された」というEvidenceです。

初期版では以下を必須にしません。

- 完全なMethod Call Graph
- 実行時の実参照関係
- Scene／Prefab上の全Component接続解析
- Event Subscribe／Invokeの完全追跡

---

## ScriptableObject

ScriptableObjectはゲームデータや調整値の構造理解に重要なため、
初期版から型構造をCatalog化します。

少なくとも以下を取得します。

- ScriptableObject型
- namespace
- 継承関係
- 所有Field
- Property
- Attribute
- `[CreateAssetMenu]`情報
- Source File
- Source Location

初期版のCode Catalogは、
ScriptableObjectの「型構造」を対象とします。

実際のすべての`.asset`インスタンス値の走査は、
後続のAsset／Data Catalogとして分離可能な設計とします。

概念上の責務は以下です。

```text
Project Code Catalog
→ ScriptableObjectの型構造

Asset / Data Catalog
→ 実際のAssetインスタンス値
```

---

## Documentation・仕様書Reference

### XML Documentation

AI向けの意味情報として、
少なくとも以下のXML Documentationを収集対象とします。

- `<summary>`
- `<param>`
- `<returns>`
- `<remarks>`

Documentationが存在しない場合でも、
それだけを理由に問題とは判定しません。

### 通常コメント

通常コメントは有用な一方で、
ノイズや古い情報を大量に含む可能性があります。

どこまで収集するかは未決事項とします。

ただし、仕様書Referenceとして明示されたコメントは優先的に検出します。

例：

```csharp
// 仕様: docs/spec/player/states.md
```

```csharp
// Spec: docs/spec/player/player-action-transitions.md
```

### 仕様書Reference

コードから仕様書パスが検出された場合、
SymbolまたはSource FileとReferenceを対応付けます。

概念例：

```text
PlayerStateMachine

Specification References
- docs/spec/player/states.md
- docs/spec/player/player-action-transitions.md
```

将来的には、

```text
仕様ページ
→ 対応コード

コード
→ 対応仕様ページ
```

の両方向をAIが追跡できる構造を目標とします。

ただし、

```text
Specification Reference Detected
No
```

は、
単に参照が検出されなかったという事実です。

未実装や仕様違反を意味しません。

仕様書Referenceを検出する具体的な記法・正規化規則は未決です。

---

## TODO／未実装Evidence

AIが追加調査すべき領域を絞れるように、
作業途中や未対応の可能性を示すEvidenceを機械収集します。

初期対象候補は以下です。

- TODO
- FIXME
- HACK
- `NotImplementedException`
- `NotSupportedException`
- 明示的な未対応Message
- 空Method Candidate
- placeholder Candidate
- Obsolete／Deprecated
- Editor Warning等で明示された未対応状態

これらはすべて、

> Evidence

または、

> Candidate

として扱います。

例えば空Methodであっても、
Unity Callbackを意図的に空で持っている可能性があります。

そのため、

```text
Empty Method Candidate
Yes
```

は出力できますが、

```text
Implementation Missing
Yes
```

とは自動判定しません。

placeholder／空Methodの具体的判定条件は未決です。

---

## Test情報

AIが実装Evidenceと検証Evidenceを分けて確認できるように、
Test情報を初期版から収集します。

対象候補は以下です。

- Test Class
- Test Method
- NUnit `[Test]`
- `[UnityTest]`
- EditMode Test
- PlayMode Test
- TestのSource File
- TestのSource Location
- Test Assembly
- 名前上または機械規則上の関連候補

概念例：

```text
PlayerDash

Related Tests Detected
3
```

初期版では、

> このTestがこのMethodの挙動を完全に保証している

という意味解析までは行いません。

Testと対象Class／Symbolの関連付け方法は未決です。

Catalog上では、
明示的に確認できるTest Symbolと、
規則から推定したRelated Test Candidateを区別できる構造が望まれます。

---

## 定数・固定値

初期版では、少なくとも以下を収集対象にします。

- `const`
- `static readonly`
- Field初期値
- 取得可能なDefault Value

これは将来的に、

> 本来Planner調整Parameterにするべき値がコードへ固定されていないか

をAIや人間が確認する材料になります。

ただし、
Catalog自身は調整可能かどうかを決定しません。

### Magic Number

Method内部等に直接記述された数値リテラルのMagic Number検出は、
将来的には有用ですがノイズも多いため後続機能とします。

初期版の必須条件には含めません。

---

## Git／Catalog Snapshot情報

AIがCatalogの鮮度と対応Sourceを判断できるように、
生成物には最低限Snapshot情報を含めます。

必須項目は以下です。

- Repository
- Branch
- Commit SHA
- Catalog生成日時
- Unity Version
- Catalog Schema Version
- Generator Version

概念例：

```text
Repository
pushpush-ehime/Palette-Bullet

Branch
feature/playerMotion

Commit
abc123...

Unity
6000.3.16f1

Generated At
2026-08-29T...

Catalog Schema
1

Generator
1.0.0
```

Working Treeに未Commit変更がある場合の表現方法は実装設計で定めます。

ただし、
Commit SHAだけを見て未Commit変更が存在しないと誤認しないため、
将来的にはDirty状態等をSnapshot Metadataとして保持することも検討します。

---

## 出力データ

Catalogは、
人間向けMarkdownだけを生成するツールにはしません。

AIが検索・比較・差分監査しやすい構造化出力を必須とします。

概念的な出力例は以下です。

```text
Generated/
├─ code-catalog.jsonl
├─ code-catalog.md
├─ dependencies.json
└─ project-summary.md
```

正式な出力フォルダ、ファイル名、分割方式は未決です。

重要なのは、
同じ情報を複数の手編集正本として持たないことです。

構造化データを基礎とし、
人間向けMarkdownをそこから派生生成する方式を推奨します。

---

## AI向け構造化出力

### JSON／JSONL

AI監査・機械処理の主要入力として、
JSONまたはJSONL形式を利用します。

概念例：

```json
{
  "symbolId": "PaletteBullet.Player.PlayerMovement.moveSpeed",
  "kind": "field",
  "owner": "PaletteBullet.Player.PlayerMovement",
  "type": "float",
  "access": "private",
  "serialized": true,
  "defaultValue": "5",
  "file": "Assets/Scripts/Player/PlayerMovement.cs"
}
```

具体Schemaは未決ですが、
少なくとも以下を重視します。

- 安定した構造
- Symbolを一意に識別できる
- deterministicな順序
- 同じSourceから生成すれば同じ結果
- AIがdiffしやすい
- Snapshot Metadataを持つ
- Evidenceと推定Candidateを区別できる
- 人間表示専用の装飾に依存しない

### Stable Symbol ID

AIが複数Snapshot間で同じSymbolを追跡するため、
Stable Symbol IDが必要です。

ただし、
正式なID形式は未決事項です。

少なくとも以下の問題を考慮します。

- namespace変更
- Class名変更
- Method overload
- generic
- Property／Field同名
- partial class
- nested type
- ファイル移動
- Assembly変更

位置情報だけをIDにすると、
ファイル編集で大量のID変更が発生するため、
Source LocationとStable IDは分離する方向を推奨します。

---

## 人間向け表示

人間向けには、
構造化データからMarkdown等を生成します。

目的は主に以下です。

- プログラマーによる確認
- QAによるEvidence確認
- AIへ渡す前の目視確認
- Git上での差分確認
- Symbol一覧の閲覧
- TODO／Test／仕様書Referenceの一覧確認

Markdown自体を正本として手編集しません。

人間向けUIをUnity Editor内に持つか、
生成Markdownを主に利用するかは実装担当へ委譲できます。

本仕様では特定のUI技術を固定しません。

---

## Project Summary

全Symbol一覧とは別に、
AIがCatalogを読み始める際の軽量な入口として
`Project Summary`を生成します。

少なくとも以下のようなProject全体集計を出力できることを目標とします。

```text
Project Summary

Assemblies
8

MonoBehaviours
42

ScriptableObjects
17

Interfaces
12

Enums
31

Methods
482

Serialized Fields
126

Tests
54

TODO
18

NotImplemented
3
```

さらに、
機械的に分類可能な範囲で領域別概要を持てると有用です。

例：

- Player
- Enemy
- BGM
- MusicChart
- Combat
- Stage
- UI

ただし、
高度な意味分類を初期版の必須条件にはしません。

初期版では以下のような機械的分類を優先します。

- namespace
- folder
- Assembly／asmdef

Project Summaryの分類粒度と分類規則は未決です。

---

## 実装進捗判断との関係

Project Code Catalogは、
実装進捗率や完成度を自動算出しません。

例えば、

```text
Sourceあり
Tests 0
TODO 2
仕様書Referenceあり
```

という状態をCatalogは出力できます。

そこから、

> 実装の骨格は存在するが、TestがなくTODOも残っているため完成とは断定できない

と判断するのはAIまたは人間です。

以下のような自動判定は行いません。

```text
Tests 0
=
未完成
```

```text
TODO 0
=
完成
```

```text
Source Exists
=
実装済み
```

Catalog単体で確定できないことは、
Evidenceの有無として出力します。

---

## Planner調整Parameter機能との接続

Project Code Catalogでは、
Planner調整Parameterそのものを最終決定しません。

責務は次のように分離します。

```text
Project Code Catalog
↓
Field / Property / Constant等を広く収集
↓
Tuning Parameter Candidate
↓
Planner調整Parameter管理・Excel連携仕様のOpt-in／選別規則
↓
Planner調整可能Parameter
↓
Excel等へ出力・編集
↓
Unityへ反映
```

Project Code Catalogの責務は、

> コード上に何が存在するかを機械収集する

ことです。

Planner Parameter／Excel管理側の責務は、

> その中から何を人間が調整可能にするか決定し、安全に編集・Importする

ことです。

Catalogは、

```text
floatだからPlanner調整可能
```

とは判断しません。

ただし、後続の選別に必要な材料として、
少なくとも以下を保持します。

- `[SerializeField]`
- `[Range]`
- `[Min]`
- `[Tooltip]`
- `[Header]`
- Default Value
- Type
- `const`
- `readonly`
- 所属Class
- ScriptableObjectか
- PropertyかFieldか
- Access Modifier

「Runtime状態らしいか」等の推定MetadataをどこまでCatalog側で持つかは未決です。

---

## 初期版対象範囲

初期版では、
軽量で機械的に取得しやすく、
AIの構造理解に大きく寄与する項目を優先します。

| 項目 | 初期版 |
| --- | --- |
| Class / Struct / Interface / Enum | 必須 |
| Enum values | 必須 |
| namespace | 必須 |
| file / line | 必須 |
| assembly / asmdef | 必須 |
| Field | 必須 |
| Property | 必須 |
| Method | 必須 |
| Method引数 / Return | 必須 |
| Event / Delegate | 必須 |
| SerializeField | 必須 |
| Unity Attribute | 必須 |
| MonoBehaviour / ScriptableObject | 必須 |
| 継承 / Interface | 必須 |
| RequireComponent | 必須 |
| Unity Lifecycle Method | 必須 |
| XML Summary | 必須 |
| TODO / FIXME | 必須 |
| NotImplementedException等 | 必須 |
| Test Class / Test Method | 必須 |
| 仕様書パス参照 | 必須 |
| Default Value | 取得可能な範囲で優先 |
| Git Snapshot情報 | 必須 |
| JSON / JSONL出力 | 必須 |
| 人間向けMarkdown | 必須 |
| Project Summary | 必須 |
| Magic Number検出 | 後続 |
| 完全なMethod Call Graph | 後続 |
| 全ScriptableObject Asset実値 | 後続 |
| AIによる自動完成度スコア | 対象外 |

初期版は、
コード全文の高度な意味理解よりも、
広い構造を安定したSchemaへ正規化することを優先します。

---

## 後続機能

初期版の運用後、
実際にAI監査で有用性が確認されたものから拡張します。

後続候補には以下を含みます。

- Magic Number Candidate検出
- Method Call Graph
- Event Subscribe／Invoke追跡
- Scene／Prefab上のComponent接続解析
- ScriptableObject Asset実値Catalog
- Prefab／Scene／Asset Catalogとの統合
- Catalog Snapshot間の差分レポート
- Symbol rename追跡
- 仕様書Referenceの逆引きIndex
- Testと対象Symbolの関連付け精度向上
- Tuning Parameter Candidate用Metadataの拡張
- CIによるCatalog鮮度検証
- Catalog未更新の検出
- AI向けContext Package生成

これらを初期版へ一度に含め、
生成時間や実装複雑度を過度に増やしません。

---

## 非目標

本機能の非目標は以下です。

- AIそのものをUnity Editorへ組み込むこと
- 自動で実装完成度を数値化すること
- Catalog生成時にゲームコードを書き換えること
- Code CatalogをゲームRuntimeの正本にすること
- C#の完全な意味解析器を独自開発すること
- 初期版で完全なCall Graphを生成すること
- 全ての数値リテラルをPlanner Parameterとして扱うこと
- Catalogだけを根拠に実装完了を断定すること
- 人間が書いた仕様書をCatalogで置き換えること
- Planner調整Parameterの最終選別を本ページで行うこと
- 全ScriptableObject Asset実値を初期版でCatalog化すること
- 自動でコードを修正すること
- 自動で仕様書を変更すること

---

## 初期版完了条件

初期版は、少なくとも以下を満たした時点で完成とします。

1. Repository／Branch／Commit SHA／Unity Version／生成日時を記録できる
2. Catalog Schema VersionとGenerator Versionを記録できる
3. C#の主要な型を収集できる
4. Enum Valueを収集できる
5. namespace、Assembly／asmdef、Source File、Source Locationを収集できる
6. Fieldと主要Attributeを収集できる
7. Propertyを収集できる
8. Method、引数、Return情報を収集できる
9. Event／Delegateを収集できる
10. MonoBehaviour／ScriptableObjectを識別できる
11. Unity Lifecycle Methodを識別できる
12. 継承、Interface、RequireComponent等の主要な静的関係を収集できる
13. XML Documentationを収集できる
14. 仕様書Referenceを機械検出できる
15. TODO／FIXME／NotImplementedException等をEvidenceとして収集できる
16. Test Class／Test Methodを収集できる
17. ScriptableObjectの型構造を収集できる
18. AI向けJSON／JSONL等の構造化出力を生成できる
19. 人間向けMarkdownを構造化データから生成できる
20. Project Summaryを生成できる
21. 同じSource Snapshotから決定的な順序で再生成できる
22. Catalog生成物を手編集正本として扱わない
23. Catalogが完成度スコアを自動算出しない
24. Catalog生成のためにGameplay Runtimeコードへ不要な依存を追加しない
25. AIがSymbol、Evidence、Test、仕様書Referenceを検索して追加調査対象を絞れる

---

## 未決事項

以下は現時点では確定しません。

### 出力

- 出力フォルダ
- JSONとJSONLのどちらを中心形式とするか
- JSON／JSONLの具体Schema
- AIへ渡す際の推奨ファイル構成
- 人間向けMarkdownの分割単位

### Symbol識別・Schema

- Stable Symbol ID形式
- namespaceや型Rename時のID扱い
- partial classの識別方法
- Catalog Schema Versionの運用方法

### 生成Trigger

- Incremental生成を行うか、毎回全生成するか
- Unity Editorから手動生成するか
- 保存時に自動生成するか
- Build前に生成するか
- CIで生成するか
- 複数Triggerを併用する場合の正式な生成物Owner

### コメント・仕様書Reference

- 通常コメントをどこまで収集するか
- 仕様書Reference検出規則
- 仕様書パスの正規化方法
- Source File単位とSymbol単位のReferenceをどう区別するか

### Evidence

- placeholder判定の具体条件
- 空Method判定の具体条件
- `NotSupportedException`等をどこまで未対応Evidenceへ含めるか
- Obsolete／Deprecated情報の表示粒度

### Test

- Testと対象Class／Symbolの関連付け方法
- 名前一致によるCandidateと明示的関連をどう区別するか
- EditMode／PlayModeの分類取得方法

### Assembly・分類

- Assembly分類方法
- asmdefが存在しないコードの扱い
- Project Summaryの分類粒度
- namespace／folder／Assemblyをどの順に優先するか

### Asset・Parameter

- ScriptableObject Asset実値をいつ対象にするか
- Asset／Data Catalogを別ページとして作成するか
- Tuning Parameter Candidate用の追加Metadataをどこまで持つか
- Runtime状態らしさ等の推定MetadataをCatalogへ持たせるか

### Git・履歴

- 生成物をGit管理するか
- Catalogの差分履歴を保存するか
- Working TreeがDirtyな場合のSnapshot表現
- Catalog生成物の鮮度をCIで強制するか

---

## 関連仕様

| 内容 | 関連ページ |
| --- | --- |
| 共通技術カテゴリ全体 | [共通技術](/spec/common-technology/) |
| MusicChart制作・確認用Editorツール | [MusicChart制作・確認ツール仕様](/spec/common-technology/music-chart-workbench) |
| Planner調整Parameter／Excel管理 | [Planner調整Parameter管理・Excel連携仕様](/spec/common-technology/planner-tuning-parameter) |

Project Code Catalogは、
コード上に存在する構造とEvidenceを機械収集するページです。

[Planner調整Parameter管理・Excel連携仕様](/spec/common-technology/planner-tuning-parameter)では、
Catalog等から得られた候補の中から、
ProgrammerがPlannerへ公開してよいParameterを明示し、
Valueの編集・Excel Export／Import・Validation・Diff／Conflict処理を管理します。

---

## 関連タスク

<PageRelations />
