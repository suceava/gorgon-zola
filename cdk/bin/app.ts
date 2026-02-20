#!/usr/bin/env node
import { config } from 'dotenv'
config({ path: '../.env' })

import * as cdk from 'aws-cdk-lib'
import { DatabaseStack } from '../lib/database-stack'
import { ApiStack } from '../lib/api-stack'
import { FrontendStack } from '../lib/frontend-stack'
import { DataSyncStack } from '../lib/data-sync-stack'

type StackConfig = {
  StackClass: new (scope: cdk.App, id: string, props?: cdk.StackProps) => cdk.Stack
  id: string
  dependencies?: string[]
}

const stackConfigs: Record<string, StackConfig[]> = {
  database: [
    { StackClass: DatabaseStack, id: 'GorgonZola-Database' },
  ],
  backend: [
    { StackClass: ApiStack, id: 'GorgonZola-Api', dependencies: ['GorgonZola-Database'] },
  ],
  frontend: [
    { StackClass: FrontendStack, id: 'GorgonZola-Frontend', dependencies: ['GorgonZola-Api', 'GorgonZola-DataSync'] },
  ],
  services: [
    { StackClass: DataSyncStack, id: 'GorgonZola-DataSync', dependencies: ['GorgonZola-Database'] },
  ],
}

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION ?? 'us-east-1',
}

const deployService = process.env.DEPLOY_SERVICE ?? 'all'

// Database is always deployed — other stacks depend on its CloudFormation exports
const deploySections = deployService === 'all'
  ? Object.keys(stackConfigs)
  : ['database', deployService]

const stackMap: Record<string, cdk.Stack> = {}

for (const section of deploySections) {
  const configs = stackConfigs[section]
  if (!configs) continue

  for (const { StackClass, id, dependencies } of configs) {
    const stack = new StackClass(app, id, { env })
    stackMap[id] = stack

    dependencies?.forEach(depId => {
      if (stackMap[depId]) {
        stack.addDependency(stackMap[depId])
      }
    })
  }
}
