---
title: 万能シャオンダマ
description: 最低保証不足または邪音玉のParry成功から生成される虹色のワイルドカード玉
pageType: spec
category: シャオンダマ
order: 40
status: 仮仕様
---

# 万能シャオンダマ

## ページ概要

- 対象担当：プログラム班・企画班
- 出典：統合仕様書v3.2 §4.2.4、および全体仕様決定D-02・D-10・D-13・D-20・D-22
- 関連ページ：[BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)、[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)、[浮遊・挙動](/spec/shaondama-music/floating-behavior)、[玉のデータ](/spec/shaondama-music/orb-data)、[Charge Allocation](/spec/draw-system/charge-allocation)、[Playerアクション｜パリィ](/spec/player/player-action-parry)、[邪音玉](/spec/enemy/jaon-bullet)

## 目的

万能シャオンダマ（以下、Wildcard Shaondama）は、固定の音程や基本色を持たず、Allocation先に必要な音程・色として使用できる救済用Shaondamaです。

本ページを、Wildcard Shaondamaについて次の事項を定義する正本とします。

- 生成元の種類
- 最低保証不足からの生成契機と生成個数
- 邪音玉のParry成功からの変換契機と生成個数
- Battle IDと生成元区分の引き継ぎ
- 虹色表示
- 生成元ごとの選択可能化と最低保証数への算入
- Parry変換後の弾き移動
- WildcardをWeakへ割り当てる際のloop境界規則
- Wildcard専用Damage調整値の所有境界
- Battle終了・Room Retry時の破棄境界

通常AttackEvent／Weak AttackEventへの具体的なAllocation手順、攻撃時の実効Note・実効色・RGB Damage payload、Parry判定batchの収集・Normal／Just評価、および選択可能化後の一般lifecycleは、本ページで重複定義しません。

## プレイヤーから見た挙動

- 選択可能なWildcardは虹色で表示されます。
- Wildcardは、通常AttackEventで不足している任意の音程Slotへ使用できます。
- Current Normal AttackEventが存在しない場合は、Weak Attackへ使用できます。
- Battle中に選択可能なShaondamaが最低保証数を下回ると、不足数分のWildcardが補充されます。
- 最低保証補充のWildcardは、出現演出中には選択できず、出現演出完了後に選択可能になります。
- 同一Physics Stepの成功batchに含まれる邪音玉は、Normal／Justのどちらでも、成功した1弾につき各Parry成立位置でWildcard 1個へ即時変換されます。
- Parry由来Wildcardは、変換commitと同時に選択可能になり、その後、各弾のParry結果として確定した弾き方向へ一度だけ力を受けます。
- Parry由来Wildcardは、弾き移動中もCharge対象として選択できます。
- 体当たり、接触攻撃など、邪音玉ではない攻撃からWildcardは生成されません。

## 用語

| 用語 | 意味 |
|---|---|
| `Wildcard` | 万能シャオンダマを表すShaondama種別 |
| 最低保証不足 | 現在選択可能かつ非`Reserved`のShaondama数が、設定された最低保証数を下回っている状態 |
| 最低保証補充 | 最低保証不足を解消するため、不足数分のWildcardを生成する処理 |
| Parry判定batch | 同一Physics StepでPlayerのParry判定へ入った有効な邪音玉をまとめ、1つの成功単位として判定する集合 |
| Parry変換 | 成功batch内の邪音玉1弾を、その弾のParry成立時点のworld位置でWildcard 1個へ即時変換する処理 |
| 変換commit | 邪音玉としての攻撃projectile終了、Wildcard個体の成立、および選択可能化をGameplay上の確定結果として反映した時点 |
| 弾き方向 | Parry結果として対象ごとに確定し、変換後のWildcardへ一度だけ力を加える方向 |
| 生成元区分 | 最低保証補充とParry変換を区別するruntime情報 |
| 選択可能 | PlayerのCharge対象検索に含められるGameplay状態 |
| source occurrence | 特定Battle・特定loopにおけるNoteEventの発生回 |

## 生成元

Wildcardの生成元は、次の2種類だけです。

