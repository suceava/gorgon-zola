import { EntityType, get, keys, queryIndex } from '../lib/db.js';

export interface ItemSource {
  type: string;
  npc?: string;
  recipeId?: number;
  questId?: number;
  hangOutId?: number;
  itemTypeId?: number;
}

export interface ItemRecipe {
  recipeId: string;
  recipeName: string;
  skill: string;
}

export interface GameItem {
  id: string;
  name: string;
  value: number;
  internalName: string;
  description?: string;
  iconId?: number;
  keywords?: string[];
  maxStackSize?: number;
  isCrafted?: boolean;
  craftingTargetLevel?: number;
  craftPoints?: number;
  sources?: ItemSource[];
  recipes?: ItemRecipe[];
}

export class ItemRepository {
  static async findById(id: string): Promise<GameItem | undefined> {
    const { pk, sk } = keys.item(id);
    const record = await get(pk, sk);
    return record ? ItemRepository.strip(record) : undefined;
  }

  static async search(query?: string): Promise<GameItem[]> {
    const records = await queryIndex(EntityType.ITEM, query);
    return records.map(ItemRepository.strip);
  }

  private static strip({ pk, sk, entityType, ...item }: Record<string, unknown>): GameItem {
    return item as unknown as GameItem;
  }
}
