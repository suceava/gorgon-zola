import { EntityType, get, keys, queryIndex } from '../lib/db.js';

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
}

export class ItemRepository {
  static async findById(id: string): Promise<GameItem | undefined> {
    const { pk, sk } = keys.item(id);
    const record = await get(pk, sk);
    return record ? ItemRepository.strip(record) : undefined;
  }

  static async search(prefix?: string): Promise<GameItem[]> {
    const records = await queryIndex(EntityType.ITEM, prefix ? prefix.toUpperCase() : undefined);
    return records.map(ItemRepository.strip);
  }

  private static strip({ pk, sk, entityType, entitySk, ...item }: Record<string, unknown>): GameItem {
    return item as unknown as GameItem;
  }
}