| 生成元区分 | Trigger | 生成数 | 生成位置 | 選択可能化 |
|---|---|---:|---|---|
| 最低保証補充 | BGM生成側から不足数を指定した補充要求を受信 | 要求された不足数分 | 床・世界からの出現、もしくはRadioWhaleの出現経路 | 各個体の出現演出完了後 |
| Parry変換 | 同一Physics StepのParry判定batch内で、邪音玉に対する通常ParryまたはJust Parryが成功 | 成功した邪音玉1弾につき1個 | 各邪音玉のParry成立時点のworld位置 | 変換commitと同時 |

現在定義済みの標準生成元は、最低保証不足とParry変換である。イベント、特殊Battle、別のラジクジラなどによる追加生成元を禁止しない。追加する場合は、生成理由、生成個数、生成位置、Battle ID、重複防止、選択可能化タイミングを対応する正本で定義する。

```text
最低保証数の不足
↓
不足数を算出
↓
不足数分のWildcard生成を要求
↓
出現演出
↓
出現演出完了後に選択可能
```

```text
同一Physics Stepで有効な邪音玉がParry判定へ入る
↓
1つのParry判定batchとして成功を確定
↓
batch内の各邪音玉のDamageを無効化し、攻撃projectileとして終了
↓
成功した邪音玉1弾につき、各Parry成立位置でWildcard 1個へ即時変換
↓
変換commitと同時に選択可能化
↓
各弾のParry結果として確定した弾き方向へ、変換後のWildcardに一度だけ力を加える
↓
選択可能なWildcardとして移動・浮遊を継続
```

固定周期による自然発生は、現在のWildcard生成元ではありません。最低保証不足ともParry成功とも関係なく、一定時間ごとに少量のWildcardを生成する経路は設けません。

## 共通生成データ

生成元にかかわらず、Wildcard個体は少なくとも次の情報を保持、または一意に参照できる状態にします。

| データ | 内容 | 規則 |
|---|---|---|
| Shaondama種別 | `Wildcard` | Normalへ変更しない |
| Battle ID | 個体が属するBattle | 生成または変換元から引き継ぎ、別Battleへ付け替えない |
| 個体識別情報 | Wildcard個体を一意に識別する情報 | `Battle ID + 個体識別情報`で一意にする |
| 生成元区分 | 最低保証補充またはParry変換 | 生成後も追跡できるようにする |
| 生成元識別情報 | 補充要求ID、または変換元邪音玉ID | 重複生成を防止できるようにする |
| Parry弾き情報 | Parry結果として対象ごとに確定した弾き方向、または力の適用に必要な一時情報 | Parry変換時だけ引き継ぎ、攻撃性能や恒久的な固有属性として扱わない |
| 表示用種別 | Wildcardの虹色表示を解決する参照 | 攻撃時の実効色・RGB Damageとは分離する |

フィールド名、型、採番方法、およびdataの分割単位は固定しません。Shaondama共通dataとAllocation後のpayloadは、[玉のデータ](/spec/shaondama-music/orb-data)を正本とします。

## Wildcard固有の音楽データ

Wildcardは生成時点では、特定のNoteEventに由来しません。そのため、Normal Shaondamaが持つ次の固定source情報を持ちません。

- source NoteEvent definition
- source NoteEvent occurrence
- 固有のpitch class
- 固有のexact MIDI Note／octave
- 固有の基本色
- Normal用の固定RGB Damage値

これらを仮値で埋めたり、生成時点で将来のAllocation先を予約したりしません。攻撃に使用する実効Note・実効色はAllocation時に解決します。

Wildcard自身は固有音を持たず、発音時の実効Noteおよび使用する音は、Allocation先のAttackEventまたはNoteEvent occurrenceに基づいて解決する。

## 最低保証不足による補充

### 不足判定の所有者

選択可能Shaondamaの最低保証数、現在数、不足数、および要求中個体数の算出は、[BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)を正本とします。

本ページのWildcard生成側は、最低保証数を独自に再計算しません。現在のBattleに対して有効な補充要求を受け取った場合、**要求された不足数分**のWildcardを生成対象として確定します。

```text
現在不足数
= max(0, 最低保証数 - 現在選択可能かつ非ReservedのShaondama数)

新規補充数
= max(0, 現在不足数 - 有効な補充要求中数)
```

この式の意味と要求重複防止はBGM生成側が所有します。本ページは受信した要求個数を独自に増減しません。

### 補充要求

