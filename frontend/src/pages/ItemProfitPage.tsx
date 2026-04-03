import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useItem, useKeywords, useRecipes } from '../api/hooks';
import { ProfitabilityResults } from '../components/ProfitabilityResults';
import { buildProducerIndex, calcProfit, loadInventory, loadCharacter } from '../lib/crafting';
import type { StoredInventory, StoredCharacter } from '../types/character';
import type { Recipe } from '../types/recipes';

export function ItemProfitPage() {
  const { id } = useParams<{ id: string }>();
  const { data: item, isLoading: itemLoading } = useItem(id!);
  const { data: allRecipes, isLoading: recipesLoading } = useRecipes();
  const [inventory] = useState<StoredInventory | null>(() => loadInventory());
  const [character] = useState<StoredCharacter | null>(() => loadCharacter());

  const filteredRecipes = useMemo(() => {
    if (!allRecipes || !item) return [];
    const recipeIds = new Set(item.recipes?.map((r) => r.recipeId) ?? []);
    return allRecipes.filter((recipe) => recipeIds.has(recipe.id));
  }, [allRecipes, item]);

  // Collect unique keywords from generic ingredients across filtered recipes
  const keywords = useMemo(() => {
    const kws = new Set<string>();
    for (const recipe of filteredRecipes) {
      for (const gen of recipe.genericIngredients) {
        for (const kw of gen.itemKeys) kws.add(kw);
      }
    }
    return Array.from(kws);
  }, [filteredRecipes]);

  const producerIndex = useMemo(() => allRecipes ? buildProducerIndex(allRecipes) : undefined, [allRecipes]);

  const { data: keywordData } = useKeywords(keywords);
  const keywordMap = useMemo(() => {
    if (!keywordData) return undefined;
    const map = new Map<string, string[]>();
    for (const kw of keywordData) map.set(kw.keyword, kw.items.map((i) => i.id));
    return map;
  }, [keywordData]);

  if (itemLoading) return <p className="text-gray-400">Loading...</p>;
  if (!item) return <p className="text-gray-500">Item not found.</p>;

  const hasData = inventory && character;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-sm text-gray-400">
          <Link to={`/items/${item.id}`} className="text-blue-400 hover:text-blue-300">
            {item.name}
          </Link>
          {' > Recipes Using This Item'}
        </div>
        <h1 className="text-2xl font-bold">Recipes Using {item.name}</h1>
        <div className="flex items-center gap-3 text-lg">
          <span className="text-amber-400 font-semibold">{item.value.toLocaleString()}c</span>
          {(() => {
            const owned = inventory?.items.find((i) => String(i.typeId) === id)?.quantity;
            return owned != null ? (
              <>
                <span className="text-gray-500">·</span>
                <span className="text-green-400">{owned}x owned</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-300">{(item.value * owned).toLocaleString()}c total</span>
              </>
            ) : null;
          })()}
        </div>
      </div>

      {hasData ? (
        <ProfitabilityResults
          inventory={inventory}
          character={character}
          recipes={filteredRecipes}
          recipesLoading={recipesLoading}
          keywordMap={keywordMap}
          producerIndex={producerIndex}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            <Link to="/crafting" className="text-blue-400 hover:text-blue-300">
              Upload character data
            </Link>
            {' to see ingredient availability and filters.'}
          </p>
          <SimpleProfitTable recipes={filteredRecipes} loading={recipesLoading} />
        </div>
      )}
    </div>
  );
}

function SimpleProfitTable({ recipes, loading }: { recipes: Recipe[]; loading: boolean }) {
  if (loading) return <p className="text-gray-400">Loading recipes...</p>;
  if (recipes.length === 0) return <p className="text-gray-500 italic">No recipes use this item.</p>;

  const rows = recipes
    .map((recipe) => ({ recipe, ...calcProfit(recipe) }))
    .sort((a, b) => b.profit - a.profit);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-left">
            <th className="px-3 py-2 text-gray-400">Recipe</th>
            <th className="px-3 py-2 text-gray-400">Skill</th>
            <th className="px-3 py-2 text-gray-400 text-right">Cost</th>
            <th className="px-3 py-2 text-gray-400 text-right">Value</th>
            <th className="px-3 py-2 text-gray-400 text-right">Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.recipe.id} className="border-b border-gray-800 hover:bg-gray-800/50">
              <td className="px-3 py-2">
                <Link to={`/recipes/${r.recipe.id}`} className="text-amber-400 hover:text-amber-300">
                  {r.recipe.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-gray-400">
                {r.recipe.skill} {r.recipe.skillLevelReq}
              </td>
              <td className="px-3 py-2 font-mono text-right text-gray-400">
                {Math.round(r.ingredientCost).toLocaleString()}
              </td>
              <td className="px-3 py-2 font-mono text-right text-gray-400">
                {Math.round(r.resultValue).toLocaleString()}
              </td>
              <td
                className={`px-3 py-2 font-mono text-right ${
                  r.profit > 0 ? 'text-green-400' : r.profit < 0 ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                {r.profit > 0 ? '+' : ''}{Math.round(r.profit).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
