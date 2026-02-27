export interface RecipeIngredient {
  itemId: number;
  stackSize: number;
  chanceToConsume?: number;
  desc?: string;
}

export interface RecipeResult {
  itemId: number;
  stackSize: number;
  percentChance?: number;
}

export interface Recipe {
  id: string;
  name: string;
  internalName: string;
  description?: string;
  iconId?: number;
  keywords?: string[];
  skill: string;
  skillLevelReq: number;
  ingredients: RecipeIngredient[];
  results: RecipeResult[];
}

export interface IngredientIndex {
  recipeId: string;
  recipeName: string;
  skill: string;
  ingredientItemId: number;
  stackSize: number;
}
