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

ゲームのコンセプト、コア体験、およびプロトタイプで扱う機能の上位方針は
[ゲーム概要](/game-overview)を正本とします。

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
- [ ] EnemyへRGB Damageを与えて浄化できる
- [ ] 邪音玉のパリィから万能シャオンダマ変換まで実行できる
- [ ] Clear、Game Over、Result、Retryの両経路を確認できる
- [ ] Retry後に前回BattleのRuntime状態を持ち越さない
- [ ] Unity EditorのPlay Modeで主要フローを確認できる
- [ ] Windows 64-bit Standalone Buildが成功する
- [ ] Windowsビルドで主要フローを確認できる
- [ ] 確認用ビルドをチームメンバーへ配布できる
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

現時点で、プロトタイプの実装範囲と完成判定を妨げる未決事項はありません。

性能確認に使用する基準PCの機種は固定しません。
確認時に実行環境を記録し、60fps目標の達成状況を判断します。

具体的な仮パラメータ、仮素材、UIレイアウト、および演出内容は、
各担当仕様または実装タスクで決定できます。

## 関連タスク

<PageRelations />
