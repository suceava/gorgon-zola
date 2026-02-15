export interface RecipeIngredient {
  itemCode: number
  stackSize: number
  chanceToConsume?: number
  desc?: string
}

export interface RecipeResult {
  itemCode: number
  stackSize: number
  percentChance?: number
}

export interface GameRecipe {
  recipeId: string
  name: string
  skill: string
  skillLevelReq: number
  ingredients: RecipeIngredient[]
  results: RecipeResult[]
  iconId?: number
}

/** Raw recipe shape from CDN JSON (keyed by recipe_XXXX) */
export interface CdnRecipe {
  InternalName: string
  Name: string
  Description?: string
  IconId?: number
  Skill: string
  SkillLevelReq: number
  Ingredients: CdnRecipeIngredient[]
  ResultItems: CdnRecipeResult[]
  RewardSkill?: string
  RewardSkillXp?: number
}

export interface CdnRecipeIngredient {
  ItemCode: number
  StackSize: number
  ChanceToConsume?: number
  Desc?: string
  ItemKeys?: string[]
}

export interface CdnRecipeResult {
  ItemCode: number
  StackSize: number
  PercentChance?: number
}
