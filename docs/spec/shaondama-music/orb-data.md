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
- 関連ページ：[BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、[浮遊・挙動](/spec/shaondama-music/floating-behavior)、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)、[Charge Allocation](/spec/draw-system/charge-allocation)、[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)、[パレットブレット](/spec/combat/palette-bullet)

## 目的

シャオンダマ1個が持つruntime dataと、攻撃へ使用するときの実効値を定義し、生成・出現演出・浮遊・Charge・Allocation・発音・Damageの各システムが参照する共通契約を作ります。

本ページは、Normal Shaondama（通常シャオンダマ）／Wildcard Shaondama（万能シャオンダマ）の種別、個体識別情報、Battleへの帰属、生成元区分、選択可能性・出現演出・`Reserved`を判定するための情報、Parry変換時の一時的な引き継ぎ情報、Normalのsource NoteEvent occurrence、元の音楽情報、元RGB値、Allocation後の実効値payload、およびPalette Bullet化時のデータ引き継ぎ契約の正本です。

生成対象・生成タイミング・重複防止は[BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、状態遷移・Lifetime・自然破裂は[浮遊・挙動](/spec/shaondama-music/floating-behavior)、Allocationと実効値の解決手順は[Charge Allocation](/spec/draw-system/charge-allocation)、Palette Bullet化と発射情報の受け渡しは[AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)、飛行・衝突・Damage候補生成は[パレットブレット](/spec/combat/palette-bullet)、発音は[BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)、Damage適用は[敵の被弾と浄化](/spec/enemy/damage-and-purify)を正本とします。

## プレイヤーから見た挙動

- 通常シャオンダマは、色を見ることで対応する音程を判別できます。
- 万能シャオンダマは虹色で表示され、Allocation先に必要な音程・色として使用できます。
- Charge対象として選択したときと、シャオンダマが破裂したときには、それぞれの状況に応じた音のフィードバックを再生します。
- Charge成功時点ではPalette Bulletの音程音を鳴らさず、AttackEventによる実際の発射タイミングで実効音程を発音します。

## 詳細仕様

本ページの表は、実装上保持すべき**意味**を定義します。実際のフィールド名、型、IDの採番方式、およびScriptableObject等への分割方法は固定しません。

### 共通データ

すべてのシャオンダマ個体は、最低限以下の意味を保持または一意に参照できる状態にします。このうちBattle IDと個体識別情報は各runtime個体が必ず保持し、world object化後も同じ値を引き継ぎます。

| データ | 内容 | 規則 |
|---|---|---|
| Shaondama種別 | `Normal`または`Wildcard` | 生成後に別種別へ変更しない |
| Battle ID | 個体が属するBattleの識別情報 | 生成要求または変換元から引き継ぎ、別Battleへ付け替えない |
| 個体識別情報 | 1個のシャオンダマを他個体と区別する情報 | `Battle ID + 個体識別情報`で一意に識別できること |
| 生成元区分 | NormalのNoteEvent由来、Wildcardの最低保証不足による生成、WildcardのParry変換を区別する情報 | 下記以外の生成元を追加せず、NormalとWildcardの生成責務を混同しない |
| 生成元固有参照 | source NoteEvent occurrence、最低保証不足の生成要求、変換元邪音玉IDなど、生成元を追跡するための参照 | 種別・生成元区分に必要な参照だけを持ち、無関係な参照を擬似的に設定しない |
| 出現演出の進行情報 | 通常生成または最低保証補充で、出現演出中か演出が完了したかを区別するための情報 | 適用する生成経路だけが持てばよい。Parry由来Wildcardへ最低保証補充用の出現演出状態を必須としない |
| 選択可能性 | 現在Charge対象として選択できるかを判定できる情報 | 判定規則と状態遷移は[浮遊・挙動](/spec/shaondama-music/floating-behavior)に従う |
| `Reserved`情報 | Allocation先へ確保済みか、および必要な割当先参照 | `Reserved`中は最低保証数へ算入しない |
| 表示用種別・色参照 | 通常7色またはWildcardの虹色表示を解決する参照 | Gameplay上の実効色とは分離する |
| Charge選択フィードバック音参照 | Charge対象として選択した際のGameplay SE参照 | AttackEvent発射時の音程音とは分離する |
| 破裂音参照 | 自然破裂・終了演出などの音響参照 | 再生条件は各lifecycle・演出正本で判定する |

最低保証数へ算入できるのは、**現在選択可能かつ非`Reserved`**の個体だけです。Gameplay上の出現演出gate中、選択不可、または`Reserved`中の個体は算入しません。この算入可否を独立した重複flagとして保持する必要はありませんが、上記情報から一意に導出できなければなりません。

Gameplay上の出現演出gate中であること、表示演出が再生中であること、選択不可であること、`Reserved`であることは、それぞれ同義ではありません。最低保証補充の出現演出gate中は選択不可ですが、Parry由来Wildcardは変換commit時点で選択可能な状態へ直接入り、表示上の変換演出が継続していても選択可能性を失いません。状態名、flag、enum、および組み合わせ方は本ページでは固定しません。

Battle IDと個体識別情報は、生成／変換要求、world object、選択可能化、Allocation、`Reserved`、Palette Bullet化、および破棄まで追跡可能にします。Battle終了またはRoom Retry時は、旧Battle IDに属する個体、保留中の生成・変換・選択可能化通知、Parry変換用の一時情報、`Reserved`情報、Allocation結果、およびその他のruntime状態を次のBattleへ持ち越しません。

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
| source RGB値 | 生成元の基本色から解決したR／G／B各値 | 自然破裂payloadとNormal攻撃payloadの元データ。個体生成後に上書きしない |
| source RGB定義参照 | source RGB値を解決した調整データへの参照 | 値の出典追跡と調整用。runtime上は個体のsource RGB値を失わない |

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
- source RGB値は個体生成時に基本色定義から解決し、個体の元データとして保持します。
- 通常シャオンダマの自然破裂は、このsource RGB値をそのままRGB payloadとして参照します。Player HP Damageのような単一Damage値へ変換しません。
- 通常AttackEventで実際に鳴らす音高は、元個体のoctaveではなく、Allocation先Slotが楽曲上で要求するoctave込みMIDI Noteを使用します。
- 元個体のsourceデータは、Allocation後の実効値で上書きしません。

7色の表示色、度数との対応、およびsource RGB値を決める定義は、調整可能な固定データとして管理します。具体値を生成側、自然破裂側、Palette Bullet側、Enemy Damage側へ重複してハードコードしません。ただし、生成済みNormal個体は自身に確定したsource RGB値を保持し、後からAllocation結果や表示変更で上書きしません。

### Wildcard Shaondamaのデータ

Wildcard Shaondamaの生成元区分は、次の2種類です。

| 生成元区分 | 生成元固有情報 | 規則 |
|---|---|---|
| 最低保証不足による生成 | 対象Battleと不足補充の生成要求を追跡できる情報 | 不足判定・要求重複防止は[BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、生成lifecycleは[万能シャオンダマ](/spec/shaondama-music/wildcard-orb)を正本とする |
| `Parry変換` | 変換元と同じ`battleId`、変換元邪音玉ID、Parry成立時点のworld位置を追跡できる情報 | 邪音玉1弾から同じ`battleId`のWildcard 1個へ、Parry成立位置で即時変換する |

Parry由来Wildcardでは、変換時に次の情報を引き継ぎます。

| データ | 内容 | 規則 |
|---|---|---|
| `battleId` | 変換元邪音玉が属するBattle | 変換元と同じ値を引き継ぎ、現在Battle以外へ付け替えない |
| 変換元邪音玉ID | どの邪音玉から変換されたかを示す識別情報 | `battleId`と組み合わせて重複変換防止と追跡に使用する |
| Parry成立world位置 | 即時変換をcommitするworld位置 | 邪音玉を弾いて移動させた後の位置へ変更しない |
| 弾き方向／初期移動情報 | Parry結果として確定した方向、または変換後のWildcardへ一度だけ力を適用するために必要な情報 | 必要な場合だけ一時的に引き継ぎ、力の適用後は変換処理用情報として解放できる |
| 選択可能性 | 変換後のWildcardがCharge対象検索へ参加できる状態 | 変換commitと同時に選択可能とし、表示演出の完了待ちを条件にしない |

通常ParryとJust Parryのどちらで変換された場合も、生成後は同じ`Wildcard`種別の個体として扱います。Parry評価の違いをWildcardの別種別、性能差、Allocation条件、選択条件、または弾き移動の基本性能に使用しません。

Wildcardへ変換できるのは、Parryに成功した邪音玉だけです。体当たり、接触攻撃、その他の非邪音玉攻撃からWildcardを生成しません。

Parry由来Wildcardは、Parry成立時点の邪音玉world位置で即時変換され、変換commitと同時に選択可能なWildcard状態へ直接入ります。最低保証補充用の出現演出中・選択不可state、RadioWhaleからの制御移譲、出現演出完了通知、timer、または遅延callbackを選択可能化の前提にしません。

表示上の変換演出は選択可能性から分離します。変換演出が継続していてもGameplay上は選択可能です。現在Battleに属する選択可能かつ非`Reserved`の個体は、変換commit時点から最低保証数へ算入します。

弾き方向または初期移動情報は、変換後のWildcardへ一度だけ力を適用するための一時的な引き継ぎ情報です。Wildcardの恒久的な固有属性、固有音程・色、Damage倍率、攻撃方向、またはその他の攻撃性能として保持・解釈しません。力の適用後は通常のWildcard共通lifecycleへ接続します。

Gameplay上のデータ結果が同じであれば、既存objectをWildcardへ変換するか、新しいobjectへ置換するかは実装詳細です。どちらの方式でも、同じ`battleId`、変換元邪音玉ID、Wildcard個体識別情報、選択可能性、および必要な一時引き継ぎ情報を欠落させません。

Wildcard Shaondamaは、Normal Shaondamaと異なり、生成時点では以下を持ちません。

- source NoteEvent definition
- source NoteEvent occurrence
- 固有のpitch class／exact MIDI Note／octave
- 固有の基本色
- Normal用の固定source RGB値

見た目の虹色はWildcardであることを示す表示であり、攻撃時の実効色やRGB Damageそのものではありません。

WildcardはAllocation時に、割当先から攻撃ごとの実効値を解決します。

| Allocation先 | 実効値の解決元 |
|---|---|
| Normal AttackEvent Slot | そのSlotが要求するpitch class、octave込みMIDI Note、および音程に対応する色・RGB |
| Weak AttackEvent | Charge Allocationで解決した次のNoteEventのpitch class、octave込みMIDI Note、および対応する色・RGB |

Wildcardの攻撃力はNormalとは別枠です。実効音程・実効色・実効RGBはAllocation結果から解決しますが、Palette Bullet攻撃時に倍率overrideを使用する場合は、Wildcard専用の調整データから`DirectHitMultiplier`と`ExplosionMultiplier`を別々に参照します。Wildcardは通常より強めに調整する予定ですが、各Multiplierの具体値は未決です。

Wildcardは固定のsource RGB値を持ちません。虹色は表示だけを表し、RGB payloadではありません。また、WildcardはLifetime終了時に破裂して消滅しますが、その破裂からDamage payloadを生成しません。Allocation後のPalette Bullet攻撃と、Lifetime終了時の破裂を混同してはいけません。

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
| effective RGB payload | その攻撃でEnemyへ渡すR／G／B値。Normalはsource RGB値、WildcardはAllocation結果から解決する |
| `DirectHitMultiplier`参照 | Direct Contact RGB Damageへ適用する倍率。Explosion用倍率とは独立して参照できること |
| `ExplosionMultiplier`参照 | Explosion RGB Damageへ適用する倍率。Direct Contact用倍率とは独立して参照できること |
| effective NoteEvent occurrence参照 | Normalでは自身のsource occurrence、WildcardではAllocation時に解決したNoteEvent occurrence。該当しない用途では空にできる |

これらの実効値は、元個体の不変なsourceデータとは分けて保持します。特にWildcardへ恒久的な固有音程・固有色を付与せず、攻撃単位の解決結果として扱います。

実効値の解決前、Battle ID不一致、または必要な参照が欠けている状態でPalette Bullet化・発音・Damage通知へ進めません。Direct ContactとExplosionの最終RGB Damage候補は[パレットブレット](/spec/combat/palette-bullet)、同一フレーム集約・丸め・Clamp・浄化判定は[敵の被弾と浄化](/spec/enemy/damage-and-purify)を正本とします。

### Palette Bullet化時のデータ引き継ぎ

`Reserved`中はPalette Bullet化前のShaondamaであり、対応する発射タイミングにPalette Bullet化した後の状態とは区別します。Charge時点のモードをShaondama個体へ固定保存せず、コンダクトもShaondama個体の属性として保持しません。コンダクトはStage挑戦中の具体的なAttackEvent occurrence全体へ付与された指示として扱い、モードは発火・発射側が統合仕様に従って参照します。詳細は[Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)を正本とします。

Reserved ShaondamaをPalette Bullet化する場合は、物理objectの生成方式にかかわらず、同じGameplay上の個体として次の情報を引き継ぎます。

| 引き継ぐ情報 | 規則 |
|---|---|
| Battle ID | 元Shaondamaと同じBattleへの帰属を維持し、別Battleへ付け替えない |
| 個体識別情報 | 元Shaondamaと同じ個体を示す識別情報を維持し、Palette Bullet化を理由に別個体IDへ変更しない |
| Shaondama種別 | `Normal`または`Wildcard`の種別を維持する |
| sourceデータ | Normalのsource NoteEvent occurrence、音楽情報、source RGB値を失わない |
| Allocation後の実効値 | effective pitch、MIDI Note、color、RGB payloadを欠落なく引き継ぐ |
| `DirectHitMultiplier`参照 | Direct Contact RGB Damage用の独立した倍率参照を引き継ぐ |
| `ExplosionMultiplier`参照 | Explosion RGB Damage用の独立した倍率参照を引き継ぐ |

```text
Reserved Shaondama
├─ Battle ID
├─ 個体識別情報
├─ source RGB値
├─ effective RGB payload
├─ DirectHitMultiplier参照
└─ ExplosionMultiplier参照
↓
Palette Bullet化
↓
同じGameplay個体情報を維持
```

Palette Bullet化によって、Normalのsource RGB値または攻撃に使用するeffective RGB payloadを失ったり、表示用色だけからRGB値を再生成したりしません。

同じ物理objectをShaondamaからPalette Bulletへ状態遷移させる方式と、必要な情報を別objectへ渡して置き換える方式のどちらを採用しても構いません。

別objectへ置き換える場合も、新しいGameplay個体を生成したものとして扱いません。元ShaondamaのBattle ID、個体識別情報、sourceデータ、解決済み実効値、およびDamage倍率参照を新しいobjectへ引き継ぎます。

Palette Bullet化が成立した時点で、元個体のShaondamaとしての浮遊状態と`Reserved`状態を終了します。同一個体をShaondamaとPalette Bulletの両方としてGameplay上に残しません。

物理objectの再利用・置換方式は実装詳細ですが、Gameplay上の個体同一性とデータの連続性は本ページの契約として固定します。

## 状態別の挙動

本ページはlifecycleの状態遷移を定義しません。ただし、各状態で参照するデータの境界は以下の通りです。

| 段階 | データ上の要件 | 挙動の正本 |
|---|---|---|
| 生成／変換要求 | 種別、Battle ID、生成元情報を持つ。Normalはsource occurrence情報、Wildcardは2種類の生成元区分を欠落させない。Parry変換では変換元邪音玉ID、Parry成立位置、必要な一時引き継ぎ情報を含める | [BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、[万能シャオンダマ](/spec/shaondama-music/wildcard-orb) |
| world object作成／変換 | 個体識別情報を割り当て、生成／変換要求のBattle／source／生成元データを引き継ぐ。Parry変換ではobject再利用・置換のどちらでも同じデータ結果を維持する | Normal・最低保証補充は[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、Parry変換は[万能シャオンダマ](/spec/shaondama-music/wildcard-orb) |
| Parry変換commit | 変換元と同じ`battleId`、変換元邪音玉ID、Wildcard個体識別情報を追跡し、同時に選択可能化する。必要な弾き方向／初期移動情報を変換後のWildcardへ一時的に渡す | [万能シャオンダマ](/spec/shaondama-music/wildcard-orb)、[浮遊・挙動](/spec/shaondama-music/floating-behavior) |
| 出現演出・浮遊・選択可能 | 同じ個体識別情報を維持し、Gameplay上の出現演出gate、表示演出、および選択可能性を区別できる状態にする。Parry由来Wildcardは表示演出中でも選択可能であり、選択可能なまま弾き移動へ接続する | [浮遊・挙動](/spec/shaondama-music/floating-behavior) |
| Allocation／Reserved | 元sourceデータを保持したまま、割当参照と実効値を別に保持する | [Charge Allocation](/spec/draw-system/charge-allocation) |
| Palette Bullet化 | Battle ID、個体識別情報、source／effective RGB、解決済み実効値、`DirectHitMultiplier`参照、`ExplosionMultiplier`参照を欠落なく弾側へ渡し、Gameplay上の個体同一性を維持する | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)、[パレットブレット](/spec/combat/palette-bullet) |
| Battle終了／Room Retry | 旧Battle IDの個体・通知・`Reserved`・実効値・参照・状態をすべて破棄し、次Battleへ持ち越さない | [ゲーム全体](/spec/game/)、[戦闘](/spec/combat/) |

## 他システムとの接続

| システム | 本ページとの接続 |
|---|---|
| BGM／MusicChart | Battle ID、source NoteEvent definition／occurrence、loop occurrence、source music time、MIDI情報をNormal生成要求へ渡す。選択可能かつ非`Reserved`の個体だけを最低保証へ数える |
| Spawn／ラジクジラ | Normalおよび最低保証補充の生成要求を再解析せず、論理個体とworld objectへデータを引き継ぐ。これらの出現演出gate中は選択可能化しない。Parry由来Wildcardの変換・選択可能化・弾き移動は管理しない |
| [Player Parry](/spec/player/player-action-parry) | 成功batch内の対象ごとに弾き方向を確定し、1弾ごとのParry結果へ含める |
| [邪音玉](/spec/enemy/jaon-bullet) | Parry成立位置、同じ`battleId`、変換元邪音玉ID、および弾き方向を、1弾につき1回のWildcard変換要求として渡す。同一邪音玉から変換要求を重複成立させない |
| Wildcard生成 | 最低保証不足または`Parry変換`の生成元区分、Battle ID、必要な生成元固有参照を個体へ渡す。Parry由来は`battleId`と変換元邪音玉IDの組み合わせで重複commitを防ぎ、変換commitと同時に選択可能化する |
| 浮遊・挙動 | source music time、Gameplay上の出現演出gate、表示演出、選択可能性、`Reserved`、Battle終了を使ってlifecycleを解決する。Parry由来は選択可能なまま弾き移動へ接続する |
| Charge Allocation | pitch classとsource occurrenceを参照し、Allocation後の実効値を解決する |
| BGMとGameplayの接続 | effective MIDI Note／octaveを使って発射時の音程音を鳴らす |
| Palette Bullet | Battle ID、個体識別情報、種別、source／effective RGB payload、実効音程・色、`DirectHitMultiplier`参照、`ExplosionMultiplier`参照を受け取り、物理object方式にかかわらずGameplay上の個体情報を維持する |
| Enemy Damage／浄化 | 解決済みDamage payloadを受け取り、Enemy側の最大値・計算規則に従って適用する |

廃止済みの[MIDI駆動生成（旧ページ）](/spec/shaondama-music/midi-driven-spawning)は移行案内であり、本ページの属性・生成・色対応の正本として参照しません。

## データ所有者

| データ | 所有者・正本 |
|---|---|
| 個体runtime data契約 | 本ページ |
| source NoteEvent definitionとMusicChart上の音楽情報 | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| Normalのoccurrence生成・Normal／最低保証補充の生成要求・要求重複防止 | [BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama) |
| Gameplay上の出現演出gate・表示演出・選択可能・`Reserved`の状態遷移 | [浮遊・挙動](/spec/shaondama-music/floating-behavior) |
| Wildcard生成trigger・生成位置・Parry変換commit時の即時選択可能化・`battleId`と変換元邪音玉IDによる重複commit防止 | [万能シャオンダマ](/spec/shaondama-music/wildcard-orb) |
| Parry対象ごとの弾き方向の確定 | [Playerアクション｜パリィ](/spec/player/player-action-parry) |
| Parry成立位置・`battleId`・変換元邪音玉ID・弾き方向の受け渡し、および同一邪音玉からの変換要求の1回限りの成立 | [邪音玉](/spec/enemy/jaon-bullet) |
| Parry変換時の一時引き継ぎデータ契約 | 本ページ |
| 7色・度数対応・Normal source RGB定義 | 本ページで契約を定義し、具体値は企画班の調整データ |
| Wildcardの実効値解決 | [Charge Allocation](/spec/draw-system/charge-allocation) |
| `DirectHitMultiplier`・`ExplosionMultiplier`の適用規則 | [パレットブレット](/spec/combat/palette-bullet) |
| Wildcard攻撃用の倍率override | [万能シャオンダマ](/spec/shaondama-music/wildcard-orb)で企画調整し、本ページのAllocation後payloadから各倍率を別々に参照 |
| EnemyのR／G／B最大値・集約・丸め・Clamp・浄化判定 | [敵の被弾と浄化](/spec/enemy/damage-and-purify) |
| 音程音・Gameplay SEの再生規則 | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) |

## 例外・禁止事項

- Normal Shaondamaを、Battle IDまたはsource NoteEvent occurrenceが欠けた状態で生成・Weak Allocationしてはいけません。
- 同じNoteEvent定義の別loop occurrenceを、同一のsource occurrenceとして扱ってはいけません。
- source occurrenceをNote名、pitch class、Track、または時刻だけで識別してはいけません。
- Normal個体のsource RGB値を、Allocation結果、表示用色、または後から変更された定義値で上書きしてはいけません。
- Normalの自然破裂RGBを単一Damage値へ変換したり、同一Enemyへ複数回通知したりしてはいけません。
- Allocation後の実効値で、元個体のsource NoteEvent情報を上書きしてはいけません。
- Wildcardへ生成時から恒久的な固有音程・固有色・Normal用source RGB値を設定してはいけません。
- Wildcardの虹色表示を固定RGB payloadとして使用してはいけません。
- WildcardのLifetime終了時の破裂からDamageを発生させてはいけません。
- 最低保証不足とParry変換以外の経路からWildcardを生成してはいけません。
- 体当たり、接触攻撃、その他の非邪音玉攻撃をWildcardへ変換してはいけません。
- 通常Parry由来とJust Parry由来のWildcardを別種別・別性能として扱ってはいけません。
- Parry由来Wildcardの選択可能化を、最低保証補充用の出現演出、RadioWhaleからの制御移譲、timer、遅延callback、または表示上の変換演出完了まで待たせてはいけません。
- Parry由来Wildcardへ、最低保証補充用の出現演出中・選択不可stateを必須データとして設定してはいけません。
- 表示上の変換演出が継続していることだけを理由に、Parry由来Wildcardを選択不可または最低保証算入外として扱ってはいけません。
- Gameplay上の出現演出gate中、選択不可、または`Reserved`中の個体を最低保証数へ算入してはいけません。
- Parryで確定した弾き方向または初期移動情報を、Wildcardの恒久的な固有属性、Allocation条件、Damage倍率、または攻撃性能として扱ってはいけません。
- Parry変換用の一時情報を、力の適用後も不要に保持したりPalette Bulletの攻撃payloadへ引き継いだりしてはいけません。
- 変換元邪音玉IDと`battleId`が同じ結果からWildcardを重複変換してはいけません。
- Battle結果確定後、または現在Battleと異なる`battleId`の遅延処理から、変換・選択可能化・力の付与を行ってはいけません。
- Wildcardの実効値が未解決のまま、Palette Bullet化・発音・Damage通知へ進めてはいけません。
- Palette Bullet化を理由に個体識別情報を再採番し、元Shaondamaとは別のGameplay個体として扱ってはいけません。
- Palette Bullet化によってNormalのsource RGB値またはeffective RGB payloadを失ってはいけません。
- object置換時にBattle ID、個体識別情報、sourceデータ、実効値、またはDamage倍率参照を欠落させてはいけません。
- `DirectHitMultiplier`と`ExplosionMultiplier`を1つの区別できない倍率参照へ統合してはいけません。
- 同一個体をShaondamaとPalette Bulletの両方としてGameplay上に残してはいけません。
- 旧Battle IDに属する個体、通知、`Reserved`、Allocation結果、または状態をRoom Retry後へ持ち越してはいけません。
- 旧仕様の3色前提のRGB Damage値`(510, 255, 510)`を使用してはいけません。
- 7色のsource RGB値、`DirectHitMultiplier`、`ExplosionMultiplier`、Wildcard用override、Enemy最大値、および丸め方式をコードへハードコードしてはいけません。企画班が調整可能なデータ参照を使用します。
- 廃止済み`midi-driven-spawning.md`を現在の個体属性または色対応の正本として使用してはいけません。

## パラメータ

| パラメータ | 値 | 状態 |
|---|---|---|
| 7色分のNormal source RGB値 | 未決 | Gameplayテストで調整予定 |
| EnemyのR／G／B最大値 | 未決 | Enemy側の調整データ |
| `DirectHitMultiplier` | 未決 | Direct Contact RGB Damage用。Gameplayテストで調整予定 |
| `ExplosionMultiplier` | 未決 | Explosion RGB Damage用。Gameplayテストで調整予定 |
| Wildcard攻撃用の倍率override | 未決 | 必要な場合もDirect／Explosionを別々に調整する |
| 想定浄化Hit数 | 未決 | source RGB値、各Multiplier、Enemy最大値、丸め方式に合わせて調整予定 |

## 未決事項

- 7色それぞれのNormal source RGB値
- Enemy側のR／G／B最大値と`RGBDamageRoundingMode`の具体設定
- 想定浄化Hit数
- `DirectHitMultiplier`と`ExplosionMultiplier`の具体値
- Wildcard攻撃用に各Multiplierのoverrideを設ける場合の具体値

RGB・Damage倍率・浄化Hit数はQ-12・Q-13で意図的に未決とされた調整用パラメータです。Direct ContactとExplosionで別々のMultiplierを使用する構造は確定済みであり、未決なのは各具体値です。

Parry由来Wildcardは、邪音玉1弾につき1個、変換元と同じ`battleId`、生成元区分`Parry変換`、変換元邪音玉IDを保持し、Parry成立位置で即時変換されます。変換commitと同時に選択可能になること、最低保証補充用の出現演出stateを必須としないこと、および表示上の変換演出と選択可能性を分離することは確定済みです。

弾き方向または初期移動情報を必要に応じて一時的に引き継げること、その情報をWildcardの恒久属性や攻撃性能として扱わないことも確定済みです。弾き方向の具体的な算出方法は[Playerアクション｜パリィ](/spec/player/player-action-parry)側の実装・調整検討事項であり、本ページの未決データ契約には含めません。

source NoteEvent occurrenceの識別要件、最低保証への算入条件、Wildcardの2種類の生成元、Allocation結果からの実効音程・実効色・実効RGBの解決、およびWildcardのLifetime終了破裂でDamageを発生させない規則は決定済みです。

Palette Bullet化時にBattle ID・個体識別情報・source／effective RGBを維持すること、`DirectHitMultiplier`と`ExplosionMultiplier`を別々に参照できること、および物理objectの再利用・置換方式にかかわらずGameplay上の個体同一性を維持することも決定済みです。

## 関連タスク

<PageRelations />
