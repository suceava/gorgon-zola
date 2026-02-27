export function CraftingResults() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold">Craftable Items</h2>
      <p className="text-sm text-gray-400">Recipes you can craft with your current inventory, ranked by profit.</p>
      <p className="text-gray-500 italic">Add items to your inventory to see what you can craft.</p>
    </div>
  );
}
