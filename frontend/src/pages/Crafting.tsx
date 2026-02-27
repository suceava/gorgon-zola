import { CraftingResults } from '../components/CraftingResults.tsx';
import { InventoryManager } from '../components/InventoryManager.tsx';

export function Crafting() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Crafting Calculator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryManager />
        <CraftingResults />
      </div>
    </div>
  );
}
