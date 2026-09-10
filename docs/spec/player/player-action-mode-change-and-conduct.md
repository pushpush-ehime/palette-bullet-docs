---
title: "Playerアクション｜モードチェンジとコンダクト"
description: Palette BulletにおけるPlayerのモードチェンジ・コンダクト仕様
pageType: spec
category: "Player"
order: 60
status: 仮仕様
relatedTasks: []
---

# Playerアクション｜モードチェンジとコンダクト

::: info 名称について
本ページで使用する「モードチェンジ」と「コンダクト」は、どちらも仮称です。

「モードチェンジ」は音楽理論上の「mode」だけを意味する名称ではありません。Stage中に、曲全体の聞こえ方とPlayerの戦い方をまとめて切り替える機能を指します。

最終的な機能名、各エフェクター名、各コンダクト名は、Gameplay検証とUI設計を行った後に決定します。
:::

## 目的

本ページでは、PlayerがStage前に構成した複数のモードを戦闘中に小節単位で切り替える「モードチェンジ」と、一つのAttackEvent occurrence全体へ演奏・発射指示を付ける「コンダクト」のGameplay上の正本契約を定義します。

この二つによって、Playerが単に攻撃を強くするのではなく、以下を同時に考える体験を作ります。

- Stage前に、聞こえ方と戦い方が異なるモードを構成する
- HP、スタミナ、Enemy、場の状況、次の小節を見てモードを切り替える
- Charge前にコンダクトを選び、有効なCharge Pressでその選択をsnapshotする
- Charge中も次回用のコンダクトを選びながら、進行中Chargeのsnapshotは変えない
- 選択結果を音、見た目・挙動、攻撃や回復などの明示的な値へ同じ設定から反映する

本ページは、今回合意した新仕様を一か所へ保存し、後続の既存ページ同期と実装検討で参照するためのページです。

## このページが扱う範囲

本ページでは、主に以下を扱います。

- モードの種類と編集可否
- 拠点で行うモード構成の概要と正本への導線
- Stage中のモード選択、次の小節頭での適用、クールタイム
- Stage、Room、Retryをまたぐモードのライフサイクル
- コンダクトの選択状態、Charge Press snapshot、Charge成功時の付与commitとクールタイム
- AttackEvent単位のコンダクト制約
- Normal／Weak、Click／Drag、Chord／Arpeggioとの接続
- モードとコンダクトが同時に作用する場合の参照時点
- 音響、RadioWhale、Shaondamaとの責務境界
- 初期検証で確認する面白さ

本ページでは、Unity上の具体的な実装構造を先に固定しません。

- Runtime Ownerを実装する具体的なクラス名・field名
- Production Event／Commandの具体名
- Event payloadやIdentifierの最終形式
- Input Action Assetの具体的なAction名
- Audio Mixer／DSPの具体的な構成
- 各エフェクター／コンダクトの最終数値

これらは、既存の正本仕様との接続を確認した後に別途定義します。

## 用語

| 用語 | 本ページでの意味 | 仕様状態 |
| --- | --- | --- |
| モードチェンジ | Stage中に、曲全体の聞こえ方とPlayerの戦い方を切り替える機能 | 仮称・機能方針は確定 |
| モード | 音への作用と、長所・短所を持つ戦い方の設定をひとまとまりにしたもの | 4種類を使用 |
| エフェクター | 編集可能なモードのスロットへセットし、音と戦い方の両方を変化させる設定要素 | 種類・効果は未決 |
| コンダクト | 一つのAttackEvent occurrence全体へ付与する演奏・発射指示 | 仮称・付与規則は確定 |
| Player側の選択コンダクト | Player Runtimeが保持し、次の有効なCharge Pressでsnapshotする選択 | Charge中も次回用として変更可能 |
| Charge Press snapshot | 有効なCharge Press時に取得し、そのChargeだけが使用する一時的なコンダクト | Action開始時・Charge成功時には取り直さない |
| 付与済みコンダクト | Conduct付与commit成功時にAttackEvent occurrenceへ固定されたコンダクト | 付与後は変更不可 |
| コンダクト未選択状態（通常状態） | Playerがコンダクトを選択していない明示的な選択肢 | Stage開始・Retry・付与成功後・cooldown中の状態。Normal AttackEventやNormal Shaondamaとは別の意味 |
| pending Mode | 受理済みで、次の対象小節頭への適用を待つMode ID | 適用前の有効入力で上書き・取消できる |

本ページで「次の小節頭」と記載した場合、MusicChartが表す楽曲本来の音楽時間上で次に到達する論理小節境界を指します。Tempo／拍子変更があっても、記譜上の1小節を1小節として扱います。

## コア体験

モードチェンジとコンダクトは、音だけを変える装飾機能でも、数値だけを変える一般的な装備システムでもありません。

```text
Stage前
モード2～4のエフェクター、段階、接続順を構成
↓
Stage中
状況と次の小節を見てモード変更を要求
↓
次の小節頭
新しい聞こえ方と戦い方へ一括切替
↓
Charge前
使うコンダクトを選択
↓
有効なCharge Press
Player側の選択コンダクトをsnapshot
↓
Charge成功
Press snapshotを成功したAllocationと同じAttackEvent occurrenceへcommit
↓
Fire Music Position
そのoccurrenceへ有効Modeをsnapshot
↓
Palette Bullet化・発射
Mode snapshotと付与済みコンダクトを反映
```

各選択は、音とGameplayの両方から違いを理解できる必要があります。音楽知識がないPlayerにも聞こえ方と効果から役割が伝わり、上級者には接続順、段階、切替タイミングを研究する余地を残します。

## MusicChart／モード／コンダクトの責務境界

三つの要素は、以下の責務を持ちます。