最低保証補充要求は、少なくとも次の意味を伝達します。

| 項目 | 内容 |
|---|---|
| Battle ID | 補充対象Battle |
| 補充要求識別情報 | 同じ要求を識別し、二重生成を防ぐ情報 |
| 生成元区分 | 最低保証補充であること |
| 要求個数 | BGM生成側が確定した不足数 |

Battle IDが現在のBattleと一致しない要求、Battle終了後の要求、個数が有効でない要求は生成へ進めません。

同じ補充要求を再受信した場合も、同じBattle内で二重に個体を生成しません。具体的な冪等管理方法は実装設計に委ねます。

### 生成個数

1つの有効な補充要求に対して、要求個数と同数のWildcardを生成します。

- 要求数より少ない数を、周期的な後続生成で補う方式にはしません。
- 要求数より多い数を、将来の不足を見越して追加生成しません。
- 生成失敗またはcancelが発生した場合は、要求中数を解放できる結果を最低保証判定側へ返します。
- 選択可能化が完了した個体は、個体単位で最低保証判定側へ通知します。

### 出現演出と選択可能化

最低保証補充のWildcardは、[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)の共通出現経路へ渡します。

状態遷移は次のとおりです。

```text
生成要求
↓
論理生成
↓
出現演出中
↓
出現演出完了
↓
Gameplayへ制御移譲
↓
選択可能
```

| 状態 | Player選択 | 最低保証数への算入 |
|---|---|---|
| 生成要求中 | 不可 | 算入しない |
| 論理生成済み・出現演出開始前 | 不可 | 算入しない |
| 出現演出中 | 不可 | 算入しない |
| 出現演出完了処理中 | 不可 | 算入しない |
| 制御移譲後・選択可能 | 可 | 非`Reserved`なら算入する |

出現演出中は、レティクル検索、Click Charge、Drag Charge、Allocation候補へ含めません。論理生成されたことだけを理由に選択可能扱いにしません。

各個体は自身の出現演出が完了した時点でGameplayへ制御を渡し、選択可能にします。複数個体を同じ要求で生成した場合も、Batch全体の最後まで待たず、演出完了した個体から個別に選択可能化します。

出現演出時間は一定の調整パラメータとしますが、具体秒数は未確定です。演出方式、RadioWhaleの姿勢、生成位置、および完了通知の詳細は、[ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning)を正本とします。

### 補充待ち中の最低保証

Wildcardが出現演出中であるため一時的に最低保証数を下回っていても、Battleおよび音楽時計を停止・巻き戻しません。

演出中個体を先に最低保証数へ算入することもしません。出現演出完了後、実際に選択可能となった個体だけを算入します。

Battle開始前のReady判定では、必要数のShaondamaが実際に選択可能になるまでShaondama Supply Readyを成立させません。このReady判定の正本は、[BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama)です。

Normal Shaondamaを使用するBattleではRadioWhaleを必須とします。RadioWhale不在時にNormalを別経路で選択可能化し、最低保証を満たしたものとしてBattleを開始しません。

## 邪音玉のParry成功による変換

### 変換条件

Wildcardへ変換できるParry対象は**邪音玉だけ**です。

次のどちらの成功評価でも、邪音玉からWildcardへの変換を行います。

- 通常Parry
- Just Parry

同じParry判定batch内の有効な邪音玉はすべてParry成功となり、batch判定時点の同じNormal／Just評価を適用します。Normal／Justのどちらでも、生成数、Wildcard種別、選択可能化条件、および弾き移動の基本性能に差を設けません。Just Parryだけの追加報酬としてWildcardを増やしたり、別種別・高性能のWildcardへ変換したり、より強い弾き移動を適用したりしません。Just ParryのStamina返却、強い演出、およびHitStopの強さ・長さは、[Playerアクション｜パリィ](/spec/player/player-action-parry)を正本とします。

同一Physics StepでPlayerのParry判定へ入った有効な邪音玉の収集、batch全体の成功、およびNormal／Just評価は、[Playerアクション｜パリィ](/spec/player/player-action-parry)を正本とします。本ページは、成功結果を受け取った各邪音玉からWildcardへの変換を定義します。

### 成功batch内で1弾につき1個

同一Physics Stepの1つの成功batchに複数の邪音玉が含まれる場合、batch内で成功した各弾を独立して変換します。Parry Window内に存在することだけを複数弾変換の基準にはしません。

