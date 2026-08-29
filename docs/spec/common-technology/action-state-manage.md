---
title: "アクション遷移、ステートマシン"
description: PlayerのAction・State管理基盤について、現在の検討保留状態と再検討範囲を示す共通技術ページ
pageType: spec
category: "共通技術"
status: 未決
relatedTasks: []
---

# アクション遷移、ステートマシン

## 現在の状態

本ページは、Playerのアクション遷移・State管理基盤について扱うページです。

ただし、現在は**意図的に仕様検討を保留**しています。

現時点では、以下を確認したうえで、
Player本番実装へどのように統合するかを再検討する必要があります。

- Codex側で作成したAction／State管理基盤
- 現在のPlayer本番実装
- 両者の責務境界
- 既存Player実装をどこまで維持するか
- 開発基盤として導入する範囲
- 既存実装との統合方法

この整理が完了するまでは、
本ページ上で新しいAction／State管理方式を確定しません。

---

## 本ページの扱い

本ページが未完成であることは、
単なる仕様作成漏れを意味しません。

現在は、既存の開発基盤とPlayer実装の関係を確認するための
**検討保留状態**として維持します。

そのため、現段階では以下を行いません。

- 新しいState Machine構造の確定
- 新しいAction遷移規則の追加
- Player Gameplay仕様の再定義
- 既存Player実装を前提としない全面的な基盤置換
- 本ページを根拠としたAction／State基盤の実装タスク発行

---

## Gameplay仕様との責務境界

PlayerがGameplay上でどのStateを持ち、
どの条件でActionを開始・終了・中断するかについては、
Playerカテゴリの各正本仕様を参照します。

本ページは、それらのGameplay規則を再定義するページではありません。

将来このページの検討を再開する場合も、
共通技術側では主に以下を扱います。

- Player Action／State実装を安全に管理するための技術基盤
- State遷移の実装構造
- 遷移条件を確認・検証するための開発支援
- デバッグ・可視化
- 既存Player実装との統合方針

Gameplay上の正式な成立条件や優先順位は、
Playerカテゴリの正本仕様を正とします。

---

## 検討再開条件

少なくとも以下を確認できる段階になった時点で、
本ページの仕様検討を再開します。

1. Codex側で作成したAction／State管理基盤の現在の実装状態を確認できる
2. Player本番実装の現在の構造を確認できる
3. 両者の重複範囲と不足範囲を比較できる
4. Player本番実装へ基盤を統合するか、既存実装を維持するか判断できる
5. 導入する場合の変更範囲と移行方法を決められる

これらを確認するまでは、
本ページを無理に完成仕様へ進めません。

---

## 関連仕様

| 内容 | 関連ページ |
| --- | --- |
| 共通技術カテゴリ全体 | [共通技術](/spec/common-technology/) |
| Player State | [Player State仕様](/spec/player/states) |
| Player Action遷移 | [Player Action遷移仕様](/spec/player/player-action-transitions) |
| Player Input | [入力・操作仕様](/spec/player/input-and-controls) |

---

## 関連タスク

<PageRelations />
