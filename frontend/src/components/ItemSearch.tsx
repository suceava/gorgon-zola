import { useEffect, useState } from 'react';
import { useItems } from '../api/hooks';

export function ItemSearch() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

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
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg border border-gray-700"
            >
              <div>
                <span className="text-gray-100 font-medium">{item.name}</span>
                {item.isCrafted && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-900/50 text-amber-400 rounded">Crafted</span>
                )}
              </div>
              <span className="text-gray-400 text-sm">{item.value.toLocaleString()} councils</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
