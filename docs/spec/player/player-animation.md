---
title: "プレイヤーアニメーション一覧"
pageType: spec
category: "Player"
status: 仮仕様
relatedTasks: []
---

# プレイヤーアニメーション一覧

## 目的

本ページでは、Playerの確定済みState、Action、Gameplay Eventを画面上で伝えるために必要なAnimation表現を整理します。

本ページはAnimation Clipの完成一覧ではありません。既存仕様から確認できる見た目上の要求、開始・継続・終了・中断の接続、複数Stateを同時に表現するための要求、および各担当の責務境界を正本として管理します。

## このページが正本として持つ範囲

- PlayerのどのState、Action、Gameplay Eventを身体動作または視覚Feedbackとして表現する必要があるか
- 既存仕様が明示するAnimation表現の開始、継続、正常終了、再開始、および強制中断
- 移動とAimなど、同時成立する複数Regionを破綻なく見せるための合成要求
- 全身、上半身、加算表現、Loop、Blendなどについて、現時点で確定している範囲と未決の範囲
- Animation制作、Player実装、Gameplay、VFX、Sound、Camera、およびModel／Rigの責務境界
- Animation制作前に決める必要がある事項

本ページでは、表現要件を次の3区分で扱います。

| 区分 | 意味 |
| --- | --- |
| 身体動作要件あり | 既存仕様がPlayerの動作、モーション、向き、またはReactionを明示している。Clip数や制作方式までは意味しない |
| 表現要件あり／方式未決 | 状態や結果を見た目で伝える必要はあるが、Animation、Procedural Animation、IK、VFX、Shader、Cameraなどの担当方式は未決 |
| 身体Animation必須の根拠なし | Gameplay上のState／Eventは存在するが、Playerの身体Animationを追加する根拠は現行仕様にない |

これらはページ内の整理用区分です。Runtime Identifier、Animator State名、Animation Clip名として使用しません。

## このページが持たない範囲

以下はそれぞれの既存仕様、Player State Graph、または将来整備する[Player｜モデルとリグ](/spec/player/player-model-and-rig)を正本とします。

- Player StateやActionの成立条件、遷移、優先順位、入力受付、拒否条件、先行入力
- Charge、Allocation、`Reserved`、AttackEvent、Parry、Damage、Dead、Battle結果のGameplay判定
- AttackEvent occurrenceやPalette Bulletの発火・発射時刻
- Marker objectの生成後の物理挙動、付着、Target提供、および消滅
- Animator StateをPlayer Stateの代替正本として使用する仕組み
- Character modelの形状、Boneの名称・数・階層、Rig、Skin Weight、IK、物理Boneの詳細
- Humanoid／Generic、Root Motion／In-place、およびAnimator Layer構成の最終決定
- VFX、Sound、Camera、およびUIの具体的な演出内容

## Animationの基本原則

### Player StateはState Graphを正本とする

Animationは、Player State GraphがcommitしたActive Configurationと、各Gameplay Ownerが確定したEvent／結果を受けて再生します。Animator State、現在再生中のClip、normalized time、Blend結果などからPlayer Stateを逆算しません。

Animation側は、Action開始条件、Parry成功、Damage種別、Charge結果、Battle結果などを同じ条件で再判定しません。State Graphのcommit前に見た目だけを先行させず、commit後のCommandとしてAnimator parameterやtrigger等を更新します。

### StateとAnimationを1対1にしない

Gameplay中は`MovementState`、`ActionState`、`AimState`、`ReactionState`が並列に成立します。例えば`Grounded + ClickCharging + Aiming`や`Airborne + DragCharging`が成立するため、1つのPlayer Stateを1つのAnimator Stateまたは1つのClipへ固定する前提にはしません。

停止・歩行は独立したPlayer Stateではありません。Action内部のStartup、判定前、判定後、RecoveryなどのPhaseも、個別仕様で明示されない限りPlayer Stateではありません。Phase数をそのままClip数へ置き換えません。

### AnimationはGameplay結果を駆動しない

Animation Eventや再生完了callbackから、State、Damage、Charge成功、Parry成功、Battle結果などを直接変更しません。Animationから通知が必要な場合は、State GraphのEvent ingressへ型付きEventとして戻し、現在の`battleId`や`actionRunId`等との対応を確認した後に、State Graphまたは正本Ownerがcommitします。中断済みのActionから遅れて届いた通知は現在のActionへ適用しません。

