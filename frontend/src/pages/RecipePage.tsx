import { Link, useParams } from 'react-router-dom';
import { useRecipe } from '../api/hooks';

export function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading, error } = useRecipe(id!);

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-400">Failed to load recipe: {(error as Error).message}</p>;
  if (!recipe) return <p className="text-gray-500">Recipe not found.</p>;

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

      {/* Ingredients */}
      {(recipe.ingredients.length > 0 || recipe.genericIngredients.length > 0) && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <ul className="space-y-2 text-sm">
            {recipe.ingredients.map((ing) => (
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
              </li>
            ))}
            {recipe.genericIngredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-gray-400">{ing.stackSize}x</span>
                <span className="text-gray-300">{ing.desc}</span>
                <span className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                  {ing.itemKeys.join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Results */}
      {recipe.results.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Results</h2>
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
    </div>
  );
}
