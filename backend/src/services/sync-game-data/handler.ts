import type { ScheduledHandler } from 'aws-lambda';
import { batchPut, EntityType, keys } from '../../lib/db.js';
import type { ItemRecipe, ItemSource } from '../../domain/item.js';
import type { NpcItem } from '../../domain/npc.js';
import type { QuestItem } from '../../domain/quest.js';

const GAME_DATA_URL = process.env.GAME_DATA_URL!;

async function fetchJson<T>(filename: string): Promise<T> {
  const res = await fetch(`${GAME_DATA_URL}/${filename}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${filename}: ${res.status}`);
  }
  return res.json();
}

/** Raw game data shapes (PascalCase as they come over the wire) */
interface RawItem {
  Name: string;
  Value: number;
  InternalName: string;
  Description?: string;
  IconId?: number;
  Keywords?: string[];
  MaxStackSize?: number;
  IsCrafted?: boolean;
  CraftingTargetLevel?: number;
  CraftPoints?: number;
}

interface RawRecipe {
  InternalName: string;
  Name: string;
  Description?: string;
  IconId?: number;
  Skill: string;
  SkillLevelReq: number;
  Ingredients: {
    ItemCode: number;
    StackSize: number;
    ChanceToConsume?: number;
    Desc?: string;
  }[];
  ResultItems: {
    ItemCode: number;
    StackSize: number;
    PercentChance?: number;
  }[];
  RewardSkill?: string;
  RewardSkillXp?: number;
}

interface RawNpc {
  Name: string;
  AreaName?: string;
  AreaFriendlyName?: string;
}

interface RawQuest {
  Name: string;
  Description?: string;
  DisplayedLocation?: string;
  FavorNpc?: string;
  Requirements?: {
    T: string;
    Npc?: string;
    Level?: string | number;
    Skill?: string;
  }[];
  Objectives?: {
    Type: string;
    Description: string;
    Number?: number;
    Target?: string;
  }[];
  Reward_Favor?: number;
  Rewards?: {
    T: string;
    Skill?: string;
    Xp?: number;
  }[];
}

interface RawSourceEntry {
  type: string;
  npc?: string;
  recipeId?: number;
  questId?: number;
  hangOutId?: number;
  itemTypeId?: number;
}

interface RawSourceItem {
  entries: RawSourceEntry[];
}

function parseId(key: string): string {
  return key.split('_').pop()!;
}

/** Build item name lookup from raw items data */
function buildItemNames(rawItems: Record<string, RawItem>): Map<string, string> {
  const names = new Map<string, string>();
  for (const [key, item] of Object.entries(rawItems)) {
    names.set(key, item.Name);
  }
  return names;
}

/** Build reverse recipe index: itemKey → recipes that consume it */
function buildRecipeIndex(rawRecipes: Record<string, RawRecipe>): Map<string, ItemRecipe[]> {
  const index = new Map<string, ItemRecipe[]>();
  for (const [key, recipe] of Object.entries(rawRecipes)) {
    for (const ing of recipe.Ingredients ?? []) {
      if (ing.ItemCode) {
        const itemKey = `item_${ing.ItemCode}`;
        let refs = index.get(itemKey);
        if (!refs) {
          refs = [];
          index.set(itemKey, refs);
        }
        refs.push({
          recipeId: parseId(key),
          recipeName: recipe.Name,
          skill: recipe.Skill,
        });
      }
    }
  }
  return index;
}

/** Build NPC items and quest items maps from sources data */
function buildSourceMaps(
  rawSources: Record<string, RawSourceItem>,
  itemNames: Map<string, string>,
) {
  const npcItems = new Map<string, NpcItem[]>();
  const questItems = new Map<string, QuestItem[]>();

  for (const [itemKey, source] of Object.entries(rawSources)) {
    const itemId = parseId(itemKey);
    const itemName = itemNames.get(itemKey) ?? '';

    for (const entry of source.entries) {
      if ((entry.type === 'Vendor' || entry.type === 'Barter' || entry.type === 'HangOut') && entry.npc) {
        let items = npcItems.get(entry.npc);
        if (!items) {
          items = [];
          npcItems.set(entry.npc, items);
        }
        items.push({ itemId, itemName, sourceType: entry.type });
      }

      if (entry.type === 'Quest' && entry.questId) {
        const questKey = `quest_${entry.questId}`;
        let items = questItems.get(questKey);
        if (!items) {
          items = [];
          questItems.set(questKey, items);
        }
        items.push({ itemId, itemName });
      }
    }
  }

  return { npcItems, questItems };
}

function transformItems(
  rawItems: Record<string, RawItem>,
  rawSources: Record<string, RawSourceItem>,
  recipeIndex: Map<string, ItemRecipe[]>,
) {
  return Object.entries(rawItems).map(([key, item]) => {
    const { pk, sk } = keys.item(key);
    const sources: ItemSource[] = (rawSources[key]?.entries ?? []).map((entry) => ({
      type: entry.type,
      npc: entry.npc,
      recipeId: entry.recipeId,
      questId: entry.questId,
      hangOutId: entry.hangOutId,
      itemTypeId: entry.itemTypeId,
    }));
    const recipes = recipeIndex.get(key) ?? [];

    return {
      pk,
      sk,
      entityType: EntityType.ITEM,
      entitySk: (item.Name ?? '').toUpperCase(),
      id: parseId(key),
      name: item.Name,
      value: item.Value ?? 0,
      internalName: item.InternalName,
      description: item.Description,
      iconId: item.IconId,
      keywords: item.Keywords ?? [],
      maxStackSize: item.MaxStackSize,
      isCrafted: item.IsCrafted,
      craftingTargetLevel: item.CraftingTargetLevel,
      craftPoints: item.CraftPoints,
      sources,
      recipes,
    };
  });
}

