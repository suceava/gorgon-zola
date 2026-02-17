import type { ScheduledHandler } from 'aws-lambda'
import { batchPut, keys, EntityType, type DbRecord } from '../../lib/db.js'
const GAME_DATA_URL = process.env.GAME_DATA_URL!

async function fetchJson<T>(filename: string): Promise<T> {
  const res = await fetch(`${GAME_DATA_URL}/${filename}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${filename}: ${res.status}`)
  }
  return res.json()
}

/** Raw game data shapes (PascalCase as they come over the wire) */
interface RawItem {
  Name: string
  Value: number
  InternalName: string
  Description?: string
  IconId?: number
  Keywords?: string[]
  MaxStackSize?: number
  IsCrafted?: boolean
  CraftingTargetLevel?: number
  CraftPoints?: number
}

interface RawRecipe {
  InternalName: string
  Name: string
  Description?: string
  IconId?: number
  Skill: string
  SkillLevelReq: number
  Ingredients: { ItemCode: number; StackSize: number; ChanceToConsume?: number; Desc?: string }[]
  ResultItems: { ItemCode: number; StackSize: number; PercentChance?: number }[]
  RewardSkill?: string
  RewardSkillXp?: number
}

function parseId(key: string): string {
  return key.split('_').pop()!
}

function transformItems(raw: Record<string, RawItem>) {
  return Object.entries(raw).map(([key, item]) => {
    const { pk, sk } = keys.item(key)
    return {
      pk,
      sk,
      entityType: EntityType.ITEM,
      entitySk: (item.Name ?? '').toUpperCase(),
      id: parseId(key),
      name: item.Name,
      value: item.Value ?? 0,
      internalName: item.InternalName,
      description: item.Description,
      iconId: item.IconId,
      keywords: item.Keywords ?? [],
      maxStackSize: item.MaxStackSize,
      isCrafted: item.IsCrafted,
      craftingTargetLevel: item.CraftingTargetLevel,
      craftPoints: item.CraftPoints,
    }
  })
}

function transformRecipes(raw: Record<string, RawRecipe>) {
  const records: DbRecord[] = []

  for (const [key, recipe] of Object.entries(raw)) {
    // Recipe metadata record
    const { pk, sk } = keys.recipe(key)
    records.push({
      pk,
      sk,
      entityType: EntityType.RECIPE,
      entitySk: `SKILL#${recipe.Skill}`,
      id: parseId(key),
      name: recipe.Name,
      skill: recipe.Skill,
      skillLevelReq: recipe.SkillLevelReq ?? 0,
      ingredients: (recipe.Ingredients ?? []).map((ing) => ({
        itemId: ing.ItemCode,
        stackSize: ing.StackSize ?? 1,
        chanceToConsume: ing.ChanceToConsume,
        desc: ing.Desc,
      })),
      results: (recipe.ResultItems ?? []).map((res) => ({
        itemId: res.ItemCode,
        stackSize: res.StackSize ?? 1,
        percentChance: res.PercentChance,
      })),
      iconId: recipe.IconId,
    })

    // Ingredient index records (for "what can I craft with item X?" queries)
    for (const ing of recipe.Ingredients ?? []) {
      if (ing.ItemCode) {
        const ingredientKey = keys.ingredient(`item_${ing.ItemCode}`, key)
        records.push({
          pk: ingredientKey.pk,
          sk: ingredientKey.sk,
          recipeId: parseId(key),
          recipeName: recipe.Name,
          skill: recipe.Skill,
          ingredientItemId: ing.ItemCode,
          stackSize: ing.StackSize ?? 1,
        })
      }
    }
  }

  return records
}

export const handler: ScheduledHandler = async () => {
  console.log('Starting game data sync...')

  const [itemsRaw, recipesRaw] = await Promise.all([
    fetchJson<Record<string, RawItem>>('items.json'),
    fetchJson<Record<string, RawRecipe>>('recipes.json'),
  ])

  const itemRecords = transformItems(itemsRaw)
  console.log(`Transformed ${itemRecords.length} items`)

  const recipeRecords = transformRecipes(recipesRaw)
  console.log(`Transformed ${recipeRecords.length} recipe records`)

  await batchPut(itemRecords)
  console.log('Items written to DynamoDB')

  await batchPut(recipeRecords)
  console.log('Recipes written to DynamoDB')

  console.log('Sync complete')
}
