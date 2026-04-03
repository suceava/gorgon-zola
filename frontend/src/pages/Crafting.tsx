import { useCallback, useMemo, useState } from 'react';
import { useRecipes } from '../api/hooks';
import { CharacterUpload } from '../components/CharacterUpload';
import { ProfitabilityResults } from '../components/ProfitabilityResults';
import { buildProducerIndex, loadInventory, loadCharacter } from '../lib/crafting';
import type { StoredInventory, StoredCharacter } from '../types/character';

const INV_KEY = 'gorgon-zola-game-inventory';
const CHAR_KEY = 'gorgon-zola-game-character';

export function Crafting() {
  const [inventory, setInventory] = useState<StoredInventory | null>(() => loadInventory());
  const [character, setCharacter] = useState<StoredCharacter | null>(() => loadCharacter());
  const { data: recipes, isLoading: recipesLoading } = useRecipes();
  const producerIndex = useMemo(() => recipes ? buildProducerIndex(recipes) : undefined, [recipes]);

  const handleInventoryUpload = useCallback((data: StoredInventory) => {
    localStorage.setItem(INV_KEY, JSON.stringify(data));
    setInventory(data);
  }, []);

  const handleCharacterUpload = useCallback((data: StoredCharacter) => {
    localStorage.setItem(CHAR_KEY, JSON.stringify(data));
    setCharacter(data);
  }, []);

  const hasData = inventory && character;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crafting Profitability</h1>
        <p className="text-sm text-gray-400 mt-1">
          Upload your game exports to find the most profitable recipes you can craft.
        </p>
      </div>

      <CharacterUpload
        inventory={inventory}
        character={character}
        onInventoryUpload={handleInventoryUpload}
        onCharacterUpload={handleCharacterUpload}
      />

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
