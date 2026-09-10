---
title: "Player Action／State基盤（Unity Visual Scripting）"
description: "採用済みの標準Unity Visual ScriptingによるPlayerの状態管理、保存グラフとC#の編集、終了処理、Game・Combatへの接続範囲を定義する"
pageType: spec
category: "共通技術"
status: 確定
relatedTasks: []
---

# Player Action／State基盤（Unity Visual Scripting）

## 目的と採用状況 {#current-foundation}

PlayerのAction／Stateは、**標準Unity Visual Scriptingの保存済みState Graph／Script Graph**で開発します。グラフが状態・遷移・条件・呼び出す動作を定義し、C#が移動、観測、資源の所有・停止、外部Systemとの接続を実装します。

本ページの「確定」は、この技術方式と提供済み基盤の利用契約を採用していることを示します。各Actionの本番機能、本体Game／Battle／Combatとの接続、プロトタイプ全体の完成を意味しません。

| 項目 | 基準 |
|---|---|
| ゲーム本体の基盤引き渡しmain | `55d050ad9760b27bb61415a0f7d2324ee9a50bec` |
| Unity | `6000.3.16f1` |
| 使用package | Visual Scripting `1.9.11`、Input System `1.19.0`。この仕様変更で更新しない |
| 提供済み | 保存グラフ24件、移動・Jump・Dash・Animator、六班の接続雛形、C#動作の追加口、診断・検証資料の出力 |
| 今後の実装 | 雛形から先のGameplay機能と、本体Game／Battle／Combat等への接続 |

