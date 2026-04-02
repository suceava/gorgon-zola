import type { StoredInventory, StoredCharacter } from '../types/character';
import type { Recipe } from '../types/recipes';

const INV_KEY = 'gorgon-zola-game-inventory';
const CHAR_KEY = 'gorgon-zola-game-character';

export const VENDOR_MULTIPLIER = 2;

export type InventoryMap = Map<number, { quantity: number; value: number; name: string }>;

export interface CraftableRecipe {
  recipe: Recipe;
  ingredientCost: number;
  resultValue: number;
  profit: number;
  timesCraftable: number;
  totalProfit: number;
  hasAllIngredients: boolean;
  missingIngredients: string[];
  hasSkill: boolean;
}

export function loadInventory(): StoredInventory | null {
  const raw = localStorage.getItem(INV_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function loadCharacter(): StoredCharacter | null {
  const raw = localStorage.getItem(CHAR_KEY);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Converts the player's inventory into a Map keyed by item ID (typeId in the game export,
 * same as recipe ingredient.itemId). Used to check if the player owns enough of each
 * ingredient, e.g. "recipe needs 3 of item 5026 — inventory has 130".
 */
export function buildInventoryMap(inventory: StoredInventory): InventoryMap {
  const map: InventoryMap = new Map();
  for (const item of inventory.items) {
    map.set(item.typeId, { quantity: item.quantity, value: item.value, name: item.name });
  }
  return map;
}

export function calcTimesCraftable(
  recipe: Recipe,
  inventoryMap: Map<number, number>,
  keywordMap?: Map<string, string[]> | null,
): number {
  let times = Infinity;

  for (const ing of recipe.ingredients) {
    const owned = inventoryMap.get(ing.itemId) ?? 0;
    times = Math.min(times, Math.floor(owned / ing.stackSize));
  }

  if (keywordMap) {
    // Group generic ingredients by keyword key — multiple lines with the same keyword
    // draw from the same inventory pool (e.g. 3x "CorpseLimb" = 3 from the same pool)
    const keywordTotals = new Map<string, number>();
    for (const gen of recipe.genericIngredients) {
      const key = gen.itemKeys.join(',');
      keywordTotals.set(key, (keywordTotals.get(key) ?? 0) + gen.stackSize);
    }
    for (const [key, totalNeeded] of keywordTotals) {
      const itemKeys = key.split(',');
      const owned = getGenericIngredientOwned(itemKeys, inventoryMap, keywordMap);
      times = Math.min(times, Math.floor(owned / totalNeeded));
    }
  }

  return times === Infinity ? 0 : times;
}

/**
 * Analyze a recipe against a player's inventory and skills.
 * Returns cost, profit, craftable count, and missing ingredients.
 *
 * Generic ingredients have keyword strings in itemKeys (e.g. "GlassChunk") which
 * can't be matched against inventory directly. Pass keywordMap (keyword → item IDs)
 * to resolve them — built from the /keywords API endpoint.
 */
export function analyzeRecipe(
  recipe: Recipe,
  inventoryMap: InventoryMap,
  skills: Record<string, number>,
  keywordMap?: Map<string, string[]>,
): CraftableRecipe {
  const userLevel = skills[recipe.skill];
  const hasSkill = userLevel !== undefined && userLevel >= recipe.skillLevelReq;

  let ingredientCost = 0;
  let timesCraftable = Infinity;
  let hasAllIngredients = true;
  const missingIngredients: string[] = [];

  for (const ing of recipe.ingredients) {
    const consume = ing.chanceToConsume ?? 1;
    ingredientCost += ing.value * ing.stackSize * consume;

    const owned = inventoryMap.get(ing.itemId);
    if (!owned || owned.quantity < ing.stackSize) {
      hasAllIngredients = false;
      missingIngredients.push(ing.itemName || ing.desc || `Item ${ing.itemId}`);
      timesCraftable = 0;
    } else if (timesCraftable > 0) {
      timesCraftable = Math.min(timesCraftable, Math.floor(owned.quantity / ing.stackSize));
    }
  }

  if (keywordMap) {
    // Group generic ingredients by keyword — multiple lines with the same keyword
    // draw from the same inventory pool
    const groups = new Map<string, { totalStackSize: number; desc: string; itemKeys: string[] }>();
    for (const gen of recipe.genericIngredients) {
      const key = gen.itemKeys.join(',');
      const existing = groups.get(key);
      if (existing) {
        existing.totalStackSize += gen.stackSize;
      } else {
        groups.set(key, { totalStackSize: gen.stackSize, desc: gen.desc, itemKeys: gen.itemKeys });
      }
    }

    for (const { totalStackSize, desc, itemKeys } of groups.values()) {
      let totalOwned = 0;
      let cheapestValue = Infinity;
      for (const keyword of itemKeys) {
        for (const itemId of keywordMap.get(keyword) ?? []) {
          const owned = inventoryMap.get(parseInt(itemId, 10));
          if (owned && owned.quantity > 0) {
            totalOwned += owned.quantity;
            if (owned.value < cheapestValue) cheapestValue = owned.value;
          }
        }
      }
      if (totalOwned < totalStackSize) {
        hasAllIngredients = false;
        missingIngredients.push(desc);
        timesCraftable = 0;
      } else {
        timesCraftable = Math.min(timesCraftable, Math.floor(totalOwned / totalStackSize));
        ingredientCost += (cheapestValue === Infinity ? 0 : cheapestValue) * totalStackSize;
      }
    }
  }

  if (timesCraftable === Infinity) timesCraftable = 0;

  const resultValue = calcResultValue(recipe);
  const profit = resultValue - ingredientCost;
  const totalProfit = profit * timesCraftable;

  return {
    recipe,
    ingredientCost,
    resultValue,
    profit,
    timesCraftable,
    totalProfit,
    hasSkill,
    hasAllIngredients,
    missingIngredients,
  };
}

/** Sum total owned quantity across all items matching a generic ingredient's keywords. */
export function getGenericIngredientOwned(
  itemKeys: string[],
  inventoryMap: Map<number, number>,
  keywordMap: Map<string, string[]>,
): number {
  let total = 0;
  for (const kw of itemKeys) {
    for (const itemId of keywordMap.get(kw) ?? []) {
      total += inventoryMap.get(parseInt(itemId, 10)) ?? 0;
    }
  }
  return total;
}

export function formatCouncils(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return '0';
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString()}`;
}

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
