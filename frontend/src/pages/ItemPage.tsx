import { useParams } from 'react-router-dom';
import { useItem } from '../api/hooks';
import type { ItemSource } from '../types/items';

export function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const { data: item, isLoading, error } = useItem(id!);

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-400">Failed to load item: {(error as Error).message}</p>;
  if (!item) return <p className="text-gray-500">Item not found.</p>;

  const hasStats = item.maxStackSize || item.craftingTargetLevel || item.craftPoints || item.keywords?.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        {item.description && <p className="text-gray-300">{item.description}</p>}
        <p className="text-gray-400 text-sm">{item.value.toLocaleString()} councils</p>
      </div>

      {/* Stats */}
      {hasStats && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Stats</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400">
            {item.maxStackSize && <span>Stack size: {item.maxStackSize}</span>}
            {item.isCrafted && item.craftingTargetLevel && (
              <span>Craft level: {item.craftingTargetLevel}</span>
            )}
            {item.craftPoints && <span>Craft XP: {item.craftPoints}</span>}
          </div>
          {item.keywords && item.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sources */}
      {item.sources && item.sources.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Sources</h2>
          <ul className="space-y-2 text-sm">
            {item.sources.map((source, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-amber-900/50 text-amber-400 rounded">
                  {source.type}
                </span>
                <span className="text-gray-300">{formatSource(source)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recipes this item is used in */}
      {item.recipes && item.recipes.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Used in Recipes</h2>
          <ul className="space-y-2 text-sm">
            {item.recipes.map((recipe) => (
              <li key={recipe.recipeId} className="text-gray-300">
                <span className="text-gray-100">{recipe.recipeName}</span>
                <span className="text-gray-500 ml-2">({recipe.skill})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatSource(source: ItemSource): string {
  switch (source.type) {
    case 'Vendor':
    case 'Barter':
      return source.npc ?? '';
    case 'Recipe':
      return source.recipeId != null ? `Recipe #${source.recipeId}` : '';
    case 'Quest':
      return source.questId != null ? `Quest #${source.questId}` : '';
    case 'HangOut':
      return source.npc ? `${source.npc} hangout` : '';
    case 'Item':
      return source.itemTypeId != null ? `Item #${source.itemTypeId}` : '';
    case 'Effect':
      return 'Ability effect';
    default:
      return '';
  }
}
