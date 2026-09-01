---
title: コア戦闘オブジェクトの視認性・ビジュアル言語設計
description: 通常シャオンダマ、万能シャオンダマ、邪音玉、Enemy浄化を瞬時に区別できるプロトタイプ用の見た目と状態表現を定義する
pageType: task
taskId: PB-TASK-0021
category: 演出
order: 10
team: デザイン
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/shaondama-music/orb-data
  - /spec/shaondama-music/wildcard-orb
  - /spec/shaondama-music/floating-behavior
  - /spec/enemy/jaon-bullet
  - /spec/enemy/damage-and-purify
  - /spec/enemy/basic-behavior
  - /spec/effects/
---

# PB-TASK-0021｜コア戦闘オブジェクトの視認性・ビジュアル言語設計

## タスクの目的

プロトタイプの戦闘中に、Playerが通常シャオンダマ、万能シャオンダマ、敵弾である邪音玉、Enemyの浄化進行を短時間で区別できるよう、共通するビジュアル言語と状態別Style Frameを作成します。

本タスクは最終VFX制作ではありません。仮Modelや簡易Materialへ置き換えられる、色・形・発光・動きの役割分担を決めるタスクです。

## 完成時にできるようになること

- 味方側の選択対象と敵弾を見間違えにくくなる
- 通常シャオンダマと万能シャオンダマを色だけに頼らず区別できる
- Enemyの未浄化から浄化完了までの見た目を段階別に確認できる
- Model、Material、VFX担当が同じ基準で仮素材を作れる
- Gameplay判定とPresentationの境界を維持できる

## 関連する仕様

<PageRelations />

## 実施内容

### 1. 情報の優先順位を整理する

戦闘中にPlayerが判別すべき情報を、少なくとも次の順で整理します。

1. 選択可能なShaondamaか、危険なJaon Bulletか
2. NormalかWildcardか
3. Shaondamaの色・音程情報
4. 選択可能、Reserved、終了中などの状態
5. Enemyの浄化進行と浄化完了

### 2. 比較Style Frameを作成する

同じ背景・同じ画面Scaleで、次を並べた比較画像を作成します。

- Normal Shaondamaの代表色
- 虹色表示のWildcard Shaondama
- Jaon Bullet
- Enemyの未浄化、中間、浄化完了

色だけでなく、輪郭、内部模様、発光、軌跡、点滅、動きの性質を組み合わせます。

### 3. 状態表現表を作成する

各対象について、状態とPresentationを対応付けます。少なくともShaondamaの選択可能／Reserved／終了中、Jaon Bulletの飛行／Parry可能／無効化後、Enemyの浄化進行を扱います。

### 4. プロトタイプ向け簡易表現を指定する

最終ShaderやVFXがなくても実装できるよう、Primitive、単色Material、Emission、Particle等による最低限の代替表現を併記します。

## 対象範囲

- コア戦闘オブジェクトの情報優先順位
- 同一条件での比較Style Frame
- 色・形・発光・軌跡・動きのルール
- 状態別Presentation表
- プロトタイプ用簡易表現
- 制作データとレビュー記録

## 対象外

- 最終Shader／VFXのRuntime実装
- Gameplay上の色、Damage、Parry、選択判定
- 全AttackEventの演出
- 最終アクセシビリティ対応
- Player、RadioWhale、Enemy本体の最終キャラクターデザイン
- 最終SE制作

## 完了条件

- [ ] Normal、Wildcard、Jaon Bulletを同一画面で比較できる
- [ ] 味方側の選択対象と敵弾が色以外の要素でも区別されている
- [ ] Wildcardが虹色表示であり、Normalと識別できる
- [ ] Enemyの未浄化、中間、浄化完了を比較できる
- [ ] Shaondamaの選択可能／Reserved／終了中の表現案がある
- [ ] Battle終了後の表示専用状態をGameplay有効状態と誤認しない表現になっている
- [ ] プロトタイプで使用できる簡易表現が指定されている
- [ ] Gameplay判定をMaterial色やVFX状態から逆算しない方針が明記されている
- [ ] デザイン、企画、実装担当のレビュー結果が記録されている

## 確認手順

1. 比較画像を1920×1080の想定Battle画面へ配置します。
2. 通常表示、縮小表示、グレースケール表示で対象を比較します。
3. 静止画だけで判別しづらい要素は、短いMotion Testまたは連番で軌跡・点滅・動きを確認します。
4. 実装担当が簡易Material／Particleで再現可能か確認します。
5. 仕様と矛盾する表現がないか企画担当が確認します。

## 前提・依存タスク

なし。Player実装、Enemy Runtime、VFX Runtimeの完成を待たずに開始できます。

## 実装時の注意点

- PresentationをGameplay状態の正本にしないでください。
- Wildcardの虹色を複数色Damageそのものとして表現しないでください。
- Jaon Bulletの色をDamage種別の判定根拠にしないでください。
- 最終品質ではなく、役割の区別と仮実装への転用可能性を優先してください。
- 既存Player画像の透明感・音楽・色の方向性は参考にできますが、未承認の要素を作品全体の正式Art Directionとして固定しないでください。

## 提出・報告方法

1. 元データ、比較画像、状態表を共有ストレージへ配置します。
2. Notionタスクへ共有リンクとレビュー結果を記載します。
3. 決定したPresentation規則を各仕様へ反映するための原稿を添付します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- デザイン資料：未登録
