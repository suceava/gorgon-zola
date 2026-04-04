export interface StoredInventory {
  character: string;
  server: string;
  timestamp: string;
  items: InventoryEntry[];
}

export interface InventoryLocation {
  vault: string;
  quantity: number;
}

export interface InventoryEntry {
  typeId: number;
  quantity: number;
  value: number;
  name: string;
  locations: InventoryLocation[];
}

export interface StoredCharacter {
  character: string;
  server: string;
  timestamp: string;
  skills: Record<string, number>;
}
