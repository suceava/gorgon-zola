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

- **Domain types use camelCase** (e.g. `name`, `iconId`, `skillLevelReq`), not PascalCase from the CDN.
- **IDs are strings** extracted from CDN JSON keys (e.g. `"item_45708"` → `"45708"`). Use `id` consistently on all domain types.
- **Raw CDN types are local** to the sync handler where they're used, not exported from domain files. Named `RawItem`, `RawRecipe` — no "Cdn" in the name.
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

## DynamoDB Single-Table Design

Table: `GorgonZola`

| Entity             | PK                    | SK                   |
|---------------------|-----------------------|----------------------|
| Item                | ITEM#<id>             | METADATA             |
| Recipe              | RECIPE#<id>           | METADATA             |
| Recipe→Ingredient   | INGREDIENT#<itemId>   | RECIPE#<recipeId>    |
| Vendor Price        | ITEM#<id>             | PRICE#<timestamp>    |

entityIndex (GSI): PK=entityType (ITEM/RECIPE), SK=entitySk (name/skill)

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
