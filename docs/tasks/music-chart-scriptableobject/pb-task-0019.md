---
title: プロトタイプ戦闘BGMの要件整理・ラフ制作
description: Palette Bullet固有の音楽Gameplayを検証できる戦闘BGMについて、制作要件を整理し、比較可能なラフとMIDIデータを作成する
pageType: task
taskId: PB-TASK-0019
category: BGM
order: 20
team: サウンド
priority: A
milestone: プロトタイプ
relatedSpecs:
  - /spec/game/prototype
  - /spec/bgm/
  - /spec/bgm/sound-production-workflow
  - /spec/bgm/bgm-midi-settings
  - /spec/bgm/bgm-attack-event
  - /spec/bgm/bgm-music-chart
---

# PB-TASK-0019｜プロトタイプ戦闘BGMの要件整理・ラフ制作

## タスクの目的

プロトタイプで使用する戦闘BGMについて、完成曲をいきなり制作するのではなく、ゲームのコア体験を検証できる音楽構造を整理し、比較・選定できるラフを作成します。

本タスクはPlayerやMusicChart Runtimeの完成を待たずに開始できます。成果物は完成BGMではなく、採用方針を決めて本制作へ進める状態の制作要件、ラフ音源、対応MIDI、AttackEvent候補です。

## 完成時にできるようになること

- プロトタイプ戦闘BGMの狙い、テンポ、拍子、Loop方針をチームで確認できる
- Palette BulletのChargeとAttackEventを置ける音楽構造を比較できる
- ラフ音源とMIDIの時間軸が対応しているか確認できる
- Gameplay利用候補TrackとAttackEvent候補をプランナーへ渡せる
- 採用案を決め、完成BGM制作タスクを起票できる

## 関連する仕様

<PageRelations />

## 実施内容

### 1. 制作要件を整理する

着手時に担当者がプランナーへ確認し、少なくとも次を1枚の制作Briefへまとめます。

- Battle中に与えたい感情とテンション
- 想定するテンポ、拍子、Loop構造
- AttackEventを体感しやすい音楽上の区切り
- Charge受付と予告を置きやすい余白
- Gameplayへ利用できるTrack候補
- 参考曲または避けたい方向性
- 仮素材として許容する品質と、本制作へ持ち越す要素

未決項目について担当者が複数案を提案することはできますが、独自判断で最終仕様として固定しません。

### 2. 比較可能なラフを作成する

同じBriefに対して、方向性を比較できるラフを2案以上作成します。各案は短い抜粋でも構いませんが、次を確認できる長さを持たせます。

- 基本Groove
- AttackEvent候補となるChordまたはArpeggio
- Charge受付を置く場合の音楽的な準備区間
- Loopした場合の接続方針
- Gameplayへ利用する可能性がある複数Track

### 3. MIDIとAttackEvent候補を添付する

各ラフについて、同じDAW Project・同じ開始基準から音源とMIDIを書き出します。MIDIにはTempo、拍子、Track名、Note位置を保持します。

AttackEvent候補はMIDIへ専用Trackとして埋め込まず、別表で次を記録します。

- 候補位置（小節・拍）
- Chord／Arpeggio
- 必要音候補
- 予告を開始できそうな位置
- 候補とした音楽的理由

### 4. レビューして採用方針を決める

サウンド、プランナー、実装担当がラフを確認し、採用案、組み合わせる要素、修正点を記録します。採用なしの場合も理由と次の試作方針を残します。

## 対象範囲

- 制作Brief
- 比較用BGMラフ2案以上
- 各ラフと同じ時間軸を持つMIDI
- Gameplay利用候補Track一覧
- AttackEvent候補一覧
- レビュー結果と採用方針

## 対象外

- 完成版のMix／Master
- UnityへのImport実装
- MusicChart Runtime実装
- AttackEvent成立判定の実装
- 最終BGMの完成判定
- 全SEの制作

## 完了条件

- [ ] 制作Briefに用途、狙い、テンポ・拍子・Loop方針、参考方向が記録されている
- [ ] 比較可能なBGMラフが2案以上ある
- [ ] 各ラフに対応するMIDIがある
- [ ] 音源とMIDIの開始位置、Tempo、拍子が一致している
- [ ] MIDI Track名から音楽上の役割を判別できる
- [ ] Gameplay利用候補Trackが示されている
- [ ] AttackEvent候補が小節・拍と音楽的理由付きで記録されている
- [ ] チームレビュー結果と採用方針が記録されている
- [ ] 完成本制作で残る作業を後続タスクとして切り出せる

## 確認手順

1. 各ラフ音源を単体で再生し、意図した方向性の違いを説明できることを確認します。
2. DAW上で音源とMIDIの開始位置、Tempo、拍子、Loop境界を確認します。
3. MIDIを再Importし、Track名とNote位置が保持されていることを確認します。
4. AttackEvent候補の位置を音源上で再生し、Chord／Arpeggioと一致することを確認します。
5. サウンド、プランナー、実装担当でレビューし、結果を記録します。

## 前提・依存タスク

なし。Player Action／State Graph基盤、Battle lifecycle、MusicChart Runtimeの完成を待たずに開始できます。

## 実装時の注意点

- ラフの段階でも音源とMIDIは同じDAW Project状態から書き出してください。
- AttackEventやRandom SectionをMIDI Track名へ埋め込むことを前提にしないでください。
- Gameplay上の成立条件やSlot数をサウンド担当だけで決定しないでください。
- `final2`等の曖昧な名前を使用せず、案とRevisionを識別できるようにしてください。
- DAW Projectと制作データはチームの共有ストレージへ置き、Notionにリンクを記載してください。

## 提出・報告方法

1. 制作Brief、ラフ音源、MIDI、AttackEvent候補一覧を共有ストレージへ配置します。
2. Notionタスクへ共有リンク、レビュー結果、採用方針を記載します。
3. 仕様変更が必要な判断は該当仕様ページへの反映候補として記録します。

## 関連リンク

- Notionタスク：<NotionTaskLink />
- 制作データ：未登録