| 要素 | 担当すること | 担当しないこと |
| --- | --- | --- |
| MusicChart | 楽曲側が決める「何を・いつ鳴らすか」 | Playerが現在使うモードやコンダクトの事前指定 |
| モードチェンジ | 現在の曲全体をどのような音と戦い方にするか | AttackEventごとの演奏・発射指示 |
| コンダクト | 一つのAttackEventをどのように演奏・発射するか | 楽曲元データや現在のモードの書き換え |

基本接続は以下です。

```text
MusicChart
↓
Normal AttackEventを音楽時間上に提示
↓
有効なCharge PressでConductをsnapshot
↓
Charge成功時に、成功したAllocationと同じAttackEvent occurrenceへConductを付与
↓
Fire Music PositionでAttackEvent occurrenceが発火を開始
↓
Modeをoccurrence全体へsnapshot
↓
既存仕様が定める各発射タイミングでShaondamaをPalette Bullet化して発射
```

Weakの場合は、既存のAllocation規則に従ってCharge成功時にWeak AttackEventを動的に作り、同じ成功処理の中でコンダクトを付与します。

一度取得したMode snapshotは、Chord／Arpeggio／Weak AttackEvent全体で共有します。Arpeggioの後続Entryや発射済みPalette BulletがPlayerのcurrent Modeを読み直すことはありません。

次の境界を守ります。

- PlayerのモードやコンダクトをMusicChartへ事前に埋め込まない
- MusicChartの元データをPlayer操作で書き換えない
- コンダクトは、実際のStage挑戦中に使用されるAttackEventへ付与する
- モード変更によってAttackEventへ付与済みのコンダクトを書き換えない
- コンダクトによってMusicChartの元データを書き換えない
- 実際にスピーカーから出た音声波形を解析して攻撃結果を決めない
- 同じ安定した設定データから、音、見た目・挙動、攻撃や回復などの数値変化を決める
- 採用済みの標準Unity Visual ScriptingのPlayer基盤と競合する第二のPlayer State管理者を作らない
- 具体的なクラス名、field名、Production Event、Command名は本ページで確定しない

### ShaondamaとPalette Bullet化

Shaondamaは元から世界内に浮遊しています。

Playerは世界内の選択可能なShaondamaを選択してChargeし、Charge成功後のShaondamaは`Reserved`として対応するAttackEventの発火を待ちます。AttackEventの対応する発射タイミングで、そのShaondamaがPalette Bullet化し、弾丸として飛んでいきます。

これは、元のShaondamaと無関係な別のGameplay objectを作成するという意味ではありません。同一個体は、Palette Bullet化した時点でShaondamaとしての浮遊状態と`Reserved`状態を終了します。

```text
世界内に浮遊するShaondama
↓
Playerが選択してCharge
↓
Charge成功・Reserved
↓
AttackEvent発火待ち
↓
対応する発射タイミングでPalette Bullet化
↓
弾丸として発射
```

Charge成功時にWeak AttackEventを動的に作ることと、AttackEvent発火処理でShaondamaがPalette Bullet化することは別の処理です。Weak AttackEventを作った時点で、Shaondamaが直ちに発射されるわけではありません。

Charge、Allocation、`Reserved`、AttackEvent発火、Palette Bullet化の詳細な正本は、それぞれ既存ページへ委譲します。本ページでは、モードとコンダクトがそれらのどの時点で接続するかだけを定義します。

## モードチェンジ

### 基本的な役割

モードチェンジは、Stage中に曲全体の聞こえ方とPlayerの戦い方を切り替える機能です。

各モードは必ず以下を満たします。

- 切替によって聞こえる変化がある
- 戦い方に関する長所がある
- 戦い方に関する短所がある
- 他のモードの単純な上位互換にならない

### モード総数

モードは合計4種類です。

| モード | 編集 | 役割 |
| --- | --- | --- |
| モード1 | Playerは編集できない | 固定の立て直し用モード |
| モード2 | 拠点の専用機能で編集できる | Playerが作る役割別モード |
| モード3 | 拠点の専用機能で編集できる | Playerが作る役割別モード |
| モード4 | 拠点の専用機能で編集できる | Playerが作る役割別モード |

### モード1

モード1は、Stage開始時とRetry時の初期Modeであり、Playerが編集できない固定の立て直し用Modeです。

初期仕様は次のとおりです。

| 対象 | 初期仕様 |
| --- | --- |
| Stamina自然回復速度 | 1.5倍 |
| Palette BulletのDirect Contact Damage | 0.75倍 |
| Palette BulletのExplosion Damage | 0.75倍 |
| 戦闘BGM | 高域を抑えた、穏やかで丸い聞こえ方 |

1.5倍と0.75倍は調整可能な初期値です。最終Tuning値と具体的なDSPは未決です。

モード1は、HP自然回復、被Damage軽減、または`Dead`からの復活を追加しません。Stamina自然回復速度の倍率は、既存の回復開始条件、回復待機、Dash／Parry中の回復禁止、および`MaxStamina`制限を解除しません。これらの基礎契約は[Playerステータス](/spec/player/player-status)を正本とします。

### モード2～4

モード2～4は、Playerが拠点の専用機能で内容を作るモードです。

三つの編集可能Modeは、拠点でEffectorの構成と並び順を準備し、Save Dataへ保存します。

詳細な構成契約は[モード構成・エフェクター仕様](/spec/player/mode-configuration-and-effectors)を正本とし、本ページでは重複して定義しません。

### 拠点とStageの役割

拠点ではMode 2～4の構成を編集し、Stage中は保存済みMode 1～4のどれを使用するか選択します。拠点では「現在使用中のMode」を選択しません。

## モード構成とエフェクター接続順

