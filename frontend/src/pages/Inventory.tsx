import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadInventory } from '../lib/crafting';

type SortField = 'name' | 'quantity' | 'value' | 'total';

export function Inventory() {
  const [inventory] = useState(() => loadInventory());
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState('');

  const sortedItems = useMemo(() => {
    if (!inventory) return [];
    const needle = search.toLowerCase();
    return [...inventory.items].filter((item) => !needle || item.name.toLowerCase().includes(needle)).sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'quantity': cmp = a.quantity - b.quantity; break;
        case 'value': cmp = a.value - b.value; break;
        case 'total': cmp = (a.value * a.quantity) - (b.value * b.quantity); break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [inventory, sortField, sortAsc, search]);

  const totalValue = useMemo(() => {
    return sortedItems.reduce((sum, item) => sum + item.value * item.quantity, 0);
  }, [sortedItems]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (!inventory) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Inventory</h1>
        <p className="text-gray-400">
          No inventory loaded.{' '}
          <Link to="/crafting" className="text-blue-400 hover:text-blue-300">
            Upload your game data
          </Link>
          {' '}to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Inventory</h1>
        <p className="text-sm text-gray-400 mt-1">
          {inventory.character} · {sortedItems.length} items · {totalValue.toLocaleString()}c total
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search inventory..."
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-32" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-700 text-left bg-gray-800">
              <SortHeader field="name" current={sortField} asc={sortAsc} onClick={handleSort} align="left">
                Item
              </SortHeader>
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
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.typeId} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-3 py-2">
                  <Link to={`/items/${item.typeId}`} className="text-amber-400 hover:text-amber-300">
                    {item.name}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-right text-gray-300">{item.quantity}</td>
                <td className="px-3 py-2 font-mono text-right text-gray-400">{item.value.toLocaleString()}c</td>
                <td className="px-3 py-2 font-mono text-right text-gray-300">{(item.value * item.quantity).toLocaleString()}c</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
