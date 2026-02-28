import { Link } from 'react-router-dom';
import type { Item } from '../types/items';

export function ItemDetail({ item }: { item: Item }) {
  return (
    <div className="px-4 py-3 bg-gray-700 rounded-b-lg border border-t-0 border-gray-600 space-y-2 text-sm">
      {item.description && <p className="text-gray-300">{item.description}</p>}

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-400">
        {item.maxStackSize && <span>Stack: {item.maxStackSize}</span>}
        {item.isCrafted && item.craftingTargetLevel && (
          <span>Craft level: {item.craftingTargetLevel}</span>
        )}
        {item.craftPoints && <span>Craft XP: {item.craftPoints}</span>}
        {item.keywords && item.keywords.length > 0 && (
          <span>{item.keywords.join(', ')}</span>
        )}
      </div>

      <Link
        to={`/items/${item.id}`}
        className="inline-block text-amber-400 hover:text-amber-300 transition-colors"
      >
        View full details
      </Link>
    </div>
  );
}
