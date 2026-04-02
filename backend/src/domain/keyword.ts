import { batchGet, keys } from '../lib/db.js';

export interface KeywordItem {
  id: string;
  name: string;
}

export interface GameKeyword {
  keyword: string;
  items: KeywordItem[];
}

export class KeywordRepository {
  static async findByKeywords(keywords: string[]): Promise<GameKeyword[]> {
    if (keywords.length === 0) return [];
    const keyList = keywords.map((kw) => keys.keyword(kw));
    const records = await batchGet(keyList);
    return records.map(KeywordRepository.stripKeyword);
  }

  private static stripKeyword({ pk, sk, entityType, ...rest }: Record<string, unknown>): GameKeyword {
    return rest as unknown as GameKeyword;
  }
}
