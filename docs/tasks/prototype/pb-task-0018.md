---
title: Battle開始・共通接続の最小実装
description: 検証用Battleの共通ID、準備・開始、共有型とFake、assembly／テスト構成を最初に実装し、後続タスクが同じ接続口から着手できる状態を作ります。
pageType: task
taskId: PB-TASK-0018
category: プロトタイプ
order: 10
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/game/
  - /spec/bgm/bgm-gameplay-connection
  - /spec/common-technology/action-state-manage
---

# PB-TASK-0018｜Battle開始・共通接続の最小実装

## 目的と実現する動作

検証用Battleで共通IDと準備完了を管理し、他の機能が仮の接続先を使って実装を始められる入口を作ります。既存PB-TASK-0018をこの最初の単位へ絞り、結果・cleanup・Retryは別タスクへ分割します。

今回のプロトタイプ実装では本タスクだけを先に正式着手します。本タスクの共通契約とassembly／テスト構成がレビュー済みCommitとして引き渡されるまで、PB-TASK-0023・0027〜0046は仕様確認・既存コード調査・機能内部の設計に留め、独自の共有型を使う実装を開始しません。

枠1の最初の実装単位です。仕様表の作成を提出物にはしません。共通仕様のP01〜P05は技術提案として参照し、未実装のAPIを既存APIと表記しないでください。

## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C01〜C03・C19、Q01・Q03〜Q06の初回接続境界。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠1（Battle／共通接続）の実装担当。担当決定済み。個人の割当は非公開のチーム管理で扱う。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。以下は初回計画で、「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は当時の作成先の提案です。追加済みの実装・採用方式・公開状況は[引渡し記録](#handoff)で確認し、同じ入口を再作成しません。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Scenes/PrototypeBattle.unity` | 共有の統合Scene。既存PlayerDevelopmentとは別に設ける |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Contracts/` | Battle ID、要求・結果・通知など、他assemblyから参照する共有型と専用asmdef |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Battle/` | GameのBattle状態、開始集約、Fake Ownerとテスト可能なRuntime assembly |
| 新規 | `Assets/PaletteBullet/Prototype/Tests/Editor/`、`Assets/PaletteBullet/Prototype/Tests/Runtime/` | EditMode／PlayMode用のtest asmdefと最小試験 |
| 参照 | [Assets/PaletteBullet/Player/Runtime/PlayerBattleHost.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerBattleHost.cs) | 既存Hostの入口を確認する。実Playerへの変更はPB-TASK-0036 |
| 既存／変更 | `Assets/PaletteBullet/Player/Runtime/PaletteBullet.PlayerVS.asmdef` | PlayerからPrototype Contractsを一方向参照できるようにする。実Player接続はPB-TASK-0036 |
| 参照 | `Assets/Scripts/MusicChart/` | 現在は定義済みasmdefがない領域。ContractsとのAdapterを置くassembly境界を決める |

## 実装範囲

