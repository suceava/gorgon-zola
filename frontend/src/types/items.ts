export interface Item {
  itemId: string
  name: string
  value: number
  keywords: string[]
  description?: string
  iconId?: number
  maxStackSize?: number
}