Mode 2～4の構成、slot、重複可否、段階、並び順、編集可能な場面、およびSave Dataは、[モード構成・エフェクター仕様](/spec/player/mode-configuration-and-effectors)を正本とします。

本ページでは、AttackEventのMode snapshotに含まれるEffectorを左から右へ適用し、その結果へConductを適用する高レベルな順序だけを定義します。

## Modeの初期適用範囲

- 攻撃系Mode効果は、AttackEvent由来のPalette Bulletへ適用する
- 未Charge Normal Shaondamaの自然破裂Weak攻撃には適用しない
- Enemy AI、移動速度、攻撃頻度をModeから直接変更しない
- Shaondama浮遊の変化は、採用未定の将来Presentation候補とする
- Stamina回復などPlayer自身へ作用する効果は、current Modeが有効な間だけ適用する

Charge時点ではModeをShaondamaやAllocation Slotへ固定しません。攻撃系Mode効果の対象とsnapshot規則は後述します。

## モード入力と小節同期切替

### 入力

モード1～4は、キーボードの`1`～`4`へ直接対応させます。

| デフォルト入力 | 選択するモード |
| --- | --- |
| `1` | モード1 |
| `2` | モード2 |
| `3` | モード3 |
| `4` | モード4 |

これはGameplay上で目的のモードを順送りせず直接選択することを意味します。Player Runtimeが物理キーを直接参照する実装にはせず、既存の入力抽象化方針に従います。具体的なInput Action名は本ページでは確定しません。

マウスホイールはモード選択に使用しません。

### 変更要求と適用

Mode選択入力を受け付けた時点では、音やGameplay値を即座に切り替えません。選択先のMode IDを`pending Mode`として保持し、次の対象小節頭で適用します。

```text
`1`～`4`の有効入力
↓
pending Modeとして受理
↓
次の小節頭まで現在モードを維持
↓
小節境界へ到達
↓
選択されたモードへ一括切替
```

適用前に複数のMode入力を受理した場合は、最後に受理したModeだけをpendingとして保持します。

current Modeを入力した場合は次のように処理します。

| pending | 処理 |
| --- | --- |
| なし | 無処理 |
| current Modeとは異なるModeを保持中 | pendingを取り消す |

無処理とpending取消ではMode cooldownを開始しません。

小節頭より前に受理した入力だけを、その小節頭で適用します。小節頭と同時または小節頭より後の入力は、次の小節頭の対象です。小節頭で先行pendingを適用してMode cooldownが開始した場合、同じ小節頭の新規Mode入力は破棄します。

Gameplay上の意図として、古いModeから新しいModeへ徐々に切り替えません。

音声のクリックノイズなどを防ぐために極短時間の技術的補間が必要な場合は、Gameplay上の段階的切替とは区別します。補間方法と長さは実装時の未決事項です。

### 入力gate

Mode入力は、system pre-rollを含むPlayer操作可能なGameplayで、別の操作lockがない場合に受理します。Movement中、Charge中、およびParry中であることだけを理由に拒否せず、Mode入力はそれらを中断しません。

system pre-roll中も、Playerが操作可能で既存の入力gateを満たす場合はMode入力を受け付けます。BGM Audioがまだ音源位置0で停止していることを拒否理由にはしません。受理したpending Modeは、次に到達する有効な小節頭で通常規則どおり適用します。system pre-roll中であっても、Mode cooldown中など以下の拒否条件は変わりません。

次の状態では拒否します。

- Battle準備中
- Pause中
- HitStop中
- Room移動演出中
- Battle結果確定後
- `Dead`中
- Mode cooldown中

拒否した入力は保存、buffer、予約、または後から再実行しません。Action先行入力、Dashキャンセル入力buffer、およびParry専用のHitStop入力bufferをMode入力へ流用しません。

### 同じ小節頭での処理順

Mode適用とAttackEvent occurrenceの発火開始が同じ小節頭に成立する場合は、新しいModeを先に適用します。

```text
小節頭へ到達
↓
予約されていた新モードを適用
↓
同じ小節頭のAttackEvent occurrenceが発火開始
↓
新Modeをsnapshot
```

この順序により、その小節頭で発火を開始するoccurrenceは新Modeをsnapshotします。小節頭と同時の新規入力は前節の規則どおり次の小節頭向けであり、このsnapshotへは影響しません。

### クールタイム

Mode cooldownの初期値は4小節で、Tuning可能です。秒数へ換算せず、MusicChart上の論理小節を数えます。Tempo／拍子変更があっても、記譜上の1小節を1カウントとします。

適用された小節を1小節目として1～4小節目をlockし、5小節目の小節頭で新しいMode入力を解禁します。5小節目で受理した入力は、通常規則どおり6小節目の小節頭で適用します。

```text
Mode適用小節 = lock 1小節目
↓
2～4小節目 = lock
↓
5小節目の小節頭 = 入力解禁
↓
5小節目で受理したpending = 6小節目の小節頭で適用
```

cooldownは、異なるMode IDが小節頭で実際に適用された場合だけ開始します。構成内容が同じでもMode IDが異なれば開始します。current Modeの再選択による無処理、またはpending取消では開始しません。

cooldown中のMode入力は破棄し、予約しません。Mode切替操作自体はStamina、HP、Itemなどを消費せず、種類別コストや使用回数上限を追加しません。

BGM LoopによってMusicChart上の表示小節番号やloop occurrenceが切り替わっても、Mode cooldownの残り小節数を初期化しません。Loop前後で到達した論理小節を順に数え、Loopをまたいだ場合も残り小節数から継続します。Audio再生秒、固定Tempoから換算した秒数、またはFrame数で代用しません。具体的なfield名やcounter実装は本ページでは固定しません。

