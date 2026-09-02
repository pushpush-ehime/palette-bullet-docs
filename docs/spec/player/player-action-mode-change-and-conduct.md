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

本ページでは、PlayerがStage前に構成した複数のモードを戦闘中に小節単位で切り替える「モードチェンジ」と、一つのAttackEvent全体へ演奏・発射指示を付ける「コンダクト」の仮仕様を定義します。

この二つによって、Playerが単に攻撃を強くするのではなく、以下を同時に考える体験を作ります。

- Stage前に、聞こえ方と戦い方が異なるモードを構成する
- HP、スタミナ、Enemy、場の状況、次の小節を見てモードを切り替える
- Charge直前に、一つのAttackEventをどのように演奏・発射するか選ぶ
- 選択結果を音、見た目・挙動、攻撃や回復などの明示的な値へ同じ設定から反映する

本ページは、今回合意した新仕様を一か所へ保存し、後続の既存ページ同期と実装検討で参照するためのページです。

## このページが扱う範囲

本ページでは、主に以下を扱います。

- モードの種類と編集可否
- 拠点で行うモード構成
- エフェクターのスロット、段階、接続順
- Stage中のモード選択、次の小節頭での適用、クールタイム
- Stage、Room、Retryをまたぐモードのライフサイクル
- コンダクトの選択状態、保持、Charge成功時の付与と消費
- AttackEvent単位のコンダクト制約
- Normal／Weak、Click／Drag、Chord／Arpeggioとの接続
- モードとコンダクトが同時に作用する場合の参照時点
- 音響、RadioWhale、Shaondamaとの責務境界
- 初期検証で確認する面白さ

本ページでは、Unity上の具体的な実装構造を先に固定しません。

- モード状態を保持する具体的なRuntime Owner
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
| コンダクト | 一つのAttackEvent全体へ付与する演奏・発射指示 | 仮称・付与規則は確定 |
| 選択中コンダクト | Player側で選択され、次のCharge成功まで保持されているコンダクト | Charge成功前は変更可能 |
| 付与済みコンダクト | Charge成功時にAttackEventへ固定されたコンダクト | 付与後は変更不可 |
| コンダクト未選択状態（通常状態） | Playerがコンダクトを選択していない状態 | Stage開始・Retry・消費後の初期状態。Normal AttackEventやNormal Shaondamaとは別の意味 |

