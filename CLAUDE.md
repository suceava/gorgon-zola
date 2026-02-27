# Gorgon Zola

Crafting profitability tool for the game Project: Gorgon. Helps players identify
the most profitable items to craft given their available materials.

## Game Data Source

JSON files from https://cdn.projectgorgon.com/v456/data/index.html
Key files: items.json, recipes.json, itemuses.json, skills.json

## Architecture

Pure AWS serverless. One project, one deploy via CDK.

```
CloudFront → S3                        (frontend SPA)
CloudFront → API Gateway → Lambda      (backend API)
EventBridge → Lambda                   (scheduled data sync)
DynamoDB                               (single table)
```

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS v4 + React Router + TanStack Query
- **Backend**: TypeScript Lambda handlers, AWS SDK v3
- **Database**: DynamoDB single-table design
- **Infrastructure**: AWS CDK (TypeScript)
- **Monorepo**: npm workspaces (backend, cdk). Frontend installed by CDK during synthesis.

## Project Structure

- `cdk/` - Infrastructure ONLY. No application code. References backend/frontend via paths.
  - `createApiLambdas` helper takes `initialPolicy` (IAM PolicyStatements) and creates a shared role. Callers pass permissions in, never grant externally.
- `frontend/` - Vite React SPA. Not a workspace. Built by CDK during synthesis.
  - `src/api/fetch.ts` - Raw fetch wrapper (`apiGet`, `apiPost`). No framework dependency.
  - `src/api/hooks.ts` - TanStack Query hooks wrapping fetch. Components import hooks, not fetch directly. If swapping TanStack Query, only this file changes.
- `backend/` - All backend code (workspace). Uses **repository pattern** for data access.
  - `src/api/` - Thin Lambda handlers. One file per HTTP method+resource (e.g. `get-items.ts`, `post-price.ts`). Handlers only parse requests, call repository methods, and return JSON. No DynamoDB details, no PK/SK strings, no business logic.
  - `src/services/` - Background Lambda handlers (e.g. sync-game-data).
  - `src/domain/` - Domain types + repository classes. One file per entity (`item.ts`, `recipe.ts`, `price.ts`). Each file exports the type interfaces and a static repository class (e.g. `ItemRepository`, `RecipeRepository`, `PriceRepository`). Repository methods return clean domain types — DB fields (`pk`, `sk`, `entityType`, `entitySk`) are stripped via private `strip` methods. NOT one folder per entity — flat files, named after the entity.
  - `src/lib/` - Generic utilities only. `db.ts` is a single file with the DynamoDB client, table config, and typed generic operations (`get`, `put`, `query`, `queryIndex`, `batchPut`). No domain knowledge in lib.

## Code Conventions

- **Domain types use camelCase** (e.g. `name`, `iconId`, `skillLevelReq`), not PascalCase from the game data.
- **IDs are strings** extracted from CDN JSON keys (e.g. `"item_45708"` → `"45708"`). Use `id` consistently on all domain types.
- **Raw game data types are local** to the sync handler where they're used, not exported from domain files. Named `RawItem`, `RawRecipe`.
- **No unnecessary abstractions** — don't create folders, wrapper types, or helper functions for things that are used once.
- **No index signatures** on domain types. Only include fields that matter for the app.
- **Consistent naming** — if it's an item reference, call it `itemId` everywhere, not `itemCode` in one place and `id` in another.

## Deployment

CDK orchestrates everything. Frontend built during CDK synthesis via execSync.

```bash
npm run deploy                # Deploy everything
npm run deploy:frontend       # Frontend only
npm run deploy:backend        # API handlers only
npm run deploy:services       # Background services only
```

Selective deployment via DEPLOY_SERVICE env var.

## Game Data Shapes

All data from `https://cdn.projectgorgon.com/v456/data/`. Files are keyed by entity ID (e.g. `"item_45708"`, `"recipe_1125"`).

### items.json

Each value is an item object:

