import { EntityType, get, keys, queryEntityIndexAll } from '../lib/db.js';

export interface RecipeIngredient {
  itemId: number;
  itemName: string;
  value: number;
  stackSize: number;
  chanceToConsume?: number;
  desc?: string;
}

export interface RecipeGenericIngredient {
  itemKeys: string[];
  desc: string;
  stackSize: number;
}

export interface RecipeResult {
  itemId: number;
  itemName: string;
  value: number;
  stackSize: number;
  percentChance?: number;
}

export interface RecipeSource {
  type: string;
  name?: string;
  npc?: string;
  questId?: number;
  hangOutId?: number;
  itemTypeId?: number;
  skill?: string;
}

export interface GameRecipe {
  id: string;
  name: string;
  internalName: string;
  description?: string;
  iconId?: number;
  keywords?: string[];
  skill: string;
  skillLevelReq: number;
  ingredients: RecipeIngredient[];
  genericIngredients: RecipeGenericIngredient[];
  results: RecipeResult[];
  sources?: RecipeSource[];
}

export class RecipeRepository {
  static async findById(id: string): Promise<GameRecipe | undefined> {
    const { pk, sk } = keys.recipe(id);
    const record = await get(pk, sk);
    return record ? RecipeRepository.stripRecipe(record) : undefined;
  }

  static async findBySkill(skill: string): Promise<GameRecipe[]> {
    const records = await queryEntityIndexAll(EntityType.RECIPE);
    return records.filter((r) => (r as Record<string, unknown>).skill === skill).map(RecipeRepository.stripRecipe);
  }

  static async findAll(): Promise<GameRecipe[]> {
    const records = await queryEntityIndexAll(EntityType.RECIPE);
    return records.map(RecipeRepository.stripRecipe);
  }

  private static stripRecipe({ pk, sk, entityType, ...recipe }: Record<string, unknown>): GameRecipe {
    return recipe as unknown as GameRecipe;
  }

}
