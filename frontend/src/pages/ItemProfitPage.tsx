import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useItem, useRecipes } from '../api/hooks';
import { ProfitabilityResults } from '../components/ProfitabilityResults';
import type { StoredInventory, StoredCharacter } from '../types/character';
import type { Recipe } from '../types/recipes';

const INV_KEY = 'gorgon-zola-game-inventory';
const CHAR_KEY = 'gorgon-zola-game-character';

function loadFromStorage<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function ItemProfitPage() {
  const { id } = useParams<{ id: string }>();
  const { data: item, isLoading: itemLoading } = useItem(id!);
  const { data: allRecipes, isLoading: recipesLoading } = useRecipes();
  const [inventory] = useState<StoredInventory | null>(() => loadFromStorage(INV_KEY));
  const [character] = useState<StoredCharacter | null>(() => loadFromStorage(CHAR_KEY));

  const filteredRecipes = useMemo(() => {
    if (!allRecipes || !id) return [];
    return allRecipes.filter((recipe) => {
      const hasSpecific = recipe.ingredients.some((ing) => String(ing.itemId) === id);
      const hasGeneric = recipe.genericIngredients.some((gen) => gen.itemKeys.includes(id));
      return hasSpecific || hasGeneric;
    });
  }, [allRecipes, id]);

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
        <p className="text-sm text-gray-400">{item.value.toLocaleString()} councils</p>
      </div>

      {hasData ? (
        <ProfitabilityResults
          inventory={inventory}
          character={character}
          recipes={filteredRecipes}
          recipesLoading={recipesLoading}
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
    .map((recipe) => {
      let ingredientCost = 0;
      for (const ing of recipe.ingredients) {
        const consume = ing.chanceToConsume ?? 1;
        ingredientCost += ing.value * ing.stackSize * consume;
      }
      let resultValue = 0;
      for (const res of recipe.results) {
        const chance = res.percentChance ?? 1;
        resultValue += res.value * res.stackSize * chance;
      }
      return { recipe, ingredientCost, resultValue, profit: resultValue - ingredientCost };
    })
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
