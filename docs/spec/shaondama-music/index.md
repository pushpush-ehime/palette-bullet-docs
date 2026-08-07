---
title: シャオンダマ
description: シャオンダマ（玉そのもの）の生成・浮遊挙動・データ・万能玉を定義するカテゴリ
pageType: spec
category: シャオンダマ
categoryOrder: 50
order: 0
status: 未決
---

# シャオンダマ

## ページ概要

- 対象担当：企画班・プログラム班・デザイン班
- このカテゴリでは、シャオンダマ（玉そのもの）に関する仕様を定義します
- ページ一覧：
  - [MIDI駆動生成](/spec/shaondama-music/midi-driven-spawning) — BGMに連動した玉の生成ルール
  - [浮遊・挙動](/spec/shaondama-music/floating-behavior) — 空中を漂う挙動と場面ごとの見た目
  - [玉のデータ](/spec/shaondama-music/orb-data) — 玉1個が持つデータ属性
  - [万能シャオンダマ](/spec/shaondama-music/wildcard-orb) — 虹色のワイルドカード玉
- 関連ページ：[シャオンダマ選択との接続](/spec/player/shaondama-selection-connection)、[ドローシステム](/spec/draw-system/)

## 目的

シャオンダマそのものの生成ルール・浮遊挙動・データ属性を定義します。

コード分類・BGM照合のルールはBGMカテゴリ、待機コード・発射・ターゲティングはCombatカテゴリで定義します（いずれもページ作成予定）。

## プレイヤーから見た挙動

BGMに合わせてラジクジラから7色のシャオンダマが生まれ、シャボン玉のように空中を漂います。プレイヤーはこれをなぞって繋ぎ、コードを作って戦います（なぞり操作はドローシステム参照）。

## 詳細仕様

各個別ページで定義します（上記ページ一覧参照）。

## 状態別の挙動

各個別ページで定義します。

## 他システムとの接続

- なぞり・選択操作：[ドローシステム](/spec/draw-system/)、[シャオンダマ選択との接続](/spec/player/shaondama-selection-connection)
- コード分類・BGM照合：BGMカテゴリ（作成予定）
- 待機コード・発射・ダメージ：Combatカテゴリ（作成予定）

## 例外・禁止事項

- 旧仕様の3色（赤黄青）生成、および旧称「色団子」を使用しない（廃止概念）

## パラメータ

各個別ページで定義します。

## 未決事項

- カテゴリ全体の対象担当の割り当て

## 関連タスク

<PageRelations />
