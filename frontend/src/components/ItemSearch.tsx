import { useState } from 'react'

export function ItemSearch() {
  const [query, setQuery] = useState('')

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items by name..."
        className="w-full max-w-md px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:border-amber-500"
      />
      <p className="text-gray-500 italic">
        Item browser will load data from the API.
      </p>
    </div>
  )
}
