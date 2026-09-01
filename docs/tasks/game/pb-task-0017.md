---
title: Windowsビルド基準・確認用ビルド作成
description: 現在のUnityプロジェクトから再現可能なWindows 64-bit Buildを作成し、Unityを持たないメンバーが確認できるZIPとBuild記録を整備する
pageType: task
taskId: PB-TASK-0017
category: ゲーム全体
order: 10
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/game/
---

# PB-TASK-0017｜Windowsビルド基準・確認用ビルド作成

## タスクの目的

Palette Bulletの現在のUnityプロジェクトについて、
特定のGit Commitから再現可能な手順でWindows 64-bit Buildを作成し、
UnityやCodexを使用しないチームメンバーが展開・起動できる確認用ZIPを用意します。

現在のプロジェクトはUnity Editor用の開発支援機能とState Graph基盤が中心であり、
Build Settingsには`Assets/Scenes/SampleScene.unity`だけが登録されています。

本タスクでは、Gameplay実装を始める前に、現在のコード・Package・Asset・Project Settingsが
Windows Buildを阻害しないことを確認し、後続タスクが継続して利用できるBuild基準を作ります。

## 完成時にできるようになること

- Unity `6000.3.16f1`で現在のプロジェクトを開き、Compile状態を確認できる
- 特定Commitの内容からWindows 64-bit Standalone Buildを作成できる
- Build Settingsに登録されたSceneをUnity Editor外で起動できる
- Build操作を担当者の記憶だけに依存せず、再現可能な手順として実行できる
- Build元Commit SHA、Unity Version、Build設定、Build結果を追跡できる
- Windows実行ファイル一式をZIP化できる
- 確認用ZIPをGoogle共有アカウントのストレージへ保存できる
- Unityを持たないチームメンバーがZIPを展開し、実行ファイルを起動できる
- 小規模なCompile／Build阻害を修正し、大規模な問題を後続タスクとして切り分けられる

## 関連する仕様

<PageRelations />

実装・確認時は、特に[プロトタイプ共通仕様・完成条件](/spec/game/prototype)の以下を正本として確認してください。

- 対象OSとBuild Target
- Windowsビルド要件
- 確認用ビルド
- エラー・警告の扱い
- 例外・禁止事項

本タスクはプロトタイプ全機能の完成判定ではなく、
後続のGameplay実装を接続できるWindows Build基準を作るタスクです。

## 実施内容

### 1. Build元の状態を記録する

作業開始時に、少なくとも次を記録します。

- Repository
- Branch
- Commit SHA
- Working TreeがCleanか
- Unity Version
- OS
- 使用したBuild Target
- Scripting Backend
- Build種別

本タスクの基準Unity Versionは、現在の`ProjectVersion.txt`および開発環境検査と同じ`6000.3.16f1`です。

異なるUnity VersionでAssetやProject Settingsを保存し直さないでください。

### 2. Package・Compile状態を確認する

Unityでプロジェクトを開き、Package Import完了後に次を確認します。

- Package解決が完了する
- C# Compile Errorがない
- asmdef参照エラーがない
- Editor起動時の未処理例外がない
- Buildに必要なPackageがローカルCacheだけに依存していない
- Git LFS管理AssetにPointerのまま残っているものがない

Compile ErrorまたはBuild Errorが見つかった場合は、原因と影響範囲を確認します。

次のような小規模な阻害は、本タスク内で修正します。

- 不足しているusingまたは明確な参照設定
- Editor専用コードのRuntime Build混入
- Build SettingsのScene登録漏れ
- 明確なPackage／asmdef設定ミス
- Project Settingsの不足
- Build出力手順の不備

次のように大規模な設計変更を必要とする問題は、本タスク内で無理に修正せず別タスク化します。

- Gameplay基盤の再設計
- State Graph契約の大幅変更
- 複数Packageにまたがる公開API変更
- 大規模なAsset再構築
- Unity Version移行
- Rendering Pipeline変更

別タスク化する場合も、Windows Buildを阻害する内容、再現手順、Log、影響範囲、および修正候補を記録します。

### 3. Windows Build設定を確認する

少なくとも次を確認します。

- Build TargetがWindows 64-bit Standaloneである
- Company Nameが`PushPush`である
- Product Nameが`Palette Bullet`である
- Build対象Sceneが明示されている
- Build対象SceneのAsset参照が解決できる
- 基準解像度1920×1080で起動可能な設定になっている
- Player Logを確認できる
- Windows BuildへEditor専用APIが混入していない