- GameがBattle IDを一度発行し、必須Ownerへ渡す。Prepare、Ready待ち、Running、Pause、終了受付を区別する。Readyの追加・解除・失敗をOwner単位で扱い、開始を一度だけ通知する。
- 型付きC#の要求・結果・通知と、読取用データの最小の骨組みを実装する。Battle IDは現行Playerと接続できるstringとし、PlayerTokenのactor／generation／runを置き換えない。音楽occurrenceはBattle・Chart・定義・loopを区別し、表示コードをキーにしない。個体ID、作用ID、成功／拒否／失敗と理由も境界で共有する。
- 各枠が必要とするPrepare／開始／Pause／終了の入口、音楽位置参照、予約要求・消費確定、RGB候補の型を、Fakeでコンパイル・呼出しできる最小単位で渡す。全機能の内部状態を収めた巨大な共通型や新しい汎用フレームワークは作らない。
- 共有契約を独立したContracts assemblyへ置き、Player側assemblyからPrototype側へはContractsだけを明示参照する。既存のVisual ScriptingやInput System等への参照は維持する。ContractsおよびPlayer側assemblyから、asmdefのない既定`Assembly-CSharp`へ参照しない。現在`Assembly-CSharp`側にあるMusicChart等との接続は、既定assembly側のAdapterからContractsを利用するか、先に対象を独立assemblyへ分けるかを本タスクのPRで決め、後続が同じ方向を使えるようにする。循環参照を作らない。
- Battle RuntimeとContractsを参照できるEditor／Runtimeのtest asmdefを用意し、`TestAssemblies`参照を含める。後続の自動試験対象は参照可能なRuntime assemblyへ置き、既定`Assembly-CSharp`にしか存在しない実装をtest asmdefから直接参照する前提にしない。
- 正確な公開assembly・namespace・型・メンバー名、値の型・単位・有効期間、変更Owner、呼出し順をソースと呼出し例で対応付ける。PRにはそのパスとCommitを記録する。これは既に決まった接続の意味をコード化する作業であり、新しいゲーム仕様表の作成ではない。ゲーム上の意味が不足している場合は独自判断で確定せず仕様判断窓口へ返す。
- frameとPhysics Stepを区別する。段階1で必要な「有効Charge commit→自然破裂」「Enemy RGB確定→Stage→Game」の呼出し境界を用意し、Componentの偶然の更新順へ依存させない。音楽の受付締切を越えたChargeを後から成功にしない。
- 準備失敗はD03に従って開始を閉じ、機能・段階・理由と再起動案内を最小UIへ表示する。応答待ちの診断はGameplay時計から独立させ、待機上限は設定可能な検証値として扱う。期限切れを成功に変えない。
- 最初の引渡しは、この境界型・Fake・Sceneと開始確認に加え、Player／MusicChart／テストを含むassembly参照図、最小のEditMode／PlayMode試験が通り、レビュー済みCommitを記録した時点で行う。結果画面や実音楽の完成を待たせない。

今回の範囲外：実Player・音楽・攻撃の中身、完成版HUD、結果／cleanup／Retryの実装（PB-TASK-0027・0028）、新規ツール制作。

## 依存と受け渡し

先行タスク：なし。

後続タスクは、本タスクの公開型・Fake・呼出し例、assembly参照構成がレビュー済みCommitとして渡された時点で正式着手できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。段階1の通常攻撃経路は[PB-TASK-0045](/tasks/prototype/pb-task-0045)、終了・Result・RetryとWindows短時間確認は[PB-TASK-0046](/tasks/prototype/pb-task-0046)で実物接続を確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Game → 各枠 | Battle ID、採用設定参照、Prepare／開始／Pause／終了の要求と結果型 |
| 各枠 → Game／Combatの集約 | Owner IDとBattle IDを伴うReady・解除・失敗・終了応答。個別機能の数え方は各Ownerが所有 |
| 後続全タスク | 同じ型を使うFake実装と呼出し例。予約と生成成功の境界はPB-TASK-0042で実体化 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 最後の必須Readyを保留する | Battle・入力・音楽が開始しない。未ReadyのOwnerが表示される |
| Readyを解除してから復帰し、同じReadyを再送する | 全条件が揃った時に一度だけ開始し、重複で水増ししない |
| 準備失敗後にReadyと再開要求を送る | 失敗理由と再起動案内を保ち、開始・再開しない |
| 旧Battle IDの通知を送る | 現在Battleに変化がなく、拒否理由を追える |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

