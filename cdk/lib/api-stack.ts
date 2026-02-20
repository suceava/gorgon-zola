import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { CorsHttpMethod, HttpApi } from 'aws-cdk-lib/aws-apigatewayv2'
import type { Construct } from 'constructs'
import * as path from 'path'
import { createApiLambdas } from './helpers'

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const table = dynamodb.Table.fromTableArn(this, 'Table',
      cdk.Fn.importValue('GorgonZola-TableArn'),
    )

    const api = new HttpApi(this, 'GorgonZolaApi', {
      apiName: 'GorgonZola-Api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
        allowHeaders: ['Content-Type', 'X-Admin-Secret'],
      },
    })

    const base = path.join(__dirname, '..', '..', 'backend', 'src', 'api')

    const lambdas = createApiLambdas(this, {
      'GET /api/items':   { entry: path.join(base, 'get-items.ts') },
      'GET /api/recipes': { entry: path.join(base, 'get-recipes.ts') },
      'GET /api/prices':  { entry: path.join(base, 'get-prices.ts') },
      'POST /api/prices': { entry: path.join(base, 'post-price.ts') },
    }, {
      api,
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
        ADMIN_SECRET: process.env.ADMIN_SECRET ?? 'change-me',
      },
    })

    lambdas.forEach(fn => table.grantReadWriteData(fn))

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url ?? '',
      exportName: 'GorgonZola-ApiUrl',
    })
  }
}
