import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useKeywords, useRecipe, useRecipes } from '../api/hooks';
import { CraftingTree } from '../components/CraftingTree';
import { InfoTip } from '../components/InfoTip';
import { buildInventoryMap, buildProducerIndex, calcProfit, calcTimesCraftable, calcVendorFillCost, loadInventory } from '../lib/crafting';
import type { RecipeSource } from '../types/recipes';

export function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading, error } = useRecipe(id!);
  const { data: allRecipes } = useRecipes();

  const inventory = useMemo(() => loadInventory(), []);
  const inventoryMap = useMemo(() => inventory ? buildInventoryMap(inventory) : null, [inventory]);

  // Collect keywords from generic ingredients to resolve against inventory
  const keywords = useMemo(() => {
    if (!recipe) return [];
    const kws = new Set<string>();
    for (const gen of recipe.genericIngredients) {
      for (const kw of gen.itemKeys) kws.add(kw);
    }
    return Array.from(kws);
  }, [recipe]);

  const { data: keywordData } = useKeywords(keywords);
  const keywordMap = useMemo(() => {
    if (!keywordData) return null;
    const map = new Map<string, string[]>();
    for (const kw of keywordData) map.set(kw.keyword, kw.items.map((i) => i.id));
    return map;
  }, [keywordData]);

  const producerIndex = useMemo(() => allRecipes ? buildProducerIndex(allRecipes) : null, [allRecipes]);

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-400">Failed to load recipe: {(error as Error).message}</p>;
  if (!recipe) return <p className="text-gray-500">Recipe not found.</p>;

  const timesCraftable = inventoryMap ? calcTimesCraftable(recipe, inventoryMap, keywordMap) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{recipe.name}</h1>
        {recipe.description && <p className="text-gray-300">{recipe.description}</p>}
        <p className="text-gray-400 text-sm">
          {recipe.skill} - Level {recipe.skillLevelReq}
        </p>
      </div>

      {/* Sources */}
      {recipe.sources && recipe.sources.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">How to Get</h2>
          <ul className="space-y-2 text-sm">
            {recipe.sources.map((source, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-amber-900/50 text-amber-400 rounded">
                  {source.type}
                </span>
                <RecipeSourceLabel source={source} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ingredients */}
      {(recipe.ingredients.length > 0 || recipe.genericIngredients.length > 0) && (
        <CraftingTree
          recipe={recipe}
          inventoryMap={inventoryMap}
          producerIndex={producerIndex}
          keywordMap={keywordMap}
          keywordData={keywordData}
          inventory={inventory}
        />
      )}

      {/* Results */}
      {recipe.results.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Results</h2>
            {timesCraftable != null && timesCraftable > 0 && (
              <span className="text-sm text-green-400">
                Can craft {timesCraftable}x
              </span>
            )}
            {timesCraftable === 0 && (
              <span className="text-sm text-red-400">
                Missing ingredients
              </span>
            )}
          </div>
          <ul className="space-y-2 text-sm">
            {recipe.results.map((res) => (
              <li key={res.itemId} className="flex items-center gap-2">
                <span className="text-gray-400">{res.stackSize}x</span>
                <Link to={`/items/${res.itemId}`} className="text-blue-400 hover:text-blue-300">
                  {res.itemName}
                </Link>
                <span className="text-gray-500 text-xs">
                  ({res.stackSize > 1 ? `${res.value.toLocaleString()}c x ${res.stackSize} = ${(res.value * res.stackSize).toLocaleString()}c` : `${res.value.toLocaleString()}c`})
                </span>
                {res.percentChance != null && res.percentChance < 1 && (
                  <span className="text-xs text-gray-500">
                    {Math.round(res.percentChance * 100)}% chance
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Profitability */}
      {recipe.results.length > 0 && (() => {
        const { ingredientCost, resultValue, profit } = calcProfit(recipe);
        const showTotal = timesCraftable != null && timesCraftable > 0;

        const vendorFillCost = inventoryMap && timesCraftable === 0
          ? calcVendorFillCost(recipe, inventoryMap)
          : null;
        const vendorFillProfit = vendorFillCost != null ? resultValue - vendorFillCost : null;

        return (
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <h2 className="text-lg font-semibold">Profitability</h2>
            <div className={`flex flex-wrap gap-4 text-sm`}>
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-2 min-w-48 flex-1 max-w-xs">
                <div className="text-gray-300 font-medium flex items-center gap-1">
                  Per Craft
                  <InfoTip text="Ingredient value (opportunity cost of selling raw) vs crafted result value" />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cost</span>
                  <span className="font-mono text-gray-300">{Math.round(ingredientCost).toLocaleString()}c</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Value</span>
                  <span className="font-mono text-gray-300">{Math.round(resultValue).toLocaleString()}c</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-2">
                  <span className="text-gray-400">Profit</span>
                  <span className={`font-mono font-medium ${
                    profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()}c
                  </span>
                </div>
              </div>
              {showTotal && (
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2 min-w-48 flex-1 max-w-xs">
                  <div className="text-gray-300 font-medium flex items-center gap-1">
                    Total ({timesCraftable}x)
                    <InfoTip text="Total profit if you craft all you can with current inventory" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cost</span>
                    <span className="font-mono text-gray-300">{Math.round(ingredientCost * timesCraftable).toLocaleString()}c</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Value</span>
                    <span className="font-mono text-gray-300">{Math.round(resultValue * timesCraftable).toLocaleString()}c</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-600 pt-2">
                    <span className="text-gray-400">Profit</span>
                    <span className={`font-mono font-medium ${
                      profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {profit > 0 ? '+' : ''}{Math.round(profit * timesCraftable).toLocaleString()}c
                    </span>
                  </div>
                </div>
              )}
              {vendorFillCost != null && (
                <div className="bg-amber-900/20 rounded-lg p-4 space-y-2 min-w-48 flex-1 max-w-xs border border-amber-800/30">
                  <div className="text-amber-400 font-medium flex items-center gap-1">
                    Vendor Fill (~2x)
                    <InfoTip text="Owned ingredients at base value + missing ingredients at ~2x vendor price. Shows if it's worth buying the rest from a vendor to craft." />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cost</span>
                    <span className="font-mono text-gray-300">{Math.round(vendorFillCost).toLocaleString()}c</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Value</span>
                    <span className="font-mono text-gray-300">{Math.round(resultValue).toLocaleString()}c</span>
                  </div>
                  <div className="flex justify-between border-t border-amber-800/30 pt-2">
                    <span className="text-gray-400">Profit</span>
                    <span className={`font-mono font-medium ${
                      vendorFillProfit! > 0 ? 'text-green-400' : vendorFillProfit! < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {vendorFillProfit! > 0 ? '+' : ''}{Math.round(vendorFillProfit!).toLocaleString()}c
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}

function RecipeSourceLabel({ source }: { source: RecipeSource }) {
  switch (source.type) {
    case 'Training':
      return <span className="text-gray-300">{source.name ?? source.npc ?? 'NPC trainer'}</span>;
    case 'Skill':
      return <span className="text-gray-300">Auto-learned ({source.skill})</span>;
    case 'Quest':
      return <span className="text-gray-300">{source.name ?? `Quest #${source.questId}`}</span>;
    case 'HangOut':
      return <span className="text-gray-300">{source.name ? `${source.name} hangout` : source.npc ? `${source.npc} hangout` : 'Hangout'}</span>;
    case 'Item':
      return source.itemTypeId != null ? (
        <Link to={`/items/${source.itemTypeId}`} className="text-blue-400 hover:text-blue-300">
          {source.name ?? `Item #${source.itemTypeId}`}
        </Link>
      ) : null;
    case 'Effect':
      return <span className="text-gray-300">Ability effect</span>;
    default:
      return <span className="text-gray-300">{source.type}</span>;
  }
}