本タスクでは、現在Build Settingsに登録されている`Assets/Scenes/SampleScene.unity`をBuild基準Sceneとして使用できます。

後続のPB-TASK-0018で`PrototypeBattle`検証Sceneを追加した後は、
同じBuild実行経路から対象SceneをBuildできるようにします。

Scripting Backendは本タスクで一律に固定しません。
採用したBackendを記録し、変更した場合は理由をPRへ記載してください。

### 4. 再現可能なBuild実行経路を作る

Buildを担当者の手動操作だけに依存させず、
Unityメニュー、Editor Build Script、Batch Mode用Method、または同等の再実行可能な経路を用意します。

具体的なClass名・File名・メニュー名は固定しませんが、少なくとも次を満たしてください。

- Windows 64-bit Buildを選択できる
- Build対象Sceneを明示できる
- Build出力先を明示できる
- Build成功・失敗をLogで判別できる
- 失敗時に非成功として扱える
- Build元Commit SHAを確認結果へ残せる
- 後続の`PrototypeBattle` Sceneへ流用できる

CI上でのUnity自動Buildは本タスクの必須範囲ではありません。

### 5. Windows 64-bit Buildを実行する

現在のBuild基準Sceneを対象に、Windows 64-bit Buildを実行します。

少なくとも次を確認します。

- Build処理が正常終了する
- `.exe`が生成される
- 必要なDataフォルダ、DLL、設定ファイル等が生成される
- Build LogにCompile ErrorまたはBuild Errorがない
- Build出力がRepositoryへ誤って追加されない
- Build出力に秘密情報、Token、個人用絶対Pathが含まれていない

Build出力物はGitへコミットしません。

### 6. Windows実行ファイルを確認する

Unity Editorを終了または使用しない状態で、生成したWindows実行ファイルを起動します。

現在の基準Sceneについて、少なくとも次を確認します。

- 実行ファイルが起動する
- 起動直後に停止・Crashしない
- WindowまたはFull Screenが表示される
- Camera描画が行われる
- Player Logに進行不能の未処理例外がない
- 終了操作を行える

本タスクではGameplay操作、Battle、Clear、Game Over、Retry、60fps達成までは確認対象にしません。

### 7. 確認用ZIPを作成する

Windows実行ファイルと必要ファイルを、欠落なくZIP化します。

ファイル名は、少なくともプロジェクト、用途、Platform、Commitを識別できる形式にします。

例：

```text
PaletteBullet-Prototype-Windows-x64-<short-sha>.zip
```

ZIPには、少なくとも次を含めます。

- Windows実行ファイル
- Dataフォルダ
- 必要なDLL・設定ファイル
- 操作・起動方法
- 確認してほしい内容
- 現在確認できる内容
- 既知の問題
- Build元Commit SHA
- Unity Version
- Build日時
- Build種別

### 8. Google共有ストレージへ保存する

確認用ZIPを、チームのGoogle共有アカウントが管理する共有ストレージへ保存します。

- Git RepositoryへBuildバイナリをコミットしない
- チームメンバーがアクセス可能な共有設定にする
- ZIPのVersionまたはCommitを識別できる名前にする
- 古いBuildと現在のBuildを区別できるようにする
- 共有URLをNotionタスクへ記載する
- PR本文には必要に応じてNotionタスクまたは確認記録へのリンクを記載する

Google共有ストレージ内の具体的なフォルダ構成は、作業時に既存運用を確認して決定できます。

### 9. 別メンバーによる起動確認を行う

可能な範囲で、Build作成者とは別のチームメンバーが次を確認します。

1. Google共有ストレージからZIPを取得する
2. ZIPを展開する
3. Unityを起動せずに`.exe`を開始する
4. 基準Sceneが表示されることを確認する
5. 実行ファイルを終了する
6. 起動結果と問題をNotionタスクへ記載する

別メンバーによる確認がすぐに行えない場合でも、
ZIP、共有URL、確認手順、および未確認状態を明示して引き継げる状態にしてください。

## 対象範囲

- Unity `6000.3.16f1`による現在のプロジェクト確認
- Package・Compile状態の確認
- Windows 64-bit Standalone Build
- 基準SceneのBuild Settings確認
- 1920×1080基準のPlayer Settings確認
- 再現可能なBuild実行経路
- 小規模なCompile／Build阻害の修正
- Windows実行ファイルの起動確認
- 確認用ZIP作成
- Google共有ストレージへの保存
- Build記録と共有URLのNotion記載

## 対象外