function transformRecipes(rawRecipes: Record<string, RawRecipe>, itemNames: Map<string, string>) {
  return Object.entries(rawRecipes).map(([key, recipe]) => {
    const { pk, sk } = keys.recipe(key);
    return {
      pk,
      sk,
      entityType: EntityType.RECIPE,
      entitySk: `SKILL#${recipe.Skill}`,
      id: parseId(key),
      name: recipe.Name,
      skill: recipe.Skill,
      skillLevelReq: recipe.SkillLevelReq ?? 0,
      ingredients: (recipe.Ingredients ?? []).map((ing) => ({
        itemId: ing.ItemCode,
        itemName: itemNames.get(`item_${ing.ItemCode}`) ?? '',
        stackSize: ing.StackSize ?? 1,
        chanceToConsume: ing.ChanceToConsume,
        desc: ing.Desc,
      })),
      results: (recipe.ResultItems ?? []).map((res) => ({
        itemId: res.ItemCode,
        itemName: itemNames.get(`item_${res.ItemCode}`) ?? '',
        stackSize: res.StackSize ?? 1,
        percentChance: res.PercentChance,
      })),
      iconId: recipe.IconId,
    };
  });
}

function transformNpcs(
  rawNpcs: Record<string, RawNpc>,
  npcItems: Map<string, NpcItem[]>,
) {
  return Object.entries(rawNpcs).map(([key, npc]) => {
    const { pk, sk } = keys.npc(key);
    return {
      pk,
      sk,
      entityType: EntityType.NPC,
      entitySk: (npc.Name ?? '').toUpperCase(),
      id: key,
      name: npc.Name,
      areaName: npc.AreaName,
      areaFriendlyName: npc.AreaFriendlyName,
      items: npcItems.get(key) ?? [],
    };
  });
}

function transformQuests(
  rawQuests: Record<string, RawQuest>,
  questItems: Map<string, QuestItem[]>,
) {
  return Object.entries(rawQuests).map(([key, quest]) => {
    const { pk, sk } = keys.quest(key);
    return {
      pk,
      sk,
      entityType: EntityType.QUEST,
      entitySk: (quest.Name ?? '').toUpperCase(),
      id: parseId(key),
      name: quest.Name,
      description: quest.Description,
      displayedLocation: quest.DisplayedLocation,
      favorNpc: quest.FavorNpc,
      requirements: (quest.Requirements ?? []).map((req) => ({
        type: req.T,
        npc: req.Npc,
        level: req.Level,
        skill: req.Skill,
      })),
      objectives: (quest.Objectives ?? []).map((obj) => ({
        type: obj.Type,
        description: obj.Description,
        number: obj.Number,
        target: obj.Target,
      })),
      rewardFavor: quest.Reward_Favor,
      rewards: (quest.Rewards ?? []).map((rew) => ({
        type: rew.T,
        skill: rew.Skill,
        xp: rew.Xp,
      })),
      items: questItems.get(key) ?? [],
    };
  });
}

export const handler: ScheduledHandler = async () => {
  console.log('Starting game data sync...');

  const [itemsRaw, recipesRaw, npcsRaw, questsRaw, sourcesRaw] = await Promise.all([
    fetchJson<Record<string, RawItem>>('items.json'),
    fetchJson<Record<string, RawRecipe>>('recipes.json'),
    fetchJson<Record<string, RawNpc>>('npcs.json'),
    fetchJson<Record<string, RawQuest>>('quests.json'),
    fetchJson<Record<string, RawSourceItem>>('sources_items.json'),
  ]);

  const itemNames = buildItemNames(itemsRaw);
  const recipeIndex = buildRecipeIndex(recipesRaw);
  const { npcItems, questItems } = buildSourceMaps(sourcesRaw, itemNames);

  const itemRecords = transformItems(itemsRaw, sourcesRaw, recipeIndex);
  console.log(`Transformed ${itemRecords.length} items`);

  const recipeRecords = transformRecipes(recipesRaw, itemNames);
  console.log(`Transformed ${recipeRecords.length} recipes`);

  const npcRecords = transformNpcs(npcsRaw, npcItems);
  console.log(`Transformed ${npcRecords.length} NPCs`);

  const questRecords = transformQuests(questsRaw, questItems);
  console.log(`Transformed ${questRecords.length} quests`);

  await batchPut(itemRecords);
  console.log('Items written to DynamoDB');

  await batchPut(recipeRecords);
  console.log('Recipes written to DynamoDB');

  await batchPut(npcRecords);
  console.log('NPCs written to DynamoDB');

  await batchPut(questRecords);
  console.log('Quests written to DynamoDB');

  console.log('Sync complete');
};
