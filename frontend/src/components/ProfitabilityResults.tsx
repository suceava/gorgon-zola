import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeRecipe, buildInventoryMap, formatCouncils } from '../lib/crafting';
import type { Recipe } from '../types/recipes';
import type { StoredInventory, StoredCharacter } from '../types/character';

interface Props {
  inventory: StoredInventory;
  character: StoredCharacter;
  recipes: Recipe[];
  recipesLoading: boolean;
}


type SortField = 'profit' | 'totalProfit' | 'name' | 'skill';
type Filter = 'all' | 'craftable' | 'profitable';

const FILTER_KEY = 'gorgon-zola-craft-filters';

interface FilterState {
  sortField: SortField;
  sortAsc: boolean;
  filter: Filter;
  skillFilter: string;
  mySkillsOnly: boolean;
}

function loadFilters(): FilterState {
  const raw = localStorage.getItem(FILTER_KEY);
  if (!raw) return { sortField: 'profit', sortAsc: false, filter: 'craftable', skillFilter: '', mySkillsOnly: true };
  return { mySkillsOnly: true, ...JSON.parse(raw) };
}

function saveFilters(state: FilterState) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(state));
}

export function ProfitabilityResults({ inventory, character, recipes, recipesLoading }: Props) {
  const [sortField, setSortField] = useState<SortField>(() => loadFilters().sortField);
  const [sortAsc, setSortAsc] = useState(() => loadFilters().sortAsc);
  const [filter, setFilter] = useState<Filter>(() => loadFilters().filter);
  const [skillFilter, setSkillFilter] = useState(() => loadFilters().skillFilter);
  const [mySkillsOnly, setMySkillsOnly] = useState(() => loadFilters().mySkillsOnly);

  useEffect(() => {
    saveFilters({ sortField, sortAsc, filter, skillFilter, mySkillsOnly });
  }, [sortField, sortAsc, filter, skillFilter, mySkillsOnly]);

  const inventoryMap = useMemo(() => buildInventoryMap(inventory), [inventory]);

  const craftableRecipes = useMemo(() => {
    return recipes
      .filter((recipe) => {
        if (recipe.results.length === 0) return false;
        if (!mySkillsOnly) return true;
        const userLevel = character.skills[recipe.skill];
        return userLevel !== undefined && userLevel >= recipe.skillLevelReq;
      })
      .map((recipe) => analyzeRecipe(recipe, inventoryMap, character.skills));
  }, [recipes, character, inventoryMap, mySkillsOnly]);

  const availableSkills = useMemo(() => {
    const skills = new Set(craftableRecipes.map((r) => r.recipe.skill));
    return Array.from(skills).sort();
  }, [craftableRecipes]);

  const displayedRecipes = useMemo(() => {
    let filtered = craftableRecipes;

    if (filter === 'craftable') {
      filtered = filtered.filter((r) => r.hasAllIngredients);
    } else if (filter === 'profitable') {
      filtered = filtered.filter((r) => r.profit > 0);
    }

    if (skillFilter) {
      filtered = filtered.filter((r) => r.recipe.skill === skillFilter);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'profit':
          cmp = a.profit - b.profit;
          break;
        case 'totalProfit':
          cmp = a.totalProfit - b.totalProfit;
          break;
        case 'name':
          cmp = a.recipe.name.localeCompare(b.recipe.name);
          break;
        case 'skill':
          cmp = a.recipe.skill.localeCompare(b.recipe.skill) || a.recipe.skillLevelReq - b.recipe.skillLevelReq;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [craftableRecipes, filter, skillFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (recipesLoading) {
    return <p className="text-gray-400">Loading recipes...</p>;
  }

  const totalCraftable = craftableRecipes.filter((r) => r.hasAllIngredients).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {(['profitable', 'craftable', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                filter === f ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f === 'profitable' ? 'Profitable' : f === 'craftable' ? 'Have Ingredients' : 'All Recipes'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMySkillsOnly(!mySkillsOnly)}
          className={`px-3 py-1 text-sm rounded transition-colors border ${
            mySkillsOnly
              ? 'border-amber-600 text-amber-400 bg-amber-900/20'
              : 'border-gray-600 text-gray-400 hover:text-gray-300 hover:border-gray-500'
          }`}
        >
          My Level
        </button>
        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="bg-gray-700 text-sm rounded px-3 py-1 border border-gray-600"
        >
          <option value="">All Skills</option>
          {availableSkills.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {displayedRecipes.length} recipes shown · {totalCraftable} craftable now
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col />
            <col className="w-44" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-700 text-left bg-gray-800">
              <SortHeader field="name" current={sortField} asc={sortAsc} onClick={handleSort} align="left">
                Recipe
              </SortHeader>
              <SortHeader field="skill" current={sortField} asc={sortAsc} onClick={handleSort} align="left">
                Skill
              </SortHeader>
              <th className="px-3 py-2 text-gray-300 font-semibold">Ingredients</th>
              <SortHeader field="profit" current={sortField} asc={sortAsc} onClick={handleSort}>
                Profit
              </SortHeader>
              <th className="px-3 py-2 text-gray-300 font-semibold text-right">Can Craft</th>
              <SortHeader field="totalProfit" current={sortField} asc={sortAsc} onClick={handleSort}>
                Total Profit
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {displayedRecipes.map((r) => (
              <tr key={r.recipe.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-3 py-2">
                  <Link to={`/recipes/${r.recipe.id}`} className="text-amber-400 hover:text-amber-300">
                    {r.recipe.name}
                  </Link>
                </td>
                <td className={`px-3 py-2 whitespace-nowrap ${r.hasSkill ? 'text-gray-400' : 'text-red-400'}`}>
                  {r.recipe.skill} {r.recipe.skillLevelReq}
                </td>
                <td className="px-3 py-2">
                  {r.hasAllIngredients ? (
                    <span className="text-green-400 text-xs">All owned</span>
                  ) : (
                    <span
                      className="text-red-400 text-xs cursor-help"
                      title={r.missingIngredients.join(', ')}
                    >
                      Missing {r.missingIngredients.length}
                    </span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 font-mono text-right ${
                    r.profit > 0 ? 'text-green-400' : r.profit < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}
                >
                  {formatCouncils(r.profit)}
                </td>
                <td className="px-3 py-2 text-gray-400 font-mono text-right">{r.timesCraftable}x</td>
                <td
                  className={`px-3 py-2 font-mono text-right ${
                    r.totalProfit > 0 ? 'text-green-400' : r.totalProfit < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}
                >
                  {formatCouncils(r.totalProfit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {displayedRecipes.length === 0 && (
        <p className="text-gray-500 italic text-center py-8">
          {filter === 'craftable'
            ? 'No recipes with all ingredients in your inventory.'
            : filter === 'profitable'
              ? 'No profitable recipes found for your skill levels.'
              : 'No recipes match your current skill levels.'}
        </p>
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
