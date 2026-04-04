import { useRef } from 'react';
import type { StoredInventory, StoredCharacter } from '../types/character';
import { parseRawInventory, parseRawCharacter, saveRawInventory, saveRawCharacter } from '../lib/crafting';

interface Props {
  inventory: StoredInventory | null;
  character: StoredCharacter | null;
  onInventoryUpload: (data: StoredInventory) => void;
  onCharacterUpload: (data: StoredCharacter) => void;
}

export function CharacterUpload({ inventory, character, onInventoryUpload, onCharacterUpload }: Props) {
  const invRef = useRef<HTMLInputElement>(null);
  const charRef = useRef<HTMLInputElement>(null);

  const handleInventoryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      saveRawInventory(text);
      onInventoryUpload(parseRawInventory(JSON.parse(text)));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCharacterFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      saveRawCharacter(text);
      onCharacterUpload(parseRawCharacter(JSON.parse(text)));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasData = inventory && character;

  if (hasData) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Exported {new Date(inventory.timestamp).toLocaleDateString()}
        </span>
        <button
          onClick={() => invRef.current?.click()}
          className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Re-upload Inventory
        </button>
        <button
          onClick={() => charRef.current?.click()}
          className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Re-upload Character
        </button>
        <input ref={invRef} type="file" accept=".json" onChange={handleInventoryFile} className="hidden" />
        <input ref={charRef} type="file" accept=".json" onChange={handleCharacterFile} className="hidden" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UploadCard
        title="Inventory Export"
        description="Upload your storage report JSON (e.g. Lske_Strekios_items_*.json)"
        onFileSelect={handleInventoryFile}
        loaded={!!inventory}
        loadedLabel={inventory ? `${inventory.character} - ${inventory.items.length} items` : undefined}
      />
      <UploadCard
        title="Character Export"
        description="Upload your character sheet JSON (e.g. Character_Lske_Strekios.json)"
        onFileSelect={handleCharacterFile}
        loaded={!!character}
        loadedLabel={character ? `${character.character} - ${Object.keys(character.skills).length} skills` : undefined}
      />
    </div>
  );
}

function UploadCard({ title, description, onFileSelect, loaded, loadedLabel }: {
  title: string;
  description: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loaded: boolean;
  loadedLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`bg-gray-800 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        loaded ? 'border-green-600 bg-green-900/10' : 'border-gray-600 hover:border-amber-500'
      }`}
    >
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-2">{description}</p>
      {loaded && <p className="text-sm text-green-400">{loadedLabel}</p>}
      {!loaded && <p className="text-xs text-gray-500 mt-2">Click to browse</p>}
      <input ref={inputRef} type="file" accept=".json" onChange={onFileSelect} className="hidden" />
    </div>
  );
}
