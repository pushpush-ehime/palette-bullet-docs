---
title: プロトタイプBattle開始・結果確定・Result・Retry基盤
description: Fake Adapterを使用してBattle ID、Ready gate、結果確定、cleanup、Result操作解禁、Retryを独立して検証できるlifecycle基盤を実装する
pageType: task
taskId: PB-TASK-0018
category: ゲーム全体
order: 20
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/game/
  - /spec/combat/
  - /spec/stage/
  - /spec/ui/
---

# PB-TASK-0018｜プロトタイプBattle開始・結果確定・Result・Retry基盤

## タスクの目的

Player、Enemy、BGM、MusicChart、シャオンダマ等の実Gameplayを接続する前に、
プロトタイプBattle全体の開始・結果確定・cleanup・Result・Retry契約を独立して実装します。

本タスクでは、Fake Adapterまたは同等の検証用Ownerを使用し、
各実システムが未実装でも次を確認できる状態を作ります。

- 新しいBattle IDを発行してBattle準備を開始する
- 必要なReady条件を集約する
- Clear候補とGame Over候補を同一フレーム単位で評価する
- 最終Battle結果を1回だけ確定する
- Result表示開始と操作解禁を分離する
- 必須Ownerのcleanup完了を集約する
- Retry時に新しいBattle IDでBattleを再構築する
- 旧Battleから遅れて届いた通知を拒否する

この基盤を後続のPlayer、Stage、Enemy、BGM、Combat、UI実装から利用できる境界として整備します。

## 完成時にできるようになること

- `PrototypeBattle`検証SceneからBattle lifecycleを開始できる
- Battleごとに新しいBattle IDを発行できる
- Fake OwnerのReady通知を集約し、必要条件が成立したときだけBattleを開始できる
- Clear候補だけが成立した場合にClearを確定できる
- Game Over候補だけが成立した場合にGame Overを確定できる
- 同一フレームにClear候補とGame Over候補が成立した場合にClearを確定できる
- 同じ候補や結果通知が重複しても二重確定しない
- Battle結果確定後にResultを表示開始し、cleanup完了まで操作をlockできる
- 必須Ownerのcleanup完了後だけResult操作を解禁できる
- Retryで新しいBattle IDを発行し、旧Battle状態を再利用せず再開できる
- Retry後に旧Battleから届くReady、候補、cleanup通知を拒否できる
- Windows Build上でも検証用Battle lifecycleを操作確認できる

## 関連する仕様

<PageRelations />

特に次を正本として実装してください。

- [プロトタイプ共通仕様・完成条件](/spec/game/prototype)
- [ゲーム全体](/spec/game/)
- [戦闘](/spec/combat/)
- [ステージ](/spec/stage/)
- [UI](/spec/ui/)

Player State、MusicChart、AttackEvent、Charge、Enemy Damage等の内部仕様は、
本タスクでは実装せず、それぞれの後続タスクへ委譲します。

## 実施内容

### 1. PrototypeBattle検証Sceneを作る

Battle lifecycleを独立して確認するため、`PrototypeBattle`検証Sceneを作成します。

具体的なPathは既存構成へ合わせて構いませんが、少なくとも次を満たしてください。

- 拠点やステージ選択を経由せず直接開始できる
- Battle Session Ownerを確認できる
- 現在のBattle IDとlifecycle状態を確認できる
- Fake OwnerのReady状態を確認できる
- Clear候補・Game Over候補を検証操作から発生させられる
- cleanup状態を確認できる
- Resultのvariantと操作lock状態を確認できる
- Retryを実行できる
- PB-TASK-0017で作成したWindows Build実行経路からBuildできる

検証Sceneは後続の実Gameplay統合Sceneとして拡張できる構造にしますが、
本タスクでは完成版のScene構成や最終表示を固定しません。

### 2. Battle Session Ownerを作る

現在のBattle lifecycleを所有する上位Ownerを実装します。

少なくとも次を管理します。

- 現在のBattle ID
- 現在のBattle lifecycle状態
- 必須Ready条件
- 受理済みClear候補
- 受理済みGame Over候補
- 最終Battle結果
- 必須cleanup Ownerと完了状態
- Result表示状態
- Result操作lock／unlock
- route決定済み状態

具体的なClass名、Component構成、Battle ID型、enum名は固定しません。

ただし、上記の所有権を複数のScene ObjectやUIへ分散させず、
現在Battleの正本を一意に判断できる構造にしてください。

### 3. Battle lifecycle状態を定義する

実装上の名前は固定しませんが、概念上、少なくとも次を区別します。

