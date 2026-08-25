---
title: 玉のデータ
description: シャオンダマ1個が持つデータ属性の定義
pageType: spec
category: シャオンダマ
order: 30
status: 仮仕様
---

# 玉のデータ

## ページ概要

- 対象担当：プログラム班・企画班（RGBダメージ値はプランナー成果物）
- 出典：統合仕様書v3.2 §4.2.3・§5.2
- 関連ページ：[BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、[浮遊・挙動](/spec/shaondama-music/floating-behavior)、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)、[Charge Allocation](/spec/draw-system/charge-allocation)

## 目的

シャオンダマ1個が持つruntime dataと、攻撃へ使用するときの実効値を定義し、生成・浮遊・Charge・Allocation・発音・Damageの各システムが参照する共通契約を作ります。

本ページは、Normal Shaondama（通常シャオンダマ）／Wildcard Shaondama（万能シャオンダマ）の種別、個体識別情報、Battleへの帰属、Normalのsource NoteEvent occurrence、元の音楽情報、色・RGB Damageデータへの参照、およびAllocation後の実効値payloadの正本です。

生成対象・生成タイミング・重複防止は[BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、状態遷移・Lifetime・自然破裂は[浮遊・挙動](/spec/shaondama-music/floating-behavior)、Allocationと実効値の解決手順は[Charge Allocation](/spec/draw-system/charge-allocation)、発音は[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)、Damage適用は[敵の被弾と浄化](/spec/enemy/damage-and-purify)を正本とします。

## プレイヤーから見た挙動

- 通常シャオンダマは、色を見ることで対応する音程を判別できます。
- 万能シャオンダマは虹色で表示され、Allocation先に必要な音程・色として使用できます。
- Charge対象として選択したときと、シャオンダマが破裂したときには、それぞれの状況に応じた音のフィードバックを再生します。
- Charge成功時点ではPalette Bulletの音程音を鳴らさず、AttackEventによる実際の発射タイミングで実効音程を発音します。

## 詳細仕様

本ページの表は、実装上保持すべき**意味**を定義します。実際のフィールド名、型、IDの採番方式、およびScriptableObject等への分割方法は固定しません。

### 共通データ

すべてのシャオンダマ個体は、最低限以下を保持または一意に参照できる状態にします。

| データ | 内容 | 規則 |
|---|---|
| Shaondama種別 | `Normal`または`Wildcard` | 生成後に別種別へ変更しない |
| Battle ID | 個体が属するBattleの識別情報 | 生成要求から引き継ぎ、別Battleへ付け替えない |
| 個体識別情報 | 1個のシャオンダマを他個体と区別する情報 | `Battle ID + 個体識別情報`で一意に識別できること |
| 生成元区分 | BGM／MusicChart由来、Wildcard生成元などを区別する情報 | NormalとWildcardの生成責務を混同しない |
| 表示用種別・色参照 | 通常7色またはWildcardの虹色表示を解決する参照 | Gameplay上の実効色とは分離する |
| Charge選択フィードバック音参照 | Charge対象として選択した際のGameplay SE参照 | AttackEvent発射時の音程音とは分離する |
| 破裂音参照 | 自然破裂・終了演出などの音響参照 | 再生条件は各lifecycle・演出正本で判定する |

Battle IDと個体識別情報は、生成要求、world object、Allocation、Reserved、Palette Bullet化、および破棄まで追跡可能にします。旧Battle IDを持つ個体をRetry後のBattleへ再利用しません。

### Normal Shaondamaのsourceデータ

Normal Shaondamaは、生成元となったNoteEventの**譜面定義**と、対象Battle・対象loopで実際に発生する**source NoteEvent occurrence**を区別して保持します。

| データ | 内容 | 用途 |
|---|---|---|
| source NoteEvent definition参照 | MusicChart上の元NoteEvent定義 | 元データの参照、同一定義判定 |
| source NoteEvent occurrence識別情報 | 対象Battleの特定loopにおける特定NoteEvent発生回 | Weak割当、自然破裂、重複防止 |
| loop occurrence | BGMの何周目に属する発生回か | 同じNoteEvent定義の周回間を区別する |
| source music time | source occurrenceが発音するBattle上の音楽時刻 | Weak発火・自然破裂の基準 |
| exact MIDI Note | octave込みの元MIDI Note | 元音楽情報・Weak発音情報 |
| pitch class | octaveを区別しない音名 | 通常AttackEventのSlot照合 |
| octave | 元NoteEventのoctave | 元データ保持・音楽情報参照 |
| Track参照 | 元NoteEventが属するTrack | 音色・演出等の将来利用 |
| Velocity | 元NoteEventのVelocity | 音響・演出等の将来利用 |
| 基本色定義参照 | キーからの度数と7色の対応を示す固定データ参照 | world表示と基本色の解決 |
| Normal RGB Damage定義参照 | 基本色に対応するRGB Damage profileへの参照 | 攻撃payloadの基本データ |

source NoteEvent occurrenceの内部ID形式は固定しません。ただし、少なくとも次の意味を混同せず、発生回を一意に識別できなければなりません。

```text
Battle
+
source NoteEvent definition
+
loop occurrence
=
source NoteEvent occurrence
```

同じNoteEvent定義から生成される1周目、2周目、3周目のoccurrenceは、それぞれ別の発生回です。単なるNote名、pitch class、Track、またはloop内時刻だけで同一性を判定しません。

source music timeをloop内のローカル時刻として保存する場合も、loop occurrenceと組み合わせ、対象Battle上の発音時点を一意に解決できる状態にします。

### Normal Shaondamaの色・音程

- 通常シャオンダマの基本色は、キーから見た度数に対応する7色のいずれかです。
- pitch classはGameplay上のSlot照合に使用し、octaveを区別しません。
- exact MIDI Note、octave、Track、Velocityは失わずに保持します。
- 通常AttackEventで実際に鳴らす音高は、元個体のoctaveではなく、Allocation先Slotが楽曲上で要求するoctave込みMIDI Noteを使用する場合があります。
- 元個体のsourceデータは、Allocation後の実効値で上書きしません。

7色の表示色、度数との対応、およびNormal RGB Damage profileは、調整可能な固定データとして管理します。具体値を個体ごと、生成側、Damage処理側へ重複してハードコードしません。

### Wildcard Shaondamaのデータ

Wildcard Shaondamaは、Normal Shaondamaと異なり、生成時点では以下を持ちません。

- source NoteEvent definition
- source NoteEvent occurrence
- 固有のpitch class／exact MIDI Note／octave
- 固有の基本色
- Normal用の固定RGB Damage値

見た目の虹色はWildcardであることを示す表示であり、攻撃時の実効色やRGB Damageそのものではありません。

WildcardはAllocation時に、割当先から攻撃ごとの実効値を解決します。

| Allocation先 | 実効値の解決元 |
|---|---|
| Normal AttackEvent Slot | そのSlotが要求する音程、octave込みMIDI Note、および音程に対応する色 |
| Weak AttackEvent | Charge Allocationで解決した次のNoteEventの音程、octave込みMIDI Note、および対応色 |

Wildcardの攻撃力はNormalとは別枠です。実効音程・実効色はAllocation先から解決しますが、Damageに使用する値または倍率はWildcard専用の調整データを参照します。Wildcardは通常より強めに調整する予定ですが、具体的なDamage量・倍率は未決です。

### Allocation後の実効値

Palette Bullet化またはDamage通知へ進む前に、攻撃へ使用する個体ごとに以下の実効値を一意に解決します。

| 実効データ | 内容 |
|---|---|
| Battle ID | 元個体と同じBattleへの帰属 |
| 個体識別情報 | 元になったShaondama個体 |
| Shaondama種別 | `Normal`または`Wildcard` |
| Allocation／Slot／Weak参照 | 実効値を決めた割当先 |
| effective pitch class | その攻撃で使用する音名 |
| effective MIDI Note／octave | その攻撃の発射時に鳴らす正確な音高 |
| effective color参照 | その攻撃で使用する音程対応色 |
| Damage definition参照 | Normal用またはWildcard専用のDamage調整データ |
| effective NoteEvent occurrence参照 | Normalでは自身のsource occurrence、WildcardではAllocation時に解決したNoteEvent occurrence。該当しない用途では空にできる |

これらの実効値は、元個体の不変なsourceデータとは分けて保持します。特にWildcardへ恒久的な固有音程・固有色を付与せず、攻撃単位の解決結果として扱います。

実効値の解決前、Battle ID不一致、または必要な参照が欠けている状態でPalette Bullet化・発音・Damage通知へ進めません。最終的なDamage payloadと加算計算は、Palette BulletおよびEnemy Damage側の正本で定義します。

## 状態別の挙動

本ページはlifecycleの状態遷移を定義しません。ただし、各状態で参照するデータの境界は以下の通りです。

| 段階 | データ上の要件 | 挙動の正本 |
|---|---|---|
| 生成要求 | 種別、Battle ID、生成元情報を持つ。Normalはsource occurrence情報を欠落させない | [BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama) |
| world object作成 | 個体識別情報を割り当て、生成要求のBattle／sourceデータを引き継ぐ | [ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning) |
| 浮遊・選択可能 | 同じ個体識別情報を維持する | [浮遊・挙動](/spec/shaondama-music/floating-behavior) |
| Allocation／Reserved | 元sourceデータを保持したまま、割当参照と実効値を別に保持する | [Charge Allocation](/spec/draw-system/charge-allocation) |
| Palette Bullet化 | 解決済み実効値とBattle IDを弾側へ渡す | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) |
| Battle終了／Retry | 旧Battle IDの個体・実効値・参照を次Battleへ持ち越さない | [ゲーム全体](/spec/game/)、[戦闘](/spec/combat/) |

