---
title: "Gameplay Runtime Trace AttackEvent→Projectile→Damage→Enemy結果経路接続"
description: AttackEventの発火からProjectile、Hit、Damage Candidate、Enemy Damage反映、Purify等の最終結果までを同一Correlationで追跡できるようにする
pageType: task
taskId: PB-TASK-0011
category: 開発基盤
team: プログラム
relatedSpecs:
  - /spec/common-technology/gameplay-runtime-trace
  - /spec/bgm/bgm-attack-event
  - /spec/bgm/bgm-attack-judgement
  - /spec/combat/palette-bullet
  - /spec/enemy/damage-and-purify
  - /spec/enemy/basic-behavior
---

# PB-TASK-0011｜Gameplay Runtime Trace AttackEvent→Projectile→Damage→Enemy結果経路接続

## タスクの目的

Gameplay Runtime Traceを攻撃・Damage経路へ接続し、

> **AttackEventが発火した後、攻撃処理がどこまで到達し、どこで止まったか**

を一続きのTraceとして確認できるようにします。

このタスクでは、少なくとも1つの代表的な攻撃経路について、AttackEventからEnemy側の確定結果までを追跡できる状態を完成させます。

## 完成時にできるようになること

- AttackEventが実際に発火したか確認できる
- そのAttackEventから生成されたProjectile／攻撃結果を追跡できる
- Projectileの生成・発射・Hit等を同じ処理として追える
- HitからDamage Candidateが生成されたか確認できる
- Damage CandidateがEnemy Damage処理まで届いたか確認できる
- Enemyへ実際に反映されたDamage結果を確認できる
- Purify等のEnemy側確定結果まで追跡できる
- 途中Eventが存在しない場合、処理がどの地点まで到達したか切り分けられる
- 同一CorrelationをTimeline Viewerや構造化Exportから追跡できる

## 関連する仕様

<PageRelations />

Traceの記録方法は[Gameplay Runtime Trace仕様](/spec/common-technology/gameplay-runtime-trace)を正本とします。

攻撃・Damageの正しいGameplay処理は以下の各仕様を正本としてください。

- [BGM AttackEvent仕様](/spec/bgm/bgm-attack-event)
- [BGM 攻撃判定仕様](/spec/bgm/bgm-attack-judgement)
- [Palette Bullet仕様](/spec/combat/palette-bullet)
- [Enemy Damage／Purify仕様](/spec/enemy/damage-and-purify)
- [Enemy基本挙動仕様](/spec/enemy/basic-behavior)

Trace側で攻撃成立条件、Damage計算、Purify条件等を再定義しないでください。

## 実施内容

### 1. AttackEventをTraceへ接続する

AttackEventの発火をTrace Eventとして記録し、この攻撃処理を追跡するCorrelationの起点にします。

必要に応じて以下のようなRuntime情報を関連付けられるようにします。

- AttackEvent occurrence
- Battle ID
- MusicChart Time／Loop occurrence
- Target情報
- 発射対象または攻撃結果へ接続する識別情報

### 2. Projectile／攻撃結果へCorrelationを引き継ぐ

AttackEventから生成されたProjectileまたは等価な攻撃結果へ、同じCorrelationを引き継ぎます。

代表経路では少なくとも、

```text
AttackEvent Fire
↓
Projectile Spawn／Fire
↓
Projectile Hit／Explosion等
```

を追跡できるようにします。

ProjectileにはEntity IDを付与し、同じ個体の生成から終了まで追えるようにしてください。

### 3. HitからDamage Candidateまで接続する

HitやExplosion等、Damageの発生原因となるEventから、生成されたDamage Candidateへ関係を引き継ぎます。

これにより、

```text
Projectile Hitあり
Damage Candidateなし
```

と、

```text
Damage Candidate生成まで到達
```

を区別できるようにします。

Damage値そのものはRuntime本体で確定した値を記録し、Trace側で再計算しません。

### 4. Enemy Damage反映まで追跡する

Damage CandidateがEnemy Damage処理へ渡された後、実際にどのEnemyへどの結果が反映されたかをTraceします。

少なくとも代表経路で、

- 対象Enemy
- Damage Candidate
- Damage集約／適用結果
- Enemy側の状態変化

を関連付けられるようにします。

同一frame集約等のGameplay処理はEnemy Damage正本仕様に従い、TraceはそのRuntime結果を観測するだけとします。

### 5. Enemy側の確定結果まで接続する

Damage反映後にPurify等の確定結果が発生した場合、そのEventまで同じ処理から追跡できるようにします。

代表的な完成経路は次の形です。

```text
AttackEvent Fire
↓
Palette Bullet Spawn／Fire
↓
Hit／Explosion
↓
Damage Candidate
↓
Enemy Damage Apply
↓
Purify等の確定結果
```

必ずPurifyが発生する必要はありません。

Purifyしなかった場合も、Enemy Damage Applyまで到達したことが確認できれば、攻撃処理の結果を追跡できるようにしてください。