```text
未開始
↓
Battle準備中
↓
Ready待ち
↓
Battle中
↓
結果確定
↓
Result表示・操作lock
↓
Result操作可能
↓
route決定
↓
Retryまたは終了
```

状態遷移は一方向を基本とし、同じBattle内で確定結果やroute決定を巻き戻しません。

Retryは終了したBattleの状態を初期状態へ巻き戻す処理ではなく、
新しいBattle Sessionを作成する処理として扱います。

### 4. Battle IDを発行・照合する

Battle開始要求ごとに新しいBattle IDを発行します。

次の通知には対象Battle IDを含め、現在のBattle IDと照合します。

- Ready
- Ready解除
- Clear候補
- Game Over候補
- cleanup完了
- Result操作解禁に関係する通知
- Retry前後に遅延する可能性があるcallback

現在のBattle IDと一致しない通知は、現在または次のBattleへ適用しません。

旧Battleのobjectや状態へ新しいBattle IDを付け替え、現在Battleとして再利用してはいけません。

### 5. Ready gateを集約する

本タスクでは実システムの代わりにFake Ready Ownerを使用します。

少なくとも、概念上次のReady条件を登録・確認できるようにします。

- Stage／Enemy Ready
- Player Ready
- BGM／MusicChart Ready
- Shaondama Supply Ready

本タスクで上記すべてを実装する必要はありません。
Fake OwnerからReady状態を通知し、Battle Session Ownerが必要条件を集約できることを確認します。

必要なReady条件がすべて成立した場合だけBattle中へ移行します。

Ready通知後、Battle開始前に条件が解除された場合は、
解除を反映して再びすべての条件が成立するまで待機します。

Ready通知の具体的なinterface、登録方式、DI方式は実装担当判断としますが、
後続の実Ownerへ置き換えられる境界を用意してください。

### 6. Clear・Game Over候補を収集する

Fake Stage OwnerからClear候補、Fake Player OwnerからGame Over候補を発生させられるようにします。

Battle Session Ownerは、候補を受け取った順番だけで即時確定せず、
同一フレーム内の候補を収集した後に結果評価を1回だけ行います。

結果規則は次のとおりです。

| 同一フレーム内の候補 | 最終結果 |
|---|---|
| Clearのみ | Clear |
| Game Overのみ | Game Over |
| ClearとGame Over | Clear |
| どちらもなし | 未確定のまま継続 |

同じ候補が重複通知されても、同じBattleで最終結果を複数回確定しません。

最終結果確定後に到着した候補は、表示中のResultを変更しません。

### 7. Result表示開始と操作解禁を分離する

Battle結果確定後、共通Result表示を開始します。

Resultは少なくとも次のvariantを区別します。

- Clear
- Game Over

表示開始直後は操作をlockします。

```text
Battle結果確定
↓
Result表示開始
↓
VisibleLocked
↓
必須Owner cleanup完了
↓
Interactive
```

本タスクでは最終UIを作りません。
Text、Button、Debug Panel等の最低限の表示で、次を判別できれば構いません。

- 確定結果
- 現在のBattle ID
- Resultがlock中か
- cleanup待ちか
- Result操作可能か
- route決定済みか

lock中に入力された操作は破棄し、unlock後に遅延実行しません。

### 8. cleanup完了を集約する

本タスクでは実システムの代わりにFake Cleanup Ownerを使用します。

少なくとも複数の必須Ownerを登録でき、
現在Battleについてすべての必須cleanupが完了した場合だけResult操作を解禁できるようにします。

確認する内容：

- 一部Ownerだけ完了しても操作を解禁しない
- すべての必須Ownerが完了すると操作を解禁する
- 同じOwnerの重複完了通知を二重に数えない
- 旧Battle IDのcleanup完了通知で現在Resultを解禁しない
- 結果確定前の不正なcleanup完了通知でResult状態を変更しない

### 9. Result操作とrouteを1回だけ受け付ける

Result操作可能後、結果に応じた操作を1回だけ受け付けます。

| Result | 検証用操作 | 本タスクでのroute |
|---|---|---|
| Clear | Continue | 検証用終了状態または次の確認状態へ移行 |
| Game Over | Retry | 新しいBattle Sessionを開始 |

プロトタイプ全体ではClear後の完成版routeは対象外です。
そのため本タスクのClear Continueは、検証用終了状態へ移行するだけでも構いません。

Game OverのRetryでは、新しいBattle IDを発行し、新しいBattle Sessionとして準備を開始します。

連打、重複callback、複数Button、同一フレームの複数入力からrouteを複数回実行しないでください。

