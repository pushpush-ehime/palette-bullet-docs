---
title: 段階1後の終了・Result・Retry・Windows短時間確認
description: 段階1の合格結果を引き継ぎ、Clear／Game Over候補からResult・RetryまでのLifecycleとWindows64での早期動作を確認します。
pageType: task
taskId: PB-TASK-0046
category: プロトタイプ
order: 220
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/game/
  - /spec/combat/
  - /spec/ui/
---

# PB-TASK-0046｜段階1後の終了・Result・Retry・Windows短時間確認

## 目的と実現する動作

PB-TASK-0045で独立して記録した「通常Charge→発射→Enemy浄化」の段階1結果を引き継ぎ、Clear／Game Over候補から終了集約、Result、RetryまでのLifecycleを実物同士で確認します。既存のWindows Build経路でも短時間確認し、Editorだけで成立する参照切れを早期に見つけます。

このタスクの成否でPB-TASK-0045の段階1結果を上書きしません。Windows64確認は開発途中の早期確認であり、固定プリセットMode／Conduct、Enemy攻撃、Player死亡等を追加した後の段階3最終配布受入とは区別します。

## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C02・C03・C11・C12・C16〜C19、およびD03の終了・再試行境界。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠1（Battle／共通接続）の実装担当。担当決定済み。個人の割当は非公開のチーム管理で扱う。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は正式着手前に決める。
- 相互確認：各Ownerのcleanup、Stage、Game、Result UI、Player入力、Build経路の担当と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。PB-TASK-0018の引渡しgateと、下記の先行タスクを満たした後に着手する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名はPB-TASK-0018が引き渡したassemblyの依存方向へ合わせます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 共有 | `Assets/PaletteBullet/Prototype/Scenes/PrototypeBattle.unity` | 段階1の実接続へ終了・Result・Retryを追加する |
| 共有 | `Assets/PaletteBullet/Prototype/Runtime/Battle/` | 結果確定、cleanup集約、新Battle生成の実接続 |
| 共有 | `Assets/PaletteBullet/Prototype/Runtime/UI/` | Result表示、lock、Continue／Retry入力 |
| 共有 | `Assets/PaletteBullet/Prototype/Tests/` | 終了境界の回帰、失敗注入、Retry後の残留確認 |
| 参照 | [PB-TASK-0017：Windows Build](/tasks/game/pb-task-0017) | 既存のWindows64 Build経路を再利用する |

## 実装範囲

- PB-TASK-0045と同じ採用Commit・設定から開始し、実Enemy浄化からStageのClear候補、Gameの最終結果、必須Ownerのcleanup、Result解禁までを接続する。
- 正常Game Over候補は検証用注入で結果確定、cleanup、Game Over Result、Retryを確認する。この注入は実Player被弾・死亡の完成には数えない。
- Result lock中の入力、二重結果候補、同一frameの優先、Pause、出現／Arpeggio途中終了、旧Battle通知、cleanup失敗と遅延完了を確認する。D03の失敗中断を正常Game Overや通常Retryへ変換しない。
- Retryでは新しいBattle IDで全Ownerを準備し直し、旧Battleの予約・生成物・購読・入力待ち・遅延通知が新Battleへ作用しないことを確認する。
- PB-TASK-0017の既存Build経路を使い、Windows64で起動、入力、音、通常Charge、発射、浄化、Result、Retry後の再操作を短く確認する。Build元Commitと既知の未実装を記録する。

今回の範囲外：段階1の再定義、プロトタイプ全機能の完了宣言、Enemy攻撃／Player被弾・死亡の実接続、Parry／Wildcard変換、固定プリセットMode／Conduct、最終Windows配布受入。

## 依存と受け渡し

先行タスク：[PB-TASK-0017](/tasks/game/pb-task-0017)、[PB-TASK-0027](/tasks/prototype/pb-task-0027)、[PB-TASK-0028](/tasks/prototype/pb-task-0028)、[PB-TASK-0045](/tasks/prototype/pb-task-0045)

PB-TASK-0045の段階1結果、使用Commit、Prefab・設定、既知の未接続を受け取ります。終了・Result・Retryの途中をFakeで代用した場合はケースごとに明記し、実接続の合格には数えません。実Player死亡など後続範囲の候補注入は、注入した境界より後ろだけを確認した結果として記録します。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| PB-TASK-0045・各Owner → 統合窓口 | 段階1結果、採用PR／Commit、cleanup入口、Prefab・設定参照、既知の未接続 |
| Stage／Player候補 → Game・Combat | Battle ID付きClear／Game Over候補。最終結果はGame、終了集約はCombatが所有する |
| Game／Combat → Result UI・各Owner | 確定variant、終了要求・結果、Result lock／解禁、新Battle ID |
| 本タスク → PB-TASK-0024・段階3 | Editor／Windowsの実結果、Fake注入の識別、Build元Commit、残る未実装 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 実Enemyを浄化してClear条件を満たす | Clearが一度だけ確定し、全必須cleanup成功後にClear Resultを解禁する |
| 正常Game Over候補を注入する | Game Overが一度だけ確定し、実死亡を確認済みとは扱わずGame Over Resultを解禁する |
| Result lock中にContinue／Retryを連打する | 入力を保存・遅延実行せず、解禁後の有効な要求だけを一度受け付ける |
| Game Over ResultからRetryして通常Chargeから浄化まで再操作する | 新Battle IDで再準備し、旧Battleの状態や遅延通知が作用しない |
| 必須cleanup失敗と遅延成功を注入する | 理由と再起動案内を保って中断し、ResultやRetryを解禁しない |
| Windows64 BuildをUnityなしで起動する | 起動・入力・音・浄化・Result・Retry後の再操作を確認でき、Build元Commitを追える |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] PB-TASK-0045の段階1結果と、本タスクのLifecycle／Windows結果を別々に記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

上表のEditor操作確認、終了・Retryの接続回帰、Windows64の短い確認を行います。Unity 6000.3.16f1、使用Commit、設定、ログ、実／Fake境界、Build元Commit、段階1から増えた確認範囲をPRへ記録します。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