## 他システムとの接続

| システム | 本ページとの接続 |
|---|---|
| BGM／MusicChart | Battle ID、source NoteEvent definition／occurrence、loop occurrence、source music time、MIDI情報を生成要求へ渡す |
| Spawn／ラジクジラ | 生成要求を再解析せず、論理個体とworld objectへデータを引き継ぐ |
| 浮遊・挙動 | source music time、Reserved状態、Battle終了を使ってlifecycleを解決する |
| Charge Allocation | pitch classとsource occurrenceを参照し、Allocation後の実効値を解決する |
| BGMとGameplayの接続 | effective MIDI Note／octaveを使って発射時の音程音を鳴らす |
| Palette Bullet | Battle ID、個体識別情報、種別、実効音程・色・Damage参照を受け取る |
| Enemy Damage／浄化 | 解決済みDamage payloadを受け取り、Enemy側の最大値・計算規則に従って適用する |

廃止済みの[MIDI駆動生成（旧ページ）](/spec/shaondama-music/midi-driven-spawning)は移行案内であり、本ページの属性・生成・色対応の正本として参照しません。

## データ所有者

| データ | 所有者・正本 |
|---|---|
| 個体runtime data契約 | 本ページ |
| source NoteEvent definitionとMusicChart上の音楽情報 | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| occurrence生成・生成要求・重複防止 | [BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama) |
| 7色・度数対応・Normal RGB Damage profile | 本ページで契約を定義し、具体値は企画班の調整データ |
| Wildcardの実効値解決 | [Charge Allocation](/spec/draw-system/charge-allocation) |
| Wildcard専用Damage値・倍率 | [万能シャオンダマ](/spec/shaondama-music/wildcard-orb)で企画調整し、本ページの共通payloadで参照 |
| EnemyのR／G／B最大値・最終Damage計算 | [敵の被弾と浄化](/spec/enemy/damage-and-purify) |
| 音程音・Gameplay SEの再生規則 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |

