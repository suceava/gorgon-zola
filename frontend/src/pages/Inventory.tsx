import { useCallback, useMemo, useState } from 'react';
import { loadInventory, loadCharacter } from '../lib/crafting';
import { CharacterUpload } from '../components/CharacterUpload';
import type { InventoryEntry, StoredInventory, StoredCharacter } from '../types/character';

type SortField = 'name' | 'quantity' | 'value' | 'total' | 'location';

function formatVault(vault: string): string {
  if (vault.startsWith('*AccountStorage_')) return 'Account: ' + vault.slice(16);
  if (vault.startsWith('NPC_')) return vault.slice(4);
  return vault.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function sortItems(items: InventoryEntry[], sortField: SortField, sortAsc: boolean): InventoryEntry[] {
  return [...items].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'quantity': cmp = a.quantity - b.quantity; break;
      case 'value': cmp = a.value - b.value; break;
      case 'total': cmp = (a.value * a.quantity) - (b.value * b.quantity); break;
      case 'location': {
        const aLoc = formatVault(a.locations[0]?.vault ?? '');
        const bLoc = formatVault(b.locations[0]?.vault ?? '');
        cmp = aLoc.localeCompare(bLoc);
        break;
      }
    }
    return sortAsc ? cmp : -cmp;
  });
}