### 10. Retryで旧Battle状態を破棄する

Retry時は、少なくとも次を新しいBattle用に再初期化します。

- Battle ID
- lifecycle状態
- Ready状態
- 収集済みClear候補
- 収集済みGame Over候補
- 最終Battle結果
- cleanup完了状態
- Result variant
- Result操作lock／unlock
- route決定済み状態
- Fake Ownerの現在Battle用状態

Retry後、前回Battleの通知を意図的に発生させ、現在Battleへ適用されないことを確認できるようにします。

### 11. Fake Adapter境界を用意する

本タスクでは次の実システムを実装しません。

- Player
- Stage／Enemy Spawn
- Enemy Damage
- BGM／MusicChart
- AttackEvent
- Shaondama Supply
- Combat cleanup
- 最終UI

代わりに、Ready、結果候補、cleanup完了を発生させるFake Adapterを用意します。

Fake Adapterは検証SceneやTestから利用できる構造とし、
Runtimeの本実装へFake固有の条件分岐を混入させないでください。

後続タスクでは、同じ契約を実Owner実装へ置き換えられるようにします。

### 12. 自動テストを作る

少なくとも次の自動テストを実装します。

#### EditModeまたは純粋C#で確認する内容

- 必須Readyが揃うまでBattleを開始しない
- Ready解除を反映する
- Clear候補だけでClearを確定する
- Game Over候補だけでGame Overを確定する
- 同一フレームのClear＋Game OverでClearを確定する
- 最終結果を1回だけ確定する
- 重複候補を冪等に扱う
- 一部cleanup完了だけでは操作を解禁しない
- 全必須cleanup完了後に操作を解禁する
- routeを1回だけ決定する
- Retryで新しいBattle IDを発行する
- Retry後に旧Battle通知を拒否する

#### PlayModeで確認する内容

- `PrototypeBattle` Sceneでlifecycleを開始できる
- 検証操作からClear Resultを表示できる
- 検証操作からGame Over Resultを表示できる
- lock中はResult操作できない
- cleanup完了後に操作できる
- Retry後に再度同じフローを実行できる

### 13. Windows Buildで確認する

PB-TASK-0017で用意したBuild実行経路を使用し、`PrototypeBattle`検証SceneをWindows Buildします。

Windows Buildで少なくとも次を確認します。

- 実行ファイルが起動する
- 検証Sceneが開始される
- Ready gateを検証操作で成立させられる
- Clear Resultを確認できる
- Game Over Resultを確認できる
- cleanup完了前後の操作lockを確認できる
- Retry後に新しいBattle IDになる
- 旧Battle通知を拒否する確認操作を実行できる

確認用BuildのZIP化・共有はPB-TASK-0017で確立した方法を使用できます。

## 対象範囲

- PrototypeBattle検証Scene
- Battle Session Owner
- Battle ID
- Battle lifecycle状態
- Ready gate集約
- Clear／Game Over候補収集
- 同一フレーム結果評価
- Clear優先規則
- 最終結果の一度限りの確定
- Result表示開始
- Result操作lock／unlock
- cleanup完了集約
- Continue／Retryの一度限りの受付
- Retry時の新規Battle Session
- 旧Battle通知の拒否
- Fake Ready／Result／Cleanup Adapter
- 自動テスト
- Windows Buildでのlifecycle確認

## 対象外

- Player本実装
- Player State GraphのProduction接続
- Camera本実装
- Stageの実Spawn program
- Enemyの移動・攻撃・Damage・浄化
- BGM再生
- MusicChart／AttackEvent
- ラジクジラ・シャオンダマ生成
- Charge／Allocation
- Palette Bullet
- パリィ・万能シャオンダマ変換
- Combatの実Hit／Damage処理
- 最終Result UI
- 完成版のClear後route
- Animation・VFX・SE
- 60fps性能判定・最適化
- ゲームパッド対応

## 完了条件

