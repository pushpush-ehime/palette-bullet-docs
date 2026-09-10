---
title: プロトタイプ共通仕様・完成条件
description: Palette Bulletプロトタイプの対象環境、実装範囲、Windowsビルド、性能目標、確認用ビルド、完成判定を定義する
pageType: spec
category: ゲーム全体
categoryOrder: 10
order: 10
status: 仮仕様
relatedTasks: []
---

# プロトタイプ共通仕様・完成条件

## ページ概要

- 対象担当：全担当
- 配置先：`docs/spec/game/prototype.md`
- 関連ページ：
  - [ゲーム概要](/game-overview)
  - [ゲーム全体](/spec/game/)
  - [Player概要](/spec/player/)
  - [戦闘](/spec/combat/)
  - [BGM](/spec/bgm/)
  - [チャージシステム](/spec/draw-system/)
  - [シャオンダマ](/spec/shaondama-music/)
  - [敵](/spec/enemy/)
  - [UI](/spec/ui/)

## 目的

本ページでは、Palette Bulletのプロトタイプについて、
実装対象、対象環境、Windowsビルド、性能目標、確認用ビルド、動作確認方法、および完成条件を定義します。

プロトタイプの目的は、完成版の全要素を作ることではありません。

1つのBattleを開始から終了までプレイし、
音楽によるAttackEvent予告、シャオンダマの選択とCharge、Palette Bulletによる攻撃、
敵の浄化、パリィによる万能シャオンダマ変換、Clear／Game Over、Result、Retryまでを通して、
Palette Bullet固有のコア体験が成立するかを確認することを目的とします。

ゲームのコンセプトとコア体験は[ゲーム概要](/game-overview)を正本とします。
今回のプロトタイプで扱う機能、段階、環境、完成判定は本ページを正本とし、ゲーム概要にはその要約と参照先を置きます。

## 今回合意した完成方針 {#completion-policy}

2026-09-10のプロトタイプ完成に向けた協議で、次の2点を決定しました。

1. 完成確認は、チーム内でWindows配布ビルドを受け取り、Unityを起動せずに主要フローを操作する受入確認まで含めます。
2. 通常のCharge→発射→Enemy浄化を最初に通し、その後、今回のプロトタイプ完成までに固定プリセット版のMode／Conductを追加します。

この節は今回の対象範囲と着手順の正本です。ゲームのコア体験は[ゲーム概要](/game-overview)、Mode／Conductの操作・適用時点・効果・ライフサイクルは[Mode／Conduct仕様](/spec/player/player-action-mode-change-and-conduct)を参照します。同じ挙動を本ページで別定義しません。

### 段階ごとの到達点 {#prototype-milestones}

| 段階 | 操作して確認する到達点 | 判定の範囲 |
|---|---|---|
| 1：通常攻撃の接続 | 検証用Battleで通常シャオンダマを選択してChargeし、AttackEventの発火時にPalette Bulletが発射され、EnemyへRGB Damageを与えて浄化できる | 最初の接続確認。Mode／Conductの追加前に通常攻撃の経路を成立させる |
| 2：今回の対象機能を接続 | 段階1の経路へ固定プリセット版Mode／Conductを追加する。既存の対象機能であるパリィ・万能変換、Clear／Game Over、Result、Retry等も接続し、主要フローを通して確認できる | プロトタイプ対象機能の統合確認。Mode／Conductの具体的なプリセット内容は後述の未決事項として管理する |
| 3：Windows配布受入 | チーム内の受入確認担当が確認用ビルドを取得・展開し、Unityなしで主要フローと再試行を操作して結果を記録できる | 本ページの完成条件を満たす最終受入。Build成功や段階1の成功だけでは完了にしない |

各担当の独立した実装、仮入力を使った検証、受入テスト計画の作成は、依存先の完成を待たずに進められます。ただし、段階1の接続合格には実際のCharge、Allocation、発射、RGB Damage、浄化の結果を用います。仮入力で代用した接続は記録し、接続済みとして数えません。

段階1では、確認担当が次の順に操作し、結果を追跡できることを確認します。

1. 検証用Battleを開始し、使用するBGM／MusicChart、通常シャオンダマ、Enemyを確認する。
2. 通常シャオンダマを選択し、有効なChargeを成功させる。対象AttackEvent occurrenceへのAllocationとReservedへの移行を確認する。
3. 対応するAttackEventの発火を待つ。ReservedのシャオンダマがPalette Bullet化され、発射されることを確認する。
4. Enemyへの命中とRGB Damageを確認し、浄化条件を満たすまで繰り返して浄化を確認する。
5. 使用Commit、操作手順、期待結果、実際の結果、未接続箇所を記録する。

