import { get, query, queryIndex, keys, EntityType } from '../lib/db.js'

export interface RecipeIngredient {
  itemId: number
  stackSize: number
  chanceToConsume?: number
  desc?: string
}

export interface RecipeResult {
  itemId: number
  stackSize: number
  percentChance?: number
}

export interface GameRecipe {
  id: string
  name: string
  internalName: string
  description?: string
  iconId?: number
  keywords?: string[]
  skill: string
  skillLevelReq: number
  ingredients: RecipeIngredient[]
  results: RecipeResult[]
}

export interface IngredientIndex {
  recipeId: string
  recipeName: string
  skill: string
  ingredientItemId: number
  stackSize: number
}

export class RecipeRepository {
  static async findById(id: string): Promise<GameRecipe | undefined> {
    const { pk, sk } = keys.recipe(id)
    const record = await get(pk, sk)
    return record ? RecipeRepository.stripRecipe(record) : undefined
  }

  static async findByIngredient(itemId: string): Promise<IngredientIndex[]> {
    const records = await query(`INGREDIENT#${itemId}`)
    return records.map(RecipeRepository.stripIngredientIndex)
  }

  static async findBySkill(skill: string): Promise<GameRecipe[]> {
    const records = await queryIndex(EntityType.RECIPE, `SKILL#${skill}`)
    return records.map(RecipeRepository.stripRecipe)
  }

  static async findAll(): Promise<GameRecipe[]> {
    const records = await queryIndex(EntityType.RECIPE)
    return records.map(RecipeRepository.stripRecipe)
  }

  private static stripRecipe({ pk, sk, entityType, entitySk, ...recipe }: Record<string, unknown>): GameRecipe {
    return recipe as unknown as GameRecipe
  }

  private static stripIngredientIndex({ pk, sk, ...record }: Record<string, unknown>): IngredientIndex {
    return record as unknown as IngredientIndex
  }
}
