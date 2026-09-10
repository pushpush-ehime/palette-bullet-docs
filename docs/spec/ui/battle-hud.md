---
title: "バトルHUD"
description: UI-001の画面ラフを描くための表示候補、状態差分、参照する機能仕様
pageType: spec
category: "UI"
order: 20
status: 仮仕様
relatedTasks:
  - /tasks/ui/pb-task-0026
  - /tasks/ui/pb-task-0048
---

# バトルHUD

## 設計の位置づけ

[想定画面一覧](./screen-inventory.md)の **UI-001 Battle画面・HUD** を具体化するページです。プロトタイプに必要な最小限の表示から、UI・画面設計担当がラフを描いて確認します。

ここでは表示候補と確認する状態を整理します。レイアウト、ゲージの形、数値表示の有無、配色、アイコン、アニメーションは未決です。以下の情報をすべて常時表示する決定ではありません。

## 表示候補と参照する仕様

| 判断したいこと | 表示候補 | 機能の正本 |
|---|---|---|
| 生存状態と行動の余裕 | HP、Stamina、必要な場合の不足フィードバック | [Playerステータス](/spec/player/player-status) |
| 何を狙っているか | 照準、指定した対象、対象がない状態 | [照準](/spec/camera/aim)、[Marker](/spec/combat/marker) |
| シャオンダマを選べるか、Chargeが進んでいるか | 選択の手がかり、Charge中・成功・失敗の違い | [Charge](/spec/player/player-action-charge)、[Allocation](/spec/draw-system/charge-allocation) |
| 音楽に合わせて次に何が起きるか | AttackEventの予告、必要な情報と進行の手がかり | [AttackEvent](/spec/bgm/bgm-attack-event)、[音楽とGameplayの接続](/spec/bgm/bgm-gameplay-connection) |
| 今のModeと、切替待ちのModeは何か | 現在のMode、適用待ち、切替できない期間を必要に応じて区別 | [Mode／Conduct](/spec/player/player-action-mode-change-and-conduct) |
| 次のChargeで選ぶConductは何か | 次回用の選択、進行中Chargeや付与済みの内容との区別、使用不可の状態 | [Mode／Conduct](/spec/player/player-action-mode-change-and-conduct) |
| 次にどの操作をすればよいか | 必要な場面だけのキー・マウス操作案内 | [入力と操作](/spec/player/input-and-controls) |

世界内のシャオンダマ・Enemy・Markerによる表示と、画面に固定するHUDの分担をラフで検討します。画面上の情報から勝敗・Charge成功・発火・Mode適用をUIが独自に判定する構成にはしません。

Modeの切替入力をした直後と、小節頭で実際に適用された後を同じ表示にするかは、Playerが状態を誤認しないよう検討します。Conductも、次回用の選択を変えたことが進行中Chargeの内容変更に見えないようにします。具体的な見せ方はこのページで後続決定します。

## 比較する表示状態

基準は1920×1080・キーボード／マウスです。照準周辺と、シャオンダマを選ぶための視野がHUDに隠れない構成を検討します。制作順・成果物・完了条件は[PB-TASK-0048](/tasks/ui/pb-task-0048#rough-order)を参照します。

通常Battleと比較する状態は次のとおりです。

- 通常時と、照準対象・選択対象がないとき。
- Charge中、Chargeが成立したとき、成立しなかったとき。
- HP・Staminaが少ないときや、必要な操作ができないとき。
- Battle終了時にGameplay操作を終え、共通Resultへ移るとき。
- Mode／Conductを追加する段階での、通常・選択／適用待ち・使用不可の違い。

これは表示の比較候補です。すべてを別の全画面や専用ゲージにする決定ではありません。[プロトタイプの完成方針](/spec/game/prototype#completion-policy)に合わせ、最初の通常Charge→発射→浄化の確認と、Mode／Conductを追加する段階を区別します。

Charge成功はAttackEvent occurrenceへの割り当て・Reserved化であり、その場での発射ではありません。Palette Bullet化・発射は対応するAttackEvent発火時です。HUDの表示もこの違いを保ちます。[Charge](/spec/player/player-action-charge)、[Allocation](/spec/draw-system/charge-allocation)、[入力と操作](/spec/player/input-and-controls)を正本とし、独立した発射ボタンやGameplay判定を追加しません。

## 画面ラフの記録

| 項目 | 現在の内容 |
|---|---|
| 画面ID | UI-001 |
| 対象範囲 | プロトタイプ必須。最終品質の見た目は完成条件に含めない |
| ラフ画像・編集元 | 未作成 |
| 入口 | GameによるBattle開始 |
| 主な操作 | 機能の正本に定めるGameplay操作。HUDをクリックして操作するかは未決 |
| 主な出口 | Gameの結果確定後に共通Result。必須機能失敗はUI-003の中断案内 |
| 任意の重ね表示 | Pause、操作説明。採用と表示条件は未決 |

## 未決事項

- **常時表示・必要時表示・世界内表示の分担、配置・大きさ**。確認先：UI設計・Camera・各情報を提供する機能担当。決定が必要な時点：ラフから詳細設計へ渡す前。

- **Charge中・成功・不成立・ReservedとAttackEvent予告の読み取り方**。確認先：UI設計・Charge／Allocation・BGM担当。決定が必要な時点：ラフから詳細設計へ渡す前。通知内容はUI実装前。

- **Modeの現在値・適用待ち・使用不可、Conductの次回選択と進行中Chargeの区別**。確認先：UI設計・Player機能担当。決定が必要な時点：Mode／Conduct追加段階の詳細設計前。

- **色・文言・Icon・音・Animation、操作案内の表示条件**。確認先：UI設計・各機能担当。音はサウンド担当。決定が必要な時点：各表現の詳細設計前。

これらは仮の配置・表現として比較できますが、採用をラフだけから確定しません。未決事項と継続可能な範囲は[画面一覧のQ-02](/spec/ui/screen-inventory#open-questions)、画像・編集元・レビュー結果の記録方法は[PB-TASK-0048](/tasks/ui/pb-task-0048#rough-record)へつなぎます。
