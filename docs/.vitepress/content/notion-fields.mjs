/**
 * Notion連携で使う共通定義。
 *
 * タスクページのfrontmatterに書ける値の一覧と、NotionタスクDBの
 * 選択肢を1か所にまとめる。検査（catalog.mjs）と同期スクリプト
 * （scripts/notion-sync.mjs）の両方がこのファイルを読む。
 *
 * NotionタスクDBの選択肢を増やしたときは、ここも合わせて更新する。
 */

/** 公開サイトのURL。Notionの「設計書」プロパティに入れる。 */
export const SITE_BASE_URL = 'https://pushpush-ehime.github.io/palette-bullet-docs'

/**
 * タスクID→NotionチケットURLの対応表の置き場所。
 *
 * 公開の直前に同期スクリプトが作り、ビルドが読む。
 * Gitで管理しない（mainへ書き込まずに済ませるため）。
 */
export const NOTION_LINKS_FILE = 'docs/.vitepress/content/notion-links.json'

/** Notion「班」の選択肢 */
export const TEAMS = ['企画', 'プログラム', 'デザイン', 'サウンド', '全体管理']

/** Notion「優先度」の選択肢 */
export const PRIORITIES = ['S', 'A', 'B', 'C']

/** Notion「マイルストーン」の選択肢 */
export const MILESTONES = ['プロトタイプ', 'α版', 'β版', '完成版']

/** Notion「状態」の選択肢 */
export const STATUSES = ['未着手', '着手', 'レビュー', '完了']

/** Notion「担当」の選択肢 */
export const MEMBERS = [
  '中村',
  '高平',
  '八木',
  '下條',
  '岡部',
  '山磨',
  '廣瀬',
  '西坂',
  '高村',
  '康',
  '岡元',
  '武田',
  '瀧上',
  '小野',
  '岡田',
  '松村',
  '光田',
  '平岡',
  '宇屋',
  '山下'
]

/**
 * frontmatterに書かれていないときにNotionへ入れる初期値。
 * teamはfrontmatterに明示された後も同期し、その他の進行項目は起票時だけ使う。
 */
export const DEFAULT_TASK_FIELDS = {
  team: 'プログラム',
  priority: 'B',
  milestone: 'プロトタイプ',
  status: '未着手'
}

/**
 * 選択肢の色。タスクDBを作り直すときに使う。
 * Notionは「teal」を受け付けないので使わない。
 */
export const OPTION_COLORS = {
  企画: 'green',
  プログラム: 'blue',
  デザイン: 'pink',
  サウンド: 'purple',
  全体管理: 'gray',
  S: 'red',
  A: 'orange',
  B: 'blue',
  C: 'gray',
  プロトタイプ: 'red',
  'α版': 'yellow',
  'β版': 'blue',
  完成版: 'green',
  未着手: 'gray',
  着手: 'blue',
  レビュー: 'yellow',
  完了: 'green'
}

/** タスクフォルダ名に対応するNotionページの絵文字アイコン */
export const CATEGORY_ICONS = {
  player: '🎮',
  camera: '🎥',
  'draw-system': '✏️',
  'shaondama-music': '🫧',
  enemy: '⚫',
  combat: '⚔️',
  stage: '🗺️',
  ui: '🖥️',
  effects: '✨',
  other: '📌'
}

/** 上のどれにも当てはまらないときのアイコン */
export const DEFAULT_CATEGORY_ICON = '🎯'

/** 期限（due）に書ける書式 */
export const DUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * タスクページのfrontmatterからNotionへ転記する項目の定義。
 * 検査メッセージもここから作る。
 */
export const NOTION_TASK_FIELDS = [
  {
    key: 'team',
    property: '班',
    type: 'select',
    options: TEAMS
  },
  {
    key: 'priority',
    property: '優先度',
    type: 'select',
    options: PRIORITIES
  },
  {
    key: 'milestone',
    property: 'マイルストーン',
    type: 'select',
    options: MILESTONES
  },
  {
    key: 'assignees',
    property: '担当',
    type: 'multi_select',
    options: MEMBERS
  },
  {
    key: 'due',
    property: '期限',
    type: 'date'
  }
]

/** タスクページだけで使えるfrontmatterの項目 */
export const TASK_ONLY_KEYS = [
  ...NOTION_TASK_FIELDS.map((field) => field.key),
  'notionUrl'
]
