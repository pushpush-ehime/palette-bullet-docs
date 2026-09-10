---
title: 共通技術
description: Palette Bulletの共通開発基盤・開発支援ツール
pageType: spec
category: 共通技術
categoryOrder: 110
order: 0
status: 仮仕様
---

# 共通技術

## 目的

本カテゴリでは、ゲーム内の個別機能そのものではなく、
複数の担当者が安全かつ効率的に開発するための共通基盤・Editorツール・検証機能を定義します。

現在、主に以下の共通開発基盤・開発支援ツールを扱います。

- 標準Unity Visual ScriptingのPlayer基盤（旧Player Action／State Graph基盤は履歴）
- MusicChart Workbench
- Project Code Catalog
- Planner調整Parameter管理・Excel連携
- Gameplay Runtime Trace

このほか、必要性と責務が明確になった開発支援ツールは、
将来候補として整理したうえで個別仕様化を検討します。

## ゲーム仕様との責務境界

本カテゴリは、各Gameplay機能の正式な挙動を再定義しません。

例えばMusicChartについては、以下の内容はBGMカテゴリの各正本仕様を参照します。

- MusicChartに何を保存するか
- AttackEventがGameplay上で何を意味するか
- MIDI Importで何を生成するか
- どの時間関係をValidationするか

共通技術カテゴリでは、主に以下を定義します。

- どの画面で確認するか
- 誰が入力・確認するか
- エラーをどのように表示するか
- 再Import差分をどのように確認するか
- 作業ミスをどのように防ぐか

ゲーム仕様側の正本と開発支援ツール側の仕様に同じ規則を二重定義せず、
Gameplay上の意味やValidation規則は各正本仕様を参照し、
本カテゴリではそれらを扱うための表示・入力・確認方法を定義します。

## 開発基盤・支援ツール一覧

| 項目 | 目的 | 現在の状態 |
| --- | --- | --- |
| [標準Unity Visual ScriptingのPlayer基盤](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/DEVELOPMENT.md) | 保存グラフを編集してPlayerを開発する | 移動・Jump・Dash・Animator、六班の接続雛形を提供済み。本体接続・全Actionの完成ではない |
| [MusicChart制作・確認ツール](./music-chart-workbench) | MIDI、BGM Audio、MusicChart、AttackEvent、Timing、Random Section、Validation、再Import差分、Runtime状態を同一の音楽時間軸上で確認・設定・検証する | 仮仕様作成済み |
| [Project Code Catalog](./project-code-catalog) | Unityプロジェクトのコード構造・依存関係・実装Evidence・Test・仕様書Reference等を機械収集し、AIや人間が追加調査対象を絞れるようにする | 仮仕様作成済み |
| [Planner調整Parameter管理・Excel連携](./planner-tuning-parameter) | ProgrammerがPlannerへ公開してよいGameplay Parameterを明示し、Definition、Value、Excel Export／Import、Validation、Diff／Conflictを管理する | 仮仕様作成済み |
| [Gameplay Runtime Trace](./gameplay-runtime-trace) | Input、State Graphの判断証拠、Gameplay Event、Entity、Context Snapshot等を同一時系列で関連付け、Runtimeで実際に起きた処理を追跡する | 仮仕様作成済み |
| Battle Scenario Runner | 特定のBattle条件や同一frame競合等を意図的に再現・検証する | 将来候補 |
| RGB Damage Sandbox | RGB Damage、倍率、clamp、浄化結果等を独立環境で確認する | 将来候補 |

未検討の支援ツールについて空の個別仕様ページを先に作成せず、
必要性と責務が明確になったものから個別ページを追加します。

## 現在の状態

提供済み基盤の範囲と日常の入口は[開発基盤ガイド](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/DEVELOPMENT.md)を正本とします。MusicChartの静的制作、Code Catalogの生成、Planner Tuning Coreは提供済みです。個別のWeb仕様には将来の拡張も含まれるため、仕様ページの存在を全機能の実装完了とは扱いません。

Playerは標準Unity Visual Scriptingの保存グラフを採用済みです。[旧Player Action／State Graph基盤](./action-state-manage)は廃止した方針の履歴として保持し、独自RuntimeのProduction導入を新規タスクとして再開しません。

基盤の統合・自動検証と、本体Game／Battle／Combatへの接続、全Actionの実装、各ツールの人間受入は区別します。今回の必須範囲は[プロトタイプ共通仕様](/spec/game/prototype#completion-policy)から判断します。

本ページでは、上記基盤の実装優先順位を新たに固定しません。
具体的な実装順は、各基盤の依存関係とプロジェクト上の必要性を確認したうえで
実装タスク設計時に決定します。

## 共通方針

開発支援ツールは、次の原則に従います。

- ゲーム仕様の正本をツール内で独自に再定義しない
- Graph、Matrix、Trace、Scenario、Viewer等の観測・診断機能をRuntime authorityにしない
- 同じデータを複数箇所で手入力させない
- 不整合をRuntimeで暗黙補正しない
- 自動修正より、問題箇所と理由の明示を優先する
- プログラマー以外の担当者も確認できる表示を用意する
- 初期版は必要最小限とし、使用実績を確認してから拡張する
- EditorツールがなくてもRuntimeデータの意味が変わらない構造にする

## 現在個別ページを作成しない候補

以下は将来候補として管理し、現段階では個別ページを作成しません。

- Battle Scenario Runner
- RGB Damage Sandbox

[旧Player Action／State Graph基盤](./action-state-manage)に記載されたScenario Runnerは旧方針の記録であり、現在の開発に要求しません。ここで将来候補とするBattle Scenario Runnerは、Battle全体の複数Systemを横断して条件を再現・検証する別の候補です。

MusicChart Runtime Monitorは独立した将来候補として扱いません。
完成版では[MusicChart制作・確認ツール](./music-chart-workbench)の機能として含め、
MusicChartのRuntime進行状況、Audioとの同期差、Current AttackEvent等を確認するために使用します。
プロトタイプではRuntime Monitorの実装優先度を低くして構いません。

GameplayのRuntime追跡機能は
[Gameplay Runtime Trace](./gameplay-runtime-trace)として個別仕様化済みです。

現行Playerの保存グラフ、実行状態、拒否理由、検証資料の確認方法は[Player VSの開発手順](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/PlayerVS/AUTHORING.md)を参照します。Gameplay Runtime Traceを接続する場合も、採用済みPlayer基盤の証拠を参照・関連付けし、State遷移を独自に再判定しません。旧RuntimeのTrace機構を必須として再導入しません。

コード構造・Evidenceの機械収集は
[Project Code Catalog](./project-code-catalog)として個別仕様化済みです。

Planner向けのGameplay Parameter調整とExcel連携は
[Planner調整Parameter管理・Excel連携](./planner-tuning-parameter)として個別仕様化済みです。

