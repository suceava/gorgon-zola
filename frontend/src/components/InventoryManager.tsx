import { useState, useEffect } from 'react'

interface InventoryItem {
  itemId: string
  name: string
  quantity: number
}

const STORAGE_KEY = 'gorgon-zola-inventory'

function loadInventory(): InventoryItem[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : []
}

function saveInventory(items: InventoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function InventoryManager() {
  const [inventory, setInventory] = useState<InventoryItem[]>(loadInventory)

  useEffect(() => {
    saveInventory(inventory)
  }, [inventory])

  const removeItem = (itemId: string) => {
    setInventory((prev) => prev.filter((i) => i.itemId !== itemId))
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold">My Inventory</h2>
      <p className="text-sm text-gray-400">
        Add items you have available for crafting.
      </p>

      {inventory.length === 0 ? (
        <p className="text-gray-500 italic">No items added yet.</p>
      ) : (
        <ul className="space-y-2">
          {inventory.map((item) => (
            <li key={item.itemId} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2">
              <span>{item.name} x{item.quantity}</span>
              <button
                onClick={() => removeItem(item.itemId)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
