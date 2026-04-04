import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../api/hooks';
import { ProfitabilityResults } from '../components/ProfitabilityResults';
import { buildProducerIndex, loadInventory, loadCharacter } from '../lib/crafting';

export function Crafting() {
  const [inventory] = useState(() => loadInventory());
  const [character] = useState(() => loadCharacter());
  const { data: recipes, isLoading: recipesLoading } = useRecipes();
  const producerIndex = useMemo(() => recipes ? buildProducerIndex(recipes) : undefined, [recipes]);

  const hasData = inventory && character;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crafting Profitability</h1>
        <p className="text-sm text-gray-400 mt-1">
          Find the most profitable recipes you can craft with your current inventory.
        </p>
      </div>

      {!hasData && (
        <p className="text-gray-400">
          No game data loaded.{' '}
          <Link to="/inventory" className="text-blue-400 hover:text-blue-300">
            Upload your game exports
          </Link>
          {' '}to get started.
        </p>
      )}

      {hasData && (
        <ProfitabilityResults
          inventory={inventory}
          character={character}
          recipes={recipes ?? []}
          recipesLoading={recipesLoading}
          producerIndex={producerIndex}
        />
      )}
    </div>
  );
}
