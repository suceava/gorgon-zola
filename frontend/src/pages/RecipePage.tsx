import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useKeywords, useRecipe, type Keyword } from '../api/hooks';
import { calcProfit, calcTimesCraftable, calcVendorFillCost, getGenericIngredientOwned, loadInventory } from '../lib/crafting';
import type { StoredInventory } from '../types/character';
import type { RecipeSource } from '../types/recipes';

export function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading, error } = useRecipe(id!);

  const inventory = useMemo(() => loadInventory(), []);
  const inventoryMap = useMemo(() => {
    if (!inventory) return null;
    const map = new Map<number, number>();
    for (const item of inventory.items) {
      map.set(item.typeId, item.quantity);
    }
    return map;
  }, [inventory]);

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
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <ul className="space-y-2 text-sm">
            {recipe.ingredients.map((ing) => {
              const owned = inventoryMap ? (inventoryMap.get(ing.itemId) ?? 0) : null;
              return (
                <li key={ing.itemId} className="flex items-center gap-2">
                  <span className="text-gray-400">{ing.stackSize}x</span>
                  <Link to={`/items/${ing.itemId}`} className="text-blue-400 hover:text-blue-300">
                    {ing.itemName}
                  </Link>
                  <span className="text-gray-500 text-xs">
                    ({ing.stackSize > 1 ? `${ing.value.toLocaleString()}c x ${ing.stackSize} = ${(ing.value * ing.stackSize).toLocaleString()}c` : `${ing.value.toLocaleString()}c`})
                  </span>
                  {ing.chanceToConsume != null && ing.chanceToConsume < 1 && (
                    <span className="text-xs text-gray-500">
                      {Math.round(ing.chanceToConsume * 100)}% consumed
                    </span>
                  )}
                  {owned != null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      owned >= ing.stackSize ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {owned} owned
                    </span>
                  )}
                </li>
              );
            })}
            {recipe.genericIngredients.map((ing, i) => {
              const bestOwned = inventoryMap && keywordMap
                ? getGenericIngredientOwned(ing.itemKeys, inventoryMap, keywordMap)
                : null;
              return (
                <li key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{ing.stackSize}x</span>
                    <span className="text-gray-300">{ing.desc}</span>
                    {ing.itemKeys.map((kw) => (
                      <KeywordTag key={kw} keyword={kw} keywordData={keywordData} inventory={inventory} />
                    ))}
                    {bestOwned != null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        bestOwned >= ing.stackSize ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                      }`}>
                        {bestOwned} owned
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
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
                <div className="text-gray-300 font-medium">Per Craft</div>
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
                  <div className="text-gray-300 font-medium">Total ({timesCraftable}x)</div>
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
                  <div className="text-amber-400 font-medium">Vendor Fill (~2x)</div>
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

function KeywordTag({
  keyword,
  keywordData,
  inventory,
}: {
  keyword: string;
  keywordData: Keyword[] | undefined;
  inventory: StoredInventory | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const kwData = keywordData?.find((kw) => kw.keyword === keyword);

  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [expanded]);

  const invLookup = useMemo(() => {
    if (!inventory) return null;
    const map = new Map<number, number>();
    for (const item of inventory.items) {
      map.set(item.typeId, item.quantity);
    }
    return map;
  }, [inventory]);

  const items = useMemo(() => {
    if (!kwData) return null;
    return kwData.items
      .map((item) => ({
        ...item,
        quantity: invLookup?.get(parseInt(item.id, 10)) ?? 0,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [kwData, invLookup]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded hover:bg-purple-800/50 cursor-pointer"
      >
        {keyword}
      </button>
      {expanded && items && (
        <div className="absolute z-10 mt-1 left-0 bg-gray-700 border border-gray-600 rounded-lg p-2 shadow-lg min-w-48">
          <ul className="space-y-1 text-xs">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <Link to={`/items/${item.id}`} className="text-blue-400 hover:text-blue-300 truncate">
                  {item.name}
                </Link>
                {item.quantity > 0 && (
                  <span className="text-green-400 whitespace-nowrap">{item.quantity}x</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
