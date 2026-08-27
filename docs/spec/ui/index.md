---
title: UI
description: Palette BulletのUIおよび共通Result画面の表示・操作・route接続仕様
pageType: spec
category: UI
categoryOrder: 90
order: 0
status: 仮仕様
---

# UI

## ページ概要

- 対象担当：UI担当（個人は未決）
- 関連ページ：[ゲーム全体](/spec/game/)、[戦闘概要](/spec/combat/)、[入力と操作](/spec/player/input-and-controls)、[プレイヤー死亡](/spec/player/player-death)、[用語集](/glossary)
- 本ページの確定範囲：共通Result画面、`Clear / Game Over` variant、Result操作lock、Result後のroute

本ページではUI全体のうち、Battle終了後に表示する共通Result画面を正本として定義します。

HUD、Pause Menu、設定画面、拠点UI、Stage選択UIなど、Result以外のUI詳細は本ページではまだ確定しません。

## 目的

本ページでは、Gameが確定したBattle結果をUIへ安全に接続し、PlayerがResultから次のrouteを一度だけ選択できるようにするため、以下を定義します。

- `Clear`と`Game Over`で共用するResult画面
- Gameの確定結果からResult variantを選択する規則
- Result表示開始と操作解禁の分離
- 必須Owner cleanup完了後のResult操作解禁
- `Continue / Retry`と遷移先の対応
- 同一frame Clear＋Dead時の表示
- 連打・重複通知による複数route遷移の防止

Battle結果の判定、同一frame内の終了候補の優先順位、各OwnerのGameplay cleanup集約は、[ゲーム全体](/spec/game/)および[戦闘概要](/spec/combat/)を正本とします。

UIはBattle結果やcleanup完了を独自に再判定せず、Gameから受け取った確定情報だけを表示・操作状態へ反映します。

## プレイヤーから見た挙動

### Clearの場合

Battle結果が`Clear`として確定すると、共通Result画面を`Clear` variantで表示します。

```text
Battle結果 = Clear
↓
共通Result画面をClear variantで表示
↓
表示開始直後はResult操作をlock可能
↓
必須Owner cleanup完了
↓
Continueを操作可能にする
↓
PlayerがContinueを決定
↓
拠点／Stage選択へ戻る
```

`Clear` variantでは、Playerが選択する主要route操作として`Continue`を表示します。`Retry`は表示・受付しません。

### Game Overの場合

Battle結果が`Game Over`として確定すると、共通Result画面を`Game Over` variantで表示します。

```text
Battle結果 = Game Over
↓
共通Result画面をGame Over variantで表示
↓
表示開始直後はResult操作をlock可能
↓
必須Owner cleanup完了
↓
Retryを操作可能にする
↓
PlayerがRetryを決定
↓
現在のStageを最初から再開
```

`Game Over` variantでは、Playerが選択する主要route操作として`Retry`を表示します。`Continue`は表示・受付しません。

Retryでは終了したBattleの状態を巻き戻して再利用せず、新しいBattleとして現在のStageを初期化します。新しいBattleの初期化と新しい`battleId`の発行はGame側の責務です。

### 同一frameにClearとDeadが成立した場合

同一frameにClearとPlayer Deadの両方が成立した場合、Gameが確定する最終Battle結果は`Clear`です。

UIはGameから受け取った`Clear`だけを使用し、`Clear` variantだけを表示します。

```text
同一frame
Clear成立
+
Player HP 0 / RootState = Dead成立
↓
Gameの確定結果 = Clear
↓
UI表示 = Clear variantのみ
```

この場合、以下を行いません。

- `Game Over` variantを一瞬でも表示する
- `Retry`を表示・受付する
- PlayerのHPや`RootState = Dead`を根拠にUI側でGame Overへ切り替える
- Clear Resultの途中でGame Over Resultへ上書きする

HP 0や`RootState = Dead`を維持するGameplay規則と、死亡演出を開始しない規則は、[プレイヤー死亡](/spec/player/player-death)を正本とします。

## 詳細仕様

### 共通Result画面

Resultは`Clear`用画面と`Game Over`用画面を別々の独立システムとして実装せず、1つの共通Result画面にvariantを持たせます。

```text
Common Result Screen
├─ Clear variant
└─ Game Over variant
```

