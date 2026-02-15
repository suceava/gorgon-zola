import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import type { Construct } from 'constructs'
import * as path from 'path'

interface DataSyncStackProps extends cdk.StackProps {
  table: dynamodb.Table
}

export class DataSyncStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DataSyncStackProps) {
    super(scope, id, props)

    const { table } = props

    const syncHandler = new nodejs.NodejsFunction(this, 'SyncGameDataHandler', {
      entry: path.join(__dirname, '..', '..', 'backend', 'src', 'services', 'sync-game-data', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
        GORGON_CDN_BASE_URL: 'https://cdn.projectgorgon.com/v456/data',
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    })

    table.grantWriteData(syncHandler)

    // Run daily at 6 AM UTC
    const rule = new events.Rule(this, 'DailySyncRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '6' }),
    })

    rule.addTarget(new targets.LambdaFunction(syncHandler))
  }
}