既存仕様でモーション終了との同期が明示されているものは、MarkerFiring、ClickCharging、Parrying、SmallHit、BigHit、およびGame Over時の死亡モーションです。この同期は「AnimatorがStateを直接変更する」という意味ではありません。正本Ownerが有効な完了Eventを受理してState遷移または後続処理を確定します。

MarkerFiringの発射タイミングについてのみ、既存仕様がAnimation Eventなどで調整可能と明示しています。これはMarker生成・発射要求の通知時点を同期する手段であり、Animation側が発射可否、狙点、物理挙動、またはState遷移を判定するものではありません。

### 見た目と移動を分離する

通常移動、空中制御、Dash移動、BigHitの地上ノックバック、およびDead中の重力・落下はGameplay／Movement側が決定します。Animationの見た目から速度、接地、無敵、ノックバック、Target、発射位置などを算出しません。

Root Motion／In-placeの採用は未決です。どちらを採用する場合も、既存のGameplay上の移動結果と競合させません。

## Player State／Action／Eventとの対応一覧

| 表現対象 | 起点となるState／Event | 現在確定している見た目上の要件 | 区分 | 開始・継続・終了／中断 | 主な未決事項 | 正本仕様 |
| --- | --- | --- | --- | --- | --- | --- |
| 基本移動 | `Grounded`／`Airborne`と実際の移動結果 | 接地中の停止・移動、空中制御・落下に対応できる移動表現。移動方向へ向き直る | 身体動作要件あり | Movementと並行するAction／Aim／Reactionの結果へ追従する | Clip分割、速度Blend、加減速、旋回表現 | [Player基本移動](/spec/player/basic-movement) |
| Jump | Jump処理、`Grounded → Airborne` | 上方向速度の付与と空中移行に対応する動作表現 | 身体動作要件あり | Charge中はCharge表現を継続。Dashing中はDashを終了して空中表現へ接続 | Jump／上昇／落下／着地のClip分割 | [Player移動｜ジャンプ](/spec/player/player-movement-jump) |
| Dash | `ActionState = Dashing` | 初動高速移動PhaseとDash継続Phaseを含む高速移動の表現 | 身体動作要件あり | State commit後に開始。Jump、接地喪失、Reaction、RootState変更、Battle結果確定等で終了 | PhaseごとのClip分割、Loop、Blend、向き変更表現 | [Playerアクション｜ダッシュ](/spec/player/player-action-dash) |
| Aim | `AimState = Aiming` | Player全身をCameraの水平方向へ向け、全身を上下には傾けない。移動や対応Actionと同時に表現する | 表現要件あり／方式未決 | Aiming中は継続。Dash、Parry、Reaction、Airborne移行、RootState変更等で解除 | 上半身／加算／IK／Aim補正の方式 | [Playerアクション｜照準](/spec/player/player-action-aim) |
| Marker | `ActionState = MarkerFiring` | 発射前後を含むMarker発射モーション | 身体動作要件あり | 指定時点で生成・発射要求を1回通知。発射後もモーションを継続し、正常時はモーション終了で完了。中断時は発射済みかで結果を分ける | Clip構成、発射時点、全身／上半身、空中時の合成 | [Playerアクション｜マーカー](/spec/player/player-action-marker) |
| Click Charge | `ActionState = ClickCharging` | Charge判定Eventの前後を含む短時間のChargeモーション | 身体動作要件あり | 判定後もモーションを継続し、正常時はモーション終了で完了。Jumpしても継続。中断時は判定済みかで結果を分ける | Clip構成、判定時点、全身／上半身 | [Playerアクション｜チャージ](/spec/player/player-action-charge) |
| Drag Charge | `ActionState = DragCharging` | Hold中の連続選択状態をPlayerへ伝える表現 | 表現要件あり／方式未決 | Releaseまたは中断まで継続。Jump、Airborne、着地でもActionは継続できる | 身体動作の有無、Loop、選択Feedbackとの分担 | [Playerアクション｜チャージ](/spec/player/player-action-charge) |
| AttackEvent発火・Palette Bullet発射 | AttackEvent occurrenceのFire／各Arpeggio timing | Palette Bullet化・発射・発音は必要。ただしPlayerの身体発射モーションは現行仕様で必須化されていない | 身体Animation必須の根拠なし | 音楽時刻どおりに自動発火し、Parry Slow中も遅延しない。Charge動作の終了とは同期しない | Player側の発射Feedbackを追加するか | [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)、[パレットブレット](/spec/combat/palette-bullet) |
| Parry | `ActionState = Parrying` | Startup、Parry Window、Recoveryへ対応するParryモーション。1回のParrying中は開始時の向きを維持する | 身体動作要件あり | 成功しても現在のモーションを終了・再開始しない。受理された再入力は現在のモーションを上書きして先頭から再開始。通常はモーション終了で完了 | 各Phase時間、Normal／Justの身体差分 | [Playerアクション｜パリィ](/spec/player/player-action-parry) |
| SmallHit | `ReactionState = SmallHit` | 小さい被弾Reactionの表現 | 身体動作要件あり | 同一Reaction中のSmallHitで先頭から再開始。BigHitまたはDead等で上書き・中断。通常はReaction終了で完了 | Motion、時間、地上／空中差分、Blend | [Playerリアクション｜被弾](/spec/player/player-reaction-damaged) |
| BigHit | `ReactionState = BigHit` | 大きい被弾Reactionの表現。地上ではGameplay側のノックバックと同時に見せる | 身体動作要件あり | BigHit中の追加被弾では再開始せず残り時間を維持。Dead等で中断。通常はReaction終了で完了 | Motion、時間、地上／空中差分、ノックバックとの同期 | [Playerリアクション｜被弾](/spec/player/player-reaction-damaged) |
| Dead／死亡モーション | `RootState = Dead`と最終Battle結果 | Game Over確定時だけ死亡モーションを開始する。空中ではGameplay側の重力による落下が継続する | 身体動作要件あり | Dead成立だけでは開始しない。Game Overではモーション終了後にResultへ接続。ClearとDeadが同時成立した場合は開始しない | Motion、時間、落下・着地との合成、Game Over演出 | [Player死亡](/spec/player/player-death) |
| Conversation | `RootState = Conversation` | Gameplay用の移動・Action・Aim表現を終了する。会話専用の身体Animationは現行仕様で未定 | 身体Animation必須の根拠なし | Conversation開始・終了は会話Ownerの結果へ追従する | 共通／NPC固有会話Motion、表情、視線 | [Playerインタラクション｜Conversation](/spec/player/player-interaction-conversation) |
| Interacting | `RootState = Interacting` | Gameplay用の移動・Action・Aim表現を終了する。共通のInteraction身体Animationは現行仕様で未定 | 身体Animation必須の根拠なし | 対象固有の完了または被弾等の中断結果へ追従する | 対象別Motion、対象との位置合わせ、IK、完了同期 | [Playerインタラクション｜Interacting](/spec/player/player-interaction-interacting) |
| Mode／Conduct | 適用済みMode、Player側のConduct選択、occurrenceへのConduct付与 | 見た目・挙動や音のFeedbackは必要だが、Playerの身体Animationは規定されていない | 表現要件あり／方式未決 | Movement、Charge、Parryを中断しない。AttackEvent occurrenceの結果へ身体Animationを同期する規則はない | 身体動作の有無、UI／VFX／Soundとの分担 | [Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct) |
| Battle結果確定 | `BattleResultFinalized` | Gameplay用Action、Aim、Reactionの表現を停止し、確定結果に応じた表示へ接続する | 表現要件あり／方式未決 | 新しいGameplay表現を開始しない。任意の表示専用演出の終了をGameplay cleanupやResult操作解禁の条件にしない | Clear時のPlayer表示、残留Animationの終了方法 | [ゲーム全体](/spec/game/)、[Player状態](/spec/player/states) |