## 例外・禁止事項

- Normal Shaondamaを、Battle IDまたはsource NoteEvent occurrenceが欠けた状態で生成・Weak Allocationしてはいけません。
- 同じNoteEvent定義の別loop occurrenceを、同一のsource occurrenceとして扱ってはいけません。
- source occurrenceをNote名、pitch class、Track、または時刻だけで識別してはいけません。
- Allocation後の実効値で、元個体のsource NoteEvent情報を上書きしてはいけません。
- Wildcardへ生成時から恒久的な固有音程・固有色・Normal用RGB Damage値を設定してはいけません。
- Wildcardの実効値が未解決のまま、Palette Bullet化・発音・Damage通知へ進めてはいけません。
- 旧仕様の3色前提のRGB Damage値`(510, 255, 510)`を使用してはいけません。
- 7色のRGB Damage値、Wildcard倍率、Enemy最大値、および最終計算式をコードへハードコードしてはいけません。企画班が調整可能なデータ参照を使用します。
- 廃止済み`midi-driven-spawning.md`を現在の個体属性または色対応の正本として使用してはいけません。

## パラメータ

| パラメータ | 値 | 状態 |
|---|---|---|
| 7色分のNormal RGB Damage値 | 未決 | Gameplayテストで調整予定 |
| EnemyのR／G／B最大値 | 未決 | Enemy側の調整データ |
| Wildcard専用Damage値・倍率 | 未決 | Gameplayテストで調整予定 |
| 想定浄化Hit数 | 未決 | 上記値と最終計算式に合わせて調整予定 |

## 未決事項

- 7色それぞれのNormal RGB Damage値
- Enemy側のR／G／B最大値と最終Damage計算式
- 想定浄化Hit数
- Wildcard専用の具体的なDamage値・倍率

これらはQ-12・Q-13で意図的に未決とされた調整用パラメータです。source NoteEvent occurrenceの識別要件とWildcardの実効音程・実効色の解決規則は決定済みです。

## 関連タスク

<PageRelations />