```text
成功batch内の邪音玉1弾
→ Wildcard 1個

同一Physics Stepの成功batch内の邪音玉3弾
→ Wildcard 3個
```

成功batchの最初の1弾だけを変換して他の弾を無視したり、batch内の複数弾を1個のWildcardへまとめたりしません。別のPhysics Stepで接触した邪音玉は、同じbatchの変換対象へ追加しません。

### 変換位置と結果

成功した各邪音玉は、Parry成立時点の自身のworld位置でWildcard 1個へ即時変換します。邪音玉を弾いて移動させた後にWildcardへ変換するのではなく、変換commitと同時にPlayerのCharge対象として選択可能にし、その後、変換済みWildcardへ弾き方向の力を加えます。

変換成立時は次の結果を一体として扱います。

1. 対象邪音玉のParry成功を確定する
2. 対象邪音玉からPlayer Damageを発生させない
3. 対象邪音玉を攻撃projectileとして終了する
4. Parry成立時点のworld位置で、変換元と同じ`battleId`を持つWildcard 1個へ即時変換する
5. 生成元区分をParry変換とし、変換元邪音玉IDとWildcard個体IDを追跡可能にする
6. 変換commitと同時に、変換後のWildcardを選択可能にする
7. 対象ごとに確定した弾き方向へ、変換後のWildcardに一度だけ力を加える
8. 選択可能なWildcardとして移動・浮遊を継続する

邪音玉を反射projectileとして飛ばし続ける中間stateは設けません。実際に力を受けて移動する対象は、邪音玉ではなく変換後のWildcardです。この移動を反射された邪音玉、攻撃projectile、Player／EnemyへのDamage源、Parry対象、または追加のWildcard変換triggerとして扱いません。

Gameplay上の変換結果が同じであれば、既存objectをWildcardへ変換するか、新しいWildcard objectへ置換するかは実装詳細とします。いずれの場合も、邪音玉としての移動、Collision、Damage、およびParry要求の送信は変換commit前に終了します。邪音玉側の終了処理は、[邪音玉](/spec/enemy/jaon-bullet)を正本とします。

同じ邪音玉から重複してWildcardを作らないよう、**変換元邪音玉IDと`battleId`の組み合わせ**に対して変換を一度だけ成立させます。同じ成功結果や変換要求を複数回受信した場合も、新しいWildcardを追加生成しません。

### 非対象攻撃

次の攻撃または接触からWildcardを生成しません。

- Enemyの体当たり
- Enemy本体との接触
- 接触攻撃
- 邪音玉以外のprojectile
- その他の非邪音玉攻撃

Parrying中であっても、非邪音玉攻撃をWildcard生成triggerへ変換しません。これらの攻撃がPlayerへ与えるDamageやReactionは、各攻撃とPlayer被弾側の仕様に従います。

### Parry変換commitと即時選択可能化

Parry由来Wildcardは、変換commitと同時にPlayerのCharge対象として選択可能になります。変換commitと選択可能化の間に、出現演出待ち、RadioWhaleからの制御移譲、timer、遅延callback、または別frameの通知待ちを挟みません。

Parry由来Wildcardには、最低保証補充用の次の経路を適用しません。

- RadioWhaleの通常受付
- RadioWhaleの背中側Spawn
- 最低保証補充用の生成位置
- 一定時間の出現演出
- 出現演出完了通知
- Gameplayへの制御移譲

表示上の変換演出を継続することはできますが、その演出をGameplay上の選択可能化gateとして使用しません。変換後のWildcardは、弾き移動中もレティクル検索、Click Charge、Drag Charge、およびAllocation候補へ含められます。

Parry由来Wildcardが現在のBattleに属し、選択可能であり、非`Reserved`かつ終了処理中でなければ、変換commit時点から最低保証数へ算入します。変換commitより前に完了したCharge対象検索や最低保証数snapshotへ遡って追加せず、commit後に開始または再評価される検索から取得可能とします。

Battle結果確定後、または現在Battleと異なる`battleId`の要求・callbackからは、変換commit、選択可能化、最低保証算入、または力の付与を行いません。

### 変換後の弾き移動

