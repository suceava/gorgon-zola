import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Construct } from 'constructs';
import * as path from 'path';

export class MigrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = dynamodb.Table.fromTableArn(this, 'Table', cdk.Fn.importValue('GorgonZola-TableArn'));

    const migrationHandler = new NodejsFunction(this, 'MigrationHandler', {
      entry: path.join(__dirname, '..', '..', 'backend', 'src', 'services', 'migration', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
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

    table.grantReadWriteData(migrationHandler);
  }
}
