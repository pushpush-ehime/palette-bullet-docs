---
title: Battle開始・共通接続の最小実装
description: 検証用Battleで共通IDと準備完了を管理し、他の機能が仮の接続先を使って実装を始められる入口を作ります。既存PB-TASK-0018をこの最初の単位へ絞り、結果・cleanup・Retryは別タスクへ分割します。
pageType: task
taskId: PB-TASK-0018
category: プロトタイプ
order: 10
team: プログラム
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/common-technology/feature-connections
  - /spec/game/
  - /spec/bgm/bgm-gameplay-connection
  - /spec/common-technology/action-state-manage
---

# PB-TASK-0018｜Battle開始・共通接続の最小実装

## 目的と実現する動作

検証用Battleで共通IDと準備完了を管理し、他の機能が仮の接続先を使って実装を始められる入口を作ります。既存PB-TASK-0018をこの最初の単位へ絞り、結果・cleanup・Retryは別タスクへ分割します。

枠1の最初の実装単位です。仕様表の作成を提出物にはしません。共通仕様のP01〜P05は技術提案として参照し、未実装のAPIを既存APIと表記しないでください。

## 参照仕様と担当範囲

<PageRelations />

- 共通接続：C01〜C03・C19、Q01・Q03〜Q06の初回接続境界。[接続正本](/spec/common-technology/feature-connections)の仕様・実装事実・技術提案を区別する。
- 主担当：枠1（Battle／共通接続）の実装担当。担当決定済み。個人の割当は非公開のチーム管理で扱う。
- 操作確認：完成方針・仕様の判断窓口。コードの確認担当・マージ担当は未定。
- 相互確認：下記の送受信先を実装する枠と接続時に確認する。役割名から個人を推定して割り当てない。
- 優先度A。枠内の着手順と先行引渡しは[カテゴリの着手順](/tasks/prototype/#sequence)を参照する。

## 編集するコード・グラフ・アセット

パスはゲーム本体Repository内の位置です。「既存／参照」は基盤Commit `55d050ad9760b27bb61415a0f7d2324ee9a50bec`で確認した入口、「新規」は作成先の提案です。実装着手時のmainを確認し、同等の追加済み実装があれば再利用します。新規配置・クラス名は既存assemblyの依存方向へ合わせて調整できます。

| 区分 | 位置 | 用途 |
|---|---|---|
| 新規 | `Assets/PaletteBullet/Prototype/Scenes/PrototypeBattle.unity` | 共有の統合Scene。既存PlayerDevelopmentとは別に設ける |
| 新規 | `Assets/PaletteBullet/Prototype/Runtime/Battle/` | GameのBattle状態、開始集約、必要な境界型とFake Owner |
| 参照 | [Assets/PaletteBullet/Player/Runtime/PlayerBattleHost.cs](https://github.com/pushpush-ehime/Palette-Bullet/blob/55d050ad9760b27bb61415a0f7d2324ee9a50bec/Assets/PaletteBullet/Player/Runtime/PlayerBattleHost.cs) | 既存Hostの入口を確認する。実Playerへの変更はPB-TASK-0036 |

## 実装範囲

- GameがBattle IDを一度発行し、必須Ownerへ渡す。Prepare、Ready待ち、Running、Pause、終了受付を区別する。Readyの追加・解除・失敗をOwner単位で扱い、開始を一度だけ通知する。
- 型付きC#の要求・結果・通知と、読取用データの最小の骨組みを実装する。Battle IDは現行Playerと接続できるstringとし、PlayerTokenのactor／generation／runを置き換えない。音楽occurrenceはBattle・Chart・定義・loopを区別し、表示コードをキーにしない。個体ID、作用ID、成功／拒否／失敗と理由も境界で共有する。
- 各枠が必要とするPrepare／開始／Pause／終了の入口、音楽位置参照、予約要求・消費確定、RGB候補の型を、Fakeでコンパイル・呼出しできる最小単位で渡す。全機能の内部状態を収めた巨大な共通型や新しい汎用フレームワークは作らない。具体的な公開名・配置はPRで送受信側を対応付ける。
- frameとPhysics Stepを区別する。段階1で必要な「有効Charge commit→自然破裂」「Enemy RGB確定→Stage→Game」の呼出し境界を用意し、Componentの偶然の更新順へ依存させない。音楽の受付締切を越えたChargeを後から成功にしない。
- 準備失敗はD03に従って開始を閉じ、機能・段階・理由と再起動案内を最小UIへ表示する。応答待ちの診断はGameplay時計から独立させ、待機上限は設定可能な検証値として扱う。期限切れを成功に変えない。
- 最初の引渡しは、この境界型・Fake・Sceneと開始確認が通った時点で行う。結果画面や実音楽の完成を待たせない。

今回の範囲外：実Player・音楽・攻撃の中身、完成版HUD、結果／cleanup／Retryの実装（PB-TASK-0027・0028）、新規ツール制作。

## 依存と受け渡し

先行タスク：なし。

先行タスクの全機能完成を待たず、公開型とFakeが渡された時点で独立検証できます。受信先の中身は固定応答で代用できますが、独自に別の共有型を作りません。実物同士の統合は[PB-TASK-0045](/tasks/prototype/pb-task-0045)で確認し、Fakeのみの確認を実接続の合格には数えません。

| 要求・通知元 → 接続先 | 渡すもの・責任の境界 |
|---|---|
| Game → 各枠 | Battle ID、採用設定参照、Prepare／開始／Pause／終了の要求と結果型 |
| 各枠 → Game／Combatの集約 | Owner IDとBattle IDを伴うReady・解除・失敗・終了応答。個別機能の数え方は各Ownerが所有 |
| 後続全タスク | 同じ型を使うFake実装と呼出し例。予約と生成成功の境界はPB-TASK-0042で実体化 |

必須参照・設定の不足は準備失敗として報告し、D03の表示・中断へ接続します。実行中の通常拒否と実行失敗は理由付きで区別します。各処理は対象Battle・受付状態・個体やoccurrenceの有効性を確認し、非同期完了時にも再確認します。終了時には自身が所有する生成物・予約・購読を片付け、成功／失敗を終了集約へ返します。相手が所有する状態を独自に確定しません。

## 操作と期待結果による完了条件

| 操作・入力 | 期待結果 |
|---|---|
| 最後の必須Readyを保留する | Battle・入力・音楽が開始しない。未ReadyのOwnerが表示される |
| Readyを解除してから復帰し、同じReadyを再送する | 全条件が揃った時に一度だけ開始し、重複で水増ししない |
| 準備失敗後にReadyと再開要求を送る | 失敗理由と再起動案内を保ち、開始・再開しない |
| 旧Battle IDの通知を送る | 現在Battleに変化がなく、拒否理由を追える |

- [ ] 上表のケースを確認し、実結果と使用CommitをPRへ記録している。
- [ ] 本タスク範囲の実コード・保存グラフ・アセットが保存され、再読込後も確認できる。
- [ ] Fake確認と実接続確認、残る範囲外を区別し、異常を無言で成功扱いにしていない。

## 検証・提出

開始gateとID／重複／失敗のEditMode試験、Fake OwnerによるPlayMode確認。RuntimeからEditor APIを参照しないことを確認する。

Unityは`6000.3.16f1`を使用します。PRには変更した入口、操作と期待／実結果、使用Commit、設定・素材、テスト結果、接続先の実／Fake、既知の問題を記載します。エラー時は接続C番号、Battle ID、必要なoccurrence／作用／run、frame／Step／音楽位置、理由と関連ログを添えます。既存のPlayer journal等を使い、ログ基盤の新設を前提にしません。

コード・グラフ変更と接続確認をレビューし、必要なCIと対象範囲の検証を通してmainへ反映します。操作確認だけでコードレビューを代替しません。作業コピー・キャッシュ・検証記録を保持し、提供済み基盤の全再監査や仕様表作成をこの実装タスクの提出物にしません。

- Notionタスク：<NotionTaskLink />
- 実装Pull Request：未登録
- [プロトタイプタスク一覧](/tasks/prototype/)