段階1のScene、検証用素材、仮パラメータ、機能ごとの実装分担は後続のタスク分担で確定します。日付や担当者をこの段階表から推定して割り当てません。

### 段階1の窓口 {#first-milestone-owners}

仕様書の執筆、接続表などの仕様整理、機能間の受け渡し条件と完了条件の決定は、今回の完成方針を決める依頼者が進めます。Codexは既存仕様・提供済み基盤との照合と未決事項の整理を支援し、決まった仕様を、編集対象・受け渡し・検証方法が具体的な実装タスクへ分解します。

プログラマー班には、その仕様書と実装タスクを読んで、コード・保存グラフ・必要なアセット接続を実装し、動作検証とPR提出を行ってもらいます。接続表や仕様書の作成を、実装着手前にプログラマーへ要求する提出物にはしません。実装中に見つかった仕様の不足・矛盾は仕様側へ報告し、判断した内容を正本へ反映します。

| 役割 | 今回確認した担当 | 担当範囲 |
|---|---|---|
| 接続実装の取りまとめ | 下條 | 仕様書と割り当てられた実装タスクに基づき、通常のCharge→発射→浄化のコード・グラフ接続と動作検証を進め、各機能担当との実装上の接続確認を取りまとめる。具体的な機能別分担は後続で確定する |
| 操作結果の確認 | 今回の完成方針を決める依頼者（タスクへ登録する担当者名は確認中） | 実際の操作結果が意図した体験と合格条件に合うか確認する |
| コードのPR確認 | 未定 | コード・グラフ変更のレビュー担当は、操作結果の確認担当と区別して後続で決める |

具体的な作業時間と期限は未確定です。共有Scene／Prefab／Input／共通グラフ全体の所有者やマージ権限は、この窓口の割当だけでは確定しません。

### 提供済み基盤との境界 {#foundation-baseline}

開発基盤の引き渡し時点は、ゲーム本体のmain `55d050ad9760b27bb61415a0f7d2324ee9a50bec`、Unity `6000.3.16f1`です。提供範囲と各ツールの入口は[固定コミットの開発基盤ガイド](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Docs/DEVELOPMENT.md)を正本とします。後続の実装・受入では実際に使用したCommit SHAを記録します。

基盤引き渡し時の報告では、Editor 191/191、PlayMode 76/76、Windows64 Development Buildおよび各採用PRのCIが成功しています。これは開発基盤の統合・検証結果であり、プロトタイプ全機能の完成や全ツールの人間受入を示しません。

Playerは採用済みの標準Unity Visual Scriptingを使用します。保存グラフ、移動・Jump・Dash・Animator、六班の接続雛形は提供済みですが、雛形から先の各機能実装と本体Game／Battle／Combatへの接続は別途必要です。[旧Player基盤ページ](/spec/common-technology/action-state-manage)の独自Runtimeを再導入しません。

MusicChart静的制作、Code Catalog、Planner Tuning Coreなどの提供済み基盤を、新規実装タスクとして重複起票しません。Runtime抽選、Excel連携、Migration、全GameplayへのTuning接続などの未実装機能は、未実装であることだけを理由に今回の必須条件へ追加しません。必要性は完成条件と採用する検証内容から個別に判断します。

ローカルの作業コピー、キャッシュ、検証記録は保持します。新しい検証用コピーが必要な場合も、既存の作業環境を消して準備しません。

## プレイヤーから見た挙動

プロトタイプは、拠点やステージ選択を経由せず、起動後に検証用Battleを開始します。

Playerはキーボード・マウスを使用し、次の一連の流れを確認できます。

```text
Windows実行ファイルを起動する
↓
検証用Battleを開始する
↓
音楽とAttackEventの予告を確認する
↓
世界内のシャオンダマを選択してChargeする
↓
Palette Bulletを発射してEnemyを浄化する
↓
邪音玉をパリィして万能シャオンダマへ変換する
↓
ClearまたはGame Overになる
↓
Resultを確認する
↓
Retryして新しいBattleを開始する
```

仮素材、仮UI、仮パラメータを使用できますが、
プレイヤーが現在の状態、次に行う操作、Battle結果、およびRetry方法を判断できなければなりません。

## 詳細仕様

### プロトタイプの開始範囲