## モードのStage／Room／Retryライフサイクル

以下はMode／ConductのGameplay上の確定契約です。後続PR Bはこの契約をGame／Player Status／States／Deathの詳細表へ同期しますが、新しい挙動を決定しません。

### 状態別のMode入力・pending・cooldown

| 状態 | 新規Mode入力 | pending Mode | Mode cooldown |
| --- | --- | --- | --- |
| 操作可能なGameplay | 入力gateを満たせば受理 | 次の有効な小節頭で適用 | 論理小節単位で進行 |
| system pre-roll | 入力gateを満たせば受理 | 次の有効な小節頭で適用 | 通常規則どおり論理小節単位で進行 |
| Pause | 拒否し、予約しない | 停止・保持し、小節頭適用を行わない | 残り小節数を停止・保持 |
| HitStop | 拒否し、buffer・予約しない | 有効な小節頭へ到達した場合は適用 | 論理小節単位で進行 |
| Room移動開始／演出中 | 拒否し、予約しない | 移動開始時に未適用pendingだけを破棄し、演出中は適用しない | 残り小節数を保持して停止 |
| 新しいRoomの開始後 | Gameplayが操作可能になった後は入力gateに従う | 破棄済みpendingを復元しない | 新しいMusicChartが有効かつGameplayが操作可能になった後から再開 |
| Stage終了／Retry | 拒否 | 破棄 | 破棄 |

### Pause／Resume

Pause開始時は、未適用のpending Modeを破棄せず、停止・保持します。Mode cooldownの残り小節数も停止・保持し、Pause中はcooldownを進めず、小節頭でのpending適用も発生させません。新しいMode入力は拒否し、予約しません。

Resume後は、Pause時に停止していた音楽位置と小節の関係を維持したまま、pending Modeの適用判定とMode cooldownの進行を再開します。

Conduct cooldownもPause中は停止し、Player側の現在Conduct選択と残り時間を保持します。Resume後は保持していた残り時間から再開します。

### HitStop

HitStop中も、既存のBGM／MusicChartが管理する音楽時間は進行します。したがって、Mode cooldownも論理小節単位で進行し、有効な小節頭へ到達した場合は保持済みpending Modeを適用します。適用によって実際にMode IDが変わった場合は、通常どおり4小節のMode cooldownを開始します。

HitStop中の新しいMode入力は拒否し、buffer・予約しません。Parry専用のHitStop入力bufferをMode入力へ流用しません。Conduct cooldownはHitStop中も進行し、停止させません。

### 通常のRoom移動

Room移動開始時は、未適用のpending Modeだけを破棄します。次の状態はRoom間で維持します。

- current Mode
- Mode 2～4の保存済み構成
- Mode cooldownの残り小節数
- Player側の現在Conduct選択
- Conduct cooldownの残り時間

Room移動演出中は、Mode cooldownとConduct cooldownを進めず、残量を保持します。pending Modeの適用と新しいMode入力を行わず、Conductの新しい選択入力も通常の操作lockに従って受け付けません。拒否した入力を予約しません。

新しいRoomでは、そのRoomのMusicChartが有効になり、Gameplayが操作可能になった後からMode cooldownを残り小節数で、Conduct cooldownを残り時間で再開します。Room移動開始時に破棄したpending Modeは復元せず、current ModeとPlayer側の現在Conduct選択は維持した状態から再開します。

### Stage終了／Retry

通常のRoom移動とは異なり、Stage終了とRetryでは、Runtime上のcurrent Mode、Player側の現在Conduct選択、pending Mode、および両cooldownを破棄します。Stage開始時とRetry後の新しい挑戦はMode 1から開始し、Conductは未選択状態から開始します。

Mode 2～4のSave Data上の構成は、通常のRoom移動、Stage終了、およびRetryで失いません。

## コンダクト

### 基本的な役割

コンダクトは、一つの音だけではなく、一つのAttackEvent occurrence全体に対する演奏・発射指示です。

ChordやArpeggioでは一つのAttackEventに複数音が含まれますが、音ごとに別のコンダクトを持たせません。同じAttackEventに属する音、発射対象、発射列全体へ一つのコンダクトを適用します。

初期採用するコンダクトは「ひろがり」と「やまびこ」です。Accent、Staccato、とがり、Legato、速度変化、およびその他の指揮表現は採用済みではなく、残す場合も将来候補として扱います。

### ひろがり

ひろがりは、対象AttackEvent occurrenceに属する各Palette Bulletへ適用します。

- Palette Bullet数を増やさない
- 弾道、Target、直進／非追尾を変更しない
- Mode適用後のExplosion Radiusだけを1.5倍にする
- Direct Contact Damageを変更しない
- Explosion Damageを変更しない
- 距離減衰を追加しない
- 音程とTimingを維持し、音の広がりを強める

1.5倍は調整可能な初期値です。「Damageを変更しない」とは、Mode適用後のDamageへひろがりによる追加変更を行わないという意味です。

### やまびこ

やまびこは新しいPalette Bulletを生成・再発射せず、各Palette BulletにGameplay上の第二爆発と音響Repeatを一度だけ予約します。

Gameplay上の第二爆発は次の契約に従います。

- 第一爆発から0.5秒後に、同じ位置で一度だけ発生する
- Explosion Damageだけを発生させ、Direct Contact Damageを再発生させない
- 半径はMode適用後の通常Explosion Radiusと同じとする
- DamageはMode適用後の通常Explosion Damageの50%とする
- 第二爆発から追加のやまびこを発生させない
- Battle終了時に未発生の第二爆発を破棄する

音響Repeatは次の契約に従います。

