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

対象には、主に以下を含みます。

- Playerのアクション遷移・State管理基盤
- MusicChart制作・確認ツール
- Excel等を使用したゲームデータ管理・Unity Import
- Gameplay Eventの追跡・デバッグ
- Battle条件の再現テスト
- コード上の接続契約・公開要素の一覧化

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
| [アクション遷移・ステートマシン](./action-state-manage) | Playerの複雑なAction・State遷移を安全に管理する | 検討保留 |
| [MusicChart制作・確認ツール](./music-chart-workbench) | MIDI、BGM、AttackEvent、Timingを同一時間軸上で確認・設定・検証する | 現在検討中 |
| Excelゲームデータ管理・Unity Import | ストーリーや調整値を表形式で管理しUnityへ反映する | 後続検討 |
| Gameplay Event Trace Viewer | AttackEventからDamage等までの処理経路を追跡する | 将来候補 |
| Battle Scenario Runner | 同一frame競合等の境界条件を再現する | 将来候補 |
| RGB Damage Sandbox | RGB Damage、倍率、clamp、浄化結果を確認する | 将来候補 |
| Code Contract Catalog | クラス、Event、公開変数、接続契約を一覧化する | 将来候補 |

現段階では、未検討の支援ツールについて空の個別仕様ページを先に作成しません。
必要性と責務が明確になったものから順に個別ページを追加します。

## 現在の優先順位

現在は、次の順で検討します。

1. MusicChart制作・確認ツール
2. Excelゲームデータ管理・Unity Import
3. Gameplay Event TraceおよびScenario検証
4. アクション遷移・State管理基盤の再検討

アクション遷移・State管理基盤は、現在作成中の基盤と
Player本番実装の統合方針を判断できる段階まで保留します。

## 共通方針

開発支援ツールは、次の原則に従います。

- ゲーム仕様の正本をツール内で独自に再定義しない
- 同じデータを複数箇所で手入力させない
- 不整合をRuntimeで暗黙補正しない
- 自動修正より、問題箇所と理由の明示を優先する
- プログラマー以外の担当者も確認できる表示を用意する
- 初期版は必要最小限とし、使用実績を確認してから拡張する
- EditorツールがなくてもRuntimeデータの意味が変わらない構造にする

## 現在個別ページを作成しない候補

以下は将来候補として管理し、現段階では個別ページを作成しません。

- MusicChart Runtime Monitor
- Excelゲームデータ管理・Unity Import
- Gameplay Event Trace Viewer
- Battle Scenario Runner
- RGB Damage Sandbox
- Code Contract Catalog

MusicChart Runtime Monitorについても、まずMusicChart制作・確認ツールの
静的データ表示・編集・Validationを完成させ、
Runtime側から取得すべき情報が明確になった段階で分離を検討します。
