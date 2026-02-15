export interface RecipeIngredient {
  itemId: string
  itemName: string
  stackSize: number
  chanceToConsume?: number
}

export interface RecipeResult {
  itemId: string
  itemName: string
  stackSize: number
  percentChance?: number
}

export interface Recipe {
  recipeId: string
  name: string
  skill: string
  skillLevelReq: number
  ingredients: RecipeIngredient[]
  results: RecipeResult[]
  iconId?: number
}