- 各Palette Bulletの元の発射音から0.5秒後に一度だけ発生する
- 音量は元の発射音の50%とする
- Battle終了時に未発生のRepeatを破棄する

音響Repeatは元の発射音、第二爆発は第一爆発をそれぞれ起点とし、互いを起点にしません。0.5秒と50%は調整可能な初期値です。

## コンダクト選択とCharge成功時の処理

### 入力

コンダクトはマウスホイール回転で選択します。正方向の循環順は次のとおりで、逆回転は逆順です。

```text
未選択 → ひろがり → やまびこ → 未選択
```

未選択は明示的な選択肢です。ホイール回転はMode選択およびホイール押し込みのMarker入力とは分離します。

Player側の選択はCharge中も変更でき、Conduct付与済みAttackEventがCurrentであっても次回用の選択・変更を受け付けます。ただし、進行中Chargeが使用するコンダクトは有効なCharge Press時のsnapshotであり、その後のPlayer側選択変更では変わりません。

### Charge Press snapshot

Charge入力評価を開始でき、対象Shaondamaを取得できた有効なCharge Pressで、Player側の選択コンダクトを一時snapshotします。

- Click／Dragへ分岐する前に取得する
- Dashing中の有効なCharge先行入力へ同じsnapshotを引き継ぐ
- 実際のAction開始時やCharge成功時に取り直さない
- 無効Press、対象なし、開始不可Pressから有効なsnapshotを作らない
- WheelとCharge Pressが同じ時刻なら、Wheel更新後にsnapshotする
- 時刻を区別できる場合は時刻順に処理する
- miss／cancelでは一時snapshotだけを破棄し、Player側の選択を消費しない

Charge中にPlayer側の選択を変更しても、そのChargeのsnapshotは変更しません。

### Charge成功時の処理

Charge成功時は、成功したAllocationが返した同じAttackEvent occurrenceを対象とします。Current AttackEventを再検索したり、別occurrenceへ付け替えたりしません。

次の両方を満たす場合だけ、Conduct付与commitを一つの処理として成立させます。

```text
対象OccurrenceにConduct未付与
AND
Press snapshotが未選択ではない
```

commitでは次を同時に成立させます。

1. occurrenceへPress snapshotのConductを一つ付与する
2. Player側の現在選択を強制的に未選択へ戻す
3. 共通3秒Conduct cooldownを開始する

```text
ClickのCharge判定EventまたはDragのRelease atomic commitがsuccess
↓
成功したAllocationが返した同じAttackEvent occurrenceを使用
↓
未付与かつPress snapshotあり？
↓
Yes: 付与＋現在選択を未選択化＋3秒cooldown開始
```

Charge成功までにPlayerが別Conductを選んでいても、付与成功時にはその新しい選択を含めて未選択へ戻します。

次の場合はConduct付与、Player側選択の消費、およびcooldown開始を行いません。

- 対象occurrenceへすでにConductが付与済み
- Press snapshotが未選択
- Charge miss
- Charge cancel
- 無効なPress

既付与の場合はPlayer側の現在選択を保持します。Conductを付与できなくてもCharge成功とAllocation結果は取り消しません。Weak AttackEventでは、既存の動的生成と同じ成功処理内で同じ付与commitを使用します。

コンダクト付与後もShaondamaは`Reserved`として発火を待ちます。付与は即時発射を意味せず、MusicChartに保存された静的AttackEvent Definitionも変更しません。

### Conduct cooldown

Conduct cooldownの初期値は3秒で、ひろがり／やまびこ共通のTuning値です。occurrenceへConductを実際に付与できた瞬間から開始します。

- cooldown中はPlayer側を未選択に固定する
- cooldown中のWheel入力は破棄し、予約しない
- Charge自体は行える
- cooldown中のCharge Pressは未選択をsnapshotする
- そのChargeの成功前にcooldownが終了しても、取得済みsnapshotは未選択のままとする
- cooldown終了時に以前の選択を復元しない
- 追加のStamina、HP、Item消費や種類別cooldownを設けない

時間境界は次のとおりです。

| 境界 | Conduct cooldown |
| --- | --- |
| 通常Gameplay | 進行 |
| system pre-roll | 通常規則どおり進行 |
| HitStop | 進行 |
| Pause | 停止し、残量を維持 |
| Room移動演出 | 停止し、残量を維持 |
| 新しいRoomのMusicChart有効化・操作可能後 | 残り時間から再開 |
| Stage終了 | 破棄 |
| Retry | 破棄 |

Pause中はPlayer側の現在Conduct選択を保持し、Resume後に残りcooldown時間から再開します。通常のRoom移動でもPlayer側の現在Conduct選択と残り時間を維持しますが、Room移動演出中の新しい選択入力は通常の操作lockに従って拒否し、予約しません。新しいRoomのMusicChartが有効になり、Gameplayが操作可能になった後に残り時間から再開します。

### AttackEvent単位の制約

- 一つのAttackEventに付けられるコンダクトは最大一つ
- 同じAttackEventへ複数のコンダクトを重ねない
- 同じAttackEvent内のShaondamaごとに異なるコンダクトを付けない
- Drag ChargeでもShaondama単位へ分割せず、AttackEvent全体へ一つ付ける
- Chordの各音へ異なるコンダクトを付けない
- Arpeggioの順番ごとに異なるコンダクトを付けない
- コンダクトはAttackEventへ付与後、上書き・切替できない

コンダクトは付与commit成功時にAttackEvent occurrenceへ固定します。したがって、同じoccurrenceへ先にCharge済みのShaondamaがある場合も、後から付与されたコンダクトがAttackEvent全体へ作用します。

### StageとRetry

