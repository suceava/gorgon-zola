import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItems } from '../api/hooks';
import { ItemPreview } from './ItemPreview';

export function ItemSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                {expanded && <ItemPreview item={item} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