export function Inventory() {
  const [inventory, setInventory] = useState<StoredInventory | null>(() => loadInventory());
  const [character, setCharacter] = useState<StoredCharacter | null>(() => loadCharacter());
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState('');
  const [groupByVault, setGroupByVault] = useState(() => localStorage.getItem('gorgon-zola-group-by-vault') === 'true');
  const [collapsedVaults, setCollapsedVaults] = useState<Set<string>>(new Set());

  const handleInventoryUpload = useCallback((data: StoredInventory) => {
    setInventory(data);
  }, []);

  const handleCharacterUpload = useCallback((data: StoredCharacter) => {
    setCharacter(data);
  }, []);

  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    const needle = search.toLowerCase();
    return inventory.items.filter((item) => !needle || item.name.toLowerCase().includes(needle));
  }, [inventory, search]);

  const sortedItems = useMemo(() => sortItems(filteredItems, sortField, sortAsc), [filteredItems, sortField, sortAsc]);

  const groupedItems = useMemo(() => {
    if (!groupByVault) return null;
    const groups = new Map<string, InventoryEntry[]>();
    for (const item of filteredItems) {
      for (const loc of item.locations) {
        const list = groups.get(loc.vault) ?? [];
        list.push({ ...item, quantity: loc.quantity, locations: [loc] });
        groups.set(loc.vault, list);
      }
    }
    const sorted = new Map<string, InventoryEntry[]>();
    for (const [vault, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      sorted.set(vault, sortItems(items, sortField, sortAsc));
    }
    return sorted;
  }, [filteredItems, groupByVault, sortField, sortAsc]);

  const totalValue = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.value * item.quantity, 0);
  }, [filteredItems]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const headerRow = (
    <thead>
      <tr className="border-b border-gray-700 text-left bg-gray-800">
        <SortHeader field="name" current={sortField} asc={sortAsc} onClick={handleSort} align="left">
          Item
        </SortHeader>
        {!groupByVault && (
          <SortHeader field="location" current={sortField} asc={sortAsc} onClick={handleSort} align="left">
            Location
          </SortHeader>
        )}
        <SortHeader field="quantity" current={sortField} asc={sortAsc} onClick={handleSort}>
          Qty
        </SortHeader>
        <SortHeader field="value" current={sortField} asc={sortAsc} onClick={handleSort}>
          Value
        </SortHeader>
        <SortHeader field="total" current={sortField} asc={sortAsc} onClick={handleSort}>
          Total
        </SortHeader>
      </tr>
    </thead>
  );

  function renderRow(item: InventoryEntry, showLocation: boolean) {
    return (
      <tr key={`${item.typeId}-${item.locations[0]?.vault ?? ''}`} className="border-b border-gray-800 hover:bg-gray-800/50">
        <td className="px-3 py-2">
          <a href={`/items/${item.typeId}`} className="text-amber-400 hover:text-amber-300">
            {item.name}
          </a>
        </td>
        {showLocation && (
          <td className="px-3 py-2 text-gray-400 text-xs">
            {item.locations.map((loc) => formatVault(loc.vault)).join(', ')}
          </td>
        )}
        <td className="px-3 py-2 font-mono text-right text-gray-300">{item.quantity}</td>
        <td className="px-3 py-2 font-mono text-right text-gray-400">{item.value.toLocaleString()}c</td>
        <td className="px-3 py-2 font-mono text-right text-gray-300">{(item.value * item.quantity).toLocaleString()}c</td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Inventory</h1>
          {inventory ? (
            <div className="flex items-center gap-3 text-lg mt-1">
              <span className="text-gray-300 font-semibold">{inventory.character}</span>
              <span className="text-gray-500">·</span>
              <span className="text-green-400">{filteredItems.length} items</span>
              <span className="text-gray-500">·</span>
              <span className="text-amber-400 font-semibold">{totalValue.toLocaleString()}c</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-1">Upload your game exports to view your inventory.</p>
          )}
        </div>
        <CharacterUpload
          inventory={inventory}
          character={character}
          onInventoryUpload={handleInventoryUpload}
          onCharacterUpload={handleCharacterUpload}
        />
      </div>

      {inventory && (
        <>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={groupByVault}
                onChange={(e) => {
              setGroupByVault(e.target.checked);
              localStorage.setItem('gorgon-zola-group-by-vault', String(e.target.checked));
            }}
                className="accent-amber-500"
              />
              Group by vault
            </label>
          </div>

          <div className="overflow-x-auto">
            {groupByVault && groupedItems ? (
              [...groupedItems.entries()].map(([vault, items]) => {
                const collapsed = collapsedVaults.has(vault);
                const vaultTotal = items.reduce((s, i) => s + i.value * i.quantity, 0);
                return (
                  <div key={vault} className="mb-4">
                    <button
                      onClick={() => setCollapsedVaults((prev) => {
                        const next = new Set(prev);
                        if (collapsed) { next.delete(vault); } else { next.add(vault); }
                        return next;
                      })}
                      className="w-full flex items-center gap-3 border-b-2 border-amber-600 px-2 py-3 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      <span className="text-amber-400 text-sm">{collapsed ? '▸' : '▾'}</span>
                      <span className="text-lg font-bold text-white">{formatVault(vault)}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-green-400">{items.length} items</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-amber-400 font-semibold">{vaultTotal.toLocaleString()}c</span>
                    </button>
                    {!collapsed && (
                      <table className="w-full text-sm table-fixed mt-1">
                        <colgroup>
                          <col />
                          <col className="w-24" />
                          <col className="w-28" />
                          <col className="w-32" />
                        </colgroup>
                        {headerRow}
                        <tbody>
                          {items.map((item) => renderRow(item, false))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })
            ) : (
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col />
                  <col className="w-48" />
                  <col className="w-24" />
                  <col className="w-28" />
                  <col className="w-32" />
                </colgroup>
                {headerRow}
                <tbody>
                  {sortedItems.map((item) => renderRow(item, true))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SortHeader({
  field,
  current,
  asc,
  onClick,
  children,
  align = 'right',
}: {
  field: SortField;
  current: SortField;
  asc: boolean;
  onClick: (field: SortField) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const active = field === current;
  return (
    <th
      className={`px-3 py-2 text-gray-300 font-semibold cursor-pointer hover:text-white select-none ${align === 'left' ? 'text-left' : 'text-right'}`}
      onClick={() => onClick(field)}
    >
      {children} {active ? (asc ? '\u2191' : '\u2193') : ''}
    </th>
  );
}
