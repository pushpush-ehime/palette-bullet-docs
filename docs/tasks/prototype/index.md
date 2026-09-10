---
title: プロトタイプ
description: 通常Chargeから発射・浄化を最初に通す6枠の実装タスクと、担当間の統合確認
pageType: task-category
category: プロトタイプ
categoryOrder: 5
collapsed: false
---

# プロトタイプ

今回承認された6枠を、コード・保存VSグラフ・必要なアセットを実装できる単位へ分割したタスク一覧です。既存のPB-TASK-0018とPB-TASK-0023を更新・移動し、新規19件を加えた計21件です。

対象は[完成条件の段階1](/spec/game/prototype#prototype-milestones)「通常Charge→発射→Enemy浄化」と、それを支える開始・終了・Result・Retryの接続です。段階2の対象機能と段階3のWindows配布受入は後続に残ります。この一覧だけの完了をプロトタイプ全体の完成にはしません。

## 最初に着手するタスク {#first-task}

**[PB-TASK-0018：Battle開始・共通接続の最小実装](/tasks/prototype/pb-task-0018)**から始めます。Game発行Battle ID、準備／開始の入口、必要な共有型とFake Owner、共有Sceneを先に渡します。枠1の終了・Retryや全機能の完成を待ってから他の枠を開始する進め方にはしません。

仕様表の作成は実装担当への提出物にしません。プログラマーは仕様を読んでコード・グラフ・アセット接続を作り、動作確認してPRを提出します。仕様の不足は仕様判断窓口へ報告し、決まった内容を正本へ反映します。

## 枠別のタスクと引き渡し {#workstreams}

| 枠 | 枠内の着手順 | 主な引き渡し |
|---|---|---|
| 1：Battle／共通接続 | [0018：開始と最小接続](/tasks/prototype/pb-task-0018) → [0027：結果・終了集約](/tasks/prototype/pb-task-0027) → [0028：Retry](/tasks/prototype/pb-task-0028)。[0029：Stage登録・Clear](/tasks/prototype/pb-task-0029)は0018後に並行可 | 全枠へ共通ID・入口・Fake。EnemyからStage、Combatを経てGameへ結果を渡す |
| 2：BGM／MusicChart Runtime | [0030：時計・Audio同期](/tasks/prototype/pb-task-0030) → [0031：occurrence・通知](/tasks/prototype/pb-task-0031) → [0032：発音・最小予告](/tasks/prototype/pb-task-0032) | 供給へ先読み情報、Chargeへ受付期間、攻撃解決へ発火とEntry、発射事実をAudioへ |
| 3：Shaondama／RadioWhale供給 | [0033：個体・予約・寿命](/tasks/prototype/pb-task-0033) → [0034：出現・制御移譲](/tasks/prototype/pb-task-0034) → [0035：先行生成・補充・Ready](/tasks/prototype/pb-task-0035) | Chargeへ選択対象、攻撃解決へReservedと現在位置、GameへSupply Ready |
| 4：Player／Camera／Aim／Marker | [0023：Stage・通常Camera](/tasks/prototype/pb-task-0023) と [0036：Player接続](/tasks/prototype/pb-task-0036) → [0037：Aim・Ray](/tasks/prototype/pb-task-0037) → [0038：Marker](/tasks/prototype/pb-task-0038) | Chargeへ入力・選択参照、攻撃解決へ現在Marker／Ray |
| 5：Charge／Allocation | [0039：Slot・予約関係](/tasks/prototype/pb-task-0039) → [0040：Click](/tasks/prototype/pb-task-0040) → [0041：Drag](/tasks/prototype/pb-task-0041) | 攻撃解決へ確定したoccurrence・Slot・Reserved関係。Charge成功時には発射しない |
| 6：攻撃解決／Palette Bullet／Enemy RGB | [0042：発射解決・消費](/tasks/prototype/pb-task-0042) → [0043：飛行・第一爆発](/tasks/prototype/pb-task-0043)。[0044：最小Enemy・RGB浄化](/tasks/prototype/pb-task-0044)は先行可 | Enemyへ最終RGB候補、Stageへ浄化の事実、Audioへ発射事実 |
| 担当間の統合 | [0045：段階1の実接続・Windows短時間確認](/tasks/prototype/pb-task-0045) | 枠1が共有Sceneを取りまとめ、各枠が自身の機能の不具合を修正する |

枠数は今回の作業分担のための整理です。既存Playerグラフの六班構成から担当者を転記したものではありません。

## 着手順と依存関係 {#sequence}

全タスクの優先度はAです。以下は着手の段階であり、人数・期限・作業時間の割当ではありません。

| 段階 | 進めること | 次へ渡す条件 |
|---|---|---|
| 最初 | 枠1の0018。0023は独立Sceneで先行可能 | 共通の型とFakeがコンパイルでき、Prepare／Ready／開始を確認できる |
| 並行実装 | 各枠の確定済みロジックをFakeとともに作る。枠1は0027〜0029を続ける | 下表の先行タスクから、使う入口とデータを受け取る |
| 部分接続 | 0030＋0031、0033＋0034＋0035、0036＋0037、0039＋0040、0042＋0043／0044を接続 | Fakeで確認した結果と実物接続の結果を区別する |
| 通し確認 | 0045でClickの実経路を先に通し、Drag・Arpeggio・Weak・拒否・終了・Retryを追加 | 通常攻撃の途中をFakeで代用せず、期待結果を追える |

依存は「必要な公開型・振る舞いを受け取る先」です。実装の調査や機能内部の確定ロジックまで、先行タスク全体の完了を待つ必要はありません。0045の依存だけは、段階1合格までに必要な実装一式を表します。

| タスク | 先行タスク |
|---|---|
| 0018・0023 | なし |
| 0027・0029・0030・0033・0036 | 0018 |
| 0028 | 0018・0027 |
| 0031 | 0018・0030 |
| 0032 | 0018・0030・0031 |
| 0034 | 0018・0033 |
| 0035 | 0018・0031・0033・0034 |
| 0037 | 0018・0023・0036 |
| 0038 | 0018・0036・0037 |
| 0039 | 0018・0031・0033 |
| 0040 | 0018・0036・0037・0039 |
| 0041 | 0018・0039・0040 |
| 0042 | 0018・0031・0039 |
| 0043 | 0018・0042 |
| 0044 | 0018・0029 |
| 0045 | 上記全タスクの実物接続を確認する |

例えば0042はMarkerや実Bulletの完成前でも、同じ契約のFakeでTarget snapshotと一度限りの消費を確認できます。相互に完成を待つ依存へ変更せず、実物へ差し替える確認を0045へ集めます。

## 担当と共有部分の窓口 {#owners}

| 役割・共有部分 | 窓口 | 割当状況 |
|---|---|---|
| 枠1の実装・全体接続、PrototypeBattle Scene | 枠1 | 最初の実装担当は決定済み。個人名は公開しない |
| 枠2・3・5・6の実装 | 各枠 | 個人未定 |
| 枠4の実装、Player Prefab・Input・共通グラフの取りまとめ | 枠4 | 個人未定。枠5等から共有部分の変更を受けて統合する |
| 機能専用グラフ・コード・Prefab | 対応する機能の枠 | 共有アセット以外は機能単位で実装する |
| 仕様の正本更新・ゲーム上の判断・操作結果の確認 | 完成方針・仕様の判断窓口 | 役割決定済み。実装担当へ仕様表作成を要求しない |
| コード／グラフのPR確認とmain反映 | レビュー・マージ窓口 | 未定。個人への正式配分前に決める |

実名・稼働時間・期限はチーム内の管理で扱います。未割当を既存の名簿や役職から推測して埋めません。枠1には初回接続と最終統合の負荷が集中するため、各枠はFake検証と自身の実装修正を持ち帰り、全修正を枠1へ集めない進め方にします。

## 既存タスクとの関係 {#existing-tasks}

| 既存タスク | 今回の扱い |
|---|---|
| PB-TASK-0018 | 同じIDで本カテゴリへ移動。開始を0018、終了・Resultを0027、Retryを0028、Stage接続を0029、通し確認を0045へ分割 |
| PB-TASK-0023 | 同じIDで本カテゴリへ移動。通常Camera・グレーボックスを維持し、Aim／Player接続は0036・0037へ分離 |
| [0019：BGMラフ・MIDI](/tasks/music-chart-scriptableobject/pb-task-0019) | 素材制作。0030〜0032のRuntimeコードと重複しない。確認用素材で先行可能 |
| [0020：RadioWhaleコンセプト](/tasks/radiowhale/pb-task-0020)、[0025：Enemyコンセプト](/tasks/enemy/pb-task-0025) | デザイン。0034・0044は仮素材で先行可能 |
| [0021：戦闘演出](/tasks/effects/pb-task-0021)、[0022：Result設計](/tasks/ui/pb-task-0022)、[0026：画面フロー](/tasks/ui/pb-task-0026) | 表現・UI設計の参照。実装タスクへ同じ設計作業を重複依頼しない |
| [0017：Windows Build](/tasks/game/pb-task-0017)、[0024：受入計画](/tasks/game/pb-task-0024) | 既存のBuild経路と受入計画を再利用。0045は段階1の短い確認、最終配布受入は段階3 |

提供済みの標準VS Player基盤、MusicChart制作ツール、Code Catalog、Planner Tuning Coreは再発行しません。新規タスクの「未実装」はゲーム本体の調査基準Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`との比較です。着手時点のmainへ同等機能が追加されていたら差分を更新します。

## 残る仕様・実装と配分前の確認 {#remaining}

| 残ること | 影響先・扱い |
|---|---|
| 共通APIの正確な公開名・型・呼出し順（Q01・Q03・Q04） | 0018の最小コードとFakeで先に具体化する。初回調査の技術提案を実装済みとはしない |
| 生成成功と予約消費の境界（Q05） | 0018で入口を共有し、0042で生成準備／一度限りの確定を実装・確認する |
| 応答しないOwnerの待機制限（Q06） | 0018で調整可能な検証設定と診断を持つ。失敗検出後の処置は決定済みD03を使う |
| 旧InitialTargetCountと最低保証設定の意味（Q07） | 0035で明示設定とRuntime参照を整える。旧保存値を無断で転用しない |
| 検証用Chart・Stage配置・各仮パラメータ | 仮素材・明示設定で実装可能。操作確認で採用値を確認する。日時・値を決定済みとして補完しない |
| 枠2〜6の個人、コード確認担当、マージ担当、稼働時間 | チーム内で決める。タスク件数が同数でも工数が均等とは判断しない |

後続のプロトタイプ必須範囲として、Enemy攻撃／邪音玉、Player被弾・死亡、Parry／万能変換、固定プリセットMode／Conduct、必要なUIとWindows配布受入を残します。Parryの任意減速は無効化できるD02に従います。これらの詳細タスクは、次の範囲確認を経て既存タスクと照合・追加します。今回の21件へ未確認のプリセット内容や担当者を入れません。

点検時点では先行タスクの循環はありません。状態の正本は[共通接続仕様の所有者一覧](/spec/common-technology/feature-connections#owners)へ集約し、本カテゴリでは作業窓口だけを定義します。Reserved消費／解放は攻撃解決、個体状態はShaondama、浄化はEnemy、objectiveはStage、結果はGame、終了集約はCombatのままです。

## 参照する正本

- [プロトタイプ完成条件](/spec/game/prototype)
- [機能間の接続契約・共通ルール](/spec/common-technology/feature-connections)
- [現行Player Action／State基盤](/spec/common-technology/action-state-manage)
- [提供済み基盤の開発ガイド](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/DEVELOPMENT.md)