- プロトタイプはBattle用Sceneまたは同等の検証用開始地点から直接開始する
- 拠点、ステージ選択、ストーリー導入は経由しない
- 起動後、特別な開発操作を行わなくてもBattle開始まで進める
- Unity Editor専用のボタンやInspector操作を、通常のプレイ開始手順として要求しない
- Battle開始前に、対象BattleのPlayer、Enemy、MusicChart、シャオンダマ供給、および必要なRuntime状態を初期化する

### 対象環境

| 項目 | 仕様 |
|---|---|
| 対象OS | Windows |
| Build Target | Windows 64-bit Standalone |
| 入力デバイス | キーボード・マウス |
| 基準解像度 | 1920×1080 |
| 目標フレームレート | 60fps |
| Unity Editor | Play Modeで主要フローを確認できること |
| Windowsビルド | Unityを起動せずに主要フローを確認できること |

Gameplay処理は物理キーを直接参照せず、入力Actionまたは同等の抽象化を介して実行します。
ゲームパッド対応はプロトタイプ対象外ですが、将来ゲームパッドを追加する際にGameplayロジックを書き直す構造にはしません。

### プロトタイプに含める機能

- Battleの直接開始
- Playerの基本移動
- カメラ操作
- ジャンプ
- ダッシュ
- 照準
- マーカーによる攻撃対象の指定
- 通常シャオンダマの生成・浮遊・選択
- シャオンダマのChargeと攻撃への割り当て
- AttackEventに合わせたPalette Bulletの発射
- 固定プリセット版Mode／Conduct（通常攻撃の接続確認後に追加。[今回の完成方針](#completion-policy)と[詳細仕様](/spec/player/player-action-mode-change-and-conduct)を参照）
- Palette BulletによるEnemyのRGB Damageと浄化
- Enemyによる邪音玉の発射
- Playerによる邪音玉のパリィ
- パリィした邪音玉の万能シャオンダマへの変換
- Clear判定
- Game Over判定
- Clear／Game OverのResult表示
- Retry
- Gameplayに必要な最小限のUI
- 1つ以上の検証用BGM・MusicChart
- 1種類以上の検証用Enemy

### プロトタイプに含めない機能

- 拠点
- ステージ選択
- 複数ステージによる本編進行
- ストーリー・会話・拠点コンテンツ
- 複数種類のEnemyやBoss
- ゲームパッド対応
- 入力割当の変更機能
- 最終品質のAnimation・VFX・SE
- 詳細な設定画面
- セーブ・ロード
- 製品版向けのバランス調整
- 製品版向けの最終UI
- 製品版向けのアクセシビリティ対応

### 仮素材・仮パラメータ

プロトタイプでは、次の要素に仮素材または仮値を使用できます。

- Player、Enemy、ラジクジラ、シャオンダマのModel
- Animation
- VFX
- SE
- UIの見た目
- Damage、HP、移動速度、Charge時間などの調整値
- Enemy数、Spawn位置、AttackEvent間隔などのBattle調整値

仮素材であっても、Gameplay上で別の役割を持つ対象を区別できなければなりません。

仮パラメータはコードへ分散した固定値として埋め込まず、
仕様で定められた調整箇所または同等の一元管理可能な場所から変更できる状態を基本とします。

### Windowsビルド要件

プロトタイプ完成判定には、Unity EditorのPlay Mode確認だけでなく、Windowsビルドの成功を必須とします。

Windowsビルドは、少なくとも次を満たします。

- Windows 64-bit StandaloneとしてBuildできる
- Compile ErrorまたはBuild Errorがない
- Build対象Sceneが不足していない
- Buildに必要なAsset、Shader、設定ファイル等が、作業者のローカル環境だけに依存していない
- Buildした実行ファイルをUnity Editorを起動せずに開始できる
- 起動後に検証用Battleを開始できる
- Clear、Game Over、Result、Retryまで実行できる
- Windowsビルド固有の入力不能、表示欠落、参照切れ、例外停止がない
- Build元のGit Commit SHAを記録できる

Codexや各担当者の作業フォルダにだけ存在する未コミットファイルへ依存しないことを確認するため、
確認用ビルドは原則として、Gitへ保存された特定Commitの内容から作成します。

### 確認用ビルド

確認用ビルドとは、UnityやCodexを使用しないチームメンバーでも、
Windows上で展開・起動し、プロトタイプを操作確認できる実行ファイル一式です。

確認用ビルドは、Windowsビルドに必要なファイルを欠落なくまとめ、ZIP形式または同等の配布可能な形式にします。

少なくとも次を含めます。

- Windows実行ファイル
- 実行に必要なDataフォルダ、DLL、設定ファイル等
- 操作方法
- 確認してほしい項目
- 既知の問題
- Build元Commit SHA
- 使用したUnity Version
- Build日時
- Development Buildか通常Buildかの区別

受け取ったメンバーがUnityプロジェクトを開かなくても、
展開、起動、Battle操作、ClearまたはGame Over、Retryまで確認できることを完成条件とします。

### 性能目標

Windowsビルドで、通常のBattle進行中に60fpsを目標とします。

性能確認では、次を記録します。

- CPU
- GPU
- メモリ容量
- OS
- 解像度
- Quality設定
- VSync設定
- Build種別
- 使用したCommit SHA
- 確認したBattle内容
- 平均フレームレートまたはフレーム時間
- 継続的なフレーム低下が発生した場面

基準解像度は1920×1080とします。

通常Battle中の平均フレームレートが60fps以上であることを目標とし、
60fps未満の状態が継続する場合は、発生条件と原因候補を記録して修正対象とします。

VSyncで表示が60fpsに固定されていることだけを、性能達成の証拠にはしません。
必要に応じてUnity Profiler、Frame Debugger、フレーム時間表示、または同等の計測方法を使用します。

Development BuildやProfiler接続による負荷が計測結果へ影響する場合は、
通常Buildでも再確認します。

テストに使用する基準PCの機種は本仕様で固定しません。
代わりに、確認結果ごとに上記の実行環境を必ず記録します。

### エラー・警告の扱い

- Compile ErrorとBuild Errorは0件とする
- 通常操作で未処理例外または進行不能になるErrorを発生させない
- 同じError Logが毎フレーム繰り返される状態を認めない
- 仕様上許容するWarningがある場合は、原因、影響、対応予定を確認結果へ記載する
- デバッグ表示や開発用Logを残す場合も、通常プレイと性能確認を妨げない

### 動作確認項目

少なくとも次をUnity EditorとWindowsビルドで確認します。

1. プロトタイプを起動する
2. 検証用Battleが開始される
3. Playerをキーボード・マウスで操作できる
4. BGM／MusicChartとAttackEventが進行する
5. 通常シャオンダマが生成され、選択可能になる
6. シャオンダマをChargeし、Palette Bulletを発射できる
7. Palette BulletによってEnemyへRGB Damageを与え、浄化できる
8. 邪音玉をパリィし、万能シャオンダマへ変換できる
9. Clear条件を成立させ、Clear Resultを表示できる
10. Game Over条件を成立させ、Game Over Resultを表示できる
11. ResultからRetryできる
12. Retry後のBattleへ前回Battleの状態・参照・入力待ち・生成物が残っていない
13. Retry後も同じ主要フローを再実行できる
14. Windowsビルドで通常Battle中の性能を計測できる

### 完成条件

- [ ] ゲーム概要で定義したプロトタイプ対象機能が実装されている
- [ ] 拠点やステージ選択を経由せず、検証用Battleを直接開始できる
- [ ] キーボード・マウスで主要Battle操作を行える
- [ ] 通常シャオンダマの生成、選択、Charge、Palette Bullet発射まで実行できる
- [ ] 固定プリセット版Mode／Conductの操作・適用結果を詳細仕様に沿って確認できる
- [ ] EnemyへRGB Damageを与えて浄化できる
- [ ] 邪音玉のパリィから万能シャオンダマ変換まで実行できる
- [ ] Clear、Game Over、Result、Retryの両経路を確認できる
- [ ] Retry後に前回BattleのRuntime状態を持ち越さない
- [ ] Unity EditorのPlay Modeで主要フローを確認できる
- [ ] Windows 64-bit Standalone Buildが成功する
- [ ] Windowsビルドで主要フローを確認できる
- [ ] 確認用ビルドをチームメンバーへ配布できる
- [ ] チーム内の受入確認担当が、配布ビルドを取得・展開し、Unityなしで主要フローを操作した結果を記録している
- [ ] 確認用ビルドに操作方法、確認項目、既知の問題、Commit SHA、Unity Versionが記載されている
- [ ] 記録した基準PC・1920×1080で、通常Battle中の60fps目標を確認している
- [ ] Compile Error、Build Error、通常操作を妨げる未処理例外がない
- [ ] 未達項目や既知の問題が隠されず、確認結果に記録されている

## 状態別の挙動

| 状態 | 必要な挙動 |
|---|---|
| 起動 | 検証用Battleを開始できる |
| Battle準備 | Player、Enemy、MusicChart、シャオンダマ供給等を初期化する |
| Battle中 | 移動、Charge、攻撃、パリィ、Enemy攻撃、浄化を実行できる |
| Pause | プロトタイプでPauseを実装する場合のみ、ゲーム全体仕様の停止契約に従う |
| Clear | Clear Resultを表示し、Game Over表示とRetry専用経路を開始しない |
| Game Over | Game Over Resultを表示し、Retryを受け付ける |
| Retry | 旧Battleを再利用せず、新しいBattleとして初期化する |
| Windowsビルド | Unity Editor外でも同じ主要フローを確認できる |

## 他システムとの接続

| システム | プロトタイプで確認する接続 |
|---|---|
| Game | Battle開始、結果確定、Result、Retry |
| Stage | Enemy Ready、objective、Clear候補 |
| Player | 入力、State、Action、Damage、Dead |
| Camera | Battle操作に必要な追従・照準表示 |
| BGM／MusicChart | 音楽時間、AttackEvent、シャオンダマ生成内容 |
| ラジクジラ | 通常シャオンダマの世界内への出現 |
| シャオンダマ | 浮遊、選択、Reserved、消費、万能変換後の存在 |
| Charge／Allocation | 選択したシャオンダマの攻撃への割り当て |
| Combat | 攻撃、Hit、Damageの受付 |
| Enemy | 邪音玉の発射、RGB Damage、浄化、Clear対象状態 |
| UI | 必要情報、Result、Retry操作の表示 |

各システムの内部仕様は、それぞれの正本ページで定義します。
本ページは、プロトタイプ完成時に横断して確認すべき接続と完成条件を定義します。

## 例外・禁止事項

- Unity Editorで動作することだけでプロトタイプ完成と判定してはいけない
- WindowsビルドのCompile ErrorまたはBuild Errorを既知の問題として残したまま完成扱いにしてはいけない
- 作業者のローカル環境にだけ存在する未コミットAssetへ依存してはいけない
- Windowsビルドで欠落するEditor専用APIやEditor専用AssetをGameplay必須経路へ使用してはいけない
- VSyncで60fps表示になっていることだけを性能達成の証拠にしてはいけない
- 計測に使用したPC、解像度、Quality設定、Build種別を記録せずに性能達成を宣言してはいけない
- Retry時に前回BattleのEntity、Event、入力、Reserved状態、Damage通知、Result状態等を再利用してはいけない
- 仮素材であることを理由に、対象の役割やGameplay状態を判別できない表示にしてはいけない
- ゲームパッド、拠点、ステージ選択等の対象外機能を、プロトタイプ完成の必須条件へ暗黙に追加してはいけない
- 確認用ビルドへ秘密情報、個人用パス、Token、開発用Credentialを含めてはいけない

## パラメータ

| 項目 | 値・扱い |
|---|---|
| 対象OS | Windows |
| Build Target | Windows 64-bit Standalone |
| 入力 | キーボード・マウス |
| 基準解像度 | 1920×1080 |
| 目標フレームレート | 60fps |
| 検証用BGM・MusicChart | 1つ以上 |
| 検証用Enemy | 1種類以上 |
| Battle範囲 | 1つのBattleを開始からResult・Retryまで |
| 仮素材 | 使用可 |
| 仮パラメータ | 使用可。ただし変更箇所を一元管理可能にする |

## 未決事項

今回合意した2点は[完成方針](#completion-policy)を参照します。次の具体化は未決であり、担当や期限を決定済みとして扱いません。

- 段階1に使用するScene、検証用BGM／MusicChart、Enemy、仮パラメータ
- Mode 2～4の固定プリセットの効果・数値・音の違い、および確認ケース
- 各機能の主担当・確認担当、共有Scene／Prefab／Input／共通グラフの取りまとめ担当（段階1の窓口は上記のとおり）
- 担当間の受け渡し、接続確認の責任者、仕様判断・PR確認・マージの窓口
- Windows配布受入を行うメンバー・実行PC・配布先・実施時期
- Runtime抽選や追加の制作支援機能について、今回の検証内容から必要と判断する範囲

受入ケースは既存の[PB-TASK-0024](/tasks/game/pb-task-0024)を更新して整理します。担当や進捗は[Notionとの役割分担](/guide/notion-link)に従って管理します。

性能確認に使用する基準PCの機種は固定しません。
確認時に実行環境を記録し、60fps目標の達成状況を判断します。

具体的な仮パラメータ、仮素材、UIレイアウト、および演出内容は、
各担当仕様または実装タスクで決定できます。

## 関連タスク

<PageRelations />
