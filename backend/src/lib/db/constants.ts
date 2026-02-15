export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? 'GorgonZola'
export const GSI1_NAME = 'GSI1'

export const EntityType = {
  ITEM: 'ITEM',
  RECIPE: 'RECIPE',
} as const

export type EntityType = (typeof EntityType)[keyof typeof EntityType]
