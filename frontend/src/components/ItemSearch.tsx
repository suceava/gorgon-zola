import { useEffect, useState } from 'react';
import { useItems } from '../api/hooks';
import { ItemDetail } from './ItemDetail';

export function ItemSearch() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const search = debounced.length >= 2 ? debounced : undefined;
  const { data: items, isLoading, error } = useItems(search);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items by name..."
        className="w-full max-w-md px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:border-amber-500"
      />

      {debounced.length > 0 && debounced.length < 2 && (
        <p className="text-gray-500 text-sm">Type at least 2 characters to search.</p>
      )}

      {isLoading && <p className="text-gray-400">Searching...</p>}

      {error && <p className="text-red-400">Failed to load items: {(error as Error).message}</p>}

      {items && items.length === 0 && <p className="text-gray-500">No items found.</p>}

      {items && items.length > 0 && (
        <div className="grid gap-2">
          {items.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-700 text-left cursor-pointer transition-colors hover:border-gray-600 ${expanded ? 'rounded-t-lg' : 'rounded-lg'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-gray-500 text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
                    <span className="text-gray-100 font-medium">{item.name}</span>
                    {item.isCrafted && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-900/50 text-amber-400 rounded">Crafted</span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">{item.value.toLocaleString()} councils</span>
                </button>
                {expanded && <ItemDetail item={item} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
