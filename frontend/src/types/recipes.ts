export interface RecipeIngredient {
  itemId: number;
  itemName: string;
  stackSize: number;
  chanceToConsume?: number;
  desc?: string;
}

export interface RecipeResult {
  itemId: number;
  itemName: string;
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
