import { EntityType, get, keys, queryIndex } from '../lib/db.js';

export interface NpcItem {
  itemId: string;
  itemName: string;
  sourceType: string;
}

export interface GameNpc {
  id: string;
  name: string;
  areaName?: string;
  areaFriendlyName?: string;
  items: NpcItem[];
}

export class NpcRepository {
  static async findById(id: string): Promise<GameNpc | undefined> {
    const { pk, sk } = keys.npc(id);
    const record = await get(pk, sk);
    return record ? NpcRepository.strip(record) : undefined;
  }

  static async search(prefix?: string): Promise<GameNpc[]> {
    const records = await queryIndex(EntityType.NPC, prefix ? prefix.toUpperCase() : undefined);
    return records.map(NpcRepository.strip);
  }

  private static strip({ pk, sk, entityType, entitySk, ...npc }: Record<string, unknown>): GameNpc {
    return npc as unknown as GameNpc;
  }
}
