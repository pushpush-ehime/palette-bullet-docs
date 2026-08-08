export const TASK_ID_PATTERN = /^PB-TASK-(\d{4})$/

/**
 * タスクIDはfrontmatterに明示された値を正とし、新規作成時だけ
 * 実タスクの最大値から次の候補を求める。
 *
 * @param {Array<{ pageType?: string, taskId?: string }>} catalog
 */
export function nextTaskId(catalog) {
  const maxNumber = catalog
    .filter((entry) => entry.pageType === 'task')
    .reduce((maximum, entry) => {
      const matched = TASK_ID_PATTERN.exec(entry.taskId ?? '')
      return matched ? Math.max(maximum, Number(matched[1])) : maximum
    }, 0)

  return `PB-TASK-${String(maxNumber + 1).padStart(4, '0')}`
}