- 同じStage挑戦中は、付与成功またはPlayer自身のWheel操作までPlayer側の選択を維持する
- Stage終了時にPlayer側の選択状態を解除する
- Game Over後のRetryではコンダクト未選択状態から開始する
- 前回のStage挑戦で選択中だったコンダクトをRetryへ持ち越さない
- AttackEventへ付与済みだったコンダクトを新しいStage挑戦へ持ち越さない
- Stage終了とRetryではConduct cooldownも破棄する

## Normal／Weak／Click／Drag／Chord／Arpeggioとの関係

本ページは、既存のCharge／Allocation／AttackEvent仕様を変更せず、以下の接続を追加します。

| 既存要素 | コンダクトとの関係 | モードとの関係 |
| --- | --- | --- |
| Normal AttackEvent | 有効Pressのsnapshotを、Charge成功時に同じoccurrenceへ付与できる | `Fire Music Position`でoccurrence全体へsnapshotする |
| Weak AttackEvent | 動的生成と同じ成功処理で同じ付与commitを使用する | `Fire Music Position`でoccurrence全体へsnapshotする |
| Click Charge | Press時にsnapshotし、1個のAllocation success先へcommitする | Charge時点では固定しない |
| Drag Charge | Press時にsnapshotし、Atomic success先へ一つcommitする | Charge時点では固定しない |
| Chord | 全Entry・全発射音へ同じ付与済みConductを作用させる | occurrenceの同じMode snapshotを共有する |
| Arpeggio | 一連のEntry・発射音へ同じ付与済みConductを作用させる | 後続Entryを含め、occurrenceの同じMode snapshotを共有する |

Normal／Weakの決定、Click／Dragの`success / miss`、Slot Allocation、Chord／Arpeggioの音楽的順序・Timing、AttackEventの発火結果は、既存の各正本ページで決定します。本ページは、それらを再判定しません。

Weak AttackEventは、Current Normal AttackEventが存在しない場合のClick Charge successで動的に作られる単音AttackEventです。Drag Chargeは既存仕様どおり一つのCurrent Normal AttackEventに対するAtomic判定であり、Weakへfallbackしません。

未ChargeのNormal Shaondamaがsource NoteEvent到達時に行う自然破裂Weak攻撃は、Weak AttackEventでもPalette Bullet発射でもありません。自然破裂を理由としてConductを付与・消費せず、攻撃系Mode効果も作用させません。

特に、以下を守ります。

- Current Normal AttackEventがない場合にだけWeak Allocationを検討する既存規則を変更しない
- Current Normal AttackEventのSlot不一致をWeakへfallbackさせない
- Drag選択順をArpeggioの音楽的順序に使用しない
- Charge成功時はAllocationと`Reserved`を確定し、Palette Bullet化は対応する発射タイミングまで行わない
- コンダクトの有無を`Complete / Incomplete / Zero Charge`の再判定根拠にしない
- モードの有無をMusicChart上の要求音、発火位置、Chord／Arpeggio構造の書き換えに使用しない

## Mode snapshot

AttackEvent occurrenceが`Fire Music Position`へ到達し、発火を開始した瞬間にcurrent Modeをsnapshotします。最初のPalette Bulletが実際に発射された時点ではありません。先頭EntryがEmptyでもsnapshot取得を遅らせません。

- 一度取得したMode snapshotをChord／Arpeggio／Weak AttackEvent全体で共有する
- 小節をまたぐArpeggioの後続Entryでcurrent Modeを読み直さない
- 同じ小節頭でMode適用と発火開始が成立する場合、新Modeを先に適用してからsnapshotする
- Palette Bulletは発射時にoccurrenceのsnapshotを引き継ぎ、飛行、Direct Contact、Explosion、消滅まで維持する
- Charge時点ではShaondamaやAllocation SlotへModeを固定しない
- 発射済みPalette Bulletへ後からMode変更を反映しない

AttackEvent／Palette Bullet側の具体的なdata受け渡しとProducer契約は後続PR Cへ委譲します。

## ModeとConductの計算順

ModeとConductは排他的ではなく、次の順で同時に作用できます。

1. Palette Bulletの通常値・RGBなどの元データを取得する
2. AttackEventのMode snapshotに含まれるEffectorを左から右へ適用する
3. Mode適用後の結果へ付与済みConductを適用する
4. 既存のDirect／Explosion、Wildcard override、Enemy側集約・丸め・Clampへ接続する

- Enemy受信後にMode／Conduct倍率を再適用しない
- ひろがりはMode適用後のDamageを変更せず、Explosion Radiusだけを変更する
- やまびこの50%は、Enemy反映後・丸め後ではなく、Mode適用後の通常Explosion RGB payloadを基準にする
- 第二爆発ではMode chainや種別倍率を再実行せず、算出済み基準から一度だけ生成する

詳細なPalette Bullet Producer、Damage候補、およびEnemy受信側の同期は後続PR Cへ委譲します。

## 音響レイヤーとの関係

### 必須範囲

| 機能 | 最低限、聞こえる変化を加える対象 |
| --- | --- |
| モード | 完成済み戦闘BGM、Palette Bullet音程音 |
| コンダクト | Palette Bullet音程音、Gameplay発射SE |

Modeは、完成済み戦闘BGMとPalette Bullet音程音へ聞いて分かる変化を加えます。原則としてGameplay発射SE、着弾SE、UI音へ作用しません。

ConductはPalette Bullet音程音とGameplay発射SEへ作用し、戦闘BGMを変更しません。

戦闘BGMは小節頭で新Modeへ切り替えます。一方、発火済みArpeggioの後続音程音は、そのoccurrenceが保持する旧Mode snapshotを使用します。

