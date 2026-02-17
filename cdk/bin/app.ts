#!/usr/bin/env node
import { config } from 'dotenv'
config({ path: '../.env' })

import * as cdk from 'aws-cdk-lib'
import { DatabaseStack } from '../lib/database-stack'
import { ApiStack } from '../lib/api-stack'
import { FrontendStack } from '../lib/frontend-stack'
import { DataSyncStack } from '../lib/data-sync-stack'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION ?? 'us-east-1',
}

const deployService = process.env.DEPLOY_SERVICE ?? 'all'

// Database is always synthesized (other stacks depend on it)
const database = new DatabaseStack(app, 'GorgonZola-Database', { env })

if (deployService === 'all' || deployService === 'backend') {
  const api = new ApiStack(app, 'GorgonZola-Api', {
    env,
    table: database.table,
  })
  api.addDependency(database)
}

if (deployService === 'all' || deployService === 'frontend') {
  new FrontendStack(app, 'GorgonZola-Frontend', { env })
}

if (deployService === 'all' || deployService === 'services') {
  const sync = new DataSyncStack(app, 'GorgonZola-DataSync', {
    env,
    table: database.table,
  })
  sync.addDependency(database)
}
