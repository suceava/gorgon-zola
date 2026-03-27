import { Link, useParams } from 'react-router-dom';
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
                <SourceLabel source={source} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recipes this item is used in */}
      {item.recipes && item.recipes.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Used in Recipes</h2>
            <Link
              to={`/items/${item.id}/profit`}
              className="text-sm text-amber-400 hover:text-amber-300"
            >
              View Profitability
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-2 font-medium">Recipe</th>
                <th className="pb-2 font-medium">Skill</th>
                <th className="pb-2 font-medium text-right">Level</th>
              </tr>
            </thead>
            <tbody>
              {[...item.recipes]
                .sort((a, b) => a.recipeName.localeCompare(b.recipeName))
                .map((recipe) => (
                  <tr key={recipe.recipeId} className="border-b border-gray-700/50">
                    <td className="py-1.5">
                      <Link to={`/recipes/${recipe.recipeId}`} className="text-blue-400 hover:text-blue-300">
                        {recipe.recipeName}
                      </Link>
                      {recipe.matchedKeyword && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                          {recipe.matchedKeyword}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-gray-400">{recipe.skill}</td>
                    <td className="py-1.5 text-right text-gray-300">{recipe.skillLevelReq}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SourceLabel({ source }: { source: ItemSource }) {
  switch (source.type) {
    case 'Vendor':
    case 'Barter':
      return <span className="text-gray-300">{source.npc ?? ''}</span>;
    case 'Recipe':
      return source.recipeId != null ? (
        <Link to={`/recipes/${source.recipeId}`} className="text-blue-400 hover:text-blue-300">
          {source.name ?? `Recipe #${source.recipeId}`}
        </Link>
      ) : null;
    case 'Quest':
      return <span className="text-gray-300">{source.name ?? `Quest #${source.questId}`}</span>;
    case 'HangOut':
      return <span className="text-gray-300">{source.npc ? `${source.npc} hangout` : ''}</span>;
    case 'Item':
      return source.itemTypeId != null ? (
        <Link to={`/items/${source.itemTypeId}`} className="text-blue-400 hover:text-blue-300">
          {source.name ?? `Item #${source.itemTypeId}`}
        </Link>
      ) : null;
    case 'Effect':
      return <span className="text-gray-300">Ability effect</span>;
    default:
      return null;
  }
}
