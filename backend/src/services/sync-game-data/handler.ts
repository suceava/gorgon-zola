import type { ScheduledHandler } from 'aws-lambda'
import { batchWrite, keys } from '../../lib/db/table.js'
import { EntityType } from '../../lib/db/constants.js'
import type { CdnItem } from '../../domain/items/types.js'
import type { CdnRecipe } from '../../domain/recipes/types.js'

const CDN_BASE = process.env.GORGON_CDN_BASE_URL ?? 'https://cdn.projectgorgon.com/v456/data'

async function fetchJson<T>(filename: string): Promise<T> {
  const res = await fetch(`${CDN_BASE}/${filename}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${filename}: ${res.status}`)
  }
  return res.json()
}

function transformItems(raw: Record<string, CdnItem>) {
  return Object.entries(raw).map(([id, item]) => {
    const { pk, sk } = keys.item(id)
    return {
      pk,
      sk,
      entityType: EntityType.ITEM,
      gsi1sk: (item.Name ?? '').toUpperCase(),
      itemId: id,
      name: item.Name,
      value: item.Value ?? 0,
      keywords: item.Keywords ?? [],
      iconId: item.IconId,
      maxStackSize: item.MaxStackSize,
    }
  })
}

function transformRecipes(raw: Record<string, CdnRecipe>) {
  const records: Record<string, unknown>[] = []

  for (const [id, recipe] of Object.entries(raw)) {
    // Recipe metadata record
    const { pk, sk } = keys.recipe(id)
    records.push({
      pk,
      sk,
      entityType: EntityType.RECIPE,
      gsi1sk: `SKILL#${recipe.Skill}`,
      recipeId: id,
      name: recipe.Name,
      skill: recipe.Skill,
      skillLevelReq: recipe.SkillLevelReq ?? 0,
      ingredients: (recipe.Ingredients ?? []).map((ing) => ({
        itemCode: ing.ItemCode,
        stackSize: ing.StackSize ?? 1,
        chanceToConsume: ing.ChanceToConsume,
        desc: ing.Desc,
      })),
      results: (recipe.ResultItems ?? []).map((res) => ({
        itemCode: res.ItemCode,
        stackSize: res.StackSize ?? 1,
        percentChance: res.PercentChance,
      })),
      iconId: recipe.IconId,
    })

    // Ingredient index records (for "what can I craft with item X?" queries)
    for (const ing of recipe.Ingredients ?? []) {
      if (ing.ItemCode) {
        const ingredientKey = keys.ingredient(`item_${ing.ItemCode}`, id)
        records.push({
          pk: ingredientKey.pk,
          sk: ingredientKey.sk,
          recipeId: id,
          recipeName: recipe.Name,
          skill: recipe.Skill,
          ingredientItemCode: ing.ItemCode,
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
    fetchJson<Record<string, CdnItem>>('items.json'),
    fetchJson<Record<string, CdnRecipe>>('recipes.json'),
  ])

  const itemRecords = transformItems(itemsRaw)
  console.log(`Transformed ${itemRecords.length} items`)

  const recipeRecords = transformRecipes(recipesRaw)
  console.log(`Transformed ${recipeRecords.length} recipe records`)

  await batchWrite(itemRecords)
  console.log('Items written to DynamoDB')

  await batchWrite(recipeRecords)
  console.log('Recipes written to DynamoDB')

  console.log('Sync complete')
}
