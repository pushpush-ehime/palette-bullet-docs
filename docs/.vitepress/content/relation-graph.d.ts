export interface RelationGraphPage {
  url: string
  pageType: string
  relatedSpecs?: readonly string[]
  relatedTasks?: readonly string[]
}

export interface RelationEdge {
  specUrl: string
  taskUrl: string
  declaredByTask: boolean
  declaredBySpec: boolean
}

export function canonicalRelationUrl(value: unknown): string

export function buildRelationEdges(
  pages: readonly RelationGraphPage[]
): RelationEdge[]