共通化する対象には、少なくとも次を含みます。

- 表示開始・終了のlifecycle
- 操作lock / unlock
- route決定の一度限りの受付
- 二重入力防止
- `battleId`による通知受付
- Result操作入力の受付gate

variantごとに変更できる対象には、少なくとも次を含みます。

- Result種別の表示
- 見出し・説明文
- 主要操作ボタン
- variant固有のVFX / SE / Animation

レイアウト、色、文言、Animationなどの具体表現は未決ですが、表示結果とrouteの対応は本ページの規則から変更しません。

---

### Gameの確定結果を唯一の表示根拠とする

UIは、Gameから現在の`battleId`について通知された確定Battle結果をResult表示の唯一の正本とします。

概念上、UIは少なくとも次の情報を受け取ります。

| 情報 | 用途 |
| --- | --- |
| `battleId` | どのBattleのResultかを識別する |
| 確定Battle結果 | `Clear / Game Over` variantを選択する |
| Result表示開始通知 | 共通Result画面を表示する |
| Result操作解禁通知 | cleanup完了後に操作を解禁する |

UI側では、以下を調べて勝敗を再判定しません。

- Player HP
- `RootState`
- Enemy残数
- Boss HP
- Clear条件object
- 死亡演出の再生状態
- Battle内のDamage履歴
- 画面上に残っているProjectileやMarker

```text
Game
↓ BattleResultFinalized(battleId, result)
UI
↓
resultをそのままvariantへ対応付ける
```

対応は次のとおりです。

| Gameの確定結果 | Result variant | 主要操作 | route |
| --- | --- | --- | --- |
| `Clear` | `Clear` | `Continue` | 拠点／Stage選択へ戻る |
| `Game Over` | `Game Over` | `Retry` | 現在のStageを最初から再開する |

同じ`battleId`に対して同じ確定結果が重複通知された場合は、同じResultを二重生成せず冪等に扱います。同じ`battleId`へ異なる確定結果が後から通知された場合は不正な上書き通知として拒否し、すでに表示中のvariantを変更しません。

---

### Result表示開始と操作解禁を分離する

Result画面は、Battle結果確定後に表示を開始できます。必須Ownerのcleanup完了を待ってから初めて画面を表示する必要はありません。

ただし、表示開始時点ではResult操作をlockできます。

```text
Battle結果確定
↓
Result表示開始
↓
VisibleLocked
↓
必須Owner cleanup完了を待つ
↓
Interactive
```

`VisibleLocked`中は、Result画面を表示していても`Continue / Retry`のroute決定を受け付けません。

lock中の表現は、以下のいずれでも構いません。

- ボタンをdisabled表示する
- ボタンを非表示にする
- 入力を受け付けない演出中表示とする

ただし、見た目上操作できるように表示しながらroute入力だけを無言で失敗させるなど、Playerが操作可否を誤認する表現は避けます。具体的な表示表現はUIデザインで確定します。

lock中に押された入力は破棄し、操作解禁後に遅延実行しません。押しっぱなし、連打、決定入力bufferなどを、unlock時の自動決定へ変換しません。

---

### 必須Owner cleanup完了後の操作解禁

GameまたはCombatのcleanup集約Ownerは、Battle結果確定後に各必須Ownerのcleanup完了を集約します。

UIは各Ownerのcleanup状態を個別に監視・再判定しません。上位Ownerから現在の`battleId`に対するResult操作解禁通知を受け取った場合だけ、Result操作を解禁します。

```text
各必須Ownerがcleanup
↓
上位Ownerが全必須cleanup完了を集約
↓
ResultOperationsUnlocked(battleId)
↓
UIがbattleIdを確認
↓
VisibleLocked → Interactive
```

操作解禁通知について、次をすべて満たす必要があります。

- 通知の`battleId`が表示中Resultの`battleId`と一致する
- 表示中Resultのvariantが確定済みである
- Resultが`VisibleLocked`である
- routeがまだ決定されていない

旧Battleのcleanup完了通知や、表示中Resultと異なる`battleId`の通知では操作を解禁しません。

誤操作防止用の最小待ち時間を設ける場合は、Tuning値として管理します。その場合も必須Owner cleanup完了を省略せず、次の両方を満たした後に操作を解禁します。