力を加える対象は、変換commit後のWildcardです。固定の「Playerから離れる方向」を使用せず、Parry結果として対象ごとに確定した弾き方向を受け取り、その方向へ一度だけ力を加えます。同一batchに複数の邪音玉が含まれる場合も、各弾に対応する弾き結果を、それぞれから変換されたWildcardへ個別に適用します。

正確な弾き方向の算出方法は現時点では未確定です。入力方向、Playerの向き、接触方向などから本ページで独自に補完せず、[Playerアクション｜パリィ](/spec/player/player-action-parry)の実装・調整検討事項とします。

本ページは、変換後のWildcardへ対象ごとの弾き方向の力を1回だけ適用する契約を定義します。力の強さ、減衰、最大移動量、落ち着くまでの時間、および実際の弾き移動は、[浮遊・挙動](/spec/shaondama-music/floating-behavior)を正本とします。力を受けた後の衝突、浮遊、Lifetime、`Reserved`、消費、およびBattle終了も、同ページの共通規則へ接続します。

## 選択可能化後の挙動

選択可能となったWildcardは、生成元にかかわらず、Normal Shaondamaと共通のPlayer選択、Charge、`Reserved`、消費、および終了規則へ接続します。Parry由来Wildcardは変換commit時点でこの状態へ直接入り、選択可能なまま弾き移動と浮遊を継続します。

選択可能化後の衝突、浮遊、一般Lifetime、`Reserved`、自然破裂の有無、Charge成功との競合、およびBattle終了時のGameplay無効化は、[浮遊・挙動](/spec/shaondama-music/floating-behavior)を正本とします。

最低保証数へ算入する条件は、生成元にかかわらず次のとおりです。

- 現在のBattle IDに属する
- 実際に選択可能である
- `Reserved`ではない
- 終了処理中ではない

最低保証補充の生成要求中、論理生成済み、出現演出中、選択可能化前の個体、および生成元にかかわらず`Reserved`、終了処理中、旧Battle所属のWildcardは算入しません。Parry由来Wildcardには、最低保証補充用の出現演出中・選択可能化前stateを設けません。

## Allocationへの接続

### 通常AttackEvent

Wildcardは、Current Normal AttackEventの未充填Slotに対してワイルドカードとして使用できます。

どのSlotを候補とするか、複数候補がある場合の順序、Click／Drag Chargeのatomic判定、および`Reserved`へのcommitは、[Charge Allocation](/spec/draw-system/charge-allocation)を正本とします。

旧仕様の「BGMが鳴らしたChord IDを起点に待機構成の不足音へ割り当てる」方式は使用しません。現行のCurrent AttackEventと未充填SlotへAllocationします。

### Weak AttackEvent

Current Normal AttackEventが存在しない場合、WildcardをWeak Attackへ使用できます。

Wildcardは固定source NoteEvent occurrenceを持たないため、Weak Charge判定時点より後で最初に発音するNoteEvent occurrenceを検索し、そのoccurrenceへ一時的に解決します。

### loop境界を越える次NoteEvent検索

Wildcard Weakの次NoteEvent検索は、現在の音楽loop末を検索終了条件にしません。

```text
Weak Charge判定
↓
現loop内で、判定時点より後のNoteEvent occurrenceを検索
├─ 候補あり：最初のoccurrenceを使用
└─ 候補なし：次loop occurrenceの最初のNoteEvent occurrenceを使用
```

次loopへ進む場合も、MusicChart上の同じNoteEvent定義へ曖昧に紐づけるのではなく、**次loopに属する別のsource occurrence**として識別します。

loop occurrenceを失ってloop内時刻やNote名だけで参照しません。Weak AttackEventの生成、発火時刻、実効Noteの解決、および候補が存在しない場合の扱いは、[Charge Allocation](/spec/draw-system/charge-allocation)と[BGM MusicChart仕様](/spec/bgm/bgm-music-chart)を正本とします。

## 表示と実効値

### 虹色表示

Wildcardは、PlayerがNormal Shaondamaと区別できるよう虹色で表示します。

虹色はWildcardという種別を示す表示であり、攻撃時に使用する単一の実効色、RGB Damage値、または複数色Damageを直接意味しません。

虹色の具体的なshader、色変化速度、発光、particle、およびアクセシビリティ対応は演出調整項目です。これらの見た目をGameplay上の実効値判定に使用しません。

