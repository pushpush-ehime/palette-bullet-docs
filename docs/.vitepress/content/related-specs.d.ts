export type RelationField = 'relatedSpecs' | 'relatedTasks'
export type RelationPageType = 'spec' | 'task'

export function relationFieldForPageType(
  pageType: RelationPageType
): RelationField
export function formatRelatedPages(
  field: RelationField,
  urls: string[]
): string
export function getRelatedPages(
  source: string,
  field: RelationField
): string[]
export function setRelatedPages(
  source: string,
  field: RelationField,
  urls: string[]
): string
export function getRelatedSpecs(source: string): string[]
export function setRelatedSpecs(source: string, urls: string[]): string
export function getRelatedTasks(source: string): string[]
export function setRelatedTasks(source: string, urls: string[]): string