```text
全必須Owner cleanup完了
+
任意の最小待ち時間完了
↓
Result操作解禁
```

---

### 任意VFX・SEと操作解禁の分離

次の任意演出の完了は、Result操作解禁条件に含めません。

- Clear / Game Over用VFX
- Result表示Animation
- 終了SE
- BGM Fade Out
- 画面内に残る非Gameplay演出
- Damage、Hit、Target、入力妨害機能を持たない表示専用objectの終了

任意演出が継続していても、全必須Owner cleanupが完了し、必要な最小待ち時間も満たしていればResult操作を解禁できます。

演出側は、解禁済みResult操作を妨害するGameplay Collider、入力吸収、Target提供などを持ちません。

---

### Clear Resultの`Continue`

`Clear` variantでは`Continue`を表示します。

`Continue`が有効な条件は次のとおりです。

- 表示中variantが`Clear`である
- Result操作状態が`Interactive`である
- 表示中Resultの`battleId`が現在のResult contextと一致する
- routeが未決定である

有効な`Continue`が決定されると、UIはGameへ拠点／Stage選択へ戻るroute要求を一度だけ送ります。

UI自身がBattle結果を変更したり、Scene遷移先を再判定したりしません。実際のScene / flow遷移はGame側の責務です。

---

### Game Over Resultの`Retry`

`Game Over` variantでは`Retry`を表示します。

`Retry`が有効な条件は次のとおりです。

- 表示中variantが`Game Over`である
- Result操作状態が`Interactive`である
- 表示中Resultの`battleId`が現在のResult contextと一致する
- routeが未決定である

有効な`Retry`が決定されると、UIはGameへ現在のStageを最初から再開するroute要求を一度だけ送ります。

UIは終了したBattleのobject、時計、Allocation、Reserved、Projectileなどを再利用しません。Gameが新しいBattleとして初期化し、新しい`battleId`を発行します。

---

### 二重決定・連打による複数route遷移の防止

Result操作は、一つのResult表示につき一度だけ決定できます。

最初の有効な`Continue / Retry`入力を受理した時点で、Gameへroute要求を送る前にResult操作状態を`RouteCommitted`へ変更し、すべてのResult操作を即座にlockします。

```text
Interactive
↓ 最初の有効な決定入力
RouteCommittedへ先に遷移
↓
Result操作をlock
↓
Gameへroute要求を1回送る
↓
Transitioning
```

`RouteCommitted`以降に届いた次の入力は、同一frame内の連打を含めて無視します。

- 同じボタンの再入力
- MouseとKeyboardから同時に届いた決定入力
- UI Submitの重複event
- 押しっぱなしによるrepeat入力
- 旧BattleのResult入力
- route遷移開始後の入力

Game側も`battleId`とroute決定済み状態を用いてroute要求を冪等に扱います。UIとGameの両方で、一つのResultから複数のScene遷移・Stage再初期化・route要求が成立しないようにします。

route要求が受理された後にvariantやrouteを別の結果へ変更しません。

## 状態別の挙動

Result画面は、概念上次の状態で管理します。実装クラス名・enum名は固定しませんが、同等の受付gateを必須とします。

| 状態 | 表示 | Result操作 | 主な遷移条件 |
| --- | --- | --- | --- |
| `Hidden` | 非表示 | 無効 | Gameから確定結果を受け取る |
| `VisibleLocked` | 表示 | 無効 | 全必須Owner cleanup完了後に解禁 |
| `Interactive` | 表示 | 有効 | 最初の有効な`Continue / Retry`入力 |
| `RouteCommitted` | 表示または遷移演出中 | 無効 | route要求をGameへ一度だけ送る |
| `Transitioning` | 遷移演出または非表示化中 | 無効 | Game側のroute遷移完了 |

```text
Hidden
↓ BattleResultFinalized
VisibleLocked
↓ ResultOperationsUnlocked
Interactive
↓ ContinueまたはRetryを一度だけ決定
RouteCommitted
↓ Gameへroute要求
Transitioning
```

任意のResult VFX / SE / Animationは、この操作状態とは別に進行できます。

### variantと操作の対応

| variant | 表示する主要操作 | 表示しない主要操作 | 遷移要求 |
| --- | --- | --- | --- |
| `Clear` | `Continue` | `Retry` | 拠点／Stage選択へ戻る |
| `Game Over` | `Retry` | `Continue` | 現在のStageを最初から再開する |

