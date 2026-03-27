import type { Recipe } from '../types/recipes';

export const VENDOR_MULTIPLIER = 2;

export function calcIngredientCost(recipe: Recipe): number {
  let cost = 0;
  for (const ing of recipe.ingredients) {
    const consume = ing.chanceToConsume ?? 1;
    cost += ing.value * ing.stackSize * consume;
  }
  return cost;
}

export function calcResultValue(recipe: Recipe): number {
  let value = 0;
  for (const res of recipe.results) {
    const chance = res.percentChance ?? 1;
    value += res.value * res.stackSize * chance;
  }
  return value;
}

export function calcProfit(recipe: Recipe): { ingredientCost: number; resultValue: number; profit: number } {
  const ingredientCost = calcIngredientCost(recipe);
  const resultValue = calcResultValue(recipe);
  return { ingredientCost, resultValue, profit: resultValue - ingredientCost };
}

export function calcVendorFillCost(
  recipe: Recipe,
  inventoryMap: Map<number, number>,
): number {
  let cost = 0;
  for (const ing of recipe.ingredients) {
    const consume = ing.chanceToConsume ?? 1;
    const owned = inventoryMap.get(ing.itemId) ?? 0;
    const unitPrice = owned >= ing.stackSize ? ing.value : ing.value * VENDOR_MULTIPLIER;
    cost += unitPrice * ing.stackSize * consume;
  }
  return cost;
}
