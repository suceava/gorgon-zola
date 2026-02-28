import { EntityType, get, keys, queryEntityIndexAll } from '../lib/db.js';

export interface QuestItem {
  itemId: string;
  itemName: string;
}

export interface QuestRequirement {
  type: string;
  npc?: string;
  level?: string | number;
  skill?: string;
}

export interface QuestObjective {
  type: string;
  description: string;
  number?: number;
  target?: string;
}

export interface QuestReward {
  type: string;
  skill?: string;
  xp?: number;
}

export interface GameQuest {
  id: string;
  name: string;
  description?: string;
  displayedLocation?: string;
  favorNpc?: string;
  requirements: QuestRequirement[];
  objectives: QuestObjective[];
  rewardFavor?: number;
  rewards: QuestReward[];
  items: QuestItem[];
}

export class QuestRepository {
  static async findById(id: string): Promise<GameQuest | undefined> {
    const { pk, sk } = keys.quest(id);
    const record = await get(pk, sk);
    return record ? QuestRepository.strip(record) : undefined;
  }

  static async search(query?: string): Promise<GameQuest[]> {
    const records = await queryEntityIndexAll(EntityType.QUEST, query);
    return records.map(QuestRepository.strip);
  }

  private static strip({ pk, sk, entityType, ...quest }: Record<string, unknown>): GameQuest {
    return quest as unknown as GameQuest;
  }
}
