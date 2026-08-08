export interface TaskTeamOption {
  value: string
  label: string
}

export const TASK_TEAM_OPTIONS: TaskTeamOption[]
export function isTaskTeam(value: string): boolean
export function setTaskTeam(source: string, team: string): string