## 現在確定しているAnimation表現要件

### 基本移動

- `Grounded`と`Airborne`の移動結果に対応できるPlayerの移動表現を用意します。
- `Grounded`でMove入力がない場合は通常移動を行わず、停止と歩行を別のPlayer Stateにはしません。停止、歩行、走行を何Clipに分けるかは未決です。
- 通常時はCamera操作だけでPlayerの向きを変えません。Move入力がある場合は、Camera基準で決定した実際の移動方向へ向き直る見た目にします。向き直りは補間されますが、補間値とAnimation方式は未決です。
- `Airborne`では空中制御と重力・落下が継続します。上昇、落下、着地をそれぞれ専用Clipにすることは現行仕様から確定しません。
- Aiming、MarkerFiring、DragChargingでは移動速度が低下し、ClickChargingではAction固有の低速補正を行いません。AnimationはPlayer実装が決定した実速度へ追従し、速度倍率を再判定しません。
- Parrying、SmallHit、BigHit、Conversation、Interacting、Deadでは通常移動表現を継続しません。ただしBigHitのノックバックとDead中の落下はGameplay側の移動結果として反映します。

### Jump

- Jumpは独立したPlayer Stateではなく、上方向速度を付与して`Grounded → Airborne`へ移行する単発処理です。Animationはこのcommit済みの変化を表現します。
- `ClickCharging`または`DragCharging`中にJumpした場合は、Charge Actionとその表現を中断せず、Movement側だけを空中表現へ切り替えます。
- Dash継続PhaseからJumpした場合は、Dashingの終了とAirborneへの移行へ接続します。Dash中の水平速度引き継ぎはGameplay側の結果を使用します。
- Jump開始、上昇、落下、着地を個別Clipにするか、着地専用Animationを用意するかは未決です。

