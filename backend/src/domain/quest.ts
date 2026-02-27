import { EntityType, get, keys, queryIndex } from '../lib/db.js';

export interface QuestItem {
  itemId: string;
  itemName: string;
}

export interface GameQuest {
  id: string;
  name: string;
  description?: string;
  displayedLocation?: string;
  items: QuestItem[];
}

export class QuestRepository {
  static async findById(id: string): Promise<GameQuest | undefined> {
    const { pk, sk } = keys.quest(id);
    const record = await get(pk, sk);
    return record ? QuestRepository.strip(record) : undefined;
  }

  static async search(prefix?: string): Promise<GameQuest[]> {
    const records = await queryIndex(EntityType.QUEST, prefix ? prefix.toUpperCase() : undefined);
    return records.map(QuestRepository.strip);
  }

  private static strip({ pk, sk, entityType, entitySk, ...quest }: Record<string, unknown>): GameQuest {
    return quest as unknown as GameQuest;
  }
}