## 他システムとの接続

| システム／Owner | 本ページとの接続 |
| --- | --- |
| Game | Battle結果を一度だけ確定し、`battleId`と確定結果をUIへ通知する。Result routeを実行する |
| Combat cleanup集約 | 必須Owner cleanup完了を集約し、Result操作解禁可能をGameまたはUIへ通知する |
| Player Input | Battle結果確定後にGameplay入力を停止し、Result操作解禁後だけResult入力を通す |
| Player Death | HP 0 / `RootState = Dead`と死亡演出・Game Over表示を分離する |
| 各Gameplay Owner | Battle終了cleanupを行い、必須cleanup完了を上位Ownerへ通知する |
| Result UI | 確定結果を表示し、解禁通知後に対応する一つのroute操作だけを受け付ける |

責務境界は次のとおりです。

| 内容 | 正本 |
| --- | --- |
| Battle終了候補の収集・結果確定・Clear優先 | [ゲーム全体](/spec/game/) |
| 必須Owner cleanup集約・Result操作解禁判断 | [ゲーム全体](/spec/game/) / [戦闘概要](/spec/combat/) |
| Gameplay入力とResult入力の切り替え | [入力と操作](/spec/player/input-and-controls) |
| Dead成立・死亡演出・Game Over接続 | [プレイヤー死亡](/spec/player/player-death) |
| 共通Result画面・variant・操作状態 | **本ページ** |
| `Continue / Retry`の表示と一度限りの受付 | **本ページ** |
| 拠点／Stage選択または現在Stage Retryの実行 | Game / Scene flow側 |

## 例外・禁止事項

- UI側でPlayer HP、Enemy残数、`RootState`などから勝敗を再判定しない
- 同じ`battleId`の確定結果を別結果で上書きしない
- Clear＋Dead同一frameで`Game Over` variantを表示しない
- `Clear` variantに`Retry`を表示・受付しない
- `Game Over` variantに`Continue`を表示・受付しない
- 必須Owner cleanup完了前にResult routeを決定しない
- lock中の入力をunlock後に遅延実行しない
- 任意VFX / SEの完了を必須cleanup完了条件に追加しない
- VFXや表示専用objectにResult入力を妨害するGameplay機能を持たせない
- 一つのResultから複数のroute要求を送らない
- `RouteCommitted`後にvariantまたはrouteを変更しない
- 旧`battleId`のResult表示・解禁・入力通知を現在のResultへ反映しない
- Retryで終了済みBattleの状態を巻き戻して再利用しない

## パラメータ

| パラメータ | 内容 | 値 |
| --- | --- | --- |
| `ResultInputUnlockDelay` | cleanup完了後に追加する任意の誤操作防止時間 | 未定。使用しない場合は0相当 |
| `ResultShowDuration` | Result表示開始Animationの調整値 | 未定 |
| `ResultTransitionDuration` | route決定後の遷移演出時間 | 未定 |

これらの値はハードコードせず、Tuning値として管理します。

`ResultShowDuration`や`ResultTransitionDuration`の完了を、必須Owner cleanup完了の代わりには使用しません。任意演出時間は、Gameplay cleanupの成立条件を変更しません。

## 未決事項

以下は本ページでまだ確定しません。

- 共通Result画面の具体的レイアウト
- `Clear / Game Over`の見出し・説明文
- Buttonの位置・サイズ・配色・Focus表現
- Result表示Animation
- Result固有VFX
- Result固有SE
- BGMの停止・Fade・Result用BGMへの切り替え
- Mouse / Keyboard / Gamepad別の具体的Focus移動
- Result画面をScene、Overlay、Prefab等のどの実装単位にするか

一方、次は未決事項ではありません。

- Resultは共通画面である
- `Clear / Game Over`の2 variantを持つ
- UIはGameの確定結果だけを表示する
- `Clear → Continue → 拠点／Stage選択`
- `Game Over → Retry → 現在のStageを最初から再開`
- 必須Owner cleanup完了前はResult操作を受け付けない
- 任意VFX / SE完了を操作解禁条件にしない
- Clear＋Dead同一frameでは`Clear`だけを表示する
- route決定は一度だけである

## 関連タスク

<PageRelations />
