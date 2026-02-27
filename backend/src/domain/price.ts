import { keys, put, query } from '../lib/db.js';

export interface PlayerPrice {
  itemId: string;
  price: number;
  timestamp: string;
  notes?: string;
}

export class PriceRepository {
  static async getForItem(itemId: string): Promise<PlayerPrice[]> {
    const records = await query(`ITEM#${itemId}`, 'PRICE#');
    return records.map(PriceRepository.strip);
  }

  static async submit(itemId: string, price: number, notes?: string): Promise<PlayerPrice> {
    const timestamp = new Date().toISOString();
    const { pk, sk } = keys.price(itemId, timestamp);

    await put({ pk, sk, itemId, price, timestamp, notes });

    return { itemId, price, timestamp, notes };
  }

  private static strip({ pk, sk, ...price }: Record<string, unknown>): PlayerPrice {
    return price as unknown as PlayerPrice;
  }
}