音声の不連続を防ぐ短い技術Crossfadeを許可します。既発生のDelay／Reverb Tailは不自然に切断せず、新しいGameplay snapshotへ変更する根拠には使用しません。具体的なDSP、Crossfade時間、およびTail処理はPR #72のAudio側詳細へ委譲します。

### 音響とGameplayの分離

実際にスピーカーから出た音を解析して、Damage、回復量、弾速、攻撃範囲などを決めません。

```text
安定したMode／Conduct設定データ
├─ Audio処理へ入力
├─ Presentation処理へ入力
└─ Gameplay値・挙動の計算へ入力
```

Audio、Presentation、Gameplayは同じ設定を参照しますが、音声波形、DSP結果、Material、VFXの状態をGameplay判定の正本にはしません。

### モードに含めないもの

現時点では、以下をモードへ含めません。

- BGMの恒常的なTempo変更
- BGMの拍子変更
- BGMの楽器編成変更
- RuntimeでのBGMステム／楽器レイヤー切替

強弱、Crescendo／Diminuendo、転調などは採用済みではありません。

## Runtime責務

概念上のOwnerは次のとおりです。具体的なクラス名、field名、Event／Command名、payload、およびInput Action名は固定しません。

| Owner | 保持・管理する内容 |
| --- | --- |
| Player Runtime | current Mode、pending Mode、Mode cooldown、Player側の選択Conduct、Conduct cooldown |
| Charge入力文脈 | 有効なCharge Pressで取得した一時Conduct snapshot |
| AttackEvent occurrence | 付与済みConduct、`Fire Music Position`で取得したMode snapshot |
| Palette Bullet | Mode／Conduct由来の不変派生dataまたは算出済み値 |
| Battle lifecycle | Pause／HitStop／Room／Stage終了／Retryにおける維持・停止・破棄 |
| Save Data | Mode 2～4の構成 |

Mode／Conductのために新しい`ActionState`を追加しません。既存Action buffer、Dashキャンセル入力buffer、およびParry専用HitStop入力bufferも流用しません。

## RadioWhaleとの関係

世界観・Presentation上は、エフェクターやモード構成を拠点の専用機能でRadioWhaleへセットする方向とします。

- モードによってRadioWhaleの雰囲気、VFX、音が将来変化する可能性がある
- 初期版ではRadioWhaleの外見変化を必須にしない
- 具体的なAnimation、VFX、SoundはRadioWhale側の詳細仕様とデザイン工程で決める

この方向性は、RadioWhaleがモードのRuntime状態を所有することを意味しません。

- RadioWhale自体をPlayer装備品として確定しない
- RadioWhaleをPlayer Stateの正本にしない
- RadioWhaleへ第二のPlayer State管理を持たせない
- RadioWhaleがMusicChartを解析・変更しない
- RadioWhaleがAttackEventへコンダクトを付与しない
- RadioWhaleがモードの小節同期切替時刻を決定しない
- current ModeなどのPlayer側状態はPlayer Runtimeが所有し、RadioWhaleへ所有させない

拠点の専用機能でRadioWhaleへセットするという表現は、RadioWhaleが拠点へ常駐すること、戦闘外で常時同行すること、Scene間で同じinstanceを維持することを確定しません。

## Shaondamaの浮遊との関係

以下は構想として存在しますが、確定仕様ではありません。

- エフェクターの性質によってShaondamaの浮遊挙動を変える
- MusicChartが持つ楽曲本来のTempoに合わせて浮遊リズムを変える
- モードの恒常的なTempo変更は行わない

これらを採用する場合も、Shaondamaの浮遊状態を音声波形から決めません。MusicChartの安定したTempo情報とモードの設定データを参照します。

`Reserved`中のShaondamaには、既存仕様上の停止、位置保持、AttackEventとの接続、Lifetime停止があります。浮遊変化を検討する際は、`Reserved`個体を再び通常浮遊させたり、発射位置・発射待ちを壊したりしないよう、既存規則との整合を先に確認します。

本ページのモードチェンジは、既存Shaondama仕様で廃止されている旧`Draw Mode`や、選択済みShaondama自体を直ちに敵へ飛ばす挙動を復活させるものではありません。

## 初期検証段階