### Dash

- `ActionState = Dashing`のcommit後に、通常移動と区別できる高速移動の身体表現へ接続します。
- Gameplay上は初動高速移動PhaseとDash継続Phaseがありますが、これを開始／Loop／終了の3Clipへ分割する仕様ではありません。
- 初動高速移動Phaseの方向は開始時に確定され、Phase中は固定されます。Dash継続PhaseではMove入力に応じて方向を変更できます。Animationは確定済みの移動方向へ追従し、方向を決定しません。
- Dash Hold中はMove入力がなくてもDashingを維持しますが、Dash移動は発生しません。この場合の姿勢やLoopの見た目は未決です。
- Jump、接地喪失、SmallHit、BigHit、RootState変更、Battle結果確定ではDashing表現を終了します。通常終了や次Actionへの接続に専用終了Clipを要求しません。
- Dash中のFOV表現はCamera側の責務です。PlayerのDash AnimationからCamera FOVを再判定しません。

### Aim

- Aiming中はPlayerの正面をCameraの水平方向へ追従させます。Cameraの上下角度へ合わせてPlayer全身を上下に傾けません。
- 上下方向の狙いはCameraまたは武器／Aim表現側で扱います。上半身Animation、加算姿勢、IK、Aim Offset等のどれを使用するかは未決です。
- Aimingは通常移動、MarkerFiring、ClickCharging、DragChargingと同時成立できます。Aim表現は、これらと組み合わせてもMovementやActionの成立状態を隠さない必要があります。
- MarkerFiring開始後にAimが解除されても、MarkerFiringは継続できます。Marker発射動作をAimingの継続へ依存させません。
- Aimingの開始・解除を受けたCamera補間はCamera側が所有します。Player AnimationはCamera位置、FOV、感度、狙点を決めません。

### Marker

- MarkerFiringでは、発射前の区間、指定された発射時点、および発射後の区間を含むMarker発射モーションが必要です。これらを別Clipへ分割する必要はありません。
- 発射時点ではMarker生成・発射要求を1回だけ通知します。Animation Eventなどを使用する場合も、現在のMarkerFiringに対応する有効なEventとしてPlayer実装へ返します。
- 発射前にMarkerFiringが中断された場合は発射要求を通知しません。発射後に中断された場合は、すでに生成されたMarkerの飛行をAnimation側から停止しません。
- 発射後はDashキャンセル可能区間へ入り、モーション自体は正常終了まで継続できます。正常終了時は有効な完了Eventを経て`ActionState = None`へ戻します。
- MarkerFiring中も低速移動でき、開始後の接地喪失ではAirborneへ移行してもMarkerFiringを継続できます。Aimが解除された後も発射動作を継続できる合成が必要です。
- Markerの生成位置、発射方向、初期速度、物理挙動はAnimation側で決定しません。

### Click Charge

- ClickChargingでは、Charge判定Eventより前の区間、判定時点、および判定後の区間を含む短時間のChargeモーションが必要です。区間を個別Clipに分ける必要はありません。
- Charge判定EventはGameplay側がsuccess／miss、Allocation、および`Reserved`を決定する同期点です。Animationは判定を行わず、Animation EventでCharge成功を直接成立させません。
- 判定後もClickChargingのモーションを継続し、正常時はモーション終了までActionを維持します。判定後のDashキャンセルでは確定済みCharge結果を変更しません。
- 判定前に中断された場合はCharge結果を成立させず、判定後に中断された場合は確定済み結果を保持します。Animation側は中断時点から結果を推測しません。
- Jump、Airborne、着地を通してClickChargingとモーションは継続できます。Movement表現との合成方式は未決です。

### Drag Charge