### 実効Note・実効色

Wildcardの実効Note、octave込みMIDI Note、および実効色は、生成時ではなくAllocation時に割当先から解決します。

| Allocation先 | 実効値の解決元 |
|---|---|
| Normal AttackEvent Slot | 対象Slotが要求する音程、octave込みMIDI Note、対応色 |
| Weak AttackEvent | Weak用に解決した次のNoteEvent occurrenceの音程、octave込みMIDI Note、対応色 |

具体的な解決手順は[Charge Allocation](/spec/draw-system/charge-allocation)、保持するruntime dataとPalette Bulletへ渡すpayloadは[玉のデータ](/spec/shaondama-music/orb-data)を正本とします。

### RGB Damageと専用調整

WildcardへNormal用の固定RGB Damage値を持たせません。攻撃ごとの実効色とRGB Damage payloadは、Allocation後の実効値およびDamage側の規則に従います。

Wildcardの攻撃力はNormalとは別枠の調整データを参照します。WildcardをNormalより強めに調整する方針ですが、具体的なDamage値または倍率は未確定です。

本ページはWildcard専用Damage調整項目の存在を所有します。RGBの内訳、effective Note／color payload、最終Damage計算、およびEnemy側の上限値は、[玉のデータ](/spec/shaondama-music/orb-data)、[Charge Allocation](/spec/draw-system/charge-allocation)、Palette Bullet、およびEnemy Damageの各担当ページへ委譲します。

## Battle終了・Room Retry

### Battle終了

Battle結果が確定した後は、そのBattleに属するWildcardから新しいGameplay結果を発生させません。

少なくとも次を無効化または破棄対象とします。

- 未処理の最低保証補充要求
- 要求中数として追跡している補充予約
- 論理生成済み・出現演出開始前のWildcard
- 出現演出中のWildcard
- 遅延している出現演出完了通知・選択可能化通知
- Parry変換要求、未処理の変換callback、および未適用の弾き移動処理
- 選択可能なWildcard
- `Reserved`中のWildcard
- Wildcard由来の未確定Allocation参照・実効値参照

Battle結果確定後は、現在Battleの邪音玉に対しても新しいWildcardへの変換、選択可能化、最低保証算入、または力の付与を行いません。見た目上の終了演出を行う場合も、Player選択、最低保証、Allocation、発音、Damageへ接続しません。

### Room Retry

Room Retryでは新しいBattle IDを発行し、現在Roomの先頭からBattle runtimeを再構築します。

旧BattleのWildcard個体、補充要求、生成元識別情報、出現演出、timer、完了通知、Parry変換状態、弾き移動処理、選択可能状態、`Reserved`状態、およびAllocation参照を新Battleへ持ち越しません。

新Battleでは、新しいBattle IDに属する最低保証判定と邪音玉からのみWildcard生成を開始します。旧Battle IDの要求や通知を受信しても、新しい個体の変換・生成・選択可能化・最低保証算入・力の付与へ使用しません。

## 他システムとの接続

| システム | 本ページとの接続 | 正本 |
|---|---|---|
| BGM側のShaondama生成 | 最低保証不足数を算出し、要求中数を管理して補充要求を送る。Parry由来Wildcardは、変換commit後の再評価から選択可能かつ非`Reserved`の個体として数える | [BGM側のシャオンダマ生成](/spec/bgm/bgm-make-syaonndama) |
| RadioWhale Spawn | 最低保証補充のWildcardだけを通常受付し、出現演出完了後に選択可能化する。Parry由来Wildcardの変換・選択可能化・弾き移動は管理しない | [ラジクジラ｜シャオンダマ生成](/spec/radiowhale/shaondama-spawning) |
| 浮遊・挙動 | Parry由来Wildcardの弾き移動に関する調整データと実際の移動、およびその後の衝突、浮遊、Lifetime、`Reserved`、終了競合を管理する | [浮遊・挙動](/spec/shaondama-music/floating-behavior) |
| Orb data | 種別、Battle ID、個体ID、生成元、変換元邪音玉ID、一時的な弾き情報、表示、実効値payloadを保持する | [玉のデータ](/spec/shaondama-music/orb-data) |
| Player Parry | 同一Physics Stepの邪音玉をbatchとして収集し、batch全体の成功とNormal／Just評価、および対象ごとの弾き方向を確定する | [Playerアクション｜パリィ](/spec/player/player-action-parry) |
| 邪音玉 | Parry成功時にDamageを無効化し、攻撃projectileとして終了して、Parry成立位置・`battleId`・変換元邪音玉ID・弾き方向を1弾ごとの変換要求として渡す | [邪音玉](/spec/enemy/jaon-bullet) |
| Charge Allocation | Normal SlotまたはWeakへの割当と実効Note／色を解決する | [Charge Allocation](/spec/draw-system/charge-allocation) |
| MusicChart | loopを越えた次NoteEvent occurrenceを識別可能にする | [BGM MusicChart仕様](/spec/bgm/bgm-music-chart) |
| Game／Room | Battle終了とRoom Retryの破棄境界、新Battle IDを管理する | [ゲーム全体](/spec/game/)、[戦闘](/spec/combat/) |

