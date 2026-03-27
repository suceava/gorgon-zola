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
  genericIngredients: RecipeGenericIngredient[];
  results: RecipeResult[];
  sources?: RecipeSource[];
}