- DragChargingは、複数Shaondamaを選択している継続Actionです。選択中であることと選択対象はPlayerへ判別可能にする必要があります。
- 現行仕様はPlayerの身体モーション、Loop、手足の動作、接続点を定義していません。Animationで表現するか、対象側表示、軌跡、UI、VFX等で表現するかは未決です。
- Release時にGameplay側がbatchをatomicに判定・commitし、その結果後にDragChargingを終了します。Animationは選択数、過不足、Current AttackEvent、success／missを再判定しません。
- DragChargingはJump、Airborne、着地を通して継続でき、Aimingとも同時成立できます。身体Animationを採用する場合は、これらとの合成に対応する必要があります。

### AttackEvent発火時の発射

- Charge successの到達点はAllocation commitとShaondamaの`Reserved`化です。Chargeモーションの成功表現からPalette Bullet化・発射を開始しません。
- Palette Bullet化・発射は、AttackEvent occurrenceのFireまたは各Arpeggio Entry timingで自動的に行われます。発射時にPlayerの操作はなく、PlayerをCamera正面へ向き直らせません。
- Palette Bulletは各Reserved Shaondamaの弾丸化時点の現在World座標から発射されます。Player共通の発射TransformやPlayer身体位置へ移してから発射しません。
- Chord、Arpeggio、Weakごとの発射順・時刻をPlayer Animationから変更しません。Parry Slow中に到達した発射も音楽時刻どおりに処理します。
- Palette Bulletの弾丸化前後で見た目を変更する必要はありません。弾の飛翔、VFX、発射音、音程音は各所有ページへ委譲します。
- Player側に発射反応を追加するか、その場合に身体Animation、加算表現、VFX等のどれを使うかは未決です。追加する場合もAttackEvent時刻を待たせたり、身体動作完了を発射条件にしたりしません。Chord専用またはArpeggio専用のPlayer発射Animationは、現時点では必須化しません。

### Parry