## 責務境界

| 事項 | 所有者・正本 |
|---|---|
| Wildcardの2つの生成元と生成個数規則 | 本ページ |
| 最低保証数・現在数・不足数・要求中数の算出 | BGM側のShaondama生成 |
| 最低保証補充の出現状態遷移・完了通知 | RadioWhale Spawn |
| 同一Physics StepのParry判定batch・通常／Just判定・Stamina・HitStop | Player Parry |
| 邪音玉のprojectile lifecycle・Damage無効化・変換要求 | 邪音玉 |
| 成功batch内の1弾1個変換・変換元邪音玉IDと`battleId`による重複防止 | 本ページ |
| Parry成立位置での即時変換・変換commitと同時の選択可能化・最低保証算入条件 | 本ページ |
| 対象ごとの弾き方向の確定・受け渡し | Player Parry／邪音玉 |
| 変換後のWildcardへ対象ごとの弾き方向の力を一度だけ加える契約 | 本ページ |
| 弾き移動の力・減衰・最大移動量・落ち着くまでの時間の調整データと、実際の移動挙動 | [浮遊・挙動](/spec/shaondama-music/floating-behavior) || Wildcardの共通runtime data | Orb data |
| 通常Slot／Weak Allocationと実効値解決 | Charge Allocation |
| 選択可能化後の衝突・浮遊・Lifetime・`Reserved`・消費・終了lifecycle | Floating |
| Wildcard専用Damage調整項目 | 本ページ |
| RGB payloadと最終Damage計算 | Orb data／Palette Bullet／Enemy Damage |

## 例外・禁止事項

- Wildcardを固定周期または少量自然発生だけで補充してはいけません。
- 最低保証不足と無関係な自動生成を、現行の補充経路へ混在させてはいけません。
- 最低保証補充要求の個数をWildcard側で独自に増減してはいけません。
- 最低保証補充の生成要求中、論理生成済み、出現演出中のWildcardを選択可能または最低保証算入済みとして扱ってはいけません。
- 最低保証補充のWildcardを、出現演出完了前にChargeまたはAllocation対象へ含めてはいけません。
- 邪音玉の通常Parry成功を変換対象から除外し、Just ParryだけでWildcardへ変換してはいけません。
- Normal／JustによってWildcardの生成数、種別、選択条件、または弾き移動の基本性能を変えてはいけません。
- 同一Physics Stepの成功batch内にある複数の邪音玉を、1個のWildcardへまとめてはいけません。
- 変換元邪音玉IDと`battleId`が同じ変換要求から、Wildcardを重複生成してはいけません。
- 邪音玉を反射弾として移動させてからWildcardを生成する中間経路を設けてはいけません。
- 変換後のWildcardを、反射された邪音玉、攻撃projectile、Player／EnemyへのDamage源、Parry対象、または追加のWildcard変換triggerとして扱ってはいけません。
- 変換後のWildcardへ力を加える前に、邪音玉としての移動を挟んではいけません。
- 弾き方向を固定の「Playerから離れる方向」と決め打ちしてはいけません。
- 体当たり、接触攻撃、その他の非邪音玉攻撃からWildcardを生成してはいけません。
- Parry由来Wildcardへ、RadioWhaleの通常受付、背中側Spawn、最低保証補充用の出現演出時間、演出完了通知、またはGameplayへの制御移譲を適用してはいけません。
- Parry由来Wildcardの変換commitと選択可能化の間に、timer、遅延callback、別frame待ち、または表示演出の完了待ちを挟んではいけません。
- 変換commitより前に完了したCharge対象検索へ、Parry由来Wildcardを遡って追加してはいけません。
- 旧Chord IDや待機Chordの不足音を起点にWildcardのAllocation先を解決してはいけません。
- Wildcard Weakの次NoteEvent検索をloop境界で打ち切ってはいけません。
- 次loopのNoteEventを現loopと同じsource occurrenceとして扱ってはいけません。
- Wildcardへ固定source NoteEvent、固有音程、固有基本色、Normal用RGB Damage値を設定してはいけません。
- 虹色表示を実効色やRGB Damage payloadとして直接使用してはいけません。
- Battle終了後またはRoom Retry後に、旧BattleのWildcard、要求、変換、timer、完了通知、弾き移動処理、Allocation参照をGameplayへ持ち越してはいけません。
- Battle結果確定後、または現在Battleと異なる`battleId`の遅延処理から、変換・選択可能化・最低保証算入・力の付与を行ってはいけません。

