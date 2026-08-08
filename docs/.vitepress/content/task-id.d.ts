export interface TaskIdEntry {
  pageType?: string
  taskId?: string
}

export const TASK_ID_PATTERN: RegExp
export function nextTaskId(catalog: TaskIdEntry[]): string
