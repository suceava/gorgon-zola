import { useRef } from 'react';
import type { StoredInventory, StoredCharacter } from '../types/character';

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
      const raw = JSON.parse(reader.result as string);
      const itemMap = new Map<number, { name: string; quantity: number; value: number }>();
      for (const item of raw.Items) {
        const existing = itemMap.get(item.TypeID);
        if (existing) {
          existing.quantity += item.StackSize;
        } else {
          itemMap.set(item.TypeID, { name: item.Name, quantity: item.StackSize, value: item.Value });
        }
      }
      onInventoryUpload({
        character: raw.Character,
        server: raw.ServerName,
        timestamp: raw.Timestamp,
        items: Array.from(itemMap.entries()).map(([typeId, data]) => ({
          typeId,
          quantity: data.quantity,
          value: data.value,
          name: data.name,
        })),
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCharacterFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = JSON.parse(reader.result as string);
      const skills: Record<string, number> = {};
      for (const [name, data] of Object.entries(raw.Skills)) {
        skills[name] = (data as { Level: number }).Level;
      }
      onCharacterUpload({
        character: raw.Character,
        server: raw.ServerName,
        timestamp: raw.Timestamp,
        skills,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasData = inventory && character;

  if (hasData) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-gray-300">
          <span className="font-semibold text-white">{character.character}</span> on {character.server}
          <span className="mx-2 text-gray-600">|</span>
          <span>{inventory.items.length} unique items</span>
          <span className="mx-2 text-gray-600">|</span>
          <span>{Object.keys(character.skills).length} skills</span>
          <span className="mx-2 text-gray-600">|</span>
          <span className="text-gray-500">
            Exported {new Date(inventory.timestamp).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2">
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
