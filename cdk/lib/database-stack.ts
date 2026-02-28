import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

export class DatabaseStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, 'GorgonZolaTable', {
      tableName: TABLE_NAME,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Step 1: GSI removed for key schema change (entitySk → name).
    // After deploy, re-add with: sortKey: { name: 'name', type: STRING }

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      exportName: 'GorgonZola-TableArn',
    });
  }
}