- Battle Gameplayの実装
- `PrototypeBattle` lifecycleの実装
- Player、Camera、Enemy、BGM、MusicChartのGameplay実装
- シャオンダマ、Charge、Palette Bullet、パリィの実装
- Clear、Game Over、Result、Retryの実装
- 60fps達成またはGameplay性能最適化
- 最終Scene・最終UI・最終演出
- CI上でのUnity自動Build
- Unity Version移行
- IL2CPP最適化
- ゲームパッド対応
- BuildバイナリのGit管理

## 完了条件

- [ ] Build元Repository・Branch・Commit SHAを記録している
- [ ] Unity Versionが`6000.3.16f1`であることを確認している
- [ ] Package Import後のCompile Errorが0件である
- [ ] Windows 64-bit Standalone Build設定を確認している
- [ ] Build対象Sceneを明示している
- [ ] 基準解像度1920×1080で起動可能な設定を確認している
- [ ] 再現可能なBuild実行経路を用意している
- [ ] Windows Buildが正常終了している
- [ ] Windows実行ファイルをUnity Editor外で起動できる
- [ ] Player Logに起動を妨げる未処理例外がない
- [ ] Build出力に秘密情報や個人用Credentialが含まれていない
- [ ] Build出力をGitへコミットしていない
- [ ] Windows実行ファイル一式をZIP化している
- [ ] ZIPに起動方法・確認内容・既知の問題・Commit SHA・Unity Version・Build種別を記載している
- [ ] ZIPをGoogle共有アカウントのストレージへ保存している
- [ ] Google共有ストレージの共有URLをNotionタスクへ記載している
- [ ] 別メンバーが確認できる手順を用意している
- [ ] 修正しなかった大規模Build阻害がある場合、再現手順と別タスク候補を記録している

## 確認手順

1. `Palette-Bullet`の最新`main`を取得し、Working TreeがCleanであることを確認します。
2. Commit SHAを記録します。
3. Unity `6000.3.16f1`でプロジェクトを開きます。
4. Package ImportとCompileの完了を待ち、ConsoleのErrorを確認します。
5. Build SettingsとPlayer Settingsを確認します。
6. 用意したBuild実行経路からWindows 64-bit Buildを実行します。
7. Build Logが成功で終了していることを確認します。
8. Unity Editorを使用しない状態で生成された`.exe`を起動します。
9. 基準Sceneが表示され、起動直後にCrashしないことを確認します。
10. Player Logに起動を妨げる未処理例外がないことを確認します。
11. Windows実行ファイル一式と説明ファイルをZIP化します。
12. ZIPをGoogle共有アカウントのストレージへ保存します。
13. 共有設定を確認し、URLをNotionタスクへ記載します。
14. 可能な範囲で別メンバーがZIPの取得・展開・起動を確認します。
15. Unity Version、Commit SHA、Build設定、Build Log、起動結果、共有URL、既知の問題をPRとNotionへ記載します。

## 前提・依存タスク

前提となる実装タスクはありません。

本タスクは、以下の後続タスクの前提になります。

- PB-TASK-0018｜プロトタイプBattle開始・結果確定・Result・Retry基盤
- 以降のプロトタイプGameplay実装タスク
- Windowsビルドによる統合確認・性能確認タスク

## 実装時の注意点

- Build成功のためだけにGameplay RuntimeへEditor参照を追加しないでください。
- Build出力物をRepositoryへコミットしないでください。
- Git LFS Pointer状態のAssetを正常なAssetとして扱わないでください。
- ローカル絶対Pathや個人環境のPackage Cacheへ依存しないでください。
- 小規模修正と大規模設計変更を分離してください。
- 大規模問題を無理に本タスクへ含めず、再現情報を残して別タスク化してください。
- Build実行経路はPB-TASK-0018以降のSceneへ再利用できる形にしてください。
- Scripting Backend等、仕様で固定されていない設定を変更した場合は理由をPRへ記載してください。
- 60fps性能達成を、本タスクのBuild基準Sceneだけで判定しないでください。
- Google共有ストレージの共有設定で、意図しない外部公開を行わないでください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文へ、少なくとも以下を記載します。
   - Build元Commit SHA
   - Unity Version
   - Build Target
   - Scripting Backend
   - Build実行方法
   - Build対象Scene
   - Build結果
   - 起動確認結果
   - 修正したCompile／Build阻害
   - 別タスク化した問題
   - BuildバイナリをGitへ含めていないこと
4. Google共有アカウントのストレージへ確認用ZIPを保存します。
5. Notionタスクへ、共有URL、起動手順、確認結果、既知の問題を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- 確認用Build：NotionタスクへGoogle共有ストレージのURLを記載
- GitHub Pull Request：未登録
