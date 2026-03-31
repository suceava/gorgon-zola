import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useItems } from '../api/hooks';
import { loadInventory } from '../lib/crafting';

export function ItemSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);

  const [inventory] = useState(() => loadInventory());
  const inventoryMap = inventory
    ? new Map(inventory.items.map((item) => [String(item.typeId), item.quantity]))
    : null;

  const search = submitted.length >= 2 ? submitted : undefined;
  const { data: items, isLoading, error } = useItems(search);

  function handleSubmit() {
    setSubmitted(query);
    if (query) {
      setSearchParams({ q: query }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items by name..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-md font-medium transition-colors"
        >
          Search
        </button>
      </form>

      {isLoading && <p className="text-gray-400">Searching...</p>}

      {error && <p className="text-red-400">Failed to load items: {(error as Error).message}</p>}

      {items && items.length === 0 && <p className="text-gray-500">No items found.</p>}

      {items && items.length > 0 && (
        <div className="space-y-0.5">
          {items.map((item) => {
            const owned = inventoryMap?.get(item.id);
            return (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="flex items-baseline gap-2 py-1 hover:bg-gray-800/50 rounded px-1 transition-colors"
              >
                <span className="text-amber-400 hover:text-amber-300">{item.name}</span>
                <span className="text-xs text-gray-500">{item.value.toLocaleString()}c</span>
                {owned != null && (
                  <span className="text-xs text-gray-500">· {owned}x owned</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