```jsonc
{
  "item_1002": {
    "Name": "Rubywall Crystal", // display name
    "Value": 50, // base gold value (vendor buy/sell price)
    "InternalName": "RedCrystal", // internal identifier
    "Description": "A big chunk of red crystal...", // flavor text
    "IconId": 5056, // sprite icon reference
    "Keywords": ["AlchemyIngredient", "Crystal"], // tags like "Armor", "Food", "Scroll"
    "MaxStackSize": 100, // inventory stacking limit
    "IsCrafted": true, // whether player-crafted
    "CraftingTargetLevel": 50, // skill level the item is designed for
    "CraftPoints": 12, // crafting XP granted
  },
}
```

### recipes.json

Each value is a recipe object:

```jsonc
{
  "recipe_100": {
    "Name": "Orcish Flour", // display name
    "InternalName": "OrcishFlour", // internal identifier
    "Description": "Grinds orcish wheat...", // flavor text
    "IconId": 6737, // sprite icon reference
    "Skill": "Cooking", // crafting skill
    "SkillLevelReq": 80, // minimum skill level to craft
    "Ingredients": [
      // items + quantities needed
      {
        "ItemCode": 4181, // numeric part of item key (= item_4181)
        "StackSize": 1, // quantity required
        "ChanceToConsume": 0.03, // chance ingredient is consumed
        "Desc": "Orcish Wheat", // display label
      },
    ],
    "ResultItems": [
      // items + quantities produced
      {
        "ItemCode": 5334, // numeric part of item key (= item_5334)
        "StackSize": 1, // quantity produced
        "PercentChance": 0.2, // chance to produce this result
      },
    ],
    "RewardSkill": "Cooking", // skill that gains XP
    "RewardSkillXp": 320, // XP amount granted
  },
}
```

### npcs.json

Every NPC in the game, keyed by NPC ID (e.g. `"NPC_Agrashab"`).

```jsonc
{
  "NPC_Agrashab": {
    "Name": "Agrashab", // display name
    "AreaName": "AreaSunVale", // internal area ID
    "AreaFriendlyName": "Sun Vale", // display area name
    "Desc": "He looks at you dispassionately.", // flavor text
    "Pos": "x:-723.9 y:71.4 z:-399.0", // world position
    "Preferences": [
      // gift preferences
      {
        "Name": "Fairy Wings", // gift display name
        "Keywords": ["FairyWing"], // matching item keywords
        "Desire": "Love", // reaction level
        "Pref": 3.5, // preference weight
      },
    ],
    "Services": [
      // NPC services (see below)
      {
        "Type": "Store", // service type
        "Favor": "Despised", // favor level required
        "CapIncreases": ["Despised:5000:Armor,Weapon"], // store cap unlocks
      },
      {
        "Type": "Training", // skill training
        "Favor": "Despised", // favor level required
        "Skills": ["IceMagic", "FireMagic"], // trainable skills
        "Unlocks": ["Neutral", "Comfortable", "Friends"], // unlock tiers
      },
    ],
    "ItemGifts": ["CloseFriends", "BestFriends"], // favor tiers that unlock gifts
  },
}
```

### quests.json

Every quest in the game, keyed by quest ID (e.g. `"quest_10405"`).

```jsonc
{
  "quest_10405": {
    "Name": "The Galvanizer", // display name
    "InternalName": "TheGalvanizer", // internal identifier
    "Description": "Blanche has mentioned her desire..", // quest summary
    "DisplayedLocation": "Serbule", // area shown in quest log
    "FavorNpc": "AreaSerbule/NPC_Blanche", // NPC this quest is tied to
    "IsCancellable": true, // whether player can abandon
    "PrefaceText": "I heard that the lich Khyrulek...", // NPC dialog intro
    "SuccessText": "This... this is it?...", // NPC dialog on completion
    "Requirements": [
      // prerequisites
      {
        "T": "MinFavorLevel", // requirement type
        "Npc": "AreaSerbule/NPC_Blanche", // required NPC
        "Level": "CloseFriends", // required favor level
      },
    ],
    "Objectives": [
      // quest steps
      {
        "Type": "Collect", // objective type
        "Description": "Obtain The Galvanizer", // display text
        "ItemName": "TheGalvanizer", // item to collect
        "Number": 1, // quantity required
      },
    ],
    "Reward_Favor": 300, // favor gained on completion
    "Rewards": [
      // skill/XP rewards
      {
        "T": "SkillXp", // reward type
        "Skill": "FireMagic", // skill rewarded
        "Xp": 250, // XP amount
      },
    ],
    "Rewards_Items": [
      // item rewards
      {
        "Item": "FireMagicBoost25Potion", // item internal name
        "StackSize": 1, // quantity given
      },
    ],
  },
}
```

