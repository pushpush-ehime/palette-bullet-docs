---
title: 戦闘
description: Palette Bulletの戦闘仕様
pageType: spec
category: 戦闘
categoryOrder: 60
order: 0
status: 未決
---
# 戦闘状態

## 目的

このページでは、戦闘状態について定義します。

戦闘の開始・終了条件や判定方法の詳細は、Combat System側の仕様で定義します。

## 戦闘状態の管理

戦闘状態はCombat Systemが管理し、以下の2つの状態を持ちます。

* `NonCombat`：非戦闘状態
* `Combat`：戦闘状態

戦闘状態は、`Free`や`Charging`、`MarkerAiming`などのPlayerのアクションステートとは別に管理します。

## 戦闘開始時

Combat Systemが戦闘開始条件を満たしたと判定すると、戦闘状態を以下のように切り替えます。

```text
NonCombat
↓
Combat
```

戦闘開始条件の具体的な判定方法は、Combat System側で定義します。

`Combat`へ移行すると、通常BGMから戦闘BGMへ切り替わります。

AttackEventは戦闘BGMに設定されているため、戦闘BGMの開始に伴ってAttackEventの進行が始まります。

AttackEvent自体の処理については、AttackEvent側の仕様で定義します。

## 戦闘終了時

Combat Systemが戦闘終了条件を満たしたと判定すると、戦闘状態を以下のように切り替えます。

```text
Combat
↓
NonCombat
```

戦闘終了条件の具体的な判定方法は、Combat System側で定義します。

<PageRelations />
