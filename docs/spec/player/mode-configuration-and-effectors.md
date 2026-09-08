---
title: "モード構成・エフェクター仕様"
description: Palette BulletにおけるMode 2～4の構成・Effector接続・保存契約
pageType: spec
category: "Player"
order: 61
status: 仮仕様
relatedTasks: []
---

# モード構成・エフェクター仕様

## 目的

本ページは、Playerが拠点で編集するMode 2～4について、構成可能な範囲、Effectorの接続順、編集可能な場面、およびSave Dataとの境界を定義する正本です。

Stage中のMode選択、小節同期切替、Mode snapshot、Conduct、および各ModeのGameplay上の適用規則は、[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)を正本とします。本ページではそれらを再定義しません。

## 編集対象

Modeは合計4種類です。

| Mode | 構成の編集 | 本ページでの扱い |
| --- | --- | --- |
| Mode 1 | 編集不可 | 固定Mode。構成対象外 |
| Mode 2 | 拠点の専用機能で編集可能 | 構成対象 |
| Mode 3 | 拠点の専用機能で編集可能 | 構成対象 |
| Mode 4 | 拠点の専用機能で編集可能 | 構成対象 |

Mode 1の初期効果は統合ページで定義します。Mode 1を本ページの編集機能へ表示しても、slot追加、Effector交換、並び替え、段階変更を受け付けません。

Mode 2とMode 3など、異なるMode IDに同じ構成を設定することは有効です。構成内容が同一であることを理由に、Mode IDを統合したり無効扱いしたりしません。

## 構成契約

Mode 2～4は、それぞれ最大3個のEffector slotを持ちます。

- slotは空にできる
- 同じMode内へ同一Effectorを重複して設定できない
- 解放済みの同一Effectorを、異なるMode間で同時に使用できる
- PlayerはEffectorの並び順を変更できる
- Effectorの調整は自由な連続値ではなく段階式とする
- 空slotを含む構成と、同じ構成を持つ複数Modeを有効なSave対象として扱う

具体的なEffectorカタログ、各Level、段階上限、入手方法、解放条件、およびMode全体の容量制限は将来仕様です。本ページでは未決のEffector名・効果・数値を作りません。

## 接続順

Effectorはslotの左から右へ順次処理します。

```text
通常値・通常の音響設定
↓
slot 1
↓
slot 2
↓
slot 3
↓
Mode適用後の結果
```

空slotは処理を行わず、次のslotへ進みます。Playerが並び順を変更した場合は、変更後の左から右の順序を音とGameplayの双方が参照します。

Effector chainをPalette Bulletの通常値へ接続した後にConductを適用する高レベルな計算順は、統合ページを正本とします。具体的な加算、乗算、変換、上限、丸め、および各値への適用可否は、個別EffectorとTuningの将来仕様で定義します。

## 音とGameplayの共通設定

音とGameplayは、保存済みMode構成の同じ安定した設定を参照し、それぞれの出力を決定します。

```text
同じMode構成
├─ Audio処理
└─ Gameplay値・挙動の算出
```

実際に出力された音声波形、Audio出力遅延、音量、またはDSP結果からGameplay値を逆算しません。Gameplay結果から無関係な音を後付けする方式にもせず、双方の共通入力をMode構成とします。

## 編集可能な場面

Mode 2～4は、拠点の専用機能でだけ編集します。

次の間は編集できません。

- Stage攻略中
- 戦闘中
- Room移動中（Room移動演出中を含む）
- Pause中

Stage攻略中に拠点相当の編集画面を開いたり、Pause画面からMode構成を変更したりしません。Stage中に行えるのは、保存済みMode 1～4から使用Modeを選択する操作だけです。

## Save Dataとライフサイクル

Mode 2～4について、少なくとも次をSave Dataへ保存します。

- 各slotの空／使用状態
- 設定したEffector
- Effectorの並び順
- 段階式の調整値

保存済み構成はStage開始、通常Room移動、およびRetryで失いません。これらの境界で一時的なcurrent Modeやpending Modeを初期化する場合も、Mode 2～4の構成とは分離します。

Save Dataの具体的なschema、version migration、保存時刻、slot／EffectorのIdentifier形式は、将来のSave Data正本へ委譲します。静的MusicChart DefinitionやStage挑戦中の一時Runtime状態を、Mode構成のSave Dataとして使用しません。

## プロトタイプ供給

拠点機能が対象外のプロトタイプでは、企画側が用意した固定プリセットによってMode 2～4を供給します。

固定プリセットは本ページの構成契約に従いますが、PlayerがStage攻略中に編集できることを意味しません。具体的なプリセット内容とEffectorカタログは、プロトタイプ／Tuningの後続仕様で定義します。

## 責務境界

| 内容 | 正本 |
| --- | --- |
| Mode 2～4のslot、重複、並び順、段階、編集場面、保存対象 | **本ページ** |
| Mode 1の初期仕様、Stage中のMode選択、cooldown、snapshot、適用順 | [Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct) |
| Stamina自然回復の開始条件、待機、禁止状態、MaxStamina | [Playerステータス](/spec/player/player-status) |
| Palette Bulletの通常値、Direct Contact、Explosion、RGB payload | [パレットブレット](/spec/combat/palette-bullet) |
| 調整値の管理方法 | [プランナー向け調整パラメータ管理](/spec/common-technology/planner-tuning-parameter) |
| Save Dataの全体方針と将来の正本入口 | [ゲーム概要](/game-overview)（具体schema・version migrationは将来仕様） |

## 未決事項

- 具体的なEffectorカタログと正式名称
- Effectorごとの効果、Level、段階上限
- Effectorの入手方法と解放条件
- Mode全体の容量制限
- 具体的な加算、乗算、変換、上限、丸め
- プロトタイプ用固定プリセットの内容
- Save Dataの具体schema、migration、Identifier

## 関連ページ

- [Player概要](/spec/player/)
- [Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)
- [Playerステータス](/spec/player/player-status)
- [パレットブレット](/spec/combat/palette-bullet)
- [プランナー向け調整パラメータ管理](/spec/common-technology/planner-tuning-parameter)
- [ゲーム概要](/game-overview)

<PageRelations />