- [ ] PrototypeBattle検証Sceneを直接開始できる
- [ ] Battleごとに新しいBattle IDを発行できる
- [ ] Battle Session Ownerが現在Battleの正本を所有している
- [ ] 必須Ready条件を登録・集約できる
- [ ] すべてのReady条件が成立するまでBattleを開始しない
- [ ] Ready解除をBattle開始前に反映できる
- [ ] Clear候補だけでClearを確定できる
- [ ] Game Over候補だけでGame Overを確定できる
- [ ] 同一フレームのClear＋Game OverでClearを確定できる
- [ ] 最終Battle結果を1回だけ確定する
- [ ] 重複候補・重複通知を冪等に扱う
- [ ] Result表示開始時は操作をlockする
- [ ] 一部Ownerのcleanup完了だけでは操作を解禁しない
- [ ] 全必須Ownerのcleanup完了後だけ操作を解禁する
- [ ] 旧Battle IDのcleanup通知で現在Resultを解禁しない
- [ ] Result routeを1回だけ決定する
- [ ] Game Over ResultからRetryできる
- [ ] Retry時に新しいBattle IDを発行する
- [ ] Retry後に旧Battleの状態を持ち越さない
- [ ] Retry後に旧Battle通知を拒否する
- [ ] Fake Adapterを後続の実Ownerへ置換可能な境界にしている
- [ ] EditModeまたは純粋C#テストが成功する
- [ ] PlayModeテストが成功する
- [ ] Windows Buildで主要lifecycleを確認できる
- [ ] Gameplayの実システムを本タスクへ混在させていない

## 確認手順

1. PB-TASK-0017が完了したCommitまたは統合後の最新`main`から作業を開始します。
2. Unity VersionとBuild実行経路を確認します。
3. EditModeまたは純粋C#のBattle lifecycleテストを実行します。
4. `PrototypeBattle`検証SceneをPlay Modeで開始します。
5. 一部ReadyだけではBattleが開始されないことを確認します。
6. すべてのReadyを成立させ、Battle中へ移行することを確認します。
7. Clear候補だけを発生させ、Clearを確定できることを確認します。
8. SceneまたはBattle Sessionを再開始し、Game Over候補だけでGame Overを確定できることを確認します。
9. 同一フレームにClear候補とGame Over候補を発生させ、Clearになることを確認します。
10. Result表示開始直後は操作できないことを確認します。
11. 一部cleanup Ownerだけを完了し、操作がlockされたままであることを確認します。
12. 全必須cleanup Ownerを完了し、操作可能になることを確認します。
13. Game Over ResultからRetryし、新しいBattle IDになることを確認します。
14. Retry後に旧Battle IDのReady、候補、cleanup通知を発生させ、現在Battleへ適用されないことを確認します。
15. Retry後に同じ主要フローを再実行できることを確認します。
16. PlayModeテストを実行します。
17. PB-TASK-0017のBuild経路から`PrototypeBattle`検証SceneをWindows Buildします。
18. Windows実行ファイルでClear、Game Over、cleanup lock、Retry、旧Battle通知拒否を確認します。
19. Test結果、Battle ID例、状態遷移、Build確認結果をPRとNotionへ記載します。

## 前提・依存タスク

### 前提タスク

- PB-TASK-0017｜Windowsビルド基準・確認用ビルド作成

### 後続タスク

本タスクのFake Adapterを、後続タスクで次の実Ownerへ置き換えます。

- Player Ready・State・Damage・Dead
- Stage／Enemy Ready・objective・Clear候補
- BGM／MusicChart Ready・3時計・AttackEvent
- Shaondama Supply Ready
- Combat cleanup
- UI Result表示・操作

## 実装時の注意点

- Fake Adapter固有の条件分岐をBattle Runtime本体へ混入させないでください。
- Fakeと実Ownerが同じ概念契約へ接続できる境界を用意してください。
- Clear／Game Over候補を受信順だけで即時確定しないでください。
- 同一フレームの候補を評価した後、結果を1回だけ確定してください。
- UIやFake Ownerに最終Battle結果の所有権を持たせないでください。
- cleanup Ownerの個別状態をUIへ集約させないでください。
- Battle IDの比較を省略したcallbackを現在Battleへ適用しないでください。
- Retryで旧BattleのobjectやSession状態を巻き戻して再利用しないでください。
- static状態やSingletonへ前回Battleの状態を残さないでください。
- Result lock中の入力をunlock時に遅延実行しないでください。
- Editor専用APIをWindows Runtimeの必須経路へ使用しないでください。
- 本タスクでPlayer、Enemy、BGM等の実装を始めないでください。
- 仕様で固定されていないClass名、File名、DI方式、ID型は実装担当判断としますが、採用理由をPRへ記載してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文へ、少なくとも以下を記載します。
   - Battle Session Ownerの責務
   - Battle lifecycle状態
   - Battle IDの生成・照合方法
   - Ready gateの登録・集約方法
   - 同一フレーム結果評価方法
   - cleanup Ownerの登録・集約方法
   - Fake Adapterと後続実Ownerの境界
   - Retry時に破棄・再生成する状態
   - EditMode／PlayMode Test結果
   - Windows Build確認結果
4. NotionタスクへPull Request、Test結果、Build確認結果、既知の問題を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