## パラメータ

| パラメータ | 値 | 状態 | 所有者 |
|---|---|---|---|
| 選択可能Shaondamaの最低保証数 | 未決 | 調整予定 | BGM側のShaondama生成 |
| 最低保証補充の出現演出時間 | 未決・一定値 | 調整予定 | RadioWhale Spawn |
| Parry弾き方向の具体的な算出規則 | 未決 | 実装・操作感検証で決定 | Player Parry |
| Wildcard専用Damage値または倍率 | 未決 | Gameplayテストで調整予定 | 本ページ |
| 虹色表示の演出値 | 未決 | Presentation調整予定 | 表示・Effects側 |

Parry由来Wildcardの弾き移動に関する力の強さ、減衰、最大移動量、および落ち着くまでの時間は、[浮遊・挙動](/spec/shaondama-music/floating-behavior)のパラメータ表を正本とします。本ページでは同じ調整値を重複管理しません。

値が未決であっても、最低保証不足数分を生成すること、最低保証補充を出現演出完了後に選択可能化すること、および同一Physics Stepの成功batch内で邪音玉1弾につき各Parry成立位置へWildcard 1個を即時変換することは変更しません。Parry由来Wildcardを変換commitと同時に選択可能にし、その後、対象ごとの弾き方向へ一度だけ力を加える処理順も変更しません。

## 未決事項

- Parry結果として対象ごとの弾き方向を算出する具体的な方法
- 最低保証補充に使用する出現演出時間の具体秒数
- 選択可能Shaondamaの最低保証数の具体値
- Wildcard専用の具体的なDamage値または倍率
- 虹色表示のshader、VFX、色変化、および音響の具体内容

次の事項は未決ではありません。

- Wildcardの生成元は最低保証不足と邪音玉のParry成功の2種類である
- 最低保証補充では要求された不足数分を生成する
- 最低保証補充は出現演出完了後に選択可能になる
- 最低保証補充の出現演出中は選択不可・最低保証算入外である
- 同一Physics StepでPlayerのParry判定へ入った有効な邪音玉は、1つの成功batchとして扱う
- 通常Parry／Just Parryのどちらでも同じ種別・選択条件・弾き移動の基本性能のWildcardへ変換し、生成数にも差を設けない
- 成功batch内の邪音玉1弾につき、各弾のParry成立位置でWildcard 1個へ即時変換する
- Parry由来Wildcardは変換commitと同時に選択可能になり、選択可能かつ非`Reserved`なら同時点から最低保証数へ算入される
- Parry由来WildcardはRadioWhaleの通常受付や最低保証補充用の出現演出を使用しない
- 変換後のWildcardへ対象ごとの弾き方向の力を一度だけ加え、移動中も選択可能とする
- 変換後の移動からDamage、再Parry、または追加のWildcard変換を発生させない
- 変換元邪音玉IDと`battleId`によって重複生成を防ぐ
- 邪音玉以外の攻撃からWildcardを生成しない
- Wildcard Weakの次NoteEvent検索はloop境界を越える
- Battle終了・Room Retry時に旧BattleのWildcardを持ち越さない

## 関連タスク

<PageRelations />
