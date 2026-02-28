import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Construct } from 'constructs';
import * as path from 'path';

const GAME_DATA_URL = process.env.GAME_DATA_URL!;

export class DataSyncStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = dynamodb.Table.fromTableArn(this, 'Table', cdk.Fn.importValue('GorgonZola-TableArn'));

    const syncHandler = new NodejsFunction(this, 'SyncGameDataHandler', {
      entry: path.join(__dirname, '..', '..', 'backend', 'src', 'services', 'data-sync', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
        GAME_DATA_URL,
      },
      timeout: cdk.Duration.minutes(15),
      memorySize: 512,
      bundling: {
        externalModules: [],
        minify: true,
        sourceMap: false,
        format: OutputFormat.ESM,
        banner: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
      },
    });

    table.grantWriteData(syncHandler);

    const rule = new events.Rule(this, 'DailySyncRule', {
      ruleName: 'GorgonZola-DailyGameDataSync',
      schedule: events.Schedule.cron({ minute: '0', hour: '8' }),
    });

    rule.addTarget(new targets.LambdaFunction(syncHandler));
  }
}
