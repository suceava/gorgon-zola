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

- **Frontend**: Vite + React + TypeScript + Tailwind CSS v4 + React Router
- **Backend**: TypeScript Lambda handlers, AWS SDK v3
- **Database**: DynamoDB single-table design
- **Infrastructure**: AWS CDK (TypeScript)
- **Monorepo**: npm workspaces (backend, cdk). Frontend installed by CDK during synthesis.

## Project Structure

- `cdk/` - Infrastructure ONLY. No application code. References backend/frontend via paths.
- `frontend/` - Vite React SPA. Not a workspace. Built by CDK during synthesis.
- `backend/` - All backend code (workspace).
  - `src/api/` - API Gateway Lambda handlers
  - `src/services/` - Background Lambda handlers (e.g. sync-game-data)
  - `src/domain/` - Business logic + types, organized by domain
  - `src/lib/` - Shared utilities (DB client, single-table helpers)

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

GSI1: PK=entityType (ITEM/RECIPE), SK=varies (name/skill)

## Auth & Access

- No user auth. Anonymous public read access.
- Admin-only price submission via shared secret (env var).
- May add auth later if needed.

## Key Decisions

- No Next.js/SSR - interactive tool doesn't need it, pure SPA is simpler
- Single-table DynamoDB - proper access-pattern-driven design
- Frontend defines its own API response types - clean boundary, no shared imports
- Game data synced via scheduled Lambda, not manual scripts
- Modeled after savvy-trader-admin monorepo pattern
