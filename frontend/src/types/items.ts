export interface ItemSource {
  type: string;
  npc?: string;
  recipeId?: number;
  questId?: number;
  hangOutId?: number;
  itemTypeId?: number;
}

export interface ItemRecipe {
  recipeId: string;
  recipeName: string;
  skill: string;
}

export interface Item {
  id: string;
  name: string;
  value: number;
  internalName: string;
  description?: string;
  iconId?: number;
  keywords?: string[];
  maxStackSize?: number;
  isCrafted?: boolean;
  craftingTargetLevel?: number;
  craftPoints?: number;
  sources?: ItemSource[];
  recipes?: ItemRecipe[];
}