開始gateとID／重複／失敗のEditMode試験、Fake OwnerによるPlayMode確認。RuntimeからEditor APIを参照しないこと、Player側assemblyからContractsを参照できること、Contractsとtest asmdefが`Assembly-CSharp`を参照せずコンパイルできることを確認する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：[第1段階 #46](https://github.com/pushpush-ehime/Palette-Bullet/pull/46)（マージ済み）。2-A〜2-Cの累積PRは未作成。最新版と正式引渡しの状態は[下記](#handoff)。
- [プロトタイプタスク一覧](/tasks/prototype/)

## 共通接続の実装版と引渡し {#handoff}

2026-09-11時点。第1段階のmain反映と、0018全体の共通契約の引渡しを分けて記録します。**2-A〜2-Cのローカル候補は検証・独立監査を通過しましたが、未公開・未統合です。後続タスクの正式着手gateはまだ開いていません。** Notionの進捗は変更していません。

| 版 | Commit／公開状況 | 確認できる範囲 |
|---|---|---|
| 第1段階のレビュー済みHEAD | [eb69210da7e8252054c9e5c39685e479c4c72479](https://github.com/pushpush-ehime/Palette-Bullet/commit/eb69210da7e8252054c9e5c39685e479c4c72479)、[PR #46](https://github.com/pushpush-ehime/Palette-Bullet/pull/46) | Prepare／Ready・解除・失敗、開始、Pause／Resume、終了受付、5 Fake Owner、保存Scene、基本Contracts／assembly・試験構成 |
| 第1段階のmerge Commit | [0f46026b58ad938e1805713c44ea67012438c322](https://github.com/pushpush-ehime/Palette-Bullet/commit/0f46026b58ad938e1805713c44ea67012438c322) | 2026-09-11に通常merge。第1段階だけで0018全体の完了にはしない |
| 第2段階の監査済み累積候補 | `1d145b792aa82ddd23fc8685a9e92d5e34c57c07`、tree `7051df9b35745d023aa6d90764d79f6a62e699c1` | 2-Aの固定音楽参照／Binding、2-Bの予約・準備・一度の消費、2-CのFrame／RGB固定順とFake、共通APIの送受信例。独立最終監査合格、2件の指摘を修正済み、追加指摘なし。正式Unity証拠とソース・ガイド例の一致を独立照合済み |

第2段階のCommitはGitHubへ未公開のため、存在しないCommit・ファイルURLは掲載しません。公開承認待ちであり、外部公開・CI・main統合を完了した記録ではありません。正式に配布するレビュー済み引渡しCommitとmerge Commitは、公開後に別々に登録します。

候補内の入口はゲームRepository相対パスで次のとおりです。実API・単位・寿命・Owner・呼出し順・C#例は `Docs/Prototype/CONNECTIONS.md`、段階別の操作と検証範囲は `PHASE1.md`〜`PHASE2C.md` にあります。第1段階だけの公開ガイドは[PHASE1.md](https://github.com/pushpush-ehime/Palette-Bullet/blob/eb69210da7e8252054c9e5c39685e479c4c72479/Docs/Prototype/PHASE1.md)です。

| 接続口 | 候補内の実装 | 後続の実物接続 |
|---|---|---|
| 音楽位置・固定定義・occurrence | `Assets/PaletteBullet/Prototype/Runtime/Contracts/MusicReferences.cs`、`Runtime/Music/`、`Assets/Scripts/PrototypeConnections/` | 0030のAudio同期、0031のCurrent／Weak検索・境界配送。明示順の音楽的採用は曲別に判断 |
| 予約・Entry準備・消費確定 | `Runtime/Contracts/AttackTransactions.cs`、`Runtime/Fakes/FakeAttackPipeline.cs`、`FakeEmissionPreparation.cs`（`Runtime/`は上のPrototype配下） | 0033／0039の実個体・Allocation、0042／0043の発射・変換・弾・音。準備Readyだけでは発射しない |
| Frame／Step・RGB事実・結果転送 | `Runtime/Contracts/BattleFrames.cs`、`Runtime/Battle/BattleFrameCoordinator.cs`、`Runtime/Fakes/FakeEnemyRgbFrame.cs` | 0044のRGB演算と浄化、0029のStage、0027のCombat／Game結果。調整役が数・RGB・勝敗を再判定しない |
| 共通構成・実行例 | `Prototype/Scenes/PrototypeBattle.unity`、`Prototype/Tests/Editor/`・`Tests/Runtime/`（`Assets/PaletteBullet/`配下） | 保存Sceneの明示操作は論理Frame／Stepシミュレーション。実Player接続は0036、通し実接続は0045／0046 |

採用されたD03拡張、固定snapshot／Binding、assembly A案、同期要求とFrame保持の詳細は[共通接続追記](/spec/common-technology/feature-connections#provided-common-connections)を正本とします。Contracts・Player・test asmdefからAssembly-CSharpへの参照、循環、Runtime→Editor依存を作らない構成です。Playerの変更はContracts参照の追加だけで、実Player APIは未接続です。

## 実装・成果記録

### 2026-09-11｜第1段階（main反映）

- できるようになったこと：検証用Sceneで必須Readyの保留・解除・再送、開始一回性、Pause／Resume、準備失敗・旧Battle拒否・終了受付を確認できる共通入口ができました。
- 実装・制作方法：Gameの集約、Owner別Fake、独立Contracts／RuntimeとEditor／Runtimeテスト構成を追加しました。開始通知、3時計の開始、pre-roll後のAudio開始表示を区別しています。
- 成果物：[PR #46](https://github.com/pushpush-ehime/Palette-Bullet/pull/46)、レビュー済みHEAD `eb69210da7e8252054c9e5c39685e479c4c72479`、merge Commit `0f46026b58ad938e1805713c44ea67012438c322`。公開ガイドは[PHASE1.md](https://github.com/pushpush-ehime/Palette-Bullet/blob/eb69210da7e8252054c9e5c39685e479c4c72479/Docs/Prototype/PHASE1.md)。
- 確認した操作・テスト・版と結果：上記HEADの独立監査とPRの必須CI 2件の成功を確認して2026-09-11に通常mergeしました。下の第2段階の518件を、この旧HEADの実行結果として転記しません。
- 実接続／Fake：Game状態・gate・時計制御・保存Scene／共通型は実装。Stage・Supply・Player・Music・CombatはFake。Audio開始表示は実再生ではありません。
- 制限・残作業・対象外：第1段階だけでは0018の全共通契約・正式引渡し条件を満たしません。実Player、音楽、攻撃、Enemy、結果／Retryは後続です。

### 2026-09-11｜第2段階2-A〜2-C（ローカル検証・独立監査済み）

- できるようになったこと：実Chartから固定参照を作り、同期予約→未公開準備→明示的な一度の消費→RGB候補→Enemy・Stage・Game入口まで、同じ公開型とFakeで検証できます。Pauseでは元Frameの状態を保持し、明示Closeで未完了部分だけ続けます。
- 実装・制作方法：既定assembly側Adapterと明示Note順序Bindingを採用し、Runtime／Contractsを分離しました。最初の要求内容・処理中状態を同期callback前に所有し、予約commit直前に元Frame／Pause世代を再検証します。RGBの最終重複台帳はEnemyが所有します。
- 成果物：ローカル固定Commit `1d145b792aa82ddd23fc8685a9e92d5e34c57c07`。共通API・呼出し例はゲームの `Docs/Prototype/CONNECTIONS.md`、段階ガイドは `PHASE2A.md`〜`PHASE2C.md`。未公開のためリンクは未掲載です。[引渡し記録](#handoff)で公開状況を分けて管理します。
- 確認した操作・テスト・版と結果：同Commit、Unity 6000.3.16f1でEditMode 425件／PlayMode 93件、計518件が成功し失敗・skipは0。保存Scene／Binding再読込、実Chart参照を使った公開操作、Player回帰を含み、646追跡ソースの実行前後が一致しました。C#送受信例コンパイルとRepository差分監査も成功。独立最終監査では既存pure C# 258件・独立133 probesが全成功し、正式証拠・ソース・例の一致を確認、追加指摘なしです。これら独立試験をUnity518件へ加算しません。
- 実接続／Fake：固定Chart／定義／位置読取、共通受付・ID・順序・所有の境界は実装。Current／Weak選択、供給・Target・準備候補・Shot・Enemy結果・Stage Clear候補・Game評価はFake。実Audio・弾・RGB演算・勝敗には接続していません。
- 制限・残作業・対象外：未公開・未統合で正式引渡し前です。人間の初見操作・物理入力・UI目視・聴感、実PlayerLoop／Physics統合、Windows配布Build、GitHub CIは未確認。Fakeの成功を0045／0046の実接続合格やNotionの完了状態にはしません。
