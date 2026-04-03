import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Keyword } from '../api/hooks';
import type { InventoryMap, ProducerIndex } from '../lib/crafting';
import type { StoredInventory } from '../types/character';
import type { Recipe } from '../types/recipes';

interface Props {
  recipe: Recipe;
  inventoryMap: InventoryMap | null;
  producerIndex: ProducerIndex | null;
  keywordMap: Map<string, string[]> | null;
  keywordData?: Keyword[];
  inventory: StoredInventory | null;
}

export function CraftingTree({ recipe, inventoryMap, producerIndex, keywordMap, keywordData, inventory }: Props) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <h2 className="text-lg font-semibold">Ingredients</h2>
      <div className="text-sm">
        <IngredientList
          recipe={recipe}
          inventoryMap={inventoryMap}
          producerIndex={producerIndex}
          keywordMap={keywordMap}
          keywordData={keywordData}
          inventory={inventory}
          depth={0}
          visited={new Set()}
        />
      </div>
    </div>
  );
}

function IngredientList({
  recipe,
  inventoryMap,
  producerIndex,
  keywordMap,
  keywordData,
  inventory,
  depth,
  visited,
}: {
  recipe: Recipe;
  inventoryMap: InventoryMap | null;
  producerIndex: ProducerIndex | null;
  keywordMap: Map<string, string[]> | null;
  keywordData?: Keyword[];
  inventory: StoredInventory | null;
  depth: number;
  visited: Set<string>;
}) {
  return (
    <ul className={`space-y-1 ${depth > 0 ? 'ml-4 border-l border-gray-700 pl-3' : ''}`}>
      {recipe.ingredients.map((ing) => (
        <IngredientNode
          key={ing.itemId}
          itemId={ing.itemId}
          name={ing.itemName}
          stackSize={ing.stackSize}
          value={ing.value}
          chanceToConsume={ing.chanceToConsume}
          inventoryMap={inventoryMap}
          producerIndex={producerIndex}
          keywordMap={keywordMap}
          keywordData={keywordData}
          inventory={inventory}
          depth={depth}
          visited={visited}
        />
      ))}
      {recipe.genericIngredients.map((gen, i) => (
        <GenericIngredientNode
          key={i}
          desc={gen.desc}
          itemKeys={gen.itemKeys}
          stackSize={gen.stackSize}
          inventoryMap={inventoryMap}
          keywordMap={keywordMap}
          keywordData={keywordData}
          inventory={inventory}
        />
      ))}
    </ul>
  );
}

function IngredientNode({
  itemId,
  name,
  stackSize,
  value,
  chanceToConsume,
  inventoryMap,
  producerIndex,
  keywordMap,
  keywordData,
  inventory,
  depth,
  visited,
}: {
  itemId: number;
  name: string;
  stackSize: number;
  value: number;
  chanceToConsume?: number;
  inventoryMap: InventoryMap | null;
  producerIndex: ProducerIndex | null;
  keywordMap: Map<string, string[]> | null;
  keywordData?: Keyword[];
  inventory: StoredInventory | null;
  depth: number;
  visited: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const owned = inventoryMap?.get(itemId)?.quantity ?? 0;
  const hasEnough = owned >= stackSize;

  const subRecipe = producerIndex && depth < 5 && !visited.has(String(itemId))
    ? producerIndex.get(itemId)?.[0] ?? null
    : null;

  const newVisited = new Set(visited);
  newVisited.add(String(itemId));

  return (
    <li>
      <div className="flex items-center gap-2 py-0.5">
        {subRecipe ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 text-xs w-4"
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="text-gray-400">{stackSize}x</span>
        <Link to={`/items/${itemId}`} className="text-blue-400 hover:text-blue-300">
          {name}
        </Link>
        <span className="text-gray-500 text-xs">
          ({stackSize > 1 ? `${value.toLocaleString()}c x ${stackSize} = ${(value * stackSize).toLocaleString()}c` : `${value.toLocaleString()}c`})
        </span>
        {chanceToConsume != null && chanceToConsume < 1 && (
          <span className="text-xs text-gray-500">
            {Math.round(chanceToConsume * 100)}% consumed
          </span>
        )}
        {inventoryMap && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            hasEnough ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {owned} owned
          </span>
        )}
        {subRecipe && !hasEnough && !expanded && (
          <span className="text-xs text-amber-400">
            craft via {subRecipe.name}
          </span>
        )}
      </div>
      {expanded && subRecipe && (
        <IngredientList
          recipe={subRecipe}
          inventoryMap={inventoryMap}
          producerIndex={producerIndex}
          keywordMap={keywordMap}
          keywordData={keywordData}
          inventory={inventory}
          depth={depth + 1}
          visited={newVisited}
        />
      )}
    </li>
  );
}

function GenericIngredientNode({
  desc,
  itemKeys,
  stackSize,
  inventoryMap,
  keywordMap,
  keywordData,
  inventory,
}: {
  desc: string;
  itemKeys: string[];
  stackSize: number;
  inventoryMap: InventoryMap | null;
  keywordMap: Map<string, string[]> | null;
  keywordData?: Keyword[];
  inventory: StoredInventory | null;
}) {
  let totalOwned = 0;
  if (inventoryMap && keywordMap) {
    for (const kw of itemKeys) {
      for (const id of keywordMap.get(kw) ?? []) {
        totalOwned += inventoryMap.get(parseInt(id, 10))?.quantity ?? 0;
      }
    }
  }

  return (
    <li>
      <div className="flex items-center gap-2 py-0.5">
        <span className="w-4" />
        <span className="text-gray-400">{stackSize}x</span>
        <span className="text-gray-300">{desc}</span>
        {itemKeys.map((kw) => (
          <KeywordTag key={kw} keyword={kw} keywordData={keywordData} inventory={inventory} />
        ))}
        {inventoryMap && keywordMap && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            totalOwned >= stackSize ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {totalOwned} owned
          </span>
        )}
      </div>
    </li>
  );
}

function KeywordTag({
  keyword,
  keywordData,
  inventory,
}: {
  keyword: string;
  keywordData: Keyword[] | undefined;
  inventory: StoredInventory | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const kwData = keywordData?.find((kw) => kw.keyword === keyword);

  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [expanded]);

  const invLookup = useMemo(() => {
    if (!inventory) return null;
    const map = new Map<number, number>();
    for (const item of inventory.items) {
      map.set(item.typeId, item.quantity);
    }
    return map;
  }, [inventory]);

  const items = useMemo(() => {
    if (!kwData) return null;
    return kwData.items
      .map((item) => ({
        ...item,
        quantity: invLookup?.get(parseInt(item.id, 10)) ?? 0,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [kwData, invLookup]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded hover:bg-purple-800/50 cursor-pointer"
      >
        {keyword}
      </button>
      {expanded && items && (
        <div className="absolute z-10 mt-1 left-0 bg-gray-700 border border-gray-600 rounded-lg p-2 shadow-lg min-w-48">
          <ul className="space-y-1 text-xs">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <Link to={`/items/${item.id}`} className="text-blue-400 hover:text-blue-300 truncate">
                  {item.name}
                </Link>
                {item.quantity > 0 && (
                  <span className="text-green-400 whitespace-nowrap">{item.quantity}x</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
