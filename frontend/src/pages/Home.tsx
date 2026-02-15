import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-amber-400">Gorgon Zola</h1>
      <p className="text-gray-300 max-w-2xl">
        Crafting profitability tool for Project: Gorgon. Enter the items you have,
        and find the most profitable things you can craft with them.
      </p>
      <div className="flex gap-4">
        <Link
          to="/crafting"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-md font-medium transition-colors"
        >
          Start Crafting
        </Link>
        <Link
          to="/items"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors"
        >
          Browse Items
        </Link>
      </div>
    </div>
  )
}