### 6. 代表攻撃経路をEnd-to-Endで完成させる

初期版では、すべてのProjectile／Damage種類を一度にTrace対応する必要はありません。

現在の仕様上つながりが明確なPalette Bullet系等から代表経路を1つ以上選び、

**AttackEventからEnemy結果までCorrelationを失わず追跡できること**

を確認してください。

## 対象範囲

- AttackEvent Fire Trace
- AttackEvent occurrence／Music Contextの関連付け
- Projectile Entity ID
- Projectile Spawn／Fire／Hit／Explosion等の代表Event
- Damage Candidate Trace
- AttackEventからDamageまでのCorrelation継承
- Enemy Damage Apply Trace
- 対象EnemyとのEntity関連付け
- Purify等のEnemy側確定結果
- 代表攻撃経路1つ以上のEnd-to-End接続
- Timeline Viewer／Filter／構造化Exportでの確認

## 対象外

- 全AttackEvent種類への完全導入
- 全Projectile種類への完全導入
- 全Damage発生源への完全導入
- AttackEvent／Palette Bullet／Enemy Damage仕様の変更
- Trace側でのDamage再計算
- Trace側でのPurify再判定
- Gameplay結果の正誤自動判定
- Replay
- AIによる自動Bug修正

本タスクでは、複数Systemをまたぐ攻撃処理をTrace基盤で一続きに追えることを代表経路で確認できればよいものとします。

## 完了条件

- [ ] AttackEvent FireをTraceできる
- [ ] AttackEvent occurrenceを一意に追跡できる
- [ ] AttackEventから代表ProjectileへCorrelationを引き継げる
- [ ] ProjectileのSpawn／FireからHit等まで同じEntityとして追跡できる
- [ ] Hit等からDamage Candidate生成まで追跡できる
- [ ] Damage Candidateと対象Enemyを関連付けられる
- [ ] Enemy Damage Applyまで同じ攻撃経路として追跡できる
- [ ] Purify等が発生した場合、その確定結果まで追跡できる
- [ ] 処理途中でEventが途切れた場合、どの段階まで到達したかTimelineから確認できる
- [ ] Correlation Filterで一連の攻撃Eventだけを表示できる
- [ ] 構造化Export後もAttackEventからEnemy結果まで関連付けられる
- [ ] Trace追加によって攻撃・Damage処理そのものを変更していない

## 確認手順

1. Trace Recordingを開始し、代表AttackEventを発火させます。
2. AttackEvent Fire → Projectile Spawn／Fire → Hit → Damage Candidate → Enemy Damage ApplyまでをTimelineで確認します。
3. DamageによってPurifyが成立するケースでは、Purifyまで同じCorrelationで追跡できることを確認します。
4. PurifyしないDamageでも、Enemy Damage ApplyとEnemy結果を確認できることを確認します。
5. Correlation Filterで、そのAttackEventに関係するEventだけを表示できることを確認します。
6. 対象時間範囲をExportし、構造化データからも同じ経路を追跡できることを確認します。
7. 可能であれば途中処理を発生させないテストケースを用意し、どの地点で経路が途切れたか判別できることを確認します。

## 前提・依存タスク

### 前提

- [PB-TASK-0008｜Gameplay Runtime Trace Core・Session・Event／Entity／Correlation ID・Snapshot](/tasks/project-foundation/pb-task-0008)
- [PB-TASK-0009｜Gameplay Runtime Trace Timeline Viewer・Filter・詳細表示・Export・Session Summary](/tasks/project-foundation/pb-task-0009)

PB-TASK-0010のPlayer入力経路とは独立した代表経路のため、実装状況に応じて並行作業して構いません。

```text
PB-TASK-0008
Trace Core
        ↓
PB-TASK-0009
Viewer・Export
        ↓
├─ PB-TASK-0010
│  Input→Player Action
│
└─ PB-TASK-0011
   AttackEvent→Projectile→Damage→Enemy結果
```

PB-TASK-0010と本タスクの両方が完了すると、Gameplay Runtime Trace初期版で必須としている2種類の代表経路が揃います。

## 実装時の注意点

- Traceは既存のAttackEvent／Projectile／Damage／Enemy処理を観測するだけにしてください。
- Damage値、倍率、同一frame集約、Clamp、Purify等をTrace側で再計算しないでください。
- CorrelationがSystem境界で失われないことを最優先してください。
- Projectile等のRuntime個体はEntity IDで区別できるようにしてください。
- Trace Event名をGameplay APIの新しい正本にしないでください。
- 代表経路以外へ段階的にTrace Pointを追加できる構造にしてください。
- 詳細なGameplay挙動は各正本仕様を参照してください。

## 提出・報告方法

1. 確認手順を実施します。
2. GitHubでPull Requestを作ります。
3. PR本文に、採用した代表攻撃経路、追加したTrace Point、Correlationの引き継ぎ方法、End-to-End確認結果を記載します。
4. NotionタスクへPull Requestと確認結果を記載します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- GitHub Pull Request：未登録