固定プリセット版Mode／Conductは今回のプロトタイプ完成範囲に含めます。プロトタイプ全体では、まず通常のCharge→発射→浄化を通し、その後に本節の導入を進めます。Windows配布受入までの段階と完成条件は[プロトタイプ共通仕様](/spec/game/prototype#completion-policy)を正本とします。

現行のプロトタイプ仕様は拠点を対象外としているため、Mode 2～4は企画側が用意した固定プリセットで供給します。プリセットの具体的内容は後続のPrototype／Tuning仕様へ委譲し、Stage攻略中の編集は許可しません。

### 導入段階

| 段階 | 導入内容 | 確認目的 |
| --- | --- | --- |
| 1 | 固定プリセットのMode構成・切替と、ConductのPress snapshot・付与commit・cooldown | 責務境界、入力、ライフサイクル、発火時参照を検証する |
| 2 | Mode 1、ひろがり、やまびこの初期値をTuningしながら試遊する | 音と戦い方が結び付いた判断の面白さを検証する |

### 初期検証で確認する面白さ

- PlayerがStage前に、役割の異なるモード2～4を考えて構成できるか
- HP、スタミナ、Enemy、場の状況を見て、戦闘中にモードを切り替えたくなるか
- 次の小節を予測してモードを選ぶ判断が面白いか
- モード1へ戻る回復・立て直し判断が成立するか
- エフェクターの並び順を変えることで、音と戦い方の両方が変わるか
- Charge Press前にコンダクトを選び、Charge中に次回用選択を変えられることが演奏へ参加している感覚につながるか
- 「ひろがり」と「やまびこ」の使い分けが成立するか
- 一つの最適なモードや接続順だけに収束しないか
- 音楽知識がないPlayerでも、聞こえ方と効果から理解できるか
- 上級者が接続順、段階、モード切替タイミングを研究できるか

## 確定事項

本ページで確定した中核契約は次のとおりです。

- Modeは4種類で、Mode 1は編集不可、Mode 2～4は拠点で構成する
- Mode 1はStamina自然回復速度1.5倍、Direct／Explosion Damage 0.75倍を初期値とし、HP自然回復・被Damage軽減・復活は追加しない
- Modeは`1`～`4`で直接選択し、次の対象小節頭で適用する
- Mode cooldownは論理4小節で、実際に別Mode IDへ適用した場合だけ開始する
- system pre-roll中も入力gateを満たすMode入力を受け付け、次の有効な小節頭でpendingを適用する
- Pauseではpendingと両cooldownを停止・保持し、HitStopでは音楽時間に従ってModeの小節頭適用と両cooldownを進行する
- 通常のRoom移動ではpendingだけを破棄し、current Mode、保存済み構成、Conduct選択、および両cooldown残量を維持する。Stage終了／RetryではRuntime状態を破棄する
- BGM LoopをまたいでもMode cooldownを初期化せず、残り小節数から継続する
- Modeは`Fire Music Position`でAttackEvent occurrence全体へsnapshotする
- Conductは`未選択 → ひろがり → やまびこ → 未選択`をWheelで循環選択する
- Conductは有効なCharge Pressでsnapshotし、Charge成功時は成功したAllocationと同じoccurrenceへ付与commitする
- 付与成功時だけPlayer側を未選択へ戻し、共通3秒cooldownを開始する
- ひろがりとやまびこは初期採用仕様であり、Mode適用後の結果へ適用する
- MusicChartの静的元データをPlayerのMode／Conduct操作で変更しない
- 新しい`ActionState`や第二のPlayer State管理者を追加せず、既存bufferも流用しない

## 未決事項

- モードチェンジの正式名称
- コンダクトの正式名称
- 各エフェクターの正式名称
- 各コンダクトの正式名称
- モード1の正式名称
- Mode 1の最終Tuning値
- 固定エフェクターを内部的に持つか
- 具体的なEffectorカタログ、Level、上限、入手、解放、容量制限
- Effectorごとの計算式、上限、丸め、および具体的な音響処理
- Audio上の技術Crossfadeの長さと具体DSP
- モード切替UIと予告表示
- 使用できない状態でのFeedback
- コンダクト選択中のHUD表示
- AttackEventにすでにコンダクトがある場合のFeedback
- ひろがり／やまびこの最終Tuning値、VFX、具体DSP
- Accent、Staccato、とがり、Legato、速度変化など将来候補の採否
- Shaondama浮遊をMode Presentationへ含めるか
- 具体的なクラス名、field名、Event／Command名、payload、Input Action名
- Save Dataの具体schema、migration、Identifier

## 対象外

本ページのGameplay契約では、以下を確定しません。

- Unity実装
- Input Action Asset変更
- Production State Graph変更
- Event／Command Catalog確定
- Audio Mixer実装
- エフェクターの最終数値決定
- 既存仕様ページ全体の一斉修正
- RadioWhaleの最終デザイン確定
- VFXデザイン確定
- BGM素材やMIDIの変更

## 後続ページとの責務境界

この表は進捗表ではなく、今回変更しないページが所有する詳細責務と参照先を示します。

| 担当 | 所有する詳細責務 | 主な参照先 |
| --- | --- | --- |
| PR B | 本ページで確定したPause、HitStop、Room、Stage終了、RetryのGameplay契約をGame／Player Status／States／Deathの詳細表へ同期する。新しい挙動は決定しない | [ゲーム全体](/spec/game/)、[Player状態](/spec/player/states)、[Playerステータス](/spec/player/player-status)、[Player死亡](/spec/player/player-death) |
| PR C | AttackEvent発火、Mode snapshotの受け渡し、Palette Bullet／Damage候補／Enemy接続 | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)、[パレットブレット](/spec/combat/palette-bullet) |
| PR #72 | BGM／MusicChart／音響実装境界、Crossfade、Tail、具体DSP | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)、[MusicChart仕様](/spec/bgm/bgm-music-chart) |
| PR D | Prototype固定プリセット、Tuning、Runtime Trace | [プロトタイプ](/spec/game/prototype)、[プランナー向け調整パラメータ管理](/spec/common-technology/planner-tuning-parameter)、[Gameplay Runtime Trace](/spec/common-technology/gameplay-runtime-trace) |
| PR E | Mode／ConductのBattle HUD、cooldown、pending、入力拒否Feedback | [Battle HUD](/spec/ui/battle-hud) |
| PR F | ゲーム概要、用語、ガイド等の入口・横断参照 | [ゲーム概要](/game-overview) |

## 関連ページ

- [Player概要](/spec/player/)
- [Player入力と操作](/spec/player/input-and-controls)
- [モード構成・エフェクター仕様](/spec/player/mode-configuration-and-effectors)
- [Playerアクション｜チャージ](/spec/player/player-action-charge)
- [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)
- [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)
- [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)
- [MusicChart仕様](/spec/bgm/bgm-music-chart)
- [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)
- [パレットブレット](/spec/combat/palette-bullet)
- [浮遊・挙動](/spec/shaondama-music/floating-behavior)
- [現在のPlayer基盤と旧Player Action／State Graphの履歴](/spec/common-technology/action-state-manage)
- [Gameplay Runtime Trace](/spec/common-technology/gameplay-runtime-trace)
- [ラジクジラ](/spec/radiowhale/)

## 関連タスク

<PageRelations />
