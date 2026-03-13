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
    ItemCode?: number;
    ItemKeys?: string[];
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

/** Build keyword → item keys lookup for matching generic ingredients */
function buildKeywordIndex(rawItems: Record<string, RawItem>): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const [key, item] of Object.entries(rawItems)) {
    for (const kw of item.Keywords ?? []) {
      const bare = kw.split('=')[0];
      let items = index.get(bare);
      if (!items) {
        items = [];
        index.set(bare, items);
      }
      items.push(key);
    }
  }
  return index;
}

/** Build reverse recipe index: itemKey → recipes that consume it */
function buildRecipeIndex(rawRecipes: Record<string, RawRecipe>, rawItems: Record<string, RawItem>): Map<string, ItemRecipe[]> {
  const keywordIndex = buildKeywordIndex(rawItems);
  const index = new Map<string, ItemRecipe[]>();

  function addToIndex(itemKey: string, entry: ItemRecipe) {
    let refs = index.get(itemKey);
    if (!refs) {
      refs = [];
      index.set(itemKey, refs);
    }
    refs.push(entry);
  }

  for (const [key, recipe] of Object.entries(rawRecipes)) {
    for (const ing of recipe.Ingredients ?? []) {
      if (ing.ItemCode) {
        addToIndex(`item_${ing.ItemCode}`, {
          recipeId: parseId(key),
          recipeName: recipe.Name,
          skill: recipe.Skill,
          skillLevelReq: recipe.SkillLevelReq ?? 0,
        });
      }
      if (ing.ItemKeys) {
        for (const keyword of ing.ItemKeys) {
          const matchingItems = keywordIndex.get(keyword) ?? [];
          for (const itemKey of matchingItems) {
            addToIndex(itemKey, {
              recipeId: parseId(key),
              recipeName: recipe.Name,
              skill: recipe.Skill,
              skillLevelReq: recipe.SkillLevelReq ?? 0,
              matchedKeyword: keyword,
            });
          }
        }
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
  rawRecipes: Record<string, RawRecipe>,
  rawQuests: Record<string, RawQuest>,
) {
  return Object.entries(rawItems).map(([key, item]) => {
    const id = parseId(key);
    const { pk, sk } = keys.item(id);
    const sources: ItemSource[] = (rawSources[key]?.entries ?? []).map((entry) => ({
      type: entry.type,
      name: entry.recipeId != null ? rawRecipes[`recipe_${entry.recipeId}`]?.Name
        : entry.questId != null ? rawQuests[`quest_${entry.questId}`]?.Name
        : entry.itemTypeId != null ? rawItems[`item_${entry.itemTypeId}`]?.Name
        : undefined,
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
      id,
      name: item.Name,
      nameLower: item.Name.toLowerCase(),
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

function transformRecipes(rawRecipes: Record<string, RawRecipe>, itemNames: Map<string, string>, rawItems: Record<string, RawItem>) {
  return Object.entries(rawRecipes).map(([key, recipe]) => {
    const id = parseId(key);
    const { pk, sk } = keys.recipe(id);
    return {
      pk,
      sk,
      entityType: EntityType.RECIPE,
      id,
      name: recipe.Name,
      nameLower: recipe.Name.toLowerCase(),
      skill: recipe.Skill,
      skillLevelReq: recipe.SkillLevelReq ?? 0,
      ingredients: (recipe.Ingredients ?? [])
        .filter((ing) => ing.ItemCode)
        .map((ing) => ({
          itemId: ing.ItemCode!,
          itemName: itemNames.get(`item_${ing.ItemCode}`) ?? '',
          value: rawItems[`item_${ing.ItemCode}`]?.Value ?? 0,
          stackSize: ing.StackSize ?? 1,
          chanceToConsume: ing.ChanceToConsume,
          desc: ing.Desc,
        })),
      genericIngredients: (recipe.Ingredients ?? [])
        .filter((ing) => ing.ItemKeys)
        .map((ing) => ({
          itemKeys: ing.ItemKeys!,
          desc: ing.Desc ?? '',
          stackSize: ing.StackSize ?? 1,
        })),
      results: (recipe.ResultItems ?? []).map((res) => ({
        itemId: res.ItemCode,
        itemName: itemNames.get(`item_${res.ItemCode}`) ?? '',
        value: rawItems[`item_${res.ItemCode}`]?.Value ?? 0,
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
      id: key,
      name: npc.Name,
      nameLower: npc.Name.toLowerCase(),
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
    const id = parseId(key);
    const { pk, sk } = keys.quest(id);
    return {
      pk,
      sk,
      entityType: EntityType.QUEST,
      id,
      name: quest.Name,
      nameLower: quest.Name.toLowerCase(),
      description: quest.Description,
      displayedLocation: quest.DisplayedLocation,
      favorNpc: quest.FavorNpc,
      requirements: (Array.isArray(quest.Requirements) ? quest.Requirements : []).map((req) => ({
        type: req.T,
        npc: req.Npc,
        level: req.Level,
        skill: req.Skill,
      })),
      objectives: (Array.isArray(quest.Objectives) ? quest.Objectives : []).map((obj) => ({
        type: obj.Type,
        description: obj.Description,
        number: obj.Number,
        target: obj.Target,
      })),
      rewardFavor: quest.Reward_Favor,
      rewards: (Array.isArray(quest.Rewards) ? quest.Rewards : []).map((rew) => ({
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
  const recipeIndex = buildRecipeIndex(recipesRaw, itemsRaw);
  const { npcItems, questItems } = buildSourceMaps(sourcesRaw, itemNames);

  const itemRecords = transformItems(itemsRaw, sourcesRaw, recipeIndex, recipesRaw, questsRaw);
  console.log(`Transformed ${itemRecords.length} items`);

  const recipeRecords = transformRecipes(recipesRaw, itemNames, itemsRaw);
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