- Parryingでは、Startup、Parry Window、Recoveryの進行へ対応する1回のParryモーションが必要です。各PhaseはGameplayの内部Phaseであり、別Player Stateや別Clipである必要はありません。
- Parrying開始時にPlayerの向きを確定し、そのParryingの終了まで維持します。新しいParryingが正式に開始された場合だけ、向きを再取得します。
- Parry成功時は現在のParryモーションを継続し、先頭から再生し直しません。Normal／Justの違いをPlayer身体Animationで分ける要件はなく、既存仕様ではVFX、SE、画面効果が識別Feedbackです。
- 成功後の早期再入力、Recovery後半の空振り時再入力から新しいParryingがcommitされた場合は、現在のモーションを上書きし、Startupから再開始します。
- Parry失敗は通常の被弾としてSmallHit／BigHitへ接続します。Parry失敗専用Animationや空振り専用Animationは要求しません。空振りで再入力がなければRecoveryを経てモーション終了まで継続します。
- SmallHit、BigHit、接地喪失、RootState変更、Battle結果確定ではParryingを強制終了します。中断済みモーションの完了EventからActionを再開しません。
- Parry Slowは任意のPlayer局所減速です。Animator再生とAction内Phase・受付窓・完了タイマーは同じ局所経過時間を使います。Normal／Just共通の減速倍率・時間とし、倍率1で無効化できます。BGM Audio、3時計、AttackEvent、Palette Bullet発射は通常進行します。詳細は[Parryの減速規則](/spec/player/player-action-parry#parry-slow)を正本とします。

### SmallHit

- SmallHitでは小さい被弾Reactionを表現します。Reactionの種類はDamage判定結果を受け取り、Animation側で再判定しません。
- SmallHit開始時に現在のActionを終了し、Aimを解除します。通常移動は停止し、SmallHit固有の強制移動やノックバックは発生させません。
- SmallHit中に新しいSmallHitが成立した場合は、SmallHit Reactionを先頭から再開始します。前の残り時間を引き継ぎません。
- SmallHit中にBigHitが成立した場合はSmallHitを終了し、BigHitを先頭から開始します。致死DamageではSmallHitを経由せずDeadへ接続します。
- 正常時は有効なReaction完了Eventを経て`ReactionState = None`へ戻します。

### BigHit

- BigHitでは大きい被弾Reactionを表現します。Grounded時はGameplay側が決定した地上ノックバックと同時に見せます。
- BigHitはPlayerを直接Airborneへ打ち上げません。ノックバックの結果として崖等から接地を失った場合のみ、通常の接地判定でAirborneへ移行します。
- Airborne中のBigHitに新しい空中ノックバック、吹き飛ばし、打ち上げを追加しません。地上／空中でReaction Clipを分けるかは未決です。
- BigHit中の追加被弾は、BigHit Reactionを再開始せず、残り時間も変更しません。致死DamageではBigHitを経由せずDeadへ接続します。
- 正常時は有効なReaction完了Eventを経て`ReactionState = None`へ戻します。

### Dead

- `RootState = Dead`はHP 0とPlayer操作停止を表す内部状態であり、Deadへ入っただけでは死亡モーションを開始しません。
- Gameから最終Battle結果としてGame Overが通知された場合だけ、死亡モーションを開始します。死亡モーション終了後に共通ResultのGame Over経路へ接続します。
- 同一frameでClearとDeadが成立し、最終結果がClearとなった場合は、DeadとHP 0を維持したまま死亡モーションを開始しません。Clear専用ポーズも現行仕様では要求されていません。
- 空中でDeadへ入った場合も、Gameplay側の重力による落下を継続します。死亡モーション固有の移動、着地表現、Root Motionの有無は未決です。
- 致死DamageではSmallHit／BigHit Reactionを再生してから死亡する経路にせず、Deadへ直接接続します。

### Conversation／Interacting

- ConversationまたはInteractingへ遷移した時点で、Gameplay用の通常移動、Action、Aim、およびReaction表現を終了します。以前のAction Animationを復帰時に再開しません。
- Conversation専用の共通身体Animation、表情、視線、およびNPC固有Motionは未決です。
- Interactingの対象は宝箱、アイテム、ギミック、ステージ選択・準備などで異なります。共通のInteraction Animation、対象別Motion、位置合わせ、IK、および完了同期は未決です。
- Interaction完了や会話完了をAnimation側が判定しません。Interactingが被弾で中断された場合は、Gameplayへ戻った後に確定済みのSmallHit／BigHitへ接続します。

### Mode／Conduct

- Mode変更要求とConduct選択はPlayer StateまたはActionStateではありません。身体Animationを開始するためのStateとして追加しません。
- Mode入力はMovement、Charge、Parryを中断しません。Conduct選択だけを理由に進行中Chargeや、そのChargeが保持するsnapshotを変更しません。
- Mode／Conductによる見た目・挙動および音のFeedbackは必要ですが、Player身体Animationを使用する根拠、動作内容、再生時点は現行仕様にありません。
- Mode／Conductの身体表現を将来追加する場合は、UI、VFX、Sound、Palette Bullet側の表現と役割を分け、AttackEvent occurrenceのGameplay結果をAnimationから変更しません。

## 複数Stateの合成、Blend、中断に関する確定事項

### 同時成立へ対応する

少なくとも次の組み合わせを破綻なく表示できる必要があります。

- `Grounded + Aiming`と通常移動
- `Grounded + MarkerFiring + Aiming`と低速移動
- `Grounded + ClickCharging + Aiming`と移動
- `Grounded + DragCharging + Aiming`と低速移動
- `Airborne + MarkerFiring`。開始済みActionを継続し、Aimは解除される
- `Airborne + ClickCharging`
- `Airborne + DragCharging`
- `BigHit`とGameplay側の地上ノックバック
- `Dead`とGameplay側の重力・落下

これらの要件は、上半身Layer、Avatar Mask、Additive Clip、Blend Tree、IK、Procedural Animationの採用を直接指定するものではありません。全身／上半身／加算の最終区分と具体的なLayer数は未決です。

### 中断結果へ追従する

- Reaction、Dead、RootState変更、Battle結果確定などの強制結果は、通常のAction Animation完了より優先します。
- Actionを中断した場合、元のモーションの残りを再生し終えてからStateを変えません。
- 中断済みActionから遅れて届いた発射、判定、完了等のEventを現在のActionへ適用しません。
- `ActionState = Parrying`のまま新しいParryingへ再開始するような同一State名の更新でも、`actionRunId`等で前後の実行を区別し、新しいモーションを先頭から開始します。
- Blend中の見た目をGameplay上の「両Stateが同時に成立している時間」として扱いません。GameplayのActive ConfigurationはState Graphのcommit結果だけで決まります。

### Loopと再生完了

- DragChargingやDash継続Phaseなど、長さが入力やGameplay条件で変わる表現にはLoopが必要になる可能性がありますが、Loop Clipの採用自体は未決です。
- MarkerFiring、ClickCharging、Parrying、SmallHit、BigHit、死亡モーションには、既存仕様上の完了同期があります。Clipの末尾、timer、phase dataなど、何を完了Eventの技術的な起点にするかは実装設計で決めます。
- Animationの再生完了を、すべてのGameplay進行に共通する正本にはしません。特にCharge成功、Palette Bullet発射、Parry成功、Damage、Battle結果は別Ownerが確定します。

## VFX／Sound／Camera／Gameplayとの接続境界

| 担当 | 本ページから要求する責務 | 担当しないこと |
| --- | --- | --- |
| Animation制作 | 本ページの身体動作要件を満たす素材を制作し、同時成立・再開始・中断へ接続可能な動作を用意する。調整用の同期点が必要な場合は実装担当と共有する | State成立条件、Gameplay判定、正式なRuntime名・Event契約を単独で決定すること |
| Player実装／State Graph | commit済みActive ConfigurationとGameplay結果からAnimation Commandを発行し、現在のActionに対応するEventだけを受理する。中断・再開始・Blendを制御する | AnimatorからPlayer Stateを逆算すること、Animation callbackからStateを直接変更すること |
| Action／Gameplay Owner | Action Phase、発射可否、Charge判定、Parry、Damage、Dead、Battle結果、完了Eventの有効性を確定する | 見た目の再生状態をGameplay成立条件の代わりにすること |
| VFX／Sound | 確定済みのCharge、Parry、Damage、Mode／Conduct、Marker、Palette Bullet等の結果を視覚・聴覚Feedbackとして表現する | VFX／Soundの見た目や出力結果からGameplay結果を決めること |
| Camera | Aim時の肩越しZoom、狙点、Dash時FOV、障害物処理、各状態間のCamera補間を所有する | Camera状態からPlayer Stateを決めること、AttackEvent発射時にPlayerを向き直らせること |
| Model／Rig | Animation合成や接続点を実現できるCharacter構造を検討し、最終的なAvatar、Bone、IK、Socket等を定義する | 本ページのState／Action／Gameplay判定を再定義すること |

Normal／Just Parryの違いは、既存仕様上、スタミナ精算、VFX、SE、画面効果で表現します。別の身体Animationは必須ではありません。SmallHit／BigHitの種別、Charge success／miss、AttackEvent結果もGameplay側から確定結果を受け取ります。

Battle結果確定後にAnimation、VFX、SE、表示専用objectを残すことはできますが、そこから新しいDamage、Hit、Parry、Target、Charge、State変更を発生させません。また、任意の表示専用Animationの終了を必須Gameplay cleanupまたはResult操作解禁の条件へ追加しません。Game Over時の死亡モーション終了からResultへ接続する既存の同期要件は、この一般則とは別に維持します。

## Model／Rig側へ引き継ぐ要求

本節はModel／Rigの完成仕様ではなく、Animation要件から判明した機能上の引き継ぎです。具体的な設計は[Player｜モデルとリグ](/spec/player/player-model-and-rig)で今後確定します。

- 通常移動とAiming、およびAimingとMarkerFiring／ClickCharging／DragChargingを同時に表現できる構造を検討する必要がある
- Aimingでは全身の水平方向の向きと、上下方向の狙い表現を分離できる必要がある。上半身分離、Aim補正、IK等の採用は未決
- Marker仕様が要求する生成位置のWorld poseを安定して提供できる接続点が必要である。Bone、Socket、Transformの正式名、階層、具体的な身体部位は本ページで決めない
- MarkerFiringやChargeを空中移動表現と組み合わせられる必要がある
- BigHitの地上ノックバック、Dead中の落下など、Gameplay側が移動させるPlayerへAnimationを追従させる必要がある
- Model形状の確定後、Cameraの注視点やAim時の画面内表示を再調整する必要がある

本ページではBone数、Bone名、Bone階層、Finger／Face／Hair／Cloth Bone、Humanoid／Generic、Skin Weight、IK構成、物理Bone、FBX Import設定、および正式なSocket／Transform名を確定しません。

## 未決事項・制作前に決めること

### Animation構成

- 必要Clipの正式な一覧、本数、名称、命名規約
- 全身、上半身、Additive、Loopの区分と、Animator Layer／Avatar Mask／Blend Treeの具体構成
- 各遷移のBlend時間、cross-fade、再生速度、Interrupt時の接続方法
- Root Motion／In-place
- Humanoid／Genericと、Animation素材のretarget方針
- Animation Event、timer、phase data等のうち、Marker発射、Action完了、Reaction完了に使用する技術的な通知方式
- Pause中にPlayer Animationを停止する範囲と時間軸

### 表現別の未決事項

- 停止／移動の速度Blend、向き直り、加減速、およびAirborneの上昇／落下／着地をどう分けるか
- Dashの初動高速移動Phaseと継続Phaseを同一Motion、別Motion、Loop、Blendのどれで表現するか
- Aimingを上半身Animation、加算姿勢、IK、Procedural補正等のどれで実現するか
- MarkerFiringとClickChargingの具体的なMotion、時間、発射／判定時点、および全身／上半身区分
- DragChargingにPlayer身体Animationを使用するか。使用する場合のLoopと空中・Aim合成
- AttackEvent発火時にPlayer側の身体反応を追加するか。Chord／Arpeggio／Weakで差を設けるか
- Normal／Just Parryの身体Animation差分を追加するか、および各PhaseとParry Slowの具体時間
- SmallHit／BigHitのMotion、時間、地上／空中差分、およびBigHitノックバックとの同期
- 死亡Motion、時間、空中落下・着地との合成、およびGame Over演出との接続
- Conversation、Interacting、Mode、Conductに身体Animationを追加するか
- Battle結果がClearの場合のPlayer表示。Clear専用ポーズは現時点で未採用

### 現時点で必須化しない追加候補

以下は一般的には検討可能ですが、現行仕様に必須とする根拠がありません。採用する場合は別途要件を確定します。

- 急停止専用Animation、方向転換専用Animation
- Dash開始／Loop／終了を必ず3Clipへ分割する構成
- Parry失敗専用Animation、空振り専用Animation
- Clear専用ポーズ
- Chord専用、Arpeggio専用、Weak専用のPlayer発射Animation
- 表情、瞬き、指Animation
- 足音用Animation Event
- Hair／Cloth等の物理Bone

## 仕様整合性

Player Animation要件へ影響する、権威のある仕様同士の実質的な矛盾は確認されていません。

Actionページにある「モーション終了でAction／Reactionを終了する」という記述と、State Graph仕様にある「AnimatorはStateの正本ではない」という記述は両立します。AnimationまたはAction timingから完了Eventを通知し、State Graphが現在の実行との対応を確認して遷移をcommitする構造とします。Animator StateやClip完了callbackが直接Stateを変更する解釈にはしません。

## 関連仕様

### Player

- [Player概要](/spec/player/)
- [Player状態](/spec/player/states)
- [Player入力と操作](/spec/player/input-and-controls)
- [Player基本移動](/spec/player/basic-movement)
- [Player移動｜ジャンプ](/spec/player/player-movement-jump)
- [Playerアクション遷移](/spec/player/player-action-transitions)
- [Playerアクション｜ダッシュ](/spec/player/player-action-dash)
- [Playerアクション｜照準](/spec/player/player-action-aim)
- [Playerアクション｜マーカー](/spec/player/player-action-marker)
- [Playerアクション｜チャージ](/spec/player/player-action-charge)
- [Playerアクション｜パリィ](/spec/player/player-action-parry)
- [Playerアクション｜モードチェンジとコンダクト](/spec/player/player-action-mode-change-and-conduct)
- [モード構成とエフェクター](/spec/player/mode-configuration-and-effectors)
- [Playerリアクション｜被弾](/spec/player/player-reaction-damaged)
- [Player死亡](/spec/player/player-death)
- [Playerインタラクション｜Conversation](/spec/player/player-interaction-conversation)
- [Playerインタラクション｜Interacting](/spec/player/player-interaction-interacting)
- [Playerステータス](/spec/player/player-status)
- [Player｜モデルとリグ](/spec/player/player-model-and-rig)

### 関連システム

- [Action／State管理](/spec/common-technology/action-state-manage)
- [ゲーム全体](/spec/game/)
- [戦闘](/spec/combat/)
- [マーカー](/spec/combat/marker)
- [パレットブレット](/spec/combat/palette-bullet)
- [チャージ先・スロット割り当て仕様](/spec/draw-system/charge-allocation)
- [BGM 攻撃イベント仕様](/spec/bgm/bgm-attack-event)
- [AttackEvent成立判定](/spec/bgm/bgm-attack-judgement)
- [BGMとGameplayの接続](/spec/bgm/bgm-gameplay-connection)
- [カメラの通常動作](/spec/camera/CameraFreeRot)
- [エイム時のカメラ](/spec/camera/aim)
- [カメラの基準配置（ダッシュ時）](/spec/camera/CameraBasicPosition-dash)
- [演出](/spec/effects/)
