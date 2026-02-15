export interface GameItem {
  itemId: string
  name: string
  value: number
  keywords: string[]
  description?: string
  iconId?: number
  maxStackSize?: number
}

/** Raw item shape from CDN JSON (keyed by item_XXXX) */
export interface CdnItem {
  Name: string
  Value: number
  Keywords?: string[]
  Description?: string
  IconId?: number
  MaxStackSize?: number
}
