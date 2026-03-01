import { Link } from 'react-router-dom';
import type { Item } from '../types/items';

export function ItemPreview({ item }: { item: Item }) {
  const hasSources = item.sources && item.sources.length > 0;

  return (
    <div className="px-4 py-3 bg-gray-700 rounded-b-lg border border-t-0 border-gray-600 text-sm">
      <div className="space-y-2">
        {item.description && (
          <p className="text-gray-300 line-clamp-2">{item.description}</p>
        )}
        <div className="text-gray-400">
          <span className="text-gray-200">{item.value.toLocaleString()}</span> councils
        </div>
        {hasSources && (
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(item.sources!.map((s) => s.type))].map((type) => (
              <span
                key={type}
                className="text-xs px-1.5 py-0.5 bg-amber-900/50 text-amber-400 rounded"
              >
                {type}
              </span>
            ))}
          </div>
        )}
        <Link
          to={`/items/${item.id}`}
          className="inline-block text-amber-400 hover:text-amber-300 transition-colors"
        >
          View details &rarr;
        </Link>
      </div>
    </div>
  );
}