本ページで「次の小節頭」と記載した場合、MusicChartが表す楽曲本来の音楽時間上で次に到達する小節境界を指します。Tempo／拍子変更を含む具体的な算出方法は未決事項です。

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
一つのAttackEventに使うコンダクトを選択
↓
Charge成功
選択中コンダクトをAttackEvent全体へ固定
↓
AttackEventの発射タイミング
発射時点のモードと付与済みコンダクトを同時に反映
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
Charge成功時にConductをAttackEventへ付与
↓
既存仕様が定めるAttackEvent発火・各発射タイミング
↓
発射時点のModeを参照
↓
ShaondamaをPalette Bullet化して発射
```

Weakの場合は、既存のAllocation規則に従ってCharge成功時にWeak AttackEventを動的に作り、同じ成功処理の中でコンダクトを付与します。

次の境界を守ります。

- PlayerのモードやコンダクトをMusicChartへ事前に埋め込まない
- MusicChartの元データをPlayer操作で書き換えない
- コンダクトは、実際のStage挑戦中に使用されるAttackEventへ付与する
- モード変更によってAttackEventへ付与済みのコンダクトを書き換えない
- コンダクトによってMusicChartの元データを書き換えない
- 実際にスピーカーから出た音声波形を解析して攻撃結果を決めない
- 同じ安定した設定データから、音、見た目・挙動、攻撃や回復などの数値変化を決める
- 既存のPalette State Graphと競合する第二のPlayer State管理者を作らない
- 具体的なRuntime Owner、Production Event、Command名は本ページで確定しない

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

変化させる候補には、Damage、攻撃力、防御力、HP回復、スタミナ回復、スタミナ消費、のけぞりにくさ、弾速、攻撃範囲などがあります。どの値を採用するかは未決です。

採用時は「Gameplayへの効果」のような総称だけで済ませず、変化する値・挙動、算出順、上限、丸め処理を個別に定義します。

### モード総数

モードは合計4種類です。

| モード | 編集 | 役割 |
| --- | --- | --- |
| モード1 | Playerは編集できない | 固定の通常・回復用モード |
| モード2 | 拠点の専用機能で編集できる | Playerが作る役割別モード |
| モード3 | 拠点の専用機能で編集できる | Playerが作る役割別モード |
| モード4 | 拠点の専用機能で編集できる | Playerが作る役割別モード |

### モード1

モード1は、以下の役割を持つ固定モードです。

- Stage開始時の初期モード
- Game Over後のRetry時の初期モード
- 安全性や回復を重視する基準モード
- 攻撃面などに短所を持つモード
- Playerが内容を編集できないモード

モード1の具体的な音、回復内容、短所、数値は未決です。安全性や回復を重視することだけを理由として、他のモードより常に有利な上位互換にはしません。

モード1という名称だけを根拠に、HPの常時自然回復、`Dead`からの復活、既存Player Status契約にない回復処理を追加しません。

### モード2～4

モード2～4は、Playerが拠点の専用機能で内容を作るモードです。

三つの編集可能モードには、それぞれ異なる役割を持たせられます。ただし、利用できるエフェクター、入手・解放方法、段階上限、容量制限、Save Dataの保存範囲は未決です。

### 拠点とStageの役割

拠点では、以下を行います。

- モード2～4の内容を作る
- エフェクターをセットする
- エフェクターの並び順を変更する
- エフェクターの段階を調整する

拠点では「現在使用中のモード」を選択しません。使用中モードの選択は、クエスト／Stageへ出陣した後に行います。

以下の場所では、モードの中身を編集できません。

- Stage攻略中
- 戦闘中
- 通常のRoom移動中
- ポーズ画面

ポーズ画面からモード編集画面へ移動する仕様にはしません。

## モード構成とエフェクター接続順

### エフェクタースロット

Playerが編集できる各モードは、初期方針として最大3個のエフェクタースロットを持ちます。

- 一つのモードに最大3スロットを持つ
- 同じエフェクターは、一つのモード内で重複使用できない
- エフェクターは左から右へ順番に処理する
- Playerは並び順を変更できる
- 並び順によって、音と戦い方の両方が変わる
- 自由な連続ノブではなく、段階式で調整する
- 各調整値には上限を設ける
- エフェクターの選択、段階、並び順から、音と数値変化を決定する
- 攻撃力や防御力だけを音と無関係に直接調整する仕組みにはしない

```text
元の音・数値
↓
スロット1
↓
スロット2
↓
スロット3
↓
最終結果
```

### 接続順による変化の説明例

以下は、接続順が結果へ影響することを説明するための例です。数値とエフェクター効果そのものは確定仕様ではありません。

| 基礎Damage | 接続順 | 説明用結果 |
| --- | --- | --- |
| 100 | `+20 → ×1.5` | 180 |
| 100 | `×1.5 → +20` | 170 |

実際のエフェクターは、「加算を先、乗算を後」のような一つの接続順だけが常に最適にならないよう設計します。複数の値に対する長所・短所、値の変換、上限などを組み合わせる方針ですが、具体的な規則は未決です。

ここで確定する左から右への順次処理は、一つのモード内部におけるエフェクター接続順です。既存のRGB Damage、直撃／爆風倍率、Wildcard固有倍率、Enemy側の集約・丸め・Clampに対して、モードの計算結果をどこへ接続するかは本ページでは確定しません。

### 音と戦い方の一体性

一つのエフェクター設定から、少なくとも以下の二方向を決定できる構造にします。

| 出力先 | 内容 |
| --- | --- |
| 音 | 聞こえ方の変化 |
| Gameplay | 攻撃、回復、防御、移動・弾の挙動など、明示的に定義された値または挙動の変化 |

音の結果を解析してGameplay値を逆算せず、Gameplay値から後付けで無関係な音を選びません。エフェクターの安定した設定データを共通の入力とし、音とGameplayの各出力を決定します。

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

モード選択入力を受け付けた時点では、音やGameplay値を即座に切り替えません。選択先をモード変更要求として保持し、次の小節頭で適用します。

```text
Stage中に`1`～`4`を入力
↓
モード変更要求として受理
↓
次の小節頭まで現在モードを維持
↓
小節境界へ到達
↓
選択されたモードへ一括切替
```

Gameplay上の意図として、古いモードから新しいモードへ徐々に切り替えません。

音声のクリックノイズなどを防ぐために極短時間の技術的補間が必要な場合は、Gameplay上の段階的切替とは区別します。補間方法と長さは実装時の未決事項です。

### 同じ小節頭での処理順

モード変更の適用とPalette Bulletの発射が同じ小節頭に成立する場合は、新しいモードを先に適用します。

```text
小節頭へ到達
↓
予約されていた新モードを適用
↓
同じ小節頭のPalette Bullet発射処理
↓
新モードを参照
```

その小節頭で発射されるPalette Bulletには新しいモードを使用します。

Charge済みで`Reserved`のShaondamaも、Charge時点のモードを個体へ固定保存しません。対応する発射タイミングで有効なモードの影響を受けます。

Arpeggioでは、AttackEvent全体へコンダクトを固定したまま、各Palette Bulletの実際の発射時点で有効なモードを参照します。

### クールタイム

モードのクールタイムは、変更要求を受け付けた瞬間ではなく、選択されたモードが小節頭で実際に適用された瞬間から開始します。

- クールタイムの長さは、適用位置における1小節相当の秒数とする
- クールタイム中は別のモードへ変更できない
- クールタイム中のモード入力はその場で破棄する
- 破棄した入力を、クールタイム終了後に実行する予約入力にはしない

Tempo／拍子変更をまたぐ場合を含む「適用位置における1小節相当の秒数」の算出方法は未決です。

## モードのStage／Room／Retryライフサイクル

| 境界 | 使用中モード | モード2～4の設定内容 | 変更要求・クールタイム |
| --- | --- | --- | --- |
| Stage開始 | モード1から開始 | 拠点で作った内容を使用 | 初期状態から開始 |
| 同じStage挑戦中 | 小節同期切替の結果を維持 | 維持 | 通常規則で管理 |
| 通常のRoom移動 | 現在の使用中モードを維持 | 維持 | 詳細な受付境界は未決 |
| Game Over後のRetry | モード1へ戻す | 失わない | 変更要求とクールタイムを解除 |
| Stage終了 | 次のStageへ使用中モードを持ち越さない | 保存範囲に従って保持 | 終了時に解除 |

Stage中はモード変更要求を受け付けます。ただし、通常のRoom移動中に小節基準をどの音楽時間から取得するか、Battle外の区間で変更要求をいつ適用するかは未決です。

Retryでは、前回の挑戦で使用していたモード、未適用の変更要求、進行中のクールタイムを持ち越しません。一方、拠点で作ったモード2～4の構成自体は失いません。

## コンダクト

### 基本的な役割

コンダクトは、一つの音だけではなく、一つのAttackEvent全体に対する演奏・発射指示です。

ChordやArpeggioでは一つのAttackEventに複数音が含まれますが、音ごとに別のコンダクトを持たせません。同じAttackEventに属する音、発射対象、発射列全体へ一つのコンダクトを適用します。

### 現在の候補

以下は、すべてコンダクト側の候補です。名称と具体的効果は未決であり、候補であること自体を採用済み効果とみなしません。

- Accent
- Staccato
- ひろがり
- とがり
- やまびこ

以下は将来候補ですが、採用確定ではありません。

- Legato
- だんだん早く
- だんだん遅く
- その他の一定時間続く指揮表現

Cutは現在の候補へ含めません。

### 初期導入段階

初期導入は、以下の二段階で行います。

1. コンダクトを選択・保持し、Charge成功時にAttackEventへ付与・消費できる枠組みを作る
2. 次の試遊可能版で「ひろがり」「やまびこ」を追加する

枠組みだけを導入する段階では、具体的なコンダクト効果がなくても構いません。Gameplayとして面白さを検証する段階では、最低でも「ひろがり」と「やまびこ」を使用できるようにします。

### 音以外の変化

各コンダクトは将来、同じ設定から以下を決めます。

- Palette Bulletの見た目
- Palette Bulletの飛び方や広がり方
- 攻撃範囲
- 弾速
- Damage
- スタミナ消費
- その他の明示的な値・挙動

具体的な対応表、長所、短所、代償は未決です。見た目の具体的なデザイン制作はデザイン側へ委託しますが、戦闘中にコンダクトを識別するために必要な情報は、後でGameplay仕様として定義します。

「ひろがり」や「やまびこ」を具体化する場合も、既存の1 Occupied Slot＝1 Reserved Shaondama＝1 Palette Bullet、AttackEvent内で共有するTarget座標、Arpeggioの音楽的順序・Timing、直進・非追尾・非retarget、Complete Chordバフの成立条件を暗黙に変更しません。変更が必要な効果を採用する場合は、該当する正本ページで明示的に仕様を更新します。

## コンダクト選択とCharge成功時の処理

### 入力

コンダクトは、マウスホイール回転で選択します。

- マウスホイールをモード選択には使用しない
- マウスホイール押し込みのMarker入力とは別の入力として扱う
- Charge成功前であれば、ホイールで別のコンダクトへ変更できる
- Charge成功時点で選択されているコンダクトを使用する
- AttackEventへ付与された後は変更できない
- すでにコンダクトが付いているAttackEventでは、新しいコンダクト入力を受け付けない

「選択後は上書きできない」という規則にはしません。

| 状態 | 別コンダクトへの変更 |
| --- | --- |
| Player側で選択中・Charge成功前 | 変更できる |
| AttackEventへ付与済み | 変更・上書きできない |

### 選択状態の保持

一度コンダクトを選択した場合、次のCharge成功まで選択状態を維持します。

以下では、選択状態を消費・解除しません。

- Chargeしない
- Chargeに失敗する
- AttackEventが終了する
- Current Normal AttackEventが変更される
- Current Normal AttackEventが存在しない
- 次のChargeがWeak AttackEventになる
- 通常のRoom移動を行う
- モードを変更する

Normal／Weakの区別なく、次に成功したChargeで使用します。

現時点では、Playerが選択中コンダクトを任意にコンダクト未選択状態へ戻すことはできないものとして記録します。ただし、この操作はマウスホイールUIの設計と合わせて再確認する未決事項でもあります。Charge成功前に別のコンダクトへ変更することはできます。

### Charge成功時の処理

Charge成功時は、以下の順で処理します。

1. 成功したAllocation結果が指す、現在のStage挑戦中のAttackEvent occurrenceを確定する
2. Player側に選択中コンダクトがあるか確認する
3. そのAttackEvent occurrenceにコンダクトが未設定であれば、コンダクトを付与する
4. そのAttackEvent occurrenceへすでにCharge済みのShaondamaを含め、AttackEvent全体へ作用させる
5. Player側のコンダクト選択状態をコンダクト未選択状態へ戻す

```text
ClickのCharge判定EventまたはDragのRelease atomic commitがsuccess
↓
成功したAllocation結果の接続先AttackEvent occurrenceを確定
↓
選択中Conductを確認
↓
AttackEvent occurrenceに未設定ならConductを固定
↓
Player側の選択状態をコンダクト未選択へ戻す
```

Weak AttackEventの場合は、Charge成功時に既存のWeak Allocation規則でWeak AttackEventを作り、同じ成功処理の中でコンダクトを付与します。

コンダクト付与時にCurrent Normal AttackEventを検索し直したり、別のAttackEventへ付け替えたりしません。対象は、Charge成功判定とAllocation commitで確定した同じAttackEvent occurrenceです。MusicChartに保存された静的なAttackEvent Definitionは変更しません。

コンダクトをAttackEventへ付与した後も、Shaondamaは既存仕様に従って`Reserved`として発火を待ちます。コンダクトの付与は即時発射を意味しません。

### AttackEvent単位の制約

- 一つのAttackEventに付けられるコンダクトは最大一つ
- 同じAttackEventへ複数のコンダクトを重ねない
- 同じAttackEvent内のShaondamaごとに異なるコンダクトを付けない
- Drag ChargeでもShaondama単位へ分割せず、AttackEvent全体へ一つ付ける
- Chordの各音へ異なるコンダクトを付けない
- Arpeggioの順番ごとに異なるコンダクトを付けない
- コンダクトはAttackEventへ付与後、上書き・切替できない

コンダクトはCharge成功時にAttackEventへ固定します。したがって、同じAttackEventへ先にCharge済みのShaondamaがある場合も、後から付与されたコンダクトがAttackEvent全体へ作用します。

### StageとRetry

- 同じStage挑戦中は、Charge成功するまで選択中コンダクトを維持する
- Stage終了時にPlayer側の選択状態を解除する
- Game Over後のRetryではコンダクト未選択状態から開始する
- 前回のStage挑戦で選択中だったコンダクトをRetryへ持ち越さない
- AttackEventへ付与済みだったコンダクトを新しいStage挑戦へ持ち越さない

## Normal／Weak／Click／Drag／Chord／Arpeggioとの関係

本ページは、既存のCharge／Allocation／AttackEvent仕様を変更せず、以下の接続を追加します。

| 既存要素 | コンダクトとの関係 | モードとの関係 |
| --- | --- | --- |
| Normal AttackEvent | Charge成功時に、未設定なら一つ付与できる | 各発射時点の有効モードを使用する |
| Weak AttackEvent | Charge成功時の動的作成と同じ成功処理で一つ付与できる | 発射時点の有効モードを使用する |
| Click Charge | 1個のShaondamaのCharge成功を契機に、接続先AttackEventへ付与する | Charge時点では固定しない |
| Drag Charge | Atomic success時に、Shaondamaごとではなく接続先AttackEvent全体へ一つ付与する | Charge時点では固定しない |
| Chord | 全Entry・全発射音へ同じコンダクトを作用させる | Chordの発射時点の有効モードを使用する |
| Arpeggio | 一連のEntry・発射音へ同じコンダクトを作用させる | 各Entryの実際の発射時点の有効モードを使用する |

Normal／Weakの決定、Click／Dragの`success / miss`、Slot Allocation、Chord／Arpeggioの音楽的順序・Timing、AttackEventの発火結果は、既存の各正本ページで決定します。本ページは、それらを再判定しません。

Weak AttackEventは、Current Normal AttackEventが存在しない場合のClick Charge successで動的に作られる単音AttackEventです。Drag Chargeは既存仕様どおり一つのCurrent Normal AttackEventに対するAtomic判定であり、Weakへfallbackしません。

未ChargeのNormal Shaondamaがsource NoteEvent到達時に行う自然破裂Weak攻撃は、Weak AttackEventでもPalette Bullet発射でもありません。自然破裂を理由としてコンダクトを付与・消費せず、モードを自然破裂へ作用させるかは未決事項とします。

特に、以下を守ります。

- Current Normal AttackEventがない場合にだけWeak Allocationを検討する既存規則を変更しない
- Current Normal AttackEventのSlot不一致をWeakへfallbackさせない
- Drag選択順をArpeggioの音楽的順序に使用しない
- Charge成功時はAllocationと`Reserved`を確定し、Palette Bullet化は対応する発射タイミングまで行わない
- コンダクトの有無を`Complete / Incomplete / Zero Charge`の再判定根拠にしない
- モードの有無をMusicChart上の要求音、発火位置、Chord／Arpeggio構造の書き換えに使用しない

## モードとコンダクトの同時作用

モードとコンダクトは、排他的ではなく常に同時に作用できます。

Palette Bulletの発射時には、少なくとも以下を参照します。

- MusicChart／AttackEventが決めた「何を・いつ鳴らすか」
- Charge成功時にAttackEventへ保存されたコンダクト
- 各Palette Bulletの発射時点で有効なモード

| 要素 | 確定・参照時点 | 後から変更されるもの |
| --- | --- | --- |
| MusicChart／AttackEventの音楽情報 | 楽曲・Chart制作時および既存Runtime解決時 | Player操作では元データを変更しない |
| コンダクト | Charge成功時にAttackEventへ固定 | 付与後は変更しない |
| モード | 小節頭で有効モードを切替、Palette Bullet発射時に参照 | 後続の小節頭で別モードへ切替可能 |

モード切替と発射が同じ小節頭の場合は、新しいモードを先に適用します。モードを変更してもAttackEventのコンダクトは変化しません。コンダクトを付与してもMusicChartの元データは変化しません。

Arpeggioの途中で小節頭のモード切替が成立した場合、コンダクトは同じAttackEvent全体で固定したまま、切替前後のEntryがそれぞれの実発射時点で有効なモードを参照します。その結果、同じArpeggio AttackEvent内でEntryごとに参照モードが異なる場合があります。

音、見た目・挙動、攻撃や回復などの値は、実際の音声波形から逆算しません。モード設定とコンダクト設定を安定した入力データとして参照し、それぞれの出力を決定します。

## 音響レイヤーとの関係

### 必須範囲

| 機能 | 最低限、聞こえる変化を加える対象 |
| --- | --- |
| モード | 完成済みの戦闘BGM |
| コンダクト | Palette Bulletの発射音 |

モードは、少なくとも完成済み戦闘BGMへ聞いて分かる変化を加えます。

コンダクトは、少なくともPalette Bulletの発射音へ聞いて分かる変化を加えます。

ここでいう発射音は、Palette Bulletの発射時にPlayerへ聞こえる音を指します。既存仕様が分けている音程音、Gameplay上の発射SE、またはその両方のどれへコンダクトを掛けるかは未決です。

- Chordでは、そのAttackEventに属する発射音全体へ作用する
- Arpeggioでは、そのAttackEventに属する連続した発射音全体へ作用する
- Weak AttackEventでも同じ規則を使用する

### 音響とGameplayの分離

実際にスピーカーから出た音を解析して、Damage、回復量、弾速、攻撃範囲などを決めません。

```text
安定したMode／Conduct設定データ
├─ Audio処理へ入力
├─ Presentation処理へ入力
└─ Gameplay値・挙動の計算へ入力
```

Audio、Presentation、Gameplayは同じ設定を参照しますが、音声波形、Material、VFXの状態をGameplay判定の正本にはしません。

### モードに含めないもの

現時点では、以下をモードへ含めません。

- BGMの恒常的なTempo変更
- BGMの楽器編成変更
- RuntimeでのBGMステム／楽器レイヤー切替

強弱、Crescendo／Diminuendo、転調などは未決事項です。

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
- 実際にモード状態を保持するRuntime Ownerは未決事項とする

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

現行のプロトタイプ仕様は拠点を対象外としているため、本ページの追加だけではプロトタイプの完成条件を変更しません。拠点で行うモード2～4の構成を初期検証でどのように用意するかは、後続でプロトタイプ仕様と整合させます。

### 導入段階

| 段階 | 導入内容 | 確認目的 |
| --- | --- | --- |
| 1 | モード構成・切替と、コンダクト選択・保持・AttackEvent付与・消費の枠組み | 責務境界、入力、ライフサイクル、発火時参照を検証する |
| 2 | 試遊可能なモード差と、最低でも「ひろがり」「やまびこ」を導入 | 音と戦い方が結び付いた判断の面白さを検証する |

### 初期検証で確認する面白さ

- PlayerがStage前に、役割の異なるモード2～4を考えて構成できるか
- HP、スタミナ、Enemy、場の状況を見て、戦闘中にモードを切り替えたくなるか
- 次の小節を予測してモードを選ぶ判断が面白いか
- モード1へ戻る回復・立て直し判断が成立するか
- エフェクターの並び順を変えることで、音と戦い方の両方が変わるか
- コンダクトをCharge直前に選ぶ行為が、演奏へ参加している感覚につながるか
- 「ひろがり」と「やまびこ」の使い分けが成立するか
- 一つの最適なモードや接続順だけに収束しないか
- 音楽知識がないPlayerでも、聞こえ方と効果から理解できるか
- 上級者が接続順、段階、モード切替タイミングを研究できるか

## 確定事項

### 責務境界

- MusicChartは楽曲側の「何を・いつ鳴らすか」を所有する
- モードは現在の曲全体をどのような音と戦い方にするかを扱う
- コンダクトは一つのAttackEventをどのように演奏・発射するかを扱う
- モード／コンダクトでMusicChartの元データを書き換えない
- 音声波形、Material、VFXからGameplay結果を逆算しない
- Palette State Graphと競合する第二のPlayer State管理者を作らない

### モード

- モードは合計4種類とする
- モード1は固定の通常・回復用モードで、Playerは内容を編集できない
- モード2～4は拠点の専用機能で編集する
- 編集可能モードは初期方針として最大3エフェクタースロットを持つ
- エフェクターは左から右へ順番に処理し、並び順で音と戦い方の両方が変わる
- モードは`1`～`4`で直接選択し、マウスホイールでは選択しない
- 変更要求は次の小節頭で一括適用する
- 同じ小節頭では新モードを適用してからPalette Bulletを発射する
- 発射時点のモードを使用し、Charge時点のモードをShaondamaへ固定しない
- 実適用時から、その位置の1小節相当秒数のクールタイムを開始する
- クールタイム中の入力は破棄し、後から実行しない
- Stage開始とRetryではモード1から開始する
- 通常のRoom移動では使用中モードとモード2～4の設定内容を維持する
- Retryでは変更要求とクールタイムを解除し、モード2～4の設定内容は失わない
- モードは最低限、完成済み戦闘BGMへ聞こえる変化を加える

### コンダクト

- コンダクトは一つのAttackEvent全体に対する指示とする
- マウスホイール回転で選択し、ホイール押し込みのMarker入力と分離する
- Charge成功前は別のコンダクトへ変更できる
- 選択状態はNormal／Weakを問わず次のCharge成功まで維持する
- Charge成功時にAttackEventへ一つだけ付与し、Player側をコンダクト未選択状態へ戻す
- 付与後は上書き・切替できない
- すでにCharge済みのShaondamaを含め、AttackEvent全体へ作用する
- Click／Drag、Chord／ArpeggioでShaondamaや音ごとに分割しない
- Stage終了とRetryでPlayer側の選択状態を解除し、付与済みコンダクトを次の挑戦へ持ち越さない
- コンダクトは最低限、Palette Bulletの発射音へ聞こえる変化を加える
- 初期導入は「付与・消費できる枠組み」と「ひろがり／やまびこを使える試遊版」の二段階とする

## 未決事項

### 名称

- モードチェンジの正式名称
- コンダクトの正式名称
- 各エフェクターの正式名称
- 各コンダクトの正式名称
- モード1の正式名称

### モード1

- 正確な回復内容
- 正確な短所
- BGMの具体的な聞こえ方
- 固定エフェクターを内部的に持つか
- Tuning値

### モード2～4

- 採用するエフェクター一覧
- エフェクターの入手方法
- Storyによる解放順序
- 各段階の最大Level
- エフェクターごとの加算、乗算、変換、上限
- 丸め処理
- モード全体の総コストや容量制限
- 並び順による具体的な音と数値の変化
- 同じ接続順が常に最適にならないための規則
- 保存範囲とSave Data
- 異なるモード同士で同じエフェクターを同時に使用できるか

### モード切替

- Tempo／拍子変更がある位置での「1小節相当秒数」の算出
- モード変更要求と同Frameの各処理順序
- 同じ小節内に複数のモード変更要求を受けた場合の保持・上書き規則
- 現在使用中のモードを再選択した場合の扱い
- 通常のRoom移動中に参照する小節基準と適用タイミング
- 未適用のモード変更要求とクールタイムをRoom境界で維持するか
- Pause中の変更要求受付・小節頭適用・クールタイム進行
- Parry HitStop中の変更要求受付・小節頭適用・クールタイム進行
- Audio上の極短い補間
- Delay／Reverbなどの残響Tail
- モード切替UIと予告表示
- 使用できない状態でのFeedback

### コンダクト

- マウスホイール上の並び順
- コンダクト未選択状態をホイール選択肢へ含めるか
- Charge成功前に任意でコンダクト未選択状態へ戻せるか
- コンダクト選択中のHUD表示
- AttackEventにすでにコンダクトがある場合のFeedback
- 選択中コンダクトを保持したまま、コンダクト付与済みAttackEventがCurrentになった場合の入力gate
- Accent、Staccato、ひろがり、とがり、やまびこの具体的効果
- 各コンダクトの長所・短所
- スタミナ、弾速、Damageなどの具体的な代償
- 音、見た目、挙動、数値の対応表
- 将来のLegato
- だんだん早く／遅くを本当に採用するか
- 一時的なTempo変更を行う場合のBGM／MusicChart同期方法

### 音響範囲

- モードをPalette Bulletの音程音へも掛けるか
- モードをGameplay SEへ掛けるか
- BGM、Palette Bullet音、Gameplay SEでモードの掛かり方を分けるか
- コンダクトをPalette Bullet発射音以外へ掛けるか
- コンダクトを音程音、Gameplay上の発射SE、または両方のどれへ掛けるか
- BGM、Palette Bullet音、Gameplay SEのMix方法
- 実際に使用するAudio Mixer／DSP構成
- EQ、Compressor、Reverb、Ducking等の具体的構成
- Delay／Reverbの残響をモード切替後に残すか
- 強弱、Crescendo／Diminuendo、転調をモードへ含めるか

### Gameplayとの対応

以下は曖昧な総称のまま確定せず、採用する値・挙動を個別に決めます。

- Damage
- 攻撃力
- 防御力
- HP回復
- スタミナ回復
- スタミナ消費
- のけぞりにくさ
- 弾速
- 攻撃範囲
- Enemyの動き・攻撃へ影響するか
- Shaondamaの浮遊へ影響するか
- Normal Shaondamaの自然破裂Weak攻撃へモードを作用させるか
- モード内部の計算結果を、既存のRGB、直撃／爆風倍率、Wildcard倍率、Enemy側集約・丸め・Clampへ接続する順序
- Palette Bullet発射時に参照したモードの値・挙動を、飛行・命中・爆発までどのように保持するか

### Runtime・UI・保存

- モード状態を保持するRuntime Owner
- コンダクト選択状態と付与済みデータを保持するRuntime Owner
- 既存Palette State Graphとの具体的な接続形式
- Production Event／Command名とpayload
- Input Action名とInput Action Asset上の構成
- モード／コンダクトのUI詳細
- Gameplay上必要な識別Presentation
- 拠点の専用機能の画面・操作・解放条件
- 拠点を通らない現行プロトタイプでモード2～4を構成・試用する方法
- RadioWhaleへモード構成をセットするPresentation
- RadioWhaleの雰囲気、VFX、音をモードで変えるか
- 拠点・戦闘外でのRadioWhaleの存在とScene間ライフサイクル

### Shaondamaの浮遊

- エフェクターの性質によってShaondamaの浮遊挙動を変えるか
- MusicChartが持つ楽曲本来のTempoに合わせて浮遊リズムを変えるか
- `Reserved`中の停止・接続規則と浮遊変化をどう両立するか

## 対象外

本ページおよび本ページを追加する最初のDraft PRでは、以下を行いません。

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

## 後続で整合修正が必要な既存ページ

本ページの追加時点では、以下の既存ページを変更しません。後続作業では、本ページを参照しながら責務の重複や旧表現を確認します。

| 分類 | ページ | 後続で確認・同期する内容 |
| --- | --- | --- |
| 全体 | [ゲーム概要](/game-overview) | コア体験とStage前準備へのモード構成追加 |
| Player | [Player概要](/spec/player/) | Playerの主要行動とStage前／Stage中の役割 |
| Player | [Player入力と操作](/spec/player/input-and-controls) | `1`～`4`、マウスホイール回転、使用可能な場面、既存Charge説明 |
| Player | [Playerアクション｜チャージ](/spec/player/player-action-charge) | Charge成功時のコンダクト付与、Normal／Weak、Click／Dragとの接続 |
| Player | [Playerステータス](/spec/player/player-status) | HP・スタミナへ作用する効果を採用する場合のOwner境界 |
| Player | [Player状態](/spec/player/states) | 第二のState管理者を作らない境界とStage／Retry cleanup |
| Player | [Playerアクション遷移](/spec/player/player-action-transitions) | コンダクト選択がActionState遷移を不必要に増やさないこと |
| BGM | [BGM概要](/spec/bgm/) | モード／コンダクトとBGMカテゴリの高レベルな責務境界 |
| BGM | [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event) | MusicChart由来情報と、Stage挑戦中に付与するコンダクトの分離 |
| BGM | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement) | 発火時のコンダクト取得と、発射時点モード参照の接続 |
| BGM | [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection) | モード／コンダクトの必須音響範囲、小節境界、Mix責務 |
| BGM | [BGM→シャオンダマ生成仕様](/spec/bgm/bgm-make-syaonndama) | Shaondama生成とモード／コンダクトを混同しない境界 |
| BGM | [MusicChart仕様](/spec/bgm/bgm-music-chart) | モード／コンダクトをChart元データへ埋め込まない契約 |
| Combat | [戦闘](/spec/combat/) | モード／コンダクトによる明示的なCombat値・挙動の接続先 |
| Combat | [パレットブレット](/spec/combat/palette-bullet) | 発射時点のモード、AttackEvent単位コンダクト、飛行・Damageへの反映 |
| Draw | [ドローシステム](/spec/draw-system/) | 新仕様との高レベルな接続 |
| Draw | [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation) | Weak AttackEvent作成時のコンダクト付与と`Reserved`境界 |
| Shaondama | [シャオンダマ](/spec/shaondama-music/) | 浮遊個体からPalette Bullet化する既存ライフサイクルとの接続 |
| Shaondama | [MIDI連動のシャオンダマ生成](/spec/shaondama-music/midi-driven-spawning) | MusicChart由来の生成とPlayer設定の分離 |
| Shaondama | [玉のデータ](/spec/shaondama-music/orb-data) | モードをCharge時点の個体dataへ固定しない境界 |
| Shaondama | [浮遊・挙動](/spec/shaondama-music/floating-behavior) | 浮遊変化案と`Reserved`停止規則の整合 |
| Shaondama | [万能シャオンダマ](/spec/shaondama-music/wildcard-orb) | Weak AttackEventとWildcard固有解決の維持 |
| Game | [ゲーム全体](/spec/game/) | Stage、Room、Battle、Result、Retryのライフサイクル接続 |
| Game | [プロトタイプ](/spec/game/prototype) | 現行対象外の拠点を使う構成方法と、初期検証段階・試遊範囲への反映 |
| 共通技術 | [Player Action／State Graph基盤](/spec/common-technology/action-state-manage) | 既存State Graphとの接続、Owner、Event／Commandを実装時に確定 |
| 共通技術 | [Gameplay Runtime Trace](/spec/common-technology/gameplay-runtime-trace) | モード要求・適用・コンダクト付与・発射時参照の追跡範囲 |
| 共通技術 | [プランナー向け調整パラメータ管理](/spec/common-technology/planner-tuning-parameter) | エフェクター段階、上限、モード／コンダクト数値の調整・保存方式 |
| UI | [UI](/spec/ui/) | モード予告、クールタイム、コンダクト選択、入力拒否Feedbackの表示 |
| RadioWhale | [ラジクジラ](/spec/radiowhale/) | Presentation上のセット表現とPlayerから独立した存在である境界 |
| RadioWhale | [キャラクター・世界観](/spec/radiowhale/character-worldbuilding) | モード構成をセットする世界観上の説明 |
| RadioWhale | [追従・浮遊](/spec/radiowhale/follow-and-floating) | モード状態をPlayer追従Stateへ混ぜないこと |
| RadioWhale | [シャオンダマ生成](/spec/radiowhale/shaondama-spawning) | モード構成とShaondama出現責務を混同しないこと |
| RadioWhale | [Gameplayライフサイクル](/spec/radiowhale/gameplay-lifecycle) | 拠点・Stage・RetryとRadioWhaleの未決ライフサイクル |
| RadioWhale | [Animation・VFX・Sound](/spec/radiowhale/animation-effects-sound) | 将来モードで雰囲気・VFX・音を変える場合のPresentation |

### 既存タスクとの境界

| タスク | 今回の仕様との関係 |
| --- | --- |
| [PB-TASK-0019｜プロトタイプ戦闘BGMの要件整理・ラフ制作](/tasks/music-chart-scriptableobject/pb-task-0019) | BGMラフ、MIDI、AttackEvent候補を扱う。Playerのモード／コンダクトをMIDI TrackやMusicChartへ埋め込まない |
| [PB-TASK-0020｜ラジクジラのキャラクターコンセプトデザイン](/tasks/radiowhale/pb-task-0020) | RadioWhaleをPlayer装備やPlayer Stateの一部にしない。RuntimeのモードOwnerや最終VFX／Soundは扱わない |
| [PB-TASK-0021｜コア戦闘オブジェクトの視認性・ビジュアル言語設計](/tasks/effects/pb-task-0021) | PresentationをGameplay状態の正本にしない。モード／コンダクト固有の最終VFXや全AttackEvent演出は別途検討する |

## 関連ページ

- [Player概要](/spec/player/)
- [Player入力と操作](/spec/player/input-and-controls)
- [Playerアクション｜チャージ](/spec/player/player-action-charge)
- [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)
- [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)
- [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)
- [MusicChart仕様](/spec/bgm/bgm-music-chart)
- [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)
- [パレットブレット](/spec/combat/palette-bullet)
- [浮遊・挙動](/spec/shaondama-music/floating-behavior)
- [Player Action／State Graph基盤](/spec/common-technology/action-state-manage)
- [Gameplay Runtime Trace](/spec/common-technology/gameplay-runtime-trace)
- [ラジクジラ](/spec/radiowhale/)

## 関連タスク

<PageRelations />