基盤統合時の自動検証結果と、その結果が保証する範囲は[プロトタイプ共通仕様の基盤引き渡し](/spec/game/prototype#foundation-baseline)を参照します。後続の実装・受入では、実際に使用したCommit SHAを記録します。

## 仕様の役割と参照先 {#sources}

| 決める内容 | 正本・参照先 |
|---|---|
| 今回必須の機能、段階、Windows配布受入 | [プロトタイプ共通仕様](/spec/game/prototype#completion-policy) |
| PlayerのGameplay上のState構造 | [Player状態](/spec/player/states) |
| Action間の遷移可否、キャンセル、先行入力 | [Playerアクション遷移](/spec/player/player-action-transitions) |
| 個別Action、Charge、発射、Damageの意味 | 各[Player仕様](/spec/player/)、[チャージシステム](/spec/draw-system/)、[戦闘仕様](/spec/combat/) |
| チームが使う開発基盤の入口・提供範囲 | [開発基盤ガイド][development] |
| Playerの技術契約と実装根拠 | [Player VS SPEC][vs-spec]、同じコミットの保存グラフ・C# |
| グラフ編集、六班の接続例、C#追加の詳細手順 | [Player VS AUTHORING][authoring] |
| 診断、実行記録、保存ソースと検証資料の対応 | [Player VS AUDIT][audit] |

本ページは、採用済み基盤をWeb仕様書から使うための技術上の入口です。各Actionの数値、攻撃の計算式、Mode／Conductの効果を重複定義しません。実装方式の変更を理由にGameplay仕様を暗黙に変更しないでください。既知の食い違いは[既存仕様との対応](#existing-spec-differences)で区別します。

`SPEC.md`冒頭や`HANDOFF.md`の履歴部分には、初期実装時の「main未統合」「未実施」等が残っています。現在の引き渡し状態は[開発基盤ガイド][development]と上記の基盤引き渡しを参照し、過去のcheckpointを現在の未完了タスクに戻しません。

## 最初に開く場所 {#entry-points}

1. 指定されたmainをUnity `6000.3.16f1`で開く。
2. `Palette Bullet > Player > 開発Sceneを開く`を選ぶ。
3. 共通のAction排他関係は`Actionの遷移図を開く`、担当機能はProjectの`Player/Graphs`以下から開く。
4. 実行状態やエラーを調べる場合は`詳細 > 実行状態・エラーを確認`を使う。

以下のパスは、ゲーム本体の`Assets/PaletteBullet/Player/`を基準とします。

| 対象 | 編集・参照場所 | 用途 |
|---|---|---|
| 常設開発Scene | `Scenes/PlayerDevelopment.unity` | 実Playerと開発用Game操作の確認 |
| Player Prefab | `Prefabs/Player.prefab` | Component、モデル、Animator、参照の構成 |
| Rootグラフ | `Graphs/Player.asset` | Player全体と入れ子のState構成 |
| 共通Actionグラフ | `Graphs/Shared/Action.asset` | Actionの排他、遷移、先行入力の接続 |
| 各機能のグラフ | `Graphs/Movement`等の六班フォルダ | 状態、線、条件、動作、引数 |
| 共通C# | `Runtime/` | Session、Body、Input、Game接続、動作と観測 |
| 数値・要求順序 | `Settings/Movement.asset`、`Settings/DispatchPolicy.asset`、担当グラフの引数 | 既存の保存値と要求処理設定 |

開発Sceneには、Game側の代役であるDevelopment Game seamがあります。ここでの開始・終了・Retryの成功を、本体Gameとの接続完了には数えません。

グラフは標準VSエディターで編集します。Stateや遷移をダブルクリックして内部へ入り、パンくずで戻ります。保存グラフそのものが実行元であり、Play時にC#から再生成しません。操作の詳細は[AUTHORINGの編集手順][authoring]を参照します。

::: tip Prefabの設定を維持する
標準`StateMachine`の有効チェックがOFFなのは意図した設定です。`PlayerSession`が標準VSグラフのStart／Stopを管理します。また、モデルのAnimatorは自動更新とRoot Motionを使わず、`PlayerBody`が共有時計で更新します。通常の初回起動でこれらを有効化し直さないでください。
:::

## 状態と処理の所有 {#ownership}

Playerごとに、一つのSessionと標準VS StateMachineを使います。六班のフォルダは編集範囲の分割です。班ごとに別のPlayer用StateMachine、Input管理、移動Motor、HP管理を追加する構成にはしません。

```text
Playerの標準VS StateMachine
└─ Root
   ├─ Gameplay
   │  ├─ Movement
   │  ├─ Action
   │  ├─ Aim
   │  └─ Reaction
   ├─ Conversation
   ├─ Interacting
   └─ Dead
```

Gameplay内ではMovement／Action／Aim／Reactionが並列に動き、Action領域内のActionは排他です。個別Stateの意味と遷移可否は[Player状態](/spec/player/states)と[Playerアクション遷移](/spec/player/player-action-transitions)に従います。Conversation等の雛形があることだけを理由に、今回のプロトタイプ必須機能には追加しません。

| 対象 | 所有・責務 |
|---|---|
| 状態と遷移 | 保存済みVSグラフ。C#側へ別の遷移表を隠して持たせない |
| Session・操作の寿命 | `PlayerSession`。通知の受付、共通時計、実行単位、停止を管理する |
| 入力 | 既存の`PlayerInput`とInput Actions。担当機能が別の入力読取りループを持たない |
| 物理移動・Animator | `PlayerBody`。CharacterControllerへの物理反映とAnimator時間を一元化する |
| HP・スタミナ | `PlayerSession`。Combat等の接続先と値の所有を重複させない |
| 要求の一時保持 | `PlayerRequests`。保持・再評価を保存グラフから使う |
| 実行状態の表示 | 標準VSの実行インスタンスを観測する。最後に記録したState名だけから現在状態を推定しない |

## 開始・遷移・先行入力 {#transitions}

遷移グラフの基本形は次のとおりです。

```text
Custom Event
  → 条件に使う値の計算
  → Player Condition
  → Trace And Trigger Transition
```

開始条件は、現在のActionを終了したり、移動や費用などの副作用を発生させたりする前に確認します。開始を拒否した場合は現在のActionと資源を維持します。費用は受理された開始でのみ反映します。`Trace And Trigger Transition`は標準VSの遷移を実行・記録し、観測側で別の遷移判断を作りません。

要求は共通のキューと`DispatchPolicy.asset`に従って処理します。強制イベントが通常入力より先です。通常Action要求は同じ順位で、Input Systemの時刻、同時刻なら到着順に処理します。Parry／Dash／Charge／Markerの種類だけで恒久的な優先順位を追加しません。

先行入力は既存の保持口を使います。現在の共通グラフは、許可されたActionの1件保持とAimの別保持、正常Dash終了時のAim→Action再評価、Jump／落下／被弾／Root終了時の破棄を扱います。詳細条件は[遷移仕様](/spec/player/player-action-transitions)を参照します。雛形に入っている受付時刻や保持時間は、本番Actionの数値を確定した根拠にはしません。

## C#動作と終了処理 {#operations}

各担当は、グラフから呼べるpublicメソッドとしてC#動作を実装できます。状態の入場でBegin、継続処理は`Player.Tick`または共通Operation、退場でStopを接続します。

既存の例は`Runtime/DirectionalMove.cs`と`Examples/TurnOverTime.cs`です。共通APIは次の形です。

```csharp
RunOperation(channel, duration, tick, cleanup, completedEvent, cost, prepare)
```

| 引数・処理 | 契約 |
|---|---|
| `channel` | その動作が占有する資源名。例：移動は既存の`Horizontal`。Action登録用の中央Registryではない |
| `prepare`・`cost` | 失敗する可能性のある準備も停止対象として所有する。準備成功後に費用を確定する |
| `tick`・`duration` | 共通のGameplay時計で進める。最終frameの時間は残り時間に制限される |
| `cleanup` | 移動、購読、外部処理などを解放する。成功報酬や攻撃成立の処理を置かない |
| `completedEvent` | 正常終了候補を通知する。被弾・終了・取消で無効になる場合があるため、受理された完了側でGameplay結果を反映する |

現行実装の`HitStop` boolは入力拒否・Tick停止を行います。今回決めた[Parry Slow](/spec/player/player-action-parry#parry-slow)は任意のPlayer局所減速であり、このboolで実装済みとは扱いません。音楽・Modeの全体時計とPlayer局所時間の分離が後続に必要です。接続全体は[機能間の共通ルール](./feature-connections)を参照します。

基盤の検証用PauseとHitStopは既存の入力・時計の制御に従います。独自の`Update`、`Wait`、Coroutineを追加しただけでは、PlayerのPause／HitStopに追従する保証はありません。外部Componentを使う場合も、共通時計・取消・購読解除に接続します。

正常完了、中断、Game終了、Faultを区別します。Stopは一つの解放失敗で残りを省略せず、所有した処理の解放を試みてエラーを保持します。必須cleanupの失敗が記録されたactorは、後でStopが成功したように見えてもResult／Retryを解禁しません。

非同期処理の通知には、開始時の`PlayerToken`を保持して渡します。TokenはBattle、generation、actor、channel、runを区別します。古い処理の結果に現在のTokenを付け直してはいけません。既存の`session.Enqueue(eventName, token, payload)`を使い、古いBattle／実行単位の通知を拒否できるようにします。

### C#を追加してグラフへ接続する手順

1. Playを停止し、担当C#へpublicメソッドを実装する。既存Examplesのassembly内での追加例は[AUTHORING][authoring]を参照する。
2. 必要なComponentと参照をPrefabへ設定する。共有Prefabの変更は統合窓口で確認する。
3. 新しい型を初めて公開するときは、標準VSのNode Library／Type Optionsへ追加し、`詳細 > C#ノードの検索一覧を更新`を実行する。
4. 担当グラフにメソッド呼出し、開始条件、正常完了、Stopを接続し、グラフと関連アセットを保存する。
5. 開始成功・開始拒否・中断・終了を操作して確認し、コード・グラフ・必要な参照変更をPRへまとめる。

既存ノードの数値や接続線を編集するたびに、検索一覧の再生成や手書きRegistryの更新は必要ありません。

## 六班の提供範囲と実装先 {#feature-scope}

以下は基盤の引き渡し範囲です。**「未実装」の全項目を今回の必須タスクにする表ではありません。** 採用する機能は[プロトタイプ共通仕様](/spec/game/prototype#completion-policy)から選びます。

| 班・編集先 | 提供済みの実装・雛形 | 本番機能として別途実装・接続する部分 |
|---|---|---|
| Movement：`Graphs/Movement`、`Settings/Movement.asset` | Move／Jump／Dash、Burst／Run、開始拒否、費用、壁・落下・勢い、単一Body／Animator | Gameplayに合わせた調整、本番モデル・Animationの接続。現行Dashと旧説明の差は後述 |
| Aim／Marker：`Graphs/AimMarker`、`Runtime/PlayerTargetInfo.cs` | Aim、Markerのタイマー・排他・停止の雛形。Aim解除後も進行中Markerを継続する | 実カメラ・照準、発射Event時の狙点と武器位置の取得、対象探索、Projectile生成・寿命 |
| Charge：`Graphs/Charge` | Click／Dragのタイマー・排他・中断、Jump時のAction維持 | 実際の選択、Charge成立、Allocation／Reservedとの接続、攻撃経路への受け渡し |
| Parry：`Graphs/Parry` | 接地・Reaction・費用の開始条件、受付タイマー、停止 | 実Combatの成功判定、報酬・万能変換、再受付窓、任意のParry Slow |
| Damage／Status：`Graphs/DamageStatus` | HP・スタミナ所有、Reaction／Dead、被弾候補と成立通知の区別 | 実CombatのDamage算出、被弾分類、BigHit等との接続 |
| Interaction：`Graphs/Interaction` | 接地・Reactionの開始条件、空中要求の拒否、Conversation／Interactingの停止・被弾差 | 対象物、会話UI、実際のInteraction処理。今回の採否はプロトタイプ仕様に従う |

`Input.*`等の既存入力と、`Example.Marker`、`Example.ClickCharge`、`Example.DragCharge`、`Example.Parry`等の開発用通知は区別します。`Example.*`のタイマーが完了しても、発射・Charge・Parry本番機能が完成したことにはなりません。正確なグラフ名、通知、Stop、共有参照は[AUTHORINGの六班表][authoring]を参照します。

Markerは開始時に発射用の狙点を固定しません。本番の発射Event時に、その時点のカメラの狙点と武器のワールド位置を一度に取得し、値をコピーしてProjectile側へ渡します。Aimを途中で解除した場合もこの取得が必要です。この接続は雛形では未実装です。Gameplay上の発射条件は[Marker Action](/spec/player/player-action-marker)と[Marker](/spec/combat/marker)を参照します。

## Game／Battle／Combatへの接続 {#game-connections}

| 接続 | 現在のPlayer側の受け口 | 接続時に守る境界 |
|---|---|---|
| Battle開始 | `PlayerBattleHost.BeginBattle()`、Player Prefabとspawn位置 | 本体Gameが生成と参照準備を取りまとめ、Ready条件を満たしてから開始する。実カメラ等との接続も必要。開発Sceneの自動開始だけでは本体接続の確認にならない |
| Battle終了 | `FinalizeBattle(PlayerToken)` | Gameの確定結果を受けてPlayerを停止する。Player側の`ResultReady`はPlayerのcleanup条件であり、Battle全ownerの終了判定ではない |
| Retry | `RetryBattle(PlayerToken)` | 古いBattleからの通知を拒否し、必要な停止に成功してから新Player／Sessionを作る。引数なし版は現在actorを扱う開発UI向け |
| 被弾候補 | `Combat.SmallHitAttempt` | 現在の開発用候補通知は、Dash無敵の検査前にHP／Reactionを確定しない。完全なCombat判定APIではない |
| 判定済み被弾 | `Combat.SmallHit` | 成立済みの事実を渡す。未判定の攻撃衝突を直接ここへ流さない |
| HP・死亡 | `Status.SetHp` → `Status.Changed`、HPが0以下ならDead | HP所有を二重化しない。DeadをReactionより先に扱い、Game側の結果確定・Result画面とは分ける |
| 通常攻撃 | Charge雛形と外部の選択／Allocation／AttackEvent／Projectile／Enemy | 接続口の雛形はあるが、この経路の本番実装は未接続。受け渡すデータと成立条件は各Gameplay仕様から具体化する |

現在のHostは生成候補の子Objectも所有し、生成・初期化に失敗した場合の停止を扱います。本体接続でも、古い通知の拒否、部分生成の後始末、cleanup成功による解禁条件を保持します。Room移動を扱う場合は同じBattle／Session、Retryは新Battleとして区別します。Room移動の実装を今回の必須条件として追加するものではありません。

Game側の全Ready条件、全ownerの終了集約、Clear／Game Overの優先判定、Result画面への遷移は[ゲーム全体](/spec/game/)と既存の[Battle基盤タスク](/tasks/prototype/pb-task-0018)を参照します。Mode／Conductは[専用仕様](/spec/player/player-action-mode-change-and-conduct)を正本とし、固定プリセットの具体値をこの基盤ページで補いません。

## 担当と変更の進め方 {#team-workflow}

仕様の判断・仕様表・接続条件・完了条件の整理は仕様側が行い、プログラマー班はその仕様を読んでコード・保存グラフ・アセット接続を実装します。詳細は[プロトタイプの役割分担](/spec/game/prototype#first-milestone-owners)に従います。

| 役割 | 作業 |
|---|---|
| 各機能の実装担当 | 担当フォルダと必要なC#を実装し、受け渡しと動作を検証してPRを提出する |
| Player共有部分の統合窓口 | Scene、Prefab構成、Input、`Graphs/Player.asset`、`Graphs/Shared/Action.asset`、`Settings/DispatchPolicy.asset`の変更を取りまとめる |
| 仕様判断の窓口 | 不足・矛盾を判断して正本へ反映し、操作結果が仕様意図と合うか確認する |
| コードのPR確認・マージ担当 | 別途割り当てる。操作結果の確認担当と自動的に同一にはしない |

公開ページには役割を記載し、個人の割り当てはチーム内Notionで管理します。共有部分の担当個人は未確定です。`config/shared-assets.json`と担当決定を照合し、確定まではユーザー／Repository管理者へ共有変更の相談を集約します。通常攻撃の接続実装担当に、全共有アセットやマージ権限が自動的に付くわけではありません。

PRでは開始条件・費用、正常完了、被弾／Root終了時のStop、先行入力の再評価、共有参照の差分を確認します。プログラマーへ接続表の作成を前提の提出物として要求しません。仕様の不足を見つけた場合は、該当ページ・操作・実装箇所を仕様側へ報告します。

## 短い確認と検証記録 {#verification}

変更した機能に応じて、次の操作と結果を確認します。以下は確認手順であり、全担当の人間受入が済んだという記録ではありません。

| 操作 | 期待結果 |
|---|---|
| 開発SceneをPlayし、Game画面へフォーカスしてWASD・Shift・Spaceを操作する | 移動・Dash・Jumpが既存条件に従って動き、実行状態を確認できる |
| 担当グラフの値を変更・保存して再読込みし、同じ操作を行う | 保存した値が実行に反映される。確認後は意図した値を保存する |
| 開始条件を満たさない状況でActionを要求する | 開始を拒否し、元のActionや資源に開始副作用を残さない |
| 動作途中にPause／HitStop、被弾、終了を発生させる | 各時計・入力・中断条件に従い、終了後に古い完了通知や成功効果が混入しない |
| 開発用Endの後にRetryする | 必須cleanup成功後に新しいPlayerを生成し、旧Battleの通知を受理しない |
| 本体へ接続した通常攻撃を操作する | [段階1の操作と期待結果](/spec/game/prototype#prototype-milestones)に沿って、実Chargeから浄化まで確認できる |

開発SceneのF8終了／F9 Retry、被弾・HitStopボタン等は接続確認用です。プロトタイプの通常操作やWindows配布受入には、本体Game側の操作を使います。自動入力試験、Editorでの人間操作、Windows実行ファイルでの受入は別々に記録します。

エラー報告には、Commit SHA、Unity版、Scene、変更したコード／グラフ／アセット、操作手順、期待結果と実際の結果、Consoleのエラーを添えます。必要に応じて`詳細 > 実行状態・エラーを確認`から実行記録を確認し、`詳細 > 監査資料を出力`を使います。

正式なScene・Prefab・グラフ・設定を保存してからPlay／Build／資料出力を行います。資料出力は未保存の正式ソースを勝手に保存せず、`UNSAVED_*`等の診断で拒否します。保存元、依存関係、Commit・hash、同じソースでの試験記録を対応付ける詳細は[AUDIT][audit]を参照します。

変更範囲に必要な試験とPRのCIを実施します。基盤の既存合格結果は参照できますが、新しいGameplay接続の合格証拠には読み替えません。また、基盤全体の再監査を各担当の着手前作業として繰り返し要求しません。既存の作業コピー・キャッシュ・検証記録は保持します。

## 既存仕様との対応と未決事項 {#existing-spec-differences}

### 採用済みの変更と文書の食い違い

| 対象・根拠 | 現在の扱い |
|---|---|
| 旧Palette State Graph、Production Semantic Graph、Compiler／IR、旧Runtime | 標準VSへ移行済み。独自Runtimeの導入や移行作業を新規タスクとして再発行しない。廃止の根拠は[RETIREMENT][retirement]。旧本文は[Gitの過去版][old-page]で参照できる |
| [Dash仕様「Dash継続Phase」の「Move入力がない場合」](/spec/player/player-action-dash#dash継続phase)と[Player状態のDashing行](/spec/player/states#playerアクション・ステート・遷移ルール) | Web側にはMove入力なしで移動しない説明が残る。一方、採用済み基盤はShift Holdで直前のDash方向へ移動を継続し、Move入力があれば方向を更新する。[SPECのShift単独継続][vs-spec]と[PlayerMotionActions.BeginRunの実装][motion-source]が根拠。現行基盤を旧説明へ戻さず、Gameplayページ側の説明同期を残作業として扱う |
| [Gameplay Runtime TraceのPlayer節](/spec/common-technology/gameplay-runtime-trace#player-action-state-graph基盤) | 旧Context transaction、winning Rule、Command等をそのまま現行Playerの提供項目とは扱わない。現行の観測・journalを使い、全System共通のID相関やTimelineとの対応は別途接続する |

Playerのjournalは順序・Gameplay時刻・Battle／actor／generation／run・イベント・内容などを記録し、状態表示は標準VSの実行インスタンスを参照します。これを全Gameplay Runtime Trace、全AttackEvent→Projectile→Damageの相関追跡の完成と表記しません。Trace側も、観測のためにGuardを再実行したり独自のState判断を追加したりしません。

### 後続で決めること

- 各機能の主担当・確認担当、共有アセットの担当、PR確認・マージ担当（未確定）
- 本体Game／Combat／Chargeとの未接続部分について、実装タスクごとのデータ受け渡しと接続確認の分担（未確定）
- 段階1で使う検証用Scene・MusicChart・Enemy・仮パラメータ、および固定プリセット版Mode／Conductの具体内容（未確定）

これらは仕様側で決定し、各正本と既存タスクへ反映します。基盤のタイマー例や未実装一覧でゲーム仕様・担当者・期限を埋めません。

[development]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/DEVELOPMENT.md
[vs-spec]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/PlayerVS/SPEC.md
[authoring]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/PlayerVS/AUTHORING.md
[audit]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/PlayerVS/AUDIT.md
[retirement]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/PlayerVS/RETIREMENT.md
[motion-source]: https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerMotionActions.cs#L21-L27
[old-page]: https://github.com/pushpush-ehime/palette-bullet-docs/blob/e39b3738ab752bdde7fd4f039d78af986f26a7b9/docs/spec/common-technology/action-state-manage.md