### sources_items.json

Each value has an `entries` array describing where the item can be obtained:

```jsonc
{
  "item_45708": {
    "entries": [
      {
        "type": "Vendor", // source type (see table below)
        "npc": "NPC_Yetta", // NPC identifier (Vendor, Barter, HangOut)
        "recipeId": 101, // recipe reference (Recipe only)
        "questId": 45016, // quest reference (Quest only)
        "hangOutId": 10303, // hangout reference (HangOut only)
        "itemTypeId": 10001, // item reference (Item only)
      },
    ],
  },
}
```

| Entry Type | Extra Fields       | Meaning                    |
| ---------- | ------------------ | -------------------------- |
| `Recipe`   | `recipeId`         | Crafted via a recipe       |
| `Vendor`   | `npc`              | Sold by an NPC vendor      |
| `Barter`   | `npc`              | Available via NPC barter   |
| `Quest`    | `questId`          | Quest reward               |
| `HangOut`  | `hangOutId`, `npc` | HangOut reward             |
| `Item`     | `itemTypeId`       | Obtained from another item |
| `Effect`   | —                  | From an ability/effect     |

## DynamoDB Single-Table Design

Table: `GorgonZola`

| Entity       | PK               | SK                 | Embedded lists               |
|--------------|------------------|--------------------|------------------------------|
| Item         | ITEM#<id>        | METADATA           | sources[], recipes[]         |
| Recipe       | RECIPE#<id>      | METADATA           | ingredients[], results[]     |
| NPC          | NPC#<npcId>      | METADATA           | items[]                      |
| Quest        | QUEST#<questId>  | METADATA           | items[]                      |
| Vendor Price | ITEM#<id>        | PRICE#<timestamp>  |                              |

All relationships are embedded on both sides (denormalized, rebuilt nightly by sync).

- **Provides**: NPC/Quest/Recipe → items they provide/produce. Reverse on Item via `sources[]`.
- **Consumes**: Recipe → items it uses as ingredients. Reverse on Item via `recipes[]`.

entityIndex (GSI): PK=entityType (ITEM/RECIPE/NPC/QUEST), SK=entitySk (name/skill/area)

## Auth & Access

- No user auth. Anonymous public read access.
- Admin-only price submission via shared secret (env var).
- May add auth later if needed.

## Key Decisions

- No Next.js/SSR — interactive tool doesn't need it, pure SPA is simpler
- Single-table DynamoDB — proper access-pattern-driven design
- Frontend defines its own API response types — clean boundary, no shared imports
- Game data synced via scheduled Lambda, not manual scripts
- Modeled after savvy-trader-admin monorepo pattern
- Repository pattern — static classes (`ItemRepository`, `RecipeRepository`, `PriceRepository`) own all data access, return clean domain types with DB fields stripped
- Handlers never touch DynamoDB directly — they call repository methods
- One handler per HTTP method+resource — no multi-method handlers
- lib/ is generic only — no domain knowledge leaks into utilities
- API routes have no `/api` prefix — the API lives on its own subdomain (`gorgon-api.gnarlybits.com`)
- CDK helpers own Lambda permissions — `createApiLambdas` accepts `initialPolicy`, creates a shared IAM role. Stacks never call `grantReadWriteData` on returned lambdas.
